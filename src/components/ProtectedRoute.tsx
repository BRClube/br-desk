import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, profile, loading, logout } = useAuth();

  // 1. Carregando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-cyan-600 mr-3"></div>
        Carregando sistema...
      </div>
    );
  }

  // 2. Não Logado -> Login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 3. Logado mas sem Perfil (Erro no Banco)
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800">Erro de Perfil</h1>
        <p className="text-slate-500 mb-6 max-w-md">Não foi possível carregar seus dados.</p>
        <button onClick={logout} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50">Sair</button>
      </div>
    );
  }

  // 4. Pendente -> Tela de Espera
  if (profile.role === 'pendente') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-6">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Cadastro em Análise</h1>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm max-w-md w-full mb-6">
            <p className="text-slate-500 text-sm mb-1">Logado como:</p>
            <p className="font-bold text-slate-800 text-lg mb-4 break-all">{session.user.email}</p>
            <hr className="border-slate-100 my-3"/>
            <p className="text-slate-600 text-sm">Aguarde a aprovação do administrador.</p>
        </div>
        <div className="flex gap-3 justify-center">
            <button onClick={logout} className="px-6 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Sair</button>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-200">Verificar</button>
        </div>
      </div>
    );
  }

  // 5. Tudo certo -> Libera o acesso
  return children;
};