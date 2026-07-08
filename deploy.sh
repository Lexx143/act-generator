#!/usr/bin/env bash
# Деплой: rsync исходников на сервер + пересборка контейнера.
# Реквизиты сервера лежат в .deploy.env (в git не попадает), см. .deploy.env.example
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .deploy.env ]; then
  echo "Нет .deploy.env — скопируйте .deploy.env.example и заполните" >&2
  exit 1
fi
# shellcheck disable=SC1091
source .deploy.env
: "${DEPLOY_HOST:?В .deploy.env должен быть DEPLOY_HOST=user@server}"
DIR="${DEPLOY_DIR:-~/defect-acts}"

echo "==> Синхронизация исходников"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude data \
  --exclude .env --exclude .deploy.env \
  ./ "$DEPLOY_HOST:$DIR/"

echo "==> Сборка и запуск контейнера"
# data/ должен принадлежать пользователю app (uid 100) из контейнера
ssh "$DEPLOY_HOST" "cd $DIR && mkdir -p data && sudo chown 100:101 data && sudo docker compose up -d --build"

echo "==> Статус"
ssh "$DEPLOY_HOST" "sudo docker ps --filter name=defect-acts --format '{{.Names}} {{.Status}}'"
echo "Готово"
