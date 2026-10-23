'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { DEMO_USERS } from '../db/seed-data';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, role?: 'user' | 'admin') => Promise<boolean>;
  logout: () => void;
  setDemoUser: (type: 'pilot' | 'admin') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load persisted user or default to pilot demo
    const savedUser = localStorage.getItem('simdream_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(DEMO_USERS[0]);
      }
    } else {
      // Default to the pilot user for easy testing
      setUser(DEMO_USERS[0]);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, role: 'user' | 'admin' = 'user'): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // Real Supabase signin
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: 'Password123!', // Standard mock/real
        });
        if (!error && data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName: data.user.user_metadata?.full_name || email.split('@')[0],
            role: role,
            totalHours: 2.5,
            totalFlights: 2,
            createdAt: new Date().toISOString(),
          };
          setUser(profile);
          localStorage.setItem('simdream_user', JSON.stringify(profile));
          setIsLoading(false);
          return true;
        }
      }

      // Local / Demo mode signin
      const matchedUser = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      const newUser: UserProfile = matchedUser || {
        id: `usr-${Date.now()}`,
        email,
        fullName: email.split('@')[0].toUpperCase(),
        role: email.includes('admin') ? 'admin' : role,
        totalHours: 2.5,
        totalFlights: 2,
        createdAt: new Date().toISOString(),
      };

      setUser(newUser);
      localStorage.setItem('simdream_user', JSON.stringify(newUser));
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('simdream_user');
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut();
    }
  };

  const setDemoUser = (type: 'pilot' | 'admin') => {
    const selected = type === 'admin' ? DEMO_USERS[1] : DEMO_USERS[0];
    setUser(selected);
    localStorage.setItem('simdream_user', JSON.stringify(selected));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        logout,
        setDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

