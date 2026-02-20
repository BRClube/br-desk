
export type DepartmentId = 'home' | 'assistance' | 'registration' | 'tracking' | 'events' | 'cancellations' | 'billing' | 'commercial' | 'legal' | 'financing' | 'assistencia';

export interface TemplateField {
  id: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'date' | 'number' | 'select' | 'time' | 'datetime-local' | 'email' | 'tel' | 'textarea' | 'repeater';
  options?: { value: string; label: string }[];
  subFields?: TemplateField[]; // Usado se o tipo for 'repeater'
  addButtonLabel?: string; // Usado se o tipo for 'repeater'
  required?: boolean;
  showIf?: {
    field: string;
    value: string;
  }
}

export interface Submodule {
  id: string;
  name: string;
  parentId: DepartmentId;
  fields?: TemplateField[];
  messageTemplate?: string | ((data: any) => string); 
  pdfType?: 'termo_acordo' | 'cobranca' | 'recibo' | 'termo_cancelamento' | 'entrega_veiculo' | 'termo_acordo_amparo' | 'termo_recebimento_rastreador' | 'termo_pecas' | 'termo_recibo_prestador' | 'termo_recibo_estagio' | 'termo_recibo_transporte' | 'termo_recibo_cheque' | 'termo_indenizacao_pecuniaria' | 'termo_quitacao_evento' | 'etiqueta_envio';
  isTerm?: boolean; // Define se este módulo gera um documento formal PDF
  isBlank?: boolean; // Define se este módulo gera um documento em branco sem template
}

export interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  fields: TemplateField[];
  isTerm?: boolean;
}

export interface Department {
  id: DepartmentId;
  name: string;
  icon: string;
  description: string;
  colorClass: string;
  submodules: Submodule[];
  groups?: { title: string; items: Submodule[] }[];
  workspaceUrl?: string;
}

export interface UsefulLink {
  id: string;
  label: string;
  url: string;
  icon: string;
}

export interface FormSubmissionStatus {
  submitting: boolean;
  success: boolean | null;
  error: string | null;
}
