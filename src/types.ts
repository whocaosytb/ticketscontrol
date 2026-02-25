export type Status = 'Aberto' | 'Aguardando' | 'Resolvido' | 'Cancelado' | 'Fechado';
export type TipoChamado = 'Incidente' | 'Solicitação' | 'Melhoria';
export type Abrangencia = 'Empresa' | 'Setor' | 'Colaborador';
export type Prioridade = 'Alta' | 'Média' | 'Baixa' | 'Melhoria';
export type TipoObservacao = 'comentário' | 'alteração_status' | 'alteração_prazo' | 'sistema';

export interface Setor {
  id: string;
  nome: string;
  created_at: string;
}

export interface Chamado {
  uuid: string;
  id_visual: number;
  status: Status;
  tipo: TipoChamado;
  data_abertura: string;
  titulo: string;
  usuario: string;
  setor_id: string;
  setores?: Setor;
  abrangencia: Abrangencia;
  prioridade: Prioridade;
  responsavel: string;
  descricao: string;
  previsao: string | null;
  data_fechamento: string | null;
  sla_inicial: string;
  sla_atual: string;
  inicio_aguardando: string | null;
  fim_aguardando: string | null;
  created_at: string;
}

export interface Observacao {
  id: string;
  chamado_id: string;
  tipo: TipoObservacao;
  mensagem: string;
  autor: string;
  data_criacao: string;
}
