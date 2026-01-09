import { execSync } from "child_process";
import path from "path";

const server = "115.190.106.118";
const port = 57;
const username = "root";
const privateKey = "D:\\xmh_dev_wsl";
const remoteDir = "/opt/html/ebike_tracker/";
const distDir = path.resolve("dist");

function run(cmd) {
  console.log(`\n>>> ${cmd}\n`);
  execSync(cmd, { stdio: "inherit" });
}

console.log("==========================================");
console.log(`   上传 dist 到服务器（SSH密钥模式）：${remoteDir}`);
console.log("==========================================");

// 1. 打包
run("npm run build");

// 2. 自动上传
const uploadCommand = `scp -P ${port} -i "${privateKey}" -r "${distDir}/*" ${username}@${server}:${remoteDir}`;

run(uploadCommand);

console.log("\n🎉 部署完成（SSH 密钥登录）！");
