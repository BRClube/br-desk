import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DEPARTMENTS } from '../constants';
import { checkPermission } from '../utils/permissions';
import { getThemeStyles } from '../utils/theme';

const Home: React.FC = () => {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();

  const visibleDepartments = DEPARTMENTS.filter(dept =>
    checkPermission(profile?.allowed_modules, dept.id)
  );

  return (
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
          const theme = getThemeStyles(dept.colorClass);

          return (
            <button
              key={dept.id}
              onClick={() => navigate(`/dept/${dept.id}`)}
              className="group relative bg-white py-8 px-10 rounded-[32px] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] transition-all duration-500 text-center animate-in fade-in slide-in-from-bottom-8 flex flex-col items-center hover:-translate-y-3 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden"
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${dept.colorClass}`}></div>
              
              <div className={`relative overflow-hidden w-16 h-16 ${dept.colorClass} text-white rounded-[20px] flex items-center justify-center mb-6 transition-transform duration-500 shadow-md group-hover:shadow-2xl group-hover:scale-110`}>
                <i className={`fa-solid ${dept.icon} text-2xl relative z-10`}></i>
                <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-[800ms] ease-in-out bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12 z-0"></div>
              </div>

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
};

export default Home;