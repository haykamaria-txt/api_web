#!/usr/bin/env bash
set -euo pipefail

APP_DB_NAME="${APP_DB_NAME:-laboratorios}"
APP_DB_USER="${APP_DB_USER:-laboratorios_app}"

psql --username "$POSTGRES_USER" --dbname "$APP_DB_NAME" -v ON_ERROR_STOP=1 <<-EOSQL
SET ROLE "${APP_DB_USER}";
\i /docker-entrypoint-initdb.d/sql/schema.sql
RESET ROLE;
EOSQL
