import React from 'react';

interface Ticket {
  protocolo: string;
  associado: string;
  placa: string;
  status: string;
}

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (protocolo: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  currentAttendant: string; // Para mostrar no título
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, onSelectTicket, isLoading, onRefresh, currentAttendant }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
      {/* Cabeçalho */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wide">Meus Atendimentos</h4>
          <p className="text-[10px] text-slate-400 font-bold">Logado como: {currentAttendant}</p>
        </div>
        <button 
          onClick={onRefresh} 
          className="text-slate-400 hover:text-cyan-600 transition-colors"
          title="Atualizar Lista"
        >
          <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`}></i>
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {tickets.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-slate-300 text-xs italic">
            Nenhum atendimento pendente.
          </div>
        ) : (
          tickets.map((t) => (
            <div 
              key={t.protocolo}
              onClick={() => onSelectTicket(t.protocolo)}
              className="p-3 rounded-xl border border-slate-100 bg-white hover:border-cyan-300 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-black text-xs text-slate-700">{t.associado}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  t.status === 'ABERTO' ? 'bg-green-50 text-green-600 border-green-100' : 
                  t.status === 'EM ANDAMENTO' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {t.status}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-[10px] text-slate-500">
                  <div><i className="fa-solid fa-car"></i> {t.placa}</div>
                  <div className="font-mono text-[9px] mt-0.5 text-slate-400">{t.protocolo}</div>
                </div>
                <i className="fa-solid fa-pen-to-square text-slate-300 group-hover:text-cyan-500 transition-colors"></i>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};