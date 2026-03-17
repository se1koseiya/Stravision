"""
植物巡检无人机控制系统 - 主程序
"""

import sys
import time
import signal
from pathlib import Path
from loguru import logger

# 添加模块路径
sys.path.insert(0, str(Path(__file__).parent))

from config import *
from modules import (
    CommandReceiver,
    DroneController,
    ImageProcessor,
    DataManager,
    DataUploader,
    ChallengeCardController
)


class DroneInspectionSystem:
    """无人机巡检系统主控制器"""
    
    def __init__(self):
        # 配置日志
        logger.remove()
        logger.add(
            LOG_CONFIG['file'],
            rotation=f"{LOG_CONFIG['max_bytes']} bytes",
            retention=LOG_CONFIG['backup_count'],
            level=LOG_CONFIG['level'],
            format=LOG_CONFIG['format']
        )
        if LOG_CONFIG['console_output']:
            logger.add(sys.stdout, level=LOG_CONFIG['level'])
        
        logger.info("=" * 60)
        logger.info("Drone Inspection System Starting")
        logger.info("=" * 60)
        
        # 初始化各模块
        self.command_receiver = CommandReceiver(COMMAND_RECEIVER_CONFIG)
        self.drone_controller = DroneController(TELLO_CONFIG, FLIGHT_CONFIG, PID_CONFIG)
        self.image_processor = ImageProcessor(IMAGE_CONFIG, IMAGE_DIR)
        self.data_manager = DataManager(DATABASE_CONFIG['db_path'])
        self.data_uploader = DataUploader(UPLOAD_CONFIG, STRAVISION_CONFIG)
        self.challenge_controller = ChallengeCardController(
            CHALLENGE_CARD_CONFIG,
            self.drone_controller,
            self.image_processor,
            self.data_manager
        )
        
        self.running = False
        self.current_task = None
        
        # 注册信号处理
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def start(self):
        """启动系统"""
        logger.info("System starting...")
        
        # 启动指令接收器
        self.command_receiver.start()
        
        # 连接无人机
        if not self.drone_controller.connect():
            logger.error("Failed to connect to drone, running in simulation mode")
            if not TEST_CONFIG['mock_mode']:
                return False
        
        self.running = True
        logger.info("System started successfully")
        
        # 主循环
        self._main_loop()
        
        return True
    
    def stop(self):
        """停止系统"""
        logger.info("System stopping...")
        self.running = False
        
        # 停止各模块
        self.command_receiver.stop()
        self.drone_controller.disconnect()
        self.data_manager.close()
        
        # 打印统计信息
        self._print_statistics()
        
        logger.info("System stopped")
    
    def _main_loop(self):
        """主循环"""
        logger.info("Entering main loop")
        
        while self.running:
            try:
                # 获取指令
                command = self.command_receiver.get_command(timeout=1.0)
                
                if command is None:
                    continue
                
                logger.info(f"Processing command: {command.task_id}, type: {command.task_type}")
                self.current_task = command
                
                # 执行任务
                success = self._execute_task(command)
                
                # 上传数据
                if success:
                    self._upload_task_data(command.task_id)
                
                # 记录任务完成
                self.data_manager.log_flight_event(
                    command.task_id,
                    'task_completed',
                    {'success': success, 'task_type': command.task_type},
                    self.drone_controller.get_battery()
                )
                
                self.current_task = None
                
            except KeyboardInterrupt:
                logger.info("Keyboard interrupt received")
                break
            except Exception as e:
                logger.error(f"Main loop error: {e}")
                time.sleep(1)
    
    def _execute_task(self, command) -> bool:
        """执行任务"""
        task_type = command.task_type
        
        if task_type == 'challenge_card':
            return self._execute_challenge_card_task(command)
        elif task_type == 'qr_scan':
            return self._execute_qr_scan_task(command)
        elif task_type == 'patrol':
            return self._execute_patrol_task(command)
        elif task_type == 'emergency_land':
            return self.drone_controller.land()
        else:
            logger.error(f"Unknown task type: {task_type}")
            return False
    
    def _execute_challenge_card_task(self, command) -> bool:
        """执行挑战卡任务"""
        logger.info(f"Executing challenge card task: {command.task_id}")
        return self.challenge_controller.execute_challenge_mission(command.task_id)
    
    def _execute_qr_scan_task(self, command) -> bool:
        """执行QR码扫描任务"""
        logger.info(f"Executing QR scan task: {command.task_id}")
        
        try:
            # 起飞
            if not self.drone_controller.takeoff():
                return False
            
            # 获取扫描路径
            waypoints = command.flight_path.get('waypoints', [])
            
            for i, waypoint in enumerate(waypoints):
                logger.info(f"Moving to waypoint {i+1}/{len(waypoints)}")
                
                # 移动到路径点
                x, y, z = waypoint['x'], waypoint['y'], waypoint['z']
                if not self.drone_controller.move_to(x, y, z):
                    logger.error(f"Failed to reach waypoint {i+1}")
                    continue
                
                # 悬停稳定
                self.drone_controller.hover(FLIGHT_CONFIG['hover_time'])
                
                # 拍照并识别QR码
                filename = self.image_processor.generate_filename(f"scan_{i}", i)
                image = self.image_processor.capture_image(self.drone_controller.drone, filename)
                
                if image is not None:
                    qr_codes = self.image_processor.detect_qr_code(image)
                    
                    for qr in qr_codes:
                        # 保存记录
                        record = {
                            'task_id': command.task_id,
                            'qr_code': qr['data'],
                            'gps_latitude': waypoint.get('lat'),
                            'gps_longitude': waypoint.get('lon'),
                            'altitude': z,
                            'image_path': str(IMAGE_DIR / filename),
                            'image_size': Path(IMAGE_DIR / filename).stat().st_size,
                            'detection_confidence': 0.95,
                            'metadata': {'bbox': qr.get('bbox')}
                        }
                        self.data_manager.save_inspection_record(record)
                        logger.info(f"QR code detected: {qr['data']}")
            
            # 降落
            self.drone_controller.land()
            return True
        
        except Exception as e:
            logger.error(f"QR scan task error: {e}")
            self.drone_controller.land()
            return False
    
    def _execute_patrol_task(self, command) -> bool:
        """执行巡逻任务"""
        logger.info(f"Executing patrol task: {command.task_id}")
        # 实现巡逻逻辑
        return True
    
    def _upload_task_data(self, task_id: str):
        """上传任务数据"""
        logger.info(f"Uploading data for task: {task_id}")
        
        try:
            # 获取任务数据
            records = self.data_manager.get_records_by_task(task_id)
            cards = self.data_manager.get_challenge_cards_by_task(task_id)
            
            # 上传
            if self.data_uploader.upload_inspection_data(records, cards):
                # 标记为已上传
                for record in records:
                    self.data_manager.mark_as_uploaded(record['id'])
                logger.info("Data uploaded successfully")
            else:
                logger.error("Data upload failed")
        
        except Exception as e:
            logger.error(f"Upload error: {e}")
    
    def _print_statistics(self):
        """打印统计信息"""
        logger.info("=" * 60)
        logger.info("System Statistics")
        logger.info("=" * 60)
        
        cmd_stats = self.command_receiver.get_stats()
        logger.info(f"Commands - Received: {cmd_stats['received']}, Parsed: {cmd_stats['parsed']}, Errors: {cmd_stats['errors']}")
        
        img_stats = self.image_processor.get_stats()
        logger.info(f"Images - Captured: {img_stats['images_captured']}, QR Detected: {img_stats['qr_codes_detected']}")
        logger.info(f"Detection Accuracy: {img_stats['detection_accuracy']:.2%}")
        
        db_stats = self.data_manager.get_statistics()
        logger.info(f"Database - Records: {db_stats['total_records']}, Uploaded: {db_stats['uploaded_records']}")
        
        upload_stats = self.data_uploader.get_stats()
        logger.info(f"Upload - Success Rate: {upload_stats['success_rate']:.2%}")
        
        logger.info("=" * 60)
    
    def _signal_handler(self, signum, frame):
        """信号处理"""
        logger.info(f"Signal {signum} received")
        self.stop()
        sys.exit(0)


def main():
    """主函数"""
    system = DroneInspectionSystem()
    
    try:
        system.start()
    except Exception as e:
        logger.critical(f"System error: {e}")
        system.stop()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
