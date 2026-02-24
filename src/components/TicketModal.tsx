import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Chamado, Setor, Status, TipoChamado, Abrangencia, Prioridade, Observacao, TipoObservacao } from '../types';
import { calculateSLA, formatVisualId, getBrazilTime } from '../lib/utils';
import { X, Send, Clock, User, Tag, AlertCircle, Info, CheckCircle, Trash2, MessageSquare } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface TicketModalProps {
  ticket: Chamado | null;
  isOpen: boolean;
  onClose: () => void;
  setores: Setor[];
}

export const TicketModal: React.FC<TicketModalProps> = ({ ticket, isOpen, onClose, setores }) => {
  const [formData, setFormData] = useState<Partial<Chamado>>({
    titulo: '',
    descricao: '',
    tipo: 'Solicitação',
    abrangencia: 'Colaborador',
    prioridade: 'Baixa',
    setor_id: setores[0]?.id || '',
    status: 'Aberto',
    usuario: 'Admin',
    responsavel: 'Admin',
    previsao: null
  });

  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [newObs, setNewObs] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket) {
      setFormData(ticket);
      fetchObservacoes(ticket.uuid);
    }
  }, [ticket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [observacoes]);

  const fetchObservacoes = async (chamadoId: string) => {
    const { data } = await supabase
      .from('observacoes')
      .select('*')
      .order('data_criacao', { ascending: true })
      .eq('chamado_id', chamadoId);
    if (data) setObservacoes(data);
  };

  const addObservation = async (chamadoId: string, tipo: TipoObservacao, mensagem: string) => {
    await supabase.from('observacoes').insert({
      chamado_id: chamadoId,
      tipo,
      mensagem,
      autor: 'Admin'
    });
    fetchObservacoes(chamadoId);
  };

  const handleSave = async () => {
    if (!formData.titulo || !formData.setor_id) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    setLoading(true);

    const isNew = !ticket;
    const now = getBrazilTime();
    
    // SLA Calculation logic
    let slaInicial = formData.sla_inicial ? new Date(formData.sla_inicial) : calculateSLA(
      formData.abrangencia as Abrangencia,
      formData.prioridade as Prioridade,
      formData.tipo as TipoChamado,
      now
    );

    let slaAtual = formData.sla_atual ? new Date(formData.sla_atual) : slaInicial;

    // Previsão logic
    let previsao = formData.previsao ? new Date(formData.previsao) : null;
    if (formData.status === 'Aguardando' && !previsao) {
      previsao = addDays(now, 5); // Default 5 days
    }

    // If previsao changes, SLA Atual follows
    if (previsao && (!ticket || ticket.previsao !== previsao.toISOString())) {
      slaAtual = previsao;
    }

    // Clean payload to remove joined objects and auto-generated fields
    const { setores: _, id_visual: __, uuid: ___, created_at: ____, ...cleanPayload } = formData;

    const payload: any = {
      ...cleanPayload,
      sla_inicial: slaInicial.toISOString(),
      sla_atual: slaAtual.toISOString(),
      previsao: previsao ? previsao.toISOString() : null,
    };

    if (formData.status === 'Resolvido' || formData.status === 'Cancelado') {
      if (!ticket || (ticket.status !== 'Resolvido' && ticket.status !== 'Cancelado')) {
        if (!confirm(`Tem certeza que deseja marcar como ${formData.status}? Esta ação não pode ser desfeita.`)) {
          setLoading(false);
          return;
        }
        payload.data_fechamento = now.toISOString();
      }
    }

    if (formData.status === 'Aguardando' && (!ticket || ticket.status !== 'Aguardando')) {
      payload.inicio_aguardando = now.toISOString();
    }

    if (formData.status === 'Aberto' && ticket?.status === 'Aguardando') {
      payload.fim_aguardando = now.toISOString();
      // Resume SLA logic could be more complex, but here we just keep the current SLA
    }

    const { data, error } = isNew 
      ? await supabase.from('chamados').insert(payload).select().single()
      : await supabase.from('chamados').update(payload).eq('uuid', ticket.uuid).select().single();

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      const savedTicket = data as Chamado;
      if (isNew) {
        await addObservation(savedTicket.uuid, 'sistema', 'Chamado aberto no sistema.');
      } else {
        if (ticket.status !== formData.status) {
          await addObservation(savedTicket.uuid, 'alteração_status', `Status alterado de ${ticket.status} para ${formData.status}`);
        }
        if (ticket.previsao !== payload.previsao) {
          await addObservation(savedTicket.uuid, 'alteração_prazo', `Previsão alterada para ${payload.previsao ? format(new Date(payload.previsao), 'dd/MM/yy') : 'Nenhuma'}`);
        }
      }
      onClose();
    }
    setLoading(false);
  };

  const handleSendObs = async () => {
    if (!newObs.trim() || !ticket) return;
    await addObservation(ticket.uuid, 'comentário', newObs);
    setNewObs('');
  };

  const isClosed = ticket?.status === 'Resolvido' || ticket?.status === 'Cancelado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Left: Form */}
        <div className="flex-1 p-6 overflow-y-auto border-r border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {ticket ? `Chamado ${formatVisualId(ticket.id_visual)}` : 'Novo Chamado'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X size={24} className="text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título</label>
                <input 
                  disabled={isClosed}
                  type="text" 
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Descrição</label>
                <textarea 
                  disabled={isClosed}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo</label>
                  <select 
                    disabled={isClosed}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white disabled:opacity-50"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoChamado })}
                  >
                    <option value="Incidente">Incidente</option>
                    <option value="Solicitação">Solicitação</option>
                    <option value="Melhoria">Melhoria</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Setor</label>
                  <select 
                    disabled={isClosed}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white disabled:opacity-50"
                    value={formData.setor_id}
                    onChange={(e) => setFormData({ ...formData, setor_id: e.target.value })}
                  >
                    {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Abrangência</label>
                  <select 
                    disabled={isClosed}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white disabled:opacity-50"
                    value={formData.abrangencia}
                    onChange={(e) => setFormData({ ...formData, abrangencia: e.target.value as Abrangencia })}
                  >
                    <option value="Empresa">Empresa</option>
                    <option value="Setor">Setor</option>
                    <option value="Colaborador">Colaborador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prioridade</label>
                  <select 
                    disabled={isClosed}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white disabled:opacity-50"
                    value={formData.prioridade}
                    onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as Prioridade })}
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                    <option value="Melhoria">Melhoria</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <select 
                    disabled={isClosed}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white disabled:opacity-50"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                  >
                    <option value="Aberto">Aberto</option>
                    <option value="Aguardando">Aguardando</option>
                    <option value="Resolvido">Resolvido</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Previsão</label>
                  <input 
                    disabled={isClosed}
                    type="date" 
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-white disabled:opacity-50"
                    value={formData.previsao ? format(new Date(formData.previsao), 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setFormData({ ...formData, previsao: null });
                        return;
                      }
                      // Split the date and create a local date at noon to avoid timezone shifts
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      const date = new Date(year, month - 1, day, 12, 0, 0);
                      setFormData({ ...formData, previsao: date.toISOString() });
                    }}
                  />
                </div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Informações de SLA</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-600 dark:text-slate-400">SLA Inicial:</div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {formData.sla_inicial ? format(new Date(formData.sla_inicial), 'dd/MM/yy HH:mm') : '-'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">SLA Atual:</div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {formData.sla_atual ? format(new Date(formData.sla_atual), 'dd/MM/yy HH:mm') : '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            {!isClosed && (
              <button 
                onClick={handleSave}
                disabled={loading}
                className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Chamado'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Chat/Observations */}
        <div className="w-full md:w-[400px] bg-slate-50 dark:bg-slate-950 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare size={18} />
              Observações
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {observacoes.map((obs) => (
              <div key={obs.id} className={`flex flex-col ${obs.tipo === 'sistema' || obs.tipo.startsWith('alteração') ? 'items-center' : 'items-start'}`}>
                {obs.tipo === 'sistema' || obs.tipo.startsWith('alteração') ? (
                  <div className="bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                    {obs.mensagem}
                  </div>
                ) : (
                  <div className="max-w-[85%] bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center gap-4 mb-1">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">{obs.autor}</span>
                      <span className="text-[10px] text-slate-400">{format(new Date(obs.data_criacao), 'HH:mm')}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{obs.mensagem}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {!isClosed && ticket && (
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Adicionar observação..." 
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                  value={newObs}
                  onChange={(e) => setNewObs(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendObs()}
                />
                <button 
                  onClick={handleSendObs}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
