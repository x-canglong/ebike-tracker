import { execSync } from "child_process";
import path from "path";

// 核心配置
const config = {
  server: "115.190.106.118",
  sshPort: 57,
  username: "root",
  privateKey: "D:\\xmh_dev_wsl",
  remoteAppDir: "/opt/ebike-tracker-backend/",
  remoteRestartScript: "/opt/ebike-tracker-backend/restart-app.sh"
};

// 要上传的文件列表
const filesToUpload = [
  path.resolve("server.js"),
  path.resolve("package.json")
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

// 第三步：执行服务器上的重启脚本（核心！）
console.log("\n🔄 步骤2：执行服务器重启脚本...");
const restartCmd = `
ssh -p ${config.sshPort} -i "${config.privateKey}" \
${config.username}@${config.server} \
"cd ${config.remoteAppDir} && ./restart-app.sh"
`.replace(/\n/g, " ").trim();
runCommand(restartCmd);

// 部署完成
console.log("\n==========================================");
console.log("🎉 部署+重启流程全部完成！");
console.log("==========================================");