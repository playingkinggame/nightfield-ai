/**
 * Auth for NIGHTFIELD.
 * Live mode: real email/password accounts via the FastAPI backend (/api/auth/*), JWT kept in localStorage.
 * Mock mode (VITE_USE_MOCK=true): local demo session, no backend needed.
 */

import { USE_MOCK, TOKEN_KEY, UNAUTHORIZED_EVENT, getToken, request } from "./http";

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  token: string;
  user: { id: number; email: string; name: string };
}

const USER_KEY = "nightfield_session_user";

export class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    try {
      const stored = localStorage.getItem(USER_KEY);
      // A stored user without a token is a stale (pre-backend) session - drop it in live mode.
      if (stored && (USE_MOCK || getToken())) this.currentUser = JSON.parse(stored);
      else if (stored) localStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
    if (typeof window !== "undefined") {
      window.addEventListener(UNAUTHORIZED_EVENT, () => this.clear());
    }
  }

  public getUser(): User | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public subscribe(cb: (user: User | null) => void): () => void {
    this.listeners.push(cb);
    cb(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public async signInWithEmail(email: string, password: string): Promise<User> {
    if (USE_MOCK) return this.mockUser(email);
    const res = await request<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } });
    return this.accept(res);
  }

  public async signUpWithEmail(email: string, password: string, name: string): Promise<User> {
    if (USE_MOCK) return this.mockUser(email, name);
    const res = await request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: { email, password, name: name.trim() || email.split("@")[0] },
    });
    return this.accept(res);
  }

  /** Re-validate a stored token against the backend (called once on app start). */
  public async refresh(): Promise<void> {
    if (USE_MOCK || !getToken()) return;
    try {
      const me = await request<{ id: number; email: string; name: string }>("/api/auth/me", { auth: true });
      this.setUser({ id: String(me.id), email: me.email, name: me.name });
    } catch (e) {
      if ((e as { status?: number }).status === 401) this.clear();
    }
  }

  public signOut(): void {
    this.clear();
  }

  private accept(res: AuthResponse): User {
    try {
      localStorage.setItem(TOKEN_KEY, res.token);
    } catch {
      /* ignore */
    }
    const user = { id: String(res.user.id), email: res.user.email, name: res.user.name };
    this.setUser(user);
    return user;
  }

  private mockUser(email: string, name?: string): User {
    const user: User = {
      id: "demo_" + email,
      email,
      name: name || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    };
    this.setUser(user);
    return user;
  }

  private clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    this.setUser(null);
  }

  private setUser(user: User | null) {
    this.currentUser = user;
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    this.listeners.forEach((l) => l(user));
  }
}

export const auth = new AuthService();
