CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  matricula VARCHAR(40) NOT NULL UNIQUE,
  curso VARCHAR(120) NOT NULL,
  perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('admin', 'professor')),
  senha_hash TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS laboratorios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  tipo VARCHAR(120) NOT NULL,
  capacidade INTEGER NOT NULL CHECK (capacidade > 0),
  localizacao VARCHAR(160) NOT NULL,
  recursos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  laboratorio_id INTEGER NOT NULL REFERENCES laboratorios(id),
  data DATE NOT NULL,
  inicio TIME NOT NULL,
  termino TIME NOT NULL,
  quantidade_alunos INTEGER CHECK (quantidade_alunos IS NULL OR quantidade_alunos > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'aprovada' CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'cancelada')),
  observacao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (inicio < termino)
);

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS quantidade_alunos INTEGER;

ALTER TABLE reservas
  DROP CONSTRAINT IF EXISTS reservas_quantidade_alunos_check;

ALTER TABLE reservas
  ADD CONSTRAINT reservas_quantidade_alunos_check
  CHECK (quantidade_alunos IS NULL OR quantidade_alunos > 0);

CREATE INDEX IF NOT EXISTS idx_reservas_laboratorio_data
  ON reservas (laboratorio_id, data, inicio, termino);

CREATE TABLE IF NOT EXISTS problemas (
  id SERIAL PRIMARY KEY,
  laboratorio_id INTEGER NOT NULL REFERENCES laboratorios(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(120) NOT NULL,
  descricao TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'resolvido')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventario (
  id SERIAL PRIMARY KEY,
  laboratorio_id INTEGER NOT NULL REFERENCES laboratorios(id),
  item VARCHAR(160) NOT NULL,
  disponivel INTEGER NOT NULL DEFAULT 0 CHECK (disponivel >= 0),
  indisponivel INTEGER NOT NULL DEFAULT 0 CHECK (indisponivel >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acessos (
  id SERIAL PRIMARY KEY,
  laboratorio_id INTEGER NOT NULL REFERENCES laboratorios(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('checkin', 'checkout')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

UPDATE usuarios SET curso = 'Coordenação' WHERE curso = 'Coordenacao';
UPDATE usuarios SET curso = 'Administração' WHERE curso = 'Administracao';
UPDATE usuarios SET curso = 'Informática' WHERE curso = 'Informatica';

UPDATE laboratorios
SET nome = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(nome, 'Laboratorio', 'Laboratório'),
            'Informatica', 'Informática'
          ),
          'Matematica', 'Matemática'
        ),
        'Quimica', 'Química'
      ),
      'Fisica', 'Física'
    ),
    tipo = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(tipo, 'Informatica', 'Informática'),
          'Matematica', 'Matemática'
        ),
        'Quimica', 'Química'
      ),
      'Fisica', 'Física'
    ),
    recursos = REPLACE(
      REPLACE(recursos::text, 'geometrico', 'geométrico'),
      'Microscopios', 'Microscópios'
    )::jsonb
WHERE nome LIKE 'Laboratorio %'
   OR nome LIKE 'Laboratório %'
   OR tipo IN ('Informatica', 'Matematica', 'Quimica', 'Fisica')
   OR recursos::text LIKE '%geometrico%'
   OR recursos::text LIKE '%Microscopios%';

UPDATE reservas SET observacao = 'Aula prática' WHERE observacao = 'Aula pratica';
UPDATE reservas SET observacao = 'Resolução de exercícios' WHERE observacao = 'Resolucao de exercicios';

UPDATE problemas SET descricao = 'A TV não liga durante a aula.' WHERE descricao = 'A TV nao liga durante a aula.';
UPDATE problemas SET descricao = 'Conexão instável no turno da tarde.' WHERE descricao = 'Conexao instavel no turno da tarde.';

UPDATE inventario SET item = 'Kit geométrico' WHERE item = 'Kit geometrico';
UPDATE inventario SET item = 'Microscópios' WHERE item = 'Microscopios';
