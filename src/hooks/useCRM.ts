import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Ticket } from '../components/FormComponents';

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;
const WEBHOOKS = {
  PADRAO: "https://chat.googleapis.com/v1/spaces/AAQA_9VXbIs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=xYp-47r0nPVdhG8o2MDBdnnhfDDpz-XV78N0OP91oyw",
};

export function useCRM() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Carrega os tickets da planilha
  const loadTickets = useCallback(async () => {
    const identificador = profile?.full_name || profile?.email;
    if (!identificador) return;

    setIsLoadingTickets(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        redirect: "follow",
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: 'listar_atendimentos',
          atendente: identificador,
          token_acesso: API_TOKEN
        })
      });
      const text = await response.text();
      const jsonString = text.match(/\{[\s\S]*\}/)?.[0];
      if (jsonString) {
        const data = JSON.parse(jsonString);
        if (data.status === 'sucesso') setTickets(data.lista);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar tickets:", error);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [profile]);

  // Atualiza automaticamente a cada 60 segundos
  useEffect(() => {
    if (profile?.email) {
      loadTickets();
      const interval = setInterval(loadTickets, 60000);
      return () => clearInterval(interval);
    }
  }, [profile, loadTickets]);

  // Função de Webhooks
  const handleSendWebhook = async (protocolo: string, tipo: string, dadosExtras?: string, fieldUpdate?: { key: string, value: string }) => {
    if (fieldUpdate) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: 'salvar_ou_atualizar', protocolo, [fieldUpdate.key]: fieldUpdate.value, token_acesso: API_TOKEN })
        });
      } catch (e) { console.error("Erro ao salvar dado na planilha.", e); }
    }

    const url = WEBHOOKS.PADRAO;
    if (!url) return;

    let mensagemFinal = "";
    switch (tipo) {
      case 'PRESTADOR_CAMINHO': mensagemFinal = `🚀 *Prestador A Caminho*\nProtocolo: ${protocolo}\nHorário de Saída: ${dadosExtras}`; break;
      case 'NO_LOCAL': mensagemFinal = `📍 *Prestador No Local*\nProtocolo: ${protocolo}\nHorário de Chegada: ${dadosExtras}`; break;
      case 'PREVISAO': mensagemFinal = `⏳ *Previsão Atualizada*\nProtocolo: ${protocolo}\nNova Previsão: ${dadosExtras}`; break;
      case 'FINALIZADO': mensagemFinal = `✅ *Atendimento Finalizado*\nProtocolo: ${protocolo}`; break;
      case 'CUSTOM': mensagemFinal = `💬 *Mensagem da Central*\nProtocolo: ${protocolo}\nObs: ${dadosExtras}`; break;
      default: mensagemFinal = `🔔 *Atualização*\nProtocolo: ${protocolo}\nStatus: ${tipo}`;
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ text: mensagemFinal })
      });
      alert(`Status enviado e atualizado com sucesso!`);
    } catch (e) { alert("Erro ao enviar webhook."); }
  };

  // Função de Upload
  const handleFileUpload = async (protocolo: string, files: File[], onSuccess: () => void) => {
    setIsUploading(true);
    try {
      const promises = files.map(file => new Promise<{ nome: string, mimeType: string, conteudo: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ nome: file.name, mimeType: file.type, conteudo: reader.result?.toString().replace(/^data:(.*,)?/, '') || '' });
        reader.onerror = error => reject(error);
      }));

      const arquivosProcessados = await Promise.all(promises);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'upload_arquivo', protocolo, arquivos: arquivosProcessados, token_acesso: API_TOKEN })
      });

      const text = await response.text();
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);

      if (json.status === 'sucesso') {
        alert(`✅ ${json.msg}`);
        onSuccess();
      } else {
        alert("Erro ao enviar: " + json.msg);
      }
    } catch (error) {
      alert("Erro de conexão ao enviar arquivos.");
    } finally {
      setIsUploading(false);
    }
  };

  return { tickets, isLoadingTickets, loadTickets, isUploading, handleSendWebhook, handleFileUpload };
}