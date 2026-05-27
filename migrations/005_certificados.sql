-- Certificados e carga_horaria
-- Execute in order

-- 1. Add carga_horaria to modulos (if not exists)
ALTER TABLE modulos ADD COLUMN IF NOT EXISTS carga_horaria INTEGER;

-- 2. Fix certificados table (drop and recreate with correct schema)
-- Only run if the table has the broken schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'certificados'
  ) THEN
    -- Check if nome column exists, add if needed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'certificados' AND column_name = 'nome'
    ) THEN
      ALTER TABLE certificados ADD COLUMN nome text;
    END IF;
    -- Check if codigo column exists, add if needed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'certificados' AND column_name = 'codigo'
    ) THEN
      ALTER TABLE certificados ADD COLUMN codigo TEXT NOT NULL DEFAULT '';
      ALTER TABLE certificados ADD CONSTRAINT certificados_codigo_key UNIQUE (codigo);
    END IF;
    -- Check if pdf_url column exists, add if needed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'certificados' AND column_name = 'pdf_url'
    ) THEN
      ALTER TABLE certificados ADD COLUMN pdf_url TEXT;
    END IF;
    -- Check if emitido_em column exists, add if needed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'certificados' AND column_name = 'emitido_em'
    ) THEN
      ALTER TABLE certificados ADD COLUMN emitido_em TIMESTAMP NOT NULL DEFAULT NOW();
    END IF;
  ELSE
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
  END IF;
END $$;

-- 3. Create index
CREATE INDEX IF NOT EXISTS idx_certificados_usuario ON certificados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_certificados_modulo ON certificados(modulo_id);
