import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { Profile } from '../types';
import { supabase, isSupabaseConfigured, LocalDataStore, DEMO_PROFILES } from '../lib/supabase';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signInAsDemoUser: (profileId: string) => void;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  availableProfiles: Profile[];
  reloadProfiles: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'bgx_current_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [, startTransition] = useTransition();

  // Load profiles from Supabase or LocalDataStore
  const loadProfiles = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('name');
        if (!error && data && data.length > 0) {
          setAvailableProfiles(data as Profile[]);
          return;
        }
      } catch {
        // fallback
      }
    }
    setAvailableProfiles(LocalDataStore.getProfiles());
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await loadProfiles();

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setUser(profile as Profile);
            } else {
              // Create profile if missing
              const newProf: Profile = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario BGX',
                avatar_url: session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.id}`,
                status_message: '¡Hola! Estoy usando BGX.',
                is_online: true,
                last_seen: new Date().toISOString(),
                created_at: new Date().toISOString(),
              };
              await supabase.from('profiles').upsert(newProf);
              setUser(newProf);
            }
          }
        } catch {
          // fallback to demo auth
        }
      } else {
        // Fallback demo user
        const storedUserId = localStorage.getItem(CURRENT_USER_KEY);
        const profiles = LocalDataStore.getProfiles();
        const found = profiles.find(p => p.id === storedUserId) || profiles[0] || null;
        if (found) {
          setUser({ ...found, is_online: true });
        }
      }

      setIsLoading(false);
    };

    initAuth();

    // Listen to profile updates across tabs
    const unsubscribe = LocalDataStore.subscribe((type) => {
      if (type === 'profile_updated') {
        loadProfiles();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error };
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (profile) setUser(profile as Profile);
        }
        return { error: null };
      } catch (err) {
        return { error: err as Error };
      }
    } else {
      // Local demo sign in
      const profiles = LocalDataStore.getProfiles();
      const existing = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        localStorage.setItem(CURRENT_USER_KEY, existing.id);
        setUser({ ...existing, is_online: true });
        return { error: null };
      }
      // Create user
      const newProf: Profile = {
        id: `usr_${Date.now()}`,
        name: email.split('@')[0],
        email,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        status_message: '¡Hola! Estoy usando BGX.',
        is_online: true,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      LocalDataStore.saveProfile(newProf);
      localStorage.setItem(CURRENT_USER_KEY, newProf.id);
      setUser(newProf);
      setAvailableProfiles(LocalDataStore.getProfiles());
      return { error: null };
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string): Promise<{ error: Error | null }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
            },
          },
        });
        if (error) return { error };
        if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            name,
            email,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
            status_message: '¡Hola! Estoy usando BGX.',
            is_online: true,
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
          await supabase.from('profiles').upsert(newProfile);
          setUser(newProfile);
        }
        return { error: null };
      } catch (err) {
        return { error: err as Error };
      }
    } else {
      // Local signup
      const newProf: Profile = {
        id: `usr_${Date.now()}`,
        name,
        email,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
        status_message: '¡Hola! Estoy usando BGX.',
        is_online: true,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      LocalDataStore.saveProfile(newProf);
      localStorage.setItem(CURRENT_USER_KEY, newProf.id);
      setUser(newProf);
      setAvailableProfiles(LocalDataStore.getProfiles());
      return { error: null };
    }
  };

  const signInAsDemoUser = (profileId: string) => {
    const profiles = LocalDataStore.getProfiles();
    const target = profiles.find(p => p.id === profileId);
    if (target) {
      localStorage.setItem(CURRENT_USER_KEY, target.id);
      startTransition(() => {
        setUser({ ...target, is_online: true });
      });
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').update(updates).eq('id', user.id);
    } else {
      LocalDataStore.saveProfile(updated);
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
        signInAsDemoUser,
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
