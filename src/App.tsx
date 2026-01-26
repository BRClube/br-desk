import React, { useState } from 'react';
import Layout from '../src/Layout';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { DepartmentId, FormSubmissionStatus, Submodule, Template } from '../types';
import { DEPARTMENTS } from './constants';
import { Input, Select, TextArea, FormCard, SuccessMessage, FormMirror, RepeaterField } from './components/FormComponents';

// --- 1. COMPONENTE DASHBOARD (O seu antigo App) ---
// Toda a lógica do formulário e navegação interna fica aqui
const Dashboard: React.FC = () => {
  const { logout, profile } = useAuth(); // Pegamos logout e profile para usar se precisar
  
  // States originais
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

  const handleSelectTemplate = (template: Template) => {
    setActiveTemplate(template);
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

  const generateCopyMessage = () => {
    let templateContent = "";
    
    if (activeTemplate) {
      templateContent = activeTemplate.content;
    } else if (currentSub?.messageTemplate) {
      templateContent = typeof currentSub.messageTemplate === 'function' 
        ? currentSub.messageTemplate(formData) 
        : currentSub.messageTemplate;
    } else {
      if (Object.values(formData).every(v => !v)) return "";
      const dataLines = Object.entries(formData)
        .filter(([_, v]) => v)
        .map(([k, v]) => `*${k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')}:* ${v}`)
        .join('\n');
      return `📋 *BR CLUBE - ${currentSub?.name.toUpperCase() || 'DADOS'}*\n\n${dataLines}`;
    }

    const processedData = { ...formData };
    Object.entries(processedData).forEach(([key, value]) => {
      if(typeof value === 'string'){
        if (value && value.includes('T')) {
          const [d, t] = value.split('T');
          const [y, m, day] = d.split('-');
          processedData[key] = `${day}/${m}/${y} às ${t}`;
        } else if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [y, m, day] = value.split('-');
          processedData[key] = `${day}/${m}/${y}`;
        }
      }
    });

    let message = templateContent;
    Object.entries(processedData).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), (value as string) || `[${key}]`);
    });
    
    return message;
  };

  const simulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ submitting: true, success: null, error: null });
    setTimeout(() => setStatus({ submitting: false, success: true, error: null }), 800);
  };

  // Renderizadores (Home, Fields, etc)
  const renderHome = () => (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4">
        <div className="max-w-2xl">
          <div className="flex items-center space-x-3 text-cyan-500 font-black text-xs uppercase tracking-[0.3em] mb-4">
             <span className="w-12 h-[3px] bg-cyan-500 rounded-full"></span>
             <span>BR Desk</span>
          </div>
          <img src="/images/logo.png" alt="BR Clube Logo" className="w-44 h-auto mb-4 rounded-lg" />
          <p className="text-slate-500 text-xl font-medium leading-relaxed">
            Olá, <strong>{profile?.full_name || 'Colaborador'}</strong>. Bem-vindo ao hub de utilitários.
          </p>
        </div>
        <div>
           <button onClick={() => logout()} className="text-red-500 text-sm font-bold hover:underline">Sair do sistema</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {DEPARTMENTS.map((dept) => (
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

  const renderField = (field: any) => {
    switch(field.type) {
      case 'select':
        return <Select key={field.id} name={field.id} label={field.label} required={field.required} options={field.options || []} onChange={handleInputChange} />;
      case 'repeater':
        return <RepeaterField key={field.id} field={field} value={formData[field.id] || []} onChange={(newArray) => setFormData({...formData, [field.id]: newArray})} />;
      case 'textarea':
        return <div key={field.id} className="md:col-span-2"><TextArea name={field.id} label={field.label} placeholder={field.placeholder} required={field.required} onChange={handleInputChange} /></div>;
      default:
        return <Input key={field.id} name={field.id} label={field.label} placeholder={field.placeholder} type={field.type || 'text'} required={field.required} onChange={handleInputChange} />;
    }
  };

  const currentDeptObj = DEPARTMENTS.find(d => d.id === activeDept);

  return (
    <Layout activeDept={activeDept} activeSubmodule={activeSubmodule} onNavigate={handleNavigate}>
      {activeDept === 'home' ? (
        renderHome()
      ) : !activeSubmodule ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentDeptObj?.submodules.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleNavigate(activeDept, sub.id)}
                className="bg-white p-8 rounded-2xl border border-cyan-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-cyan-500 text-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <i className={`fa-solid ${sub.isTerm ? 'fa-file-signature' : currentDeptObj.icon}`}></i>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">{sub.name}</h3>
                <p className="text-xs text-slate-500 font-medium">
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
                  {currentSub?.isTerm ? 'Documento PDF' : 'Mensagem Digital'}
                </p>
              </div>
            </div>
          </div>
          
          {status.success ? (
            <SuccessMessage 
              message={currentSub?.isTerm ? "Documento preparado com sucesso!" : "Mensagem formatada com sucesso!"} 
              onReset={() => setStatus({ ...status, success: null })} 
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              <div className="xl:col-span-7 2xl:col-span-8">
                <FormCard title={activeTemplate ? activeTemplate.title : currentSub?.name || ''} icon={currentSub?.isTerm ? 'fa-file-signature' : 'fa-pen-to-square'}>
                   <form onSubmit={simulateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(activeTemplate ? activeTemplate.fields : (currentSub?.fields || [])).map(field => renderField(field))}
                    <div className="md:col-span-2 flex justify-end">
                      <button className="btn-primary text-white font-[900] py-4 px-12 rounded-2xl text-sm tracking-widest uppercase">
                        REVISAR DADOS
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
                  isTerm={currentSub?.isTerm || activeTemplate?.isTerm}
                  isBlank={currentSub?.isBlank}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};


// --- 2. COMPONENTE GUARDIÃO (Protege a rota) ---
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold">Carregando sistema...</div>;

  // Se não estiver logado, manda pro Login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado mas "Pendente"
  if (profile?.role === 'pendente') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-6">
            <i className="fa-solid fa-clock text-2xl"></i>
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Acesso Pendente</h1>
        <p className="text-slate-500 mb-6 max-w-md">
            Olá, <strong>{session.user.email}</strong>. Seu cadastro foi criado mas ainda aguarda liberação do administrador.
        </p>
        <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-colors"
        >
            Verificar novamente
        </button>
      </div>
    );
  }

  // Se estiver tudo certo, renderiza o Dashboard
  return children;
};

// --- 3. APP PRINCIPAL (O novo envelope com Rotas) ---
const App = () => {
  return (
    <BrowserRouter basename='import.meta.env.BASE_URL'>
      <AuthProvider>
        <Routes>
          {/* Rota Pública */}
          <Route path="/login" element={<Login />} />

          {/* Rota Privada (Qualquer outra URL leva ao Dashboard Protegido) */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;