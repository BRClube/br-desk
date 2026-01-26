import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { getAvailableModules } from '../utils/permissions';

interface AppRole {
  id: string;
  name: string;
  modules: string[];
}

export const RoleManager = ({ onClose }: { onClose: () => void }) => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle do Formulário
  const [isEditing, setIsEditing] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const availableModules = getAvailableModules(); // Pega do constants.tsx automaticamente

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    const { data, error } = await supabase.from('app_roles').select('*').order('name');
    if (!error && data) setRoles(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!roleName.trim()) return alert('Dê um nome ao perfil');

    const payload = {
      name: roleName,
      modules: selectedModules
    };

    try {
      if (editingId) {
        // Atualizar
        await supabase.from('app_roles').update(payload).eq('id', editingId);
      } else {
        // Criar Novo
        await supabase.from('app_roles').insert([payload]);
      }
      setIsEditing(false);
      setRoleName('');
      setSelectedModules([]);
      setEditingId(null);
      fetchRoles();
    } catch (error) {
      alert('Erro ao salvar perfil');
    }
  };

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      setSelectedModules(selectedModules.filter(m => m !== id));
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  const startEdit = (role: AppRole) => {
    setRoleName(role.name);
    setSelectedModules(role.modules);
    setEditingId(role.id);
    setIsEditing(true);
  };

  const deleteRole = async (id: string) => {
    if (confirm('Tem certeza? Usuários com esse perfil ficarão sem acesso.')) {
      await supabase.from('app_roles').delete().eq('id', id);
      fetchRoles();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Perfis de Permissão</h2>
            <p className="text-sm text-slate-500">Crie grupos de acesso baseados nos módulos do sistema.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex gap-6">
          
          {/* Coluna da Esquerda: Lista de Perfis */}
          <div className="w-1/3 border-r border-slate-100 pr-6 space-y-4">
            <button 
              onClick={() => { setIsEditing(true); setRoleName(''); setSelectedModules([]); setEditingId(null); }}
              className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-plus"></i> Novo Perfil
            </button>
            
            <div className="space-y-2">
              {roles.map(role => (
                <div key={role.id} className="p-3 border border-slate-200 rounded-lg flex justify-between items-center hover:border-cyan-300 transition group">
                  <span className="font-bold text-slate-700">{role.name}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEdit(role)} className="text-blue-500 hover:text-blue-700"><i className="fa-solid fa-pen"></i></button>
                    {role.name !== 'Super Admin' && (
                       <button onClick={() => deleteRole(role.id)} className="text-red-500 hover:text-red-700"><i className="fa-solid fa-trash"></i></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna da Direita: Editor */}
          <div className="w-2/3 pl-2">
            {isEditing ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="font-bold text-lg text-slate-800 mb-4">
                  {editingId ? 'Editar Perfil' : 'Criar Novo Perfil'}
                </h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Nome do Perfil</label>
                  <input 
                    type="text" 
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Ex: Financeiro, Operacional..."
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Módulos Permitidos</label>
                  <div className="grid grid-cols-2 gap-3">
                    {availableModules.map(mod => (
                      <div 
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${
                          selectedModules.includes(mod.id) 
                            ? 'bg-cyan-50 border-cyan-500 text-cyan-800' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          selectedModules.includes(mod.id) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'
                        }`}>
                          {selectedModules.includes(mod.id) && <i className="fa-solid fa-check text-white text-xs"></i>}
                        </div>
                        <i className={`fa-solid ${mod.icon}`}></i>
                        <span className="font-semibold text-sm">{mod.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button onClick={handleSave} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 shadow-lg shadow-cyan-200">Salvar Perfil</button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <i className="fa-solid fa-shield-halved text-6xl mb-4"></i>
                <p>Selecione um perfil para editar ou crie um novo.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};