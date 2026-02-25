import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Chamado, Setor, Status, TipoChamado } from '../types';
import { formatVisualId } from '../lib/utils';
import { format } from 'date-fns';
import { 
  Search, Filter, ChevronUp, ChevronDown, MoreVertical, 
  Trash2, Edit, MessageSquare, Plus, X
} from 'lucide-react';
import { TicketModal } from './TicketModal';

export const TicketList: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    tipo: '',
    setor: '',
    date: ''
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Chamado; direction: 'asc' | 'desc' }>({
    key: 'id_visual',
    direction: 'desc'
  });
  const [selectedTicket, setSelectedTicket] = useState<Chamado | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [chamadosRes, setoresRes] = await Promise.all([
      supabase.from('chamados').select('*, setores(nome)').order('id_visual', { ascending: false }),
      supabase.from('setores').select('*')
    ]);

    if (chamadosRes.data) setChamados(chamadosRes.data);
    if (setoresRes.data) setSetores(setoresRes.data);
    setLoading(false);
  };

  const handleSort = (key: keyof Chamado) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleDelete = async (uuid: string, status: Status) => {
    if (status === 'Resolvido' || status === 'Cancelado' || status === 'Fechado') {
      alert('Chamados finalizados ou fechados não podem ser excluídos.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir este chamado?')) {
      const { error } = await supabase.from('chamados').delete().eq('uuid', uuid);
      if (error) alert('Erro ao excluir: ' + error.message);
      else fetchData();
    }
  };

  const filteredChamados = chamados.filter(c => {
    const matchesSearch = c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.id_visual.toString().includes(searchTerm) ||
                          c.usuario.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filters.status || c.status === filters.status;
    const matchesTipo = !filters.tipo || c.tipo === filters.tipo;
    const matchesSetor = !filters.setor || c.setor_id === filters.setor;
    const matchesDate = !filters.date || format(new Date(c.data_abertura), 'yyyy-MM-dd') === filters.date;

    return matchesSearch && matchesStatus && matchesTipo && matchesSetor && matchesDate;
  }).sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (!aVal || !bVal) return 0;
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Lista de Chamados</h1>
        <button 
          onClick={() => setIsNewTicketModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          Novo Chamado
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por título, ID ou usuário..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <select 
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Status: Todos</option>
              <option value="Aberto">Aberto</option>
              <option value="Aguardando">Aguardando</option>
              <option value="Resolvido">Resolvido</option>
              <option value="Cancelado">Cancelado</option>
              <option value="Fechado">Fechado</option>
            </select>
            <select 
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white"
              value={filters.tipo}
              onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value }))}
            >
              <option value="">Tipo: Todos</option>
              <option value="Incidente">Incidente</option>
              <option value="Solicitação">Solicitação</option>
              <option value="Melhoria">Melhoria</option>
            </select>
            <select 
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white"
              value={filters.setor}
              onChange={(e) => setFilters(prev => ({ ...prev, setor: e.target.value }))}
            >
              <option value="">Setor: Todos</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <input 
              type="date" 
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
            />
            {(filters.status || filters.tipo || filters.setor || filters.date) && (
              <button 
                onClick={() => setFilters({ status: '', tipo: '', setor: '', date: '' })}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-bottom border-slate-200 dark:border-slate-800">
                <SortableHeader label="ID" sortKey="id_visual" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Data Abertura" sortKey="data_abertura" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Título" sortKey="titulo" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Descrição" sortKey="descricao" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Usuário" sortKey="usuario" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Setor" sortKey="setor_id" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Previsão" sortKey="previsao" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Responsável" sortKey="responsavel" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Fechamento" sortKey="data_fechamento" currentSort={sortConfig} onSort={handleSort} />
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredChamados.map((c) => (
                <tr 
                  key={c.uuid} 
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all cursor-pointer ${
                    (c.status === 'Cancelado' || c.status === 'Fechado') ? 'opacity-50 grayscale-[0.5]' : ''
                  }`}
                  onClick={() => setSelectedTicket(c)}
                >
                  <td className="px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-400">{formatVisualId(c.id_visual)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{format(new Date(c.data_abertura), 'dd/MM/yy HH:mm')}</td>
                  <td className="px-3 py-2 text-xs font-medium text-slate-900 dark:text-white max-w-[150px] truncate">{c.titulo}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{c.descricao || '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{c.usuario}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{(c as any).setores?.nome || '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{c.previsao ? format(new Date(c.previsao), 'dd/MM/yy') : '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{c.responsavel}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{c.data_fechamento ? format(new Date(c.data_fechamento), 'dd/MM/yy') : '-'}</td>
                  <td className="px-3 py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-3 justify-center">
                      <button 
                        onClick={() => setSelectedTicket(c)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.uuid, c.status)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredChamados.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">Nenhum chamado encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {(selectedTicket || isNewTicketModalOpen) && (
        <TicketModal 
          ticket={selectedTicket} 
          isOpen={true} 
          onClose={() => {
            setSelectedTicket(null);
            setIsNewTicketModalOpen(false);
            fetchData();
          }} 
          setores={setores}
        />
      )}
    </div>
  );
};

const SortableHeader: React.FC<{ 
  label: string; 
  sortKey: keyof Chamado; 
  currentSort: { key: string; direction: string }; 
  onSort: (key: any) => void 
}> = ({ label, sortKey, currentSort, onSort }) => (
  <th 
    className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
    onClick={() => onSort(sortKey)}
  >
    <div className="flex items-center gap-1">
      {label}
      {currentSort.key === sortKey ? (
        currentSort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
      ) : null}
    </div>
  </th>
);

const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
  const styles = {
    'Aberto': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Aguardando': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Resolvido': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Cancelado': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    'Fechado': 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
};
