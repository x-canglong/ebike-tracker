# 充电记录 - 前端

基于 Vue 3 + Vite + Vant 4 开发的移动端充电记录管理系统。

## 技术栈

- Vue 3 (Composition API)
- Vite
- Vant 4 (移动端 UI 组件库)
- Axios (HTTP 客户端)
- Day.js (日期处理)

## 功能特性

- 📊 **统计页面**：展示总里程、平均续航、总花费、平均花费等统计数据
- 📝 **记录列表**：查看历史充电记录，支持下拉刷新
- ➕ **添加记录**：记录每次充电的里程、时长、花费和备注

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:5174`

## 构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 后端 API

前端默认连接到 `http://127.0.0.1:5000`，确保后端服务已启动。

API 端点：
- `POST /add_record` - 添加充电记录
- `GET /records` - 获取所有记录
- `GET /stats` - 获取统计信息
