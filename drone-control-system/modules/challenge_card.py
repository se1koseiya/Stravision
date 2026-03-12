"""
挑战卡识别飞行模块
实现1-6号挑战卡识别及来回飞行路径规划
"""

import time
from typing import Dict, Any, List, Optional, Tuple
from loguru import logger


class ChallengeCardController:
    """挑战卡控制器"""
    
    def __init__(self, config: Dict[str, Any], drone_controller, image_processor, data_manager):
        self.config = config
        self.drone = drone_controller
        self.image_proc = image_processor
        self.data_mgr = data_manager
        
        self.card_count = config.get('card_count', 6)
        self.detection_distance = config.get('detection_distance', 100)
        self.approach_speed = config.get('approach_speed', 30)
        self.flight_pattern = config.get('flight_pattern', 'zigzag')
        
        # 卡片位置记录
        self.card_positions = {}
        
        logger.info(f"ChallengeCardController initialized: {self.card_count} cards, pattern: {self.flight_pattern}")
    
    def execute_challenge_mission(self, task_id: str) -> bool:
        """执行挑战卡任务"""
        logger.info(f"Starting challenge card mission: {task_id}")
        
        try:
            # 起飞
            if not self.drone.takeoff():
                return False
            
            # 前进飞行，识别卡片
            forward_success = self._forward_flight(task_id)
            
            if not forward_success:
                logger.error("Forward flight failed")
                self.drone.land()
                return False
            
            # 返回飞行
            return_success = self._return_flight(task_id)
            
            # 降落
            self.drone.land()
            
            logger.info(f"Challenge mission completed: forward={forward_success}, return={return_success}")
            return forward_success and return_success
        
        except Exception as e:
            logger.error(f"Challenge mission error: {e}")
            self.drone.emergency_stop()
            return False
    
    def _forward_flight(self, task_id: str) -> bool:
        """前进飞行，识别1-6号卡"""
        logger.info("Starting forward flight")
        
        detected_cards = 0
        current_position = 0
        
        for card_num in range(1, self.card_count + 1):
            logger.info(f"Searching for card {card_num}")
            
            # 前进到下一个检测位置
            current_position += self.detection_distance
            if not self.drone.move_to(current_position, 0, 0):
                logger.error(f"Failed to move to position {current_position}")
                return False
            
            # 悬停稳定
            self.drone.hover(1)
            
            # 尝试检测卡片
            card_detected = self._detect_and_record_card(task_id, card_num, current_position)
            
            if card_detected:
                detected_cards += 1
                logger.info(f"Card {card_num} detected at position {current_position}")
            else:
                logger.warning(f"Card {card_num} not detected")
            
            # 检查电量
            battery = self.drone.get_battery()
            if battery < 30:
                logger.warning(f"Low battery: {battery}%, aborting mission")
                return False
        
        logger.info(f"Forward flight completed: {detected_cards}/{self.card_count} cards detected")
        return detected_cards >= self.card_count * 0.8  # 至少检测到80%的卡片
    
    def _return_flight(self, task_id: str) -> bool:
        """返回飞行，再次识别卡片"""
        logger.info("Starting return flight")
        
        detected_cards = 0
        
        # 从6号卡返回到1号卡
        for card_num in range(self.card_count, 0, -1):
            logger.info(f"Returning to card {card_num}")
            
            # 获取卡片位置
            if card_num in self.card_positions:
                position = self.card_positions[card_num]
                if not self.drone.move_to(position, 0, 0):
                    logger.error(f"Failed to return to card {card_num}")
                    continue
            else:
                # 如果没有记录位置，估算位置
                estimated_position = card_num * self.detection_distance
                if not self.drone.move_to(estimated_position, 0, 0):
                    continue
            
            # 悬停稳定
            self.drone.hover(1)
            
            # 再次检测卡片
            card_detected = self._detect_and_record_card(task_id, card_num, self.card_positions.get(card_num, 0))
            
            if card_detected:
                detected_cards += 1
        
        # 返回起点
        self.drone.move_to(0, 0, 0)
        
        logger.info(f"Return flight completed: {detected_cards}/{self.card_count} cards detected")
        return True
    
    def _detect_and_record_card(self, task_id: str, card_number: int, position: int) -> bool:
        """检测并记录卡片"""
        try:
            # 捕获图像
            filename = f"card_{card_number}_{int(time.time())}.jpg"
            image = self.image_proc.capture_image(self.drone.drone, filename)
            
            if image is None:
                return False
            
            # 检测挑战卡
            card_info = self.image_proc.detect_challenge_card(image, card_number)
            
            if card_info:
                # 记录卡片位置
                self.card_positions[card_number] = position
                
                # 保存到数据库
                card_record = {
                    'task_id': task_id,
                    'card_number': card_number,
                    'position_x': position,
                    'position_y': 0,
                    'position_z': self.drone.current_position['z'],
                    'confidence': card_info.get('confidence', 0),
                    'image_path': str(self.image_proc.storage_path / filename),
                    'metadata': {
                        'bbox': card_info.get('bbox'),
                        'center': card_info.get('center')
                    }
                }
                
                self.data_mgr.save_challenge_card(card_record)
                
                # 记录飞行事件
                self.data_mgr.log_flight_event(
                    task_id,
                    'card_detected',
                    {'card_number': card_number, 'position': position},
                    self.drone.get_battery()
                )
                
                return True
            
            return False
        
        except Exception as e:
            logger.error(f"Card detection error: {e}")
            return False
    
    def get_detected_cards(self) -> List[int]:
        """获取已检测到的卡片编号"""
        return sorted(self.card_positions.keys())
    
    def get_card_position(self, card_number: int) -> Optional[int]:
        """获取卡片位置"""
        return self.card_positions.get(card_number)
