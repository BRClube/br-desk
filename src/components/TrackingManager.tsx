import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export interface TrackingOrder {
  protocolo: string;
  tipo_protocolo?: string;
  tecnico?: string;
  telefone_tecnico?: string;
  informado?: string;
  local_instalado?: string;
  associado: string;
  cpf_cnpj?: string;
  data_nasc?: string;
  email?: string;
  telefone?: string;
  genero?: string;
  placa: string;
  veiculo?: string;
  cor?: string;
  ano?: string;
  renavam?: string;
  chassi?: string;
  imei?: string;
  plataforma?: string;
  endereco?: string;
  data_horario?: string;
  status: 'Pendente' | 'Agendado' | 'Instalado' | 'Em Manutenção' | 'Desinstalado' | string;
  nome?: string;
  data_registro?: string;
}

interface TrackingManagerProps {
  apiUrl: string;
  apiToken: string;
  webhookUrl: string; 
}

const STATUS_COLORS: Record<string, string> = {
  'Agendado': 'bg-purple-100 text-purple-700 border-purple-200',
  'Instalado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Em Manutenção': 'bg-amber-100 text-amber-700 border-amber-200',
  'Desinstalado': 'bg-red-100 text-red-700 border-red-200',
};

const ALL_STATUSES = ['Todos', 'Agendado', 'Instalado', 'Em Manutenção', 'Desinstalado'];

