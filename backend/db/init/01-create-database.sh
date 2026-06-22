#!/usr/bin/env bash
set -euo pipefail

APP_DB_NAME="${APP_DB_NAME:-laboratorios}"
APP_DB_USER="${APP_DB_USER:-laboratorios_app}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-laboratorios_app}"

psql --username "$POSTGRES_USER" --dbname postgres -v ON_ERROR_STOP=1 <<-EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
    CREATE ROLE "${APP_DB_USER}" LOGIN PASSWORD '${APP_DB_PASSWORD}';
  ELSE
    ALTER ROLE "${APP_DB_USER}" WITH LOGIN PASSWORD '${APP_DB_PASSWORD}';
  END IF;
END
\$\$;
EOSQL

if ! psql --username "$POSTGRES_USER" --dbname postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${APP_DB_NAME}'" | grep -q 1; then
  createdb --username "$POSTGRES_USER" --owner "$APP_DB_USER" "$APP_DB_NAME"
fi

psql --username "$POSTGRES_USER" --dbname "$APP_DB_NAME" -v ON_ERROR_STOP=1 <<-EOSQL
GRANT ALL PRIVILEGES ON DATABASE "${APP_DB_NAME}" TO "${APP_DB_USER}";
GRANT USAGE, CREATE ON SCHEMA public TO "${APP_DB_USER}";
ALTER SCHEMA public OWNER TO "${APP_DB_USER}";
EOSQL
