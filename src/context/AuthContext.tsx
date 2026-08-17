import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Profile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  availableProfiles: Profile[];
  reloadProfiles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);

  // Load all registered user profiles from Supabase
  const loadProfiles = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setAvailableProfiles([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data) {
        setAvailableProfiles(data as Profile[]);
      } else {
        setAvailableProfiles([]);
      }
    } catch {
      setAvailableProfiles([]);
    }
  }, []);

  // Fetch or create profile for authenticated user
  const fetchOrCreateProfile = async (authUserId: string, email: string, metadata?: Record<string, unknown>): Promise<Profile | null> => {
    if (!supabase) return null;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (profile && !error) {
        // Update presence to online
        await supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', authUserId);
        return { ...profile, is_online: true } as Profile;
      }

      // Create new profile record if it doesn't exist
      const displayName = (metadata?.name as string) || email.split('@')[0] || 'Usuario BGX';
      const avatarUrl = (metadata?.avatar_url as string) || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authUserId)}`;
      const newProf: Profile = {
        id: authUserId,
        email,
        name: displayName,
        avatar_url: avatarUrl,
        status_message: '¡Hola! Estoy usando BGX.',
        is_online: true,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      await supabase.from('profiles').upsert(newProf);
      return newProf;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoading(true);

      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setUser(null);
          setAvailableProfiles([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        await loadProfiles();

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const profile = await fetchOrCreateProfile(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata
          );
          if (profile && isMounted) {
            setUser(profile);
          }
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    if (!isSupabaseConfigured || !supabase) return;

    // Listen for auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchOrCreateProfile(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata
          );
          if (profile && isMounted) {
            setUser(profile);
            loadProfiles();
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
          }
        }
      }
    );

    // Listen for realtime profile changes
    const profilesChannel = supabase
      .channel('public:profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadProfiles();
      })
      .subscribe();

    return () => {
      isMounted = false;
      authSubscription.unsubscribe();
      supabase.removeChannel(profilesChannel);
    };
  }, [loadProfiles]);

  const signInWithEmail = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error('Supabase no está configurado. Por favor configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const profile = await fetchOrCreateProfile(
          data.user.id,
          data.user.email || '',
          data.user.user_metadata
        );
        if (profile) {
          setUser(profile);
        }
        await loadProfiles();
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error('Supabase no está configurado. Por favor configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'),
      };
    }

    try {
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            avatar_url: avatarUrl,
          },
        },
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const newProfile: Profile = {
          id: data.user.id,
          name: name.trim(),
          email: data.user.email || email.trim(),
          avatar_url: avatarUrl,
          status_message: '¡Hola! Estoy usando BGX.',
          is_online: true,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert(newProfile);

        if (data.session) {
          setUser(newProfile);
        }
        await loadProfiles();
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    if (user && isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', user.id);
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error during signOut:', err);
      }
    }
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (!error) {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
        await loadProfiles();
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        availableProfiles,
        reloadProfiles: loadProfiles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

