import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient'; // Aquele arquivo que criamos antes
import { Session } from '@supabase/supabase-js';

// Define o formato do nosso Perfil (igual ao banco)
interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'pendente';
  allowed_modules: string[];
  full_name: string;
  avatar_url?: string;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  canAccess: (module: string) => boolean;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verifica se já tem sessão ativa ao abrir o site
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Escuta mudanças (Login, Logout, Token expirado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Busca os dados extras (role, permissões) na tabela 'profiles'
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) console.error('Erro ao buscar perfil:', error);
      setProfile(data);
    } catch (error) {
      console.error('Erro crítico:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    // Pega a URL base correta (incluindo /br-desk/)
    // Em desenvolvimento (localhost) ele pega a raiz, em produção pega o subdiretório
    const redirectUrl = window.location.origin + import.meta.env.BASE_URL;

    // Remove barras duplicadas no final, se houver, para evitar erros
    const finalRedirect = redirectUrl.endsWith('/') ? redirectUrl.slice(0, -1) : redirectUrl;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: finalRedirect, 
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
  };
  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  // Funções úteis para usar no front
  const isAdmin = profile?.role === 'admin';
  
  const canAccess = (module: string) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true; // Admin acessa tudo
    if (profile.role === 'pendente') return false; // Pendente não acessa nada
    return profile.allowed_modules?.includes(module);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, loginGoogle, logout, isAdmin, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);