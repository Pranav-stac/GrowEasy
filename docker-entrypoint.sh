#!/bin/sh
set -e

cd /app/backend
node dist/index.js &
BACKEND_PID=$!

cd /app/frontend
npm start &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT INT TERM
wait
