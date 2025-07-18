module.exports = {
  apps: [
    {
      name: "token-listing-monitor",
      script: "src/index.js",
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      error_file: "/dev/null",
      out_file: "/dev/null",
      log_file: "./logs/monitor.log",
      time: true,
      env: {
        NODE_ENV: "production",
      },
      // 健康检查配置
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      // 重启策略
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",
      // 日志配置
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // 监控配置
      pmx: true,
      // 环境变量
      env_production: {
        NODE_ENV: "production",
        PORT: 3153,
      },
    },
  ],
};
