import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'user' | 'pendente';
  created_at?: string;
}

export const AdminUserList = ({ onClose }: { onClose: () => void }) => {
  const { profile: myProfile } = useAuth(); // Para evitar que você edite a si mesmo
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Busca a lista de usuários ao abrir
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true }) // Mostra pendentes/admins primeiro
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      alert('Erro ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Função para atualizar o cargo (Role)
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Atualiza visualmente primeiro (Otimista)
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar permissão. Tente novamente.');
      fetchUsers(); // Reverte em caso de erro
    }
  };

  // Cores dos Badges
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'user': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* Header do Modal */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Gestão de Usuários</h2>
            <p className="text-sm text-slate-500">Gerencie permissões e acessos.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Lista de Usuários (Scrollável) */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-10 text-slate-400">Carregando usuários...</div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-cyan-200 transition-colors gap-4">
                  
                  {/* Info do Usuário */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full border border-white shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500">
                        {user.full_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-700">{user.full_name}</h3>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>

                  {/* Controles */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    
                    {/* Badge Atual */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadge(user.role)}`}>
                      {user.role.toUpperCase()}
                    </span>

                    {/* Select de Mudança (Esconde se for o próprio admin para não se bloquear) */}
                    {user.id !== myProfile?.id && (
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2 cursor-pointer hover:bg-slate-50"
                      >
                        <option value="pendente">Pendente (Bloquear)</option>
                        <option value="user">Usuário (Acesso Padrão)</option>
                        <option value="admin">Administrador (Total)</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl text-right">
          <span className="text-xs text-slate-400">Total de usuários: {users.length}</span>
        </div>
      </div>
    </div>
  );
};