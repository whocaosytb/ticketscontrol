import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check, X } from 'lucide-react';

interface DurationPickerProps {
  value: number | null;
  onChange: (minutes: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DurationPicker: React.FC<DurationPickerProps> = ({ value, onChange, isOpen, onClose }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== null) {
      setHours(Math.floor(value / 60));
      setMinutes(value % 60);
    } else {
      setHours(0);
      setMinutes(0);
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onChange(hours * 60 + minutes);
    onClose();
  };

  const hoursList = Array.from({ length: 100 }, (_, i) => i);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-[320px] overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Clock className="w-5 h-5 text-blue-500" />
            <span>Tempo Gasto</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex justify-center items-center gap-4">
            {/* Hours Column */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Horas</span>
              <div className="relative h-40 w-20 overflow-y-auto scrollbar-hide snap-y snap-mandatory bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                {/* Selection Overlay */}
                <div className="absolute top-1/2 left-0 right-0 h-8 -translate-y-1/2 bg-blue-500/10 dark:bg-blue-400/10 border-y border-blue-500/20 pointer-events-none" />
                
                <div className="h-16" /> {/* Spacer */}
                {hoursList.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHours(h)}
                    className={`h-8 w-full flex items-center justify-center snap-center transition-all duration-200 ${
                      hours === h 
                        ? 'text-2xl font-bold text-blue-600 dark:text-blue-400 scale-110 z-10' 
                        : 'text-slate-400 dark:text-slate-600 hover:text-slate-500'
                    }`}
                  >
                    {h.toString().padStart(2, '0')}
                  </button>
                ))}
                <div className="h-16" /> {/* Spacer */}
              </div>
            </div>

            <div className="text-3xl font-light text-slate-300 dark:text-slate-700 mt-6">:</div>

            {/* Minutes Column */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Minutos</span>
              <div className="relative h-40 w-20 overflow-y-auto scrollbar-hide snap-y snap-mandatory bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                {/* Selection Overlay */}
                <div className="absolute top-1/2 left-0 right-0 h-8 -translate-y-1/2 bg-blue-500/10 dark:bg-blue-400/10 border-y border-blue-500/20 pointer-events-none" />

                <div className="h-16" /> {/* Spacer */}
                {minutesList.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    className={`h-8 w-full flex items-center justify-center snap-center transition-all duration-200 ${
                      minutes === m 
                        ? 'text-2xl font-bold text-blue-600 dark:text-blue-400 scale-110 z-10' 
                        : 'text-slate-400 dark:text-slate-600 hover:text-slate-500'
                    }`}
                  >
                    {m.toString().padStart(2, '0')}
                  </button>
                ))}
                <div className="h-16" /> {/* Spacer */}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <div className="text-center py-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total: </span>
              <span className="text-xl font-mono font-bold text-blue-700 dark:text-blue-300">
                {hours.toString().padStart(2, '0')}h{minutes.toString().padStart(2, '0')}
              </span>
            </div>
            
            <button
              onClick={handleConfirm}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Confirmar Tempo
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
