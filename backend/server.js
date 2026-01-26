require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

// --- 中间件 ---
app.use(cors());
app.use(express.json());

// 请求日志记录
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// --- MySQL 配置 ---
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: 'Asia/Shanghai',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// --- 全局连接池变量与状态锁 ---
let pool = mysql.createPool(poolConfig);
let isRecreating = false; // 重建锁，防止并发重建冲突

// --- 核心工具函数：重建连接池 ---
async function handlePoolRecreation() {
  if (isRecreating) {
    console.log('[数据库] 连接池正在重建中，跳过本次重复请求...');
    return;
  }

  isRecreating = true;
  try {
    console.log('[数据库] 启动连接池销毁与重建流程...');
    try {
      await pool.end(); // 尝试关闭旧连接池
    } catch (e) {
      console.log('[数据库] 关闭旧连接池时忽略的错误:', e.message);
    }

    pool = mysql.createPool(poolConfig);
    
    // 立即测试新连接
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[数据库] 连接池重建成功且测试通过');
  } catch (err) {
    console.error('[数据库] 连接池重建最终失败:', err.message);
  } finally {
    isRecreating = false;
  }
}

// --- 核心工具函数：带重试逻辑的执行器 ---
async function executeQuery(sql, params = [], retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const [results] = await pool.query(sql, params);
      return results;
    } catch (err) {
      console.error(`[数据库] 查询失败 (尝试 ${i + 1}/${retries}):`, err.message);
      
      // 判断是否需要重建连接池的错误类型
      const isConnectionError = 
          err.code === 'PROTOCOL_CONNECTION_LOST' || 
          err.code === 'ECONNRESET' || 
          err.code === 'ETIMEDOUT' ||
          err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
          (err.message && err.message.includes('Pool is closed'));

      if (isConnectionError) {
        console.log('[数据库] 检测到关键连接错误，触发重建...');
        await handlePoolRecreation();
      }
      
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 退避重试
    }
  }
}

// --- 定期健康检查 ---
setInterval(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
  } catch (err) {
    console.error('[数据库] 定期健康检查失败:', err.message);
    await handlePoolRecreation();
  }
}, 30000);

// --- API 路由 ---

// 1. 添加记录
app.post('/add_record', async (req, res) => {
  const { mileage, charge_minutes, cost, charge_type, note = '' } = req.body;
  if (!mileage) return res.status(400).json({ error: '里程(mileage)是必填项' });
  
  const sql = `INSERT INTO records (timestamp, mileage, charge_minutes, cost, charge_type, note) VALUES (NOW(), ?, ?, ?, ?, ?)`;
  const params = [mileage, charge_minutes || null, cost || null, charge_type || null, note];
  
  try {
    const result = await executeQuery(sql, params);
    res.status(201).json({ message: '记录添加成功', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: '保存失败: ' + err.message });
  }
});

// 2. 更新记录
app.put('/update_record/:id', async (req, res) => {
  const { id } = req.params;
  const { mileage, charge_minutes, cost, charge_type, note } = req.body;
  
  const sql = `UPDATE records SET mileage = ?, charge_minutes = ?, cost = ?, charge_type = ?, note = ? WHERE id = ?`;
  const params = [mileage, charge_minutes || null, cost || null, charge_type || null, note || '', id];
  
  try {
    const result = await executeQuery(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: '未找到该记录' });
    res.json({ message: '记录更新成功' });
  } catch (err) {
    res.status(500).json({ error: '更新失败: ' + err.message });
  }
});

// 3. 获取列表（带里程差值计算）
app.get('/records', async (req, res) => {
  try {
    const results = await executeQuery(`SELECT * FROM records ORDER BY mileage ASC`);
    
    // 计算本次续航
    const formatted = [];
    let prevMileage = null;
    for (const rec of results) {
      const current = parseFloat(rec.mileage);
      const diff = prevMileage !== null ? current - prevMileage : null;
      formatted.push({
        id: rec.id,
        timestamp: rec.timestamp,
        mileage: current,
        diff: diff !== null ? Math.round(diff * 100) / 100 : null,
        charge_minutes: rec.charge_minutes,
        cost: rec.cost ? parseFloat(rec.cost) : null,
        charge_type: rec.charge_type,
        note: rec.note
      });
      prevMileage = current;
    }
    res.json(formatted.reverse()); // 恢复为最新在前的顺序返回
  } catch (err) {
    res.status(500).json({ error: '获取失败: ' + err.message });
  }
});

// 4. 获取统计数据（逻辑修正版）
app.get('/stats', async (req, res) => {
  try {
    const rows = await executeQuery(`SELECT mileage, cost, charge_minutes FROM records ORDER BY mileage ASC`);
    
    if (rows.length === 0) {
      return res.json({ total_mileage: 0, avg_mileage_per_charge: 0, total_cost: 0, charge_count: 0 });
    }

    const firstMileage = parseFloat(rows[0].mileage);
    const lastMileage = parseFloat(rows[rows.length - 1].mileage);

    const costs = rows.map(r => parseFloat(r.cost) || 0).filter(c => c > 0);
    const totalCost = costs.reduce((a, b) => a + b, 0);
    
    const minutes = rows.map(r => parseFloat(r.charge_minutes) || 0).filter(m => m > 0);
    const avgMinutes = minutes.length ? minutes.reduce((a, b) => a + b, 0) / minutes.length : 0;

    res.json({
      total_mileage: Math.round(lastMileage * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      charge_count: rows.length,
      avg_charge_minutes: Math.round(avgMinutes),
      avg_mileage_per_charge: Math.round(lastMileage / rows.length * 100) / 100,
      avg_cost_per_charge: rows.length > 0 ? Math.round((totalCost / rows.length) * 100) / 100 : 0
    });
  } catch (err) {
    res.status(500).json({ error: '统计计算失败: ' + err.message });
  }
});

// --- 优雅退出 ---
process.on('SIGINT', async () => {
  await pool.end();
  console.log('[服务器] 连接池已安全关闭');
  process.exit(0);
});

// --- 启动服务器 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[服务器] 启动成功`);
  console.log(`[服务器] 监听端口: ${PORT}`);
  console.log(`[服务器] 访问地址: http://localhost:${PORT}`);
  console.log(`[服务器] 环境: ${process.env.NODE_ENV || 'development'}`);
});