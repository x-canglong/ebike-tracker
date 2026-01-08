const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// 中间件
app.use(cors());                // 允许前端跨域访问
app.use(express.json());        // 解析 JSON 请求体

// MySQL 连接配置（修改密码为你自己的）
const db = mysql.createConnection({
  host: '115.190.106.118',
  user: 'ebike_tracker',
  password: 'Gds123456',
  database: 'ebike_tracker'
});

// 连接数据库
db.connect(err => {
  if (err) {
    console.error('数据库连接失败:', err);
    process.exit(1);
  }
  console.log('MySQL 连接成功');

  // 自动创建表（如果不存在）
  const createTable = `
    CREATE TABLE IF NOT EXISTS records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME NOT NULL,
      mileage DECIMAL(10,2) NOT NULL,
      charge_minutes DECIMAL(6,2),
      cost DECIMAL(8,2),
      charge_type VARCHAR(20),
      note VARCHAR(255)
    )
  `;
  db.query(createTable, err => {
    if (err) {
      console.error('创建表失败:', err);
      return;
    }
    console.log('表已准备好');
    
    // 检查是否需要迁移数据（从 charge_hours 到 charge_minutes）
    const checkColumn = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ebike_tracker' 
      AND TABLE_NAME = 'records' 
      AND COLUMN_NAME = 'charge_minutes'`;
    
    db.query(checkColumn, (err, results) => {
      if (err) {
        console.error('检查字段失败:', err);
        return;
      }
      
      // 如果没有 charge_minutes 字段，需要迁移
      if (results.length === 0) {
        console.log('检测到旧表结构，开始迁移...');
        
        // 检查是否有 charge_hours 字段
        const checkOldColumn = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = 'ebike_tracker' 
          AND TABLE_NAME = 'records' 
          AND COLUMN_NAME = 'charge_hours'`;
        
        db.query(checkOldColumn, (err, oldResults) => {
          if (err) {
            console.error('检查旧字段失败:', err);
            return;
          }
          
          if (oldResults.length > 0) {
            // 添加新字段
            const addColumn = `ALTER TABLE records ADD COLUMN charge_minutes DECIMAL(6,2) AFTER mileage`;
            db.query(addColumn, (err) => {
              if (err) {
                console.error('添加字段失败:', err);
                return;
              }
              
              // 迁移数据：将 charge_hours 的值复制到 charge_minutes
              // 注意：如果之前存储的是小时，需要乘以60；如果已经是分钟，直接复制
              // 这里假设之前存储的可能是小时（小于24的值），需要转换
              const migrateData = `
                UPDATE records 
                SET charge_minutes = CASE 
                  WHEN charge_hours IS NULL THEN NULL
                  WHEN charge_hours < 24 THEN charge_hours * 60  -- 小于24，可能是小时，转换为分钟
                  ELSE charge_hours  -- 大于等于24，可能是分钟，直接复制
                END
                WHERE charge_minutes IS NULL
              `;
              
              db.query(migrateData, (err) => {
                if (err) {
                  console.error('迁移数据失败:', err);
                  return;
                }
                console.log('数据迁移完成');
                
                // 删除旧字段（可选，先注释掉，以防万一）
                // const dropColumn = `ALTER TABLE records DROP COLUMN charge_hours`;
                // db.query(dropColumn, (err) => {
                //   if (err) console.error('删除旧字段失败:', err);
                //   else console.log('旧字段已删除');
                // });
              });
            });
          }
        });
      } else {
        console.log('表结构已是最新版本');
      }
      
      // 检查是否需要添加 charge_type 字段
      const checkChargeType = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'ebike_tracker' 
        AND TABLE_NAME = 'records' 
        AND COLUMN_NAME = 'charge_type'`;
      
      db.query(checkChargeType, (err, typeResults) => {
        if (err) {
          console.error('检查 charge_type 字段失败:', err);
          return;
        }
        
        if (typeResults.length === 0) {
          console.log('添加 charge_type 字段...');
          const addChargeType = `ALTER TABLE records ADD COLUMN charge_type VARCHAR(20) AFTER cost`;
          db.query(addChargeType, (err) => {
            if (err) {
              console.error('添加 charge_type 字段失败:', err);
            } else {
              console.log('charge_type 字段已添加');
            }
          });
        }
      });
    });
  });
});

// 添加记录
app.post('/add_record', (req, res) => {
  const { mileage, charge_minutes, cost, charge_type, note = '' } = req.body;
  if (!mileage) return res.status(400).json({ error: 'Mileage is required' });

  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const sql = `INSERT INTO records (timestamp, mileage, charge_minutes, cost, charge_type, note) VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [timestamp, mileage, charge_minutes || null, cost || null, charge_type || null, note], (err, result) => {
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
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});