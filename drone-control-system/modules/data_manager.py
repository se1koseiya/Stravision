"""
数据管理模块
负责SQLite数据库操作和数据存储
"""

import sqlite3
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
from loguru import logger


class DataManager:
    """数据管理器"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn = None
        self.cursor = None
        self._init_database()
        logger.info(f"DataManager initialized: {db_path}")
    
    def _init_database(self):
        """初始化数据库"""
        self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.cursor = self.conn.cursor()
        
        # 创建表结构
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS inspection_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                qr_code TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                gps_latitude REAL,
                gps_longitude REAL,
                altitude REAL,
                image_path TEXT,
                image_size INTEGER,
                detection_confidence REAL,
                metadata TEXT,
                uploaded BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS challenge_cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                card_number INTEGER NOT NULL,
                position_x REAL,
                position_y REAL,
                position_z REAL,
                detection_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                confidence REAL,
                image_path TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS flight_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_data TEXT,
                battery_level INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 创建索引
        self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_qr_code ON inspection_records(qr_code)')
        self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_task_id ON inspection_records(task_id)')
        self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_card_number ON challenge_cards(card_number)')
        
        self.conn.commit()
        logger.info("Database initialized")
    
    def save_inspection_record(self, record: Dict[str, Any]) -> int:
        """保存巡检记录"""
        try:
            self.cursor.execute('''
                INSERT INTO inspection_records 
                (task_id, qr_code, gps_latitude, gps_longitude, altitude, 
                 image_path, image_size, detection_confidence, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record.get('task_id'),
                record.get('qr_code'),
                record.get('gps_latitude'),
                record.get('gps_longitude'),
                record.get('altitude'),
                record.get('image_path'),
                record.get('image_size'),
                record.get('detection_confidence'),
                json.dumps(record.get('metadata', {}))
            ))
            self.conn.commit()
            record_id = self.cursor.lastrowid
            logger.info(f"Inspection record saved: {record_id}")
            return record_id
        except Exception as e:
            logger.error(f"Failed to save inspection record: {e}")
            self.conn.rollback()
            return -1
    
    def save_challenge_card(self, card: Dict[str, Any]) -> int:
        """保存挑战卡记录"""
        try:
            self.cursor.execute('''
                INSERT INTO challenge_cards 
                (task_id, card_number, position_x, position_y, position_z, 
                 confidence, image_path, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                card.get('task_id'),
                card.get('card_number'),
                card.get('position_x'),
                card.get('position_y'),
                card.get('position_z'),
                card.get('confidence'),
                card.get('image_path'),
                json.dumps(card.get('metadata', {}))
            ))
            self.conn.commit()
            card_id = self.cursor.lastrowid
            logger.info(f"Challenge card saved: {card_id}")
            return card_id
        except Exception as e:
            logger.error(f"Failed to save challenge card: {e}")
            self.conn.rollback()
            return -1
    
    def log_flight_event(self, task_id: str, event_type: str, event_data: Dict[str, Any], battery: int):
        """记录飞行事件"""
        try:
            self.cursor.execute('''
                INSERT INTO flight_logs (task_id, event_type, event_data, battery_level)
                VALUES (?, ?, ?, ?)
            ''', (task_id, event_type, json.dumps(event_data), battery))
            self.conn.commit()
        except Exception as e:
            logger.error(f"Failed to log flight event: {e}")
    
    def get_records_by_task(self, task_id: str) -> List[Dict[str, Any]]:
        """获取任务的所有记录"""
        self.cursor.execute('''
            SELECT * FROM inspection_records WHERE task_id = ? ORDER BY timestamp
        ''', (task_id,))
        
        columns = [desc[0] for desc in self.cursor.description]
        records = []
        for row in self.cursor.fetchall():
            record = dict(zip(columns, row))
            if record.get('metadata'):
                record['metadata'] = json.loads(record['metadata'])
            records.append(record)
        
        return records
    
    def get_challenge_cards_by_task(self, task_id: str) -> List[Dict[str, Any]]:
        """获取任务的挑战卡记录"""
        self.cursor.execute('''
            SELECT * FROM challenge_cards WHERE task_id = ? ORDER BY card_number
        ''', (task_id,))
        
        columns = [desc[0] for desc in self.cursor.description]
        cards = []
        for row in self.cursor.fetchall():
            card = dict(zip(columns, row))
            if card.get('metadata'):
                card['metadata'] = json.loads(card['metadata'])
            cards.append(card)
        
        return cards
    
    def mark_as_uploaded(self, record_id: int):
        """标记记录为已上传"""
        self.cursor.execute('''
            UPDATE inspection_records SET uploaded = 1 WHERE id = ?
        ''', (record_id,))
        self.conn.commit()
    
    def get_unuploaded_records(self) -> List[Dict[str, Any]]:
        """获取未上传的记录"""
        self.cursor.execute('''
            SELECT * FROM inspection_records WHERE uploaded = 0 ORDER BY timestamp
        ''')
        
        columns = [desc[0] for desc in self.cursor.description]
        records = []
        for row in self.cursor.fetchall():
            record = dict(zip(columns, row))
            if record.get('metadata'):
                record['metadata'] = json.loads(record['metadata'])
            records.append(record)
        
        return records
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = {}
        
        # 总记录数
        self.cursor.execute('SELECT COUNT(*) FROM inspection_records')
        stats['total_records'] = self.cursor.fetchone()[0]
        
        # 已上传记录数
        self.cursor.execute('SELECT COUNT(*) FROM inspection_records WHERE uploaded = 1')
        stats['uploaded_records'] = self.cursor.fetchone()[0]
        
        # 挑战卡总数
        self.cursor.execute('SELECT COUNT(*) FROM challenge_cards')
        stats['total_cards'] = self.cursor.fetchone()[0]
        
        # 飞行事件总数
        self.cursor.execute('SELECT COUNT(*) FROM flight_logs')
        stats['total_events'] = self.cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
        logger.info("Database connection closed")
