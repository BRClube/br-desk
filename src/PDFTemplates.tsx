import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { textAlign } from 'html2canvas/dist/types/css/property-descriptors/text-align';
import header from './assets/header.png'
import footer from './assets/footer.png'
import assinatura from './assets/assinatura.png'
import { formatDateTime } from './utils/Formatters';
// --- 1. ESTILOS (Ajustados para os nomes que você usou no código) ---
const styles = StyleSheet.create({
  page: {
    paddingTop: 145,      // Espaço para o cabeçalho azul
    paddingBottom: 110,    // Espaço para o rodapé
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#000'
  },
  
  
  

  // --- ESTILOS ESPECÍFICOS DA TABELA DE PEÇAS ---
  tableContainer: {
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eee', // Cinza claro no cabeçalho
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    alignItems: 'center',
    height: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
    minHeight: 20,
    paddingVertical: 2,
  },
  // Colunas (Soma = 100%)
  colItem: { width: '10%', paddingLeft: 5 },
  colCod:  { width: '15%', paddingLeft: 5 },
  colProd: { width: '45%', paddingLeft: 5 }, // Produto ganha mais espaço
  colQtd:  { width: '10%', textAlign: 'center' },
  colVal:  { width: '20%', textAlign: 'right', paddingRight: 5 },
  
  // Texto pequeno para caber na tabela
  cellText: { fontSize: 9 },
  cellHeader: { fontSize: 9, fontWeight: 'bold' }, // Requer fonte bold registrada ou usar fontFamily específico

  // Cabeçalho e Rodapé Fixos
  headerFixed: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  footerFixed: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },

  // Títulos e Textos
  title: { // Você chamou de styles.title
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  paragraph: { // Você chamou de styles.paragraph
    marginBottom: 10,
    textAlign: 'justify',
    fontSize: 13,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
  },
  
  // Assinatura
  signatureBlock: { // Você chamou de styles.signatureBlock
    marginTop: 30,
    alignItems: 'center',
  },
  signatureLine: { // Você chamou de styles.signatureLine
    borderTopWidth: 1,
    borderTopColor: '#000',
    width: 300,
    marginBottom: 5,
  }
});

// --- COMPONENTES AUXILIARES ---

const BaseLayout = ({ children }: { children: React.ReactNode }) => (
  <Page size="A4" style={styles.page}>
    
    {/* CABEÇALHO */}
    <View style={styles.headerFixed} fixed>
      <Image 
        src={header} 
        style={{ 
          width: '100vw', // Força a largura TOTAL da folha
          // height: NÃO DEFINIR (Isso faz a altura ser automática/proporcional)
        }} 
      />
    </View>

    {children}

    {/* RODAPÉ */}
    <View style={styles.footerFixed} fixed>
      <Image 
        src={footer} 
        style={{ 
          width: '100vw', // Força a largura TOTAL da folha
          // height: NÃO DEFINIR
        }} 
      />
    </View>
  </Page>
);

