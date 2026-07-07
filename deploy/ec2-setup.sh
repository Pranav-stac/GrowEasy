#!/bin/bash
set -euo pipefail

DOMAIN="groweasy.praanav.in"
APP_DIR="/opt/groweasy"
REPO_URL="https://github.com/Pranav-stac/GrowEasy.git"
ADMIN_EMAIL="pranav@praanav.in"

export GEMINI_API_KEY="${GEMINI_API_KEY:-__GEMINI_API_KEY__}"
export GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.0-flash}"

exec > >(tee /var/log/groweasy-setup.log) 2>&1
echo "=== GrowEasy setup started $(date) ==="

dnf update -y
dnf install -y git nginx certbot python3-certbot-nginx firewalld

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
npm install -g pm2

systemctl enable nginx
systemctl start nginx

if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull origin main
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
npm run install:all

cat > "$APP_DIR/backend/.env" <<EOF
PORT=4000
GEMINI_API_KEY=${GEMINI_API_KEY}
GEMINI_MODEL=${GEMINI_MODEL}
BATCH_SIZE=15
MAX_RETRIES=3
CORS_ORIGIN=https://${DOMAIN}
EOF

cat > "$APP_DIR/frontend/.env.local" <<EOF
NEXT_PUBLIC_API_URL=https://${DOMAIN}
EOF

cd "$APP_DIR/backend" && npm run build
cd "$APP_DIR/frontend" && npm run build

pm2 delete groweasy-api 2>/dev/null || true
pm2 delete groweasy-web 2>/dev/null || true
pm2 start "$APP_DIR/backend/dist/index.js" --name groweasy-api --cwd "$APP_DIR/backend"
pm2 start npm --name groweasy-web --cwd "$APP_DIR/frontend" -- start
pm2 save
pm2 startup systemd -u root --hp /root | bash || true

cat > /etc/nginx/conf.d/groweasy.conf <<'NGINX'
server {
    listen 80;
    server_name groweasy.praanav.in;

    client_max_body_size 6M;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

nginx -t
systemctl reload nginx

firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload || true

for i in $(seq 1 30); do
  if curl -s "http://${DOMAIN}" >/dev/null 2>&1; then
    certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect
    break
  fi
  echo "Waiting for DNS (${i}/30)..."
  sleep 60
done

systemctl reload nginx
echo "=== GrowEasy setup complete $(date) ==="
echo "Domain: https://${DOMAIN}"
echo "Admin contact: ${ADMIN_EMAIL}"
