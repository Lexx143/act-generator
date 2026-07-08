#!/usr/bin/env bash
# Бэкап БД актов (запускать на ВМ, можно по cron).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
sqlite3 data/acts.db ".backup backups/acts-$STAMP.db" 2>/dev/null \
  || cp data/acts.db "backups/acts-$STAMP.db"
gzip "backups/acts-$STAMP.db"
# Храним последние 30 копий
ls -t backups/acts-*.db.gz | tail -n +31 | xargs -r rm
echo "OK: backups/acts-$STAMP.db.gz"
