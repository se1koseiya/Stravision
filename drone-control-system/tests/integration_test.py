"""
集成测试
测试完整的巡检流程
"""

import sys
import time
import json
import socket
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import *
from modules import (
    CommandReceiver,
    DroneController,
    ImageProcessor,
    DataManager,
    DataUploader,
    ChallengeCardController
)
from loguru import logger


class IntegrationTest:
    """集成测试类"""
    
    def __init__(self):
        logger.info("Initializing integration test")
        
        # 设置测试模式
        TEST_CONFIG['mock_mode'] = True
        
        # 初始化模块
        self.command_receiver = CommandReceiver(COMMAND_RECEIVER_CONFIG)
        self.drone_controller = DroneController(TELLO_CONFIG, FLIGHT_CONFIG, PID_CONFIG)
        self.image_processor = ImageProcessor(IMAGE_CONFIG, IMAGE_DIR)
        self.data_manager = DataManager(DATABASE_DIR / "test.db")
        self.data_uploader = DataUploader(UPLOAD_CONFIG, STRAVISION_CONFIG)
        
        self.test_results = []
    
    def run_all_tests(self):
        """运行所有测试"""
        logger.info("=" * 60)
        logger.info("Starting Integration Tests")
        logger.info("=" * 60)
        
        tests = [
            self.test_command_flow,
            self.test_data_persistence,
            self.test_performance_metrics
        ]
        
        for test in tests:
            try:
                logger.info(f"\nRunning: {test.__name__}")
                result = test()
                self.test_results.append({
                    'test': test.__name__,
                    'result': 'PASS' if result else 'FAIL'
                })
                logger.info(f"Result: {'PASS' if result else 'FAIL'}")
            except Exception as e:
                logger.error(f"Test failed with exception: {e}")
                self.test_results.append({
                    'test': test.__name__,
                    'result': 'ERROR',
                    'error': str(e)
                })
        
        self.print_summary()
    
    def test_command_flow(self) -> bool:
        """测试指令流程"""
        logger.info("Testing command flow...")
        
        # 启动接收器
        self.command_receiver.start()
        time.sleep(0.5)
        
        # 发送测试指令
        command_data = {
            'task_id': 'integration_test_001',
            'task_type': 'qr_scan',
            'priority': 8,
            'flight_path': {
                'waypoints': [
                    {'x': 100, 'y': 0, 'z': 100, 'lat': 31.23, 'lon': 121.47}
                ]
            },
            'capture_requirements': {'resolution': '720p'},
            'data_format': {'format': 'json'},
            'timeout': 300
        }
        
        try:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect(('127.0.0.1', COMMAND_RECEIVER_CONFIG['port']))
            client.send(json.dumps(command_data).encode('utf-8'))
            response = client.recv(4096).decode('utf-8')
            client.close()
            
            response_data = json.loads(response)
            
            # 验证响应
            if response_data['status'] != 'success':
                return False
            
            # 验证响应时间
            if response_data['response_time'] >= 0.5:
                logger.warning(f"Response time too high: {response_data['response_time']:.3f}s")
                return False
            
            # 获取指令
            command = self.command_receiver.get_command(timeout=2.0)
            if command is None or command.task_id != 'integration_test_001':
                return False
            
            logger.info("Command flow test passed")
            return True
        
        except Exception as e:
            logger.error(f"Command flow test error: {e}")
            return False
        finally:
            self.command_receiver.stop()
    
    def test_data_persistence(self) -> bool:
        """测试数据持久化"""
        logger.info("Testing data persistence...")
        
        try:
            # 保存测试记录
            record = {
                'task_id': 'integration_test_002',
                'qr_code': 'TEST_QR_001',
                'gps_latitude': 31.2304,
                'gps_longitude': 121.4737,
                'altitude': 100,
                'image_path': '/test/path/image.jpg',
                'image_size': 1024000,
                'detection_confidence': 0.96,
                'metadata': {'test': True}
            }
            
            record_id = self.data_manager.save_inspection_record(record)
            if record_id <= 0:
                return False
            
            # 保存挑战卡
            card = {
                'task_id': 'integration_test_002',
                'card_number': 1,
                'position_x': 100,
                'position_y': 0,
                'position_z': 100,
                'confidence': 0.88,
                'image_path': '/test/path/card.jpg',
                'metadata': {}
            }
            
            card_id = self.data_manager.save_challenge_card(card)
            if card_id <= 0:
                return False
            
            # 验证数据
            records = self.data_manager.get_records_by_task('integration_test_002')
            if len(records) != 1:
                return False
            
            cards = self.data_manager.get_challenge_cards_by_task('integration_test_002')
            if len(cards) != 1:
                return False
            
            logger.info("Data persistence test passed")
            return True
        
        except Exception as e:
            logger.error(f"Data persistence test error: {e}")
            return False
    
    def test_performance_metrics(self) -> bool:
        """测试性能指标"""
        logger.info("Testing performance metrics...")
        
        try:
            # 测试指令响应时间
            start_time = time.time()
            self.command_receiver.start()
            time.sleep(0.1)
            
            command_data = {
                'task_id': 'perf_test',
                'task_type': 'patrol',
                'priority': 5,
                'flight_path': {},
                'capture_requirements': {},
                'data_format': {}
            }
            
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect(('127.0.0.1', COMMAND_RECEIVER_CONFIG['port']))
            client.send(json.dumps(command_data).encode('utf-8'))
            response = client.recv(4096).decode('utf-8')
            client.close()
            
            response_time = time.time() - start_time
            
            self.command_receiver.stop()
            
            # 验证性能指标
            if response_time >= PERFORMANCE_CONFIG['alert_thresholds']['response_time']:
                logger.warning(f"Response time threshold exceeded: {response_time:.3f}s")
                return False
            
            logger.info(f"Performance test passed (response time: {response_time:.3f}s)")
            return True
        
        except Exception as e:
            logger.error(f"Performance test error: {e}")
            return False
    
    def print_summary(self):
        """打印测试摘要"""
        logger.info("\n" + "=" * 60)
        logger.info("Integration Test Summary")
        logger.info("=" * 60)
        
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r['result'] == 'PASS')
        failed = sum(1 for r in self.test_results if r['result'] == 'FAIL')
        errors = sum(1 for r in self.test_results if r['result'] == 'ERROR')
        
        for result in self.test_results:
            status = result['result']
            logger.info(f"{result['test']}: {status}")
            if 'error' in result:
                logger.info(f"  Error: {result['error']}")
        
        logger.info("-" * 60)
        logger.info(f"Total: {total}, Passed: {passed}, Failed: {failed}, Errors: {errors}")
        logger.info(f"Success Rate: {passed/total*100:.1f}%")
        logger.info("=" * 60)
    
    def cleanup(self):
        """清理测试资源"""
        self.data_manager.close()


def main():
    """主函数"""
    test = IntegrationTest()
    
    try:
        test.run_all_tests()
    finally:
        test.cleanup()


if __name__ == "__main__":
    main()