const formatDate = (dateStr: string) => {
    if (!dateStr) return '___/___/____';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

// --- SEU TERMO NOVO (Com o texto correto) ---
export const TermoAcordoPDF = ({ data }: { data: any }) => {
  
  // Formatação segura de data e moeda
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '___/___/____';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };
  
  const formatMoney = (val: any) => {
    if (!val) return 'R$ 0,00';
    return `R$ ${parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const dtHoje = formatDate(data.data_hoje);
  const dtVenc = formatDate(data.data_vencimento_entrada);

  return (
    <Document>
      <BaseLayout>
        <Text style={styles.title}>
          TERMO ADITIVO N.º {data.numero_negociacao} AO INSTRUMENTO DE CONFISSÃO DE DÍVIDA N.º {data.numero_negociacao}
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>CREDOR(A):</Text> ASSOCIAÇÃO BR CLUBE DE BENEFÍCIOS, pessoa jurídica de direito privado,
          sem fins lucrativos, inscrita no CNPJ nº 40.410.992.0001/40 com sede na Av. Deputado Jamel
          Cecílio, nº 2496, andar 14 sala 141, Jardim Goiás, nesta capital, mentora da Associação Br
          clube de benefícios, sem fins lucrativos.
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>DEVEDOR(A):</Text> {data.nome_devedor}, Brasileira, Portador(a) do RG {data.rg} e do CPF: {data.cpf}, Residente e Domiciliado À {data.endereco}.
        </Text>

        <Text style={styles.paragraph}>
          As partes acima qualificadas querem retificar, como de fato RETIFICAM as cláusulas da
          Confissão de Dívida nº {data.numero_negociacao} referente oriunda da proteção veicular, nos termos que
          se seguem:
        </Text>

        <Text style={styles.paragraph}>
          As partes celebram a presente renegociação de forma livre e consciente, sendo a mesma
          decorrente do inadimplemento do(a) Devedor(a), referente parcelas em atraso, com valor
          total de <Text style={styles.bold}>{formatMoney(data.total_debito)}</Text>. O devedor solicitou o primeiro pagamento no valor de <Text style={styles.bold}>{formatMoney(data.valor_entrada)}</Text> e o
          pagamento posterior do saldo devedor remanescente em <Text style={styles.bold}>{data.parcelas_restantes}</Text> vezes de <Text style={styles.bold}>{formatMoney(data.valor_parcela)}</Text>. A proposta foi
          acatada pelo credor, que executou a cobrança da entrada, que deverá ser paga até o dia {dtVenc}, e fará cobrança do valor remanescente nos meses subsequentes, até completa quitação.
        </Text>

        <Text style={styles.paragraph}>
          As parcelas decorrentes do presente acordo são representadas por boletos bancários,
          entregues ao <Text style={styles.bold}>DEVEDOR(A)</Text> em datas próximas ao vencimento.
        </Text>

        <Text style={styles.paragraph}>
          Cumprida a condição de validade supracitada, o não pagamento de quaisquer das parcelas do
          presente acordo redundará no vencimento antecipado da dívida, facultando ao credor, imediato
          ajuizamento da Execução Judicial do Acordo, ficando ajustado uma multa de 10% (dez por
          cento), juros de 1% ao mês, honorários advocatícios de 05% (cinco) sobre o valor das parcelas
          não quitadas, além do pagamento de despesas administrativas e custas processuais, caso haja,
          independentemente de interpelação. Facultar-se-á à Credora, imediato ajuizamento da
          execução judicial do acordo, pois, a presente confissão de dívida é título executivo extrajudicial,
          nos exatos termos do artigo 784, inciso III, do Código de Processo Civil.
        </Text>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dtHoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          
          <Text style={styles.bold}>{data.nome_devedor}</Text>
          <Text style={{ fontSize: 10 }}>CPF: {data.cpf}</Text>

          {/* IMAGEM CORRIGIDA */}
          <Image 
             src={assinatura} 
             style={{ width: 150, height: 'auto', marginTop: 10 }}     
          />
        </View>

      </BaseLayout>
    </Document>
  );
};

export const TermoCancelamentoPDF = ({data}: {data: any}) => {
  
  

  const dt_cancelamento = formatDate(data.data_cancelamento);
  const dt_hoje = formatDate(data.data_hoje);

    return (
      <Document>
      <BaseLayout>
        <Text style={styles.title}>
          TERMO DE CANCELAMENTO
        </Text>

        <Text style={styles.paragraph}>
          Solicito que a partir do dia {dt_cancelamento}, o cancelamento da filiação do veículo abaixo descrito
          junto a Associação BR CLUBE DE BENEFÍCIOS. Ciente de que meu veículo se encontra
          partir desta data, sem qualquer cobertura, portanto, não mais poderei usufruir de qualquer
          vantagem oferecida pela BR CLUBE.
        </Text>

        <Text style={styles.title}>
          DADOS DO VEÍCULO
        </Text>

        <View style={[styles.paragraph, { textAlign: 'left'}, { flexDirection: 'column'}]}>
          
          <Text>Tipo: {data.tipo}</Text>
          <Text>Placa: {data.placa}</Text>
          <Text>Marca: {data.modelo}</Text>
          <Text>Chassi: {data.chassi}</Text>
          <Text>Renavam: {data.renavam}</Text>
          <Text>Cor: {data.cor}</Text>
          <Text>Ano Modelo: {data.ano_modelo}</Text>
          <Text>Ano Fabricação: {data.ano_fabricacao}</Text>
          <Text>Código FIPE: {data.fipe}</Text>

        </View>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          
          <Text style={styles.bold}>{data.nome_devedor}</Text>
          <Text style={{ fontSize: 10 }}>CPF: {data.cpf}</Text>

          {/* IMAGEM CORRIGIDA */}
          <Image 
             src={assinatura} 
             style={{ width: 150, height: 'auto', marginTop: 10 }}     
          />
        </View>

      </BaseLayout>
    </Document>
  );
};

export const EntregaVeiculoPDF = ({data}: { data: any}) => {

  const dt_inicio = formatDate(data.data_inicio);
  const dt_conclusao = formatDate(data.data_conclusao);
  const dt_hoje = formatDate(data.data_hoje);

  return (
    <Document>
      <BaseLayout>
        <Text style={styles.title}>
          TERMO DE ENTREGA DE VEÍCULO
        </Text>

        <View style={[styles.paragraph, { textAlign: 'left'}, { flexDirection: 'column'}]}>
          
          <Text>Responsável Pelo Veículo: {data.responsavel}</Text>
          <Text>CPF/CNPJ: {data.cpf_cnpj}</Text>
          <Text>Veículo: {data.veiculo}</Text>
          <Text>Ano: {data.ano}</Text>
          <Text>Placa: {data.placa}</Text>
          <Text>Data de Início dos Reparos: {dt_inicio}</Text>
          <Text>Data de Conclusão dos Reparos: {dt_conclusao}</Text>

        </View>

        <Text style={styles.paragraph}>
          Declaração:
        </Text>
        <Text style={styles.paragraph}>
          Recebi o veículo acima identificado, devidamente reparado dos danos sofridos de objeto de
          acidente de trânsito, outorgando a mais plena, rasa, irrevogável e irretratável quitação,
          passada, presente e futura, para nada mais reclamar, em Juízo ou fora dele, seja a que título
          for, renunciando expressamente a todo e qualquer outro direito que possa vir a ter em
          decorrência do evento.
        </Text>

        <Text style={styles.paragraph}>
          Sendo este termo assinado, a quitação é dada à Br Clube, oficina reparadora e ao causador
          do evento.
        </Text>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          
          <Text style={styles.bold}>{data.nome_devedor}</Text>
          <Text style={{ fontSize: 10 }}>ASSINATURA DO ASSOCIADO</Text>

          {/* IMAGEM CORRIGIDA */}
          {/* <Image 
             src={assinatura} 
             style={{ width: 150, height: 'auto', marginTop: 10 }}     
          /> */}
        </View>

      </BaseLayout>
    </Document>
  )


}

export const TermoAcordoAmparoPDF = ({data}: {data: any}) =>{
  const dt_hoje = formatDate(data.data_hoje);
  const dt_evento = formatDate(data.data_evento);
  return (
    <Document>
      <BaseLayout>
        <Text style={styles.title}>
          TERMO DE ACORDO E AMPARO
        </Text>

        <Text style={styles.paragraph}>
            Por este instrumento, a <Text style={styles.bold}>ASSOCIAÇÃO BR CLUBE DE BENEFÍCIOS</Text>, pessoa jurídica
            de direito privado, CNPJ no 40.410.992/0001-40, com sede na Avenida Deputado
            Jamel Cecílio, no 2496, Jardim Goiás, Município de Goiânia, Estado de Goiás, e, de
            outro lado, o terceiro, <Text style={styles.bold}>{data.terceiro}</Text>, brasileiro, inscrita sob o CPF
            no {data.cpf}, portador do RG no {data.rg} DGPC GO, ajustam, entre si, o
            seguinte termo de amparo:
        </Text>

        <Text style={[styles.paragraph, styles.bold]}>
          A BR CLUBE é um grupo associativo que realiza a divisão das despesas passadas e
          ocorridas entre seus membros. A ela recai a responsabilidade de amparar os danos
          sofridos e causados por seus associados, sendo, contudo, respeitados os limites e
          condições determinadas pelo Regulamento Interno e nos termos do Art. 421, do
          Código Civil.
        </Text>

        <Text style={styles.paragraph}>
          Considerando o evento de acidente de trânsito ocorrido em {dt_evento}, lavrado pelo
          Boletim de Ocorrência no {data.boletim_ocorrencia}, envolvendo o veículo do ASSOCIADO marca
          {data.marca}, modelo {data.modelo}, ano {data.ano}, placa {data.placa}, cor {data.cor}, a BR CLUBE
          compromete-se a reembolsar o terceiro <Text style={styles.bold}>{data.terceiro}</Text> no montante
          de R$ {data.valor} ({data.valor_extenso} reais), a fim de reiterar a boa-fé e o
          compromisso com o bom atendimento de nossos associados e terceiros.
        </Text>

        <Text style= {[{textAlign: 'left'}, styles.title]}>
          FORMA DE PAGAMENTO:
        </Text>

        <Text style={styles.paragraph}>
          A quitação do valor será realizada exclusivamente por meio de transferência via PIX,
          utilizando a chave PIX do terceiro, que corresponde à chave {data.pix}.
        </Text>

        <Text style={styles.paragraph}>
          Com o pagamento supracitado, o terceiro {data.terceiro}
          reconhece, com fulcro no Art. 320, do Código Civil, não ter mais direito algum além do
          que ora recebe, dando à BR CLUBE a mais plena, rasa, irrevogável e irretratável
          quitação quanto a todas as despesas originadas do evento noticiado no Boletim de
          Ocorrência acima referido, passada, presente e futura, para nada mais reclamar, em
          Juízo ou fora dele, seja a que título for, renunciando expressamente a todo e qualquer
          outro direito ou fato que possa vir a ter em decorrência do presente evento,
          responsabilizando-se integralmente por qualquer medida que o associado ou qualquer
          outro interessado venha a interpor face ao referido evento no que pertine ao referido
          veículo.
        </Text>

        <Text style={styles.paragraph}>
          Por fim, nos termos do Art. 104 do Código Civil, cumpre-se que ambas as partes são
          capazes e que o presente acordo ocorreu sem nenhum vício, reconhecendo que a BR
          CLUBE cumpriu integralmente o que se comprometeu por meio de seu Regulamento
          Interno, não tendo mais, ambas as partes, nada a reclamar, conforme já mencionado,
          em tempo algum, sobre os respectivos valores, títulos e condições.
        </Text>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          <Text style={{ fontSize: 10 }}>{data.terceiro}</Text>
          <Text style={{ fontSize: 10 }}>{data.cpf}</Text>

          {/* IMAGEM CORRIGIDA */}
          <Image 
             src={assinatura}
             style={{ width: 150, height: 'auto', marginTop: 10 }}     
          />
        </View>

      </BaseLayout>
    </Document>
  )

}

export const TermoRecebimentoRastreadorPDF = ({data }: {data: any }) => {

    const dt_hoje = formatDate(data.data_hoje);
    
  return (
    <Document>
      <BaseLayout>
        <Text style={styles.title}>
          TERMO DE RECEBIMENTO E RESPONSABILIDADE{"\n"}
          COM EQUIPAMENTO DE RASTREAMENTO
        </Text>

        <Text style={styles.paragraph}>
            Por meio deste documento, eu, {data.instalador}, com cadastro no CPF de n° {data.cpf}, RG
            {data.rg}, técnico de instalação de rastreadores, declaro que recebi os equipamentos
            correspondentes aos seguintes códigos:
        </Text>

        <View>
          <Text style={styles.title}>Lista de Equipamentos:</Text>

          {/* A Mágica acontece aqui: */}
          {(data.equipamentos || []).map((e: any, index: number) => (
              <Text key={index} style={styles.paragraph}>
                Equipamento {index + 1}: IMEI {e.imei}
              </Text>
          ))}

        </View>

        <Text style={styles.paragraph}>
          Me responsabilizo pelo seu bom uso e, caso o material não seja utilizado, asseguro devolvê-lo
          na sede da Associação BR CLUBE. Ao preencher assinar o presente termo, demonstro estar
          ciente das condições estabelecidas pela BR CLUBE. Declaro também estar ciente de que não
          há vínculo empregatício entre as partes, e que minha atuação se dará de forma independente,
          não caracterizando relação de emprego nos termos da legislação trabalhista vigente.

        </Text>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          <Text style={{ fontSize: 10 }}>Assinatura do(a) prestador(a)</Text>

          {/* IMAGEM CORRIGIDA */}
          {/* <Image 
             src={assinatura}
             style={{ width: 150, height: 'auto', marginTop: 10 }}     
          /> */}
        </View>

      </BaseLayout>
    </Document>
  )

}

export const RecebimentoPecasPDF = ({ data }: { data: any }) => {
  // Função auxiliar para data segura
  const formatDate = (d: string) => {
    if(!d) return '___/___/____';
    const p = d.split('-'); 
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };

  const dt_hoje = formatDate(data.data_hoje);
  const listaPecas = data.pecas || []; // Garante array vazio se não houver dados

  return (
    <Document>
      <BaseLayout>
        <Text style={styles.title}>
          TERMO DE ENTREGA E RECEBIMENTO DE PEÇAS
        </Text>

        <Text style={styles.paragraph}>
            Pelo presente instrumento, a Associação BR Clube de Benefícios, inscrita no
            CNPJ nº 40.410.992/0001-40, e a oficina abaixo identificada, firmam o presente
            Termo de Entrega e Recebimento de Peças, nos seguintes termos:  
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Nome do Responsável pelo Recebimento:</Text> {data.responsavel}
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>CPF:</Text> {data.cpf}
        </Text>

        <Text style={styles.paragraph}>
          {/* Corrigido para 'data.cargo' conforme seu fields */}
          <Text style={styles.bold}>Cargo/Função:</Text> {data.cargo} 
        </Text>

        <Text style={[styles.title, { fontSize: 12, marginTop: 15, marginBottom: 5 }]}>
          Identificação do Veículo
        </Text>

        <View style={{ marginBottom: 15 }}>
          <Text style={styles.paragraph}><Text style={styles.bold}>{data.terc_assoc === 'associado' ? 'Associado:' : 'Terceiro:'}</Text> {data.associado}</Text>
          <Text style={styles.paragraph}><Text style={styles.bold}>Placa do Veículo:</Text> {data.placa}</Text>
          <Text style={styles.paragraph}><Text style={styles.bold}>Marca/Modelo:</Text> {data.marca_modelo}</Text>
        </View>

        <Text style={[styles.title, { fontSize: 12, marginBottom: 5 }]}>Peças Entregues</Text>

        {/* --- INÍCIO DA TABELA --- */}
        <View style={styles.tableContainer}>
            
            {/* Cabeçalho */}
            <View style={styles.tableHeader}>
                <Text style={[styles.cellHeader, styles.colItem]}>ITEM</Text>
                <Text style={[styles.cellHeader, styles.colCod]}>CÓDIGO</Text>
                <Text style={[styles.cellHeader, styles.colProd]}>PRODUTO</Text>
                <Text style={[styles.cellHeader, styles.colQtd]}>QTD</Text>
                <Text style={[styles.cellHeader, styles.colVal]}>VALOR</Text>
            </View>

            {/* Linhas */}
            {listaPecas.map((peca: any, index: number) => (
                <View key={index} style={styles.tableRow} wrap={false}>
                    <Text style={[styles.cellText, styles.colItem]}>{peca.item || (index + 1)}</Text>
                    <Text style={[styles.cellText, styles.colCod]}>{peca.codigo}</Text>
                    <Text style={[styles.cellText, styles.colProd]}>{peca.produto}</Text>
                    <Text style={[styles.cellText, styles.colQtd]}>{peca.quantidade}</Text>
                    <Text style={[styles.cellText, styles.colVal]}>
                       {peca.valor ? `R$ ${peca.valor}` : ''}
                    </Text>
                </View>
            ))}

            {/* Mensagem se vazio */}
            {listaPecas.length === 0 && (
                <View style={[styles.tableRow, { justifyContent: 'center', padding: 10 }]}>
                    <Text style={{ fontSize: 10, fontStyle: 'italic' }}>Nenhuma peça listada.</Text>
                </View>
            )}

        </View>
        {/* --- FIM DA TABELA --- */}

        <Text style={[styles.title, { fontSize: 12, marginTop: 15 }]}>Declarações</Text>

        <Text style={styles.paragraph}>
          A Oficina declara que as peças entregues foram solicitadas previamente, de
          acordo com a necessidade técnica do reparo e que recebeu as peças em
          perfeitas condições, conferindo quantidade e descrição no ato da entrega. 
        </Text>

        <Text style={styles.paragraph}>
          A partir do recebimento, toda responsabilidade por perdas, danos ou
          substituições passa à oficina, não cabendo à BR Clube responsabilidade por
          quaisquer intercorrências.
        </Text>

        <Text style={styles.paragraph}>
          Este documento visa assegurar a rastreabilidade e a segurança da operação
          logística.
        </Text>


        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          {/* Se tiver imagem, descomente: */}
          {/* <Image src={assinatura} style={{ width: 150, height: 'auto' }} /> */}
          
          <View style={styles.signatureLine} />
          <Text style={[styles.bold, { fontSize: 11 }]}>{data.responsavel}</Text>
          <Text style={{ fontSize: 10 }}>{data.cargo}</Text>
          <Text style={{ fontSize: 10 }}>CPF: {data.cpf}</Text>
        </View>

      </BaseLayout>
    </Document>
  );
};


// Template de Cobrança (Mantenha se usar)
export const CobrancaPDF = ({ data }: { data: any }) => (
  <Document>
    <BaseLayout>
      <Text style={styles.title}>AVISO DE COBRANÇA</Text>
      <Text style={styles.paragraph}>Olá, {data.associado}. Segue seus boletos:</Text>
      {(data.boletos || []).map((b: any, i: number) => (
        <Text key={i} style={styles.paragraph}>
          Venc: {b.data_vencimento} - Valor: R$ {b.valor}
        </Text>
      ))}
    </BaseLayout>
  </Document>
);



export const ReciboPrestadorPDF = ({data}: { data: any}) => {

  const dt_hoje = formatDate(data.data_hoje);
  const dt_servico = formatDate(data.data_servico);
  return (
    <Document>
      <BaseLayout>
        <Text style={styles.title}>
          DECLARAÇÃO DE RECEBIMENTO
        </Text>

        <Text style={styles.paragraph}>
          Declaro, para os devidos fins, que {data.prestador}, {data.tipo_pessoa === 'pj' ? 'inscrito no CNPJ sob o n° ' : 'inscrito no CPF sob o n° '}{data.cnpj_cpf}, recebeu da Associação 
          BR CLUBE DE BENEFÍCIOS, inscrita no CNPJ sob o n° 40.410.992/0001-40, um 
          pagamento de R$ {data.valor} ({data.valor_extenso} reais), referente ao serviço de {data.servico} 
          para o(a) associado(a) {data.associado}, veículo de placa {data.placa}, serviço realizado dia {dt_servico}.
        </Text>

        <Text style={[styles.paragraph, {textAlign: 'left'}]}>
          Por ser verdade, assino
        </Text>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          
          
          <Text style={{ fontSize: 10 }}>{data.prestador}</Text>

          {/* IMAGEM CORRIGIDA */}
          {/* <Image 
             src={assinatura} 
             style={{ width: 150, height: 'auto', marginTop: 10 }}     
          /> */}
        </View>

      </BaseLayout>
    </Document>
  )


}

export const ReciboPagamentoEstagioPDF = ({data}: { data: any}) => {

  const dt_hoje = formatDate(data.data_hoje);

  return (
    <Document>
      <BaseLayout>
        <Text style={styles.title}>
          DECLARAÇÃO DE RECEBIMENTO
        </Text>

        <Text style={styles.paragraph}>
          Declaro, para os devidos fins, que {data.estagiario}, portador do CPF {data.cpf}, recebeu da Associação 
          BR CLUBE DE BENEFÍCIOS, inscrita no CNPJ sob o n° 40.410.992/0001-40, o pagamento da bolsa estágio 
          no valor de R$ {data.valor} ({data.valor_extenso} reais).
        </Text>

        <Text style={[styles.paragraph, {textAlign: 'left'}]}>
          Por ser verdade, assino
        </Text>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          
          
          <Text style={{ fontSize: 10 }}>{data.estagiario}</Text>

          {/* IMAGEM CORRIGIDA */}
          {/* <Image 
             src={assinatura} 
             style={{ width: 150, height: 'auto', marginTop: 10 }}     
          /> */}
        </View>

      </BaseLayout>
    </Document>
  )


}


export const ReciboPagamentoTransportePDF = ({data}: { data: any}) => {

  const dt_hoje = formatDate(data.data_hoje);

  return (
    <Document>
      <BaseLayout>
        <Text style={styles.title}>
          DECLARAÇÃO DE RECEBIMENTO
        </Text>

        <Text style={styles.paragraph}>
          Declaro, para os devidos fins, que {data.estagiario}, portador do CPF {data.cpf}, recebeu da Associação 
          BR CLUBE DE BENEFÍCIOS, inscrita no CNPJ sob o n° 40.410.992/0001-40, o pagamento do vale transporte 
          no valor de R$ {data.valor} ({data.valor_extenso} reais).
        </Text>

        <Text style={[styles.paragraph, {textAlign: 'left'}]}>
          Por ser verdade, assino
        </Text>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          
          
          <Text style={{ fontSize: 10 }}>{data.estagiario}</Text>

          {/* IMAGEM CORRIGIDA */}
          {/* <Image 
             src={assinatura}
             style={{ width: 150, height: 'auto', marginTop: 10 }}     
          /> */}
        </View>

      </BaseLayout>
    </Document>
  )


}


export const ReciboChequePDF = ({data}: { data: any}) => {

  const dt_hoje = formatDate(data.data_hoje);

  return (
    <Document>
      <BaseLayout>
        <Text style={styles.title}>
          DECLARAÇÃO DE RECEBIMENTO
        </Text>

        <Text style={styles.paragraph}>
          Declaro, para os devidos fins, que {data.prestador}, {data.tipo_pessoa === 'pj' ? 'inscrito no CNPJ sob o n° ' : 'inscrito no CPF sob o n° '}{data.cnpj_cpf}, recebeu da Associação 
          BR CLUBE DE BENEFÍCIOS, inscrita no CNPJ sob o n° 40.410.992/0001-40, um 
          cheque no valor de R$ {data.valor} ({data.valor_extenso} reais).
        </Text>

        <Text style={[styles.paragraph, {textAlign: 'left'}]}>
          Por ser verdade, assino
        </Text>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinatura */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          
          
          <Text style={{ fontSize: 10 }}>{data.prestador}</Text>

          {/* IMAGEM CORRIGIDA */}
          {/* <Image 
             src={assinatura}
             style={{ width: 150, height: 'auto', marginTop: 10 }}     
          /> */}
        </View>

      </BaseLayout>
    </Document>
  )


}

// export const TermoIndenizacaoPecuniaria = ({data}: { data: any}) => {

//   return (

//     <Document>
//       <BaseLayout>
//         <Text style={styles.title}>TERMO DE ACORDO E AMPARO</Text>

//         <Text style={styles.paragraph}>
//           Por este instrumento, a <Text style={styles.bold}>ASSOCIAÇÃO BR CLUBE DE BENEFÍCIOS</Text>, 
//           pessoa jurídica de direito privado, CNPJ nº 40.410.992/0001-40, com sede na Avenida Deputado Jamel Cecílio, 
//           2496, Jardim Goiás, Município de Goiânia, Estado de Goiás e, de outro lado, o terceiro, {data.terceiro}, 
//           brasileiro, inscrito sob o CPF nº {data.cpf}, C. l. 
//         </Text>

//       </BaseLayout>
//     </Document>

//   )

// }

export const TermoIndenizacaoPecuniaria = ({ data }: { data: any }) => {
  // Formatação de data simples caso venha do formulário
  const dt_hoje = data.data_hoje ? data.data_hoje.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
  const dt_evento = formatDate(data.data_evento);
  return (
    <Document>
      <BaseLayout>
        
        <Text style={styles.title}>
          TERMO DE ACORDO E AMPARO
        </Text>

        {/* 1. Preâmbulo e Qualificação das Partes */}
        <Text style={styles.paragraph}>
          Por este instrumento, a <Text style={styles.bold}>ASSOCIAÇÃO BR CLUBE DE BENEFÍCIOS</Text>, pessoa jurídica de direito privado,
          CNPJ n° 40.410.992/0001-40, com sede na Avenida Deputado Jamel Cecílio, 2496, Jardim Goiás,
          Município de Goiânia, Estado de Goiás e, de outro lado, o <Text style={styles.bold}>terceiro, {data.terceiro_nome}</Text>, 
          {data.terceiro_nacionalidade || 'brasileiro'}, inscrito sob o CPF n° {data.terceiro_cpf}, C.I. n° {data.terceiro_rg}, residente e domiciliado na 
          {data.terceiro_endereco}, ajustam, entre si, o seguinte termo de amparo:
        </Text>

        {/* 2. Contexto BR Clube (Texto Fixo) */}
        <Text style={styles.paragraph}>
          A Br Clube é um grupo associativo que realiza a divisão das despesas passadas e ocorridas entre seus
          membros. A ela recai a responsabilidade de amparar os danos sofridos e causados por seus
          associados, sendo, contudo, respeitados os limites e condições determinadas pelo Regulamento
          Interno e <Text style={styles.bold}>nos termos do Art. 421, do Código Civil.</Text>
        </Text>

        {/* 3. Dados do Evento/Veículo */}
        <Text style={styles.paragraph}>
          Considerando o(a) evento de acidente de trânsito ocorrido(a) em {dt_evento}, lavrado pelo Boletim
          de Ocorrência de nº {data.numero_boletim}, envolvendo o veículo do terceiro marca {data.veiculo_marca}, modelo {data.veiculo_modelo}, 
          ano {data.veiculo_ano}, placa {data.veiculo_placa}, cor {data.veiculo_cor}:
        </Text>

        {/* 4. Indenização e Pagamento */}
        <Text style={styles.paragraph}>
          A BR CLUBE, a título de indenização por todas as despesas ocorridas com o TERCEIRO e o veículo,
          realizará o pagamento do <Text style={styles.bold}>montante de R$ {data.valor_total} ({data.valor_extenso})</Text>, referente a
          indenização correspondente ao conserto do veículo. A quitação do valor se dará por meio de {data.condicoes_pagamento}.
        </Text>

        {/* 5. Quitação Legal */}
        <Text style={styles.paragraph}>
          Com o pagamento supracitado, o TERCEIRO <Text style={styles.bold}>{data.terceiro_nome}</Text>, reconhece, <Text style={styles.bold}>com fulcro no Art. 320, do Código Civil</Text>, não ter mais direito algum além do que ora recebe, dando à BR CLUBE a mais
          plena, rasa, irrevogável e irretratável quitação quanto a todas as despesas originadas do evento
          noticiado no Boletim de Ocorrência de nº {data.numero_boletim}, passada, presente e futura, para nada mais
          reclamar, em Juízo ou fora dele, seja a que título for, renunciando expressamente a todo e qualquer
          outro direito ou fato que possa vir a ter em decorrência do presente evento, responsabilizando-se
          integralmente por qualquer medida que terceiro ou qualquer outro interessado venha a interpor face
          ao referido evento no que pertine ao referido veículo.
        </Text>

        {/* 6. Capacidade Civil (Texto Fixo - Página 2) */}
        <Text style={styles.paragraph}>
          Por fim, <Text style={styles.bold}>nos termos do Art. 104 do Código Civil</Text>, cumpre-se que ambas as partes são capazes e que o
          presente acordo ocorreu sem nenhum vício, reconhecendo que a BR CLUBE, cumpriu integralmente o
          que se comprometeu por meio de seu Regulamento Interno, não tendo mais, ambas as partes, nada
          a reclamar, conforme já mencionado, em tempo algum sobre os respectivos valores, títulos e
          condições.
        </Text>

        {/* Data */}
        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        {/* Assinaturas */}
        <View style={{ marginTop: 20, flexDirection: 'column', gap: 40 }}>
          
          {/* Assinatura do Terceiro */}
          <View style={styles.signatureBlock} wrap={false}>
             {/* Local para assinatura digital Gov.br se houver imagem, ou linha padrão */}
             <View style={styles.signatureLine} />
             <Text style={[styles.paragraph, styles.bold]}>{data.terceiro_nome}</Text>
             <Text style={styles.paragraph}>TERCEIRO</Text>
          </View>

          {/* Assinatura BR Clube (Com imagem se disponível) */}
          <View style={styles.signatureBlock} wrap={false}>
            {/* Se tiver a imagem da assinatura da BR Clube salva no projeto: */}
            <Image 
             src={assinatura}
             style={{ width: 150, height: 'auto', marginTop: 10 }}/>
            <View style={styles.signatureLine} />
            <Text style={[styles.paragraph, styles.bold]}>ASSOCIAÇÃO BR CLUBE DE BENEFÍCIOS</Text>
          </View>

        </View>

      </BaseLayout>
    </Document>
  );
};


export const TermoQuitacaoEventoPDF = ({ data }: { data: any }) => {

  const dt_inicio = formatDate(data.data_inicio);
  const dt_conclusao = formatDate(data.data_conclusao);
  const dt_hoje = formatDate(data.data_hoje);

  return(
    <Document>
      <BaseLayout>

        <Text style={styles.title}>
          TERMO DE QUITAÇÃO DE EVENTO
        </Text>
        <Text style={styles.paragraph}>
          Responsável pelo veículo: {data.resposavel} {'\n'}
          CPF/CNPJ: {data.cpf_cnpj} {'\n'}
          Veículo: {data.veiculo} {'\n'}
          Ano: {data.ano} {'\n'}
          Placa: {data.placa} {'\n'}
          Data de início dos reparos: {dt_inicio} {'\n'}
          Data de conclusão dos reparos: {dt_conclusao} {'\n'}
        </Text>

        <Text style={styles.paragraph}>
          Declaração:
        </Text>

        <Text style={styles.paragraph}>
          Recebi o veículo acima identificado, devidamente reparado dos danos sofridos de objeto de
          acidente de trânsito, outorgando a mais plena, rasa, irrevogável e irretratável quitação,
          passada, presente e futura, para nada mais reclamar, em Juízo ou fora dele, seja a que título
          for, renunciando expressamente a todo e qualquer outro direito que possa vir a ter em
          decorrência do evento.
        </Text>

        <Text style={styles.paragraph}>
          Sendo este termo assinado, a quitação é dada à Br Clube, oficina reparadora e ao causador
          do evento.
        </Text>

        <Text style={[styles.paragraph, { textAlign: 'right', marginTop: 30 }]}>
          Goiânia, {dt_hoje}.
        </Text>

        <View style={styles.signatureBlock} wrap={false}>
            {/* Se tiver a imagem da assinatura da BR Clube salva no projeto: */}
            <Image 
             src={assinatura}
             style={{ width: 150, height: 'auto', marginTop: 10 }}/>
            <View style={styles.signatureLine} />
            <Text style={[styles.paragraph, styles.bold]}>ASSINATURA DO ASSOCIADO</Text>
          </View>

      </BaseLayout>
    </Document>
  );




};

// ============================================================================
// ETIQUETA DOS CORREIOS (SEM CABEÇALHO/RODAPÉ)
// ============================================================================
export const EtiquetaEnvioPDF = ({ data }: { data: any }) => {
  return (
    <Document>
      {/* Aqui usamos a página pura, sem o BaseLayout, para ficar em branco */}
      <Page size="A4" style={{ padding: 40, fontFamily: 'Helvetica', color: '#000' }}>
        
        {/* ETIQUETA DO DESTINATÁRIO (MAIOR) */}
        <View style={{ border: '1pt solid #666', padding: 20, borderRadius: 8, backgroundColor: '#fafafa' }}>
          <View style={{ alignItems: 'flex-start', marginBottom: 15 }}>
            {/* Logo puxando direto do seu link publicado no GitHub Pages */}
            <Image 
              src="src\assets\logo.png" 
              style={{ width: 100, height: 'auto' }} 
            />
          </View>
          <Text style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>
            Destinatário
          </Text>
          
          <Text style={{ fontSize: 12, marginBottom: 4, fontFamily: 'Helvetica' }}>Nome: {data.destinatario || ''}</Text>
          <Text style={{ fontSize: 10, marginBottom: 4 }}>Endereço: {data.endereco || ''}</Text>
          <Text style={{ fontSize: 10, marginBottom: 4 }}>CEP: {data.cep || ''}</Text>
        </View>

        {/* ETIQUETA DO REMETENTE (MENOR) */}
        <View style={{ border: '1pt solid #666', padding: 20, borderRadius: 8, backgroundColor: '#fafafa' }}>
          <View style={{ alignItems: 'flex-start', marginBottom: 15 }}>
            {/* Logo puxando direto do seu link publicado no GitHub Pages */}
            <Image 
              src="src\assets\logo.png" 
              style={{ width: 100, height: 'auto' }} 
            />
          </View>
          <Text style={{ fontSize: 14, color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>
            Remetente
          </Text>
          
          <Text style={{ fontSize: 12, marginBottom: 4, fontFamily: 'Helvetica-Bold' }}>ASSOCIAÇÃO BR CLUBE DE BENEFÍCIOS</Text>
          <Text style={{ fontSize: 10, marginBottom: 4 }}>Edifício New Business Style: Sala 141-A</Text>
          <Text style={{ fontSize: 10, marginBottom: 4 }}>Av. Dep. Jamel Cecílio, 2496 - Jardim Goiás, Goiânia - GO.</Text>
          <Text style={{ fontSize: 10 }}>CEP: 74810-100 | Telefone: 4020-0164</Text>
        </View>

      </Page>
    </Document>
  );
};