/**
 * PM2 Ecosystem Configuration
 * AI Stock Keeper
 * 
 * Использование:
 * - Development: pm2 start ecosystem.config.cjs --only ai-stock-keeper-dev
 * - Production: pm2 start ecosystem.config.cjs --only ai-stock-keeper-prod
 */

module.exports = {
  apps: [
    // ============================================
    // Production App
    // ============================================
    {
      name: 'ai-stock-keeper-prod',
      script: 'node',
      args: 'server.js',
      cwd: '/opt/ai-stock-keeper',
      instances: 'max',
      exec_mode: 'cluster',
      
      // Переменные окружения
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Автоперезапуск
      watch: false,
      max_memory_restart: '1G',
      
      // Логи
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/ai-stock-keeper-prod-error.log',
      out_file: '/var/log/pm2/ai-stock-keeper-prod-out.log',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // ============================================
    // Development App
    // ============================================
    {
      name: 'ai-stock-keeper-dev',
      script: 'node',
      args: 'server.js',
      cwd: '/opt/ai-stock-keeper-dev',
      instances: 2,
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      
      watch: false,
      max_memory_restart: '512M',
      
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/ai-stock-keeper-dev-error.log',
      out_file: '/var/log/pm2/ai-stock-keeper-dev-out.log',
      merge_logs: true,
      
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // ============================================
    // Production Worker
    // ============================================
    {
      name: 'ai-stock-keeper-worker-prod',
      script: 'tsx',
      args: 'scripts/worker.ts',
      cwd: '/opt/ai-stock-keeper',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
      },
      
      watch: false,
      max_memory_restart: '512M',
      
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/ai-stock-keeper-worker-prod-error.log',
      out_file: '/var/log/pm2/ai-stock-keeper-worker-prod-out.log',
      merge_logs: true,
      
      // Автоперезапуск при падении
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },

    // ============================================
    // Development Worker
    // ============================================
    {
      name: 'ai-stock-keeper-worker-dev',
      script: 'tsx',
      args: 'scripts/worker.ts',
      cwd: '/opt/ai-stock-keeper-dev',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
      },
      
      watch: false,
      max_memory_restart: '256M',
      
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/ai-stock-keeper-worker-dev-error.log',
      out_file: '/var/log/pm2/ai-stock-keeper-worker-dev-out.log',
      merge_logs: true,
      
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
