CREATE TABLE IF NOT EXISTS `records` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `timestamp` datetime NOT NULL COMMENT '记录时间',
  `mileage` decimal(10,2) NOT NULL COMMENT '当前里程（单位：公里）',
  `charge_minutes` decimal(6,2) DEFAULT NULL COMMENT '充电时长（单位：分钟）',
  `cost` decimal(8,2) DEFAULT NULL COMMENT '充电费用（单位：元）',
  `charge_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '充电类型（金桥智电/富联e充/手动投币等）',
  `note` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '备注信息',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='车辆充电记录表';