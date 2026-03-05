import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// 👇 Nova interface unificada (Cruza Profile com Permission) 👇
interface UnifiedUser {
  id: string; // ID do profile OU email do convite
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'user' | 'pendente';
  role_id?: string | null;
  app_roles?: { name: string };
  isRegistered: boolean; // Flag mágica para sabermos de onde veio
}

interface AppRole {
  id: string;
  name: string;
}

export const AdminUserList = ({ onClose }: { onClose: () => void }) => {
  const { profile: myProfile } = useAuth();
  
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Busca Cargos primeiro (para mapear os nomes nos convites)
      const { data: rolesData, error: rolesError } = await supabase
        .from('app_roles')
        .select('id, name')
        .order('name');
      
      if (rolesError) console.error("Erro ao buscar cargos:", rolesError);
      const roles = rolesData || [];
      setAvailableRoles(roles);

      // 2. Busca Usuários Cadastrados (profiles)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`*, app_roles ( name )`);
      if (profilesError) throw profilesError;

      // 3. Busca Pré-Aprovados (user_permissions)
      const { data: permissionsData, error: permError } = await supabase
        .from('user_permissions')
        .select('*');
      if (permError) console.warn("Erro permissões (pode estar vazia):", permError);

      const safeProfiles = profilesData || [];
      const safePermissions = permissionsData || [];

      // 4. MÁGICA DA MESCLAGEM: Juntar as duas tabelas
      const mergedList: UnifiedUser[] = [];
      const profileEmails = new Set();

      // A. Adiciona todos que já fizeram login
      safeProfiles.forEach(p => {
        profileEmails.add(p.email);
        mergedList.push({
          id: p.id,
          email: p.email,
          full_name: p.full_name || p.email,
          role: p.role || 'user',
          role_id: p.role_id,
          app_roles: p.app_roles,
          isRegistered: true
        });
      });

      // B. Adiciona APENAS os pré-aprovados que ainda não se cadastraram
      safePermissions.forEach(perm => {
        if (!profileEmails.has(perm.email)) {
          // Descobre o nome do cargo para mostrar na interface, se houver
          const roleName = perm.role_id ? roles.find(r => r.id === perm.role_id)?.name : undefined;

          mergedList.push({
            id: `perm_${perm.email}`, // Chave artificial segura
            email: perm.email,
            full_name: perm.email, // Usa o email como nome, já que não temos o nome real ainda
            role: perm.role || 'user',
            role_id: perm.role_id,
            app_roles: roleName ? { name: roleName } : undefined,
            isRegistered: false // Identifica como "Fantasma"
          });
        }
      });

      // Ordenar por ordem alfabética (coloca os registrados primeiro se tiverem nome)
      mergedList.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setUsers(mergedList);

    } catch (error) {
      console.error('Erro crítico:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, value: string) => {
    // Acha o usuário clicado para sabermos se é registrado ou pré-aprovado
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    try {
      let updatePayload: any = {};
      let newRoleName: string | undefined = undefined;

      if (value === 'admin') {
        updatePayload = { role: 'admin', role_id: null };
      } else if (value === 'pendente') {
        updatePayload = { role: 'pendente', role_id: null };
      } else if (value === 'user_standard') {
        updatePayload = { role: 'user', role_id: null };
      } else {
        updatePayload = { role: 'user', role_id: value };
        newRoleName = availableRoles.find(r => r.id === value)?.name;
      }

      // Atualização Visual (Otimista)
      setUsers(users.map(u => {
        if (u.id === userId) {
          return { 
            ...u, 
            role: updatePayload.role, 
            role_id: updatePayload.role_id,
            app_roles: newRoleName ? { name: newRoleName } : undefined
          };
        }
        return u;
      }));

      // 👇 SALVAMENTO DUPLO INTELIGENTE 👇
      // 1. Atualiza o perfil real (se ele existir)
      if (targetUser.isRegistered) {
        const { error: profError } = await supabase.from('profiles').update(updatePayload).eq('id', targetUser.id);
        if (profError) throw profError;
      }

      // 2. Atualiza a tabela de permissões pelo e-mail (para pré-aprovados ou registrados)
      const { error: permError } = await supabase.from('user_permissions').update(updatePayload).eq('email', targetUser.email);
      // Não damos throw aqui porque se o usuário foi registrado via outro método (sem passar por invite), não queremos quebrar.

    } catch (error) {
      alert('Erro ao atualizar. Verifique sua conexão.');
      fetchData(); // Reverte a UI em caso de erro
    }
  };

  const getDisplayRole = (user: UnifiedUser) => {
    if (!user.isRegistered) return '⏳ PRÉ-APROVADO';
    if (user.role === 'admin') return 'ADMINISTRADOR';
    if (user.role === 'pendente') return 'PENDENTE';
    if (user.app_roles?.name) return user.app_roles.name.toUpperCase();
    return 'USUÁRIO PADRÃO';
  };

  const getBadgeStyle = (user: UnifiedUser) => {
    if (!user.isRegistered) return 'bg-orange-50 text-orange-600 border-orange-200 border-dashed';
    if (user.role === 'admin') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (user.role === 'pendente') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (user.role_id) return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  const getSelectValue = (user: UnifiedUser) => {
    if (user.role === 'admin') return 'admin';
    if (user.role === 'pendente') return 'pendente';
    if (user.role_id) return user.role_id;
    return 'user_standard';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-black text-slate-800">Gestão de Usuários</h2>
            <p className="text-sm text-slate-500 font-medium">Defina quem acessa o quê.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-3">
               <i className="fa-solid fa-circle-notch fa-spin text-2xl text-cyan-500"></i>
               Carregando banco de dados...
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm gap-4 transition-all hover:border-cyan-200">
                  
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                      ${user.isRegistered ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-500'}`}>
                      {user.isRegistered ? (user.full_name?.charAt(0) || '?').toUpperCase() : <i className="fa-regular fa-envelope"></i>}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                        {user.isRegistered ? user.full_name : <span className="text-slate-500 italic">{user.email}</span>}
                        <span className={`text-[10px] px-2 rounded border font-black ${getBadgeStyle(user)}`}>
                          {getDisplayRole(user)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {user.isRegistered ? user.email : 'Aguardando o usuário criar conta...'}
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-auto shrink-0">
                    {user.id !== myProfile?.id ? (
                      <select 
                        value={getSelectValue(user)}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="w-full md:w-56 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg p-2.5 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 cursor-pointer shadow-sm transition-all"
                      >
                        <optgroup label="Acesso Básico">
                          <option value="pendente">🔒 Bloqueado / Cancelado</option>
                          <option value="user_standard">👤 Usuário Padrão</option>
                        </optgroup>
                        
                        <optgroup label="Cargos Personalizados">
                          {availableRoles.map(role => (
                            <option key={role.id} value={role.id}>💼 {role.name}</option>
                          ))}
                          {availableRoles.length === 0 && <option disabled>Nenhum cargo criado</option>}
                        </optgroup>

                        <optgroup label="Acesso Total">
                          <option value="admin">🚀 Administrador</option>
                        </optgroup>
                      </select>
                    ) : (
                      <div className="md:w-56 text-right pr-4">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full">
                          Seu Perfil
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};