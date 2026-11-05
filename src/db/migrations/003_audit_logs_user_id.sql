-- RBS Criação v3 — Migration 003: Compatibilidade de colunas na tabela audit_logs e tabela de sessões revogadas
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);
UPDATE audit_logs SET user_id = actor_user_id WHERE user_id IS NULL;

CREATE TABLE IF NOT EXISTS revoked_sessions (
  session_id VARCHAR(120) PRIMARY KEY,
  revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