export const TrackingManager: React.FC<TrackingManagerProps> = ({ apiUrl, apiToken, webhookUrl }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Estados para as Buscas e Filtros
  const [searchProtocolo, setSearchProtocolo] = useState('');
  const [searchPlaca, setSearchPlaca] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  
  // Estado para o Modal de Detalhes
  const [selectedOrder, setSelectedOrder] = useState<TrackingOrder | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl, { 
        method: 'POST', 
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'buscar_rastreadores', token_acesso: apiToken }) 
      });
      const text = await res.text();
      const cleanText = text.match(/\{[\s\S]*\}/)?.[0] || text;
      const data = JSON.parse(cleanText);
      
      console.log("Resposta do Google (Buscar Rastreadores):", data);

      if (data.status === 'sucesso') {
        setOrders(data.pedidos);
      } else {
        console.error("Erro do Google:", data.msg);
      }
    } catch (error) {
      console.error("Erro CRÍTICO ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (protocolo: string, placa: string, novoStatus: string) => {
    setUpdatingId(protocolo);
    
    // Puxa todos os dados deste carro específico para mandar no Webhook
    const order = orders.find(o => o.protocolo === protocolo);

    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'atualizar_status_rastreador',
          protocolo,
          novo_status: novoStatus,
          operador: profile?.full_name,
          token_acesso: apiToken
        })
      });

      // --- FORMATAÇÃO DE DATA E HORA ---
      const dataHorarioRaw = order?.data_horario || '';
      let dataFormatada = '-';
      let horaFormatada = '-';
      
      if (dataHorarioRaw.includes('T')) {
          const [dataParte, horaParte] = dataHorarioRaw.split('T');
          const [ano, mes, dia] = dataParte.split('-');
          dataFormatada = `${dia}/${mes}/${ano}`;
          horaFormatada = horaParte.replace(':', 'h');
      }

      // --- FORMATAÇÃO DE TIPO E PLATAFORMA ---
      const tipoRaw = String(order?.tipo_protocolo || '').toUpperCase();
      let tipoServico = 'SERVIÇO';
      if (tipoRaw.includes('DESINSTAL')) tipoServico = 'DESINSTALAÇÃO';
      else if (tipoRaw.includes('MANUTEN')) tipoServico = 'MANUTENÇÃO';
      else if (tipoRaw.includes('INSTAL')) tipoServico = 'INSTALAÇÃO';

      const platRaw = String(order?.plataforma || '').toUpperCase();
      let platFormatada = order?.plataforma || '-';
      if (platRaw.includes('REDE')) platFormatada = 'Rede Loc';
      if (platRaw.includes('RASTREIE')) platFormatada = 'Rastreie Brasil';

      // 👇 A MENSAGEM EXATAMENTE COMO VOCÊ PEDIU 👇
      const mensagem = `🔄 *ATUALIZAÇÃO DE STATUS: ${novoStatus}*
📍 *AGENDAMENTO – ${tipoServico} DE RASTREADOR*

Associado: ${order?.nome || order?.associado || '-'}
Telefone: ${order?.telefone || '-'}

🚗 Veículo: ${order?.veiculo || '-'}
Placa: ${placa || '-'}
Cor: ${order?.cor || '-'}
Ano: ${order?.ano || '-'}

📍 Endereço:
${order?.endereco || '-'}

📅 Data: ${dataFormatada}

⏰ Horário: ${horaFormatada}

🔧 Técnico: ${order?.tecnico || '-'}

📡 Plataforma: ${platFormatada}`;

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: mensagem })
      });

      setOrders(prev => prev.map(o => o.protocolo === protocolo ? { ...o, status: novoStatus } : o));

      if (selectedOrder?.protocolo === protocolo) {
          setSelectedOrder(prev => prev ? { ...prev, status: novoStatus } : null);
      }

    } catch (error) {
      alert("Erro ao atualizar o status. Tente novamente.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtragem local (Busca + Status)
  const filteredOrders = orders.filter(order => {
    const protStr = String(order.protocolo || '').toLowerCase();
    const placaStr = String(order.placa || '').toLowerCase();
    
    const matchProtocolo = protStr.includes(searchProtocolo.toLowerCase());
    const matchPlaca = placaStr.includes(searchPlaca.toLowerCase());
    const matchStatus = filterStatus === 'Todos' || order.status === filterStatus;
    
    return matchProtocolo && matchPlaca && matchStatus;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      {/* Cabeçalho com Buscas */}
      <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-satellite-dish text-teal-600"></i> Gestão de Instalações
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Acompanhamento de Veículos</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <i className="fa-solid fa-hashtag absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input 
                type="text" 
                placeholder="Buscar Protocolo..." 
                value={searchProtocolo}
                onChange={(e) => setSearchProtocolo(e.target.value)}
                className="pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all w-full sm:w-40"
              />
            </div>
            
            <div className="relative">
              <i className="fa-solid fa-car absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input 
                type="text" 
                placeholder="Buscar Placa..." 
                value={searchPlaca}
                onChange={(e) => setSearchPlaca(e.target.value)}
                className="pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all w-full sm:w-40 uppercase"
              />
            </div>

            <button onClick={fetchOrders} disabled={loading} className="w-9 h-9 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-teal-600 hover:border-teal-300 transition-all flex items-center justify-center shadow-sm shrink-0">
              <i className={`fa-solid fa-rotate ${loading ? 'fa-spin text-teal-600' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Filtros de Status (Pills) */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {ALL_STATUSES.map(status => (
             <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap
                  ${filterStatus === status 
                    ? 'bg-teal-600 text-white shadow-md' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                  }
                `}
             >
               {status} {status !== 'Todos' && <span className="ml-1 opacity-70">({orders.filter(o => o.status === status).length})</span>}
             </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              <th className="p-4 pl-6 font-bold">Protocolo</th>
              <th className="p-4 font-bold">Placa</th>
              <th className="p-4 font-bold">Associado</th>
              <th className="p-4 font-bold">Status Atual</th>
              <th className="p-4 pr-6 font-bold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic text-sm">Nenhum veículo encontrado na busca.</td></tr>
            ) : (
              filteredOrders.map((order) => (
                <tr 
                  key={order.protocolo} 
                  onClick={() => setSelectedOrder(order)} // Clicar na linha abre o modal
                  className="hover:bg-teal-50/30 transition-colors cursor-pointer group"
                >
                  <td className="p-4 pl-6 font-mono text-xs font-bold text-slate-500 group-hover:text-teal-600 transition-colors">{order.protocolo}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-black tracking-widest uppercase">
                      {order.placa}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-700">{order.associado}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${STATUS_COLORS[order.status] || STATUS_COLORS['Agendado']}`}>
                        {order.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      
                      {/* O DROPDOWN DE STATUS (MANTIDO) */}
                      <div className="relative inline-block text-left">
                        <select
                          disabled={updatingId === order.protocolo}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.protocolo, order.placa, e.target.value)}
                          className={`appearance-none bg-white border border-slate-200 text-[11px] font-bold text-slate-600 py-2 pl-3 pr-8 rounded-lg outline-none cursor-pointer hover:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all ${updatingId === order.protocolo ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <option value="Agendado">📅 Agendado</option>
                          <option value="Instalado">✅ Instalado</option>
                          <option value="Em Manutenção">🛠️ Em Manutenção</option>
                          <option value="Desinstalado">❌ Desinstalado</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                          {updatingId === order.protocolo ? <i className="fa-solid fa-spinner fa-spin text-[10px]"></i> : <i className="fa-solid fa-chevron-down text-[10px]"></i>}
                        </div>
                      </div>

                      {/* OS 3 PONTINHOS (MENSAGENS RÁPIDAS) */}
                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === order.protocolo ? null : order.protocolo); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <i className="fa-solid fa-ellipsis-vertical"></i>
                        </button>

                        {openMenuId === order.protocolo && (
                          <>
                            {/* Camada invisível em ecrã inteiro para fechar ao clicar fora */}
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                            
                            {/* O Menu em si */}
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Copiar Mensagem</span>
                              </div>
                              <div className="flex flex-col text-left">
                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  
                                  // 1. Formata a Data e Hora (Cortando os milissegundos e segundos)
                                  let dataF = '-';
                                  let horaF = '-';
                                  if (order.data_horario && order.data_horario.includes('T')) {
                                      const [dP, hP] = order.data_horario.split('T');
                                      const [ano, mes, dia] = dP.split('-');
                                      dataF = `${dia}/${mes}/${ano}`;
                                      horaF = hP.substring(0, 5).replace(':', 'h'); // Corta só os 5 primeiros caracteres e fica "22h29"
                                  }

                                  // 2. Define o Tipo de Serviço exato
                                  const tipoRaw = String(order.tipo_protocolo || '').toUpperCase();
                                  let tipoServico = 'INSTALAÇÃO';
                                  if (tipoRaw.includes('DESINSTAL')) tipoServico = 'DESINSTALAÇÃO';
                                  else if (tipoRaw.includes('MANUTEN')) tipoServico = 'MANUTENÇÃO';

                                  // 3. Monta o Local Instalado (Condicional)
                                  const exibirLocal = order.local_instalado && (tipoServico === 'DESINSTALAÇÃO' || tipoServico === 'MANUTENÇÃO')
                                      ? `Local Instalado: ${order.local_instalado}\n\n`
                                      : '';

                                  // 4. Monta a Mensagem Completa
                                  const msg = `*PROTOCOLO DE AGENDAMENTO PARA ${tipoServico} DE RASTREADOR*

Nome completo: ${order.nome || order.associado || '-'}

Telefone: ${order.telefone || '-'}

*Gênero: * ${order.genero || '-'}

Placa: ${order.placa || '-'}

Modelo: ${order.veiculo || '-'}

Cor: ${order.cor || '-'}

Ano: ${order.ano || '-'}

${exibirLocal}N.º do EMEI: ${order.imei || '-'}

Endereço: ${order.endereco || '-'}

Data: ${dataF} - Horário: ${horaF}`;

                                  navigator.clipboard.writeText(msg); 
                                  setCopiedAction('prestador-' + order.protocolo);
                                  setTimeout(() => { setCopiedAction(null); setOpenMenuId(null); }, 1000);
                                }} className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 border-b border-slate-50 flex items-center gap-2 transition-colors">
                                  <i className={`w-4 text-center ${copiedAction === 'prestador-' + order.protocolo ? 'fa-solid fa-check text-emerald-500' : 'fa-solid fa-screwdriver-wrench'}`}></i> 
                                  {copiedAction === 'prestador-' + order.protocolo ? <span className="text-emerald-600">Copiado!</span> : "Para o Técnico"}
                                </button>
                                
                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  // 1. Formata a Data e Hora (Cortando milissegundos)
                                  let dataF = '-';
                                  let horaF = '-';
                                  const dataRef = order.data_horario || ''; // Se a sua variável for "order" ou "data", mude aqui!

                                  if (dataRef && dataRef.includes('T')) {
                                      const [dP, hP] = dataRef.split('T');
                                      const [ano, mes, dia] = dP.split('-');
                                      dataF = `${dia}/${mes}/${ano}`;
                                      horaF = hP.substring(0, 5).replace(':', 'h');
                                  }

                                  // 2. Formata Data de Nascimento
                                  let dataNascF = order.data_nasc || '-';
                                  if (dataNascF.includes('-')) {
                                      const [anoN, mesN, diaN] = dataNascF.split('-');
                                      dataNascF = `${diaN}/${mesN}/${anoN}`;
                                  }

                                  // 3. Define o Tipo de Serviço e Plataforma
                                  const tipoRaw = String(order.tipo_protocolo || '').toUpperCase();
                                  let tipoServico = 'INSTALAÇÃO';
                                  if (tipoRaw.includes('DESINSTAL')) tipoServico = 'DESINSTALAÇÃO';
                                  else if (tipoRaw.includes('MANUTEN')) tipoServico = 'MANUTENÇÃO';

                                  const platRaw = String(order.plataforma || '').toUpperCase();
                                  let platFormatada = order.plataforma || '-';
                                  if (platRaw.includes('REDE')) platFormatada = 'Rede Loc';
                                  if (platRaw.includes('RASTREIE')) platFormatada = 'Rastreie Brasil';

                                  // 4. Monta o Local Instalado (Condicional)
                                  const exibirLocal = order.local_instalado && (tipoServico === 'DESINSTALAÇÃO' || tipoServico === 'MANUTENÇÃO')
                                      ? `Local Instalado: ${order.local_instalado}\n\n`
                                      : '';

                                  // 5. A Mensagem Completa para a Plataforma
const msgPlataforma = `💻 *CADASTRO NA PLATAFORMA - ${platFormatada.toUpperCase()}*
*Serviço:* ${tipoServico}
*Protocolo:* ${order.protocolo || '-'}

Nome completo: ${order.nome || order.associado || '-'}

CPF/CNPJ: ${order.cpf_cnpj || '-'}

Data de nascimento: ${dataNascF}

E-mail: ${order.email || '-'}

Telefone: ${order.telefone || '-'}

*Gênero: * ${order.genero || '-'}

Placa: ${order.placa || '-'}

Modelo: ${order.veiculo || '-'}

Cor: ${order.cor || '-'}

Ano: ${order.ano || '-'}

Renavam: ${order.renavam || '-'}

Chassi: ${order.chassi || '-'}

${exibirLocal}N.º do EMEI: ${order.imei || '-'}

Técnico: ${order.tecnico || '-'} (${order.telefone_tecnico || '-'})

Técnico Informado: ${String(order.informado || '-').toUpperCase()}

Endereço: ${order.endereco || '-'}

Data: ${dataF} - Horário: ${horaF}`;
                                  navigator.clipboard.writeText(msgPlataforma); 
                                  setCopiedAction('plataforma-' + order.protocolo);
                                  setTimeout(() => { setCopiedAction(null); setOpenMenuId(null); }, 1000);
                                }} className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-50 flex items-center gap-2 transition-colors">
                                  <i className={`w-4 text-center ${copiedAction === 'plataforma-' + order.protocolo ? 'fa-solid fa-check text-emerald-500' : 'fa-solid fa-laptop-code'}`}></i> 
                                  {copiedAction === 'plataforma-' + order.protocolo ? <span className="text-emerald-600">Copiado!</span> : "Para a Plataforma"}
                                </button>

                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  const msg = `Olá, ${order.associado || '-'}! Tudo bem?\n\nO seu agendamento de *${(order.tipo_protocolo || 'Instalação').toUpperCase()}* de rastreador foi confirmado.\n\n📅 *Data/Hora:* ${order.data_horario ? new Date(order.data_horario).toLocaleString('pt-BR') : '-'}\n📍 *Local:* ${order.endereco || '-'}\n👨‍🔧 *Técnico:* ${order.tecnico || '-'}\n\nQualquer dúvida, estamos à disposição!`;
                                  navigator.clipboard.writeText(msg); 
                                  setCopiedAction('associado-' + order.protocolo);
                                  setTimeout(() => { setCopiedAction(null); setOpenMenuId(null); }, 1000);
                                }} className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors">
                                  <i className={`w-4 text-center ${copiedAction === 'associado-' + order.protocolo ? 'fa-solid fa-check text-emerald-500' : 'fa-solid fa-user'}`}></i> 
                                  {copiedAction === 'associado-' + order.protocolo ? <span className="text-emerald-600">Copiado!</span> : "Para o Cliente"}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================================================================= */}
      {/* MODAL DE DETALHES DO VEÍCULO */}
      {/* ================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            
            {/* Header do Modal */}
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center relative overflow-hidden">
               <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
               <div>
                 <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border mb-2 inline-block ${STATUS_COLORS[selectedOrder.status] || STATUS_COLORS['Agendado']}`}>
                    {selectedOrder.status}
                 </span>
                 <h2 className="text-xl font-black text-slate-800">{selectedOrder.associado || 'Associado Não Informado'}</h2>
                 <p className="text-xs text-slate-500 font-mono mt-1 font-bold">Protocolo: {selectedOrder.protocolo}</p>
               </div>

               {/* BOTOES DO HEADER DO MODAL */}
               <div className="flex items-center gap-2 z-10">
                 <button 
                   onClick={() => {
                     // Navega para o formulário passando a flag "isEditMode" oculta na memória
                     navigate(`/form/tracking/protocolo-instalar-rastreador`, { 
                       state: { ticketData: selectedOrder, isEditMode: true } 
                     });
                   }} 
                   className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-500 hover:border-blue-200 shadow-sm transition-all"
                   title="Editar Atendimento"
                 >
                   <i className="fa-solid fa-pen"></i>
                 </button>
                 <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-all">
                   <i className="fa-solid fa-xmark"></i>
                 </button>
               </div>
            </div>

            {/* Body do Modal */}
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
               
               {/* Secção 1: Veículo */}
               <div>
                  <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest mb-3 flex items-center gap-2"><i className="fa-solid fa-car-side"></i> Dados do Veículo</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div><span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Placa</span><span className="text-sm font-black text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">{selectedOrder.placa}</span></div>
                     <div><span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Veículo</span><span className="text-sm font-bold text-slate-700">{selectedOrder.veiculo || '-'}</span></div>
                     <div><span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Cor / Ano</span><span className="text-sm font-bold text-slate-700">{selectedOrder.cor || '-'} {selectedOrder.ano ? `/ ${selectedOrder.ano}` : ''}</span></div>
                     <div><span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Renavam</span><span className="text-sm font-bold text-slate-700">{selectedOrder.renavam || '-'}</span></div>
                     <div className="col-span-2"><span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Chassi</span><span className="text-sm font-bold text-slate-700">{selectedOrder.chassi || '-'}</span></div>
                  </div>
               </div>

               {/* Secção 2: Técnico e Equipamento */}
               <div>
                  <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest mb-3 flex items-center gap-2"><i className="fa-solid fa-screwdriver-wrench"></i> Instalação</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Técnico Responsável</span><span className="text-sm font-bold text-slate-700">{selectedOrder.tecnico || '-'}</span><div className="text-xs text-slate-500 mt-1"><i className="fa-solid fa-phone mr-1"></i> {selectedOrder.telefone_tecnico || '-'}</div></div>
                     <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Equipamento (IMEI)</span><span className="text-sm font-mono font-bold text-slate-700">{selectedOrder.imei || '-'}</span><div className="text-xs text-slate-500 mt-1"><i className="fa-solid fa-satellite mr-1"></i> Plataforma: {selectedOrder.plataforma || '-'}</div></div>
                     {selectedOrder.local_instalado && (
                        <div className="col-span-1 sm:col-span-2 bg-yellow-50 p-3 rounded-xl border border-yellow-200"><span className="block text-[10px] uppercase font-bold text-yellow-600 mb-0.5">Local Instalado no Veículo</span><span className="text-sm font-bold text-yellow-800">{selectedOrder.local_instalado}</span></div>
                     )}
                  </div>
               </div>

               {/* Secção 3: Informações Adicionais */}
               <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><i className="fa-solid fa-address-book"></i> Contato e Local</h3>
                  <div className="text-sm text-slate-600 space-y-2">
                     <p><strong className="text-slate-800">Telefone do Associado:</strong> {selectedOrder.telefone || '-'}</p>
                     <p><strong className="text-slate-800">E-mail:</strong> {selectedOrder.email || '-'}</p>
                     <p><strong className="text-slate-800">Endereço (OS):</strong> {selectedOrder.endereco || '-'}</p>
                     <p><strong className="text-slate-800">Tipo de Protocolo:</strong> <span className="uppercase">{selectedOrder.tipo_protocolo || '-'}</span></p>
                  </div>
               </div>
            </div>

            {/* Footer do Modal */}
            <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-between items-center">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 Registrado em: {selectedOrder.data_registro ? new Date(selectedOrder.data_registro).toLocaleDateString('pt-BR') : 'Data Desconhecida'}
               </span>
               <button onClick={() => setSelectedOrder(null)} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors shadow-lg">
                 Fechar Detalhes
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};