import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session } from '@supabase/supabase-js';

// Define o formato do nosso Perfil
interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'user' | 'pendente';
  allowed_modules?: string[]; // <--- NOVO CAMPO
  role_id?: string; // <--- NOVO CAMPO
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  authError: string | null; // <--- NOVA VARIÁVEL GLOBAL DE ERRO
  canAccess: (module: string) => boolean;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null); // Estado para o erro

  useEffect(() => {
    // --- 1. CAPTURA O ERRO DA URL ANTES QUE O SUPABASE LIMPE ---
    const captureUrlError = () => {
      const url = window.location.href;
      // Procura por error_description na URL (hash ou query)
      const match = url.match(/error_description=([^&]+)/);
      
      if (match && match[1]) {
        const rawError = decodeURIComponent(match[1].replace(/\+/g, ' '));
        console.log("⚠️ AuthContext capturou erro:", rawError);

        // Traduz o erro técnico
        if (rawError.includes("Database error") || rawError.includes("row-level security")) {
          setAuthError("Acesso Negado: Apenas para uso autorizado");
        } else {
          setAuthError(rawError);
        }
      }
    };
    
    captureUrlError();
    // -----------------------------------------------------------

    // 2. Verifica sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 3. Escuta mudanças
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

  const fetchProfile = async (userId: string) => {
  try {
    // Fazemos um JOIN para pegar os dados do cargo (app_roles)
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        app_roles (
          modules
        )
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Achatamos o resultado para facilitar
    const userProfile = {
      ...data,
      // Se for admin, damos permissão '*', senão pegamos do banco
      allowed_modules: data.role === 'admin' ? ['*'] : data.app_roles?.modules || []
    };

    setProfile(userProfile);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

  const loginGoogle = async () => {
    setAuthError(null); // Limpa erro antigo ao tentar novo login
    const redirectUrl = window.location.origin + (import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL);
    const finalRedirect = redirectUrl.endsWith('/') ? redirectUrl.slice(0, -1) : redirectUrl;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: finalRedirect, 
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setAuthError(null);
  };

  const isAdmin = profile?.role === 'admin';
  
  const canAccess = (module: string) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if (profile.role === 'pendente') return false;
    return profile.allowed_modules?.includes(module);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, loginGoogle, logout, isAdmin, canAccess, authError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);