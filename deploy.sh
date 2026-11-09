#!/bin/bash
set -e
APP_DIR="/home/deploy/apps/saraqib-admin"
cd "$APP_DIR"

echo "[$(date)] === بدء نشر الأدمن ==="

GIT_SSH_COMMAND="ssh -i /home/deploy/.ssh/github_deploy_admin -o StrictHostKeyChecking=no" \
  git pull origin main

npm install --legacy-peer-deps

npm run build

pm2 reload saraqib-admin --update-env

echo "[$(date)] ✅ نشر الأدمن اكتمل"
