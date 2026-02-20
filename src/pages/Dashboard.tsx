import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import { useAuth } from '../contexts/AuthContext';
import { DepartmentId, FormSubmissionStatus, Submodule, Template } from '../../types';
import { DEPARTMENTS } from '../constants';
import {
  Input, Select, TextArea, FormCard, SuccessMessage, FormMirror,
  RepeaterField, ProviderSearch, PrestadorResultado, TicketList, Ticket,
  UploadModal
} from '../components/FormComponents';
import { checkPermission } from '../utils/permissions';
import { formatDateTime } from '../utils/Formatters';
import { ProtocolWidget, QuickMessagesWidget } from '../components/QuickMessagesWidget';

const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY;
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

const WEBHOOKS = {
  PADRAO: "https://chat.googleapis.com/v1/spaces/AAQA_9VXbIs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=xYp-47r0nPVdhG8o2MDBdnnhfDDpz-XV78N0OP91oyw",
};

// Função para mapear as cores dos departamentos para os botões internos
const getThemeStyles = (bgClass?: string) => {
  const colorMap = bgClass || 'cyan'; // Padrão é cyan

  if (colorMap.includes('rose') || colorMap.includes('red')) 
    return { text: 'group-hover:text-rose-600', border: 'hover:border-rose-400', bgLight: 'hover:bg-rose-50/50', bgSolid: 'group-hover:bg-rose-500' };
  
  if (colorMap.includes('orange')) 
    return { text: 'group-hover:text-orange-600', border: 'hover:border-orange-400', bgLight: 'hover:bg-orange-50/50', bgSolid: 'group-hover:bg-orange-500' };
  
  if (colorMap.includes('amber') || colorMap.includes('yellow')) 
    return { text: 'group-hover:text-amber-600', border: 'hover:border-amber-400', bgLight: 'hover:bg-amber-50/50', bgSolid: 'group-hover:bg-amber-500' };
  
  if (colorMap.includes('emerald') || colorMap.includes('green')) 
    return { text: 'group-hover:text-emerald-600', border: 'hover:border-emerald-400', bgLight: 'hover:bg-emerald-50/50', bgSolid: 'group-hover:bg-emerald-500' };
  
  if (colorMap.includes('blue')) 
    return { text: 'group-hover:text-blue-600', border: 'hover:border-blue-400', bgLight: 'hover:bg-blue-50/50', bgSolid: 'group-hover:bg-blue-500' };
  
  if (colorMap.includes('purple')) 
    return { text: 'group-hover:text-purple-600', border: 'hover:border-purple-400', bgLight: 'hover:bg-purple-50/50', bgSolid: 'group-hover:bg-purple-500' };

  if (colorMap.includes('black') || colorMap.includes('slate') || colorMap.includes('gray') || colorMap.includes('zinc')) 
    return { text: 'group-hover:text-slate-800', border: 'hover:border-slate-400', bgLight: 'hover:bg-slate-100', bgSolid: 'group-hover:bg-slate-800' };

  // Padrão (Cyan)
  return { text: 'group-hover:text-cyan-600', border: 'hover:border-cyan-400', bgLight: 'hover:bg-cyan-50/50', bgSolid: 'group-hover:bg-cyan-500' };
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
  
  // States dos Modais
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    dadosExtras?: string,
    fieldUpdate?: { key: string, value: string }
  ) => {

    if (fieldUpdate) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: 'salvar_ou_atualizar',
            protocolo: protocolo,
            [fieldUpdate.key]: fieldUpdate.value,
            token_acesso: API_TOKEN
          })
        });
        console.log(`Planilha atualizada silenciosamente: ${fieldUpdate.key} = ${fieldUpdate.value}`);
      } catch (e) {
        console.error("Aviso: Erro ao salvar dado na planilha.", e);
      }
    }

    const url = WEBHOOKS.PADRAO;
    if (!url) return;

    let mensagemFinal = "";

    switch (tipo) {
      case 'PRESTADOR_CAMINHO':
        mensagemFinal = `🚀 *Prestador A Caminho*\nProtocolo: ${protocolo}\nHorário de Saída: ${dadosExtras}`;
        break;
      case 'NO_LOCAL':
        mensagemFinal = `📍 *Prestador No Local*\nProtocolo: ${protocolo}\nHorário de Chegada: ${dadosExtras}`;
        break;
      case 'PREVISAO':
        mensagemFinal = `⏳ *Previsão Atualizada*\nProtocolo: ${protocolo}\nNova Previsão: ${dadosExtras}`;
        break;
      case 'FINALIZADO':
        mensagemFinal = `✅ *Atendimento Finalizado*\nProtocolo: ${protocolo}`;
        break;
      case 'CUSTOM':
        mensagemFinal = `💬 *Mensagem da Central*\nProtocolo: ${protocolo}\nObs: ${dadosExtras}`;
        break;
      default:
        mensagemFinal = `🔔 *Atualização*\nProtocolo: ${protocolo}\nStatus: ${tipo}`;
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ text: mensagemFinal })
      });
      alert(`Status enviado e atualizado com sucesso!`);
    } catch (e) {
      alert("Erro ao enviar webhook.");
    }
  };

  // Função que converte arquivo para Base64 e envia
  const handleFileUpload = async (protocolo: string, files: File[]) => {
    setIsUploading(true);

    try {
      const promises = files.map(file => {
        return new Promise<{ nome: string, mimeType: string, conteudo: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve({
            nome: file.name,
            mimeType: file.type,
            conteudo: reader.result?.toString().replace(/^data:(.*,)?/, '') || ''
          });
          reader.onerror = error => reject(error);
        });
      });

      const arquivosProcessados = await Promise.all(promises);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: 'upload_arquivo',
          protocolo: protocolo,
          arquivos: arquivosProcessados,
          token_acesso: API_TOKEN
        })
      });

      const text = await response.text();
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);

      if (json.status === 'sucesso') {
        alert(`✅ ${json.msg}`);
        setIsUploadModalOpen(false);
      } else {
        alert("Erro ao enviar: " + json.msg);
      }

    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao enviar arquivos.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickAction = (protocolo: string, action: 'abertura' | 'fechamento') => {
    const target = action === 'abertura' ? 'abertura_assistencia' : 'fechamento_assistencia';
    console.log(`⚡ Editando ${protocolo} em ${target}`);
    handleEditTicket(protocolo, target);
  };

  const loadTickets = async () => {
    const identificador = profile?.full_name || profile?.email;
    if (!identificador) return;

    setIsLoadingTickets(true);

    try {
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
        console.warn("⚠️ Resposta inválida do servidor (HTML de erro?):", text);
      }

    } catch (error) {
      console.error("❌ Erro de conexão/rede:", error);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleEditTicket = async (protocolo: string, targetSubmodule: string = 'abertura_assistencia') => {
    setIsLoading(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
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
        handleNavigate('assistance', targetSubmodule);
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
    const isClosing = activeSubmodule === 'fechamento_assistencia';
    const actionVerb = isClosing ? "ENCERRAR" : "REGISTRAR";

    if (isClosing && !formData.protocolo) {
      alert("ERRO: O Protocolo é obrigatório para encerrar um atendimento.");
      return;
    }

    if (!window.confirm(`Confirma ${actionVerb} este atendimento no sistema?`)) return;

    setStatus({ submitting: true, success: null, error: null });

    const payload = {
      ...formData,
      action: 'salvar_ou_atualizar',
      status: isClosing ? 'FECHADO' : 'ABERTO',
      hora_solicitacao: isClosing ? formData.hora_solicitacao : new Date().toLocaleTimeString(),
      hora_encerramento: isClosing ? new Date().toLocaleTimeString() : '',
      form_id: activeSubmodule,
      user_email: profile?.email,
      atendente: profile?.full_name || profile?.email,
      token_acesso: API_TOKEN
    };

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        redirect: 'follow',
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      const jsonString = text.match(/\{[\s\S]*\}/)?.[0];

      if (jsonString) {
        const data = JSON.parse(jsonString);
        if (data.status === 'sucesso') {
          alert(isClosing ? "✅ Atendimento Encerrado!" : "✅ Abertura Realizada!");
          setStatus({ submitting: false, success: true, error: null });
          loadTickets();

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
    if (field.showIf) {
      const watchingValue = formData[field.showIf.field];
      if (watchingValue !== field.showIf.value) {
        return null;
      }
    }

    switch (field.type) {
      case 'select': return <Select key={field.id} name={field.id} label={field.label} required={field.required} options={field.options || []} value={formData[field.id] || ''} onChange={handleInputChange} />;
      case 'repeater': return <RepeaterField key={field.id} field={field} value={formData[field.id] || []} onChange={(newArray) => setFormData({ ...formData, [field.id]: newArray })} />;
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

  const handleSearchProviders = async (addressFromWidget?: string, serviceTypeFromWidget?: string) => {
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
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: 'buscar_prestadores',
          endereco: enderecoBusca,
          tipo_servico: tipoServico,
          raio: searchRadius,
          token_acesso: API_TOKEN
        })
      });

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
        {visibleDepartments.map((dept) => {
          // Puxando a cor do departamento para usar no título
          const theme = getThemeStyles(dept.colorClass);

          return (
            <button
              key={dept.id}
              onClick={() => handleNavigate(dept.id, null)}
              className="group relative bg-white py-8 px-10 rounded-[32px] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] transition-all duration-500 text-center animate-in fade-in slide-in-from-bottom-8 flex flex-col items-center hover:-translate-y-3 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden"
            >
              {/* Linha superior colorida fixa */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${dept.colorClass}`}></div>
              
              {/* CAIXA DO ÍCONE COM EFEITO SHINE (REFLEXO) */}
              <div className={`relative overflow-hidden w-16 h-16 ${dept.colorClass} text-white rounded-[20px] flex items-center justify-center mb-6 transition-transform duration-500 shadow-md group-hover:shadow-2xl group-hover:scale-110`}>
                
                {/* Ícone */}
                <i className={`fa-solid ${dept.icon} text-2xl relative z-10`}></i>
                
                {/* O Reflexo Mágico passando */}
                <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-[800ms] ease-in-out bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12 z-0"></div>
              </div>

              {/* Título do Departamento que acende na cor correspondente */}
              <h3 className={`text-xl font-[900] text-slate-800 transition-colors tracking-tight mb-3 ${theme.text}`}>
                {dept.name}
              </h3>
              
              <p className="text-slate-500 text-[13px] font-medium leading-snug px-2">
                {dept.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const currentDeptObj = DEPARTMENTS.find(d => d.id === activeDept);

  return (
    <Layout activeDept={activeDept} activeSubmodule={activeSubmodule} onNavigate={handleNavigate}>
      {activeDept === 'home' ? (
        renderHome()
      ) : !activeSubmodule ? (
        
        // --- TELA INICIAL DO DEPARTAMENTO (LAYOUT LIMPO) ---
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="flex-none flex items-center justify-between pb-4">
            
            {/* Agrupamos o Título e o Workspace nesta DIV para ficarem juntos na esquerda */}
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <i className={`fa-solid ${currentDeptObj?.icon} text-cyan-500`}></i>
                {currentDeptObj?.name}
              </h2>

              {/* Botão do Workspace (agora colado no título) */}
              {currentDeptObj?.workspaceUrl && (
                <a
                  href={currentDeptObj.workspaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir Workspace / Drive do Departamento"
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 hover:bg-slate-800 hover:text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm group"
                >
                  <i className="fa-brands fa-google-drive text-sm group-hover:scale-110 transition-transform"></i>
                  Workspace
                </a>
              )}
            </div>

            {/* Botão Voltar (fica na direita sozinho devido ao justify-between lá de cima) */}
            <button
              onClick={() => handleNavigate('home', null)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-cyan-600 font-bold text-sm transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-left"></i> Voltar ao Início
            </button>
          </div>

          {activeDept === 'assistance' ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
               {/* COLUNA 1: BOTÕES DE AÇÃO (8 Colunas) */}
               <div className="xl:col-span-8">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentDeptObj?.submodules.map((sub) => {
                    // 👇 BUSCA A COR AQUI DENTRO DO MAP 👇
                    const theme = getThemeStyles(currentDeptObj?.colorClass); 

                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleNavigate(activeDept, sub.id)}
                        className={`flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all text-left group ${theme.border} ${theme.bgLight}`}
                      >
                        <div className={`w-10 h-10 shrink-0 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center transition-colors group-hover:text-white ${theme.bgSolid}`}>
                          <i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj?.icon}`}></i>
                        </div>
                        <span className={`font-bold text-slate-700 text-sm transition-colors line-clamp-2 ${theme.text}`}>
                          {sub.name}
                        </span>
                      </button>
                    );
                  })}
                 </div>
               </div>

               {/* COLUNA 2: LISTA DE ATENDIMENTOS (4 Colunas) */}
               <div className="xl:col-span-4 flex flex-col space-y-4">
                 <div className="bg-white p-3 rounded-xl border border-cyan-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <i className="fa-solid fa-list-ul text-cyan-500"></i>
                      Em Aberto
                    </h3>
                 </div>
                 <div className="flex-1 min-h-[400px]">
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
            </div>
          ) : (
            // CASO PADRÃO: OUTROS DEPARTAMENTOS
            <div className="flex flex-col gap-8">
              
              {/* 1. RENDERIZA OS SUBMÓDULOS SOLTOS */}
              {currentDeptObj?.submodules && currentDeptObj.submodules.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {currentDeptObj.submodules.map((sub) => {
                      const theme = getThemeStyles(currentDeptObj.colorClass); // 👈 Busca a cor do departamento

                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleNavigate(activeDept, sub.id)}
                          className={`flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all text-left group ${theme.border} ${theme.bgLight}`}
                        >
                          <div className={`w-10 h-10 shrink-0 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center transition-colors group-hover:text-white ${theme.bgSolid}`}>
                            <i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon}`}></i>
                          </div>
                          <span className={`font-bold text-slate-700 text-sm transition-colors line-clamp-2 ${theme.text}`}>
                            {sub.name}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* 2. RENDERIZA OS GRUPOS / CATEGORIAS */}
              {currentDeptObj?.groups?.map((group, index) => (
                <div key={index} className="animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-folder-open"></i>
                    {group.title}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.items.map((sub) => {
                      const theme = getThemeStyles(currentDeptObj.colorClass); // 👈 Busca a cor do departamento

                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleNavigate(activeDept, sub.id)}
                          className={`flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all text-left group ${theme.border} ${theme.bgLight}`}
                        >
                          <div className={`w-10 h-10 shrink-0 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center transition-colors group-hover:text-white ${theme.bgSolid}`}>
                            <i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon}`}></i>
                          </div>
                          <span className={`font-bold text-slate-700 text-sm transition-colors line-clamp-2 ${theme.text}`}>
                            {sub.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      ) : (
        // --- TELA DE FORMULÁRIO (Submódulo) ---
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
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {isFormularioIntegrado && (
                <div className="xl:col-span-3 h-[600px] xl:h-auto flex flex-col">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 text-sm">
                      <i className="fa-solid fa-list-check mr-2 text-blue-500"></i>
                      CRM
                    </h3>
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      title="Anexar arquivo ao Drive"
                    >
                      <i className="fa-brands fa-google-drive"></i>
                      Anexar
                    </button>
                  </div>
                  <TicketList
                    tickets={tickets}
                    onSelectTicket={handleEditTicket}
                    isLoading={isLoadingTickets}
                    onRefresh={loadTickets}
                    currentAttendant={profile?.full_name || profile?.email || 'Usuário'}
                  />
                </div>
              )}

              <div className={isFormularioIntegrado ? "xl:col-span-6" : "xl:col-span-8"}>
                {activeSubmodule === 'abertura_assistencia' && (
                  <div className="flex justify-end mb-4">
                    <a 
                      href="https://portal.sivisweb.com.br/loja/012/login" // LINK AQUI
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border border-indigo-100 shadow-sm"
                    >
                      <i className="fa-solid fa-magnifying-glass-dollar text-sm"></i>
                      Consultar Adimplência
                    </a>
                  </div>
                )}
                {activeSubmodule === 'enviar-associado' && (
                  <div className="flex justify-end mb-4">
                    <a 
                      href="https://www2.correios.com.br/enderecador/encomendas/default.cfm?etq=3&tipo=des#form3" // LINK AQUI
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border border-amber-100 shadow-sm"
                    >
                      <i className="fa-solid fa-envelope-open-text text-sm"></i>
                      Cadastrar AR
                    </a>
                  </div>
                )}

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
                              ? 'bg-red-600 hover:bg-red-500 shadow-red-500/30'
                              : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30'
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

              <div className={isFormularioIntegrado ? "xl:col-span-3" : "xl:col-span-4"}>
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

      {/* 📍 BARRA DE FERRAMENTAS FLUTUANTE (SÓ NA TELA DO DEPARTAMENTO) */}
      {activeDept !== 'home' && !activeSubmodule && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 z-50 bg-white/50 backdrop-blur-md p-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/60">
           <QuickMessagesWidget 
             currentDepartment={activeDept} 
             userRole={profile?.role || 'user'}
             apiUrl={GOOGLE_SCRIPT_URL}
             apiToken={API_TOKEN}
           />
           <ProtocolWidget 
             currentDepartment={activeDept}
             userRole={profile?.role || 'user'}
             apiUrl = {GOOGLE_SCRIPT_URL}
             apiToken = {API_TOKEN}
           />
         </div>
      )}

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tickets={tickets || []}
        onUpload={(prot, files) => handleFileUpload(prot, files)}
        isUploading={isUploading}
      />
    </Layout>
  );
};

export default Dashboard;