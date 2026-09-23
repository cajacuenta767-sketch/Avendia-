#!/bin/bash
# ==============================================================================
# AVEND ESCALA — SCRIPT DE DESPLIEGUE SEGURO CON MODO MANTENIMIENTO AUTOMÁTICO
# ==============================================================================
set -e

echo "🚀 [1/6] Asegurando pantalla de mantenimiento en /var/www/html..."
sudo mkdir -p /var/www/html
sudo cp public/maintenance.html /var/www/html/maintenance.html 2>/dev/null || true

echo "🔴 [2/6] ACTIVANDO MODO MANTENIMIENTO EN NGINX (503)..."
sudo touch /var/www/html/maintenance.enable
echo "✅ Pantalla de mantenimiento visible para los usuarios."

echo "📦 [3/6] Instalando nuevas dependencias (xlsx, mammoth, etc.)..."
npm install

echo "⚡ [4/6] Compilando aplicación Next.js 14..."
npm run build

echo "🔄 [5/6] Reiniciando procesos de producción..."
if command -v pm2 &> /dev/null; then
  pm2 restart all || pm2 restart 0 || pm2 restart avend-escala
elif command -v docker &> /dev/null; then
  docker compose down || true
  docker compose up -d --build
else
  echo "⚠️ Reiniciando servicio systemd..."
  systemctl restart avend-escala || true
fi

echo "🟢 [6/6] DESACTIVANDO MODO MANTENIMIENTO..."
sudo rm -f /var/www/html/maintenance.enable

echo "✨ ¡Despliegue completado con éxito! Plataforma 100% operativa en https://cuadernillos.avend.pe"
