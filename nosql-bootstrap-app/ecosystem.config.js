// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'temu-clone',
    script: './server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5800
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5800
    },
    // PM2 settings
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    // Log settings
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    time: true,
    // Restart strategies
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};