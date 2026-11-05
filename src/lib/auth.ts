/**
 * Supabase Auth placeholder for NIGHTFIELD
 * Provides seamless mock authentication for the preview environment,
 * with drop-in configuration for real Supabase / OAuth credentials.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

const AUTH_STORAGE_KEY = "nightfield_session_user";

export class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch {
      // LocalStorage access may be restricted
    }
  }

  public getUser(): User | null {
    return this.currentUser;
  }

  public subscribe(cb: (user: User | null) => void): () => void {
    this.listeners.push(cb);
    cb(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public async signInWithEmail(email: string, _password?: string): Promise<User> {
    await new Promise((r) => setTimeout(r, 400));
    const user: User = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email,
      name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      createdAt: new Date().toISOString(),
    };
    this.setUser(user);
    return user;
  }

  public async signUpWithEmail(email: string, _password?: string, name?: string): Promise<User> {
    await new Promise((r) => setTimeout(r, 450));
    const user: User = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email,
      name: name || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      createdAt: new Date().toISOString(),
    };
    this.setUser(user);
    return user;
  }

  public async signInWithGoogle(): Promise<User> {
    await new Promise((r) => setTimeout(r, 500));
    const user: User = {
      id: "usr_google_" + Math.random().toString(36).substring(2, 9),
      email: "alexander.investor@gmail.com",
      name: "Alexander Vance",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
      createdAt: new Date().toISOString(),
    };
    this.setUser(user);
    return user;
  }

  public async signOut(): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
    this.setUser(null);
  }

  private setUser(user: User | null) {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
    this.listeners.forEach((l) => l(user));
  }
}

export const auth = new AuthService();
