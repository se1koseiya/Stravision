"""
PID控制器
用于飞行稳定控制
"""

import time
from typing import Optional


class PIDController:
    """PID控制器实现"""
    
    def __init__(self, kp: float, ki: float, kd: float, max_output: float = 100, min_output: float = -100):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.max_output = max_output
        self.min_output = min_output
        
        self.last_error = 0.0
        self.integral = 0.0
        self.last_time = None
    
    def compute(self, error: float, dt: Optional[float] = None) -> float:
        """计算PID输出"""
        current_time = time.time()
        
        if self.last_time is None:
            self.last_time = current_time
            dt = 0.1
        elif dt is None:
            dt = current_time - self.last_time
        
        # 比例项
        p_term = self.kp * error
        
        # 积分项
        self.integral += error * dt
        i_term = self.ki * self.integral
        
        # 微分项
        derivative = (error - self.last_error) / dt if dt > 0 else 0
        d_term = self.kd * derivative
        
        # 计算输出
        output = p_term + i_term + d_term
        
        # 限幅
        output = max(self.min_output, min(self.max_output, output))
        
        # 更新状态
        self.last_error = error
        self.last_time = current_time
        
        return output
    
    def reset(self):
        """重置控制器"""
        self.last_error = 0.0
        self.integral = 0.0
        self.last_time = None
    
    def set_gains(self, kp: float, ki: float, kd: float):
        """设置PID参数"""
        self.kp = kp
        self.ki = ki
        self.kd = kd
