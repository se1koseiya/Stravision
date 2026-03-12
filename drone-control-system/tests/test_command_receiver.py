"""
指令接收器测试
"""

import pytest
import json
import socket
import time
from modules.command_receiver import CommandReceiver, FlightCommand


class TestCommandReceiver:
    """指令接收器测试类"""
    
    @pytest.fixture
    def receiver_config(self):
        return {
            'protocol': 'TCP',
            'host': '127.0.0.1',
            'port': 9999,
            'buffer_size': 4096,
            'queue_size': 100,
            'response_timeout': 0.5
        }
    
    @pytest.fixture
    def receiver(self, receiver_config):
        recv = CommandReceiver(receiver_config)
        recv.start()
        time.sleep(0.5)
        yield recv
        recv.stop()
    
    def test_receiver_initialization(self, receiver_config):
        """测试接收器初始化"""
        receiver = CommandReceiver(receiver_config)
        assert receiver.protocol == 'TCP'
        assert receiver.port == 9999
        assert not receiver.running
    
    def test_receiver_start_stop(self, receiver_config):
        """测试启动和停止"""
        receiver = CommandReceiver(receiver_config)
        receiver.start()
        assert receiver.running
        time.sleep(0.5)
        receiver.stop()
        assert not receiver.running
    
    def test_command_parsing(self, receiver):
        """测试指令解析"""
        command_data = {
            'task_id': 'test_001',
            'task_type': 'qr_scan',
            'priority': 8,
            'flight_path': {'waypoints': [{'x': 100, 'y': 0, 'z': 100}]},
            'capture_requirements': {'resolution': '720p'},
            'data_format': {'format': 'json'},
            'timeout': 300
        }
        
        # 发送指令
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.connect(('127.0.0.1', 9999))
        client.send(json.dumps(command_data).encode('utf-8'))
        response = client.recv(4096).decode('utf-8')
        client.close()
        
        # 验证响应
        response_data = json.loads(response)
        assert response_data['status'] == 'success'
        assert response_data['task_id'] == 'test_001'
        assert response_data['response_time'] < 0.5
        
        # 验证指令队列
        command = receiver.get_command(timeout=1.0)
        assert command is not None
        assert command.task_id == 'test_001'
        assert command.task_type == 'qr_scan'
    
    def test_priority_queue(self, receiver):
        """测试优先级队列"""
        commands = [
            {'task_id': 'low', 'task_type': 'patrol', 'priority': 3,
             'flight_path': {}, 'capture_requirements': {}, 'data_format': {}},
            {'task_id': 'high', 'task_type': 'emergency_land', 'priority': 10,
             'flight_path': {}, 'capture_requirements': {}, 'data_format': {}},
            {'task_id': 'medium', 'task_type': 'qr_scan', 'priority': 6,
             'flight_path': {}, 'capture_requirements': {}, 'data_format': {}}
        ]
        
        # 发送所有指令
        for cmd in commands:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect(('127.0.0.1', 9999))
            client.send(json.dumps(cmd).encode('utf-8'))
            client.recv(4096)
            client.close()
            time.sleep(0.1)
        
        # 验证优先级顺序
        cmd1 = receiver.get_command(timeout=1.0)
        assert cmd1.task_id == 'high'
        
        cmd2 = receiver.get_command(timeout=1.0)
        assert cmd2.task_id == 'medium'
        
        cmd3 = receiver.get_command(timeout=1.0)
        assert cmd3.task_id == 'low'
    
    def test_invalid_command(self, receiver):
        """测试无效指令"""
        invalid_data = {'invalid': 'data'}
        
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.connect(('127.0.0.1', 9999))
        client.send(json.dumps(invalid_data).encode('utf-8'))
        response = client.recv(4096).decode('utf-8')
        client.close()
        
        response_data = json.loads(response)
        assert response_data['status'] == 'error'
    
    def test_statistics(self, receiver):
        """测试统计信息"""
        command_data = {
            'task_id': 'stats_test',
            'task_type': 'qr_scan',
            'priority': 5,
            'flight_path': {},
            'capture_requirements': {},
            'data_format': {}
        }
        
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.connect(('127.0.0.1', 9999))
        client.send(json.dumps(command_data).encode('utf-8'))
        client.recv(4096)
        client.close()
        
        time.sleep(0.1)
        stats = receiver.get_stats()
        assert stats['received'] > 0
        assert stats['parsed'] > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
