import { useEffect, useState } from "react";

export interface QuickMessagesWidgetProps {
  currentDepartment: string;
  userRole: string;
  apiUrl: string;
  apiToken: string;
}

export const QuickMessagesWidget: React.FC<QuickMessagesWidgetProps> = ({ 
  currentDepartment, 
  userRole, 
  apiUrl, 
  apiToken 
}) => {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Estados para nova mensagem
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoTexto, setNovoTexto] = useState('');

  useEffect(() => {
    carregarMensagens();
  }, []);

  const carregarMensagens = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'listar_mensagens' })
      });
      const json = await response.json();
      if (json.status === 'sucesso') setMensagens(json.lista);
    } catch (error) {
      console.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  };

  const salvarNovaMensagem = async () => {
    if (!novoTitulo || !novoTexto) return alert("Preencha tudo!");
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'salvar_mensagem',
          departamento: currentDepartment,
          titulo: novoTitulo,
          texto: novoTexto,
          role: userRole,
          token_acesso: apiToken
        })
      });
      const json = await response.json();
      if (json.status === 'sucesso') {
        setIsAdding(false);
        setNovoTitulo('');
        setNovoTexto('');
        carregarMensagens();
      } else {
        alert(json.msg);
      }
    } catch (e) { alert("Erro ao salvar"); }
  };

  // 👇 NOVA FUNÇÃO DE DELETAR 👇
  const excluirMensagem = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta mensagem?")) return;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'excluir_mensagem',
          id_mensagem: id,
          role: userRole, // Importante para validar no backend
          token_acesso: apiToken
        })
      });
      const json = await response.json();
      
      if (json.status === 'sucesso') {
        // Remove da lista visualmente para ser rápido
        setMensagens(prev => prev.filter(m => m.id !== id));
      } else {
        alert(json.msg);
      }
    } catch (e) { alert("Erro ao excluir"); }
  };

  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto);
    const btn = document.activeElement as HTMLElement;
    if(btn && btn.tagName === 'BUTTON') {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
        setTimeout(() => btn.innerHTML = originalText, 1000);
    }
  };

  const mensagensFiltradas = mensagens.filter(m => 
    m.departamento === currentDepartment || m.departamento === 'Todos'
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <i className="fa-regular fa-comments text-purple-600"></i>
          Respostas Rápidas
        </h3>
        
        {userRole === 'admin' && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
            title="Nova Mensagem"
          >
            <i className={`fa-solid ${isAdding ? 'fa-minus' : 'fa-plus'}`}></i>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
        
        {isAdding && (
          <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm animate-in slide-in-from-top-2">
            <p className="text-[10px] font-bold text-purple-600 mb-2 uppercase">Nova msg para: {currentDepartment}</p>
            <input 
              className="w-full text-xs p-2 border rounded mb-2"
              placeholder="Título"
              value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
            />
            <textarea 
              className="w-full text-xs p-2 border rounded mb-2 h-16"
              placeholder="Texto da mensagem..."
              value={novoTexto} onChange={e => setNovoTexto(e.target.value)}
            />
            <button 
              onClick={salvarNovaMensagem}
              className="w-full bg-purple-600 text-white text-xs py-1.5 rounded font-bold"
            >
              Salvar
            </button>
          </div>
        )}

        {loading ? (
           <p className="text-xs text-center text-slate-400 py-4">Carregando...</p>
        ) : mensagensFiltradas.length === 0 ? (
           <p className="text-xs text-center text-slate-400 py-4">Nenhuma mensagem para {currentDepartment}</p>
        ) : (
           mensagensFiltradas.map((msg) => (
            <div key={msg.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
              
              <div className="flex justify-between items-start mb-1 pr-6">
                <span className="font-bold text-slate-700 text-xs">{msg.titulo}</span>
              </div>
              
              {/* BOTÃO DE EXCLUIR (LIXEIRA) - SÓ ADMIN */}
              {userRole === 'admin' && (
                <button 
                  onClick={() => excluirMensagem(msg.id)}
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"
                  title="Excluir Mensagem"
                >
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              )}

              <p className="text-[11px] text-slate-500 line-clamp-3 mb-2 leading-relaxed">
                {msg.texto}
              </p>
              
              <button 
                onClick={(e) => copiarTexto(msg.texto)}
                className="w-full bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-[10px] font-bold py-1.5 rounded border border-slate-100 transition-colors flex items-center justify-center gap-1"
              >
                <i className="fa-regular fa-copy"></i> Copiar Texto
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};