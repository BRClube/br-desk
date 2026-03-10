import React, { useState, useEffect, memo } from 'react';
import { PDFDownloadLink, pdf, PDFViewer } from '@react-pdf/renderer';
import { TermoAcordoPDF, CobrancaPDF, TermoCancelamentoPDF, EntregaVeiculoPDF, TermoAcordoAmparoPDF, TermoRecebimentoRastreadorPDF, RecebimentoPecasPDF, ReciboPrestadorPDF, ReciboPagamentoEstagioPDF, ReciboPagamentoTransportePDF, ReciboChequePDF, TermoIndenizacaoPecuniaria, TermoQuitacaoEventoPDF, EtiquetaEnvioPDF, ReciboGenerico } from '../PDFTemplates';



// ============================================================================
// COMPONENTE: MAP MODAL HÍBRIDO (INTERNO + EXTERNO)
// ============================================================================
interface MapModalProps {
  provider: PrestadorResultado; // Recebe o objeto completo agora
  customerAddress: string;
  apiKey: string;
  scriptUrl: string;
  onClose: () => void;
}

const WEBHOOK_OPTIONS = [
  { 
    id: 'PRESTADOR_CAMINHO', 
    label: '🚀 Prestador a Caminho', 
    isCaminho: true, // <--- NOVA FLAG: Ativa o layout de 3 campos
    sheetField: 'hora_envio' 
  },
  { 
    id: 'NO_LOCAL', 
    label: '📍 Prestador no Local', 
    needsInput: true, 
    inputType: 'time', 
    inputLabel: 'Hora de Chegada',
    sheetField: 'hora_chegada' // <--- Linka com o campo da planilha
  },
  { 
    id: 'PREVISAO', 
    label: '⏳ Atualizar Previsão', 
    needsInput: true, 
    inputType: 'time', 
    inputLabel: 'Nova Previsão' 
    // Não tem sheetField, então só manda mensagem no chat
  },
  { id: 'FINALIZADO', label: '✅ Finalizar Atendimento', needsInput: false },
];

// Helper para traduzir a cor simples em classes Tailwind completas
const getButtonColorClasses = (color: string) => {
  const themes: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100',
    green:  'bg-green-50 text-green-600 border-green-100 hover:bg-green-100',
    red:    'bg-red-50 text-red-600 border-red-100 hover:bg-red-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100',
    cyan:   'bg-cyan-50 text-cyan-600 border-cyan-100 hover:bg-cyan-100',
  };
  return themes[color] || themes['blue']; // Retorna azul se a cor não existir
};

