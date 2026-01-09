require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// 中间件
app.use(cors());                // 允许前端跨域访问
app.use(express.json());        // 解析 JSON 请求体

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
    console.error('数据库连接失败:', err);
    process.exit(1);
  }
  console.log('MySQL 连接成功');
});

// 添加记录
app.post('/add_record', (req, res) => {
  const { mileage, charge_minutes, cost, charge_type, note = '' } = req.body;
  if (!mileage) return res.status(400).json({ error: 'Mileage is required' });
  const sql = `INSERT INTO records (timestamp, mileage, charge_minutes, cost, charge_type, note) VALUES (NOW(), ?, ?, ?, ?, ?)`;
  db.query(sql, [mileage, charge_minutes || null, cost || null, charge_type || null, note], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Record added' });
  });
});

// 更新记录
app.put('/update_record/:id', (req, res) => {
  const { id } = req.params;
  const { mileage, charge_minutes, cost, charge_type, note } = req.body;
  
  const sql = `UPDATE records SET mileage = ?, charge_minutes = ?, cost = ?, charge_type = ?, note = ? WHERE id = ?`;
  db.query(sql, [mileage, charge_minutes || null, cost || null, charge_type || null, note || '', id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ message: 'Record updated' });
  });
});

// 获取所有记录（倒序）
app.get('/records', (req, res) => {
  const sql = `SELECT * FROM records ORDER BY id DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

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

    res.json(formatted);
  });
});

// 获取统计
app.get('/stats', (req, res) => {
  const sql = `SELECT mileage, cost, charge_minutes FROM records ORDER BY id`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) {
      return res.json({ total_mileage: 0, avg_mileage_per_charge: 0, total_cost: 0, avg_cost_per_charge: 0, avg_charge_minutes: 0, charge_count: 0 });
    }

    const totalMileage = parseFloat(rows[rows.length - 1].mileage);
    const diffs = [];
    for (let i = 1; i < rows.length; i++) {
      diffs.push(parseFloat(rows[i].mileage) - parseFloat(rows[i - 1].mileage));
    }
    const avgMileage = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
    
    // 计算平均充电时长（分钟）
    const chargeMinutes = rows.map(r => parseFloat(r.charge_minutes) || 0).filter(m => m > 0);
    const avgChargeMinutes = chargeMinutes.length ? chargeMinutes.reduce((a, b) => a + b, 0) / chargeMinutes.length : 0;

    const costs = rows.map(r => parseFloat(r.cost) || 0).filter(c => c > 0);
    const totalCost = costs.reduce((a, b) => a + b, 0);
    const avgCost = rows.length ? totalCost / rows.length : 0;

    res.json({
      total_mileage: Math.round(totalMileage * 100) / 100,
      avg_mileage_per_charge: Math.round(avgMileage * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      avg_cost_per_charge: Math.round(avgCost * 100) / 100,
      avg_charge_minutes: Math.round(avgChargeMinutes),
      charge_count: rows.length
    });
  });
});

// 启动服务器
app.listen(process.env.PORT, () => {
  console.log(`服务器运行在 http://localhost:${process.env.PORT}`);
});