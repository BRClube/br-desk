import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../hooks/useCRM';
import { DEPARTMENTS } from '../constants';
import { DepartmentId, Submodule, Template, FormSubmissionStatus, PrestadorResultado } from '../../types';
import { formatDateTime } from '../utils/Formatters';
import { 
  FormCard, FormMirror, Select, RepeaterField, TextArea, Input, 
  SuccessMessage, ProviderSearch, UploadModal 
} from '../components/FormComponents';
import { TicketList } from '../components/TicketList';

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
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [providerResults, setProviderResults] = useState<PrestadorResultado[] | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);

  // Recebe os dados do CRM enviados pela tela do Department
  useEffect(() => {
    if (location.state?.ticketData) {
      setFormData(location.state.ticketData);
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

    const payload = {
      ...cleanedFormData,
      action: 'salvar_ou_atualizar',
      status: finalStatus, 
      hora_solicitacao: isClosing ? cleanedFormData.hora_solicitacao : new Date().toLocaleTimeString(),
      hora_encerramento: (isClosing || finalStatus === 'CANCELADO') ? new Date().toLocaleTimeString() : '',
      form_id: activeSubmodule,
      user_email: profile?.email,
      atendente: profile?.full_name || profile?.email,
      token_acesso: API_TOKEN
    };

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
    if (field.showIf) {
      const watchingValue = formData[field.showIf.field];
      if (Array.isArray(field.showIf.value)) {
         if (!field.showIf.value.includes(watchingValue)) return null;
      } else {
         if (watchingValue !== field.showIf.value) return null;
      }
    }

    switch (field.type) {
      case 'select': return <Select key={field.id} name={field.id} label={field.label} required={field.required} options={field.options || []} value={formData[field.id] || ''} onChange={handleInputChange} />;
      case 'repeater': return <RepeaterField key={field.id} field={field} value={formData[field.id] || []} onChange={(newArray) => setFormData({ ...formData, [field.id]: newArray })} />;
      case 'textarea': return <div key={field.id} className="md:col-span-2"><TextArea name={field.id} label={field.label} placeholder={field.placeholder} required={field.required} value={formData[field.id] || ''} onChange={handleInputChange} /></div>;
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

  const handleSelectProvider = (prestador: PrestadorResultado) => {
    setFormData(prev => ({ ...prev, prestador_nome: prestador.nome, prestador: prestador.nome, telefone_prestador: prestador.telefone || '' }));
  };

  if (!currentSub) return null;

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
                </div>
              </form>
            </FormCard>
          </div>

          {/* O ESPELHO / PRESTADORES (Direita) */}
          <div className={isFormularioIntegrado ? "xl:col-span-3" : "xl:col-span-4"}>
            <FormMirror data={formData} title={activeTemplate ? activeTemplate.title : currentSub.name} generateMessage={generateCopyMessage} pdfType={currentSub?.pdfType} isTerm={isTerm} isBlank={isBlank} />
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