-- SQL para criação das tabelas no Supabase

-- Tabela de Setores
CREATE TABLE setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

-- Tabela de Chamados
CREATE TABLE chamados (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_visual SERIAL UNIQUE, -- SERIAL cria um inteiro sequencial
    status TEXT NOT NULL DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Aguardando', 'Resolvido', 'Cancelado')),
    tipo TEXT NOT NULL CHECK (tipo IN ('Incidente', 'Solicitação', 'Melhoria')),
    data_abertura TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    titulo TEXT NOT NULL,
    usuario TEXT NOT NULL DEFAULT 'Admin',
    setor_id UUID REFERENCES setores(id),
    abrangencia TEXT NOT NULL CHECK (abrangencia IN ('Empresa', 'Setor', 'Colaborador')),
    prioridade TEXT NOT NULL CHECK (prioridade IN ('Alta', 'Média', 'Baixa', 'Melhoria')),
    responsavel TEXT NOT NULL DEFAULT 'Admin',
    descricao TEXT,
    previsao TIMESTAMP WITH TIME ZONE,
    data_fechamento TIMESTAMP WITH TIME ZONE,
    sla_inicial TIMESTAMP WITH TIME ZONE NOT NULL,
    sla_atual TIMESTAMP WITH TIME ZONE NOT NULL,
    inicio_aguardando TIMESTAMP WITH TIME ZONE,
    fim_aguardando TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

-- Tabela de Observações (Histórico/Chat)
CREATE TABLE observacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id UUID REFERENCES chamados(uuid) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('comentário', 'alteração_status', 'alteração_prazo', 'sistema')),
    mensagem TEXT NOT NULL,
    autor TEXT NOT NULL DEFAULT 'Admin',
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

-- Tabela de Configuração de E-mail
CREATE TABLE config_email (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
    host TEXT,
    seguranca TEXT DEFAULT 'TLS',
    porta INTEGER DEFAULT 587,
    email_envio TEXT,
    senha TEXT,
    email_destino TEXT,
    usar_mesmo_email BOOLEAN DEFAULT false,
    titulo_template TEXT,
    corpo_template TEXT,
    gatilhos TEXT[],
    -- IMAP Config
    imap_host TEXT,
    imap_porta INTEGER DEFAULT 993,
    imap_seguranca TEXT DEFAULT 'SSL',
    imap_usar_mesmo_login BOOLEAN DEFAULT true,
    imap_usuario TEXT,
    imap_senha TEXT,
    imap_ativo BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

-- Inserir registro inicial de configuração
INSERT INTO config_email (id) VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- Inserir alguns setores iniciais (opcional)
INSERT INTO setores (nome) VALUES ('TI'), ('RH'), ('Financeiro'), ('Operações');

-- Configurar o fuso horário para o banco (opcional, mas recomendado)
-- SET timezone = 'America/Sao_Paulo';
