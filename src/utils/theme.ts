export const getThemeStyles = (bgClass?: string) => {
  const colorMap = bgClass || 'cyan';

  if (colorMap.includes('rose') || colorMap.includes('red')) 
    return { text: 'group-hover:text-rose-600', border: 'hover:border-rose-400', bgLight: 'hover:bg-rose-50/50', bgSolid: 'group-hover:bg-rose-500' };
  if (colorMap.includes('orange')) 
    return { text: 'group-hover:text-orange-600', border: 'hover:border-orange-400', bgLight: 'hover:bg-orange-50/50', bgSolid: 'group-hover:bg-orange-500' };
  if (colorMap.includes('amber') || colorMap.includes('yellow')) 
    return { text: 'group-hover:text-amber-600', border: 'hover:border-amber-400', bgLight: 'hover:bg-amber-50/50', bgSolid: 'group-hover:bg-amber-500' };
  if (colorMap.includes('emerald') || colorMap.includes('green')) 
    return { text: 'group-hover:text-emerald-600', border: 'hover:border-emerald-400', bgLight: 'hover:bg-emerald-50/50', bgSolid: 'group-hover:bg-emerald-500' };
  if (colorMap.includes('blue')) 
    return { text: 'group-hover:text-blue-600', border: 'hover:border-blue-400', bgLight: 'hover:bg-blue-50/50', bgSolid: 'group-hover:bg-blue-500' };
  if (colorMap.includes('purple')) 
    return { text: 'group-hover:text-purple-600', border: 'hover:border-purple-400', bgLight: 'hover:bg-purple-50/50', bgSolid: 'group-hover:bg-purple-500' };
  if (colorMap.includes('black') || colorMap.includes('slate') || colorMap.includes('gray') || colorMap.includes('zinc')) 
    return { text: 'group-hover:text-slate-800', border: 'hover:border-slate-400', bgLight: 'hover:bg-slate-100', bgSolid: 'group-hover:bg-slate-800' };

  return { text: 'group-hover:text-cyan-600', border: 'hover:border-cyan-400', bgLight: 'hover:bg-cyan-50/50', bgSolid: 'group-hover:bg-cyan-500' };
};