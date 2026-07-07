#!/bin/bash
set -euo pipefail

DOMAIN="groweasy.praanav.in"
ADMIN_EMAIL="pranav@praanav.in"
APP_DIR="/opt/groweasy"
PUBLIC_IP=$(curl -s http://ifconfig.me || curl -s http://checkip.amazonaws.com)

echo "Public IP: $PUBLIC_IP"

cat > /etc/nginx/conf.d/groweasy.conf <<NGINX
server {
    listen 80;
    server_name ${DOMAIN} ${PUBLIC_IP};

    client_max_body_size 6M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    location /api/import/extract/stream {
        proxy_pass http://127.0.0.1:4000/api/import/extract/stream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        chunked_transfer_encoding off;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        proxy_set_header Host \$host;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

nginx -t && systemctl reload nginx

if curl -s --resolve "${DOMAIN}:80:${PUBLIC_IP}" "http://${DOMAIN}/health" | grep -q ok; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect || true
  systemctl reload nginx
fi

if [ -f "$APP_DIR/backend/.env" ]; then
  sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://${DOMAIN},http://${DOMAIN},http://${PUBLIC_IP},https://${PUBLIC_IP}|" "$APP_DIR/backend/.env"
  pm2 restart groweasy-api || true
fi

if [ -f "$APP_DIR/frontend/.env.local" ]; then
  sed -i '/^NEXT_PUBLIC_API_URL=/d' "$APP_DIR/frontend/.env.local" || true
fi

echo "Done. Ensure DNS A record: ${DOMAIN} -> ${PUBLIC_IP}"