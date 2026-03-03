import React, { useState } from 'react';

export interface Ticket {
  protocolo: string;
  associado: string;
  placa: string;
  status: string;
  atendente?: string;
  data?: string;
  agendado?: string;
  dia_horario_agendado?: string;
  supervisor?: string;
  pendencia?: string;
  justificativa_pendencia?: string;
}

const WEBHOOK_OPTIONS = [
  { 
    id: 'PRESTADOR_CAMINHO', 
    label: '🚀 Prestador a Caminho', 
    isCaminho: true,
    sheetField: 'hora_envio' 
  },
  { 
    id: 'NO_LOCAL', 
    label: '📍 Prestador no Local', 
    needsInput: true, 
    inputType: 'time', 
    inputLabel: 'Hora de Chegada',
    sheetField: 'hora_chegada'
  },
  { 
    id: 'PREVISAO', 
    label: '⏳ Atualizar Previsão', 
    needsInput: true, 
    inputType: 'time', 
    inputLabel: 'Nova Previsão' 
  },
  { id: 'FINALIZADO', label: '✅ Finalizar Atendimento', needsInput: false },
];

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (protocolo: string, targetSubmodule?: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  currentAttendant: string;
  onQuickEdit?: (protocolo: string, action: 'abertura' | 'fechamento') => void;
  onWebhook?: (protocolo: string, type: string, extraData?: string, fieldUpdate?: { key: string, value: string }) => Promise<void> | void;
}

