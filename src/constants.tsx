import { Department, Template, DepartmentId, UsefulLink } from '../types';
import { formatDateTime } from './utils/Formatters';
// --- HELPER PARA FORMATAR DATAS (Adicionado) ---
function formatarData(valor: any): string {
  if (!valor) return '';
  if (valor instanceof Date) return valor.toLocaleDateString('pt-BR');
  if (typeof valor === 'string' && valor.includes('-')) {
     const [ano, mes, dia] = valor.split('-');
     return `${dia}/${mes}/${ano}`;
  }
  return String(valor);
}

// URLs Fixas (Baseado no seu projeto)
const LOGO_URL = "/images/logo.png";
const ASSINATURA_URL = "/images/assinatura.png"; 

export function isHtmlTemplate(template: string): boolean {
  return /<[^>]+>/.test(template);
}

export function processMessageTemplate(
  template: string | ((data: any) => string), 
  data: Record<string, any>,
  isPDF: boolean = false
): string {
  // SE O TEMPLATE FOR UMA FUNÇÃO, EXECUTA ELA PRIMEIRO
  let message = typeof template === 'function' ? template(data) : template;
  
  // Se ainda tiver placeholders estilo {{chave}}, substitui (para templates string simples)
  if (typeof template === 'string') {
    Object.entries(data).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
  }
  
  // Lógica condicional para boleto (apenas para templates não-HTML e boleto)
  if (data['forma-pagamento'] === 'boleto' && !isHtmlTemplate(message)) {
    message += '\n\n📌 *Importante:* Não perca o prazo de vencimento do boleto!';
  }
  
  return message;
}

export function processPDFTemplate(template: string | ((data: any) => string), data: Record<string, any>): string {
  // processMessageTemplate agora lida com funções também
  let processed = processMessageTemplate(template, data, true);
  
  if (isHtmlTemplate(processed)) {
    return processed;
  }
  
  return `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap; word-wrap: break-word;">${processed}</pre>`;
}

export const USEFUL_LINKS: UsefulLink[] = [
  { id: 'portal', label: 'portal', url: 'https://portal.sivisweb.com.br/loja/012/dashboard', icon: 'fa-desktop' },
  { id: 'workspace', label: 'Workspace', url: 'https://mail.google.com/', icon: 'fa-map-location-dot' },
  { id: 'multi', label: 'Multi360', url: 'https://painel.multi360.com.br/', icon: 'fa-users-gear' },
  { id: 'sivis-brclube', label: 'SIVIS BR Clube', url: 'https://sivisweb.com.br/login.php?ex=1&emp=012', icon: 'fa-file-invoice-dollar' },
  { id: 'sivis-left', label: 'SIVIS Left', url: 'https://sivisweb.com.br/login.php?ex=1&emp=013', icon: 'fa-file-pdf' }
];

export const DEPARTMENTS: Department[] = [
  { 
    id: 'assistance', 
    name: 'Assistência 24H', 
    icon: 'fa-screwdriver-wrench', 
    description: 'Gestão de socorro e suporte emergencial',
    colorClass: 'bg-red-600',
    submodules: [
      { 
        id: 'assistance_request', 
        name: 'Acionamento de Assistência 24H', 
        parentId: 'assistance',
        fields: [
            // ... (Seus campos de assistência mantidos iguais) ...
            { id: 'protocolo', label: 'Protocolo' },
            { id: 'data-hora', label: 'Data e Hora', type: 'datetime-local' },
            { id: 'placa', label: 'Placa' },
            { id: 'modelo', label: 'Modelo' },
            { id: 'cor', label: 'Cor' },
            { id: 'solicitante', label: 'Solicitante' },
            { id: 'telefone', label: 'Telefone', type: 'tel', placeholder: '(00) 00000-0000' },
            { id: 'fator-gerador', label: 'Fator Gerador', type: 'select', options:[
              {value: 'pane-eletrica', label: 'Pane Elétrica' },
              {value: 'pane-mecanica', label: 'Pane Mecânica' },
              {value: 'pane-seca', label: 'Pane Seca' },
              {value: 'chave', label: 'Chave' },
              {value: 'pneu', label: 'Pneu furado' },
              {value: 'colisao', label: 'Colisão' }
            ] },
            { id: 'obs-gerador', label: 'Observações do Fator Gerador', type: 'textarea' },
            { id: 'chave-documento', label: 'Chave e Documento estão no local?', type: 'select', options: [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }] },
            { id: 'obs_chave_documento', label: 'Observações sobre chave e documento'},
            { id: 'facil-acesso', label: 'Veículo de fácil acesso?', type: 'select', options: [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }] },
            { id: 'obs_facil_acesso', label: 'Observações sobre acesso ao veículo'},
            { id: 'servico', label: 'Serviço' },
            { id: 'endereco-origem', label: 'Endereço de Origem' },
            { id: 'referencia-origem', label: 'Referência de Origem' },
            { id: 'endereco-destino', label: 'Endereço de Destino' },
            { id: 'referencia-destino', label: 'Referência de Destino' },
            { id: 'quilometragem', label: 'Quilometragem' },
            { id: 'quilometragem-total', label: 'Quilometragem Total' }
        ],
        messageTemplate: 
        `🚨 *BR CLUBE - NOVO ACIONAMENTO* 🚨\n\n*Protocolo:* {{protocolo}}\n*Data/Horário:* {{data-hora}}\n*Placa:* {{placa}}\n*Modelo:* {{modelo}}\n*Cor:* {{cor}}\n*Solicitante:* {{solicitante}}\n*Telefone:* {{telefone}}\n*Fator Gerador:* {{fator-gerador}}\n*Observações do Fator Gerador:* {{obs-gerador}}\n*Chave e Documento no local?:* {{chave-documento}}\n*Veículo de fácil acesso?:* {{facil-acesso}}\n*Serviço:* {{servico}}\n*Endereço de Origem:* {{endereco-origem}}\n*Referência de Origem:* {{referencia-origem}}\n*Endereço de Destino:* {{endereco-destino}}\n*Referência de Destino:* {{referencia-destino}}\n*Quilometragem:* {{quilometragem}}\n*Quilometragem Total:* {{quilometragem-total}}`
      },
      { 
        id: 'abertura_assistencia', 
        name: 'Abertura de Assistência 24H', 
        parentId: 'assistance',
        fields: [
            { id: 'protocolo', label: 'Protocolo' },
            { id: 'data-hora', label: 'Data e Hora', type: 'datetime-local' },
            { id: 'placa', label: 'Placa' },
            { id: 'modelo', label: 'Modelo' },
            { id: 'cor', label: 'Cor' },
            { id: 'solicitante', label: 'Solicitante' },
            { id: 'solic_associado', label: 'É Associado?', type: 'select', options:[
              {value: 'sim', label: 'Sim' },
              {value: 'nao', label: 'Não' }
            ]},
            { id: 'vinculo', label: 'Vínculo', showIf: {field: 'solic_associado', value: 'nao'} },
            { id: 'associado', label: 'Associado', showIf: {field: 'solic_associado', value: 'nao'} },
            { id: 'telefone', label: 'Telefone', type: 'tel', placeholder: '(00) 00000-0000' },
            { id: 'fator-gerador', label: 'Fator Gerador', type: 'select', options:[
              {value: 'pane-eletrica', label: 'Pane Elétrica' },
              {value: 'pane-mecanica', label: 'Pane Mecânica' },
              {value: 'pane-seca', label: 'Pane Seca' },
              {value: 'chave', label: 'Chave' },
              {value: 'pneu', label: 'Pneu furado' },
              {value: 'colisao', label: 'Colisão' }
            ] },
            { id: 'obs-gerador', label: 'Observações do Fator Gerador', type: 'textarea' },
            { id: 'chave-documento', label: 'Chave e Documento estão no local?', type: 'select', options: [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }] },
            { id: 'obs_chave_documento', label: 'Observações sobre chave e documento'},
            { id: 'facil-acesso', label: 'Veículo de fácil acesso?', type: 'select', options: [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }] },
            { id: 'obs_facil_acesso', label: 'Observações sobre acesso ao veículo'},
            { id: 'servico', label: 'Serviço' },
            { id: 'endereco-origem', label: 'Endereço de Origem' },
            { id: 'referencia-origem', label: 'Referência de Origem' },
            { id: 'endereco-destino', label: 'Endereço de Destino' },
            { id: 'referencia-destino', label: 'Referência de Destino' },
            { id: 'quilometragem', label: 'Quilometragem' },
            { id: 'quilometragem-total', label: 'Quilometragem Total' }
        ],
        messageTemplate: 
