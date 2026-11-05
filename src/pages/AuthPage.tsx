/**
 * Minimal luxury Auth Page for NIGHTFIELD (/login & /signup)
 * Features email/password and Google authentication via Supabase Auth placeholder.
 */

import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "../lib/auth";
import { APP_NAME } from "../lib/constants";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignUp = location.pathname.includes("signup");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Please provide a valid email address.");
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        await auth.signUpWithEmail(email, password, name);
      } else {
        await auth.signInWithEmail(email, password);
      }
      navigate("/app");
    } catch (err) {
      setError("Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      await auth.signInWithGoogle();
      navigate("/app");
    } catch {
      setError("Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05060b] text-[#f3ecdc] flex items-center justify-center p-6 selection:bg-[#ffb454]/20 selection:text-[#f3ecdc]">
      {/* Ambient background bloom glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,180,84,0.06)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#151828_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

      {/* Back to landing */}
      <Link
        to="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-mono text-[#f3ecdc]/60 hover:text-[#f3ecdc] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Nightfield</span>
      </Link>

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-[#0c0e18]/90 border border-[#f3ecdc]/15 p-8 sm:p-10 shadow-2xl backdrop-blur-md">
          {/* Brand header */}
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-display text-[#f3ecdc] tracking-tight block">
              {APP_NAME}
            </Link>
            <p className="text-xs font-mono text-[#ffb454] uppercase tracking-widest mt-1">
              Autonomous Market Terminal
            </p>
            <h1 className="text-xl sm:text-2xl font-sans font-medium text-[#f3ecdc] mt-4">
              {isSignUp ? "Create your research desk" : "Sign in to your terminal"}
            </h1>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-[#ff6f91]/10 border border-[#ff6f91]/30 text-xs font-mono text-[#ff6f91]">
              {error}
            </div>
          )}

          {/* Google Auth Button */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#f3ecdc]/20 bg-[#121422] hover:bg-[#181b2e] active:scale-[0.99] text-xs font-mono text-[#f3ecdc] transition-all cursor-pointer mb-5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#f3ecdc]/10" />
            <span className="text-[11px] font-mono text-[#f3ecdc]/40 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-[#f3ecdc]/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-mono text-[#f3ecdc]/70 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Siddharth Rao"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121422] border border-[#f3ecdc]/15 text-[#f3ecdc] text-sm focus:outline-none focus:border-[#f3ecdc] font-sans"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-[#f3ecdc]/70 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@nightfield.finance"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121422] border border-[#f3ecdc]/15 text-[#f3ecdc] text-sm focus:outline-none focus:border-[#f3ecdc] font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono text-[#f3ecdc]/70">Password</label>
                {!isSignUp && (
                  <span className="text-[11px] font-mono text-[#ffb454] hover:underline cursor-pointer">
                    Forgot key?
                  </span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121422] border border-[#f3ecdc]/15 text-[#f3ecdc] text-sm focus:outline-none focus:border-[#f3ecdc]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-[#f3ecdc] text-[#151510] font-medium text-xs font-mono uppercase tracking-wider hover:bg-white active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#151510]" />
              ) : isSignUp ? (
                "Open Research Account"
              ) : (
                "Enter Research Terminal"
              )}
            </button>
          </form>

          {/* Toggle between Login and Signup */}
          <div className="mt-6 text-center text-xs font-mono text-[#f3ecdc]/60">
            {isSignUp ? (
              <span>
                Already registered?{" "}
                <Link to="/login" className="text-[#ffb454] hover:underline">
                  Sign in
                </Link>
              </span>
            ) : (
              <span>
                New to Nightfield?{" "}
                <Link to="/signup" className="text-[#ffb454] hover:underline">
                  Create an account
                </Link>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
