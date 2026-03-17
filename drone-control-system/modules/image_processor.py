"""
图像处理模块
负责QR码识别、挑战卡识别和图像采集
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from pyzbar import pyzbar
from loguru import logger
from datetime import datetime
from pathlib import Path


class ImageProcessor:
    """图像处理器"""
    
    def __init__(self, config: Dict[str, Any], storage_path: Path):
        self.config = config
        self.storage_path = storage_path
        self.resolution = config.get('resolution', (1280, 720))
        self.format = config.get('format', 'jpg')
        self.quality = config.get('quality', 90)
        self.qr_method = config.get('qr_detection_method', 'opencv')
        
        # QR码检测器
        if self.qr_method == 'opencv':
            self.qr_detector = cv2.QRCodeDetector()
        
        # 统计信息
        self.stats = {
            'images_captured': 0,
            'qr_codes_detected': 0,
            'cards_detected': 0,
            'detection_failures': 0
        }
        
        logger.info(f"ImageProcessor initialized: {self.resolution}, method: {self.qr_method}")
    
    def capture_image(self, drone, filename: Optional[str] = None) -> Optional[np.ndarray]:
        """从无人机捕获图像"""
        try:
            frame = drone.get_frame_read().frame
            
            if frame is None:
                logger.error("Failed to capture frame")
                return None
            
            # 调整分辨率
            if frame.shape[:2] != self.resolution[::-1]:
                frame = cv2.resize(frame, self.resolution)
            
            # 保存图像
            if filename:
                filepath = self.storage_path / filename
                cv2.imwrite(str(filepath), frame, [cv2.IMWRITE_JPEG_QUALITY, self.quality])
                logger.info(f"Image saved: {filename}")
            
            self.stats['images_captured'] += 1
            return frame
        
        except Exception as e:
            logger.error(f"Image capture failed: {e}")
            return None
    
    def detect_qr_code(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """检测图像中的QR码"""
        qr_codes = []
        
        try:
            if self.qr_method == 'opencv':
                data, bbox, _ = self.qr_detector.detectAndDecode(image)
                if data:
                    qr_codes.append({
                        'data': data,
                        'bbox': bbox.tolist() if bbox is not None else None,
                        'type': 'QR_CODE'
                    })
            else:
                # 使用pyzbar
                decoded_objects = pyzbar.decode(image)
                for obj in decoded_objects:
                    qr_codes.append({
                        'data': obj.data.decode('utf-8'),
                        'bbox': [(obj.rect.left, obj.rect.top), 
                                (obj.rect.left + obj.rect.width, obj.rect.top + obj.rect.height)],
                        'type': obj.type
                    })
            
            if qr_codes:
                self.stats['qr_codes_detected'] += len(qr_codes)
                logger.info(f"Detected {len(qr_codes)} QR code(s)")
            else:
                self.stats['detection_failures'] += 1
            
            return qr_codes
        
        except Exception as e:
            logger.error(f"QR detection failed: {e}")
            self.stats['detection_failures'] += 1
            return []
    
    def detect_challenge_card(self, image: np.ndarray, card_number: int) -> Optional[Dict[str, Any]]:
        """检测挑战卡"""
        try:
            # 转换为灰度图
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 边缘检测
            edges = cv2.Canny(gray, 50, 150)
            
            # 查找轮廓
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # 筛选矩形轮廓
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 1000:
                    continue
                
                # 近似多边形
                epsilon = 0.02 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                # 检查是否为矩形
                if len(approx) == 4:
                    x, y, w, h = cv2.boundingRect(approx)
                    aspect_ratio = float(w) / h
                    
                    # 挑战卡通常是正方形或接近正方形
                    if 0.8 < aspect_ratio < 1.2:
                        # 提取ROI进行数字识别
                        roi = gray[y:y+h, x:x+w]
                        
                        # 这里应该使用OCR或模板匹配识别卡片编号
                        # 简化实现：假设检测到的就是目标卡片
                        self.stats['cards_detected'] += 1
                        
                        return {
                            'card_number': card_number,
                            'bbox': (x, y, w, h),
                            'center': (x + w//2, y + h//2),
                            'confidence': 0.85
                        }
            
            self.stats['detection_failures'] += 1
            return None
        
        except Exception as e:
            logger.error(f"Challenge card detection failed: {e}")
            return None
    
    def generate_filename(self, qr_code: str, sequence: int = 0) -> str:
        """生成图像文件名"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.config['image_naming'].format(
            qr_code=qr_code,
            timestamp=timestamp,
            sequence=sequence
        )
        return filename
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """图像预处理"""
        # 去噪
        denoised = cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)
        
        # 增强对比度
        lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        return enhanced
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        total_detections = self.stats['qr_codes_detected'] + self.stats['cards_detected']
        total_attempts = total_detections + self.stats['detection_failures']
        accuracy = total_detections / total_attempts if total_attempts > 0 else 0
        
        return {
            **self.stats,
            'detection_accuracy': accuracy
        }
