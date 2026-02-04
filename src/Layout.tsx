import React, { useState, useMemo } from 'react';
import { DepartmentId, Submodule } from './../types';
import { DEPARTMENTS, USEFUL_LINKS } from './constants';
import { useAuth } from './contexts/AuthContext';
import { checkPermission } from './utils/permissions';
import { useNavigate, useLocation } from 'react-router-dom';
import Chatbot from './services/Chatbot';
import logoBrClubeQuadrada from './assets/brclube2.png';

interface LayoutProps {
  children: React.ReactNode;
  activeDept: DepartmentId;
  activeSubmodule: string | null;
  onNavigate: (deptId: DepartmentId, submoduleId: string | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeDept, activeSubmodule, onNavigate }) => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Filtro de permissões
  const visibleDepartments = DEPARTMENTS.filter(dept => 
    checkPermission(profile?.allowed_modules, dept.id)
  );

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLinksExpanded, setIsLinksExpanded] = useState(false);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(true);
  
  // --- NOVO: STATE DA PESQUISA ---
  const [searchTerm, setSearchTerm] = useState('');

  const BG_COLOR = "bg-[#00003D]";

  // --- NOVO: LÓGICA DE BUSCA GLOBAL ---
  // Memoizamos para não recalcular a cada render, apenas quando o termo mudar
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    const results: { dept: typeof DEPARTMENTS[0], sub: Submodule }[] = [];

    visibleDepartments.forEach(dept => {
      // Procura nos submodulos normais
      dept.submodules.forEach(sub => {
        if (sub.name.toLowerCase().includes(term)) {
          results.push({ dept, sub });
        }
      });
      // Procura nos grupos (se houver)
      dept.groups?.forEach(group => {
        group.items.forEach(sub => {
          if (sub.name.toLowerCase().includes(term)) {
            results.push({ dept, sub });
          }
        });
      });
    });

    return results;
  }, [searchTerm, visibleDepartments]);

  // Função auxiliar para limpar a busca ao navegar
  const handleSearchResultClick = (deptId: DepartmentId, subId: string) => {
    onNavigate(deptId, subId);
    navigate('/');
    setSearchTerm(''); // Limpa a busca
    setIsMobileMenuOpen(false); // Fecha menu mobile se estiver aberto
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f5fdff]">
      
      {/* --- SIDEBAR DESKTOP --- */}
      <aside className={`${BG_COLOR} text-white hidden md:flex flex-col sticky top-0 h-screen shadow-2xl transition-all duration-300 z-30 ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-10 bg-cyan-500 w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-cyan-400 z-50 group">
          <i className={`fa-solid fa-chevron-${isCollapsed ? 'right' : 'left'} text-[10px] text-white`}></i>
        </button>

        <div className="p-8 mb-2">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="rounded-xl w-10 h-10 flex items-center justify-center shadow-lg bg-white overflow-hidden">
              <img src={logoBrClubeQuadrada} className='w-full h-full object-cover' alt="Logo"/>
            </div>
            {!isCollapsed && (
              <div>
                <span className="text-xl font-extrabold tracking-tight block leading-none">BR CLUBE</span>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em]">Hub Operacional</span>
              </div>
            )}
          </div>
        </div>
        
        {/* --- NOVO: CAMPO DE BUSCA (DESKTOP) --- */}
        {!isCollapsed && (
          <div className="px-4 mb-6">
            <div className="relative group">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors"></i>
              <input 
                type="text" 
                placeholder="Buscar formulário..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:bg-white/10 focus:border-cyan-500/50 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-10">
          
          {/* --- MODO DE BUSCA ATIVO --- */}
          {searchTerm ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2 px-2">
                Resultados ({searchResults.length})
              </div>
              
              {searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((item) => (
                    <button
                      key={item.sub.id}
                      onClick={() => handleSearchResultClick(item.dept.id, item.sub.id)}
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-transparent hover:border-cyan-500/30 transition-all group"
                    >
                      <div className="font-bold text-sm text-white group-hover:text-cyan-300 mb-0.5">{item.sub.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <i className={`fa-solid ${item.dept.icon}`}></i> {item.dept.name}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm italic bg-white/5 rounded-xl border border-white/5">
                  Nenhum termo ou formulário encontrado.
                </div>
              )}
            </div>
          ) : (
            /* --- MENU PADRÃO (SE NÃO TIVER BUSCA) --- */
            <>
              {/* Botão Início */}
              <button 
                onClick={() => { onNavigate('home', null); navigate('/'); }}
                className={`w-full flex items-center rounded-xl px-4 py-3.5 transition-all ${
                  activeDept === 'home' && location.pathname === '/' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:bg-white/5'
                } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
              >
                <i className="fa-solid fa-house-chimney text-lg"></i>
                {!isCollapsed && <span className="font-bold text-sm">Página Inicial</span>}
              </button>

              {/* Botão Admin */}
              {isAdmin && (
                <button 
                  onClick={() => navigate('/admin')}
                  className={`w-full flex items-center rounded-xl px-4 py-3.5 transition-all ${
                    location.pathname === '/admin' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-purple-300 hover:bg-purple-900/30'
                  } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                >
                  <i className="fa-solid fa-users-gear text-lg"></i>
                  {!isCollapsed && <span className="font-bold text-sm">Painel Admin</span>}
                </button>
              )}

              <div className="border-t border-slate-700/50 my-2"></div>

              {/* Links Úteis */}
              <div>
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
                    <i className="fa-solid fa-link text-base w-6 text-center"></i>
                    {!isCollapsed && <span className="font-bold text-sm truncate">Links Úteis</span>}
                  </div>
                  {!isCollapsed && (
                    <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-300 ${isLinksExpanded ? 'rotate-180 text-cyan-500' : 'opacity-30'}`}></i>
                  )}
                </button>

                {!isCollapsed && isLinksExpanded && (
                  <div className="animate-in slide-in-from-top-2 duration-300 overflow-hidden ml-4 space-y-1 mt-1 border-l border-slate-700/50 pl-2">
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
              
              {/* Departamentos */}
              <div>
                <button 
                  onClick={() => {
                    if (isCollapsed) setIsCollapsed(false);
                    setIsDeptDropdownOpen(!isDeptDropdownOpen);
                  }}
                  className={`w-full flex items-center rounded-xl transition-all ${
                    activeDept !== 'home' ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  } ${isCollapsed ? 'justify-center py-4' : 'px-4 py-3.5 justify-between group'}`}
                >
                  <div className="flex items-center space-x-3">
                     <i className="fa-solid fa-layer-group text-base w-6 text-center"></i>
                     {!isCollapsed && <span className="font-bold text-sm truncate">Departamentos</span>}
                  </div>
                  {!isCollapsed && (
                    <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-300 ${isDeptDropdownOpen ? 'rotate-180 text-cyan-500' : 'opacity-30'}`}></i>
                  )}
                </button>
                
                {!isCollapsed && isDeptDropdownOpen && (
                  <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    {visibleDepartments.map((dept) => {
                      const isActive = activeDept === dept.id;
                      return (
                        <button 
                          key={dept.id}
                          onClick={() => { onNavigate(dept.id, null); navigate('/'); }}
                          className={`w-full flex items-center rounded-lg px-4 py-2.5 transition-all ml-4 border-l ${
                            isActive ? 'border-cyan-500 text-cyan-400 bg-cyan-900/20' : 'border-slate-700/30 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                           <div className="flex items-center space-x-3 w-full">
                             <i className={`fa-solid ${dept.icon} text-sm w-5 text-center`}></i>
                             <span className="font-semibold text-xs truncate">{dept.name}</span>
                           </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

        </nav>
      </aside>

      {/* --- HEADER MOBILE --- */}
      <header className={`md:hidden ${BG_COLOR} text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md h-16`}>
        <div className="flex items-center space-x-3" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
             <img src={logoBrClubeQuadrada} className='w-full h-full object-cover' alt="Logo"/>
          </div>
          <span className="font-bold text-sm tracking-tight">BR CLUBE</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
        >
          <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars-staggered'} text-xl`}></i>
        </button>
      </header>

      {/* --- MENU MOBILE OVERLAY --- */}
      {isMobileMenuOpen && (
        <div className={`fixed inset-0 ${BG_COLOR} z-40 md:hidden pt-20 px-6 overflow-y-auto animate-in fade-in duration-200`}>
          
          {/* --- NOVO: BUSCA NO MOBILE --- */}
          <div className="mb-6">
             <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                  type="text" 
                  placeholder="Buscar formulário..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-400 focus:outline-none focus:bg-white/20 focus:border-cyan-500/50"
                />
             </div>
          </div>

          <nav className="space-y-4 pb-20">
              
              {searchTerm ? (
                /* RESULTADOS NO MOBILE */
                <div className="space-y-2">
                   <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2">Resultados da Busca</div>
                   {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <button
                          key={item.sub.id}
                          onClick={() => handleSearchResultClick(item.dept.id, item.sub.id)}
                          className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3"
                        >
                          <i className={`fa-solid ${item.dept.icon} text-slate-400`}></i>
                          <span className="font-bold text-white">{item.sub.name}</span>
                        </button>
                      ))
                   ) : (
                     <div className="text-center py-6 text-slate-500 text-sm italic">Nada encontrado.</div>
                   )}
                </div>
              ) : (
                /* MENU MOBILE PADRÃO */
                <>
                  <button 
                    onClick={() => { onNavigate('home', null); navigate('/'); setIsMobileMenuOpen(false); }} 
                    className={`w-full text-left text-white px-5 py-4 rounded-xl font-bold flex items-center space-x-3 ${activeDept === 'home' ? 'bg-cyan-600 shadow-lg' : 'bg-white/5 border border-white/5'}`}
                  >
                    <i className="fa-solid fa-house"></i><span>Início</span>
                  </button>

                  {isAdmin && (
                    <button 
                      onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }} 
                      className="w-full text-left text-white px-5 py-4 rounded-xl font-bold flex items-center space-x-3 bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    >
                      <i className="fa-solid fa-users-gear"></i><span>Painel Admin</span>
                    </button>
                  )}
                  
                  {/* Departamentos Mobile */}
                  <div className="mt-6 mb-2 flex items-center space-x-4">
                     <div className="h-px bg-slate-700 flex-1"></div>
                     <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Departamentos</span>
                     <div className="h-px bg-slate-700 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {visibleDepartments.map(dept => (
                      <button 
                        key={dept.id} 
                        onClick={() => { onNavigate(dept.id, null); navigate('/'); setIsMobileMenuOpen(false); }} 
                        className={`w-full text-left text-white px-5 py-4 rounded-xl text-sm flex items-center gap-3 transition-colors ${
                          activeDept === dept.id ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400' : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeDept === dept.id ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          <i className={`fa-solid ${dept.icon}`}></i>
                        </div>
                        <span className="font-semibold">{dept.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Links Úteis Mobile */}
                  <div className="mt-8 mb-2 flex items-center space-x-4">
                     <div className="h-px bg-slate-700 flex-1"></div>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Links Externos</span>
                     <div className="h-px bg-slate-700 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {USEFUL_LINKS.map(link => (
                      <a 
                        key={link.id} 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-slate-900/50 border border-slate-700/50 text-slate-300 p-4 rounded-xl text-xs flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                      >
                        <i className={`fa-solid ${link.icon} text-lg mb-1`}></i>
                        <span className="text-center">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
          </nav>
        </div>
      )}

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="p-4 md:p-6 lg:p-10 max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
      <Chatbot/>
    </div>
  );
};

export default Layout;