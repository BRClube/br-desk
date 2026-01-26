import { DEPARTMENTS } from '../constants'; // Importa seu arquivo original

// Extrai apenas o ID e o Nome para mostrar na tela de gestão
export const getAvailableModules = () => {
  return DEPARTMENTS.map(dept => ({
    id: dept.id,   // Ex: 'assistance'
    name: dept.name, // Ex: 'Assistência 24H'
    icon: dept.icon  // Ex: 'fa-truck-medical'
  }));
};

// Verifica se o usuário tem permissão
export const checkPermission = (userModules: string[] | undefined, moduleId: string) => {
  if (!userModules) return false;
  // Se tiver '*' é Super Admin, libera tudo
  if (userModules.includes('*')) return true;
  return userModules.includes(moduleId);
};