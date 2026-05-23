#!/usr/bin/env bash
# CenterSpot — backup automático (MySQL, .env, uploads, logos, certificados)
# Retenção: 7 diários + 4 semanais (domingos)
# Log: /var/log/centerspot-backup.log
# Cron sugerido: 0 3 * * * /var/www/hotspot/backend/scripts/backup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-/var/www/hotspot}"
ENV_FILE="${ENV_FILE:-$BACKEND_DIR/.env}"
LOG_FILE="${BACKUP_LOG_PATH:-/var/log/centerspot-backup.log}"
BACKUP_ROOT="${BACKUPS_DIR:-$PROJECT_ROOT/backups}"
TS="$(date +%Y%m%d-%H%M%S)"
DAY_OF_WEEK="$(date +%u)" # 7 = domingo
RUN_DIR="$BACKUP_ROOT/run-$TS"
RETENTION_DAILY=7
RETENTION_WEEKLY=4

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"
}

# Carregar .env
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | sed 's/\r$//')
  set +a
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-hotspotuser}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-hotspot}"

mkdir -p "$BACKUP_ROOT/mysql" "$BACKUP_ROOT/uploads" "$BACKUP_ROOT/env" "$RUN_DIR"
log "Iniciando backup $TS em $RUN_DIR"

# --- MySQL ---
MYSQL_FILE="$BACKUP_ROOT/mysql/hotspot-$TS.sql.gz"
export MYSQL_PWD="$DB_PASSWORD"
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --routines --triggers "$DB_NAME" \
  | gzip -9 > "$MYSQL_FILE"
unset MYSQL_PWD
cp "$MYSQL_FILE" "$RUN_DIR/database.sql.gz"
log "MySQL: $MYSQL_FILE"

# --- .env ---
if [[ -f "$ENV_FILE" ]]; then
  gzip -9 -c "$ENV_FILE" > "$BACKUP_ROOT/env/env-$TS.gz"
  cp "$BACKUP_ROOT/env/env-$TS.gz" "$RUN_DIR/env.gz"
  log ".env salvo"
fi

# --- uploads ---
UPLOADS_SRC="$BACKEND_DIR/uploads"
if [[ -d "$UPLOADS_SRC" ]]; then
  tar -czf "$BACKUP_ROOT/uploads/uploads-$TS.tar.gz" -C "$BACKEND_DIR" uploads
  cp "$BACKUP_ROOT/uploads/uploads-$TS.tar.gz" "$RUN_DIR/uploads.tar.gz"
  log "uploads: ok"
fi

# --- logos (frontend dist + public) ---
LOGO_PATHS=()
for p in \
  "$PROJECT_ROOT/frontend/dist/uploads/logos" \
  "$PROJECT_ROOT/frontend/public/uploads/logos" \
  "$PROJECT_ROOT/uploads/logos"; do
  [[ -d "$p" ]] && LOGO_PATHS+=("$p")
done
if [[ ${#LOGO_PATHS[@]} -gt 0 ]]; then
  tar -czf "$BACKUP_ROOT/uploads/logos-$TS.tar.gz" "${LOGO_PATHS[@]}"
  log "logos: ok"
fi

# --- certificados EFI ---
CERT_DIR="$BACKEND_DIR/certificados"
if [[ -d "$CERT_DIR" ]]; then
  tar -czf "$BACKUP_ROOT/uploads/certificados-$TS.tar.gz" -C "$BACKEND_DIR" certificados
  log "certificados: ok"
fi

# --- configs importantes (sem node_modules) ---
CONFIG_ARCHIVE="$BACKUP_ROOT/uploads/configs-$TS.tar.gz"
tar -czf "$CONFIG_ARCHIVE" \
  --exclude='*/node_modules/*' \
  -C "$PROJECT_ROOT" \
  backend/package.json \
  backend/server.js \
  backend/.env.example 2>/dev/null || true
[[ -f "$PROJECT_ROOT/infra/wireguard/docker-compose.yml" ]] && \
  tar -rzf "$CONFIG_ARCHIVE" -C "$PROJECT_ROOT" infra/wireguard/docker-compose.yml 2>/dev/null || true
log "configs: ok"

# Manifesto
cat > "$RUN_DIR/manifest.json" <<EOF
{"timestamp":"$TS","database":"database.sql.gz","retention_daily":$RETENTION_DAILY,"retention_weekly":$RETENTION_WEEKLY}
EOF

# --- Retenção diária (mysql + env + uploads por prefixo de data) ---
prune_dir() {
  local dir="$1" pattern="$2" keep="$3"
  ls -1t "$dir"/$pattern 2>/dev/null | tail -n +$((keep + 1)) | xargs -r rm -f
}

prune_dir "$BACKUP_ROOT/mysql" "hotspot-*.sql.gz" "$RETENTION_DAILY"
prune_dir "$BACKUP_ROOT/env" "env-*.gz" "$RETENTION_DAILY"
prune_dir "$BACKUP_ROOT/uploads" "uploads-*.tar.gz" "$RETENTION_DAILY"
prune_dir "$BACKUP_ROOT/uploads" "logos-*.tar.gz" "$RETENTION_DAILY"
prune_dir "$BACKUP_ROOT/uploads" "certificados-*.tar.gz" "$RETENTION_DAILY"
prune_dir "$BACKUP_ROOT/uploads" "configs-*.tar.gz" "$RETENTION_DAILY"

# --- Retenção semanal: manter últimos N domingos ---
if [[ "$DAY_OF_WEEK" == "7" ]]; then
  WEEKLY_DIR="$BACKUP_ROOT/weekly"
  mkdir -p "$WEEKLY_DIR"
  cp "$MYSQL_FILE" "$WEEKLY_DIR/hotspot-week-$TS.sql.gz"
  prune_dir "$WEEKLY_DIR" "hotspot-week-*.sql.gz" "$RETENTION_WEEKLY"
  log "Cópia semanal registrada"
fi

# Limpar runs antigos (manter últimos 3 manifests)
ls -1dt "$BACKUP_ROOT"/run-* 2>/dev/null | tail -n +4 | xargs -r rm -rf

log "Backup concluído com sucesso"
exit 0
