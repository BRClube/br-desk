import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../hooks/useCRM';
import { DEPARTMENTS } from '../constants';
import { DepartmentId, Submodule, Template, FormSubmissionStatus, PrestadorResultado } from '../../types';
import { formatDateTime } from '../utils/Formatters';
import { 
  FormCard, FormMirror, Select, RepeaterField, TextArea, Input, 
  SuccessMessage, ProviderSearch, UploadModal, SmartSearchInput 
} from '../components/FormComponents';
import { TicketList } from '../components/TicketList';
import { TrackingManager } from '../components/TrackingManager';


const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;
const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY;

const FormView: React.FC = () => {
  const { profile } = useAuth();
  const { tickets, isLoadingTickets, loadTickets, isUploading, handleSendWebhook, handleFileUpload } = useCRM();
  const [isLoading, setIsLoading] = useState(false);

  const { deptId, submoduleId } = useParams<{ deptId: string, submoduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const activeDept = (deptId as DepartmentId) || 'home';
  const activeSubmodule = submoduleId || null;

  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [status, setStatus] = useState<FormSubmissionStatus>({ submitting: false, success: null, error: null });
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [providerResults, setProviderResults] = useState<PrestadorResultado[] | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);

  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  // Recebe os dados do CRM enviados pela tela do Department
  useEffect(() => {
    if (location.state?.ticketData) {
      setFormData(location.state.ticketData);
      
      // 👇 Verifica se veio como edição
      if (location.state?.isEditMode) {
        setIsEditMode(true);
      }
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleNavigate = (newDept: DepartmentId, newSub: string | null) => {
    if (newSub) {
      navigate(`/form/${newDept}/${newSub}`);
    } else if (newDept === 'home') {
      navigate('/');
    } else {
      navigate(`/dept/${newDept}`);
    }
  };

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

  const handleRegister = async (overrideStatus?: string) => {
    const isClosing = activeSubmodule === 'fechamento_assistencia';
    const cleanedFormData = { ...formData };
    
    // 👇 As validações usam os dados crus em letras minúsculas (cleanedFormData)
    const isInadimplente = ['inadimplente', 'atrasado', 'cancelado', 'suspenso'].includes(cleanedFormData.adimplencia);
    if (!isInadimplente) {
      cleanedFormData.excepcionalidade = '';
      cleanedFormData.motivo_excepcionalidade = '';
    }

    const isRecusado = isInadimplente && cleanedFormData.excepcionalidade === 'inapto';
    let finalStatus = isClosing ? 'FECHADO' : 'ABERTO';
    
    if (typeof overrideStatus === 'string') {
      finalStatus = overrideStatus;
    } else if (activeSubmodule === 'abertura_assistencia' && isRecusado) {
      finalStatus = 'CANCELADO';
    }

    const actionVerb = finalStatus === 'CANCELADO' ? "RECUSAR E ENCERRAR" : (isClosing ? "ENCERRAR" : "REGISTRAR");

    if (isClosing && !cleanedFormData.protocolo) {
      alert("ERRO: O Protocolo é obrigatório para encerrar um atendimento.");
      return;
    }

    if (!window.confirm(`Confirma ${actionVerb} este atendimento no sistema?`)) return;

    setStatus({ submitting: true, success: null, error: null });

    // =======================================================================
    // 🔠 FILTRO DE FORMATAÇÃO E TRADUÇÃO PARA A PLANILHA / WEBHOOK
    // =======================================================================
    const dicionario: Record<string, string> = {
      'pneu': 'PNEU FURADO',
      'bateria': 'PANE ELÉTRICA / BATERIA',
      'mecanica': 'PANE MECÂNICA',
      'eletrica': 'PANE ELÉTRICA',
      'colisao': 'COLISÃO',
      'chaveiro': 'CHAVEIRO AUTOMOTIVO',
      'guincho': 'GUINCHO / REBOQUE',
      'carro': 'CARRO',
      'moto': 'MOTOCICLETA',
      'caminhonete': 'CAMINHONETE / SUV',
      'sim': 'SIM',
      'nao': 'NÃO'
      // Adicione aqui qualquer outra abreviação que usar!
    };

    const camposEmMinusculas = ['email', 'link_nf', 'avatar_url'];
    const dadosProntosParaSalvar = { ...cleanedFormData };

    Object.keys(dadosProntosParaSalvar).forEach(chave => {
      if (typeof dadosProntosParaSalvar[chave] === 'string') {
        let valor = dadosProntosParaSalvar[chave].trim();
        
        if (dicionario[valor.toLowerCase()]) {
          dadosProntosParaSalvar[chave] = dicionario[valor.toLowerCase()];
        } else if (!camposEmMinusculas.includes(chave) && valor !== '') {
          dadosProntosParaSalvar[chave] = valor.toUpperCase();
        }
      }
    });
    // =======================================================================

    let payload: any;

    if (activeSubmodule === 'service_record') {
      // 🚨 MODO REGISTRO DE ATENDIMENTO 🚨
      payload = {
        action: 'salvar_registro_atendimento',
        protocolo: dadosProntosParaSalvar.protocolo || '',
        tipo_registro: dadosProntosParaSalvar.tipo_registro || '',
        canal_entrada: dadosProntosParaSalvar.canal_entrada || '',
        categoria_demanda: dadosProntosParaSalvar.categoria_demanda || '',
        subcategoria: dadosProntosParaSalvar.subcategoria || '',
        relato: dadosProntosParaSalvar.relato || '',
        providencia: dadosProntosParaSalvar.providencia || '',
        percepcao_satisfacao: dadosProntosParaSalvar.percepcao_satisfacao || '',
        pendencias_futuras: dadosProntosParaSalvar.pendencias_futuras || '',
        prazo_retorno: dadosProntosParaSalvar.prazo_retorno || '',
        motivo_fechamento: dadosProntosParaSalvar.motivo_fechamento || '',
        tarefas_spaces: dadosProntosParaSalvar.tarefas_spaces || '',
        status: dadosProntosParaSalvar.status || '',
        associado: dadosProntosParaSalvar.associado || '',
        placa: dadosProntosParaSalvar.placa || '',
        atendente: profile?.full_name || profile?.email,
        departamento: activeDept,
        token_acesso: API_TOKEN
      };
    } else if (activeSubmodule === 'protocolo-instalar-rastreador') { 
      // 🛰️ MODO RASTREAMENTO 🛰️
      payload = {
        action: 'salvar_protocolo_rastreio',
        ...dadosProntosParaSalvar,
        token_acesso: API_TOKEN
      };
    } else {
      // 🚑 MODO PADRÃO (Assistência, etc.) 🚑
      payload = {
        ...dadosProntosParaSalvar,
        action: 'salvar_ou_atualizar',
        status: finalStatus, 
        hora_solicitacao: isClosing ? dadosProntosParaSalvar.hora_solicitacao : new Date().toLocaleTimeString(),
        hora_encerramento: (isClosing || finalStatus === 'CANCELADO') ? new Date().toLocaleTimeString() : '',
        form_id: activeSubmodule,
        user_email: profile?.email,
        atendente: profile?.full_name || profile?.email,
        token_acesso: API_TOKEN
      };
    }

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        redirect: 'follow',
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      const jsonString = text.match(/\{[\s\S]*\}/)?.[0];

      if (jsonString) {
        const data = JSON.parse(jsonString);
        if (data.status === 'sucesso') {
          if (finalStatus === 'CANCELADO') alert("🚫 Atendimento Recusado e Encerrado no sistema!");
          else alert(isClosing ? "✅ Atendimento Encerrado!" : (finalStatus === 'EM ANÁLISE' ? "🔎 Enviado para Análise!" : "✅ Abertura Realizada!"));
          
          setStatus({ submitting: false, success: true, error: null });
          loadTickets();

          if (activeSubmodule === 'protocolo-instalar-rastreador') { 
              const webhookUrl = "https://chat.googleapis.com/v1/spaces/AAQA_9VXbIs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=xYp-47r0nPVdhG8o2MDBdnnhfDDpz-XV78N0OP91oyw";
              
              
            // --- FORMATAÇÃO DE DATA E HORA ---
              const dataHorarioRaw = dadosProntosParaSalvar.data_horario || '';
              let dataFormatada = '-';
              let horaFormatada = '-';
              
              if (dataHorarioRaw.includes('T')) {
                  const [dataParte, horaParte] = dataHorarioRaw.split('T');
                  const [ano, mes, dia] = dataParte.split('-');
                  dataFormatada = `${dia}/${mes}/${ano}`;
                  horaFormatada = horaParte.replace(':', 'h'); // Transforma 08:00 em 08h00
              }

              // --- FORMATAÇÃO DE TIPO E PLATAFORMA ---
              const tipoRaw = String(dadosProntosParaSalvar.tipo_protocolo || '').toUpperCase();
              let tipoServico = 'SERVIÇO';
              if (tipoRaw.includes('DESINSTAL')) tipoServico = 'DESINSTALAÇÃO';
              else if (tipoRaw.includes('MANUTEN')) tipoServico = 'MANUTENÇÃO';
              else if (tipoRaw.includes('INSTAL')) tipoServico = 'INSTALAÇÃO';

              const platRaw = String(dadosProntosParaSalvar.plataforma || '').toUpperCase();
              let platFormatada = dadosProntosParaSalvar.plataforma || '-';
              if (platRaw.includes('REDE')) platFormatada = 'Rede Loc';
              if (platRaw.includes('RASTREIE')) platFormatada = 'Rastreie Brasil';

              const iconeTitulo = isEditMode ? "📝" : "📍";
              const tituloWebhook = `${iconeTitulo} *AGENDAMENTO – ${tipoServico} DE RASTREADOR*`;

              // 👇 A MENSAGEM EXATAMENTE COMO VOCÊ PEDIU 👇
              const mensagem = `${tituloWebhook}

Associado: ${dadosProntosParaSalvar.nome || dadosProntosParaSalvar.associado || '-'}
Telefone: ${dadosProntosParaSalvar.telefone || '-'}

🚗 Veículo: ${dadosProntosParaSalvar.veiculo || '-'}
Placa: ${dadosProntosParaSalvar.placa || '-'}
Cor: ${dadosProntosParaSalvar.cor || '-'}
Ano: ${dadosProntosParaSalvar.ano || '-'}

📍 Endereço:
${dadosProntosParaSalvar.endereco || '-'}

📅 Data: ${dataFormatada}

⏰ Horário: ${horaFormatada}

🔧 Técnico: ${dadosProntosParaSalvar.tecnico || '-'}

📡 Plataforma: ${platFormatada}`;
              
              fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: mensagem })
              }).catch(err => console.error("Erro ao enviar webhook:", err));
              
              setIsEditMode(false);
          }

          if (isClosing || finalStatus === 'CANCELADO') {
            setFormData({});
            setActiveTemplate(null);
          }
        } else throw new Error(data.msg);
      } else throw new Error("Resposta inválida do servidor.");
    } catch (error: any) {
      alert("❌ Falha: " + (error.message || "Erro de conexão"));
      setStatus({ submitting: false, success: null, error: "Erro de conexão" });
    }
  };

  const generateCopyMessage = () => {
    let templateContent = "";
    if (activeTemplate) templateContent = activeTemplate.content;
    else if (currentSub?.messageTemplate) {
      templateContent = typeof currentSub.messageTemplate === 'function' ? currentSub.messageTemplate(formData) : currentSub.messageTemplate;
    } else return "";

    let message = templateContent;
    const dateFields = ['data-hora', 'hora_solicitacao', 'hora_autorizacao', 'hora_prestador', 'chegada_prestador', 'encerramento_atendimento'];

    message = message.replace(/{{([^}]+)}}/g, (_, key) => {
      const value = formData[key];
      if (!value) return "";
      if (dateFields.includes(key)) return formatDateTime(value as string);
      return value as string;
    });
    return message;
  };

  const renderField = (field: any) => {
    // 1. Lógica de visibilidade (showIf)
    if (field.showIf) {
      const watchingValue = formData[field.showIf.field];
      if (Array.isArray(field.showIf.value)) {
         if (!field.showIf.value.includes(watchingValue)) return null;
      } else {
         if (watchingValue !== field.showIf.value) return null;
      }
    }

    // 2. 👇 O TRUQUE DE MESTRE: Criar uma "key" única para o React não se baralhar com os 8 selects iguais 👇
    const fieldKey = field.showIf ? `${field.id}-${field.showIf.value}` : field.id;

    // 3. Renderização dos campos
    switch (field.type) {
      case 'select': 
        return <Select key={fieldKey} name={field.id} label={field.label} required={field.required} options={field.options || []} value={formData[field.id] || ''} onChange={handleInputChange} />;
      
      case 'repeater': 
        return <RepeaterField key={fieldKey} field={field} value={formData[field.id] || []} onChange={(newArray) => setFormData({ ...formData, [field.id]: newArray })} />;
      
      case 'textarea': 
        return <div key={fieldKey} className="md:col-span-2"><TextArea name={field.id} label={field.label} placeholder={field.placeholder} required={field.required} value={formData[field.id] || ''} onChange={handleInputChange} /></div>;
      
      case 'smart_search':
        return (
          <SmartSearchInput 
            key={fieldKey} 
            label={field.label} 
            onSelectDemand={(cat, sub) => {
              // 👇 CORREÇÃO: Usamos o ID exato 'subcategoria' para bater certo com a sua planilha 👇
              setFormData(prev => ({ 
                ...prev, 
                categoria_demanda: cat, 
                subcategoria: sub 
              }));
            }} 
          />
        );
        
      default: 
        return <Input key={fieldKey} name={field.id} label={field.label} placeholder={field.placeholder} type={field.type || 'text'} required={field.required} value={formData[field.id] || ''} onChange={handleInputChange} />;
    }
  };

  const handleClearData = () => {
    if (window.confirm("Tem certeza que deseja limpar todos os campos?")) {
      setFormData({});
      setIsEditMode(false);
      setProviderResults(null);
      setStatus({ submitting: false, success: null, error: null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearchProviders = async (addressFromWidget?: string, serviceTypeFromWidget?: string) => {
    const enderecoBusca = addressFromWidget || formData['endereco-origem'];
    const tipoServico = serviceTypeFromWidget || formData['servico'];

    if (!enderecoBusca) {
      alert("Por favor, digite um endereço para buscar.");
      return;
    }

    setIsSearching(true);
    setProviderResults(null);

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'buscar_prestadores', endereco: enderecoBusca, tipo_servico: tipoServico, raio: searchRadius, token_acesso: API_TOKEN })
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text); } catch (e) { alert("Erro de resposta do servidor."); setIsSearching(false); return; }

      if (data.status === 'sucesso') setProviderResults(data.resultados);
      else alert("Erro na busca: " + (data.msg || "Desconhecido"));
    } catch (error) {
      alert("Erro de conexão ao buscar prestadores.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSmartSearch = async (query: string) => {
    if (!query) return;
    setIsSearching(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: 'buscar_detalhes_protocolo', // Ou uma ação específica para procurar por nome/placa
          protocolo: query, // Ou o que for enviar (ajuste no backend se for busca por placa/nome)
          token_acesso: API_TOKEN
        })
      });
      const text = await response.text();
      const cleanText = text.match(/\{[\s\S]*\}/)?.[0] || text;
      const data = JSON.parse(cleanText);

      if (data.status === 'sucesso') {
         // Autopreenchimento: Adicionamos os dados encontrados ao formData atual
        setFormData(prev => ({ ...prev, ...data.dados }));
        alert("Dados encontrados e preenchidos!");
      } else {
        alert("Atenção: " + data.msg);
      }
    } catch (error) {
      alert("Erro ao buscar dados na planilha.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectProvider = (prestador: PrestadorResultado) => {
    setFormData(prev => ({ ...prev, prestador_nome: prestador.nome, prestador: prestador.nome, telefone_prestador: prestador.telefone || '' }));
  };

  if (!currentSub) return null;

  // 👇 INTERCEPTADOR MÁGICO: Se for a tela de gestão, renderiza a tabela inteira e ignora o resto 👇
  if (activeSubmodule === 'tracking_management') {
    return (
      <div className="animate-in fade-in duration-500">
        <TrackingManager 
          apiUrl={GOOGLE_SCRIPT_URL} 
          apiToken={API_TOKEN} 
          webhookUrl="COLE_AQUI_A_SUA_URL_DO_WEBHOOK_DO_GOOGLE_CHAT" 
        />
      </div>
    );
  }

  // 👇 SE NÃO FOR GESTÃO DE RASTREIO, CONTINUA A RENDERIZAR O FORMULÁRIO NORMAL 👇
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* CABEÇALHO DO FORMULÁRIO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <button onClick={() => activeTemplate ? setActiveTemplate(null) : handleNavigate(activeDept, null)} className="w-12 h-12 rounded-2xl bg-white border border-cyan-100 flex items-center justify-center text-slate-400 hover:text-cyan-600 shadow-sm transition-all hover:shadow-xl">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-3xl font-[1000] text-slate-900">{activeTemplate ? activeTemplate.title : currentSub.name}</h1>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mt-1">{isTerm ? 'Documento PDF' : 'Mensagem Digital'}</p>
          </div>
        </div>
        {isLoading && <span className="text-cyan-600 font-bold animate-pulse">Carregando dados...</span>}
      </div>

      {status.success && !isFormularioIntegrado ? (
        <SuccessMessage message={isTerm ? "Documento preparado com sucesso!" : "Mensagem formatada com sucesso!"} onReset={() => setStatus({ ...status, success: null })} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* PAINEL CRM (Esquerda) */}
          {isFormularioIntegrado && (
            <div className="xl:col-span-3 h-[600px] xl:h-auto flex flex-col">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 text-sm"><i className="fa-solid fa-list-check mr-2 text-blue-500"></i> CRM</h3>
                <button onClick={() => setIsUploadModalOpen(true)} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <i className="fa-brands fa-google-drive"></i> Anexar
                </button>
              </div>
              <TicketList tickets={tickets} onSelectTicket={handleEditTicket} isLoading={isLoadingTickets} onRefresh={loadTickets} currentAttendant={profile?.full_name || profile?.email || 'Usuário'} />
            </div>
          )}

          {/* O FORMULÁRIO (Centro) */}
          <div className={isFormularioIntegrado ? "xl:col-span-6" : "xl:col-span-8"}>
            <FormCard title={activeTemplate ? activeTemplate.title : currentSub.name} icon={isTerm ? 'fa-file-signature' : 'fa-pen-to-square'} workspaceUrl={DEPARTMENTS.find(d => d.id === activeDept)?.workspaceUrl}>
              <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(activeTemplate ? activeTemplate.fields : currentSub.fields).map(field => renderField(field))}

                <div className="md:col-span-2 mt-4">
                  {/* BOTOES DE ABERTURA ASSISTENCIA */}
                  {activeSubmodule === 'abertura_assistencia' && (
                    <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {!formData.adimplencia && (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2">
                           <i className="fa-solid fa-circle-exclamation text-amber-500 text-lg"></i>
                           <span className="text-xs font-medium"><strong>Ação Necessária:</strong> É obrigatório verificar o <strong>Status de Adimplência (SIVIS)</strong> para liberar o salvamento.</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <button type="button" onClick={async () => { window.open("https://portal.sivisweb.com.br/loja/012/login", "_blank"); await handleRegister('EM ANÁLISE'); }} className="flex items-center gap-2 px-4 py-3 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm">
                          <i className="fa-solid fa-magnifying-glass-dollar text-sm"></i> 1. Verificar Adimplência
                        </button>
                        {['inadimplente', 'atrasado', 'cancelado', 'suspenso'].includes(formData.adimplencia) && (
                          <button type="button" onClick={() => handleSendWebhook(formData.protocolo, 'CUSTOM', `🚨 *SOLICITAÇÃO DE EXCEÇÃO*\nCliente: ${formData.associado}\nPlaca: ${formData.placa}\nStatus SIVIS: ${formData.adimplencia}\nPor favor, autorizar ou recusar no painel.`)} className="flex items-center gap-2 px-4 py-3 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm">
                            <i className="fa-solid fa-user-shield text-sm"></i> 2. Consultar Supervisor
                          </button>
                        )}
                        {(() => {
                          const isInadimplente = ['inadimplente', 'atrasado', 'cancelado', 'suspenso'].includes(formData.adimplencia);
                          const isRecusado = isInadimplente && formData.excepcionalidade === 'inapto';
                          return (
                            <button type="button" onClick={() => handleRegister()} disabled={status.submitting || !formData.adimplencia || (isInadimplente && (!formData.excepcionalidade || !formData.motivo_excepcionalidade))} className={`group flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${isRecusado ? 'bg-red-600 hover:bg-red-500 shadow-red-500/30' : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30'}`}>
                              <span>{status.submitting ? 'Processando...' : isRecusado ? 'Encerrar (Inapto)' : 'Salvar Abertura'}</span>
                              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-colors"><i className={`fa-solid ${isRecusado ? 'fa-ban' : 'fa-check'} text-xs`}></i></div>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* BOTOES DE FECHAMENTO ASSISTENCIA */}
                  {activeSubmodule === 'fechamento_assistencia' && (
                    <div className="flex justify-end mt-4">
                      {(() => {
                         const hasPendencia = formData.pendencia === 'sim';
                         const isNao = formData.pendencia === 'nao';
                         const hasJustificativa = !!formData.justificativa_pendencia;
                         const canSubmit = isNao || (hasPendencia && hasJustificativa);
                         return (
                           <button type="button" onClick={() => handleRegister()} disabled={status.submitting || !canSubmit} className={`group flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${hasPendencia ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30' : 'bg-red-600 hover:bg-red-500 shadow-red-500/30'}`}>
                             <span>{status.submitting ? 'Processando...' : (hasPendencia ? 'Encerrar com Pendência' : 'Encerrar Atendimento')}</span>
                             <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-colors"><i className={`fa-solid ${hasPendencia ? 'fa-triangle-exclamation text-amber-600' : 'fa-lock text-red-600'} text-xs bg-white`}></i></div>
                           </button>
                         );
                      })()}
                    </div>
                  )}

                  {/* BOTOES PADRÃO */}
                  {activeSubmodule !== 'abertura_assistencia' && activeSubmodule !== 'fechamento_assistencia' && isFormularioIntegrado && (
                    <div className="flex justify-end mt-4">
                       <button type="button" onClick={() => handleRegister()} disabled={status.submitting} className="group flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 text-white shadow-lg bg-blue-600 hover:bg-blue-500 shadow-blue-500/30">
                         <span>{status.submitting ? 'Processando...' : 'Salvar Alterações'}</span>
                         <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-colors"><i className="fa-solid fa-save text-xs"></i></div>
                       </button>
                    </div>
                  )}

                  {/* BOTAO LIMPAR */}
                  {!isFormularioIntegrado && (
                    <div className="flex justify-end">
                      <button type="button" onClick={handleClearData} className="w-12 h-10 group flex items-center justify-center rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Limpar formulário">
                        <i className="fa-solid fa-eraser text-sm"></i>
                      </button>
                    </div>
                  )}

                  {/* 👇 BOTÃO EXCLUSIVO PARA REGISTRO DE ATENDIMENTO 👇 */}
                  {activeSubmodule === 'service_record' && (
                    <div className="flex justify-end mt-4">
                      <button 
                        type="button" 
                        onClick={() => handleRegister()} 
                        disabled={status.submitting} 
                        className="group flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 text-white shadow-lg bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30"
                      >
                        <span>{status.submitting ? 'Salvando...' : (isEditMode ? 'Salvar Edição' : 'Salvar Protocolo')}</span>
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-colors">
                          <i className="fa-solid fa-check text-xs"></i>
                        </div>
                      </button>
                    </div>
                  )}
                  {/* 👇 BOTÃO EXCLUSIVO PARA FORMULÁRIO DE RASTREAMENTO 👇 */}
                  {activeSubmodule === 'protocolo-instalar-rastreador' && (
                    <div className="flex justify-end mt-4 gap-3">
                      <button 
                        type="button" 
                        onClick={handleClearData} 
                        className="px-6 py-3.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                      >
                        Limpar
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleRegister()} 
                        disabled={status.submitting} 
                        className="group flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 text-white shadow-lg bg-teal-600 hover:bg-teal-500 shadow-teal-500/30"
                      >
                        <span>{status.submitting ? 'Salvando...' : 'Salvar Protocolo'}</span>
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-colors">
                          <i className="fa-solid fa-satellite-dish text-xs"></i>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </FormCard>
          </div>

          {/* O ESPELHO / PRESTADORES (Direita) */}
          <div className={isFormularioIntegrado ? "xl:col-span-3" : "xl:col-span-4"}>
            <FormMirror data={formData} title={activeTemplate ? activeTemplate.title : currentSub.name} generateMessage={generateCopyMessage} pdfType={currentSub?.pdfType} isTerm={isTerm} isBlank={isBlank} />
            
            {/* 👇 PAINEL DE CÓPIA EXCLUSIVO PARA RASTREAMENTO 👇 */}
            {activeSubmodule === 'protocolo-instalar-rastreador' && (
              <div className="mt-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                 <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <i className="fa-solid fa-copy text-teal-500"></i> Mensagens Prontas
                 </h3>
                 <div className="flex flex-col gap-3">
                   
                   {/* 1. MENSAGEM PRESTADOR */}
                   <button type="button" onClick={() => {
                     // 1. Formata a Data e Hora (Cortando milissegundos)
                    let dataF = '-';
                    let horaF = '-';
                    const dataRef = formData.data_horario || ''; // Se a sua variável não for formData, troque aqui!

                    if (dataRef && dataRef.includes('T')) {
                        const [dP, hP] = dataRef.split('T');
                        const [ano, mes, dia] = dP.split('-');
                        dataF = `${dia}/${mes}/${ano}`;
                        horaF = hP.substring(0, 5).replace(':', 'h');
                    }

                    // 2. Define o Tipo de Serviço
                    const tipoRaw = String(formData.tipo_protocolo || '').toUpperCase();
                    let tipoServico = 'INSTALAÇÃO';
                    if (tipoRaw.includes('DESINSTAL')) tipoServico = 'DESINSTALAÇÃO';
                    else if (tipoRaw.includes('MANUTEN')) tipoServico = 'MANUTENÇÃO';

                    // 3. Monta o Local Instalado (Condicional)
                    const exibirLocal = formData.local_instalado && (tipoServico === 'DESINSTALAÇÃO' || tipoServico === 'MANUTENÇÃO')
                        ? `Local Instalado: ${formData.local_instalado}\n\n`
                        : '';

                    // 4. A Mensagem Perfeita
const msgTecnico = `*PROTOCOLO DE AGENDAMENTO PARA ${tipoServico} DE RASTREADOR*

Nome completo: ${formData.nome || formData.associado || '-'}

Telefone: ${formData.telefone || '-'}

*Gênero: * ${formData.genero || '-'}

Placa: ${formData.placa || '-'}

Modelo: ${formData.veiculo || '-'}

Cor: ${formData.cor || '-'}

Ano: ${formData.ano || '-'}

${exibirLocal}N.º do EMEI: ${formData.imei || '-'}

Endereço: ${formData.endereco || '-'}

Data: ${dataF} - Horário: ${horaF}`;
                     navigator.clipboard.writeText(msgTecnico); 
                     setCopiedAction('prestador'); setTimeout(() => setCopiedAction(null), 2000);
                   }} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 rounded-xl transition-all text-left group">
                      <div>
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-teal-700">Para o Técnico</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Veículo, Endereço, Equipamento...</span>
                      </div>
                      <i className={`text-lg transition-all ${copiedAction === 'prestador' ? 'fa-solid fa-check text-emerald-500 scale-110' : 'fa-regular fa-clipboard text-slate-400 group-hover:text-teal-500'}`}></i>
                   </button>

                   {/* 2. MENSAGEM PLATAFORMA */}
                   <button type="button" onClick={() => {
                     // 1. Formata a Data e Hora (Cortando milissegundos)
                      let dataF = '-';
                      let horaF = '-';
                      const dataRef = formData.data_horario || ''; // Se a sua variável for "order" ou "data", mude aqui!

                      if (dataRef && dataRef.includes('T')) {
                          const [dP, hP] = dataRef.split('T');
                          const [ano, mes, dia] = dP.split('-');
                          dataF = `${dia}/${mes}/${ano}`;
                          horaF = hP.substring(0, 5).replace(':', 'h');
                      }

                      // 2. Formata Data de Nascimento
                      let dataNascF = formData.data_nasc || '-';
                      if (dataNascF.includes('-')) {
                          const [anoN, mesN, diaN] = dataNascF.split('-');
                          dataNascF = `${diaN}/${mesN}/${anoN}`;
                      }

                      // 3. Define o Tipo de Serviço e Plataforma
                      const tipoRaw = String(formData.tipo_protocolo || '').toUpperCase();
                      let tipoServico = 'INSTALAÇÃO';
                      if (tipoRaw.includes('DESINSTAL')) tipoServico = 'DESINSTALAÇÃO';
                      else if (tipoRaw.includes('MANUTEN')) tipoServico = 'MANUTENÇÃO';

                      const platRaw = String(formData.plataforma || '').toUpperCase();
                      let platFormatada = formData.plataforma || '-';
                      if (platRaw.includes('REDE')) platFormatada = 'Rede Loc';
                      if (platRaw.includes('RASTREIE')) platFormatada = 'Rastreie Brasil';

                      // 4. Monta o Local Instalado (Condicional)
                      const exibirLocal = formData.local_instalado && (tipoServico === 'DESINSTALAÇÃO' || tipoServico === 'MANUTENÇÃO')
                          ? `Local Instalado: ${formData.local_instalado}\n\n`
                          : '';

                      // 5. A Mensagem Completa para a Plataforma
const msgPlataforma = `💻 *CADASTRO NA PLATAFORMA - ${platFormatada.toUpperCase()}*
*Serviço:* ${tipoServico}
*Protocolo:* ${formData.protocolo || '-'}

Nome completo: ${formData.nome || formData.associado || '-'}

CPF/CNPJ: ${formData.cpf_cnpj || '-'}

Data de nascimento: ${dataNascF}

E-mail: ${formData.email || '-'}

Telefone: ${formData.telefone || '-'}

*Gênero: * ${formData.genero || '-'}

Placa: ${formData.placa || '-'}

Modelo: ${formData.veiculo || '-'}

Cor: ${formData.cor || '-'}

Ano: ${formData.ano || '-'}

Renavam: ${formData.renavam || '-'}

Chassi: ${formData.chassi || '-'}

${exibirLocal}N.º do EMEI: ${formData.imei || '-'}

Técnico: ${formData.tecnico || '-'} (${formData.telefone_tecnico || '-'})

Técnico Informado: ${String(formData.informado || '-').toUpperCase()}

Endereço: ${formData.endereco || '-'}

Data: ${dataF} - Horário: ${horaF}`;
                     navigator.clipboard.writeText(msgPlataforma); 
                     setCopiedAction('plataforma'); setTimeout(() => setCopiedAction(null), 2000);
                   }} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl transition-all text-left group">
                      <div>
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-blue-700">Para a Plataforma</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Dados fiscais, Renavam, Chassi...</span>
                      </div>
                      <i className={`text-lg transition-all ${copiedAction === 'plataforma' ? 'fa-solid fa-check text-emerald-500 scale-110' : 'fa-regular fa-clipboard text-slate-400 group-hover:text-blue-500'}`}></i>
                   </button>

                   {/* 3. MENSAGEM ASSOCIADO */}
                   <button type="button" onClick={() => {
                     const msg = `Olá, ${formData.nome || formData.associado || '-'}! Tudo bem?\n\nO seu agendamento de *${(formData.tipo_protocolo || 'Instalação').toUpperCase()}* de rastreador foi confirmado.\n\n📅 *Data/Hora:* ${formData.data_horario ? new Date(formData.data_horario).toLocaleString('pt-BR') : '-'}\n📍 *Local:* ${formData.endereco || '-'}\n👨‍🔧 *Técnico:* ${formData.tecnico || '-'}\n\nQualquer dúvida, estamos à disposição!`;
                     navigator.clipboard.writeText(msg); 
                     setCopiedAction('associado'); setTimeout(() => setCopiedAction(null), 2000);
                   }} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-xl transition-all text-left group">
                      <div>
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-emerald-700">Para o Cliente</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Confirmação de data e local...</span>
                      </div>
                      <i className={`text-lg transition-all ${copiedAction === 'associado' ? 'fa-solid fa-check text-emerald-500 scale-110' : 'fa-regular fa-clipboard text-slate-400 group-hover:text-emerald-500'}`}></i>
                   </button>

                 </div>
              </div>
            )}
            {/* 👆 FIM DO PAINEL DE CÓPIA 👆 */}

            {activeSubmodule === 'abertura_assistencia' && (
              <ProviderSearch onSearch={(addr, type) => handleSearchProviders(addr, type)} isSearching={isSearching} results={providerResults} onSelect={handleSelectProvider} radius={searchRadius} onRadiusChange={setSearchRadius} apiKey={MAPS_API_KEY} scriptUrl={GOOGLE_SCRIPT_URL} />
            )}
          </div>
        </div>
      )}

      {/* MODAL DE UPLOAD DE ARQUIVOS */}
      <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} tickets={tickets || []} onUpload={(prot, files) => handleFileUpload(prot, files, () => setIsUploadModalOpen(false))} isUploading={isUploading} />

      {/* TELA DE LOADING GLOBAL */}
      {(isLoading || status.submitting) && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5 max-w-sm text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-cyan-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><i className={`fa-solid ${isLoading ? 'fa-cloud-arrow-down text-cyan-500' : 'fa-cloud-arrow-up text-emerald-500'} text-xl animate-pulse`}></i></div>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">{isLoading ? 'Puxando Dados...' : 'Sincronizando...'}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Aguarde enquanto comunicamos com a base de dados.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormView;