"""
数据回传模块
负责将数据打包并上传到Stravision AI智能体
"""

import base64
import json
import requests
import time
from typing import Dict, Any, List
from pathlib import Path
from loguru import logger


class DataUploader:
    """数据上传器"""
    
    def __init__(self, config: Dict[str, Any], api_config: Dict[str, Any]):
        self.config = config
        self.api_url = api_config['api_url']
        self.upload_endpoint = api_config['upload_endpoint']
        self.timeout = config.get('timeout', 60)
        self.max_retry = config.get('max_retry', 3)
        self.retry_delay = config.get('retry_delay', 5)
        self.batch_size = config.get('batch_size', 10)
        
        self.stats = {
            'total_uploads': 0,
            'successful_uploads': 0,
            'failed_uploads': 0,
            'total_bytes': 0
        }
        
        logger.info(f"DataUploader initialized: {self.api_url}")
    
    def upload_inspection_data(self, records: List[Dict[str, Any]], 
                               cards: List[Dict[str, Any]]) -> bool:
        """上传巡检数据"""
        try:
            # 准备数据包
            data_package = self._prepare_data_package(records, cards)
            
            # 上传
            success = self._upload_with_retry(data_package)
            
            if success:
                self.stats['successful_uploads'] += 1
                logger.info(f"Data uploaded successfully: {len(records)} records, {len(cards)} cards")
            else:
                self.stats['failed_uploads'] += 1
                logger.error("Data upload failed")
            
            self.stats['total_uploads'] += 1
            return success
        
        except Exception as e:
            logger.error(f"Upload error: {e}")
            self.stats['failed_uploads'] += 1
            return False
    
    def _prepare_data_package(self, records: List[Dict[str, Any]], 
                             cards: List[Dict[str, Any]]) -> Dict[str, Any]:
        """准备数据包"""
        package = {
            'timestamp': time.time(),
            'records': [],
            'challenge_cards': [],
            'metadata': {
                'total_records': len(records),
                'total_cards': len(cards)
            }
        }
        
        # 处理巡检记录
        for record in records:
            processed_record = {
                'id': record['id'],
                'task_id': record['task_id'],
                'qr_code': record['qr_code'],
                'timestamp': record['timestamp'],
                'gps': {
                    'latitude': record.get('gps_latitude'),
                    'longitude': record.get('gps_longitude'),
                    'altitude': record.get('altitude')
                },
                'detection_confidence': record.get('detection_confidence'),
                'metadata': record.get('metadata', {})
            }
            
            # 编码图像
            if record.get('image_path'):
                image_data = self._encode_image(record['image_path'])
                if image_data:
                    processed_record['image'] = image_data
            
            package['records'].append(processed_record)
        
        # 处理挑战卡
        for card in cards:
            processed_card = {
                'id': card['id'],
                'task_id': card['task_id'],
                'card_number': card['card_number'],
                'position': {
                    'x': card.get('position_x'),
                    'y': card.get('position_y'),
                    'z': card.get('position_z')
                },
                'confidence': card.get('confidence'),
                'detection_time': card['detection_time'],
                'metadata': card.get('metadata', {})
            }
            
            if card.get('image_path'):
                image_data = self._encode_image(card['image_path'])
                if image_data:
                    processed_card['image'] = image_data
            
            package['challenge_cards'].append(processed_card)
        
        return package
    
    def _encode_image(self, image_path: str) -> Optional[str]:
        """将图像编码为Base64"""
        try:
            path = Path(image_path)
            if not path.exists():
                logger.warning(f"Image not found: {image_path}")
                return None
            
            with open(path, 'rb') as f:
                image_bytes = f.read()
                encoded = base64.b64encode(image_bytes).decode('utf-8')
                self.stats['total_bytes'] += len(image_bytes)
                return encoded
        
        except Exception as e:
            logger.error(f"Image encoding failed: {e}")
            return None
    
    def _upload_with_retry(self, data: Dict[str, Any]) -> bool:
        """带重试的上传"""
        url = f"{self.api_url}{self.upload_endpoint}"
        
        for attempt in range(self.max_retry):
            try:
                response = requests.post(
                    url,
                    json=data,
                    timeout=self.timeout,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    logger.info(f"Upload successful on attempt {attempt + 1}")
                    return True
                else:
                    logger.warning(f"Upload failed with status {response.status_code}: {response.text}")
            
            except requests.exceptions.Timeout:
                logger.warning(f"Upload timeout on attempt {attempt + 1}")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Upload error on attempt {attempt + 1}: {e}")
            
            if attempt < self.max_retry - 1:
                time.sleep(self.retry_delay)
        
        return False
    
    def upload_status(self, status: Dict[str, Any]) -> bool:
        """上传状态信息"""
        try:
            url = f"{self.api_url}/drone/status"
            response = requests.post(url, json=status, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Status upload failed: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = self.stats.copy()
        if stats['total_uploads'] > 0:
            stats['success_rate'] = stats['successful_uploads'] / stats['total_uploads']
        else:
            stats['success_rate'] = 0
        return stats
