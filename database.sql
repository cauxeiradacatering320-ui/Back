-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";



-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE role_user AS ENUM (
  'admin',
  'produtor',
  'aluno'
);

CREATE TYPE status_modulo AS ENUM (
  'rascunho',
  'publicado',
  'arquivado'
);

CREATE TYPE tipo_conteudo AS ENUM (
  'video',
  'texto',
  'questao'
);

CREATE TYPE status_compra AS ENUM (
  'pendente',
  'aprovado',
  'recusado',
  'reembolsado'
);

CREATE TYPE status_acesso AS ENUM (
  'ativo',
  'expirado',
  'cancelado',
  'bloqueado'
);


-- =====================================================
-- SESSÕES / REFRESH TOKENS
-- =====================================================

CREATE TABLE sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  refresh_token_hash TEXT NOT NULL,

  ip_address TEXT,
  user_agent TEXT,

  expirado_em TIMESTAMP NOT NULL,
  revogado_em TIMESTAMP,

  ultimo_uso_em TIMESTAMP,

  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessoes_usuario
ON sessoes(usuario_id);



-- =====================================================
-- USUÁRIOS
-- =====================================================

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  telefone NUMERIC UNIQUE,

  role role_user NOT NULL DEFAULT 'aluno',

  foto_url TEXT,

  ativo BOOLEAN NOT NULL DEFAULT TRUE,

  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  deletado_em TIMESTAMP
);



-- =====================================================
-- MÓDULOS
-- =====================================================

CREATE TABLE modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  produtor_id UUID NOT NULL REFERENCES usuarios(id),

  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,

  descricao TEXT,

  thumbnail_url TEXT,

  preco_centavos INTEGER NOT NULL DEFAULT 0,

  moeda TEXT NOT NULL DEFAULT 'AOA',

  gratuito BOOLEAN NOT NULL DEFAULT FALSE,

  duracao_acesso_dias INTEGER,
  -- exemplo:
  -- 30 dias
  -- 365 dias
  -- NULL = vitalício

  carga_horaria INTEGER,
  status status_modulo NOT NULL DEFAULT 'rascunho',

  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),

  deletado_em TIMESTAMP
);

CREATE INDEX idx_modulos_produtor
ON modulos(produtor_id);

CREATE INDEX idx_modulos_status
ON modulos(status);



-- =====================================================
-- CONTEÚDOS DOS MÓDULOS
-- =====================================================

CREATE TABLE conteudos_modulo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  modulo_id UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,

  tipo tipo_conteudo NOT NULL,

  titulo TEXT NOT NULL,

  posicao INTEGER NOT NULL,

  preview BOOLEAN NOT NULL DEFAULT FALSE,

  dados JSONB NOT NULL DEFAULT '{}',

  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conteudos_modulo
ON conteudos_modulo(modulo_id);

CREATE INDEX idx_conteudos_posicao
ON conteudos_modulo(modulo_id, posicao);



-- =====================================================
-- COMPRAS
-- =====================================================

CREATE TABLE compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  usuario_id UUID NOT NULL REFERENCES usuarios(id),

  provider TEXT NOT NULL,
  -- ex:
  -- multicaixa
  -- stripe
  -- hotmart

  transacao_provider_id TEXT,

  valor_pago_centavos INTEGER NOT NULL,

  moeda TEXT NOT NULL DEFAULT 'AOA',

  status status_compra NOT NULL DEFAULT 'pendente',

  aprovado_em TIMESTAMP,

  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compras_usuario
ON compras(usuario_id);

CREATE INDEX idx_compras_status
ON compras(status);



-- =====================================================
-- ITENS DA COMPRA
-- =====================================================

CREATE TABLE itens_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,

  modulo_id UUID NOT NULL REFERENCES modulos(id),

  preco_pago_centavos INTEGER NOT NULL,

  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_itens_compra_compra
ON itens_compra(compra_id);

CREATE INDEX idx_itens_compra_modulo
ON itens_compra(modulo_id);



-- =====================================================
-- ACESSOS / MATRÍCULAS
-- =====================================================

CREATE TABLE acessos_modulo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  usuario_id UUID NOT NULL REFERENCES usuarios(id),

  modulo_id UUID NOT NULL REFERENCES modulos(id),

  compra_id UUID REFERENCES compras(id),

  status status_acesso NOT NULL DEFAULT 'ativo',

  iniciado_em TIMESTAMP NOT NULL DEFAULT NOW(),

  expira_em TIMESTAMP,

  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),

  origem_acesso TEXT NOT NULL DEFAULT 'compra'
);

CREATE INDEX idx_acessos_usuario
ON acessos_modulo(usuario_id);

CREATE INDEX idx_acessos_modulo
ON acessos_modulo(modulo_id);

CREATE UNIQUE INDEX idx_acesso_unico
ON acessos_modulo(usuario_id, modulo_id);



-- =====================================================
-- PROGRESSO DOS CONTEÚDOS
-- =====================================================

CREATE TABLE progresso_conteudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  usuario_id UUID NOT NULL REFERENCES usuarios(id),

  conteudo_modulo_id UUID NOT NULL REFERENCES conteudos_modulo(id) ON DELETE CASCADE,

  completo BOOLEAN NOT NULL DEFAULT FALSE,

  porcentagem NUMERIC(5,2) NOT NULL DEFAULT 0,

  ultima_posicao_segundos INTEGER DEFAULT 0,

  completado_em TIMESTAMP,

  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(usuario_id, conteudo_modulo_id)
);

CREATE INDEX idx_progresso_usuario
ON progresso_conteudo(usuario_id);



-- =====================================================
-- CERTIFICADOS
-- =====================================================

CREATE TABLE certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  nome text,
  modulo_id UUID NOT NULL REFERENCES modulos(id),
  codigo TEXT NOT NULL UNIQUE,
  pdf_url TEXT,
  emitido_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certificados_usuario
ON certificados(usuario_id);



-- =====================================================
-- LOGS / AUDITORIA
-- =====================================================

CREATE TABLE logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  usuario_id UUID REFERENCES usuarios(id),

  acao TEXT NOT NULL,

  entidade TEXT NOT NULL,

  entidade_id UUID,

  metadata JSONB,

  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_usuario
ON logs_auditoria(usuario_id);

CREATE INDEX idx_logs_entidade
ON logs_auditoria(entidade, entidade_id);