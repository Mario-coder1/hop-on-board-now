import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  car_model: string | null;
  car_color: string | null;
  license_plate: string | null;
  rating: number | null;
  total_rides: number | null;
  selected_role: "driver" | "passenger" | null;
  banned?: boolean | null;
  ban_reason?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateRole: (role: "driver" | "passenger") => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function deriveFullName(u: User): string {
  const metaName = (u.user_metadata as any)?.full_name;
  const emailName = u.email?.split("@")[0];
  const raw = typeof metaName === "string" && metaName.trim() ? metaName : emailName || "User";
  // basic sanitization
  return raw.trim().slice(0, 100).replace(/[\x00-\x1F\x7F]/g, "");
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Prevent double bootstrap (INITIAL_SESSION + getSession)
  const bootstrappedUserIdRef = useRef<string | null>(null);

  const ensureProfile = useCallback(async (u: User) => {
    const userId = u.id;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Auth] Failed to fetch profile");
      toast.error("Nepodarilo sa načítať profil", { description: error.message });
      setProfile(null);
      return;
    }

    if (!data) {
      const full_name = deriveFullName(u);

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({ user_id: userId, full_name })
        .select("*")
        .single();

      if (insertError) {
        console.error("[Auth] Failed to create profile");
        toast.error("Nepodarilo sa vytvoriť profil", { description: insertError.message });
        setProfile(null);
        return;
      }

      setProfile(inserted as Profile);
      return;
    }

    if (data.banned) {
      toast.error("Účet pozastavený", {
        description: data.ban_reason || "Váš účet bol pozastavený.",
      });
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      bootstrappedUserIdRef.current = null;
      return;
    }

    setProfile(data as Profile);
  }, []);

  const checkAdminRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (error) {
      console.error("[Auth] Failed to check admin role");
      setIsAdmin(false);
      return;
    }
    setIsAdmin(!!data);
  }, []);

  const bootstrapUser = useCallback(
    (u: User) => {
      if (bootstrappedUserIdRef.current === u.id) return;
      bootstrappedUserIdRef.current = u.id;

      setLoading(true);
      setTimeout(() => {
        Promise.all([ensureProfile(u), checkAdminRole(u.id)]).finally(() => setLoading(false));
      }, 0);
    },
    [ensureProfile, checkAdminRole],
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      const nextUser = newSession?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        bootstrappedUserIdRef.current = null;
        return;
      }

      // Bootstrap on INITIAL_SESSION / SIGNED_IN
      bootstrapUser(nextUser);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        setSession(existingSession ?? null);
        const existingUser = existingSession?.user ?? null;
        setUser(existingUser);

        if (!existingUser) {
          setLoading(false);
          return;
        }

        bootstrapUser(existingUser);
      })
      .catch(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, [bootstrapUser]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    bootstrappedUserIdRef.current = null;
  };

  const updateRole = async (role: "driver" | "passenger") => {
    if (!profile) throw new Error("Profil nie je načítaný.");

    const { error } = await supabase.from("profiles").update({ selected_role: role }).eq("id", profile.id);

    if (error) throw error;

    setProfile({ ...profile, selected_role: role });
  };

  const refreshProfile = async () => {
    if (user) {
      await ensureProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin,
        signUp,
        signIn,
        signOut,
        updateRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

