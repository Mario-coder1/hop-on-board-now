import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface University {
  id: string;
  code: string;
  name: string;
  short_name: string;
  city: string | null;
  email_domain: string;
  color: string | null;
  logo_url: string | null;
}

export interface UniversityMembership {
  id: string;
  university_id: string;
  verified_email: string;
  verified_at: string;
  university: University;
}

export const useUniversities = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('universities')
      .select('id, code, name, short_name, city, email_domain, color, logo_url')
      .eq('active', true)
      .order('short_name')
      .then(({ data }) => {
        if (mounted) {
          setUniversities((data ?? []) as University[]);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { universities, loading };
};

export const useMyMemberships = () => {
  const { profile } = useAuth();
  const [memberships, setMemberships] = useState<UniversityMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!profile?.id) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('university_memberships')
      .select('id, university_id, verified_email, verified_at, university:universities(id, code, name, short_name, city, email_domain, color, logo_url)')
      .eq('profile_id', profile.id)
      .order('verified_at', { ascending: false });
    setMemberships((data ?? []) as unknown as UniversityMembership[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  return { memberships, loading, refresh };
};
