"""LLM abstraction. Every provider implements LLMClient.generate(messages, tools) as an async generator that
yields TextDelta events while streaming and finally one LLMResult (full text + parsed tool calls).

Internal message format (provider-neutral):
  {"role": "system"|"user"|"assistant"|"tool", "content": str,
   "tool_calls": [{"id","name","args"}]   # assistant only
   "tool_call_id": str, "name": str}      # tool only
"""
import json
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator

from app.config import settings


@dataclass
class ToolCall:
    id: str
    name: str
    args: dict


@dataclass
class TextDelta:
    text: str


@dataclass
class LLMResult:
    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)


class LLMClient(ABC):
    name = "llm"

    @abstractmethod
    def generate(self, messages: list[dict], tools: list[dict]) -> AsyncIterator[TextDelta | LLMResult]:
        ...


def _parse_args(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    try:
        v = json.loads(raw or "{}")
        return v if isinstance(v, dict) else {}
    except (TypeError, ValueError):
        return {}


# ---------------------------- Groq (primary) ----------------------------
def _to_openai(messages: list[dict]) -> list[dict]:
    out = []
    for m in messages:
        if m["role"] == "assistant" and m.get("tool_calls"):
            out.append({"role": "assistant", "content": m.get("content") or None, "tool_calls": [
                {"id": tc["id"], "type": "function",
                 "function": {"name": tc["name"], "arguments": json.dumps(tc["args"])}} for tc in m["tool_calls"]]})
        elif m["role"] == "tool":
            out.append({"role": "tool", "tool_call_id": m["tool_call_id"], "content": m["content"]})
        else:
            out.append({"role": m["role"], "content": m["content"]})
    return out


class GroqClient(LLMClient):
    name = "groq"

    def __init__(self):
        from groq import AsyncGroq

        self._client = AsyncGroq(api_key=settings.groq_api_key, timeout=30, max_retries=0)

    async def generate(self, messages, tools):
        kwargs = dict(model=settings.groq_model, messages=_to_openai(messages), temperature=0.2,
                      max_tokens=1600, stream=True)
        if tools:
            kwargs["tools"], kwargs["tool_choice"] = tools, "auto"
        stream = await self._client.chat.completions.create(**kwargs)  # raises on 429 -> agent falls back
        text, calls = "", {}
        async for chunk in stream:
            if not chunk.choices:
                continue
            d = chunk.choices[0].delta
            if d.content:
                text += d.content
                yield TextDelta(d.content)
            for tc in d.tool_calls or []:
                slot = calls.setdefault(tc.index, {"id": None, "name": "", "args": ""})
                if tc.id:
                    slot["id"] = tc.id
                if tc.function:
                    slot["name"] += tc.function.name or ""
                    slot["args"] += tc.function.arguments or ""
        yield LLMResult(text=text, tool_calls=[
            ToolCall(id=s["id"] or f"call_{uuid.uuid4().hex[:8]}", name=s["name"], args=_parse_args(s["args"]))
            for _, s in sorted(calls.items()) if s["name"]])


# ---------------------------- Gemini (fallback) ----------------------------
class GeminiClient(LLMClient):
    name = "gemini"

    def __init__(self):
        from google import genai

        self._client = genai.Client(api_key=settings.gemini_api_key)

    @staticmethod
    def _convert(messages):
        from google.genai import types

        system, contents, pending = [], [], []

        def flush():
            if pending:
                contents.append(types.Content(role="user", parts=list(pending)))
                pending.clear()

        for m in messages:
            r = m["role"]
            if r == "tool":
                try:
                    payload = json.loads(m["content"])
                    payload = payload if isinstance(payload, dict) else {"result": payload}
                except ValueError:
                    payload = {"result": m["content"]}
                pending.append(types.Part.from_function_response(name=m["name"], response=payload))
                continue
            flush()
            if r == "system":
                system.append(m["content"])
            elif r == "user":
                contents.append(types.Content(role="user", parts=[types.Part.from_text(text=m["content"])]))
            else:
                parts = [types.Part.from_text(text=m["content"])] if m.get("content") else []
                parts += [types.Part.from_function_call(name=tc["name"], args=tc["args"])
                          for tc in m.get("tool_calls") or []]
                contents.append(types.Content(role="model", parts=parts))
        flush()
        return "\n\n".join(system), contents

    async def generate(self, messages, tools):
        from google.genai import types

        system, contents = self._convert(messages)
        decls = [types.FunctionDeclaration(name=t["function"]["name"], description=t["function"]["description"],
                                           parameters_json_schema=t["function"]["parameters"]) for t in tools]
        cfg = types.GenerateContentConfig(
            system_instruction=system or None, temperature=0.2, max_output_tokens=1600,
            tools=[types.Tool(function_declarations=decls)] if decls else None,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True))
        text, calls = "", []
        stream = await self._client.aio.models.generate_content_stream(
            model=settings.gemini_model, contents=contents, config=cfg)
        async for chunk in stream:
            for cand in chunk.candidates or []:
                for part in (cand.content.parts if cand.content and cand.content.parts else []):
                    if part.function_call:
                        fc = part.function_call
                        calls.append(ToolCall(id=fc.id or f"call_{uuid.uuid4().hex[:8]}", name=fc.name,
                                              args=dict(fc.args or {})))
                    elif part.text and not getattr(part, "thought", False):
                        text += part.text
                        yield TextDelta(part.text)
        yield LLMResult(text=text, tool_calls=calls)


def build_llm_chain() -> list[LLMClient]:
    """Primary first, fallback second. Missing keys simply drop that provider."""
    chain: list[LLMClient] = []
    if settings.groq_api_key:
        chain.append(GroqClient())
    if settings.gemini_api_key:
        chain.append(GeminiClient())
    return chain
