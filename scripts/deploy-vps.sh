#!/bin/bash
set -e

echo "🚀 Iniciando despliegue de AVEND ESCALA en VPS (172.233.0.241)..."

# 1. Instalar Docker si no existe
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker Engine..."
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https.download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker instalado correctamente."
fi

# 2. Ir al directorio de la aplicación
APP_DIR="/var/www/avend-escala"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 3. Compilar y levantar contenedores Docker
echo "🐳 Compilando e iniciando contenedores en Docker..."
docker compose down || true
docker compose up -d --build

echo "🎉 ¡Despliegue completado con éxito!"
echo "🌐 Aplicación ejecutándose en http://172.233.0.241:3000"
