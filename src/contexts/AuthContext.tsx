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

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'user' | 'pendente'; // ou as roles que você usa
  allowed_modules?: string[];
  role_id?: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const captureUrlError = () => {
      // ... (Seu código de captura de erro continua igual) ...
      const url = window.location.href;
      const match = url.match(/error_description=([^&]+)/);
      if (match && match[1]) {
        const rawError = decodeURIComponent(match[1].replace(/\+/g, ' '));
        if (rawError.includes("Database error") || rawError.includes("row-level security")) {
          setAuthError("Acesso Negado: Apenas para uso autorizado");
        } else {
          setAuthError(rawError);
        }
      }
    };
    
    captureUrlError();

    // 2. Verifica sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // MUDANÇA AQUI: Passamos o ID e o EMAIL
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // 3. Escuta mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // MUDANÇA AQUI: Passamos o ID e o EMAIL
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- AQUI ESTÁ A NOVA LÓGICA DE PRÉ-APROVAÇÃO ---
  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      // 1. PRIMEIRO: Verifica a tabela de permissões (Whitelist)
      // Isso garante que só quem você convidou entra, mesmo no primeiro acesso
      if (userEmail) {
        const { data: permission, error: permError } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('email', userEmail)
          .single();

        // Se não achar na whitelist ou se estiver inativo
        if (permError || !permission || permission.active === false) {
          console.warn("Usuário não está na lista de permissões.");
          await supabase.auth.signOut(); // Derruba a sessão
          setAuthError("Seu acesso ainda não foi liberado pelo administrador.");
          setSession(null);
          setProfile(null);
          return; // Para a execução aqui
        }
      }

      // 2. SE PASSOU, busca o perfil normal (ou cria o objeto na memória se for o 1º login)
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, app_roles (modules)`)
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignora erro de "não encontrado" (PGRST116)
         throw error;
      }

      if (data) {
        // --- CENÁRIO A: Usuário já existia na tabela profiles ---
        const userProfile: Profile = {
          ...data,
          allowed_modules: data.role === 'admin' ? ['*'] : data.app_roles?.modules || []
        };
        setProfile(userProfile);
      } else {
        // --- CENÁRIO B: Primeiro Login (Não tem profile, mas passou na Whitelist) ---
        // Pegamos os dados da Whitelist para montar o acesso dele imediatamente
        // (Opcional: Você poderia dar um insert na tabela profiles aqui se quisesse)
        
        // Precisamos buscar quais módulos essa role tem
        const { data: permissionData } = await supabase
           .from('user_permissions')
           .select('role')
           .eq('email', userEmail)
           .single();
           
        // Busca permissões dessa role
        // Nota: Assumindo que você tem uma lógica para mapear role -> modulos
        // Se não tiver, pode deixar vazio ou buscar de app_roles manualmente
        
        setProfile({
            id: userId,
            email: userEmail || '',
            full_name: 'Novo Usuário', // Será preenchido depois ou pego do google metadata
            role: permissionData?.role || 'user',
            allowed_modules: permissionData?.role === 'admin' ? ['*'] : ['assistencia'], // Default seguro
            role_id: 'temp'
        });
      }

    } catch (error) {
      console.error(error);
      setAuthError("Erro ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    // ... (igual ao seu código anterior) ...
    setAuthError(null); 
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

  // ... (logout, isAdmin, canAccess, return iguais ao seu código) ...
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
    return profile.allowed_modules?.includes(module) || false;
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, loginGoogle, logout, isAdmin, canAccess, authError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);