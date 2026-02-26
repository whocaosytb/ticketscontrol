import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Chamado } from '../types';
import { formatVisualId } from '../lib/utils';
import { X, AlertTriangle, Clock } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';

export const SLAAlertPopup: React.FC = () => {
  const [vencidos, setVencidos] = useState<Chamado[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem('sla_alert_shown');
    if (!hasShown) {
      fetchVencidos();
    }
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const fetchVencidos = async () => {
    const now = new Date();
    const { data } = await supabase
      .from('chamados')
      .select('*')
      .in('status', ['Aberto', 'Aguardando']);

    if (data) {
      const filtered = data.filter(c => {
        const slaDate = new Date(c.sla_atual);
        const hoursLeft = differenceInHours(slaDate, now);
        return hoursLeft <= 30; // Vencidos ou vencendo em 30h
      });

      if (filtered.length > 0) {
        setVencidos(filtered);
        setIsOpen(true);
        sessionStorage.setItem('sla_alert_shown', 'true');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-6 bg-red-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} />
            <h2 className="text-xl font-bold">Chamados requerentes de atenção</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Os seguintes chamados estão vencidos ou vencem em menos de 30h:
          </p>
          
          <div className="space-y-3">
            {vencidos.map(c => (
              <div key={c.uuid} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-slate-500">{formatVisualId(c.id_visual)}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{c.titulo}</span>
                </div>
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs">
                  <Clock size={14} />
                  {format(new Date(c.sla_atual), 'dd/MM HH:mm')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button 
            onClick={() => setIsOpen(false)}
            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
