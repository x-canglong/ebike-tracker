# 使用官方 Node.js 运行时作为基础镜像
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

COPY node_modules ./node_modules/
COPY package*.json ./

# 复制应用代码
COPY . .

# 暴露端口（默认 5000，可通过环境变量覆盖）
EXPOSE 5000

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["node", "server.js"]