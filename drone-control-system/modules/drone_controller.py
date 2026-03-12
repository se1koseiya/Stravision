"""
无人机控制模块
集成Tello SDK，实现飞行控制和状态监控
"""

import time
from typing import Dict, Any, Optional, Tuple
from djitellopy import Tello
from loguru import logger
from .pid_controller import PIDController


class DroneController:
    """无人机控制器"""
    
    def __init__(self, config: Dict[str, Any], flight_config: Dict[str, Any], pid_config: Dict[str, Any]):
        self.config = config
        self.flight_config = flight_config
        self.drone = None
        self.connected = False
        self.in_flight = False
        
        # PID控制器
        self.pid_x = PIDController(**pid_config['x'], max_output=pid_config['max_output'])
        self.pid_y = PIDController(**pid_config['y'], max_output=pid_config['max_output'])
        self.pid_z = PIDController(**pid_config['z'], max_output=pid_config['max_output'])
        self.pid_yaw = PIDController(**pid_config['yaw'], max_output=pid_config['max_output'])
        
        # 状态信息
        self.current_position = {'x': 0, 'y': 0, 'z': 0, 'yaw': 0}
        self.battery_level = 100
        self.flight_time = 0
        
        logger.info("DroneController initialized")
    
    def connect(self) -> bool:
        """连接无人机"""
        try:
            self.drone = Tello()
            self.drone.connect()
            self.connected = True
            self.battery_level = self.drone.get_battery()
            logger.info(f"Drone connected, battery: {self.battery_level}%")
            return True
        except Exception as e:
            logger.error(f"Failed to connect drone: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """断开连接"""
        if self.in_flight:
            self.land()
        if self.drone:
            self.drone.end()
        self.connected = False
        logger.info("Drone disconnected")
    
    def takeoff(self) -> bool:
        """起飞"""
        if not self.connected:
            logger.error("Drone not connected")
            return False
        
        if self.battery_level < self.flight_config['battery_warning']:
            logger.warning(f"Low battery: {self.battery_level}%")
            if self.battery_level < self.flight_config['battery_critical']:
                logger.error("Battery too low for takeoff")
                return False
        
        try:
            self.drone.takeoff()
            self.in_flight = True
            time.sleep(2)
            logger.info("Drone took off")
            return True
        except Exception as e:
            logger.error(f"Takeoff failed: {e}")
            return False
    
    def land(self) -> bool:
        """降落"""
        if not self.in_flight:
            return True
        
        try:
            self.drone.land()
            self.in_flight = False
            logger.info("Drone landed")
            return True
        except Exception as e:
            logger.error(f"Landing failed: {e}")
            return False
    
    def move_to(self, x: int, y: int, z: int, speed: Optional[int] = None) -> bool:
        """移动到指定位置 (cm)"""
        if not self.in_flight:
            logger.error("Drone not in flight")
            return False
        
        try:
            if speed:
                self.drone.set_speed(speed)
            else:
                self.drone.set_speed(self.flight_config['cruise_speed'])
            
            # 使用go命令移动
            self.drone.go_xyz_speed(x, y, z, self.drone.get_speed())
            self.current_position = {'x': x, 'y': y, 'z': z}
            logger.info(f"Moved to position: ({x}, {y}, {z})")
            return True
        except Exception as e:
            logger.error(f"Move failed: {e}")
            return False
    
    def move_with_pid(self, target_x: int, target_y: int, target_z: int, target_yaw: int = 0) -> bool:
        """使用PID控制移动到目标位置"""
        if not self.in_flight:
            return False
        
        tolerance = self.flight_config['position_tolerance']
        max_iterations = 50
        iteration = 0
        
        while iteration < max_iterations:
            # 获取当前位置（实际应用中需要从传感器获取）
            current_x = self.current_position['x']
            current_y = self.current_position['y']
            current_z = self.current_position['z']
            current_yaw = self.current_position['yaw']
            
            # 计算误差
            error_x = target_x - current_x
            error_y = target_y - current_y
            error_z = target_z - current_z
            error_yaw = target_yaw - current_yaw
            
            # 检查是否到达目标
            if abs(error_x) < tolerance and abs(error_y) < tolerance and abs(error_z) < tolerance:
                logger.info("Target position reached")
                return True
            
            # PID控制计算
            control_x = self.pid_x.compute(error_x)
            control_y = self.pid_y.compute(error_y)
            control_z = self.pid_z.compute(error_z)
            control_yaw = self.pid_yaw.compute(error_yaw)
            
            # 发送控制指令
            self.drone.send_rc_control(
                int(control_x),
                int(control_y),
                int(control_z),
                int(control_yaw)
            )
            
            time.sleep(0.1)
            iteration += 1
        
        logger.warning("PID control max iterations reached")
        return False
    
    def rotate(self, angle: int) -> bool:
        """旋转指定角度"""
        if not self.in_flight:
            return False
        
        try:
            if angle > 0:
                self.drone.rotate_clockwise(angle)
            else:
                self.drone.rotate_counter_clockwise(abs(angle))
            self.current_position['yaw'] += angle
            logger.info(f"Rotated {angle} degrees")
            return True
        except Exception as e:
            logger.error(f"Rotation failed: {e}")
            return False
    
    def hover(self, duration: float):
        """悬停指定时间"""
        if self.in_flight:
            time.sleep(duration)
            logger.info(f"Hovered for {duration}s")
    
    def get_battery(self) -> int:
        """获取电池电量"""
        if self.connected:
            self.battery_level = self.drone.get_battery()
        return self.battery_level
    
    def get_state(self) -> Dict[str, Any]:
        """获取无人机状态"""
        state = {
            'connected': self.connected,
            'in_flight': self.in_flight,
            'battery': self.battery_level,
            'position': self.current_position.copy(),
            'flight_time': self.flight_time
        }
        return state
    
    def emergency_stop(self):
        """紧急停止"""
        if self.drone:
            self.drone.emergency()
        logger.critical("Emergency stop executed")
