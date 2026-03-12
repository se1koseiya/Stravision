"""
无人机控制器测试
"""

import pytest
from unittest.mock import Mock, MagicMock
from modules.drone_controller import DroneController


class TestDroneController:
    """无人机控制器测试类"""
    
    @pytest.fixture
    def tello_config(self):
        return {
            'host': '192.168.10.1',
            'port': 8889,
            'command_timeout': 7,
            'max_retry': 3
        }
    
    @pytest.fixture
    def flight_config(self):
        return {
            'takeoff_height': 100,
            'cruise_speed': 50,
            'hover_time': 2,
            'position_tolerance': 50,
            'battery_warning': 20,
            'battery_critical': 10
        }
    
    @pytest.fixture
    def pid_config(self):
        return {
            'x': {'kp': 0.5, 'ki': 0.01, 'kd': 0.1},
            'y': {'kp': 0.5, 'ki': 0.01, 'kd': 0.1},
            'z': {'kp': 0.6, 'ki': 0.02, 'kd': 0.15},
            'yaw': {'kp': 0.7, 'ki': 0.01, 'kd': 0.2},
            'max_output': 100,
            'min_output': -100
        }
    
    @pytest.fixture
    def controller(self, tello_config, flight_config, pid_config):
        ctrl = DroneController(tello_config, flight_config, pid_config)
        ctrl.drone = Mock()
        return ctrl
    
    def test_initialization(self, tello_config, flight_config, pid_config):
        """测试初始化"""
        controller = DroneController(tello_config, flight_config, pid_config)
        assert not controller.connected
        assert not controller.in_flight
        assert controller.battery_level == 100
    
    def test_connect(self, controller):
        """测试连接"""
        controller.drone.connect = Mock()
        controller.drone.get_battery = Mock(return_value=85)
        
        result = controller.connect()
        assert result
        assert controller.connected
        assert controller.battery_level == 85
    
    def test_takeoff(self, controller):
        """测试起飞"""
        controller.connected = True
        controller.battery_level = 80
        controller.drone.takeoff = Mock()
        
        result = controller.takeoff()
        assert result
        assert controller.in_flight
        controller.drone.takeoff.assert_called_once()
    
    def test_takeoff_low_battery(self, controller):
        """测试低电量起飞"""
        controller.connected = True
        controller.battery_level = 5
        
        result = controller.takeoff()
        assert not result
        assert not controller.in_flight
    
    def test_land(self, controller):
        """测试降落"""
        controller.in_flight = True
        controller.drone.land = Mock()
        
        result = controller.land()
        assert result
        assert not controller.in_flight
        controller.drone.land.assert_called_once()
    
    def test_move_to(self, controller):
        """测试移动"""
        controller.in_flight = True
        controller.drone.set_speed = Mock()
        controller.drone.get_speed = Mock(return_value=50)
        controller.drone.go_xyz_speed = Mock()
        
        result = controller.move_to(100, 50, 100)
        assert result
        assert controller.current_position['x'] == 100
        assert controller.current_position['y'] == 50
        assert controller.current_position['z'] == 100
    
    def test_rotate(self, controller):
        """测试旋转"""
        controller.in_flight = True
        controller.drone.rotate_clockwise = Mock()
        controller.drone.rotate_counter_clockwise = Mock()
        
        # 顺时针旋转
        result = controller.rotate(90)
        assert result
        controller.drone.rotate_clockwise.assert_called_with(90)
        
        # 逆时针旋转
        result = controller.rotate(-45)
        assert result
        controller.drone.rotate_counter_clockwise.assert_called_with(45)
    
    def test_get_state(self, controller):
        """测试获取状态"""
        controller.connected = True
        controller.in_flight = True
        controller.battery_level = 75
        
        state = controller.get_state()
        assert state['connected']
        assert state['in_flight']
        assert state['battery'] == 75
        assert 'position' in state


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