`🚨 *BR CLUBE - NOVO ACIONAMENTO* 🚨\n\n
*Protocolo:* {{protocolo}}\n
*Data:* {{data-hora}}\n
*Placa:* {{placa}}\n
*Modelo:* {{modelo}}\n
*Cor:* {{cor}}\n
*Solicitante:* {{solicitante}}\n
*Telefone:* {{telefone}}\n
*Fator Gerador:* {{fator-gerador}}\n
*Observações:* {{obs-gerador}}\n
*Chave/Doc no local?:* {{chave-documento}}\n
*Observação do fator gerador:* {{obs_chave_documento}}\n
*Fácil acesso?:* {{facil-acesso}}\n
*Observações sobre o acesso: {{obs_facil_acesso}}*
*Serviço:* {{servico}}\n
*Endereço de Origem:* {{endereco-origem}}\n
*Referência do endereço de origem:* {{referencia-origem}}\n
*Endereço de Destino:* {{endereco-destino}}\n
*Referência do endereço de destino:* {{referencia-destino}}\n
*Quilometragem (km):* {{quilometragem}} km\n
*Quilometragem total (km):* {{quilometragem-total}} km\n
`
    },
    {
      id: 'fechamento_assistencia',
      name: 'Fechamento de Assistência 24H',
      parentId: 'assistance',
      fields: [
        { id: 'protocolo', label: 'Protocolo'},
        { id: 'prestador', label: 'Prestador'},
        { id: 'valor', label: 'Valor'},
        { id: 'pagamento', label: 'Forma de Pagamento'},
        { id: 'nota_fiscal', label: 'Nota Fiscal'},
        { id: 'hora_autorizacao', label: 'Hora de Autorização', type: 'datetime-local'},
        { id: 'hora_prestador', label:'Hora de Envio de Prestador', type: 'datetime-local'},
        { id: 'chegada_prestador', label: 'Hora da Chegada do Prestador', type: 'datetime-local'},
        { id: 'encerramento_atendimento', label: 'Hora do Encerramento do Atendimento', type: 'datetime-local'},
        { id: 'atendente', label: 'Atendente'},
        { id: 'atendimento_domicilio', label: 'Atendimento no Domicílio?', type:'select', options: [
          { value: 'sim', label: 'Sim' },
          { value: 'nao', label: 'Não' }
        ]}
      ]
    }
    ]
  },
  { 
    id: 'registration', 
    name: 'Cadastro', 
    icon: 'fa-user-plus', 
    description: 'Gestão de cadastro de associados',
    colorClass: 'bg-blue-600',
    submodules: [
      { 
        id: 'adesao', 
        name: 'Boas-vindas: Adesão', 
        parentId: 'registration',
        fields: [
          { id: 'associado', label: 'Nome do Associado'},
          { id: 'placa', label: 'Placa' },
          { id: 'vencimento', label: 'Dia de vencimento do boleto' },
          { id: 'telefone', label: 'Telefone' },
          { id: 'endereco', label: 'Endereço' },
          { id: 'cep', label: 'CEP' },
          { id: 'email', label: 'E-mail', type: 'email' },
          { id: 'forma-pagamento', label: 'Forma de Pagamento', type: 'select', options: [{ value: 'boleto', label: 'Boleto Bancário' }, { value: 'cartao', label: 'Cartão - cobrança recorrente' }]},
          { id: 'genero', label: 'Gênero', type: 'select', options: [{ value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' }]}
        ],
        // MANTIVE SUA FUNÇÃO EXISTENTE AQUI
        messageTemplate: (data: any) => {
          const formaPagamento = data['forma-pagamento'];
          let pagamentoInfo = '';

          if (formaPagamento === 'boleto') {
            pagamentoInfo = `💳 Forma de pagamento da mensalidade: Boleto\n\nVencimento escolhido: dia {{vencimento}} de cada mês.\nO boleto será enviado pelo WhatsApp até 5 dias antes do vencimento.\nEvite atrasos, o pagamento em dia é impreterível/imprescindível para manter sua proteção ativa — com todos os seus benefícios.\nNão recebeu o boleto até 5 dias antes? Avise-nos com a maior brevidade possível para providenciarmos imediatamente.\n\nQuer mais comodidade?\nVocê pode optar pela cobrança recorrente no cartão (não usa limite; funciona como assinatura):\n🔗 Cadastrar cartão agora: https://portal.sivisweb.com.br/loja/012/login` ;
          } else if (formaPagamento === 'cartao') {
            pagamentoInfo = `💳 Forma de pagamento da mensalidade: Cobrança recorrente no cartão\n\nSua mensalidade será lançada automaticamente no cartão na data combinada. ✅\n✅ Sem boletos • ✅ Sem fricção • ✅ Mais comodidade`;
          }

          return `🎉 Bem-vind${data.genero === 'feminino' ? 'a' : 'o'}, {{associado}}!\nVocê agora faz parte da comunidade BR Clube!\nNossa missão é cuidar do que é importante para você e estar ao seu lado sempre que precisar.\nCom excelência, oferecemos uma nova perspectiva de proteção patrimonial para você e sua família. 💙💙\n\n✅ Confira seus dados cadastrados:\n🅿 Placa: {{placa}}\n📍 Endereço: {{endereco}}\n📬 CEP: {{cep}}\n📧 E-mail: {{email}}\n📲 Telefone para contato: {{telefone}}\nSe encontrar algum erro ou houver mudança de endereço, e-mail, telefone ou CEP, por favor, nos avise prontamente para mantermos seu cadastro atualizado.\n\n${pagamentoInfo}\n        \n🆘 Canais oficiais\nFALE CONOSCO: 4020-0164\nASSISTÊNCIA 24h (Brasil): WhatsApp: 4020-0164 Telefone: 4020-0164\n\n🚀 Continue com a BR Clube\nFique por dentro de benefícios, descontos e conteúdos exclusivos para associados:\n🌐 www.brclube.org\n📸 @brclubeoficial`;
        }
      },
      { 
        id: 'br-power', 
        name: 'Boas-vindas: BR POWER', 
        parentId: 'registration',
        fields: [
          { id: 'associado', label: 'Nome do Associado'},
          { id: 'codigo', label: 'Código da bateria' },
          { id: 'marca', label: 'Marca' },
          { id: 'amperagem', label: 'Amperagem' }
        ],
        messageTemplate: `🚙 ⚡ Seja bem-vindo ao BR Power {{associado}}!\n\nParabéns! Agora, sua proteção está ainda mais completa.\nQuando a vida útil da bateria {{codigo}}, {{marca}}, {{amperagem}} do seu carro chegar ao fim, e ela não segurar mais carga, a BR Clube vai cuidar de tudo.\n\nVocê não vai precisar desembolsar nada a mais no momento da troca.\n\nNossa equipe técnica vai até você, com rapidez e eficiência, para resolver o problema.\n\n💡 Com o BR Power, você protege seu carro e suas finanças.\n\nQualquer dúvida, conte com a gente.\n\n🤝 BR Clube — Proteja do seu jeito. Inspire uma nova era.`
      }
    ]
  },
  { 
    id: 'cancellations', 
    name: 'Cancelamentos', 
    icon: 'fa-ban', 
    description: 'Cancelamento de serviços',
    colorClass: 'bg-black',
    submodules: [
      { 
        id: 'cancelamento', 
        name: 'Termo de Cancelamento', 
        isTerm: true,
        pdfType: 'termo_cancelamento',
        parentId: 'cancellations',
        fields: [
          { id: 'associado', label: 'Nome Completo' },
          { id: 'cpf', label: 'CPF' },
          { id: 'tipo', label: 'Tipo de Veículo', type: 'select', options: [{ value: 'Carro', label: 'Carro' }, { value: 'Moto', label: 'Moto' }, { value: 'Caminhão', label: 'Caminhão' }] },
          { id: 'placa', label: 'Placa' },
          { id: 'marca', label: 'Marca' },
          { id: 'modelo', label: 'Modelo' },
          { id: 'chassi', label: 'Chassi'},
          { id: 'renavam', label: 'RENAVAM'},
          { id: 'cor', label: 'Cor'},
          { id: 'ano_modelo', label: 'Ano Modelo'},
          { id: 'ano_fabricacao', label: 'Ano Fabricação'},
          { id: 'fipe', label: 'Código FIPE'},
          { id: 'data_cancelamento', label: 'Data de cancelamento', type: 'date'},
          { id: 'data_hoje', label: 'Data de hoje', type: 'date'}
        ],
        // --- AQUI ESTÁ A MÁGICA: TRANSFORMEI EM FUNÇÃO ---
        messageTemplate: (data: any) => {
            const dtHoje = formatarData(data['data_hoje']);
            const dtCancelamento = formatarData(data['data_cancelamento']); // Caso queira usar

            return `<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; color: #000; }
  .header { text-align: center; margin-bottom: 30px; }
  .header img { display: block; margin: 0 auto 10px auto; }
  .header h1 { margin: 0; text-decoration: underline; font-size: 18px; text-transform: uppercase; }
  .section { margin-bottom: 20px; text-align: justify; }
  .section-title { text-align: center; font-weight: bold; margin: 20px 0 10px 0; font-size: 14px; text-transform: uppercase; }
  .data-section { margin: 15px 0; display: flex; flex-wrap: wrap; }
  .data-column { width: 50%; box-sizing: border-box; padding-right: 10px; }
  .data-item { margin: 5px 0; font-size: 12px; }
  .signature { margin-top: 50px; text-align: center; }
  .line { border-top: 1px solid black; width: 250px; margin: 0 auto 5px auto; }
</style>
</head>
<body>
  <div class="header">
    <img src="/images/logo.png" width="80" alt="BR Clube" />
    <h1>TERMO DE CANCELAMENTO</h1>
  </div>

  <div class="section">
    Solicito que a partir do dia <strong>${dtHoje}</strong>, o cancelamento da filiação do veículo abaixo descrito junto a Associação BR CLUBE DE BENEFÍCIOS. Ciente de que meu veículo se encontra a partir desta data, sem qualquer cobertura, portanto, não mais poderei usufruir de qualquer vantagem oferecida pela BR CLUBE.
  </div>

  <div class="section-title">DADOS DO VEÍCULO</div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 5px; border-right: 1px solid #ccc;">
        <div class="data-item"><strong>Tipo:</strong> ${data.tipo || ''}</div>
        <div class="data-item"><strong>Placa:</strong> ${data.placa || ''}</div>
        <div class="data-item"><strong>Marca:</strong> ${data.marca || ''}</div>
        <div class="data-item"><strong>Modelo:</strong> ${data.modelo || ''}</div>
        <div class="data-item"><strong>Chassi:</strong> ${data.chassi || ''}</div>
      </td>
      <td style="width: 50%; vertical-align: top; padding: 5px;">
        <div class="data-item"><strong>RENAVAM:</strong> ${data.renavam || ''}</div>
        <div class="data-item"><strong>Cor:</strong> ${data.cor || ''}</div>
        <div class="data-item"><strong>Ano modelo:</strong> ${data['ano_modelo'] || ''}</div>
        <div class="data-item"><strong>Ano fabricação:</strong> ${data['ano_fabricacao'] || ''}</div>
        <div class="data-item"><strong>Código FIPE:</strong> ${data.fipe || ''}</div>
      </td>
    </tr>
  </table>

  <div class="signature">
    <div style="text-align: right; margin-bottom: 40px;">Goiânia - ${dtHoje}</div>
    
    <div class="line"></div>
    <div><strong>${data.associado || ''}</strong></div>
    <div>CPF: ${data.cpf || ''}</div>

    <div style="margin-top: 40px;">
        <img src="${ASSINATURA_URL}" width="150" alt="Assinatura" />
    </div>
  </div>
</body>
</html>`;
        }
      }
    ]
  },
  { 
    id: 'billing', 
    name: 'Cobrança', 
    icon: 'fa-file-signature', 
    description: 'Cobrança de mensalidades e serviços',
    colorClass: 'bg-orange-600',
    submodules: [
      { 
        id: 'mensagem_cobranca', 
        name: 'Mensagem de Cobrança', 
        parentId: 'billing',
        fields: [
          { id: 'associado', label: 'Nome Completo', required: true },
          { id: 'placa', label: 'Placa', required: true },
          { id: 'genero', label: 'Genero', type: 'select', options: [{value: 'masculino', label: 'Masculino'}, {value: 'feminino', label: 'Feminino'}], required: true },
          { id: 'boletos', label: 'Boletos Vencidos', type: 'repeater', subFields: [
            {id: 'data_vencimento', label: 'Data de Vencimento', type: 'date'},
            {id: 'valor', label: 'Valor', type: 'number'}
          ]}
        ],
        messageTemplate: (data: any) => {
          const boletos = data.boletos || [];
          let listaTexto = '';
          if(boletos.length > 0){
            listaTexto = boletos.map((b: any) =>`Vencimento: ${b.data_vencimento}\nValor: ${b.valor}\n`).join('\n');
          }
          return `Olá, {{associado}}!\n\nTudo bem com você?\n\nSr${data.genero === 'feminino' ? 'a' : ''}. {{associado}}, até o presente momento nosso sistema não identificou o pagamento dos seguintes boletos vencidos.\n\nPlaca/Veículo: {{placa}}\n\n${listaTexto}\nNeste caso, informamos que o pagamento AINDA poderá ser feito via PIX, sem ocorrência de juros por atraso. Nosso código pix é CNPJ:\n\n40.410.992/0001-40\n\nApós o pagamento, compartilhe o comprovante por aqui, por gentileza, para informarmos a baixa no sistema.\n\nCaso o pagamento já tenha sido realizado, por favor desconsiderar essa mensagem.\n\nDe já, externamos nossa gratidão!\n\nEquipe BR Clube!`
        }
      },
      { 
        id: 'termo_acordo', 
        name: 'Termo de Acordo', 
        isTerm: true,
        pdfType: 'termo_acordo',
        parentId: 'billing',
        fields: [
          { id: 'numero_negociacao', label: 'Número de Negociação', required: true, type: 'number' },
          { id: 'nome_devedor', label: 'Nome do Devedor', required: true },
          { id: 'rg', label: 'RG', required: true, type: 'number' },
          { id: 'cpf', label: 'CPF', required: true, type: 'number' },
          { id: 'endereco', label: 'Endereço', required: true },
          { id: 'total_debito', label: 'Total do Débito', required: true, type: 'number' },
          { id: 'valor_entrada', label: 'Valor da Entrada', type: 'number'},
          { id: 'parcelas_restantes', label: 'Parcelas Restantes', type: 'number'},
          { id: 'valor_parcela', label: 'Valor de Cada Parcela', type: 'number'},
          { id: 'data_vencimento_entrada', label: 'Vencimento da Entrada', type: 'date'},
          { id: 'data_hoje', label: 'Data de Hoje', type: 'date'}
        ],
        messageTemplate: (data: any) => {
             const dtHoje = formatarData(data.data_hoje);
             const dtVenc = formatarData(data.data_vencimento_entrada);
             return `
    <style>
        

        /* --- SEU CSS DO DOCUMENTO AQUI --- */
        /* Copie esses estilos para dentro das tags style no constants.tsx se precisar */
        .doc-title { text-align: center; margin-bottom: 20px; font-weight: bold; font-size: 20px; text-transform: uppercase; }
        .doc-text { text-align: justify; margin-bottom: 20px; line-height: 1.5; font-size: 18px; }
        .section-title { text-align: center; font-weight: bold; margin: 20px 0 10px 0; font-size: 18px; text-transform: uppercase; }
        .bold {font-weight: bold;}

        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        td { vertical-align: top; padding: 5px; }
        .col-left { width: 50%; border-right: 1px solid #ccc; }
        .col-right { width: 50%; padding-left: 10px; }
        
        .signature-area { margin-top: 50px; text-align: center; font-size: 18px; }
        .line { border-top: 1px solid black; width: 250px; margin: 0 auto 5px auto; }

    </style>


    <div class="page">
        

        <div class="doc-title">TERMO ADITIVO N.° ${data.numero_negociacao} AO INSTRUMENTO DE CONFISSÃO DE DÍVIDA N.° ${data.numero_negociacao}.</div>

        <div class="doc-text">
            <strong>CREDOR(A):</strong> ASSOCIAÇÃO BR CLUBE DE BENEFÍCIOS, pessoa jurídica de direito privado,
            sem fins lucrativos, inscrita no CNPJ nº 40.410.992.0001/40 com sede na Av. Deputado Jamel
            Cecílio, nº 2496, andar 14 sala 141, Jardim Goiás, nesta capital, mentora da Associação Br
            clube de benefícios, sem fins lucrativos.
        </div>

        <div class="doc-text bold">
            DEVEDOR(A): ${data.nome_devedor} Brasileira, Portador(a) do RG ${data.rg} e do CPF:
            ${data.cpf}, Residente e Domiciliado À ${data.endereco}.
        </div>

        <div class="doc-text bold">
            As partes acima qualificadas querem retificar, como de fato RETIFICAM as cláusulas da
            Confissão de Dívida nº ${data.numero_divida} referente oriunda da proteção veicular, nos termos que se
            seguem:
        </div>

        <div class="doc-text bold">
            As partes celebram a presente renegociação de forma livre e consciente, sendo a mesma
            decorrente do inadimplemento do(a) Devedor(a), referente parcelas em atraso, com valor
            total de R$ ${data.total_debito}. O devedor solicitou o primeiro pagamento no valor de R$ ${data.valor_entrada} e o
            pagamento posterior do saldo devedor remanescente em ${data.parcelas_restantes} vezes de R$ ${data.valor_parcela}. A proposta
            foi acatada pelo credor, que executou a cobrança da entrada, que deverá ser paga até o
            dia ${dtVenc}, e fará cobrança do valor remanescente nos meses subsequentes, até
            completa quitação.
        </div>

        <div class="doc-text">
            As parcelas decorrentes do presente acordo são representadas por boletos bancários,
            entregues ao <strong>DEVEDOR(A)</strong> em datas próximas ao vencimento.
        </div>

        <div class="doc-text">
            Cumprida a condição de validade supracitada, o não pagamento de quaisquer das parcelas do
            presente acordo redundará no vencimento antecipado da dívida, facultando ao credor, imediato
            ajuizamento da Execução Judicial do Acordo, ficando ajustado uma multa de 10% (dez por
        </div>

        <div>
          cento), juros de 1% ao mês, honorários advocatícios de 05% (cinco) sobre o valor das parcelas
          não quitadas, além do pagamento de despesas administrativas e custas processuais, caso haja,
          independentemente de interpelação. Facultar-se-á à Credora, imediato ajuizamento da
          execução judicial do acordo, pois, a presente confissão de dívida é título executivo extrajudicial,
          nos exatos termos do artigo 784, inciso III, do Código de Processo Civil.
        </div>

        <div class="signature-area">
            <div style="text-align: right; margin-bottom: 40px;">Goiânia, ${dtHoje}</div>
            
            <div class="line"></div>
            <div><strong>${data.nome_devedor}</strong></div>
            <div>CPF: ${data.cpf}</div>
        </div>

        `;
        }
      }
    ]
  },
  { 
    id: 'commercial', 
    name: 'Comercial', 
    icon: 'fa-bag-shopping', 
    description: 'Comunicação comercial e promoções',
    colorClass: 'bg-blue-600',
    submodules: [
       // ... MANTIVE O RESTO IGUAL ...
      { 
        id: 'enviar-associado', 
        name: 'Enviar Kit para Associado', 
        parentId: 'commercial',
        isTerm: true,
        isBlank: true,
        fields: [
          { id: 'destinatario', label: 'Destinatario', required: true },
          { id: 'endereco', label: 'Endereço'},
          { id: 'cep', label: 'CEP', type: 'number' },
          { id: 'referencia', label: 'Ponto de Referência', type: 'textarea'}
        ],
        messageTemplate: `<div style="border: 1px solid black; padding: 10px;">
<img src="/src/assets/brclube2.png" alt="Logo Destinatário" style="width: 80px; height: auto;"><br>
<strong>Destinatário:</strong> {{destinatario}}<br>
<strong>Endereço: </strong> {{endereco}}<br>
<strong>CEP:</strong> {{cep}}<br>
<strong>Ponto de referência:</strong> {{referencia}}<br>
</div>
<br>

<div style="border: 1px solid black; padding: 10px;">
<img src="/src/assets/brclube2.png" alt="Logo Destinatário" style="width: 80px; height: auto;"><br>
<strong>Remetente:</strong> ASSOCIAÇÃO BR CLUBE DE BENEFÍCIOS<br>
<strong>Endereço:</strong> Edifício New Business Style: Sala 141-A | Av. Dep. Jamel Cecílio, 2496 - Jardim Goiás, Goiânia-GO.<br>
<strong>CEP:</strong> 74810-100<br>
<strong>Telefone:</strong> 4020-0164<br>
</div>
`
      },
      { 
        id: 'confirmar-recebimento', 
        name: 'Confirmar Recebimento do Kit', 
        parentId: 'commercial',
        fields: [
          { id: 'associado', label: 'Associado', required: true },
          { id: 'select', label: 'Associado recebeu o Kit?', type: 'select', placeholder: 'selecione', options:[
            { label: 'Verificar',value: 'verifica'},
            { label: 'Sim', value: 'sim'},
            { label: 'Não', value: 'nao'}
          ] },
          { id: 'data', label: 'Data do Recebimento', type: 'date' },
          { id: 'recebido_por', label: 'Recebido por'}
        ],
        messageTemplate: (data : any) =>{
          const dtRecebimento = formatarData(data.data);
          if(data.select === `verifica`){
            return `Olá ${data.associado}, consta em nosso sistema que o seu Kit do associado foi recebido por ${data.recebido_por}, no dia ${dtRecebimento}. Um envelope contendo um lixocar BR CLUBE, cheirinho, um adesivo automotivo e seus manuais das assistências e coberturas contratadas. Você confirma o recebimento?`
          }else if(data.select === 'sim'){
            return `${data.associado}, somos felizes por ter você com a gente. Nesse kit contém todas as nossas informações para que você possa utilizar bem a nossa proteção BR CLUBE. Mas se ficar alguma dúvida, é só chamar a gente aqui, que teremos o maior prazer em atender. Lembre-se: Se é importante pra você, é importante pra nós!`
          }else if(data.select === 'nao'){
            return `${data.associado}, lamentamos saber que ainda não recebeu o seu kit. Iremos verificar o que houve e, se for o caso, faremos o envio de um novo kit para você. Mas se ficar alguma dúvida, é só chamar a gente aqui, que teremos o maior prazer em atender. Lembre-se: Se é importante pra você, é importante pra nós!`
          }else{
            return `Olá ${data.associado}, consta em nosso sistema que o seu Kit do associado foi recebido por ${data.recebido_por}, no dia ${dtRecebimento}. Um envelope contendo um lixocar BR CLUBE, cheirinho, um adesivo automotivo e seus manuais das assistências e coberturas contratadas. Você confirma o recebimento?`
          }
        }
      }
    ]
  },
  {
    id: 'events',
    name: 'Eventos',
    icon: 'fa-calendar-alt',
    description: 'Acionamento e termos de eventos',
    colorClass: 'bg-red-600',
    submodules: [
      {
        id: 'agendamento-oficina',
        name: 'Agendamento para Oficina',
        parentId: 'events',
        fields: [
          { id: 'oficina', label: 'Nome da Oficina', required: true },
          { id: 'responsavel', label: 'Nome do Responsável', required: true },
          { id: 'servico', label: 'Tipo de Serviço' },
          { id: 'datahr', label: 'Data/Hora', type: 'datetime-local', required: true },
          { id: 'endereco', label: 'Endereço'}
        ],
        messageTemplate: (data : any) =>{
          return `*Confirmação do seu agendamento na* ${data.oficina} *com o responsável* ${data.responsavel}.
*Data e horário do agendamento:* ${data.datahr}
*Serviço agendado:* ${data.servico}
*Local:* ${data.endereco}\n
Recomendamos a retirada dos objetos de valor de dentro de seu veículo antes do atendimento.\n
*Obs.:* Muito importante a sua pontualidade para que possam também ser pontuais no seu atendimento.\n
Caso não possa comparecer, por gentileza nos informar através desse canal ou no telefone 4020-0164\n
Cordialmente,\n
Central de Agendamento\n
*BR Clube.*`
        }
      },
      {
        id: 'termo-entrega-veiculo',
        name: 'Termo de Entrega de Veículo',
        isTerm: true,
        pdfType: 'entrega_veiculo',
        parentId: 'events',
        fields: [
          { id: 'responsavel', label: 'Responsável do Veículo', required: true },
          { id: 'cpf_cnpj', label: 'CPF/CNPJ', required: true },
          { id: 'veiculo', label: 'Veículo' },
          { id: 'ano', label: 'Ano', required: true },
          { id: 'placa', label: 'Placa'},
          { id: 'data_inicio', label: 'Data de Início dos Reparos', type: 'date'},
          { id: 'data_conclusao', label: 'Data de Conclusão dos Reparos', type: 'date'},
          { id: 'data_hoje', label: 'Data de Hoje', type: 'date'}
        ],
        messageTemplate: (data : any) =>{
          const dt_hoje = formatarData(data.data_hoje);
          const dt_inicio = formatarData(data.data_inicio);
          const dt_conclusao = formatarData(data.data_conclusao);

          return `
          <style>
        /* --- ESTILOS GERAIS PARA SIMULAR O PAPEL NA TELA --- */
        body {
            background-color: #525659; /* Cor de fundo igual visualizador de PDF */
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }

        /* A FOLHA A4 */
        .page {
            background-color: white;
            width: 210mm;
            min-height: 297mm;
            padding: 0 15mm; /* Margens laterais iguais ao seu projeto */
            
            /* Margens verticais simulam o espaço reservado para Header/Footer */
            padding-top: 45mm;    /* Espaço do Header (35mm imagem + 10mm folga) */
            padding-bottom: 55mm; /* Espaço do Footer (25mm imagem + 30mm folga) */
            
            box-sizing: border-box;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            position: relative;
        }

        /* --- SIMULAÇÃO VISUAL DO HEADER/FOOTER (Só para você ver onde não pode escrever) --- */
        .simulated-header {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 35mm;
            background: rgba(0, 255, 255, 0.1); border-bottom: 1px dashed cyan;
            display: flex; align-items: center; justify-content: center; color: cyan; font-weight: bold;
        }
        .simulated-footer {
            position: absolute;
            bottom: 0; left: 0; width: 100%; height: 25mm;
            background: rgba(0, 255, 255, 0.1); border-top: 1px dashed cyan;
            display: flex; align-items: center; justify-content: center; color: cyan; font-weight: bold;
        }

        /* --- SEU CSS DO DOCUMENTO AQUI --- */
        /* Copie esses estilos para dentro das tags style no constants.tsx se precisar */
        .doc-title { text-align: center; margin-bottom: 20px; font-weight: bold; font-size: 16px; text-transform: uppercase; }
        .doc-text { text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px; }
        .section-title { text-align: center; font-weight: bold; margin: 20px 0 10px 0; font-size: 14px; text-transform: uppercase; }
        .bold {font-weight: bold;}

        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        td { vertical-align: top; padding: 5px; }
        .col-left { width: 50%; border-right: 1px solid #ccc; }
        .col-right { width: 50%; padding-left: 10px; }
        
        .signature-area { margin-top: 25px; text-align: center; font-size: 14px; }
        .line { border-top: 1px solid black; width: 250px; margin: 0 auto 5px auto; }

    </style>
          
          <div class="doc-title">TERMO DE ENTREGA DE VEÍCULO</div>

        <div class="doc-text">
            <strong>Responsável pelo veículo:</strong> ${data.responsavel}
        </div>

        <div class="doc-text">
            <strong>CPF/CNPJ:</strong> ${data.cpf_cnpj}
        </div>

        <div class="doc-text">
            <strong>Veículo:</strong> ${data.veiculo}
        </div>

        <div class="doc-text">
            <strong>Ano:</strong> ${data.ano}
        </div>

        <div class="doc-text">
            <strong>Placa:</strong> ${data.placa}
        </div>

        <div class="doc-text">
            <strong>Data de início dos reparos:</strong> ${dt_inicio}
        </div>

        <div class="doc-text">
            <strong>Data de conclusão dos reparos:</strong> ${dt_conclusao}
        </div>

        <div class="doc-text">
            Declaração: <br><br>
            Recebi o veículo acima identificado, devidamente reparado dos danos sofridos de objeto de
            acidente de trânsito, outorgando a mais plena, rasa, irrevogável e irretratável quitação,
            passada, presente e futura, para nada mais reclamar, em Juízo ou fora dele, seja a que título
            for, renunciando expressamente a todo e qualquer outro direito que possa vir a ter em
            decorrência do evento. <br><br>
            Sendo este termo assinado, a quitação é dada à Br Clube, oficina reparadora e ao causador
            do evento.
        </div>

        <div class="signature-area">
            <div style="text-align: right; margin-bottom: 40px;">Goiânia, ${dt_hoje}</div>
            
            <div class="line"></div>
            <div><strong>${data.responsavel}</strong></div>
            
        </div>
        `
        }
      },
      {
        id: 'termo-acionamento',
        name: 'Termo de Acionamento (WIP)',
        isTerm: true,
        parentId: 'events',
        fields: [
          { id: 'associado', label: 'Associado', required: true },
          { id: 'agendamento', label: 'Data e Hora da Instalação', type: 'datetime-local', required: true },
          { id: 'tecnico', label: 'Técnico Responsável' },
          { id: 'local', label: 'Endereço Completo', type: 'textarea', required: true }
        ],
        messageTemplate: `📍 *BR CLUBE - AGENDAMENTO DE RASTREIO*\n\nOlá *{{associado}}*,\nSeu agendamento para oficina foi confirmado para o dia *{{agendamento}}*.\n\n📍 Local: {{local}}\n\nTécnico Responsável: {{tecnico}}`
      },
      {
        id: 'termo-acordo-terceiro',
        name: 'Termo de Acordo e Amparo (terceiro)',
        isTerm: true,
        pdfType: 'termo_acordo_amparo',
        parentId: 'events',
        fields:[
          { id: 'terceiro', label: 'Nome do Terceiro'},
          { id: 'cpf', label: 'CPF do Terceiro'},
          { id: 'rg', label: 'RG do Terceiro'},
          { id: 'data_evento', label: 'Data do Evento', type: 'date'},
          { id: 'boletim_ocorrencia', label: 'Nº Boletim de Ocorrência'},
          { id: 'marca', label: 'Marca do Carro do Associado'},
          { id: 'modelo', label: 'Modelo do Carro do Associado'},
          { id: 'ano', label: 'Ano do Carro do Associado'},
          { id: 'placa', label: 'Placa do Carro do Associado'},
          { id: 'cor', label: 'Cor do Carro do Associado'},
          { id: 'valor', label: 'Valor do Reembolso'},
          { id: 'valor_extenso', label: 'Valor por extenso'},
          { id: 'pix', label: 'Chave Pix do Terceiro'},
          { id: 'data_hoje', label: 'Data de Hoje', type: 'date'}
        ],
        messageTemplate: (data : any) =>{

          return `
          <style>
            .doc-title { text-align: center; margin-bottom: 20px; font-weight: bold; font-size: 16px; text-transform: uppercase; }
            .doc-subtitle { text-align: start; margin-bottom: 20px; font-weight: bold; font-size: 16px; text-transform: uppercase; }
            .doc-text { text-align: justify; margin-bottom: 20px; line-height: 1.5; font-size: 14px; }
            .section-title { text-align: center; font-weight: bold; margin: 20px 0 10px 0; font-size: 14px; text-transform: uppercase; }
            .bold {font-weight: bold;}

            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            td { vertical-align: top; padding: 5px; }
            .col-left { width: 50%; border-right: 1px solid #ccc; }
            .col-right { width: 50%; padding-left: 10px; }
            
            .signature-area { margin-top: 50px; text-align: center; font-size: 14px; }
            .line { border-top: 1px solid black; width: 250px; margin: 0 auto 5px auto; }

          </style>

          <h1 class="doc-title">
            TERMO DE ACORDO E AMPARO
        </h1>

       <p class="doc-text">
            Por este instrumento, a <strong>ASSOCIAÇÃO BR CLUBE DE BENEFÍCIOS</strong>, pessoa jurídica
            de direito privado, CNPJ no 40.410.992/0001-40, com sede na Avenida Deputado
            Jamel Cecílio, no 2496, Jardim Goiás, Município de Goiânia, Estado de Goiás, e, de
            outro lado, o terceiro, <strong>${data.terceiro}</strong>, brasileiro, inscrita sob o CPF
            no ${data.cpf}, portador do RG no ${data.rg} DGPC GO, ajustam, entre si, o
            seguinte termo de amparo:
       </p>

       <p class="doc-text">
            A BR CLUBE é um grupo associativo que realiza a divisão das despesas passadas e
            ocorridas entre seus membros. A ela recai a responsabilidade de amparar os danos
            sofridos e causados por seus associados, sendo, contudo, respeitados os limites e
            condições determinadas pelo Regulamento Interno e nos termos do Art. 421, do
            Código Civil.
       </p>

       <p class="doc-text">
            Considerando o evento de acidente de trânsito ocorrido em <strong>${data.data_evento}</strong>, lavrado pelo
            Boletim de Ocorrência no <strong>${data.boletim}</strong>, envolvendo o veículo do <strong>ASSOCIADO</strong> marca
            <strong>${data.marca}</strong>, modelo <strong>${data.modelo}</strong>, ano <strong>${data.ano}</strong>, placa <strong>${data.placa}</strong>, cor <strong>${data.cor}</strong>, a BR CLUBE
            compromete-se a reembolsar o terceiro <strong>${data.terceiro}</strong> no montante
            de <strong>R$ ${data.valor} (${data.valor_extenso})</strong>, a fim de reiterar a boa-fé e o
            compromisso com o bom atendimento de nossos associados e terceiros.
       </p>

       <p class="doc-subtitle">
            FORMA DE PAGAMENTO
       </p>

       <p class="doc-text">
            A quitação do valor será realizada exclusivamente por meio de transferência via PIX,
            utilizando a chave PIX do terceiro, que corresponde à chave <strong>${data.pix}</strong>.
            Com o pagamento supracitado, o <strong>terceiro ${data.terceiro}</strong>
            reconhece, com fulcro no Art. 320, do Código Civil, não ter mais direito algum além do
            que ora recebe, dando à BR CLUBE a mais plena, rasa, irrevogável e irretratável
            quitação quanto a todas as despesas originadas do evento noticiado no Boletim de
            Ocorrência acima referido, passada, presente e futura, para nada mais reclamar, em
            Juízo ou fora dele, seja a que título for, renunciando expressamente a todo e qualquer
            outro direito ou fato que possa vir a ter em decorrência do presente evento,
            responsabilizando-se integralmente por qualquer medida que o associado ou qualquer
            outro interessado venha a interpor face ao referido evento no que pertine ao referido
            veículo.
       </p>

       <p class="doc-text">
            Por fim, nos termos do Art. 104 do Código Civil, cumpre-se que ambas as partes são
            capazes e que o presente acordo ocorreu sem nenhum vício, reconhecendo que a BR
            CLUBE cumpriu integralmente o que se comprometeu por meio de seu Regulamento
            Interno, não tendo mais, ambas as partes, nada a reclamar, conforme já mencionado,
            em tempo algum, sobre os respectivos valores, títulos e condições.
       </p>

        <div class="signature-area">
            <div style="text-align: right; margin-bottom: 40px;">Goiânia, ${data.data_hoje}</div>
            
            <div class="line"></div>
            <div><strong>${data.terceiro}</strong></div>

            <img src="/images/assinatura.png" style="width: 200px; margin-top: 40px;">
        </div>
          `

        }
      },
      {
        id: 'termo_entrega_pecas',
        name: 'Termo de Entrega e Recebimento de Peças',
        isTerm: true,
        pdfType: 'termo_pecas',
        parentId: 'events',
        fields:[
          { id: 'terc_assoc', label: 'Terceiro ou Associado', type: 'select', options: [
            {value: 'terceiro', label: 'Terceiro'},
            {value: 'associado', label: 'Associado'}
          ]},
          { id: 'responsavel', label: 'Responsável pelo Recebimento'},
          { id: 'cpf', label: 'CPF'},
          { id: 'cargo', label: 'Cargo/Função'},
          { id: 'associado', label: 'Nome do Associado/Terceiro'},
          { id: 'placa', label: 'Placa'},
          { id: 'marca_modelo', label: 'Marca/Modelo'},
          { id: 'pecas', label: 'Pecas', type: 'repeater', subFields: [
            { id: 'item', label: 'Item'},
            { id: 'codigo', label: 'Código'},
            { id: 'produto', label: 'Produto'},
            { id: 'quantidade', label: 'Quantidade'},
            { id: 'valor', label: 'Valor'}
          ]},
          { id: 'data_hoje', label: 'Data de Hoje', type: 'date'}
        ],
        messageTemplate: ''
      },
      {
        id: 'termo_quitacao_evento',
        name: 'Termo de Quitação de Evento',
        isTerm: true,
        pdfType: 'termo_quitacao_evento',
        parentId: 'events',
        fields:[
          { id: 'responsavel', label: 'Responsável Pelo Veículo'},
          { id: 'cpf_cnpj', label: 'CPF/CNPJ'},
          { id: 'veiculo', label: 'Veículo', placeholder: 'Ex: FORD KA TRAIL 1.0 12V FLEX MEC. 5P'},
          { id: 'ano', label: 'Ano'},
          { id: 'placa', label: 'Placa'},
          { id: 'data_inicio', label: 'Data de Início dos Reparos', type: 'date'},
          { id: 'data_conclusao', label: 'Data de Conclusão dos Reparos', type: 'date'},
          { id: 'data_hoje', label: 'Data do Contrato', type: 'date'}
        ],
        messageTemplate: ''
      }
    ]
  },
  {
    id: 'financing',
    name: 'Financeiro',
    icon: 'fa-sack-dollar',
    description: 'Termos e Recibos Financeiros',
    colorClass: 'bg-green-600',
    submodules: [
      {
        id: 'recibo_prestador',
        name: 'Recibo de Pagamento Prestador de Serviço',
        isTerm: true,
        pdfType: 'termo_recibo_prestador',
        parentId: 'financing',
        fields: [
          { id: 'prestador', label: 'Prestador'},
          { id: 'tipo_pessoa', label: 'Tipo de Pessoa', type: 'select', options: [
            { value: 'pj', label: 'Pessoa Jurídica'},
            { value: 'pf', label: 'Pessoa Física'}
          ]},
          { id: 'cnpj_cpf', label: 'CPF ou CNPJ'},
          { id: 'valor', label: 'Valor', type: 'number'},
          { id: 'valor_extenso', label: 'Valor por Extenso'},
          { id: 'servico', label: 'Serviço Prestado'},
          { id: 'associado', label: 'Associado'},
          { id: 'placa', label: 'Placa'},
          { id: 'data_servico', label: 'Data do Serviço', type: 'date'},
          { id: 'data_hoje', label: 'Data de Hoje', type: 'date'}
        ]
      },
      {
        id: 'recibo_estagio',
        name: 'Recibo de Pagamento Bolsa Estágio',
        isTerm: true,
        pdfType: 'termo_recibo_estagio',
        parentId: 'financing',
        fields: [
          { id: 'estagiario', label: 'Estagiário'},
          { id: 'cpf', label: 'CPF'},
          { id: 'valor', label: 'Valor', type: 'number'},
          { id: 'valor_extenso', label: 'Valor por Extenso'},
          { id: 'data_hoje', label: 'Data de Hoje', type: 'date'}
        ]
      },
      {
        id: 'recibo_vale_transporte',
        name: 'Recibo de Vale Transporte',
        isTerm: true,
        pdfType: 'termo_recibo_transporte',
        parentId: 'financing',
        fields: [
          { id: 'estagiario', label: 'Estagiário'},
          { id: 'cpf', label: 'CPF'},
          { id: 'valor', label: 'Valor', type: 'number'},
          { id: 'valor_extenso', label: 'Valor por Extenso'},
          { id: 'data_hoje', label: 'Data de Hoje', type: 'date'}
        ]
      },
      {
        id: 'termo_cheques',
        name: 'Termo de Entrega de Cheques',
        isTerm: true,
        pdfType: 'termo_recibo_cheque',
        parentId: 'financing',
        fields: [
          { id: 'prestador', label: 'Prestador'},
          { id: 'tipo_pessoa', label: 'Tipo de Pessoa', type: 'select', options: [
            { value: 'pj', label: 'Pessoa Jurídica'},
            { value: 'pf', label: 'Pessoa Física'}
          ]},
          { id: 'cnpj_cpf', label: 'CPF ou CNPJ'},
          { id: 'valor', label: 'Valor', type: 'number'},
          { id: 'valor_extenso', label: 'Valor por Extenso'},
          { id: 'data_hoje', label: 'Data de Hoje', type: 'date'}
        ]
      },
      {
        id: 'termo_inden_pecun',
        name: 'Termo de Indenização Pecuniária',
        isTerm: true,
        pdfType: 'termo_indenizacao_pecuniaria',
        parentId: 'financing',
        fields: [
          { id: 'terceiro_nome', label: 'Nome Completo do Terceiro', required: true },
          { id: 'terceiro_nacionalidade', label: 'Nacionalidade', placeholder: 'Ex: brasileiro' },
          { id: 'terceiro_cpf', label: 'CPF do Terceiro', required: true },
          { id: 'terceiro_rg', label: 'RG do Terceiro', required: true },
          { id: 'terceiro_endereco', label: 'Endereço Completo (Rua, Qd, Lt, Bairro, Cidade)', type: 'textarea', required: true },
          { id: 'data_evento', label: 'Data do Acidente', type: 'date', required: true },
          { id: 'numero_boletim', label: 'Nº Boletim de Ocorrência', required: true },
          { id: 'veiculo_marca', label: 'Marca do Veículo' },
          { id: 'veiculo_modelo', label: 'Modelo do Veículo' },
          { id: 'veiculo_ano', label: 'Ano do Veículo' },
          { id: 'veiculo_placa', label: 'Placa do Veículo', required: true },
          { id: 'veiculo_cor', label: 'Cor do Veículo' },
          { id: 'valor_total', label: 'Valor Total da Indenização (R$)', required: true },
          { id: 'valor_extenso', label: 'Valor por Extenso', placeholder: 'Ex: dois mil e cento e dez reais', required: true },
          { id: 'condicoes_pagamento', label: 'Condições de Pagamento (Texto descritivo)', type: 'textarea', placeholder: 'Ex: da entrega de três cheques, com valor de R$ 703,00 cada um, com vencimentos subsequentes...', required: true },
          { id: 'data_hoje', label: 'Data da Assinatura', type: 'date', required: true }
        ]
      }
    ]
  },
  {
    id: 'tracking',
    name: 'Rastreamento',
    icon: 'fa-satellite-dish',
    description: 'Agendamento e termos de rastreamento',
    colorClass: 'bg-yellow-600',
    submodules: [
      {
        id: 'termo-recebimento-rastreador',
        name: 'Termo de Recebimento do Rastreador',
        isTerm: true,
        pdfType:'termo_recebimento_rastreador',
        parentId: 'tracking',
        fields: [
          { id: 'instalador', label: 'Nome do Instalador'},
          { id: 'cpf', label: 'CPF'},
          { id: 'rg', label: 'RG'},
          { id: 'equipamentos', label: 'Equipamentos', type: 'repeater', subFields: [
            { id: 'imei', label: 'IMEI'}
          ]},
          { id: 'data_hoje', label: 'Data', type: 'date'}
        ],
        messageTemplate: (data : any) => {
          const dt_hoje = formatarData(data.data_hoje);
          const equipamentos = data.equipamentos || [];
          let listaTexto = '';
          if(equipamentos.length > 0){
            listaTexto = equipamentos.map((e: any, index: number) =>{
              return `
              <div style="margin-bottom: 5px;">
                <strong>Equipamento ${index + 1}:</strong> IMEI ${e.imei}
              </div>
              `;
            }).join('')
          }
          return `

          <style>
        /* --- ESTILOS GERAIS PARA SIMULAR O PAPEL NA TELA --- */
        body {
            background-color: #525659; /* Cor de fundo igual visualizador de PDF */
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }

        /* A FOLHA A4 */
        .page {
            background-color: white;
            width: 210mm;
            min-height: 297mm;
            padding: 0 15mm; /* Margens laterais iguais ao seu projeto */
            
            /* Margens verticais simulam o espaço reservado para Header/Footer */
            padding-top: 45mm;    /* Espaço do Header (35mm imagem + 10mm folga) */
            padding-bottom: 55mm; /* Espaço do Footer (25mm imagem + 30mm folga) */
            
            box-sizing: border-box;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            position: relative;
        }

        /* --- SIMULAÇÃO VISUAL DO HEADER/FOOTER (Só para você ver onde não pode escrever) --- */
        .simulated-header {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 35mm;
            background: rgba(0, 255, 255, 0.1); border-bottom: 1px dashed cyan;
            display: flex; align-items: center; justify-content: center; color: cyan; font-weight: bold;
        }
        .simulated-footer {
            position: absolute;
            bottom: 0; left: 0; width: 100%; height: 25mm;
            background: rgba(0, 255, 255, 0.1); border-top: 1px dashed cyan;
            display: flex; align-items: center; justify-content: center; color: cyan; font-weight: bold;
        }

        /* --- SEU CSS DO DOCUMENTO AQUI --- */
        /* Copie esses estilos para dentro das tags style no constants.tsx se precisar */
        .doc-title { text-align: center; margin-bottom: 20px; font-weight: bold; font-size: 16px; text-transform: uppercase; }
        .doc-text { text-align: justify; margin-bottom: 20px; line-height: 1.5; font-size: 14px; }
        .section-title { text-align: center; font-weight: bold; margin: 20px 0 10px 0; font-size: 14px; text-transform: uppercase; }
        .bold {font-weight: bold;}

        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        td { vertical-align: top; padding: 5px; }
        .col-left { width: 50%; border-right: 1px solid #ccc; }
        .col-right { width: 50%; padding-left: 10px; }
        
        .signature-area { margin-top: 50px; text-align: center; font-size: 14px; }
        .line { border-top: 1px solid black; width: 250px; margin: 0 auto 5px auto; }

    </style>

          <div class="doc-title">
            TERMO DE RECEBIMENTO E RESPONSABILIDADE COM EQUIPAMENTO DE RASTREAMENTO
        </div>

       <div class="doc-text">
            Por meio deste documento, eu, ${data.instaldor}, com cadastro no CPF de nº ${data.cpf}, RG ${data.rg},
            técnico de instalação de rastreadores, declaro que recebi os equipamentos correspondentes
            aos seguintes códigos:
       </div>

       <div class="doc-text">
            ${listaTexto}
       </div>

       <div class="doc-text">
            Me responsabilizo pelo seu bom uso e, caso o material não seja utilizado, asseguro devolvê-lo
            na sede da Associação BR CLUBE. Ao preencher assinar o presente termo, demonstro estar
            ciente das condições estabelecidas pela BR CLUBE. Declaro também estar ciente de que não
            há vínculo empregatício entre as partes, e que minha atuação se dará de forma independente,
            não caracterizando relação de emprego nos termos da legislação trabalhista vigente.
       </div>

        <div class="signature-area">
            <div style="text-align: right; margin-bottom: 40px;">Goiânia, ${dt_hoje}</div>
            
            <div class="line"></div>
            <div>Assinatura do(a) prestador(a)</div>
        </div>
          `
        },
      },
      {
        id: 'protocolo-instalar-rastreador',
        name: 'Protocolo: Agendar Instalação do Rastreador',
        parentId: 'tracking',
        fields: [
          { id: 'tipo_protocolo', label: 'Escolha o tipo de protocolo', type: 'select', options: [
            { value: 'instalacao', label: 'Instalação'},
            { value: 'desinstalacao', label: 'Desinstalação'},
            { value: 'manutencao', label: 'Manutenção'}
          ]},
          { id: 'local_instalado', label: 'Local Instalado', showIf: {field: 'tipo_protocolo', value: 'desinstalacao'}},
          //{ id: 'protocolo', label: 'Protocolo'},
          { id: 'nome', label: 'Nome Completo'},
          { id: 'cpf_cnpj', label: 'CPF/CNPJ'},
          { id: 'data_nasc', label: 'Data de Nascimento', type: 'date'},
          { id: 'email', label: 'E-mail'},
          { id: 'telefone', label: 'Telefone/Celular'},
          { id: 'genero', label: 'Gênero', type: 'select', options: [
            { value: 'masculino', label: 'Masculino'},
            { value: 'feminino', label: 'Feminino'}
          ]},
          { id: 'placa', label: 'Placa'},
          { id: 'veiculo', label: 'Veículo'},
          { id: 'cor', label: 'Cor'},
          { id: 'ano', label: 'Ano'},
          { id: 'renavam', label: 'RENAVAM'},
          { id: 'chassi', label: 'Chassi'},
          { id: 'imei', label: 'Nº do IMEI'},
          { id: 'plataforma', label: 'Plataforma'},
          { id: 'endereco', label: 'Endereço'},
          { id: 'data_horario', label: 'Data/Horário', type: 'datetime-local'},
          { id: 'tecnico', label: 'Técnico'}
        ],
        messageTemplate: (data : any) => {
          const dt_hr = formatDateTime(data.data_horario);
          const dtNasc = formatarData(data.data_nasc);
          const tipos: Record<string, string> = {
            'instalacao' : 'INSTALAÇÃO',
            'desinstalacao' : 'DESINSTALAÇÃO',
            'manutencao' : 'MANUTENÇÃO'
          }
          const tipoFormatado = tipos[data.tipo_protocolo] || 'SERVIÇO';
          return `*PROTOCOLO DE AGENDAMENTO PARA ${tipoFormatado} DE RASTREADOR*

*Protocolo:* ${data.protocolo || ''}

*Nome completo:* ${data.nome || ''}

*CPF/CNPJ:* ${data.cpf_cnpj || ''}

*Data de nascimento:* ${dtNasc || ''}

*E-mail:* ${data.email || ''}

*Telefone:* ${data.telefone || ''}

*Gênero:* ${data.genero || ''}

*Placa:* ${data.placa || ''}

*Modelo:* ${data.veiculo || ''}

*Cor:* ${data.cor || ''}

*Ano:* ${data.ano || ''}

*Renavam:* ${data.renavam || ''}

*Chassi:* ${data.chassi || ''}

*N.º do EMEI:* ${data.imei || ''}

*Plataforma:* ${data.plataforma || ''}

*Endereço:* ${data.endereco || ''}

*Data:* ${dt_hr || ''}

*Técnico:* ${data.tecnico || ''}
          `
        }
      },
      {
        id: 'orientacoes-rastreamento',
        name: 'Orientações pós-instalação',
        parentId: 'tracking',
        fields: [
          { id: 'associado', label: 'Nome do Associado', required: true },
          { id: 'login', label: 'Login de Acesso', required: true },
          { id: 'senha', label: 'Senha de Acesso', required: true },
          { id: 'plataforma', label: 'Plataforma', type: 'select', required: true, options: [
              { value: 'redeloc', label: 'RedeLoc' },
              { value: 'rastreie_brasil', label: 'Rastreie Brasil' },
              { value: 'locami', label: 'Locami' }
          ]},
          { id: 'os', label: 'Sistema Operacional do Cliente', type: 'select', required: true, options: [
              { value: 'android', label: 'Android' },
              { value: 'ios', label: 'iOS (iPhone)' },
              { value: 'indefinido', label: 'Enviar Ambos (Indefinido)' }
          ]}
        ],
        messageTemplate: (data: any) => {
          let plataforma = '';
          let link_android = '';
          let link_ios = '';
          let link_site = '';
          const os = data.os;

          // Configuração das URLs
          if (data.plataforma === 'redeloc'){
            plataforma = 'REDELOC';
            link_android = 'https://play.google.com/store/apps/details?id=org.logica.rastreamento.app';
            link_ios = 'https://apps.apple.com/br/app/logica-monitoramento/id1354154680';
            link_site = 'https://www.redeloc.com.br/';
          } else if(data.plataforma === 'rastreie_brasil'){
            plataforma = 'RASTREIE BRASIL';
            link_android = 'https://play.google.com/store/apps/details?id=org.logica.rastreiebrasil.app';
            link_ios = 'https://apps.apple.com/br/app/rastreie-brasil/id1508025177';
            link_site = 'https://rastreiebrasil2.rastreiebrasil.com.br/login/login';
          } else if(data.plataforma === 'locami'){
            plataforma = 'LOCAMI';
            link_android = 'https://play.google.com/store/apps/details?id=org.traccar.manager';
            link_ios = 'https://apps.apple.com/us/app/traccar-manager/id1113966562';
            link_site = ''; 
          }

          // Lógica dos Links de Download
          let linksDownload = '';
          if (os === 'android') {
             linksDownload = `Disponível para Android:\n${link_android}`;
          } else if (os === 'ios') {
             linksDownload = `Disponível para iOS:\n${link_ios}`; 
          } else {
             linksDownload = `Disponível para Android:\n${link_android}\n\nDisponível para iOS:\n${link_ios}`; 
          }

          // Instrução Específica Locami
          const instrucaoLocami = plataforma === 'LOCAMI' 
            ? `Ao abrir o aplicativo no seu celular, selecione o ícone de Globo para mudar o servidor. No campo servidor, insira o endereço: https://track.grupo360graus.com\nAgora é só salvar e pronto!\n` 
            : '';

          const linkSiteTexto = link_site ? `Acesse também pelo site: \n${link_site}` : '';

          // --- MONTAGEM DA MENSAGEM ---
          const mensagemBase = `Olá, ${data.associado}.
          
O seu equipamento de rastreador já foi instalado, e nós gostaríamos de te orientar sobre o procedimento de monitoramento do seu veículo. É muito simples!

1. O primeiro passo é baixar, na loja de aplicativos do seu celular, o app ${plataforma}.

${linksDownload}
${linkSiteTexto}

2. Após baixar o app, você poderá entrar no monitoramento do veículo utilizando seu login e senha no primeiro acesso.

LOGIN: ${data.login}
SENHA: ${data.senha}

${instrucaoLocami}
Pronto!

Seguindo as orientações acima você poderá usufruir das funcionalidades de rastreamento e monitoramento disponíveis.

Lembrando que o equipamento está sendo emprestado para prestar o serviço, sendo necessário a devolução e ou autorização para a retirada ao final do contrato, caso não seja autorizado, será cobrado o valor do equipamento conforme assinado no contrato.

Qualquer dúvida, chama a gente aqui.

Muito obrigado!

*Equipe BR Clube!*`;

          // --- INJEÇÃO DAS IMAGENS (SÓ SE FOR LOCAMI) ---
          if (plataforma === 'LOCAMI') {
            // Defina o caminho das suas imagens aqui (coloque na pasta public/images)
            const img1 = '/images/locami1.webp'; 
            const img2 = '/images/locami2.webp';

            // Retornamos HTML para renderizar as imagens
            // O 'white-space: pre-wrap' garante que os \n do texto acima funcionem mesmo sendo HTML
            return `
              <div style="white-space: pre-wrap; font-family: inherit;">${mensagemBase}</div>
              <div style="margin-top: 20px;">
                 <img src="${img1}" alt="Passo 1" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 1px solid #eee;" /><br>
                 <img src="${img2}" alt="Passo 2" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 1px solid #eee;" />
              </div>
            `;
          }

          return mensagemBase;
        }
      }
    ]
  }
];

export const DEPARTMENT_TEMPLATES: Record<DepartmentId, Template[]> = {
  home: [], assistance: [], registration: [], tracking: [], events: [], cancellations: [], billing: [], commercial: [], legal: [], financing: [],
  assistencia: []
};