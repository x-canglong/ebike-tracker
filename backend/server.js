require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// 中间件
app.use(cors());                // 允许前端跨域访问
app.use(express.json());        // 解析 JSON 请求体

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[${timestamp}] 请求体:`, JSON.stringify(req.body));
  }
  if (req.params && Object.keys(req.params).length > 0) {
    console.log(`[${timestamp}] 路径参数:`, JSON.stringify(req.params));
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(`[${timestamp}] 查询参数:`, JSON.stringify(req.query));
  }
  next();
});

// MySQL 连接配置（从环境变量读取）
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// 连接数据库
db.connect(err => {
  if (err) {
    console.error('[数据库] 连接失败:', err.message);
    console.error('[数据库] 错误详情:', err);
    process.exit(1);
  }
  console.log('[数据库] MySQL 连接成功');
  console.log('[数据库] 主机:', process.env.DB_HOST);
  console.log('[数据库] 端口:', process.env.DB_PORT);
  console.log('[数据库] 数据库名:', process.env.DB_NAME);
});

// 添加记录
app.post('/add_record', (req, res) => {
  console.log('[POST /add_record] 开始处理添加记录请求');
  const { mileage, charge_minutes, cost, charge_type, note = '' } = req.body;
  console.log('[POST /add_record] 接收到的数据:', { mileage, charge_minutes, cost, charge_type, note });
  
  if (!mileage) {
    console.warn('[POST /add_record] 验证失败: mileage 字段缺失');
    return res.status(400).json({ error: 'Mileage is required' });
  }
  
  const sql = `INSERT INTO records (timestamp, mileage, charge_minutes, cost, charge_type, note) VALUES (NOW(), ?, ?, ?, ?, ?)`;
  const params = [mileage, charge_minutes || null, cost || null, charge_type || null, note];
  console.log('[POST /add_record] 执行SQL:', sql);
  console.log('[POST /add_record] SQL参数:', params);
  
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('[POST /add_record] 数据库操作失败:', err.message);
      console.error('[POST /add_record] 错误详情:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('[POST /add_record] 记录添加成功, ID:', result.insertId);
    console.log('[POST /add_record] 受影响行数:', result.affectedRows);
    res.status(201).json({ message: 'Record added' });
  });
});

// 更新记录
app.put('/update_record/:id', (req, res) => {
  const { id } = req.params;
  console.log('[PUT /update_record/:id] 开始处理更新记录请求, ID:', id);
  const { mileage, charge_minutes, cost, charge_type, note } = req.body;
  console.log('[PUT /update_record/:id] 接收到的数据:', { mileage, charge_minutes, cost, charge_type, note });
  
  const sql = `UPDATE records SET mileage = ?, charge_minutes = ?, cost = ?, charge_type = ?, note = ? WHERE id = ?`;
  const params = [mileage, charge_minutes || null, cost || null, charge_type || null, note || '', id];
  console.log('[PUT /update_record/:id] 执行SQL:', sql);
  console.log('[PUT /update_record/:id] SQL参数:', params);
  
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('[PUT /update_record/:id] 数据库操作失败:', err.message);
      console.error('[PUT /update_record/:id] 错误详情:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('[PUT /update_record/:id] 受影响行数:', result.affectedRows);
    if (result.affectedRows === 0) {
      console.warn('[PUT /update_record/:id] 记录未找到, ID:', id);
      return res.status(404).json({ error: 'Record not found' });
    }
    console.log('[PUT /update_record/:id] 记录更新成功, ID:', id);
    res.json({ message: 'Record updated' });
  });
});

// 获取所有记录（倒序）
app.get('/records', (req, res) => {
  console.log('[GET /records] 开始处理获取记录列表请求');
  const sql = `SELECT * FROM records ORDER BY id DESC`;
  console.log('[GET /records] 执行SQL:', sql);
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('[GET /records] 数据库查询失败:', err.message);
      console.error('[GET /records] 错误详情:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('[GET /records] 查询成功, 记录数:', results.length);

    // 计算本次续航里程
    const formatted = [];
    let prevMileage = null;
    // 因为倒序，先反转算差值，再反回来
    const reversed = [...results].reverse();
    for (const rec of reversed) {
      const current = parseFloat(rec.mileage);
      const diff = prevMileage !== null ? current - prevMileage : null;
      formatted.push({
        id: rec.id,
        timestamp: rec.timestamp,
        mileage: current,
        diff: diff !== null ? Math.round(diff * 100) / 100 : null,
        charge_minutes: rec.charge_minutes ? parseFloat(rec.charge_minutes) : null,
        cost: rec.cost ? parseFloat(rec.cost) : null,
        charge_type: rec.charge_type || null,
        note: rec.note
      });
      prevMileage = current;
    }
    formatted.reverse(); // 恢复倒序显示

    console.log('[GET /records] 数据处理完成, 返回记录数:', formatted.length);
    res.json(formatted);
  });
});

// 获取统计
app.get('/stats', (req, res) => {
  console.log('[GET /stats] 开始处理获取统计信息请求');
  const sql = `SELECT mileage, cost, charge_minutes FROM records ORDER BY id`;
  console.log('[GET /stats] 执行SQL:', sql);
  
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('[GET /stats] 数据库查询失败:', err.message);
      console.error('[GET /stats] 错误详情:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('[GET /stats] 查询成功, 记录数:', rows.length);
    
    if (rows.length === 0) {
      console.log('[GET /stats] 无记录, 返回默认统计值');
      return res.json({ total_mileage: 0, avg_mileage_per_charge: 0, total_cost: 0, avg_cost_per_charge: 0, avg_charge_minutes: 0, charge_count: 0 });
    }

    const totalMileage = parseFloat(rows[rows.length - 1].mileage);
    console.log('[GET /stats] 总里程:', totalMileage);
    
    const diffs = [];
    for (let i = 1; i < rows.length; i++) {
      diffs.push(parseFloat(rows[i].mileage) - parseFloat(rows[i - 1].mileage));
    }
    const avgMileage = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
    console.log('[GET /stats] 平均每次充电里程:', avgMileage);
    
    // 计算平均充电时长（分钟）
    const chargeMinutes = rows.map(r => parseFloat(r.charge_minutes) || 0).filter(m => m > 0);
    const avgChargeMinutes = chargeMinutes.length ? chargeMinutes.reduce((a, b) => a + b, 0) / chargeMinutes.length : 0;
    console.log('[GET /stats] 平均充电时长:', avgChargeMinutes, '分钟');

    const costs = rows.map(r => parseFloat(r.cost) || 0).filter(c => c > 0);
    const totalCost = costs.reduce((a, b) => a + b, 0);
    const avgCost = rows.length ? totalCost / rows.length : 0;
    console.log('[GET /stats] 总费用:', totalCost);
    console.log('[GET /stats] 平均每次费用:', avgCost);

    const stats = {
      total_mileage: Math.round(totalMileage * 100) / 100,
      avg_mileage_per_charge: Math.round(avgMileage * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      avg_cost_per_charge: Math.round(avgCost * 100) / 100,
      avg_charge_minutes: Math.round(avgChargeMinutes),
      charge_count: rows.length
    };
    console.log('[GET /stats] 统计计算完成, 返回结果:', stats);
    res.json(stats);
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[服务器] 启动成功`);
  console.log(`[服务器] 监听端口: ${PORT}`);
  console.log(`[服务器] 访问地址: http://localhost:${PORT}`);
  console.log(`[服务器] 环境: ${process.env.NODE_ENV || 'development'}`);
});