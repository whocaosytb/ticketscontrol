import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Setor } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, Trash2, Moon, Sun, Settings, LayoutGrid } from 'lucide-react';

export const Controls: React.FC = () => {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [newSetor, setNewSetor] = useState('');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetchSetores();
  }, []);

  const fetchSetores = async () => {
    const { data } = await supabase.from('setores').select('*').order('nome');
    if (data) setSetores(data);
  };

  const handleAddSetor = async () => {
    if (!newSetor.trim()) return;
    const { error } = await supabase.from('setores').insert({ nome: newSetor });
    if (error) alert('Erro ao adicionar setor: ' + error.message);
    else {
      setNewSetor('');
      fetchSetores();
    }
  };

  const handleDeleteSetor = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este setor?')) {
      const { error } = await supabase.from('setores').delete().eq('id', id);
      if (error) alert('Erro ao excluir: ' + error.message);
      else fetchSetores();
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Controles</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Theme Control */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
              <Settings size={20} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Aparência</h3>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {theme === 'light' ? <Sun className="text-amber-500" /> : <Moon className="text-blue-400" />}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Tema {theme === 'light' ? 'Claro' : 'Escuro'}
              </span>
            </div>
            <button 
              onClick={toggleTheme}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-300 dark:bg-blue-600 transition-colors focus:outline-none"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Sectors Control */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
              <LayoutGrid size={20} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Gerenciar Setores</h3>
          </div>

          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Nome do novo setor..." 
              className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              value={newSetor}
              onChange={(e) => setNewSetor(e.target.value)}
            />
            <button 
              onClick={handleAddSetor}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={24} />
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {setores.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 group">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.nome}</span>
                <button 
                  onClick={() => handleDeleteSetor(s.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {setores.length === 0 && <p className="text-center text-slate-500 py-4">Nenhum setor cadastrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
