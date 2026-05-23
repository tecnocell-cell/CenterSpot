#!/usr/bin/env bash
# CenterSpot — restauração a partir de backup (uso manual / emergência)
# Uso: ./restore.sh <timestamp|run-dir> [--mysql] [--env] [--uploads] [--all]
# Exemplo: ./restore.sh 20260409-030001 --all

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-/var/www/hotspot}"
ENV_FILE="${ENV_FILE:-$BACKEND_DIR/.env}"
BACKUP_ROOT="${BACKUPS_DIR:-$PROJECT_ROOT/backups}"
TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
  echo "Uso: $0 <timestamp|run-YYYYMMDD-HHMMSS> [--mysql|--env|--uploads|--all]"
  echo "Backups disponíveis:"
  ls -1dt "$BACKUP_ROOT"/run-* 2>/dev/null | head -5 || ls -1t "$BACKUP_ROOT/mysql"/hotspot-*.sql.gz 2>/dev/null | head -5
  exit 1
fi

shift || true
DO_MYSQL=false
DO_ENV=false
DO_UPLOADS=false

if [[ $# -eq 0 ]]; then
  DO_MYSQL=true
fi

for arg in "$@"; do
  case "$arg" in
    --mysql) DO_MYSQL=true ;;
    --env) DO_ENV=true ;;
    --uploads) DO_UPLOADS=true ;;
    --all) DO_MYSQL=true; DO_ENV=true; DO_UPLOADS=true ;;
    *) echo "Opção desconhecida: $arg"; exit 1 ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | sed 's/\r$//')
  set +a
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-hotspotuser}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-hotspot}"

RUN_DIR=""
if [[ -d "$BACKUP_ROOT/run-$TARGET" ]]; then
  RUN_DIR="$BACKUP_ROOT/run-$TARGET"
elif [[ -d "$TARGET" ]]; then
  RUN_DIR="$TARGET"
else
  RUN_DIR=""
fi

echo "ATENÇÃO: restauração sobrescreve dados atuais."
read -r -p "Continuar? [digite SIM] " confirm
[[ "$confirm" == "SIM" ]] || { echo "Cancelado."; exit 0; }

if $DO_MYSQL; then
  DUMP=""
  if [[ -n "$RUN_DIR" && -f "$RUN_DIR/database.sql.gz" ]]; then
    DUMP="$RUN_DIR/database.sql.gz"
  elif [[ -f "$BACKUP_ROOT/mysql/hotspot-$TARGET.sql.gz" ]]; then
    DUMP="$BACKUP_ROOT/mysql/hotspot-$TARGET.sql.gz"
  else
    echo "Dump MySQL não encontrado para $TARGET"
    exit 1
  fi
  echo "Restaurando MySQL de $DUMP ..."
  export MYSQL_PWD="$DB_PASSWORD"
  gunzip -c "$DUMP" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME"
  unset MYSQL_PWD
  echo "MySQL restaurado."
fi

if $DO_ENV; then
  ENV_GZ=""
  if [[ -n "$RUN_DIR" && -f "$RUN_DIR/env.gz" ]]; then
    ENV_GZ="$RUN_DIR/env.gz"
  elif [[ -f "$BACKUP_ROOT/env/env-$TARGET.gz" ]]; then
    ENV_GZ="$BACKUP_ROOT/env/env-$TARGET.gz"
  fi
  if [[ -n "$ENV_GZ" ]]; then
    cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%s)" 2>/dev/null || true
    gunzip -c "$ENV_GZ" > "$ENV_FILE"
    echo ".env restaurado."
  fi
fi

if $DO_UPLOADS; then
  ARCHIVE=""
  if [[ -n "$RUN_DIR" && -f "$RUN_DIR/uploads.tar.gz" ]]; then
    ARCHIVE="$RUN_DIR/uploads.tar.gz"
  elif [[ -f "$BACKUP_ROOT/uploads/uploads-$TARGET.tar.gz" ]]; then
    ARCHIVE="$BACKUP_ROOT/uploads/uploads-$TARGET.tar.gz"
  fi
  if [[ -n "$ARCHIVE" ]]; then
    rm -rf "$BACKEND_DIR/uploads"
    tar -xzf "$ARCHIVE" -C "$BACKEND_DIR"
    echo "uploads restaurados."
  fi
fi

echo "Restauração finalizada. Reinicie: pm2 restart all"
