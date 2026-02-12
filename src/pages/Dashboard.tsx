import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import { useAuth } from '../contexts/AuthContext';
import { DepartmentId, FormSubmissionStatus, Submodule, Template } from '../../types';
import { DEPARTMENTS } from '../constants';
import { 
  Input, Select, TextArea, FormCard, SuccessMessage, FormMirror, 
  RepeaterField, ProviderSearch, PrestadorResultado, TicketList, Ticket 
} from '../components/FormComponents';
import { checkPermission } from '../utils/permissions';
import { formatDateTime } from '../utils/Formatters';

const MAPS_API_KEY = "AIzaSyA0rzO01A48M_HN1G6tr1hnZdB-QYtaZkg";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzPqUPLLfvTq2RNxcPzP3k4qtUDFgVX0YUDggg2Rq_F3CkhAvSiGJkLqHmqmoqAfvokyQ/exec";
const API_TOKEN = "brclube-2026"; 

const WEBHOOKS = {
  PADRAO: "https://chat.googleapis.com/v1/spaces/AAQA_9VXbIs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=xYp-47r0nPVdhG8o2MDBdnnhfDDpz-XV78N0OP91oyw",
  // PRESTADOR_CAMINHO: "https://chat.googleapis.com/v1/spaces/AAQA_9VXbIs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=xYp-47r0nPVdhG8o2MDBdnnhfDDpz-XV78N0OP91oyw", 
  // NO_LOCAL: "https://chat.googleapis.com/v1/spaces/AAQA_9VXbIs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=xYp-47r0nPVdhG8o2MDBdnnhfDDpz-XV78N0OP91oyw",
  // FINALIZADO: "https://chat.googleapis.com/v1/spaces/AAQA_9VXbIs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=xYp-47r0nPVdhG8o2MDBdnnhfDDpz-XV78N0OP91oyw/..."
};

