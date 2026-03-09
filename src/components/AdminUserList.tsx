import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface UnifiedUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'user' | 'pendente';
  role_id?: string | null;
  app_roles?: { name: string };
  isRegistered: boolean;
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
  
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // 👇 NOVO: Controle de abrir/fechar a gaveta de ocultos 👇
  const [showBlocked, setShowBlocked] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rolesData } = await supabase.from('app_roles').select('id, name').order('name');
      const roles = rolesData || [];
      setAvailableRoles(roles);

      const { data: profilesData } = await supabase.from('profiles').select(`*, app_roles ( name )`);
      const { data: permissionsData } = await supabase.from('user_permissions').select('*');

      const safeProfiles = profilesData || [];
      const safePermissions = permissionsData || [];

      const mergedList: UnifiedUser[] = [];
      const profileEmails = new Set();

      safeProfiles.forEach(p => {
        const safeEmail = p.email ? p.email.toLowerCase() : '';
        profileEmails.add(safeEmail);
        mergedList.push({
          id: p.id,
          email: safeEmail,
          full_name: p.full_name || safeEmail,
          role: p.role || 'user',
          role_id: p.role_id,
          app_roles: p.app_roles,
          isRegistered: true
        });
      });

      safePermissions.forEach(perm => {
        const safeEmail = perm.email ? perm.email.toLowerCase() : '';
        if (!profileEmails.has(safeEmail)) {
          const roleName = perm.role_id ? roles.find(r => r.id === perm.role_id)?.name : undefined;
          mergedList.push({
            id: `perm_${safeEmail}`, 
            email: safeEmail,
            full_name: safeEmail,
            role: perm.role || 'user',
            role_id: perm.role_id,
            app_roles: roleName ? { name: roleName } : undefined,
            isRegistered: false
          });
        }
      });

      mergedList.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setUsers(mergedList);
      setPendingChanges({}); 

    } catch (error) {
      console.error('Erro crítico:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = (userId: string, value: string) => {
    setPendingChanges(prev => ({ ...prev, [userId]: value }));
  };

  const handleSaveChanges = async () => {
    const userIdsToUpdate = Object.keys(pendingChanges);
    if (userIdsToUpdate.length === 0) return;

    setIsSaving(true);
    try {
      for (const userId of userIdsToUpdate) {
        const value = pendingChanges[userId];
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser) continue;

        // 👇 SEPARAMOS OS PACOTES PARA CADA TABELA 👇
        let profilePayload: any = {};
        let permissionPayload: any = {};

        if (value === 'admin') {
          profilePayload = { role: 'admin', role_id: null };
          permissionPayload = { role: 'admin' };
        } else if (value === 'pendente') {
          profilePayload = { role: 'pendente', role_id: null };
          permissionPayload = { role: 'pendente' };
        } else if (value === 'user_standard') {
          profilePayload = { role: 'user', role_id: null };
          permissionPayload = { role: 'user' };
        } else {
          // Se for um cargo personalizado, a tabela de convites guarda o ID no campo 'role'
          profilePayload = { role: 'user', role_id: value };
          permissionPayload = { role: value }; 
        }

        // 1. Atualiza a tabela Profiles (se já tiver conta)
        if (targetUser.isRegistered && !userId.startsWith('perm_')) {
          const { error: profError } = await supabase.from('profiles').update(profilePayload).eq('id', targetUser.id);
          if (profError) throw new Error(`Profiles (${targetUser.email}): ${profError.message}`);
        }

        // 2. Atualiza a tabela user_permissions (Ignorando maiúsculas/minúsculas)
        const { error: permError } = await supabase.from('user_permissions').update(permissionPayload).ilike('email', targetUser.email);
        if (permError) throw new Error(`Permissões (${targetUser.email}): ${permError.message}`);
      }
      
      // Se chegou aqui, deu tudo certo!
      setPendingChanges({});
      fetchData(); 
    } catch (error: any) {
      console.error(error);
      alert('❌ Falha ao salvar:\n' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvite = async (emailToDelete: string) => {
    if (!window.confirm(`Excluir definitivamente o convite de ${emailToDelete}?`)) return;
    try {
      await supabase.from('user_permissions').delete().eq('email', emailToDelete);
      setUsers(users.filter(u => u.email !== emailToDelete));
      
      const newPending = { ...pendingChanges };
      if (newPending[`perm_${emailToDelete}`]) {
        delete newPending[`perm_${emailToDelete}`];
        setPendingChanges(newPending);
      }
    } catch (error: any) {
      alert('Erro ao excluir convite.');
    }
  };

  const getDisplayRole = (user: UnifiedUser) => {
    const stagedValue = pendingChanges[user.id];
    if (stagedValue) {
      if (stagedValue === 'admin') return 'ADMINISTRADOR (NÃO SALVO)';
      if (stagedValue === 'pendente') return 'PENDENTE (NÃO SALVO)';
      if (stagedValue === 'user_standard') return 'USUÁRIO PADRÃO (NÃO SALVO)';
      const rName = availableRoles.find(r => r.id === stagedValue)?.name;
      return `${rName?.toUpperCase()} (NÃO SALVO)`;
    }
    if (!user.isRegistered) return '⏳ PRÉ-APROVADO';
    if (user.role === 'admin') return 'ADMINISTRADOR';
    if (user.role === 'pendente') return 'BLOQUEADO';
    if (user.app_roles?.name) return user.app_roles.name.toUpperCase();
    return 'USUÁRIO PADRÃO';
  };

  const getBadgeStyle = (user: UnifiedUser) => {
    if (pendingChanges[user.id]) return 'bg-blue-50 text-blue-600 border-blue-300 border-dashed animate-pulse';
    if (!user.isRegistered) return 'bg-orange-50 text-orange-600 border-orange-200 border-dashed';
    if (user.role === 'admin') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (user.role === 'pendente') return 'bg-slate-200 text-slate-500 border-slate-300';
    if (user.role_id) return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  };

  const getSelectValue = (user: UnifiedUser) => {
    if (pendingChanges[user.id]) return pendingChanges[user.id];
    if (user.role === 'admin') return 'admin';
    if (user.role === 'pendente') return 'pendente';
    if (user.role_id) return user.role_id;
    return 'user_standard';
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  // 👇 SEPARAÇÃO DOS UTILIZADORES: Ativos vs Ocultos 👇
  const activeUsers = users.filter(u => u.role !== 'pendente');
  const blockedUsers = users.filter(u => u.role === 'pendente');

  // Componente interno para não duplicar código visual
  const renderUserCard = (user: UnifiedUser) => {
    const isModified = !!pendingChanges[user.id];
    return (
      <div key={user.id} className={`flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-xl border shadow-sm gap-4 transition-all ${isModified ? 'border-blue-400 shadow-blue-100' : 'border-slate-200 hover:border-cyan-200'}`}>
        <div className="flex items-center gap-4 w-full md:w-auto opacity-100 transition-opacity">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
            ${user.isRegistered ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-500'}`}>
            {user.isRegistered ? (user.full_name?.charAt(0) || '?').toUpperCase() : <i className="fa-regular fa-envelope"></i>}
          </div>
          <div>
            <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
              {user.isRegistered ? user.full_name : <span className="text-slate-500 italic">{user.email}</span>}
              <span className={`text-[10px] px-2 py-0.5 rounded border font-black ${getBadgeStyle(user)}`}>
                {getDisplayRole(user)}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {user.isRegistered ? user.email : 'Aguardando o usuário criar conta...'}
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto shrink-0 flex gap-2">
          {user.id !== myProfile?.id ? (
            <>
              <select 
                value={getSelectValue(user)}
                onChange={(e) => handleStageChange(user.id, e.target.value)}
                className={`w-full md:w-56 bg-white border text-sm font-medium rounded-lg p-2.5 outline-none cursor-pointer shadow-sm transition-all
                  ${isModified ? 'border-blue-400 text-blue-700 focus:ring-blue-500/20' : 'border-slate-300 text-slate-700 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10'}`}
              >
                <optgroup label="Acesso Básico">
                  <option value="pendente">🔒 Ocultar / Bloquear Acesso</option>
                  <option value="user_standard">👤 Usuário Padrão</option>
                </optgroup>
                <optgroup label="Cargos Personalizados">
                  {availableRoles.map(role => (
                    <option key={role.id} value={role.id}>💼 {role.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Acesso Total">
                  <option value="admin">🚀 Administrador</option>
                </optgroup>
              </select>
              
              {isModified && (
                <button 
                  onClick={() => {
                    const newPending = {...pendingChanges};
                    delete newPending[user.id];
                    setPendingChanges(newPending);
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors shrink-0"
                  title="Desfazer alteração"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                </button>
              )}

              {!user.isRegistered && (
                <button 
                  onClick={() => handleDeleteInvite(user.email)}
                  className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors shrink-0"
                  title="Excluir Convite"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              )}
            </>
          ) : (
            <div className="md:w-56 text-right pr-4 flex items-center justify-end h-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full">
                Seu Perfil
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-black text-slate-800">Gestão de Usuários</h2>
            <p className="text-sm text-slate-500 font-medium">Contas ativas e convites da plataforma.</p>
          </div>
          
          <div className="flex items-center gap-4">
            {hasChanges && (
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-save"></i>}
                Salvar {Object.keys(pendingChanges).length} Alterações
              </button>
            )}

            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-3">
               <i className="fa-solid fa-circle-notch fa-spin text-2xl text-cyan-500"></i>
               Carregando banco de dados...
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* LISTA PRINCIPAL (ATIVOS) */}
              <div className="space-y-3">
                {activeUsers.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Nenhum usuário ativo.</p>
                ) : (
                  activeUsers.map(renderUserCard)
                )}
              </div>

              {/* GAVETA DE OCULTOS (BLOQUEADOS) */}
              {blockedUsers.length > 0 && (
                <div className="pt-6 border-t border-slate-200">
                  <button 
                    onClick={() => setShowBlocked(!showBlocked)}
                    className="w-full flex items-center justify-between p-4 bg-slate-200/50 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <i className="fa-solid fa-user-lock text-slate-400"></i>
                      Contas Ocultas / Canceladas ({blockedUsers.length})
                    </div>
                    <i className={`fa-solid fa-chevron-${showBlocked ? 'up' : 'down'} text-slate-400`}></i>
                  </button>

                  {showBlocked && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-4">
                      {blockedUsers.map(renderUserCard)}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};