import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  car_model: string | null;
  car_color: string | null;
  license_plate: string | null;
  rating: number;
  total_rides: number;
  selected_role: 'driver' | 'passenger';
  banned?: boolean;
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
  updateRole: (role: 'driver' | 'passenger') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data && !error) {
      if (data.banned) {
        toast.error('Účet pozastavený', {
          description: data.ban_reason || 'Váš účet bol pozastavený.',
        });
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        return;
      }
      setProfile(data as Profile);
    }
  }, []);

  const checkAdminRole = useCallback(async (userId: string) => {
    const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    setIsAdmin(!!data);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user && !initializedRef.current) {
          initializedRef.current = true;
          setTimeout(() => {
            fetchProfile(newSession.user.id);
            checkAdminRole(newSession.user.id);
          }, 0);
        } else if (!newSession?.user) {
          setProfile(null);
          setIsAdmin(false);
          initializedRef.current = false;
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession?.user && !initializedRef.current) {
        initializedRef.current = true;
        setSession(existingSession);
        setUser(existingSession.user);
        Promise.all([
          fetchProfile(existingSession.user.id),
          checkAdminRole(existingSession.user.id)
        ]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, checkAdminRole]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateRole = async (role: 'driver' | 'passenger') => {
    if (!profile) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ selected_role: role })
      .eq('id', profile.id);
    
    if (!error) {
      setProfile({ ...profile, selected_role: role });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isAdmin,
      signUp,
      signIn,
      signOut,
      updateRole,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
