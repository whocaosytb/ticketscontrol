import { addHours, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export type Abrangencia = 'Empresa' | 'Setor' | 'Colaborador';
export type Prioridade = 'Alta' | 'Média' | 'Baixa' | 'Melhoria';
export type Status = 'Aberto' | 'Aguardando' | 'Resolvido' | 'Cancelado';
export type TipoChamado = 'Incidente' | 'Solicitação' | 'Melhoria';

const TIMEZONE = 'America/Sao_Paulo';

export const getBrazilTime = (date: Date = new Date()) => {
  return toZonedTime(date, TIMEZONE);
};

export const calculateSLA = (
  abrangencia: Abrangencia,
  prioridade: Prioridade,
  tipo: TipoChamado,
  startDate: Date
): Date => {
  if (tipo === 'Melhoria' || prioridade === 'Melhoria') {
    // Melhorias não têm SLA, retornamos uma data muito distante ou nula
    return addDays(startDate, 365 * 10); 
  }

  let hoursToAdd = 0;

  if (abrangencia === 'Empresa') {
    if (prioridade === 'Alta') hoursToAdd = 2;
    else if (prioridade === 'Média') hoursToAdd = 4;
    else hoursToAdd = 8;
  } else if (abrangencia === 'Setor') {
    if (prioridade === 'Alta') hoursToAdd = 4;
    else if (prioridade === 'Média') hoursToAdd = 8;
    else hoursToAdd = 24;
  } else if (abrangencia === 'Colaborador') {
    if (prioridade === 'Alta') hoursToAdd = 24;
    else if (prioridade === 'Média') hoursToAdd = 48;
    else hoursToAdd = 72;
  }

  return addHours(startDate, hoursToAdd);
};

export const formatVisualId = (id: number) => {
  return `#${id.toString().padStart(5, '0')}`;
};

export const minutesToFormat = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}`;
};

export const formatToMinutes = (str: string): number => {
  if (!str) return 0;
  const cleaned = str.toLowerCase().replace(/\s/g, '');
  
  // Format: 00h00
  const match = cleaned.match(/(\d+)h(\d+)/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  
  // Format: 00h
  const onlyH = cleaned.match(/(\d+)h/);
  if (onlyH) {
    return parseInt(onlyH[1], 10) * 60;
  }
  
  // Format: 00m or just 00
  const onlyM = cleaned.match(/(\d+)m/);
  if (onlyM) {
    return parseInt(onlyM[1], 10);
  }
  
  return parseInt(cleaned, 10) || 0;
};