const Dashboard: React.FC = () => {
  const { logout, profile } = useAuth();
  
  // --- ESTADOS DO CRM (ATENDIMENTOS) ---
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // -------------------------------------

  const visibleDepartments = DEPARTMENTS.filter(dept => 
    checkPermission(profile?.allowed_modules, dept.id)
  );

  const [activeDept, setActiveDept] = useState<DepartmentId>('home');
  const [activeSubmodule, setActiveSubmodule] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [status, setStatus] = useState<FormSubmissionStatus>({ submitting: false, success: null, error: null });
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // States da Busca
  const [isSearching, setIsSearching] = useState(false);
  const [providerResults, setProviderResults] = useState<PrestadorResultado[] | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);

  // --- EFEITO: CARREGAR TICKETS AO ENTRAR ---
  useEffect(() => {
    if (profile?.email) {
      loadTickets();
      const interval = setInterval(loadTickets, 60000);
      return () => clearInterval(interval);
    }
  }, [profile]);

  // Função para enviar mensagem rápida no Chat
  const handleSendWebhook = async (
    protocolo: string, 
    tipo: string, 
    customText?: string
  ) => {
    
    // URL do Webhook (pode personalizar se quiser canais diferentes)
    const url = WEBHOOKS.PADRAO; 

    if (!url || url.includes("...")) {
      alert("Webhook não configurado no código.");
      return;
    }

    let mensagemFinal = "";

    // Lógica das mensagens
    switch (tipo) {
      case 'PRESTADOR_CAMINHO':
        mensagemFinal = `🚀 *Prestador A Caminho*\nProtocolo: ${protocolo}\nStatus: Deslocamento iniciado`;
        break;
      case 'NO_LOCAL':
        mensagemFinal = `📍 *Prestador No Local*\nProtocolo: ${protocolo}\nStatus: Atendimento iniciado`;
        break;
      case 'FINALIZADO':
        mensagemFinal = `✅ *Atendimento Finalizado*\nProtocolo: ${protocolo}`;
        break;
      case 'CUSTOM':
        if (!customText) return; // Proteção
        mensagemFinal = `💬 *Mensagem da Central*\nProtocolo: ${protocolo}\nMsg: ${customText}`;
        break;
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ text: mensagemFinal })
      });
      alert(`Webhook enviado com sucesso!`);
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar webhook.");
    }
  };

  // Função Auxiliar para Navegar Já Editando
  const handleQuickAction = (protocolo: string, action: 'abertura' | 'fechamento') => {
      // 1. Define o destino
      const targetSubmodule = action === 'abertura' ? 'abertura_assistencia' : 'fechamento_assistencia';
      
      // 2. Navega
      if (activeSubmodule !== targetSubmodule) {
          handleNavigate('assistance', targetSubmodule);
      }
      
      // 3. Carrega os dados
      handleEditTicket(protocolo);
  };

  // --- FUNÇÃO DE CARREGAR TICKETS (BLINDADA) ---
  const loadTickets = async () => {
    // Se não tiver perfil, nem tenta
    const identificador = profile?.full_name || profile?.email;
    if (!identificador) return;

    setIsLoadingTickets(true);
    console.log("🔍 DEBUG: Tentando carregar tickets para:", identificador);

    try {
      // O SEGREDO ESTÁ AQUI: text/plain
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        redirect: "follow", 
        method: 'POST',
        headers: {
          "Content-Type": "text/plain;charset=utf-8", 
        },
        body: JSON.stringify({ 
          action: 'listar_atendimentos', 
          atendente: identificador,
          token_acesso: API_TOKEN
        })
      });

      const text = await response.text();
      // console.log("📩 DEBUG: Resposta crua:", text); // Descomente se quiser ver o que chega

      // Tenta extrair JSON de dentro do texto (caso o Google mande HTML junto)
      const jsonString = text.match(/\{[\s\S]*\}/)?.[0];
      
      if (jsonString) {
          const data = JSON.parse(jsonString);
          if (data.status === 'sucesso') {
            console.log(`✅ Sucesso! Tickets carregados: ${data.lista.length}`);
            setTickets(data.lista);
          } else {
            console.error("❌ Erro lógico do servidor:", data.msg);
          }
      } else {
          // Se não achou JSON, provavelmente é erro HTML do Google
          console.warn("⚠️ Resposta inválida do servidor (HTML de erro?):", text);
      }

    } catch (error) {
      console.error("❌ Erro de conexão/rede:", error);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleEditTicket = async (protocolo: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'buscar_detalhes_protocolo', 
          protocolo: protocolo,
          token_acesso: API_TOKEN
        })
      });
      
      const text = await response.text();
      const cleanText = text.match(/\{[\s\S]*\}/)?.[0] || text;
      const data = JSON.parse(cleanText);
      
      if (data.status === 'sucesso') {
        if (activeSubmodule !== 'abertura_assistencia') {
            handleNavigate('assistance', 'abertura_assistencia'); 
        }
        setFormData(data.dados);
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

  const handleNavigate = (deptId: DepartmentId, submoduleId: string | null) => {
    setActiveDept(deptId);
    setActiveSubmodule(submoduleId);
    setActiveTemplate(null);
    setStatus({ submitting: false, success: null, error: null });
    setFormData({});
    setProviderResults(null); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (profile?.email) loadTickets();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getAllSubmodules = (): Submodule[] => {
    const subs: Submodule[] = [];
    DEPARTMENTS.forEach(d => {
      subs.push(...d.submodules);
      d.groups?.forEach(g => subs.push(...g.items));
    });
    return subs;
  };

  const currentSub = getAllSubmodules().find(s => s.id === activeSubmodule);
  const isTerm = currentSub?.isTerm || activeTemplate?.isTerm;
  const isBlank = currentSub?.isBlank;
  const isFormularioIntegrado = activeSubmodule === 'abertura_assistencia' || activeSubmodule === 'fechamento_assistencia';

  const handleRegister = async () => {
    // 1. Identifica se é Fechamento
    const isClosing = activeSubmodule === 'fechamento_assistencia';
    const actionVerb = isClosing ? "ENCERRAR" : "REGISTRAR";

    // 2. Validação de Segurança para Fechamento
    if (isClosing && !formData.protocolo) {
      alert("ERRO: O Protocolo é obrigatório para encerrar um atendimento.");
      return;
    }

    if (!window.confirm(`Confirma ${actionVerb} este atendimento no sistema?`)) return;

    setStatus({ submitting: true, success: null, error: null });

    // 3. Monta o Payload Inteligente
    const payload = {
      ...formData,
      action: 'salvar_ou_atualizar',
      
      // Lógica do Status:
      status: isClosing ? 'FECHADO' : 'ABERTO',
      
      // Lógica de Horários:
      // Se é abertura, grava hora_solicitacao agora. 
      // Se é fechamento, mantém a solicitacao antiga e grava encerramento agora.
      hora_solicitacao: isClosing ? formData.hora_solicitacao : new Date().toLocaleTimeString(),
      hora_encerramento: isClosing ? new Date().toLocaleTimeString() : '',
      
      form_id: activeSubmodule,
      user_email: profile?.email,
      atendente: profile?.full_name || profile?.email,
      token_acesso: API_TOKEN
    };

    try {
      // 4. Envio Corrigido (SEM no-cors)
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        redirect: 'follow',
        method: "POST",
        // mode: "no-cors", <--- REMOVIDO PARA PODER LER A RESPOSTA
        headers: {
          "Content-Type": "text/plain;charset=utf-8", // Truque Anti-CORS
        },
        body: JSON.stringify(payload),
      });

      // 5. Tratamento da Resposta Real
      const text = await response.text();
      const jsonString = text.match(/\{[\s\S]*\}/)?.[0];

      if (jsonString) {
        const data = JSON.parse(jsonString);
        if (data.status === 'sucesso') {
           alert(isClosing ? "✅ Atendimento Encerrado!" : "✅ Abertura Realizada!");
           setStatus({ submitting: false, success: true, error: null });
           loadTickets(); // Atualiza a lista lateral
           
           // Opcional: Se fechou, limpa a tela
           if (isClosing) {
             setFormData({});
             setActiveTemplate(null);
           }
        } else {
           throw new Error(data.msg);
        }
      } else {
        throw new Error("Resposta inválida do servidor.");
      }

    } catch (error: any) {
      console.error("Erro:", error);
      alert("❌ Falha: " + (error.message || "Erro de conexão"));
      setStatus({ submitting: false, success: null, error: "Erro de conexão" });
    }
  };

  const generateCopyMessage = () => {
    let templateContent = "";
    if (activeTemplate) { 
        templateContent = activeTemplate.content; 
    } else if (currentSub?.messageTemplate) { 
        templateContent = typeof currentSub.messageTemplate === 'function' 
          ? currentSub.messageTemplate(formData) 
          : currentSub.messageTemplate; 
    } else { 
        return ""; 
    }

    let message = templateContent;
    const dateFields = [
        'data-hora', 'hora_solicitacao', 'hora_autorizacao', 
        'hora_prestador', 'chegada_prestador', 'encerramento_atendimento'
    ];

    message = message.replace(/{{([^}]+)}}/g, (_, key) => {
        const value = formData[key];
        if (!value) return "";
        if (dateFields.includes(key)) {
            return formatDateTime(value as string);
        }
        return value as string;
    });
    
    return message;
  };

  const renderField = (field: any) => {
    if(field.showIf){
      const watchingValue = formData[field.showIf.field];
      if(watchingValue !== field.showIf.value){
        return null;
      }
    }

    switch(field.type) {
      case 'select': return <Select key={field.id} name={field.id} label={field.label} required={field.required} options={field.options || []} value={formData[field.id] || ''} onChange={handleInputChange} />;
      case 'repeater': return <RepeaterField key={field.id} field={field} value={formData[field.id] || []} onChange={(newArray) => setFormData({...formData, [field.id]: newArray})} />;
      case 'textarea': return <div key={field.id} className="md:col-span-2"><TextArea name={field.id} label={field.label} placeholder={field.placeholder} required={field.required} value={formData[field.id] || ''} onChange={handleInputChange} />;</div>;
      default: return <Input key={field.id} name={field.id} label={field.label} placeholder={field.placeholder} type={field.type || 'text'} required={field.required} value={formData[field.id] || ''} onChange={handleInputChange} />;
    }
  };

  const handleClearData = () => {
    if (window.confirm("Tem certeza que deseja limpar todos os campos?")) {
      setFormData({}); 
      setProviderResults(null);
      setStatus({ submitting: false, success: null, error: null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- FUNÇÃO DE BUSCA BLINDADA (FUNCIONA COM INPUT DO WIDGET OU DO FORM) ---
  const handleSearchProviders = async (addressFromWidget?: string, serviceTypeFromWidget?: string) => {
    // Tenta pegar do widget primeiro (se vier), senão pega do formulário
    const enderecoBusca = addressFromWidget || formData['endereco-origem']; 
    const tipoServico = serviceTypeFromWidget || formData['servico'];

    if (!enderecoBusca) {
      alert("Por favor, digite um endereço para buscar (no formulário ou na caixa de busca).");
      return;
    }

    setIsSearching(true);
    setProviderResults(null);

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST', 
        body: JSON.stringify({
          action: 'buscar_prestadores',
          endereco: enderecoBusca,
          tipo_servico: tipoServico,
          raio: searchRadius,
          token_acesso: API_TOKEN 
        })
      });

      // --- PROTEÇÃO CONTRA CRASH JSON ---
      const text = await response.text();
      let data;
      try {
         const cleanText = text.match(/\{[\s\S]*\}/)?.[0] || text;
         data = JSON.parse(cleanText);
      } catch (e) {
         console.error("Erro JSON bruto:", text);
         alert("O servidor respondeu com erro. Verifique se o Google Apps Script foi implantado como 'Nova Versão'.");
         setIsSearching(false);
         return;
      }
      // ----------------------------------

      if (data.status === 'sucesso') {
        setProviderResults(data.resultados);
      } else {
        alert("Erro na busca: " + (data.msg || "Desconhecido"));
      }

    } catch (error) {
      console.error("Erro de rede:", error);
      alert("Erro de conexão ao buscar prestadores.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectProvider = (prestador: PrestadorResultado) => {
    setFormData(prev => ({
      ...prev,
      prestador_nome: prestador.nome, 
      prestador: prestador.nome, 
      telefone_prestador: prestador.telefone || '',
    }));
  };

  const renderHome = () => (
    <div className="space-y-12 animate-in fade-in duration-1000">
       <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4">
        <div className="max-w-2xl">
          <div className="flex items-center space-x-3 text-cyan-500 font-black text-xs uppercase tracking-[0.3em] mb-4">
             <span className="w-12 h-[3px] bg-cyan-500 rounded-full"></span>
             <span>BR Desk</span>
          </div>
          <div className="mb-4">
             <span className="text-4xl font-extrabold text-slate-800">BR</span>
             <span className="text-4xl font-extrabold text-cyan-600">clube</span>
          </div>
          <p className="text-slate-500 text-xl font-medium leading-relaxed">
            Olá, <strong>{profile?.full_name || 'Colaborador'}</strong>. Selecione um departamento.
          </p>
        </div>
        <div>
           <button onClick={() => logout()} className="text-red-500 text-sm font-bold hover:underline">Sair do sistema</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {visibleDepartments.map((dept) => (
          <button 
            key={dept.id}
            onClick={() => handleNavigate(dept.id, null)}
            className="group relative bg-white py-8 px-10 rounded-[32px] border border-cyan-100 shadow-[0_20px_50px_rgba(6,182,212,0.05)] transition-all duration-500 text-center animate-in fade-in slide-in-from-bottom-8 flex flex-col items-center hover:-translate-y-3 hover:shadow-[0_30px_60px_rgba(6,182,212,0.1)] overflow-hidden"
          >
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${dept.colorClass}`}></div>
            <div className={`w-16 h-16 bg-slate-50 group-hover:${dept.colorClass} group-hover:text-white rounded-[20px] flex items-center justify-center mb-6 transition-all duration-500 shadow-inner group-hover:shadow-2xl`}>
              <i className={`fa-solid ${dept.icon} text-2xl`}></i>
            </div>
            <h3 className="text-xl font-[900] text-slate-800 group-hover:text-cyan-600 transition-colors tracking-tight mb-3">
              {dept.name}
            </h3>
            <p className="text-slate-600 text-[13px] font-semibold leading-snug px-2 group-hover:text-slate-700 transition-colors">
              {dept.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  const currentDeptObj = DEPARTMENTS.find(d => d.id === activeDept);

  return (
    <Layout activeDept={activeDept} activeSubmodule={activeSubmodule} onNavigate={handleNavigate}>
      {activeDept === 'home' ? (
        renderHome()
      ) : !activeSubmodule ? (
        <div className="space-y-8 animate-in fade-in duration-700">
          {/* CABEÇALHO DO DEPARTAMENTO */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <i className={`fa-solid ${currentDeptObj?.icon} text-cyan-500`}></i>
              {currentDeptObj?.name}
            </h2>
            <button 
              onClick={() => handleNavigate('home', null)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-cyan-600 font-bold text-sm transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-left"></i> Voltar ao Início
            </button>
          </div>

          {/* AQUI ESTÁ A MUDANÇA:
              Se for Assistência, divide a tela. Se for outro depto, mostra só botões.
          */}
          {activeDept === 'assistance' ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* COLUNA DA ESQUERDA: BOTÕES DE AÇÃO (Ocupa 9 colunas) */}
              <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {currentDeptObj?.submodules.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleNavigate(activeDept, sub.id)}
                    className="bg-white p-8 rounded-2xl border border-cyan-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group relative overflow-hidden h-full"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon} text-6xl text-cyan-600`}></i>
                    </div>
                    <div className="w-12 h-12 bg-cyan-500 text-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md shadow-cyan-200">
                        <i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon}`}></i>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-1 relative z-10">{sub.name}</h3>
                    <p className="text-xs text-slate-500 font-medium relative z-10">
                      {sub.isTerm ? 'Emite documento PDF formal.' : 'Acessar formulário e registro.'}
                    </p>
                  </button>
                ))}
              </div>

              {/* COLUNA DA DIREITA: LISTA DE ATENDIMENTOS (Ocupa 3 colunas) */}
              <div className="xl:col-span-5 flex flex-col h-full space-y-4">
                 <div className="bg-white p-4 rounded-2xl border border-cyan-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                       <i className="fa-solid fa-list-ul text-cyan-500"></i>
                       Em Aberto
                    </h3>
                    <p className="text-xs text-slate-500">
                       Atendimentos aguardando fechamento. Clique para editar.
                    </p>
                 </div>
                 
                 {/* Reutilizando seu componente TicketList */}
                 <TicketList 
                    tickets={tickets} 
                    onSelectTicket={handleEditTicket} 
                    isLoading={isLoadingTickets} 
                    onRefresh={loadTickets} 
                    currentAttendant={profile?.full_name || profile?.email || 'Usuário'}
                    onQuickEdit={handleQuickAction}
                    onWebhook={handleSendWebhook}
                 />
              </div>

            </div>
          ) : (
            // LAYOUT PADRÃO PARA OUTROS DEPARTAMENTOS (SÓ BOTÕES)
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
              {currentDeptObj?.submodules.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleNavigate(activeDept, sub.id)}
                  className="bg-white p-8 rounded-2xl border border-cyan-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon} text-6xl text-cyan-600`}></i>
                  </div>
                  <div className="w-12 h-12 bg-cyan-500 text-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md shadow-cyan-200">
                      <i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon}`}></i>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1 relative z-10">{sub.name}</h3>
                  <p className="text-xs text-slate-500 font-medium relative z-10">
                    {sub.isTerm ? 'Emite documento PDF formal.' : 'Gera mensagem formatada para WhatsApp.'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <button 
                onClick={() => activeTemplate ? setActiveTemplate(null) : handleNavigate(activeDept, null)} 
                className="w-12 h-12 rounded-2xl bg-white border border-cyan-100 flex items-center justify-center text-slate-400 hover:text-cyan-600 shadow-sm transition-all hover:shadow-xl"
              >
                <i className="fa-solid fa-arrow-left"></i>
              </button>
              <div>
                <h1 className="text-3xl font-[1000] text-slate-900">
                  {activeTemplate ? activeTemplate.title : currentSub?.name}
                </h1>
                <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mt-1">
                  {isTerm ? 'Documento PDF' : 'Mensagem Digital'}
                </p>
              </div>
            </div>
            {isLoading && <span className="text-cyan-600 font-bold animate-pulse">Carregando dados...</span>}
          </div>
          
          {status.success && !isFormularioIntegrado ? (
            <SuccessMessage 
              message={isTerm ? "Documento preparado com sucesso!" : "Mensagem formatada com sucesso!"} 
              onReset={() => setStatus({ ...status, success: null })} 
            />
          ) : (
            // LAYOUT DE 3 COLUNAS
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* 1. LISTA DE ATENDIMENTOS (CRM) */}
              <div className="xl:col-span-3 h-[600px] xl:h-auto flex flex-col">
                <TicketList 
                   tickets={tickets} 
                   onSelectTicket={handleEditTicket} 
                   isLoading={isLoadingTickets} 
                   onRefresh={loadTickets} 
                   currentAttendant={profile?.full_name || profile?.email || 'Usuário'}
                />
              </div>

              {/* 2. FORMULÁRIO CENTRAL */}
              <div className="xl:col-span-6">
                <FormCard title={activeTemplate ? activeTemplate.title : currentSub?.name || ''} icon={isTerm ? 'fa-file-signature' : 'fa-pen-to-square'}>
                    <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(activeTemplate ? activeTemplate.fields : (currentSub?.fields || [])).map(field => renderField(field))}
                    
                    <div className="md:col-span-2 flex justify-end gap-4 flex-wrap">
                      {isFormularioIntegrado && (
                          <button
                            type="button"
                            onClick={handleRegister}
                            disabled={status.submitting}
                            className={`group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300 text-white shadow-lg hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed
                              ${activeSubmodule === 'fechamento_assistencia' 
                                ? 'bg-red-600 hover:bg-red-500 shadow-red-500/30'  // Vermelho para Fechar
                                : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30' // Verde para Abrir
                              }`}
                          >
                            <span>
                              {status.submitting 
                                ? 'Processando...' 
                                : (activeSubmodule === 'fechamento_assistencia' ? 'Encerrar Atendimento' : 'Salvar Abertura')}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-colors">
                              <i className={`fa-solid ${activeSubmodule === 'fechamento_assistencia' ? 'fa-lock' : 'fa-check'} text-sm`}></i>
                            </div>
                          </button>
                      )}

                      <button 
                        type="button" 
                        onClick={handleClearData}
                        className="w-12 group flex items-center justify-center rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Limpar formulário"
                      >
                         <i className="fa-solid fa-eraser text-sm"></i>
                      </button>
                    </div>
                  </form>
                </FormCard>
              </div>

              {/* 3. PREVIEW E BUSCA (DIREITA) */}
              <div className="xl:col-span-3 space-y-6">
                <FormMirror 
                  data={formData} 
                  title={activeTemplate ? activeTemplate.title : currentSub?.name || ''} 
                  generateMessage={generateCopyMessage} 
                  pdfType={currentSub?.pdfType}
                  isTerm={isTerm}
                  isBlank={isBlank}
                />
                
                {activeSubmodule === 'abertura_assistencia' && (
                   <ProviderSearch 
                      // Esta função agora aceita argumentos do widget OU usa o formData
                      onSearch={(addr, type) => handleSearchProviders(addr, type)} 
                      isSearching={isSearching}
                      results={providerResults}
                      onSelect={handleSelectProvider}
                      radius={searchRadius}
                      onRadiusChange={setSearchRadius}
                      apiKey={MAPS_API_KEY}
                      scriptUrl={GOOGLE_SCRIPT_URL}
                   />
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;