const MapModal: React.FC<MapModalProps> = ({ provider, customerAddress, apiKey, scriptUrl, onClose }) => {
  const [info, setInfo] = useState<any>(provider); // Começa com os dados que já temos
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [showMap, setShowMap] = useState(false); // <--- CONTROLE DE LAZY LOAD DO MAPA

  // BUSCA DETALHES EXTRAS (SÓ SE FOR EXTERNO/GOOGLE)
  useEffect(() => {
    if (provider.origem === 'externo' && provider.place_id) {
      setLoadingInfo(true);
      fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'buscar_detalhes_place', place_id: provider.place_id })
      })
        .then(r => r.json())
        .then(data => {
          if (data.status === 'sucesso') {
             // Mescla os detalhes novos com o que já tínhamos
             setInfo((prev: any) => ({ ...prev, ...data.detalhes }));
          }
        })
        .catch(err => console.error("Erro detalhes", err))
        .finally(() => setLoadingInfo(false));
    }
  }, [provider, scriptUrl]);

  // CONSTRUÇÃO DA URL DO MAPA (INTELIGENTE)
  // Se tiver Lat/Lng (Interno), usa coordenada. Se for Externo, usa Place ID ou Endereço.
  const destinationQuery = (provider.lat && provider.lng) 
      ? `${provider.lat},${provider.lng}` 
      : (provider.place_id ? `place_id:${provider.place_id}` : provider.endereco);
      
  const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(customerAddress)}&destination=${encodeURIComponent(destinationQuery)}&mode=driving`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95">

        {/* COLUNA DA ESQUERDA: DETALHES */}
        <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col relative">
          {/* Cabeçalho */}
          <div className="p-6 border-b border-slate-100 bg-white">
             <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${info.origem === 'interno' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                   {info.origem === 'interno' ? 'Parceiro Cadastrado' : 'Google Places'}
                </span>
                <button onClick={onClose} className="md:hidden text-slate-400"><i className="fa-solid fa-times"></i></button>
             </div>
             <h2 className="text-2xl font-black text-slate-800 leading-tight">{info.nome}</h2>
             <p className="text-xs text-slate-500 mt-1 font-medium">{info.endereco}</p>
          </div>

          {/* Conteúdo Scrollável */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
             
             {loadingInfo && (
               <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm animate-pulse">
                 <i className="fa-solid fa-circle-notch fa-spin"></i> Buscando mais dados...
               </div>
             )}

             {/* FOTO (Se houver) */}
             {info.foto && (
                <div className="w-full h-40 rounded-xl overflow-hidden shadow-sm bg-slate-200 shrink-0">
                  <img src={info.foto} alt="Local" className="w-full h-full object-cover" />
                </div>
             )}

             {/* INFO CARD: CONTATO */}
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-2">
                   <i className="fa-solid fa-phone"></i> Contato
                </label>
                {info.telefone ? (
                  <div>
                    <a href={`tel:${info.telefone}`} className="text-xl font-black text-slate-800 hover:text-cyan-600 transition-colors block">
                       {info.telefone}
                    </a>
                    {info.contato && <span className="text-xs text-slate-500 font-medium block mt-1">Falar com: {info.contato}</span>}
                  </div>
                ) : <span className="text-slate-400 text-sm italic">Telefone não informado</span>}
             </div>

             {/* INFO CARD: HORÁRIO & OBS */}
             {(info.horario || info.obs) && (
               <div className="space-y-3">
                  {info.horario && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                       <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Horário</label>
                       <p className="text-sm font-medium text-slate-700">{info.horario}</p>
                       {/* Se for do Google e tiver info de aberto agora */}
                       {info.aberto_agora !== undefined && (
                          <span className={`text-[10px] font-bold uppercase mt-1 inline-block ${info.aberto_agora ? 'text-green-600' : 'text-red-500'}`}>
                             {info.aberto_agora ? '• Aberto Agora' : '• Fechado Agora'}
                          </span>
                       )}
                    </div>
                  )}

                  {info.obs && (
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                       <label className="text-[10px] uppercase font-bold text-yellow-600 mb-1 block"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Observações</label>
                       <p className="text-sm text-yellow-800 leading-relaxed">{info.obs}</p>
                    </div>
                  )}
               </div>
             )}
             
             {/* DISTÂNCIA */}
             {info.distancia && (
                <div className="text-center py-4 bg-slate-100 rounded-xl border border-dashed border-slate-300">
                   <span className="text-xs font-bold text-slate-400 uppercase">Distância Estimada</span>
                   <p className="text-2xl font-black text-slate-700">{info.distancia.toFixed(1)} km</p>
                </div>
             )}
          </div>
        </div>

        {/* COLUNA DA DIREITA: MAPA (LAZY LOAD) */}
        <div className="flex-1 bg-slate-200 relative flex flex-col">
           <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center">
              <i className="fa-solid fa-xmark text-lg"></i>
           </button>

           {!showMap ? (
              // ESTADO INICIAL: BOTÃO PARA CARREGAR
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-8 text-center">
                 <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 animate-in zoom-in duration-500">
                    <i className="fa-solid fa-map-location-dot text-4xl text-cyan-500"></i>
                 </div>
                 <h3 className="text-xl font-black text-slate-700 mb-2">Visualizar Rota no Mapa</h3>
                 <p className="text-sm text-slate-500 max-w-xs mb-8">
                    Clique abaixo para traçar o caminho do endereço do cliente até este prestador.
                 </p>
                 <button 
                   onClick={() => setShowMap(true)}
                   className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-1 flex items-center gap-3"
                 >
                    <i className="fa-solid fa-route"></i> Carregar Rota
                 </button>
              </div>
           ) : (
              // ESTADO CARREGADO: IFRAME
              <iframe
                className="w-full h-full flex-1 animate-in fade-in"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={mapUrl}
              ></iframe>
           )}
        </div>

      </div>
    </div>
  );
};


// --- 1. FUNÇÃO AUXILIAR PARA ESCOLHER O TEMPLATE ---
const getPdfComponent = (type: string | undefined, data: any) => {
  switch (type) {
    case 'termo_acordo': return <TermoAcordoPDF data={data} />;
    case 'cobranca': return <CobrancaPDF data={data} />;
    case 'termo_cancelamento': return <TermoCancelamentoPDF data={data} />;
    case 'entrega_veiculo': return <EntregaVeiculoPDF data={data} />;
    case 'termo_acordo_amparo': return <TermoAcordoAmparoPDF data={data} />;
    case 'termo_recebimento_rastreador': return <TermoRecebimentoRastreadorPDF data={data} />
    case 'termo_pecas': return <RecebimentoPecasPDF data={data} />
    case 'termo_recibo_prestador': return <ReciboPrestadorPDF data={data} />
    case 'termo_recibo_estagio': return <ReciboPagamentoEstagioPDF data={data} />
    case 'termo_recibo_transporte': return <ReciboPagamentoTransportePDF data={data} />
    case 'termo_recibo_cheque': return <ReciboChequePDF data={data} />
    case 'termo_indenizacao_pecuniaria': return <TermoIndenizacaoPecuniaria data={data} />
    case 'termo_quitacao_evento': return <TermoQuitacaoEventoPDF data={data} />
    case 'etiqueta_envio': return <EtiquetaEnvioPDF data={data} />
    case 'recibo_generico': return <ReciboGenerico data={data} />
    default: return null;
  }
};

// --- 2. COMPONENTE ISOLADO E MEMOIZADO (A MÁGICA DA PERFORMANCE) ---
const IsolatedPDFViewer = memo(({ type, data }: { type: string, data: any }) => {
  const doc = getPdfComponent(type, data);
  if (!doc) return <div className="text-red-500 p-4">Erro: Template não encontrado.</div>;

  return (
    <PDFViewer width="100%" height="100%" className="border-none" showToolbar={true}>
      {doc}
    </PDFViewer>
  );
}, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});

// --- 3. COMPONENTES DE UI ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
export const Input: React.FC<InputProps> = ({ label, ...props }) => (
  <div className="space-y-1.5 group">
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 group-focus-within:text-cyan-600 transition-colors">{label}</label>
    <input {...props} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all duration-200 text-slate-700 text-sm font-medium placeholder:text-slate-400 input-focus shadow-sm hover:border-slate-300" />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label: string; options: { value: string; label: string }[]; }
export const Select: React.FC<SelectProps> = ({ label, options, ...props }) => (
  <div className="space-y-1.5 group">
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 group-focus-within:text-cyan-600 transition-colors">{label}</label>
    <div className="relative">
      <select {...props} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all duration-200 text-slate-700 text-sm font-medium bg-white shadow-sm hover:border-slate-300 appearance-none cursor-pointer">
        <option value="">Selecione...</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><i className="fa-solid fa-chevron-down text-xs"></i></div>
    </div>
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label: string; }
export const TextArea: React.FC<TextAreaProps> = ({ label, ...props }) => (
  <div className="space-y-1.5 group">
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 group-focus-within:text-cyan-600 transition-colors">{label}</label>
    <textarea {...props} rows={3} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all duration-200 text-slate-700 text-sm font-medium placeholder:text-slate-400 shadow-sm hover:border-slate-300 resize-none" />
  </div>
);

// ============================================================================
// COMPONENTE: BUSCA INTELIGENTE DE DEMANDAS
// ============================================================================


interface SmartSearchInputProps {
  label: string;
  onSelectDemand: (categoria: string, subcategoria: string) => void;
}

// Mapeamento dos nomes bonitos das Categorias para aparecer no ecrã
const catLabels: Record<string, string> = {
  informacao: 'Informação',
  financeiro: 'Financeiro',
  reclamacao: 'Reclamação',
  eventos: 'Eventos',
  rastreamento: 'Rastreamento',
  segunda_via: '2ª Via Boleto',
  assistencia: 'Assistência 24h',
  cancelamento: 'Cancelamento'
};

// Hierarquia com 'value' (o que a planilha/state lê) e 'label' (o que o utilizador vê)
const demandHierarchy = [
  { cat: 'informacao', subs: [
    { value: 'contrato', label: 'Solicitação de contrato' },
    { value: 'cobertura', label: 'Cobertura contratada' },
    { value: 'contato', label: 'Dúvidas sobre número de contato da BR Clube' },
    { value: 'rateio', label: 'Dúvidas sobre rateio' }
  ]},
  { cat: 'financeiro', subs: [{ value: 'valor_errado', label: 'Contestação do valor do Boleto' }] },
  { cat: 'reclamacao', subs: [
    { value: 'demora', label: 'Demora no Atendimento' },
    { value: 'rateio', label: 'Rateio' },
    { value: 'evento', label: 'Evento' }
  ]},
  { cat: 'eventos', subs: [{ value: 'abertura', label: 'Abertura de Evento' }] },
  { cat: 'rastreamento', subs: [
    { value: 'login', label: 'Solicitação de Login' },
    { value: 'fora_do_ar', label: 'App fora do ar' }
  ]},
  { cat: 'segunda_via', subs: [{ value: 'geral', label: 'Geral/Outros' }] },
  { cat: 'assistencia', subs: [{ value: 'geral', label: 'Geral/Outros' }] },
  { cat: 'cancelamento', subs: [{ value: 'geral', label: 'Geral/Outros' }] },
];

export const SmartSearchInput: React.FC<SmartSearchInputProps> = ({ label, onSelectDemand }) => {
  const [demandSearch, setDemandSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const filteredDemands = demandSearch.length > 1 
    ? demandHierarchy.flatMap(d => {
        const catLabel = catLabels[d.cat];
        const matches = d.subs.filter(s => s.label.toLowerCase().includes(demandSearch.toLowerCase()));
        const catMatch = catLabel.toLowerCase().includes(demandSearch.toLowerCase());
        
        const results: { cat: string, catLabel: string, subValue: string | null, subLabel: string | null }[] = [];
        
        if (catMatch) results.push({ cat: d.cat, catLabel, subValue: null, subLabel: null });
        matches.forEach(m => results.push({ cat: d.cat, catLabel, subValue: m.value, subLabel: m.label }));
        
        return results;
      })
    : [];

  const handleSelect = (cat: string, catLabel: string, subValue: string | null, subLabel: string | null) => {
    // 1. Envia os 'values' corretos para preencher os selects
    onSelectDemand(cat, subValue || '');
    
    // 2. Mantém o texto visual bonito na caixa de pesquisa! Ex: "Rateio (Reclamação)"
    setDemandSearch(subLabel ? `${subLabel} (${catLabel})` : catLabel);
    
    setIsFocused(false);
  };

  return (
    <div className="space-y-1.5 group relative md:col-span-2 animate-in fade-in zoom-in duration-300">
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 group-focus-within:text-cyan-600 transition-colors">
        {label}
      </label>
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors"></i>
        <input 
          type="text"
          value={demandSearch}
          onChange={(e) => setDemandSearch(e.target.value)}
          onFocus={() => {
             setIsFocused(true);
             // Limpa ao clicar para permitir nova busca se já tivesse algo
             if (demandSearch.includes('(')) setDemandSearch(''); 
          }}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay para o clique registar
          placeholder="Digite a demanda para preencher automaticamente..."
          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all duration-200 text-slate-700 text-sm font-bold placeholder:font-medium placeholder:text-slate-400 shadow-sm"
        />
        
        {/* Caixa de Resultados Flutuante */}
        {isFocused && filteredDemands.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] max-h-56 overflow-y-auto custom-scrollbar overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultados Sugeridos</span>
            </div>
            {filteredDemands.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => handleSelect(item.cat, item.catLabel, item.subValue, item.subLabel)}
                className="px-4 py-3 hover:bg-cyan-50 cursor-pointer border-b last:border-none border-slate-100 flex flex-col group/item transition-colors"
              >
                <span className="font-bold text-slate-700 text-sm group-hover/item:text-cyan-700">{item.subLabel || item.catLabel}</span>
                <span className="text-[10px] font-black text-cyan-600 uppercase tracking-wider mt-0.5">{item.catLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 4. COMPONENTE REPEATER ---
interface RepeaterProps { field: any; value: any[]; onChange: (newValue: any[]) => void; }
export const RepeaterField: React.FC<RepeaterProps> = ({ field, value = [], onChange }) => {
  const handleAddItem = () => onChange([...value, {}]);
  const handleRemoveItem = (index: number) => onChange(value.filter((_, i) => i !== index));
  const handleSubFieldChange = (index: number, subId: string, subValue: string) => {
    const newVal = [...value];
    if (!newVal[index]) newVal[index] = {};
    newVal[index] = { ...newVal[index], [subId]: subValue };
    onChange(newVal);
  };

  return (
    <div className="space-y-3">
      {/* Cabeçalho com o Botão de Adicionar Superior */}
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{field.label}</label>
        <button type="button" onClick={handleAddItem} className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1">
          <i className="fa-solid fa-plus"></i><span>{field.addButtonLabel || 'Adicionar'}</span>
        </button>
      </div>
      
      {/* Lista de Itens */}
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 animate-in slide-in-from-left-2 duration-300">
            <button type="button" onClick={() => handleRemoveItem(index)} className="absolute right-2 top-2 text-slate-300 hover:text-red-500 transition-colors p-1" title="Remover item">
              <i className="fa-solid fa-trash-can"></i>
            </button>
            <div className="grid gap-3">
              <div className="mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item #{index + 1}</div>
              {field.subFields?.map((subField: any) => {
                const commonProps = { key: subField.id, label: subField.label, placeholder: subField.placeholder, value: item[subField.id] || '', onChange: (e: any) => handleSubFieldChange(index, subField.id, e.target.value) };
                if (subField.type === 'date') return <Input type="date" {...commonProps} />;
                if (subField.type === 'number') return <Input type="number" {...commonProps} />;
                return <Input type="text" {...commonProps} />;
              })}
            </div>
          </div>
        ))}

        {/* Mensagem de Vazio */}
        {value.length === 0 && (
          <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs italic">
            Nenhum item adicionado ainda.
          </div>
        )}

        {/* 👇 NOVO BOTÃO INFERIOR (Aparece se houver 1 ou mais itens) 👇 */}
        {value.length > 0 && (
          <button 
            type="button" 
            onClick={handleAddItem} 
            className="w-full mt-2 py-3.5 border-2 border-dashed border-cyan-200 text-cyan-600 rounded-xl hover:bg-cyan-50 hover:border-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <i className="fa-solid fa-plus"></i>
            Adicionar Mais Um Item
          </button>
        )}
      </div>
    </div>
  );
};

// --- 5. COMPONENTE DE BUSCA DE PRESTADORES (WIDGET LATERAL INDEPENDENTE) ---
export interface PrestadorResultado {
  origem: 'interno' | 'externo';
  nome: string;
  telefone?: string;
  endereco: string;
  rating?: string | number;
  place_id?: string;
  faturado?: boolean;
  
  // --- NOVOS CAMPOS QUE O BACKEND AGORA MANDA ---
  lat?: number;
  lng?: number;
  origem_lat?: number;
  origem_lng?: number;
  distancia?: number;
  horario?: string;
  obs?: string;
  contato?: string;
  tipo?: string;
  foto?: string;        // Para foto do Google Places
  aberto_agora?: boolean; // Para Google Places
  total_reviews?: number; // Para Google Places
  site?: string;        // Para Google Places
}

// 1. Atualize a interface (note que removemos customerAddress e mudamos onSearch)
interface ProviderSearchProps {
  onSearch: (address: string, serviceType: string) => void; // <--- Agora recebe TAMBÉM o tipo de serviço
  isSearching: boolean;
  results: PrestadorResultado[] | null;
  onSelect: (prestador: PrestadorResultado) => void;
  radius: number;
  onRadiusChange: (v: number) => void;
  apiKey: string;
  scriptUrl: string;
}

// 2. O Novo Componente Widget
export const ProviderSearch: React.FC<ProviderSearchProps> = ({ 
  onSearch, isSearching, results, onSelect, radius, onRadiusChange, apiKey, scriptUrl 
}) => {
  const [viewingPlace, setViewingPlace] = useState<PrestadorResultado | null>(null);
  const [localAddress, setLocalAddress] = useState('');
  const [serviceType, setServiceType] = useState('Guincho'); // Estado para o Seletor
  const [selectedDetails, setSelectedDetails] = useState<any>(null); 

  const handleSearchClick = () => {
     if (localAddress) onSearch(localAddress, serviceType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && localAddress) handleSearchClick();
  };

  return (
    <>
      {viewingPlace && (
        <MapModal
          provider={viewingPlace} // <--- Passamos TUDO (Interno ou Externo)
          customerAddress={localAddress}
          apiKey={apiKey}
          scriptUrl={scriptUrl}
          onClose={() => setViewingPlace(null)}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6 animate-in fade-in slide-in-from-right-4">
        {/* Cabeçalho */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-search-location"></i>
           </div>
           <div>
             <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wide">Buscar Prestador</h4>
             <p className="text-[10px] text-slate-400 font-bold">Localizar parceiros e serviços</p>
           </div>
        </div>

        <div className="p-4 space-y-3">
            
            {/* 1. SELETOR DE SERVIÇO (NOVO) */}
            <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Tipo de Serviço</label>
               <div className="relative">
                  <select 
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:border-cyan-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="Guincho">Guincho / Reboque</option>
                    <option value="Troca de Pneu">Troca de Pneu (Borracheiro)</option>
                    <option value="Carga de Bateria">Carga de Bateria (Elétrica)</option>
                    <option value="Chaveiro">Chaveiro Automotivo</option>
                    <option value="Mecanica">Mecânica Geral</option>
                  </select>
                  <i className="fa-solid fa-wrench absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
               </div>
            </div>

            {/* 2. Input de Endereço */}
            <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Local de Referência</label>
               <div className="relative group">
                  <input 
                    type="text" 
                    value={localAddress}
                    onChange={(e) => setLocalAddress(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Cidade ou Rua..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all"
                  />
                  <i className="fa-solid fa-location-dot absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors"></i>
               </div>
            </div>

            {/* 3. Controles */}
            <div className="flex gap-2 items-end">
               <div className="w-20">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Raio (KM)</label>
                  <input 
                    type="number" min="1" max="500" value={radius}
                    onChange={(e) => onRadiusChange(Number(e.target.value))}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700 focus:border-cyan-500 outline-none bg-slate-50"
                  />
               </div>
               <button 
                 type="button" 
                 onClick={handleSearchClick} 
                 disabled={isSearching || !localAddress}
                 className="flex-1 h-[34px] bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isSearching ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
                 {isSearching ? '...' : 'Buscar'}
               </button>
            </div>

            {/* Resultados */}
            {results && (
              <div className="border-t border-slate-100 pt-3 mt-1">
                 <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                    {results.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 italic">Nenhum prestador de "{serviceType}" encontrado.</p>
                      </div>
                    ) : (
                      results.map((p, idx) => (
                        <div key={idx} className={`p-2.5 rounded-xl border transition-all group ${p.origem === 'interno' ? 'bg-green-50/30 border-green-200 hover:border-green-400' : 'bg-white border-slate-100 hover:border-cyan-200'}`}>
                          
                          <div className="flex justify-between items-start mb-1">
                             <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                   <span className="font-bold text-xs text-slate-700 truncate block max-w-[140px]" title={p.nome}>{p.nome}</span>
                                   
                                   {/* BADGE DE PARCEIRO */}
                                   {p.origem === 'interno' && <i className="fa-solid fa-certificate text-[10px] text-green-600" title="Parceiro Cadastrado"></i>}
                                   
                                   {/* BADGE DE FATURADO (NOVO) */}
                                   {p.faturado && (
                                     <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded font-bold border border-purple-200 flex items-center gap-1">
                                       <i className="fa-solid fa-file-invoice-dollar"></i> FATURADO
                                     </span>
                                   )}
                                </div>
                                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.endereco}</div>
                             </div>
                             
                             {/* RATING */}
                             {p.rating && p.rating !== '-' && (
                                <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-600 border border-amber-100 shrink-0">
                                   {p.rating} <i className="fa-solid fa-star text-[8px]"></i>
                                </div>
                             )}
                          </div>

                          <div className="flex gap-2 mt-2 pt-2 border-t border-black/5 opacity-80 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => setViewingPlace(p)} className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:text-cyan-600 hover:border-cyan-300 transition-colors">
                                Detalhes
                             </button>
                             <button onClick={() => onSelect(p)} className="flex-1 py-1.5 rounded-lg bg-cyan-50 border border-cyan-100 text-[10px] font-bold text-cyan-700 hover:bg-cyan-100 transition-colors">
                                Selecionar
                             </button>
                          </div>
                        </div>
                      ))
                    )}
                 </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
};




// --- 6. FORM MIRROR OTIMIZADO ---
interface FormMirrorProps {
  data: Record<string, string>;
  title: string;
  generateMessage: () => string;
  isTerm?: boolean;
  isBlank?: boolean;
  pdfType?: string;
}

const generateFileName = (pdfType: string, data: any) => {
  // 1. Iniciais do Termo mapeadas pelo seu constants.ts
  const termInitials: Record<string, string> = {
    termo_cancelamento: 'TCP',
    etiqueta_envio: 'ETQ',
    termo_acordo: 'TAC',
    termo_quitacao_evento: 'TQE',
    termo_pecas: 'TPE',
    termo_acordo_amparo: 'TAA',
    termo_indenizacao_pecuniaria: 'TIP',
    termo_recibo_prestador: 'RPS',
    termo_recibo_estagio: 'RPE',
    termo_recibo_transporte: 'RPT',
    termo_recibo_cheque: 'TEC',
    termo_recebimento_rastreador: 'TRR'
  };
  const prefix = termInitials[pdfType || ''] || 'DOC';

  // 2. Iniciais da Pessoa (Procura em todas as variáveis que você usa como "Nome" nos formulários)
  const nome = 
    data.associado || 
    data.nome_devedor || 
    data.destinatario || 
    data.terceiro || 
    data.terceiro_nome || 
    data.responsavel || 
    data.estagiario || 
    data.prestador || 
    data.instalador || 
    data.nome || 
    'NA';

  const initials = typeof nome === 'string' 
    ? nome.trim().split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 3)
    : 'NA';

  // 3. Placa do Veículo (se não tiver placa no formulário, omite esse trecho)
  let placaStr = '';
  if (data.placa || data.veiculo_placa) {
    const placaRaw = data.placa || data.veiculo_placa;
    placaStr = `-${placaRaw.replace('-', '').toUpperCase()}`;
  }

  // 4. Data formatada (YYDDMM)
  const hoje = new Date();
  const yy = hoje.getFullYear().toString().slice(-2);
  const dd = String(hoje.getDate()).padStart(2, '0');
  const mm = String(hoje.getMonth() + 1).padStart(2, '0');
  const dataFormatada = `${yy}${dd}${mm}`;

  // Resultado final: TAC-JD-ABC1234-262302.pdf ou RPS-MS-262302.pdf (se não tiver placa)
  return `${prefix}-${initials}${placaStr}-${dataFormatada}.pdf`;
};


export const FormMirror: React.FC<FormMirrorProps> = ({ data, title, generateMessage, isTerm, isBlank, pdfType }) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(data);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(previewData)) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [data, previewData]);

  const handleUpdatePreview = () => {
    setPreviewData(data);
    setIsDirty(false);
  };

  const fullMessage = generateMessage();
  const hasData = data && Object.values(data).some(v => v);
  const isHtmlContent = (c: string) => /<[^>]+>/.test(c);

  const renderPreview = () => {
    if (isTerm && pdfType) {
      return (
        <div className="relative h-[600px] w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
          {isDirty && (
            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all animate-in fade-in duration-200">
              <p className="text-slate-800 font-bold mb-3 text-sm shadow-sm">Há alterações não visualizadas</p>
              <button
                onClick={handleUpdatePreview}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transform hover:scale-105 transition-all flex items-center gap-2 animate-bounce-short"
              >
                <i className="fa-solid fa-rotate"></i> Atualizar PDF Agora
              </button>
            </div>
          )}
          <IsolatedPDFViewer type={pdfType} data={previewData} />
        </div>
      );
    }

    return (
      <div className="max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
        {hasData ? (
          <div className={`bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm text-slate-700 leading-relaxed font-medium break-words relative animate-in fade-in duration-300`}>
            {isHtmlContent(fullMessage) ? (
              <div dangerouslySetInnerHTML={{ __html: fullMessage }} />
            ) : (
              fullMessage.split('\n').map((line: string, i: number) => <div key={i}>{line}</div>)
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-300 italic text-xs">Os dados preenchidos aparecerão aqui...</div>
        )}
      </div>
    );
  };

  const handleDownloadNewPdf = async () => {
    if (!hasData) return;
    const dataToUse = data;
    setIsGenerating(true);
    try {
      const MyDocComponent = getPdfComponent(pdfType, dataToUse);
      if (!MyDocComponent) return;
      
      const blob = await pdf(MyDocComponent).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 👇 É AQUI QUE DEFINIMOS O NOVO PADRÃO DE NOME 👇
      link.download = generateFileName(pdfType || '', dataToUse);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Houve um erro ao gerar o documento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const currentMessage = generateMessage();
    navigator.clipboard.writeText(currentMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Falha ao copiar:', err);
      alert("Selecione o texto e copie manualmente.");
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl sticky top-8 overflow-hidden">
      <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600">
              {isTerm ? 'Visualização' : 'Preview da Mensagem'}
            </h3>
            {isTerm && isDirty && (
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Alterações pendentes"></span>
            )}
          </div>
          <i className={`fa-solid ${isTerm ? 'fa-file-pdf text-red-500' : 'fa-brands fa-whatsapp text-green-500'} text-lg`}></i>
        </div>
        <div className="space-y-4">
          {renderPreview()}
        </div>
        <div className="mt-8 space-y-3">
          
          {/* 1. O BOTÃO PRINCIPAL (Baixar PDF ou Copiar Mensagem) */}
          {isTerm && pdfType ? (
            <button
              disabled={!hasData || isGenerating}
              onClick={handleDownloadNewPdf}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <> <i className="fa-solid fa-circle-notch fa-spin"></i> <span>Gerando Arquivo Final...</span> </>
              ) : (
                <> <i className="fa-solid fa-file-export"></i> <span>Baixar PDF Assinado</span> </>
              )}
            </button>
          ) : (
            <button
              disabled={!hasData}
              onClick={handleCopy}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${copied ? 'bg-green-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
            >
              {copied ? (
                <> <i className="fa-solid fa-check"></i> <span>Copiado!</span> </>
              ) : (
                <> <i className="fa-regular fa-copy"></i> <span>Copiar Mensagem</span> </>
              )}
            </button>
          )}

          {/* 2. O BOTÃO MULTI360 (Aparece sempre, para todos os submodulos) */}
          <a
            href="https://painel.multi360.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <i className="fa-brands fa-whatsapp text-lg"></i> 
            <span>Enviar para o Associado</span>
          </a>

        </div>
      </div>
    </div>
  );
};

// --- 7. EXPORTS FINAIS ---
export const FormCard = ({ title, icon, children, workspaceUrl }: { title: string, icon?: string, children: React.ReactNode, workspaceUrl?: string }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 p-4 px-6 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          {icon && <i className={`fa-solid ${icon} text-slate-400`}></i>}
          {title}
        </h3>
        
        {/* 👇 NOVO BOTÃO DE WORKSPACE AO LADO DO TÍTULO 👇 */}
        {workspaceUrl && (
          <a 
            href={workspaceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border border-blue-200 shadow-sm"
            title="Abrir Grupo do Workspace"
          >
            <i className="fa-solid fa-users"></i> Workspace
          </a>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export const SuccessMessage: React.FC<{ message: string; onReset: () => void }> = ({ message, onReset }) => (
  <div className="bg-white border border-slate-100 shadow-2xl rounded-3xl p-10 text-center animate-in fade-in zoom-in duration-500 max-w-lg mx-auto">
    <div className="w-20 h-20 bg-green-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-green-100 mb-6 rotate-3">
      <i className="fa-solid fa-check text-4xl"></i>
    </div>
    <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Sucesso!</h3>
    <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">{message}</p>
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button onClick={onReset} className="btn-primary text-white px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2">
        <i className="fa-solid fa-plus"></i><span>Nova Entrada</span>
      </button>
      <button onClick={() => window.location.reload()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-3 rounded-xl font-bold text-sm transition-all">Painel</button>
    </div>
  </div>
);



interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: any[]; // Lista de protocolos em aberto
  onUpload: (protocolo: string, files: File[]) => Promise<void>;
  isUploading: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, tickets, onUpload, isUploading }) => {
  const [selectedProtocol, setSelectedProtocol] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // Array de arquivos

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Converte FileList para Array normal
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = () => {
    if (!selectedProtocol || selectedFiles.length === 0) {
      alert("Selecione um protocolo e pelo menos um arquivo.");
      return;
    }
    onUpload(selectedProtocol, selectedFiles);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-brands fa-google-drive text-blue-600"></i>
            Anexar Arquivos
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="space-y-4">
          {/* Seleção de Protocolo */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Protocolo</label>
            <select 
              value={selectedProtocol} 
              onChange={(e) => setSelectedProtocol(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">Selecione o atendimento...</option>
              {tickets.map(t => (
                <option key={t.protocolo} value={t.protocolo}>
                  {t.protocolo} - {t.associado || 'Sem Nome'} ({t.placa})
                </option>
              ))}
            </select>
          </div>

          {/* Seleção de Arquivos Múltiplos */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Arquivos ({selectedFiles.length})
            </label>
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors group cursor-pointer overflow-hidden">
              <input 
                type="file" 
                multiple // <--- A MÁGICA ESTÁ AQUI
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
              <div className="space-y-2 pointer-events-none">
                <i className={`fa-solid ${selectedFiles.length > 0 ? 'fa-folder-open text-emerald-500' : 'fa-cloud-arrow-up text-slate-400'} text-3xl mb-2 group-hover:scale-110 transition-transform`}></i>
                
                {selectedFiles.length > 0 ? (
                    <div className="text-left bg-white/80 p-2 rounded-lg max-h-32 overflow-y-auto text-xs text-slate-600 border border-slate-100">
                        {selectedFiles.map((f, idx) => (
                            <div key={idx} className="truncate border-b last:border-0 border-slate-100 py-1">
                                <i className="fa-solid fa-file mr-2 text-slate-400"></i>
                                {f.name}
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-slate-600 font-medium">Clique ou arraste arquivos aqui</p>
                        <p className="text-xs text-slate-400">Seleção múltipla permitida</p>
                    </>
                )}
              </div>
            </div>
          </div>

          {/* Botão de Envio */}
          <button 
            onClick={handleSubmit}
            disabled={isUploading || !selectedProtocol || selectedFiles.length === 0}
            className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isUploading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Enviando {selectedFiles.length} arquivos...
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane"></i> Enviar Tudo
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

