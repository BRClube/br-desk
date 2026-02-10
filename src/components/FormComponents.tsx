import React, { useState, useEffect, memo } from 'react';
import { PDFDownloadLink, pdf, PDFViewer } from '@react-pdf/renderer';
import { TermoAcordoPDF, CobrancaPDF, TermoCancelamentoPDF, EntregaVeiculoPDF, TermoAcordoAmparoPDF, TermoRecebimentoRastreadorPDF, RecebimentoPecasPDF, ReciboPrestadorPDF, ReciboPagamentoEstagioPDF, ReciboPagamentoTransportePDF, ReciboChequePDF, TermoIndenizacaoPecuniaria, TermoQuitacaoEventoPDF } from '../PDFTemplates';



interface MapModalProps {
  placeId?: string;
  providerAddress: string;
  customerAddress: string;
  apiKey: string;
  scriptUrl: string; // <--- PRECISAMOS DA URL DO SCRIPT AGORA
  onClose: () => void;
}

const MapModal: React.FC<MapModalProps> = ({ placeId, providerAddress, customerAddress, apiKey, scriptUrl, onClose }) => {
  const [mode, setMode] = useState<'details' | 'directions'>('details');
  const [info, setInfo] = useState<any>(null); // Estado para guardar os detalhes (telefone, etc)
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Efeito para buscar os detalhes assim que o modal abre (se tiver ID)
  useEffect(() => {
    if (placeId && mode === 'details') {
      setLoadingInfo(true);
      fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'buscar_detalhes_place', place_id: placeId })
      })
        .then(r => r.json())
        .then(data => {
          if (data.status === 'sucesso') setInfo(data.detalhes);
        })
        .catch(err => console.error("Erro detalhes", err))
        .finally(() => setLoadingInfo(false));
    }
  }, [placeId, mode]);

  // URLs do Maps (Iguais ao anterior)
  const detailsQuery = placeId ? `place_id:${placeId}` : providerAddress;
  const srcDetails = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(detailsQuery)}`;
  const originQuery = placeId ? `place_id:${placeId}` : providerAddress;
  const srcDirections = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(originQuery)}&destination=${encodeURIComponent(customerAddress)}&mode=driving`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95">

        {/* COLUNA DA ESQUERDA: INFORMAÇÕES RICAS (Só aparece no modo Detalhes) */}
        {mode === 'details' && (
          <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-black text-slate-800 leading-tight mb-2">{info?.nome || "Carregando..."}</h2>
              <p className="text-sm text-slate-500 mb-4">{info?.endereco || providerAddress}</p>

              {loadingInfo ? (
                <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm animate-pulse">
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Buscando telefone e fotos...
                </div>
              ) : info ? (
                <div className="space-y-4">
                  {/* FOTO */}
                  {info.foto && (
                    <div className="w-full h-48 rounded-xl overflow-hidden shadow-sm bg-slate-200">
                      <img src={info.foto} alt="Local" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* TELEFONE (GRANDE DESTAQUE) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Telefone / Contato</label>
                    {info.telefone !== "Não informado" ? (
                      <a href={`tel:${info.telefone}`} className="text-2xl font-black text-green-600 hover:underline flex items-center gap-2">
                        <i className="fa-brands fa-whatsapp"></i> {info.telefone}
                      </a>
                    ) : (
                      <span className="text-slate-400 font-medium">Não disponível</span>
                    )}
                  </div>

                  {/* STATUS E AVALIAÇÃO */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Situação</label>
                      {info.aberto_agora === true && <span className="text-green-600 font-bold text-sm">✅ Aberto Agora</span>}
                      {info.aberto_agora === false && <span className="text-red-500 font-bold text-sm">❌ Fechado</span>}
                      {info.aberto_agora === null && <span className="text-slate-500 text-sm">-</span>}
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Avaliação</label>
                      <div className="text-amber-500 font-black text-sm flex items-center gap-1">
                        <span className="text-lg">{info.rating || "-"}</span>
                        <i className="fa-solid fa-star text-xs"></i>
                        <span className="text-slate-400 text-[10px] font-normal">({info.total_reviews || 0})</span>
                      </div>
                    </div>
                  </div>

                  {/* LINK EXTERNO */}
                  {info.site && (
                    <a href={info.site} target="_blank" rel="noreferrer" className="block w-full text-center py-3 rounded-xl bg-cyan-50 text-cyan-700 font-bold text-xs hover:bg-cyan-100 transition-colors">
                      Abrir no Google Maps App <i className="fa-solid fa-arrow-up-right-from-square ml-1"></i>
                    </a>
                  )}
                </div>
              ) : (
                // Fallback se não tiver place_id (resultado interno)
                <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl text-xs">
                  Informações detalhadas indisponíveis para este parceiro interno. Verifique a planilha.
                </div>
              )}
            </div>
          </div>
        )}

        {/* COLUNA DA DIREITA: MAPA */}
        <div className="flex-1 flex flex-col bg-slate-100 h-full relative">

          {/* Barra de Controle Superior */}
          <div className="bg-white p-3 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('details')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'details' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <i className="fa-solid fa-store mr-2"></i> Ficha
              </button>
              <button
                onClick={() => setMode('directions')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'directions' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <i className="fa-solid fa-route mr-2"></i> Rota até Cliente
              </button>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* IFRAME */}
          <iframe
            className="w-full h-full flex-1"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={mode === 'details' ? srcDetails : srcDirections}
          ></iframe>
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
      <select {...props} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all duration-200 text-slate-700 text-sm font-medium bg-white shadow-sm hover:border-slate-300 appearance-none cursor-pointer">
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
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{field.label}</label>
        <button type="button" onClick={handleAddItem} className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1">
          <i className="fa-solid fa-plus"></i><span>{field.addButtonLabel || 'Adicionar'}</span>
        </button>
      </div>
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
        {value.length === 0 && <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs italic">Nenhum item adicionado ainda.</div>}
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
  faturado?: boolean; // <--- NOVO
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
          apiKey={apiKey}
          placeId={viewingPlace.place_id}
          providerAddress={viewingPlace.endereco}
          customerAddress={localAddress}
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
      link.download = `${title.replace(/\s+/g, '_')}_${data.associado || 'doc'}.pdf`;
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
        </div>
      </div>
    </div>
  );
};

// --- 7. EXPORTS FINAIS ---
export const FormCard: React.FC<{ title: string; children: React.ReactNode; icon: string }> = ({ title, children, icon }) => (
  <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 h-full">
    <div className="bg-slate-50/50 px-6 py-5 border-b border-slate-100 flex items-center space-x-4">
      <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center text-white shadow-md shadow-cyan-100">
        <i className={`fa-solid ${icon} text-lg`}></i>
      </div>
      <div>
        <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{title}</h2>
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Entrada de Dados</p>
      </div>
    </div>
    <div className="p-6 lg:p-8">{children}</div>
  </div>
);

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

// --- ADICIONE ISTO AO FINAL DO ARQUIVO src/components/FormComponents.tsx ---

export interface Ticket {
  protocolo: string;
  associado: string;
  placa: string;
  status: string;
  atendente?: string;
  data?: string;
}

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (protocolo: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  currentAttendant: string;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, onSelectTicket, isLoading, onRefresh, currentAttendant }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/40 overflow-hidden h-full flex flex-col animate-in slide-in-from-left-4 duration-500">
      
      {/* Cabeçalho */}
      <div className="bg-slate-50/80 px-4 py-4 border-b border-slate-100 flex justify-between items-center backdrop-blur-sm">
        <div>
          <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-list-check text-cyan-600"></i> Atendimentos
          </h4>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-[120px]" title={currentAttendant}>
            Logado: {currentAttendant.split(' ')[0]}
          </p>
        </div>
        <button 
          onClick={onRefresh} 
          disabled={isLoading}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-cyan-600 hover:border-cyan-300 hover:shadow-sm transition-all flex items-center justify-center"
          title="Atualizar Lista"
        >
          <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`}></i>
        </button>
      </div>

      {/* Lista com Scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 bg-slate-50/30">
        {tickets.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-60">
            <i className="fa-regular fa-folder-open text-3xl"></i>
            <span className="text-xs font-medium italic">Nenhum chamado pendente.</span>
          </div>
        ) : (
          tickets.map((t) => (
            <div 
              key={t.protocolo}
              onClick={() => onSelectTicket(t.protocolo)}
              className="group relative bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-cyan-300 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                 <i className="fa-solid fa-pen-to-square text-cyan-500"></i>
              </div>

              <div className="flex justify-between items-start mb-2 pr-4">
                <span className="font-black text-xs text-slate-700 truncate block max-w-[140px]" title={t.associado}>{t.associado}</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    t.status === 'ABERTO' ? 'bg-green-50 text-green-600 border-green-100' : 
                    t.status === 'EM ANDAMENTO' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    t.status === 'AGUARDANDO' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {t.status}
                 </span>
                 <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1 rounded border border-slate-100">
                    {t.protocolo}
                 </span>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium border-t border-slate-50 pt-2 mt-1">
                 <span className="flex items-center gap-1"><i className="fa-solid fa-car"></i> {t.placa}</span>
                 {t.data && <span className="flex items-center gap-1"><i className="fa-regular fa-clock"></i> {t.data.split('T')[0]}</span>}
              </div>
            </div>
          ))
        )}
        
        {isLoading && tickets.length === 0 && (
           <div className="text-center py-10 text-slate-400 text-xs animate-pulse">
              Carregando chamados...
           </div>
        )}
      </div>
    </div>
  );
};