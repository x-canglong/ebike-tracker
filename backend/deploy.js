const { execSync } = require("child_process");
const path = require("path");

// 核心配置
const config = {
  server: "115.190.106.118",
  sshPort: 57,
  username: "root",
  privateKey: "D:\\xmh_dev_wsl",
  remoteAppDir: "/www/dk_project/dk_app/ebike-tracker-backend/"
};

// 要上传的文件列表
const filesToUpload = [
  path.resolve("server.js"),
  path.resolve("package.json"),
  path.resolve("package-lock.json"),
  path.resolve("Dockerfile"),
  path.resolve("docker-compose.yml"),
  path.resolve(".dockerignore")
];

/**
 * 执行命令的工具函数（带错误捕获和日志）
 * @param {string} cmd 要执行的命令
 */
function runCommand(cmd) {
  console.log(`\n📢 执行命令：\n${cmd}\n`);
  try {
    // stdio: "inherit" 会把服务器输出直接打印到本地终端
    execSync(cmd, { stdio: "inherit", encoding: "utf8" });
  } catch (error) {
    console.error(`❌ 命令执行失败：${error.message}`);
    process.exit(1); // 执行失败则终止部署
  }
}

// 第一步：打印部署信息
console.log("==========================================");
console.log("          开始部署 ebike-tracker          ");
console.log("==========================================");

// 第二步：批量上传文件到服务器
console.log("\n🔄 步骤1：上传项目文件到服务器...");
const uploadCmd = `
scp -P ${config.sshPort} -i "${config.privateKey}" \
${filesToUpload.map(file => `"${file}"`).join(" ")} \
${config.username}@${config.server}:${config.remoteAppDir}
`.replace(/\n/g, " ").trim(); // 去掉换行，避免解析问题
runCommand(uploadCmd);

// 第三步：构建 Docker 镜像
console.log("\n🔄 步骤2：构建 Docker 镜像...");
const buildCmd = `
ssh -p ${config.sshPort} -i "${config.privateKey}" \
${config.username}@${config.server} \
"cd ${config.remoteAppDir} && npm install && docker build -t ebike-tracker-backend:latest ."
`.replace(/\n/g, " ").trim();
runCommand(buildCmd);

// 第四步：重启容器
console.log("\n🔄 步骤3：重启 Docker 容器...");
const restartCmd = `
ssh -p ${config.sshPort} -i "${config.privateKey}" \
${config.username}@${config.server} \
"cd ${config.remoteAppDir} && docker-compose down && docker-compose up -d"
`.replace(/\n/g, " ").trim();
runCommand(restartCmd);

// 部署完成
console.log("\n==========================================");
console.log("🎉 部署+重启流程全部完成！");
console.log("==========================================");