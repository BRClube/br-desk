
import React, { useState } from 'react';
import { DepartmentId, Department, Submodule, UsefulLink } from './../types';
import { DEPARTMENTS, USEFUL_LINKS } from './constants';
import { useAuth } from './contexts/AuthContext';
import { checkPermission } from './utils/permissions';

interface LayoutProps {
  children: React.ReactNode;
  activeDept: DepartmentId;
  activeSubmodule: string | null;
  onNavigate: (deptId: DepartmentId, submoduleId: string | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeDept, activeSubmodule, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLinksExpanded, setIsLinksExpanded] = useState(false);
  const [expandedDept, setExpandedDept] = useState<DepartmentId | null>(activeDept !== 'home' ? activeDept : null);
  const { profile } = useAuth();

  const visibleDepartments = DEPARTMENTS.filter(dept => 
    checkPermission(profile?.allowed_modules, dept.id)
  );

  const toggleDept = (id: DepartmentId) => {
    if (isCollapsed) setIsCollapsed(false);
    setExpandedDept(expandedDept === id ? null : id);
  };

  const renderSubmoduleButton = (sub: Submodule, isGrouped = false) => (
    <button
      key={sub.id}
      onClick={() => {
        onNavigate(sub.parentId, sub.id);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full text-left py-2 px-4 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 ${
        activeSubmodule === sub.id 
          ? 'text-cyan-400 bg-cyan-500/10' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
      } ${isGrouped ? 'ml-4 border-l border-slate-700/50' : 'ml-2'}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${activeSubmodule === sub.id ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-slate-600'}`}></div>
      <span>{sub.name}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f5fdff]">
      <aside className={`bg-[#00003D] text-white hidden md:flex flex-col sticky top-0 h-screen shadow-2xl transition-all duration-300 z-30 ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-10 bg-cyan-500 w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-cyan-400 z-50 group">
          <i className={`fa-solid fa-chevron-${isCollapsed ? 'right' : 'left'} text-[10px] text-white`}></i>
        </button>

        <div className="p-8 mb-4">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="bg-white rounded-xl w-10 h-10 flex items-center justify-center shadow-lg">
              <span className="text-navy-deep font-black text-lg">BR</span>
            </div>
            {!isCollapsed && (
              <div>
                <span className="text-xl font-extrabold tracking-tight block">BR CLUBE</span>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em]">Hub Operacional</span>
              </div>
            )}
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar pb-10">
          <button 
            onClick={() => { onNavigate('home', null); setExpandedDept(null); setIsLinksExpanded(false); }}
            className={`w-full flex items-center rounded-xl px-4 py-3.5 transition-all ${
              activeDept === 'home' ? 'sidebar-item-active text-white' : 'text-slate-400 hover:bg-white/5'
            } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
          >
            <i className="fa-solid fa-house-chimney text-lg"></i>
            {!isCollapsed && <span className="font-bold text-sm">Página Inicial</span>}
          </button>

          {/* Links Úteis Dropdown */}
          <div className="space-y-1">
            <button 
              onClick={() => {
                if (isCollapsed) setIsCollapsed(false);
                setIsLinksExpanded(!isLinksExpanded);
              }}
              className={`w-full flex items-center rounded-xl transition-all ${
                isLinksExpanded ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              } ${isCollapsed ? 'justify-center py-4' : 'px-4 py-3.5 justify-between group'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isLinksExpanded ? 'bg-cyan-500/20 text-cyan-400' : 'bg-transparent text-slate-500 group-hover:text-cyan-400'
                }`}>
                  <i className="fa-solid fa-link text-base"></i>
                </div>
                {!isCollapsed && <span className="font-bold text-sm truncate">Links Úteis</span>}
              </div>
              {!isCollapsed && (
                <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-300 ${isLinksExpanded ? 'rotate-180 text-cyan-500' : 'opacity-30'}`}></i>
              )}
            </button>

            {!isCollapsed && isLinksExpanded && (
              <div className="animate-in slide-in-from-top-2 duration-300 overflow-hidden ml-2 space-y-1">
                {USEFUL_LINKS.map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-left py-2 px-4 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all flex items-center space-x-3"
                  >
                    <i className={`fa-solid ${link.icon} w-4 text-center opacity-70`}></i>
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
          
          {!isCollapsed && <div className="pt-6 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Departamentos</div>}
          
          {visibleDepartments.map((dept) => {
            const isExpanded = expandedDept === dept.id;
            const isActive = activeDept === dept.id;

            return (
              <div key={dept.id} className="space-y-1">
                <button 
                  onClick={() => toggleDept(dept.id)}
                  className={`w-full flex items-center rounded-xl transition-all ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  } ${isCollapsed ? 'justify-center py-4' : 'px-4 py-3.5 justify-between group'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-transparent text-slate-500 group-hover:text-cyan-400'
                    }`}>
                      <i className={`fa-solid ${dept.icon} text-base`}></i>
                    </div>
                    {!isCollapsed && <span className="font-bold text-sm truncate">{dept.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-300 ${isExpanded ? 'rotate-180 text-cyan-500' : 'opacity-30'}`}></i>
                  )}
                </button>

                {!isCollapsed && isExpanded && (
                  <div className="animate-in slide-in-from-top-2 duration-300 overflow-hidden">
                    {dept.submodules.map(sub => renderSubmoduleButton(sub))}
                    {dept.groups?.map(group => (
                      <div key={group.name} className="mt-3 mb-2">
                        <div className="px-6 py-1.5 text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center space-x-2">
                           <span className="w-2 h-[1px] bg-slate-700"></span>
                           <span>{group.name}</span>
                        </div>
                        {group.items.map(sub => renderSubmoduleButton(sub, true))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <header className="md:hidden bg-navy-deep text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><span className="text-navy-deep font-black">BR</span></div>
          <span className="font-bold text-sm tracking-tight">BR CLUBE</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10">
          <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars-staggered'} text-xl`}></i>
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-navy-deep z-40 md:hidden pt-20 px-6 overflow-y-auto">
          <nav className="space-y-4 pb-10">
             <button onClick={() => { onNavigate('home', null); setIsMobileMenuOpen(false); }} className={`w-full text-left text-white px-5 py-4 rounded-xl font-bold flex items-center space-x-3 ${activeDept === 'home' ? 'bg-cyan-600' : 'bg-white/5'}`}>
               <i className="fa-solid fa-house"></i><span>Início</span>
             </button>
             
             <div className="px-4 text-[10px] font-black text-cyan-500 uppercase tracking-widest pt-4">Links Úteis</div>
             <div className="grid grid-cols-2 gap-2">
                {USEFUL_LINKS.map(link => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="bg-white/5 text-white p-3 rounded-xl text-xs flex items-center space-x-2">
                    <i className={`fa-solid ${link.icon}`}></i>
                    <span>{link.label}</span>
                  </a>
                ))}
             </div>

             {visibleDepartments.map(dept => (
               <div key={dept.id} className="space-y-2">
                 <div className="px-4 text-[10px] font-black text-cyan-500 uppercase tracking-widest pt-4">{dept.name}</div>
                 {dept.submodules.map(sub => (
                   <button key={sub.id} onClick={() => { onNavigate(dept.id, sub.id); setIsMobileMenuOpen(false); }} className={`w-full text-left text-white px-5 py-3 rounded-xl text-sm ${activeSubmodule === sub.id ? 'bg-cyan-500/30 border border-cyan-500/50' : 'bg-white/5'}`}>
                     {sub.name}
                   </button>
                 ))}
                 {dept.groups?.map(g => g.items.map(sub => (
                   <button key={sub.id} onClick={() => { onNavigate(dept.id, sub.id); setIsMobileMenuOpen(false); }} className={`w-full text-left text-white px-5 py-3 rounded-xl text-sm ${activeSubmodule === sub.id ? 'bg-cyan-500/30 border border-cyan-500/50' : 'bg-white/5'}`}>
                     {g.name}: {sub.name}
                   </button>
                 )))}
               </div>
             ))}
          </nav>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="p-6 lg:p-10 max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
