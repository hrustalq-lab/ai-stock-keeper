#!/bin/bash
# ============================================
# AI Stock Keeper - VPS Setup Script
# ============================================
# Запуск: ssh root@45.139.78.251 'bash -s' < scripts/vps-setup.sh
#
# Или выполните команды по очереди вручную

set -e

echo "🚀 AI Stock Keeper - VPS Setup"
echo "=============================="

# ============================================
# 1. Обновление системы
# ============================================
echo "📦 Updating system..."
apt update && apt upgrade -y
apt install -y curl wget git htop unzip

# ============================================
# 2. Создание deploy пользователя
# ============================================
echo "👤 Creating deploy user..."

# Создаём пользователя deploy
useradd -m -s /bin/bash deploy || echo "User deploy already exists"

# Добавляем в sudo группу
usermod -aG sudo deploy

# Устанавливаем пароль (можно изменить позже)
echo "deploy:$(openssl rand -base64 32)" | chpasswd

# Разрешаем sudo без пароля для deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy

echo "✅ Deploy user created"

# ============================================
# 3. Настройка SSH для deploy
# ============================================
echo "🔑 Setting up SSH for deploy user..."

# Создаём .ssh директорию
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Генерируем SSH ключ для GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /home/deploy/.ssh/github_actions -N ""

# Добавляем публичный ключ в authorized_keys
cat /home/deploy/.ssh/github_actions.pub >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# Устанавливаем владельца
chown -R deploy:deploy /home/deploy/.ssh

echo "✅ SSH configured"

# ============================================
# 4. Установка Docker
# ============================================
echo "🐳 Installing Docker..."

# Удаляем старые версии
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Устанавливаем Docker
curl -fsSL https://get.docker.com | sh

# Добавляем deploy в docker группу
usermod -aG docker deploy

# Запускаем Docker
systemctl enable docker
systemctl start docker

# Создаём shared network для коммуникации между dev и prod контейнерами
docker network create ai-stock-shared 2>/dev/null || echo "Network ai-stock-shared already exists"

echo "✅ Docker installed"

# ============================================
# 5. Создание структуры папок
# ============================================
echo "📁 Creating project directories..."

# Production
mkdir -p /opt/ai-stock-keeper
mkdir -p /opt/ai-stock-keeper/nginx/conf.d
mkdir -p /opt/ai-stock-keeper/nginx/ssl
mkdir -p /opt/ai-stock-keeper/nginx/logs

# Development
mkdir -p /opt/ai-stock-keeper-dev
mkdir -p /opt/ai-stock-keeper-dev/nginx/conf.d
mkdir -p /opt/ai-stock-keeper-dev/nginx/ssl
mkdir -p /opt/ai-stock-keeper-dev/nginx/logs

# Логи PM2
mkdir -p /var/log/pm2

# Устанавливаем владельца
chown -R deploy:deploy /opt/ai-stock-keeper
chown -R deploy:deploy /opt/ai-stock-keeper-dev
chown -R deploy:deploy /var/log/pm2

echo "✅ Directories created"

# ============================================
# 6. Настройка firewall
# ============================================
echo "🔥 Configuring firewall..."

apt install -y ufw

# Базовые правила
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp

# HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Включаем firewall
echo "y" | ufw enable

echo "✅ Firewall configured"

# ============================================
# 7. Настройка SSH безопасности
# ============================================
echo "🔒 Hardening SSH..."

# Отключаем root login по паролю (оставляем по ключу)
sed -i 's/#PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config

# Отключаем password authentication
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Перезапускаем SSH
systemctl restart sshd

echo "✅ SSH hardened"

# ============================================
# 8. Вывод информации
# ============================================
echo ""
echo "============================================"
echo "🎉 VPS SETUP COMPLETE!"
echo "============================================"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Copy the PRIVATE key for GitHub Secrets:"
echo "   cat /home/deploy/.ssh/github_actions"
echo ""
echo "2. Add to GitHub Repository Secrets:"
echo "   VPS_HOST         = 45.139.78.251"
echo "   VPS_USERNAME     = deploy"
echo "   VPS_SSH_KEY      = (private key from step 1)"
echo "   VPS_SSH_PORT     = 22"
echo "   PROJECT_PATH_PROD = /opt/ai-stock-keeper"
echo "   PROJECT_PATH_DEV  = /opt/ai-stock-keeper-dev"
echo ""
echo "3. Create .env files on VPS:"
echo "   sudo -u deploy nano /opt/ai-stock-keeper/.env"
echo "   sudo -u deploy nano /opt/ai-stock-keeper-dev/.env"
echo ""
echo "4. Copy nginx configs and SSL certs"
echo ""
echo "============================================"
