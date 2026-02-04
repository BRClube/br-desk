import React, { useState } from 'react';
import Layout from '../Layout';
import { useAuth } from '../contexts/AuthContext';
import { DepartmentId, FormSubmissionStatus, Submodule, Template } from '../../types'; // Ajuste o caminho '../types' se necessário
import { DEPARTMENTS } from '../constants';
import { Input, Select, TextArea, FormCard, SuccessMessage, FormMirror, RepeaterField } from '../components/FormComponents';
import { checkPermission } from '../utils/permissions';
import { formatDateTime } from '../utils/Formatters';
// --- CONFIGURAÇÕES SENSÍVEIS (Agora ficam protegidas pelo Lazy Loading) ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz27OajWuPo27GkycSofDwbvbc9IKA6MeCgdjzbprXcQ82Uvl9EpnxgPqRo4fAcfsqoPg/exec";
const API_TOKEN = "brclube-2026"; // Token de segurança que definimos

const Dashboard: React.FC = () => {
  const { logout, profile } = useAuth();
  
  const visibleDepartments = DEPARTMENTS.filter(dept => 
    checkPermission(profile?.allowed_modules, dept.id)
  );

  const [activeDept, setActiveDept] = useState<DepartmentId>('home');
  const [activeSubmodule, setActiveSubmodule] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [status, setStatus] = useState<FormSubmissionStatus>({ submitting: false, success: null, error: null });
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleNavigate = (deptId: DepartmentId, submoduleId: string | null) => {
    setActiveDept(deptId);
    setActiveSubmodule(submoduleId);
    setActiveTemplate(null);
    setStatus({ submitting: false, success: null, error: null });
    setFormData({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // --- LÓGICA DO REGISTRO (GOOGLE SHEETS) ---
  const isFormularioIntegrado = activeSubmodule === 'abertura_assistencia' || activeSubmodule === 'fechamento_assistencia';

  const handleRegister = async () => {
    if (!window.confirm("Confirma o registro desses dados no sistema?")) return;

    setStatus({ submitting: true, success: null, error: null });

    const payload = {
      ...formData,
      form_id: activeSubmodule,
      user_email: profile?.email,
      token_acesso: API_TOKEN // <--- TOKEN ADICIONADO AQUI
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      alert("Dados enviados para o sistema com sucesso!");
      setStatus({ submitting: false, success: true, error: null });

    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao conectar com o sistema.");
      setStatus({ submitting: false, success: null, error: "Erro de conexão" });
    }
  };

  const generateCopyMessage = () => {
    let templateContent = "";
    if (activeTemplate) { templateContent = activeTemplate.content; } 
    else if (currentSub?.messageTemplate) { 
        templateContent = typeof currentSub.messageTemplate === 'function' ? currentSub.messageTemplate(formData) : currentSub.messageTemplate; 
    } 
    else { return ""; }

    const processedData = { ...formData };
    let message = templateContent;

    // Lista dos IDs dos campos que são datas e precisam de formatação
    const dateFields = [
        'data-hora', 
        'hora_solicitacao', 
        'hora_autorizacao', 
        'hora_prestador', 
        'chegada_prestador', 
        'encerramento_atendimento'
    ];

    Object.entries(processedData).forEach(([key, value]) => {
      let finalValue = (value as string) || `[${key}]`;

      // Se o campo for uma data, formata antes de substituir
      if (dateFields.includes(key) && value) {
          finalValue = formatDateTime(value as string);
      }

      message = message.replace(new RegExp(`{{${key}}}`, 'g'), finalValue);
    });
    
    return message;
  };

  const renderField = (field: any) => {
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
      setStatus({ submitting: false, success: null, error: null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
        <div className="space-y-8">
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
          </div>
          
          {status.success && !isFormularioIntegrado ? (
            <SuccessMessage 
              message={isTerm ? "Documento preparado com sucesso!" : "Mensagem formatada com sucesso!"} 
              onReset={() => setStatus({ ...status, success: null })} 
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              <div className="xl:col-span-7 2xl:col-span-8">
                <FormCard title={activeTemplate ? activeTemplate.title : currentSub?.name || ''} icon={isTerm ? 'fa-file-signature' : 'fa-pen-to-square'}>
                   <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(activeTemplate ? activeTemplate.fields : (currentSub?.fields || [])).map(field => renderField(field))}
                    
                    <div className="md:col-span-2 flex justify-end gap-4 flex-wrap">
                      
                      {isFormularioIntegrado && (
                         <button
                           type="button"
                           onClick={handleRegister}
                           disabled={status.submitting}
                           className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300 bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           <span>{status.submitting ? 'Enviando...' : 'Registrar no Sistema'}</span>
                           <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-colors">
                             <i className="fa-solid fa-check text-sm"></i>
                           </div>
                         </button>
                      )}

                      <button 
                        type="button" 
                        onClick={handleClearData}
                        className="w-60 group flex items-center justify-between px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100"
                      >
                        <span className="flex-1 text-left">
                           <span className="group-hover:hidden">Limpar Campos</span>
                           <span className="hidden group-hover:inline">Apagar Tudo</span>
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white group-hover:bg-red-100 flex items-center justify-center transition-colors shadow-sm ml-2">
                          <i className="fa-solid fa-eraser text-sm transition-transform group-hover:rotate-12"></i>
                        </div>
                      </button>

                    </div>
                  </form>
                </FormCard>
              </div>
              <div className="xl:col-span-5 2xl:col-span-4">
                <FormMirror 
                  data={formData} 
                  title={activeTemplate ? activeTemplate.title : currentSub?.name || ''} 
                  generateMessage={generateCopyMessage} 
                  pdfType={currentSub?.pdfType}
                  isTerm={isTerm}
                  isBlank={isBlank}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;