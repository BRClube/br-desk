// src/utils/formatters.ts

export const formatDateTime = (dateString: string | undefined | null) => {
  if (!dateString) return ''; // Retorna vazio se não tiver data
  
  try {
    const date = new Date(dateString);
    // Verifica se a data é válida
    if (isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date).replace(',', ' às'); // Ex: 04/02/2026 às 15:30
  } catch (e) {
    return dateString || '';
  }
};