'use client';

// ====================================================================
// ORGANA Auth & Role Context — Secured Authentication
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChurchUser, UserRole } from '@/types/organa';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
export { INITIAL_PERSONAS };

interface AuthContextType {
  currentUser: ChurchUser;
  currentRole: UserRole;
  isLoadingAuth: boolean;
  switchRole: (role: UserRole) => void;
  loginAs: (role: UserRole, customUser?: Partial<ChurchUser>) => void;
  logout: () => void;
  isAuthenticated: boolean;
  canManageAllFamilies: boolean;
  canReviewReports: boolean;
  canManageUsers: boolean;
  canEditSettings: boolean;
  assignedFamilyId?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>('servant');
  const [currentUser, setCurrentUser] = useState<ChurchUser>(INITIAL_PERSONAS.servant);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  useEffect(() => {
    // Check localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const savedRole = localStorage.getItem('organa_role') as UserRole | null;
        const savedUserStr = localStorage.getItem('organa_user');
        
        if (savedRole && savedUserStr) {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && parsed.id && parsed.role) {
            setCurrentRole(parsed.role);
            setCurrentUser(parsed);
            setIsAuthenticated(true);

            // Fast background verification with server
            if (parsed.id !== 'usr-admin') {
              fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: parsed.id, phone: parsed.phone }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data && data.valid === false) {
                    // Evict deleted or disabled user immediately
                    localStorage.removeItem('organa_role');
                    localStorage.removeItem('organa_user');
                    setIsAuthenticated(false);
                    setCurrentRole('servant');
                    setCurrentUser(INITIAL_PERSONAS.servant);
                    if (window.location.pathname !== '/login') {
                      window.location.href = '/login?evicted=1';
                    }
                  }
                })
                .catch(() => {});
            }
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    } else {
      setIsLoadingAuth(false);
    }
  }, []);

  const switchRole = (role: UserRole) => {
    if (INITIAL_PERSONAS[role]) {
      setCurrentRole(role);
      setCurrentUser(INITIAL_PERSONAS[role]);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('organa_role', role);
        localStorage.setItem('organa_user', JSON.stringify(INITIAL_PERSONAS[role]));
      }
    }
  };

  const loginAs = (role: UserRole, customUser?: Partial<ChurchUser>) => {
    const basePersona = INITIAL_PERSONAS[role] || INITIAL_PERSONAS.servant;
    const resolvedUser: ChurchUser = customUser
      ? { ...basePersona, ...customUser, role }
      : basePersona;

    setCurrentRole(role);
    setCurrentUser(resolvedUser);
    setIsAuthenticated(true);

    if (typeof window !== 'undefined') {
      localStorage.setItem('organa_role', role);
      localStorage.setItem('organa_user', JSON.stringify(resolvedUser));
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('organa_role');
      localStorage.removeItem('organa_user');
    }
    setCurrentRole('servant');
    setCurrentUser(INITIAL_PERSONAS.servant);
    setIsAuthenticated(false);
  };

  const canManageAllFamilies = isAuthenticated && (currentRole === 'admin' || currentRole === 'priest' || currentRole === 'service_secretary');
  const canReviewReports = isAuthenticated && (currentRole === 'admin' || currentRole === 'priest' || currentRole === 'service_secretary');
  const canManageUsers = isAuthenticated && (currentRole === 'admin' || currentRole === 'priest' || currentRole === 'service_secretary');
  const canEditSettings = isAuthenticated && currentRole === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isLoadingAuth,
        switchRole,
        loginAs,
        logout,
        isAuthenticated,
        canManageAllFamilies,
        canReviewReports,
        canManageUsers,
        canEditSettings,
        assignedFamilyId: currentUser.assigned_family_id,
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
