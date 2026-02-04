import React, { useState, useEffect, memo } from 'react';
import { PDFDownloadLink, pdf, PDFViewer } from '@react-pdf/renderer';
import { TermoAcordoPDF, CobrancaPDF, TermoCancelamentoPDF, EntregaVeiculoPDF, TermoAcordoAmparoPDF, TermoRecebimentoRastreadorPDF, RecebimentoPecasPDF, ReciboPrestadorPDF, ReciboPagamentoEstagioPDF, ReciboPagamentoTransportePDF, ReciboChequePDF, TermoIndenizacaoPecuniaria, TermoQuitacaoEventoPDF } from '../PDFTemplates';

// --- 1. FUNÇÃO AUXILIAR PARA ESCOLHER O TEMPLATE ---
const getPdfComponent = (type: string | undefined, data: any) => {
  switch (type) {
    case 'termo_acordo': return <TermoAcordoPDF data={data} />;
    case 'cobranca': return <CobrancaPDF data={data} />;
    case 'termo_cancelamento' : return <TermoCancelamentoPDF data={data} />;
    case 'entrega_veiculo' : return <EntregaVeiculoPDF data = {data}/>;
    case 'termo_acordo_amparo' : return <TermoAcordoAmparoPDF data = {data}/>;
    case 'termo_recebimento_rastreador' : return <TermoRecebimentoRastreadorPDF data = {data}/>
    case 'termo_pecas' : return <RecebimentoPecasPDF data = {data}/>
    case 'termo_recibo_prestador' : return <ReciboPrestadorPDF data = {data}/>
    case 'termo_recibo_estagio' : return <ReciboPagamentoEstagioPDF data = {data} />
    case 'termo_recibo_transporte' : return <ReciboPagamentoTransportePDF data = {data} />
    case 'termo_recibo_cheque' : return <ReciboChequePDF data = {data} />
    case 'termo_indenizacao_pecuniaria' : return <TermoIndenizacaoPecuniaria data = {data} />
    case 'termo_quitacao_evento' : return <TermoQuitacaoEventoPDF data = {data} />
    default: return null;
  }
};

// --- 2. COMPONENTE ISOLADO E MEMOIZADO (A MÁGICA DA PERFORMANCE) ---
// Este componente SÓ atualiza quando a prop 'data' muda de referência.
// Como passamos 'previewData' (que só muda no clique), ele ignora a digitação.
const IsolatedPDFViewer = memo(({ type, data }: { type: string, data: any }) => {
  const doc = getPdfComponent(type, data);
  if (!doc) return <div className="text-red-500 p-4">Erro: Template não encontrado.</div>;

  return (
    <PDFViewer width="100%" height="100%" className="border-none" showToolbar={true}>
      {doc}
    </PDFViewer>
  );
}, (prevProps, nextProps) => {
  // Função de comparação personalizada:
  // Retorna TRUE se os dados forem iguais (evita renderização)
  // Retorna FALSE se os dados mudaram (permite renderização)
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

// --- 5. FORM MIRROR OTIMIZADO ---
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
  
  // ESTADOS PARA OTIMIZAÇÃO (Snapshot)
  const [previewData, setPreviewData] = useState(data);
  const [isDirty, setIsDirty] = useState(false);

  // Detecta que houve digitação, mas NÃO atualiza o previewData
  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(previewData)) {
      setIsDirty(true);
    } else {
      setIsDirty(false); // Se voltou ao estado original, remove o aviso
    }
  }, [data, previewData]);

  // Só atualiza o PDF quando clicado
  const handleUpdatePreview = () => {
    setPreviewData(data); // <--- AQUI A MÁGICA: Só agora o IsolatedPDFViewer vai receber dados novos
    setIsDirty(false);
  };

  const fullMessage = generateMessage();
  const hasData = data && Object.values(data).some(v => v);
  const isHtmlContent = (c: string) => /<[^>]+>/.test(c);

  const renderPreview = () => {
    // CASO A: PDF (Usando o componente isolado)
    if (isTerm && pdfType) {
      return (
        <div className="relative h-[600px] w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
          
          {/* Overlay de Aviso */}
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

          {/* Componente Blindado contra Re-renders desnecessários */}
          <IsolatedPDFViewer type={pdfType} data={previewData} />
        </div>
      );
    }

    // CASO B: WhatsApp (Texto/HTML) - Renderização direta pois é leve
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
    
    // Sempre usa os dados mais recentes (data) para o download, não o previewData
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

// --- 6. EXPORTS FINAIS ---
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