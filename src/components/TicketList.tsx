import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Chamado, Setor, Status, TipoChamado } from '../types';
import { formatVisualId, minutesToFormat } from '../lib/utils';
import { format } from 'date-fns';
import { 
  Search, Filter, ChevronUp, ChevronDown, MoreVertical, 
  Trash2, Edit, MessageSquare, Plus, X, AlertTriangle
} from 'lucide-react';
import { TicketModal } from './TicketModal';

export const TicketList: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    statuses: [] as Status[],
    tipos: [] as TipoChamado[],
    setores: [] as string[],
    startDate: '',
    endDate: ''
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Chamado; direction: 'asc' | 'desc' }>({
    key: 'id_visual',
    direction: 'desc'
  });
  const [selectedTicket, setSelectedTicket] = useState<Chamado | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isTipoFilterOpen, setIsTipoFilterOpen] = useState(false);
  const [isSetorFilterOpen, setIsSetorFilterOpen] = useState(false);

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.status-filter-container')) setIsStatusFilterOpen(false);
      if (!target.closest('.tipo-filter-container')) setIsTipoFilterOpen(false);
      if (!target.closest('.setor-filter-container')) setIsSetorFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [chamadosRes, setoresRes] = await Promise.all([
      supabase.from('chamados').select('*, setores(nome)').order('id_visual', { ascending: false }),
      supabase.from('setores').select('*').order('nome', { ascending: true })
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
    const searchLower = searchTerm.toLowerCase();
    const sectorName = (c as any).setores?.nome?.toLowerCase() || '';
    const formattedTime = minutesToFormat(c.tempo_gasto).toLowerCase();
    
    const matchesSearch = 
      c.titulo.toLowerCase().includes(searchLower) || 
      c.id_visual.toString().includes(searchTerm) ||
      c.usuario.toLowerCase().includes(searchLower) ||
      (c.descricao || '').toLowerCase().includes(searchLower) ||
      c.responsavel.toLowerCase().includes(searchLower) ||
      formattedTime.includes(searchLower) ||
      sectorName.includes(searchLower);
    
    const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(c.status);
    const matchesTipo = filters.tipos.length === 0 || filters.tipos.includes(c.tipo);
    const matchesSetor = filters.setores.length === 0 || filters.setores.includes(c.setor_id);
    
    let matchesDate = true;
    if (filters.startDate || filters.endDate) {
      const openingDate = new Date(c.data_abertura);
      openingDate.setHours(0, 0, 0, 0);
      
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (openingDate < start) matchesDate = false;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (openingDate > end) matchesDate = false;
      }
    }

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
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Lista de Chamados</h1>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-sla-alert'))}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-bold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors shadow-sm border border-amber-200 dark:border-amber-800 cursor-pointer"
          >
            <AlertTriangle size={16} />
            Alertas SLA
          </button>
        </div>
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
              placeholder="Pesquisar por título, ID ou setor..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Status Filter */}
            <div className="relative status-filter-container">
              <button 
                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white min-w-[140px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Filter size={16} className="text-slate-400" />
                <span>{filters.statuses.length === 0 ? 'Status: Todos' : `Status: ${filters.statuses.length}`}</span>
                <ChevronDown size={14} className={`ml-auto transition-transform ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isStatusFilterOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 p-2 animate-in zoom-in-95 duration-200">
                  {['Aberto', 'Aguardando', 'Resolvido', 'Cancelado', 'Fechado'].map((status) => (
                    <label key={status} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={filters.statuses.includes(status as Status)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFilters(prev => ({
                            ...prev,
                            statuses: checked 
                              ? [...prev.statuses, status as Status]
                              : prev.statuses.filter(s => s !== status)
                          }));
                        }}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{status}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Tipo Filter */}
            <div className="relative tipo-filter-container">
              <button 
                onClick={() => setIsTipoFilterOpen(!isTipoFilterOpen)}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white min-w-[140px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Filter size={16} className="text-slate-400" />
                <span>{filters.tipos.length === 0 ? 'Tipo: Todos' : `Tipo: ${filters.tipos.length}`}</span>
                <ChevronDown size={14} className={`ml-auto transition-transform ${isTipoFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isTipoFilterOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 p-2 animate-in zoom-in-95 duration-200">
                  {['Incidente', 'Solicitação', 'Melhoria'].map((tipo) => (
                    <label key={tipo} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={filters.tipos.includes(tipo as TipoChamado)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFilters(prev => ({
                            ...prev,
                            tipos: checked 
                              ? [...prev.tipos, tipo as TipoChamado]
                              : prev.tipos.filter(t => t !== tipo)
                          }));
                        }}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{tipo}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Setor Filter */}
            <div className="relative setor-filter-container">
              <button 
                onClick={() => setIsSetorFilterOpen(!isSetorFilterOpen)}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white min-w-[140px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Filter size={16} className="text-slate-400" />
                <span>{filters.setores.length === 0 ? 'Setor: Todos' : `Setor: ${filters.setores.length}`}</span>
                <ChevronDown size={14} className={`ml-auto transition-transform ${isSetorFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isSetorFilterOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 p-2 animate-in zoom-in-95 duration-200 max-h-[300px] overflow-y-auto">
                  {setores.map((setor) => (
                    <label key={setor.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={filters.setores.includes(setor.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFilters(prev => ({
                            ...prev,
                            setores: checked 
                              ? [...prev.setores, setor.id]
                              : prev.setores.filter(id => id !== setor.id)
                          }));
                        }}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{setor.nome}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
              <input 
                type="date" 
                className="bg-transparent border-none text-xs outline-none dark:text-white p-1"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
              <span className="text-slate-400 text-[10px] uppercase font-bold">até</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-xs outline-none dark:text-white p-1"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            {(filters.statuses.length > 0 || filters.tipos.length > 0 || filters.setores.length > 0 || filters.startDate || filters.endDate) && (
              <button 
                onClick={() => setFilters({ statuses: [], tipos: [], setores: [], startDate: '', endDate: '' })}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                title="Limpar Filtros"
              >
                <X size={18} />
                <span className="hidden sm:inline">Limpar</span>
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
                <SortableHeader label="Tempo Gasto" sortKey="tempo_gasto" currentSort={sortConfig} onSort={handleSort} />
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
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{minutesToFormat(c.tempo_gasto) || '-'}</td>
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
          onOpenTicket={async (id) => {
            const { data } = await supabase.from('chamados').select('*, setores(nome)').eq('id_visual', id).single();
            if (data) setSelectedTicket(data);
          }}
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
