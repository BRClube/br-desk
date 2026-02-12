import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient'; // Sua configuração do Supabase

export const AdminInviteUser = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('assistencia');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      // Tenta inserir na tabela de permissões
      const { error } = await supabase
        .from('user_permissions')
        .upsert({ 
          email: email.toLowerCase().trim(), 
          role: role, 
          active: true 
        });

      if (error) throw error;

      alert(`✅ Acesso liberado para ${email}! Quando ele logar, entrará direto.`);
      setEmail('');
    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 max-w-md mx-auto">
      <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
        <i className="fa-solid fa-user-shield text-cyan-600"></i> Liberar Acesso (Supabase)
      </h3>
      
      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Email do Colaborador</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500"
            placeholder="colaborador@gmail.com"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Perfil de Acesso</label>
          <select 
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500 bg-white"
          >
            <option value="assistencia">Assistência 24H</option>
            <option value="financeiro">Financeiro</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
          Pré-Aprovar Acesso
        </button>
      </form>
    </div>
  );
};