import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../hooks/useCRM';
import { DEPARTMENTS } from '../constants';
import { getThemeStyles } from '../utils/theme';
import { TicketList } from '../components/TicketList';
import { QuickMessagesWidget, ProtocolWidget } from '../components/QuickMessagesWidget';
import { AttendanceWidget } from '../components/AttendanceWidget';

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

const Department: React.FC = () => {
  const { deptId } = useParams<{ deptId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // Usamos o nosso novo motor CRM
  const { tickets, isLoadingTickets, loadTickets, handleSendWebhook } = useCRM();
  const [isLoading, setIsLoading] = useState(false);

  const currentDeptObj = DEPARTMENTS.find(d => d.id === deptId);

  // Quando clica num ticket, busca os dados e manda para o formulário
  const handleEditTicket = async (protocolo: string, targetSubmodule: string = 'abertura_assistencia') => {
    setIsLoading(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'buscar_detalhes_protocolo', protocolo, token_acesso: API_TOKEN })
      });
      const text = await response.text();
      const cleanText = text.match(/\{[\s\S]*\}/)?.[0] || text;
      const data = JSON.parse(cleanText);

      if (data.status === 'sucesso') {
        // 👇 O SEGREDO: Navega enviando os dados ocultos na memória (state) 👇
        navigate(`/form/${deptId}/${targetSubmodule}`, { state: { ticketData: data.dados } });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert("Erro ao carregar: " + data.msg);
      }
    } catch (error) {
      alert("Erro de conexão ao carregar detalhes.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentDeptObj) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* CABEÇALHO DO DEPARTAMENTO */}
      <div className="flex-none flex items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <i className={`fa-solid ${currentDeptObj.icon} text-cyan-500`}></i>
            {currentDeptObj.name}
          </h2>
          {currentDeptObj.workspaceUrl && (
            <a href={currentDeptObj.workspaceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 hover:bg-slate-800 hover:text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm group">
              <i className="fa-brands fa-google-drive text-sm group-hover:scale-110 transition-transform"></i>
              Workspace
            </a>
          )}
        </div>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-cyan-600 font-bold text-sm transition-all flex items-center gap-2">
          <i className="fa-solid fa-arrow-left"></i> Voltar ao Início
        </button>
      </div>

      {/* RENDERIZAÇÃO DO MEIO (ASSISTÊNCIA VS OUTROS) */}
      {deptId === 'assistance' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
           <div className="xl:col-span-8">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentDeptObj.submodules.map((sub) => {
                const theme = getThemeStyles(currentDeptObj.colorClass);
                return (
                  <button key={sub.id} onClick={() => navigate(`/form/${deptId}/${sub.id}`)} className={`flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all text-left group ${theme.border} ${theme.bgLight}`}>
                    <div className={`w-10 h-10 shrink-0 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center transition-colors group-hover:text-white ${theme.bgSolid}`}>
                      <i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon}`}></i>
                    </div>
                    <span className={`font-bold text-slate-700 text-sm transition-colors line-clamp-2 ${theme.text}`}>{sub.name}</span>
                  </button>
                );
              })}
             </div>
           </div>
           <div className="xl:col-span-4 flex flex-col space-y-4">
             <div className="bg-white p-3 rounded-xl border border-cyan-100 shadow-sm">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2"><i className="fa-solid fa-list-ul text-cyan-500"></i> Em Aberto</h3>
             </div>
             <div className="flex-1 min-h-[400px]">
                <TicketList tickets={tickets} onSelectTicket={handleEditTicket} isLoading={isLoadingTickets} onRefresh={loadTickets} currentAttendant={profile?.full_name || profile?.email || 'Usuário'} onQuickEdit={(prot, action) => handleEditTicket(prot, action === 'abertura' ? 'abertura_assistencia' : 'fechamento_assistencia')} onWebhook={handleSendWebhook} />
             </div>
           </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {currentDeptObj.submodules && currentDeptObj.submodules.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentDeptObj.submodules.map((sub) => {
                  const theme = getThemeStyles(currentDeptObj.colorClass);
                  return (
                    <button key={sub.id} onClick={() => navigate(`/form/${deptId}/${sub.id}`)} className={`flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all text-left group ${theme.border} ${theme.bgLight}`}>
                      <div className={`w-10 h-10 shrink-0 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center transition-colors group-hover:text-white ${theme.bgSolid}`}><i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon}`}></i></div>
                      <span className={`font-bold text-slate-700 text-sm transition-colors line-clamp-2 ${theme.text}`}>{sub.name}</span>
                    </button>
                  );
                })}
            </div>
          )}
          {currentDeptObj.groups?.map((group, index) => (
            <div key={index} className="animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-folder-open"></i> {group.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.items.map((sub) => {
                  const theme = getThemeStyles(currentDeptObj.colorClass);
                  return (
                    <button key={sub.id} onClick={() => navigate(`/form/${deptId}/${sub.id}`)} className={`flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all text-left group ${theme.border} ${theme.bgLight}`}>
                      <div className={`w-10 h-10 shrink-0 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center transition-colors group-hover:text-white ${theme.bgSolid}`}><i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon}`}></i></div>
                      <span className={`font-bold text-slate-700 text-sm transition-colors line-clamp-2 ${theme.text}`}>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BARRA FLUTUANTE */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 z-50 bg-white/50 backdrop-blur-md p-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/60">
        <QuickMessagesWidget currentDepartment={deptId!} userRole={profile?.role || 'user'} apiUrl={GOOGLE_SCRIPT_URL} apiToken={API_TOKEN} />
        <ProtocolWidget currentDepartment={deptId!} userRole={profile?.role || 'user'} apiUrl={GOOGLE_SCRIPT_URL} apiToken={API_TOKEN} />
        <AttendanceWidget currentDepartment={deptId!} apiUrl={GOOGLE_SCRIPT_URL} apiToken={API_TOKEN} />
        {deptId === 'billing' && (
          <a href="https://login.spcbrasil.com.br/realms/associado/protocol/openid-connect/auth?response_type=code&client_id=spcjava&scope=openid+email+profile&redirect_uri=https%3A%2F%2Fsistema.spcbrasil.com.br%2Fspc%2Fopenid_connect_login&nonce=17d1e81083680&state=340d600c0afb7" target="_blank" rel="noopener noreferrer" className="h-10 px-4 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white rounded-full transition-all duration-300 shadow-sm hover:shadow-orange-200 group">
            <span className="text-[11px] font-black uppercase tracking-wider leading-none">SPC</span>
          </a>
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5 max-w-sm text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-cyan-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><i className="fa-solid fa-cloud-arrow-down text-cyan-500 text-xl animate-pulse"></i></div>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Puxando Dados...</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Aguarde enquanto comunicamos com a base de dados.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Department;