export const TicketList: React.FC<TicketListProps> = ({ 
  tickets, onSelectTicket, isLoading, onRefresh, currentAttendant, onQuickEdit, onWebhook 
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedHook, setSelectedHook] = useState<Record<string, string>>({});
  const [hookInputVal, setHookInputVal] = useState<Record<string, string>>({});
  const [obsVal, setObsVal] = useState<Record<string, string>>({});

  const [saidaVal, setSaidaVal] = useState<Record<string, string>>({});
  const [tempoVal, setTempoVal] = useState<Record<string, string>>({});
  const [chegadaVal, setChegadaVal] = useState<Record<string, string>>({});
  const [processingHooks, setProcessingHooks] = useState<Record<string, boolean>>({});

  const handleTimeChange = (protocolo: string, type: 'saida' | 'tempo', value: string) => {
    let currentSaida = saidaVal[protocolo] || '';
    let currentTempo = tempoVal[protocolo] || '';

    if (type === 'saida') {
       currentSaida = value;
       setSaidaVal(prev => ({ ...prev, [protocolo]: value }));
    } else {
       currentTempo = value;
       setTempoVal(prev => ({ ...prev, [protocolo]: value }));
    }

    if (currentSaida && currentTempo) {
       const [h, m] = currentSaida.split(':').map(Number);
       const date = new Date();
       date.setHours(h, m + Number(currentTempo));
       const outH = String(date.getHours()).padStart(2, '0');
       const outM = String(date.getMinutes()).padStart(2, '0');
       setChegadaVal(prev => ({ ...prev, [protocolo]: `${outH}:${outM}` }));
    } else {
       setChegadaVal(prev => ({ ...prev, [protocolo]: '' }));
    }
  };

  const toggleExpand = (protocolo: string) => { setExpandedId(expandedId === protocolo ? null : protocolo); };

  const handleHookChange = (protocolo: string, hookId: string) => {
    setSelectedHook(prev => ({ ...prev, [protocolo]: hookId }));
    setHookInputVal(prev => ({ ...prev, [protocolo]: '' }));
  };

  const executeWebhook = async (protocolo: string) => {
    const hookId = selectedHook[protocolo];
    if (!hookId) return;

    const config = WEBHOOK_OPTIONS.find(w => w.id === hookId);
    const observation = obsVal[protocolo] || '';

    let finalData = '';
    let fieldUpdate = undefined;

    if (config?.isCaminho) {
        const s = saidaVal[protocolo];
        const t = tempoVal[protocolo];
        const c = chegadaVal[protocolo];
        if (!s || !t || !c) { alert("Por favor, preencha a hora de saída e o tempo estimado."); return; }
        finalData = `*Hora de Saída:* ${s}\n*Tempo Estimado:* ${t} minutos\n*Previsão de Chegada:* ${c}`;
        fieldUpdate = { key: config.sheetField, value: s };
    } else {
        const specificData = hookInputVal[protocolo] || '';
        if (config?.needsInput && !specificData) { alert(`Por favor, preencha o campo: ${config.inputLabel}`); return; }
        finalData = specificData;
        fieldUpdate = (config?.sheetField && specificData) ? { key: config.sheetField, value: specificData } : undefined;
    }

    if (hookId === 'CUSTOM' && !observation) { alert("Por favor, escreva uma mensagem."); return; }
    if (observation) { finalData = finalData ? `${finalData}\n📝 Obs: ${observation}` : observation; }

    setProcessingHooks(prev => ({ ...prev, [protocolo]: true })); 

    try {
      if(onWebhook) await onWebhook(protocolo, hookId, finalData, fieldUpdate);
    } finally {
      setProcessingHooks(prev => ({ ...prev, [protocolo]: false }));
      setObsVal(prev => ({ ...prev, [protocolo]: '' }));
      setHookInputVal(prev => ({ ...prev, [protocolo]: '' }));
      setSaidaVal(prev => ({ ...prev, [protocolo]: '' }));
      setTempoVal(prev => ({ ...prev, [protocolo]: '' }));
      setChegadaVal(prev => ({ ...prev, [protocolo]: '' }));
      setExpandedId(null);
    }
  };

  const safeTickets = tickets || [];
  const qtdAgendados = safeTickets.filter(t => t.agendado?.toLowerCase() === 'sim').length;
  const qtdCorrentes = safeTickets.length - qtdAgendados;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/40 overflow-hidden h-full flex flex-col animate-in slide-in-from-left-4 duration-500">
      
      <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex flex-col gap-3 backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-tower-broadcast text-cyan-600"></i> Central
            </h4>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Visão Global</p>
          </div>
          <button onClick={onRefresh} disabled={isLoading} className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-cyan-600 hover:border-cyan-300 hover:shadow-sm transition-all flex items-center justify-center">
            <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-blue-50/80 text-blue-700 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-blue-100 flex justify-between items-center shadow-sm">
            <span className="flex items-center gap-1"><i className="fa-solid fa-bolt text-blue-500"></i> Imediatos</span>
            <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">{qtdCorrentes}</span>
          </div>
          <div className="flex-1 bg-purple-50/80 text-purple-700 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-purple-100 flex justify-between items-center shadow-sm">
            <span className="flex items-center gap-1"><i className="fa-regular fa-clock text-purple-500"></i> Agendados</span>
            <span className="bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">{qtdAgendados}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/30">
        {safeTickets.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 opacity-60">
            <i className="fa-regular fa-folder-open text-4xl"></i>
            <span className="text-sm font-medium italic">Nenhum chamado pendente.</span>
          </div>
        ) : (
          safeTickets.map((t) => {
            const isExpanded = expandedId === t.protocolo;
            const currentHookId = selectedHook[t.protocolo];
            const currentHookConfig = WEBHOOK_OPTIONS.find(w => w.id === currentHookId);
            const isFinalizing = currentHookId === 'FINALIZADO';
            const isAgendado = t.agendado?.toLowerCase() === 'sim';
            
            return (
              <div key={t.protocolo} className={`group relative bg-white rounded-xl border transition-all cursor-pointer overflow-hidden ${isExpanded ? 'border-cyan-400 shadow-md ring-1 ring-cyan-100' : 'border-slate-100 hover:border-cyan-300 shadow-sm'}`}>
                
                <div className="p-4" onClick={() => toggleExpand(t.protocolo)}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-black text-sm text-slate-800 block mb-1">{t.associado}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                         <i className="fa-solid fa-user-headset text-cyan-500"></i> 
                         <span className="font-bold">{t.atendente ? t.atendente.split(' ')[0] : 'Sem dono'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5">
                      {isAgendado ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <i className="fa-regular fa-clock"></i> Agendado
                          </span>
                          {t.dia_horario_agendado && (
                            <span className="text-[9px] font-bold text-slate-400">
                              {t.dia_horario_agendado.replace('T', ' ')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <i className="fa-solid fa-bolt"></i> Imediato
                        </span>
                      )}
                      <i className={`fa-solid fa-chevron-down text-slate-300 text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180 text-cyan-500' : ''}`}></i>
                    </div>
                  </div>
                  
                  <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider ${
                        t.status === 'ABERTO' ? 'bg-green-50 text-green-600 border-green-100' : 
                        t.status === 'FECHADO' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-bold">
                        {t.protocolo}
                      </span>
                      
                      {t.pendencia === 'sim' && (
                        <span 
                          title={t.justificativa_pendencia}
                          className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-help"
                        >
                          <i className="fa-solid fa-triangle-exclamation"></i> Pendência
                        </span>
                      )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in slide-in-from-top-2 duration-200 space-y-5" onClick={(e) => e.stopPropagation()}>
                     
                     {t.pendencia === 'sim' && t.justificativa_pendencia && (
                       <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm animate-in fade-in">
                         <div className="flex items-start gap-2.5 text-amber-800">
                           <i className="fa-solid fa-triangle-exclamation mt-0.5 text-amber-600"></i>
                           <div>
                             <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 text-amber-600">
                               Atendimento com Pendência
                             </span>
                             <span className="text-xs font-medium text-amber-900">
                               {t.justificativa_pendencia}
                             </span>
                           </div>
                         </div>
                       </div>
                     )}

                     <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">Editar Dados</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button onClick={() => onQuickEdit?.(t.protocolo, 'abertura')} className="py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-cyan-600 hover:border-cyan-300 transition-colors flex items-center justify-center gap-2 shadow-sm">
                              <i className="fa-solid fa-pen"></i> Abertura
                           </button>
                           <button onClick={() => onQuickEdit?.(t.protocolo, 'fechamento')} className="py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-red-500 hover:border-red-300 transition-colors flex items-center justify-center gap-2 shadow-sm">
                              <i className="fa-solid fa-pen-to-square"></i> Fechamento
                           </button>
                        </div>
                     </div>

                     {onWebhook && (
                       <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider flex items-center gap-2">
                             <i className="fa-solid fa-bullhorn text-cyan-500"></i> Atualizar Status / Reporte
                          </label>
                          
                          <div className="space-y-3">
                             <div className="relative">
                               <select 
                                 className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-cyan-50 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                                 value={currentHookId || ''}
                                 onChange={(e) => handleHookChange(t.protocolo, e.target.value)}
                               >
                                 <option value="">Selecione uma ação...</option>
                                 {WEBHOOK_OPTIONS.map(opt => (
                                   <option key={opt.id} value={opt.id}>{opt.label}</option>
                                 ))}
                                 <option value="CUSTOM">💬 Mensagem Livre</option>
                               </select>
                               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                 <i className="fa-solid fa-chevron-down text-xs"></i>
                               </div>
                             </div>

                             {currentHookConfig?.needsInput && !currentHookConfig?.isCaminho && (
                               <div className="animate-in fade-in slide-in-from-top-1">
                                  <label className="text-[9px] font-bold text-cyan-600 uppercase ml-1 mb-1 block">
                                    {currentHookConfig.inputLabel}:
                                  </label>
                                  <input 
                                     type={currentHookConfig.inputType || 'text'}
                                     className="w-full px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg text-xs font-bold text-cyan-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
                                     value={hookInputVal[t.protocolo] || ''}
                                     onChange={(e) => setHookInputVal(prev => ({ ...prev, [t.protocolo]: e.target.value }))}
                                  />
                               </div>
                             )}

                             {currentHookConfig?.isCaminho && (
                               <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1">
                                 <div>
                                   <label className="text-[9px] font-bold text-cyan-600 uppercase ml-1 mb-1 block">Saída:</label>
                                   <input 
                                     type="time" 
                                     className="w-full px-2 py-2 bg-cyan-50 border border-cyan-200 rounded-lg text-xs font-bold text-cyan-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
                                     value={saidaVal[t.protocolo] || ''}
                                     onChange={(e) => handleTimeChange(t.protocolo, 'saida', e.target.value)}
                                   />
                                 </div>
                                 <div>
                                   <label className="text-[9px] font-bold text-cyan-600 uppercase ml-1 mb-1 block">Minutos:</label>
                                   <input 
                                     type="number" 
                                     placeholder="Ex: 40"
                                     className="w-full px-2 py-2 bg-cyan-50 border border-cyan-200 rounded-lg text-xs font-bold text-cyan-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
                                     value={tempoVal[t.protocolo] || ''}
                                     onChange={(e) => handleTimeChange(t.protocolo, 'tempo', e.target.value)}
                                   />
                                 </div>
                                 <div>
                                   <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Chegada Est.:</label>
                                   <input 
                                     type="time" 
                                     className="w-full px-2 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none"
                                     value={chegadaVal[t.protocolo] || ''}
                                     onChange={(e) => setChegadaVal(prev => ({ ...prev, [t.protocolo]: e.target.value }))} 
                                   />
                                 </div>
                               </div>
                             )}

                             {currentHookId && (
                               <div className="animate-in fade-in slide-in-from-top-1">
                                 <input 
                                   type="text" 
                                   placeholder={currentHookId === 'CUSTOM' ? "Escreva sua mensagem aqui..." : "Observação opcional..."}
                                   value={obsVal[t.protocolo] || ''}
                                   onChange={(e) => setObsVal(prev => ({ ...prev, [t.protocolo]: e.target.value }))}
                                   className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:border-cyan-500 outline-none"
                                 />
                               </div>
                             )}

                             {(() => {
                               const isHookProcessing = processingHooks[t.protocolo]; 
                               return (
                                 <button
                                   onClick={() => executeWebhook(t.protocolo)}
                                   disabled={!currentHookId || isHookProcessing}
                                   className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md
                                     ${!currentHookId 
                                       ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                       : isHookProcessing
                                         ? 'bg-cyan-600 text-white cursor-wait' 
                                         : isFinalizing 
                                           ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/30' 
                                           : 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-800/30'
                                     }`}
                                 >
                                   {isHookProcessing ? (
                                     <> <i className="fa-solid fa-circle-notch fa-spin"></i> Processando... </>
                                   ) : isFinalizing ? (
                                     <> <i className="fa-solid fa-lock"></i> Encerrar e Reportar </>
                                   ) : (
                                     <> <i className="fa-solid fa-paper-plane"></i> Enviar Atualização </>
                                   )}
                                 </button>
                               );
                             })()}
                          </div>
                       </div>
                     )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};