import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { AdminUserList } from '../components/AdminUserList';

export const Dashboard = () => {
  const { profile, logout, isAdmin } = useAuth();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* --- BARRA SUPERIOR (HEADER) --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo e Título */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                BR
              </div>
              <span className="font-bold text-slate-700 text-lg">BR Desk</span>
            </div>

            {/* Menu do Usuário */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-700">{profile?.full_name}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  {profile?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                </p>
              </div>

              {/* Avatar com Fallback (Se não tiver foto, mostra a inicial) */}
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full border-2 border-slate-100 shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 border-2 border-white shadow-sm flex items-center justify-center font-bold text-lg">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
              )}

              <button 
                onClick={logout}
                className="ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                title="Sair do Sistema"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        
  
  {/* --- BARRA DE DEBUG (Remova depois) --- */}
  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 text-sm font-mono">
    <p>DEBUG DO SISTEMA:</p>
    <p>Seu ID: {profile?.id}</p>
    <p>Seu Email: {profile?.email}</p>
    <p>Seu Cargo (Role): <strong>{profile?.role || 'Não carregado'}</strong></p>
    <p>É Admin? {isAdmin ? 'SIM' : 'NÃO'}</p>
  </div>
  {/* --------------------------------------- */}

  {/* ... resto do código ... */}

        {/* Saudação */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Bem-vindo de volta, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500">Selecione um módulo para começar a trabalhar.</p>
        </div>

        {/* --- ÁREA DO ADMIN --- */}
        {isAdmin && (
          <div className="mb-10">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Painel Administrativo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card de Gestão de Usuários */}
              <div 
                onClick={() => setShowAdminPanel(true)} // <--- CLIQUE AQUI ABRE O MODAL
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-700 mb-1">Gestão de Usuários</h3>
                <p className="text-sm text-slate-500">Aprovar cadastros e definir permissões.</p>
              </div>

              {/* Card de Configurações */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-700 mb-1">Configurações</h3>
                <p className="text-sm text-slate-500">Ajustes globais do sistema.</p>
              </div>

            </div>
          </div>
        )}

        {/* --- MÓDULOS GERAIS (Todos veem) --- */}
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Meus Aplicativos
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Exemplo de Módulo Funcional */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-700 mb-1">Meus Documentos</h3>
            <p className="text-sm text-slate-500">Acesse seus arquivos e relatórios.</p>
          </div>
          
          {/* Placeholder para novos módulos */}
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors cursor-pointer min-h-[160px]">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium">Em breve</span>
          </div>

        </div>

      </main>
    </div>
  );
};

export default Dashboard;