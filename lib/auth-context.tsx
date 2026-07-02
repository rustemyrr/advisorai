"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import AuthModal from "@/components/AuthModal";

export type Plan = "starter" | "standard" | "professional";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  plan: Plan | null;
  loading: boolean;
  openAuthModal: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  plan: null,
  loading: true,
  openAuthModal: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchPlan = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/plan", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { plan: string };
      const validPlans: Plan[] = ["starter", "standard", "professional"];
      setPlan(validPlans.includes(data.plan as Plan) ? (data.plan as Plan) : "starter");
    } catch (err) {
      console.error("[fetchPlan] error:", err);
      setPlan("starter");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.access_token) void fetchPlan(s.access_token);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.access_token) void fetchPlan(s.access_token);
      else setPlan(null);
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchPlan]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const openAuthModal = useCallback(() => setModalOpen(true), []);

  return (
    <AuthContext.Provider value={{ user, session, plan, loading, openAuthModal, signOut }}>
      {children}
      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
