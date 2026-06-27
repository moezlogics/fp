module.exports = {
  apps: [
    {
      name: "foodies-api",
      script: "dist/index.js",
      instances: "max", 
      exec_mode: "cluster", 
      wait_ready: true, 
      listen_timeout: 10000, 
      kill_timeout: 5000, 
      max_memory_restart: "1500M", // Protects the 64GB RAM from Node.js memory leaks
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
