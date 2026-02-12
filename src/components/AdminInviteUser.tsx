import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient'; // Ajuste o caminho se necessário

export const AdminInviteUser = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('assistencia');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      // Insere na tabela de permissões (Whitelist)
      const { error } = await supabase
        .from('user_permissions')
        .insert({ 
          email: email.toLowerCase().trim(), 
          role: role, 
          active: true 
        });

      if (error) throw error;

      alert(`✅ Sucesso! O email ${email} foi liberado.`);
      setEmail(''); // Limpa o campo
    } catch (error: any) {
      console.error(error);
      alert("Erro ao adicionar: " + (error.message || "Verifique se você é Admin."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 max-w-md">
      <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
        <i className="fa-solid fa-user-plus text-cyan-600"></i> Liberar Novo Acesso
      </h3>
      
      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email do Google</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all"
            placeholder="colaborador@gmail.com"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cargo / Permissão</label>
          <div className="relative">
            <select 
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-cyan-500 bg-white appearance-none cursor-pointer"
            >
              <option value="assistencia">Operador (Assistência)</option>
              <option value="financeiro">Financeiro</option>
              <option value="admin">Administrador Geral</option>
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-slate-800 hover:bg-black text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
          Liberar Entrada
        </button>
      </form>
    </div>
  );
};