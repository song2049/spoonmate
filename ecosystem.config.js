module.exports = {
  apps: [
    {
      name: "spoonmate",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        // 기본값 (로컬/테스트용)
        UPLOAD_DIR: "public/uploads",
      },
      env_production: {
        // EC2, 실제 운영
        UPLOAD_DIR: "/var/www/spoonmate/uploads",
      },
    },
  ],
};
