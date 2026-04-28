/**
 * 设备卡片示例组件
 * 展示新设计系统的应用
 */

import { designSystem } from '@/lib/design-system';
import { Power, Droplets, Thermometer, Wind } from 'lucide-react';

interface DeviceCardProps {
  name: string;
  status: 'online' | 'offline' | 'warning';
  type: 'water' | 'temperature' | 'fan' | 'light';
  value?: string;
  unit?: string;
  lastUpdate?: string;
}

const iconMap = {
  water: Droplets,
  temperature: Thermometer,
  fan: Wind,
  light: Power,
};

const statusConfig = {
  online: {
    badge: 'bg-primary/15 text-primary',
    label: '在线',
    indicator: 'bg-primary',
  },
  offline: {
    badge: 'bg-destructive/15 text-destructive',
    label: '离线',
    indicator: 'bg-destructive',
  },
  warning: {
    badge: 'bg-[#FF9F43]/15 text-[#FF9F43]',
    label: '警告',
    indicator: 'bg-[#FF9F43]',
  },
};

export function DeviceCardExample({
  name,
  status,
  type,
  value,
  unit,
  lastUpdate,
}: DeviceCardProps) {
  const Icon = iconMap[type];
  const statusStyle = statusConfig[status];

  return (
    <div
      className="
        group
        relative
        bg-card/80 
        backdrop-blur-[20px] 
        border border-border 
        rounded-[12px]
        p-6 
        shadow-design-lg
        hover:bg-card/90
        hover:scale-[1.01]
        transition-all duration-300 ease-out
        overflow-hidden
      "
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* 内容 */}
      <div className="relative z-10">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {type === 'water' && '灌溉系统'}
                {type === 'temperature' && '温度传感器'}
                {type === 'fan' && '通风系统'}
                {type === 'light' && '照明系统'}
              </p>
            </div>
          </div>

          {/* 状态指示器 */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusStyle.indicator} animate-pulse`} />
            <span className={`text-xs px-2 py-1 rounded-md ${statusStyle.badge}`}>
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* 数值显示 */}
        {value && (
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-foreground">
                {value}
              </span>
              {unit && (
                <span className="text-lg text-muted-foreground">{unit}</span>
              )}
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {lastUpdate || '刚刚更新'}
          </span>
          
          <button
            className="
              text-xs 
              text-primary 
              hover:text-primary/80
              transition-colors duration-200
            "
          >
            查看详情 →
          </button>
        </div>
      </div>

      {/* 悬停光效 */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}

/**
 * 设备卡片网格示例
 */
export function DeviceCardGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <DeviceCardExample
        name="水泵 #1"
        status="online"
        type="water"
        value="120"
        unit="W"
        lastUpdate="2分钟前"
      />
      
      <DeviceCardExample
        name="温度传感器"
        status="online"
        type="temperature"
        value="19.2"
        unit="°C"
        lastUpdate="刚刚"
      />
      
      <DeviceCardExample
        name="排风扇"
        status="warning"
        type="fan"
        value="850"
        unit="RPM"
        lastUpdate="5分钟前"
      />
      
      <DeviceCardExample
        name="LED灯带"
        status="offline"
        type="light"
        lastUpdate="1小时前"
      />
    </div>
  );
}

/**
 * 数据卡片示例
 */
export function DataCardExample() {
  return (
    <div className="
      bg-card/80 
      backdrop-blur-[20px] 
      border border-border 
      rounded-[12px]
      p-6 
      shadow-design-lg
    ">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">环境温度</span>
        <span className="text-xs px-2 py-1 rounded-md bg-primary/15 text-primary">
          实时
        </span>
      </div>
      
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-semibold text-foreground">19.2</span>
        <span className="text-muted-foreground">°C</span>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>正常范围</span>
        <span className="text-primary">18-25°C</span>
      </div>
      
      {/* 进度条 */}
      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: '64%' }}
        />
      </div>
    </div>
  );
}

/**
 * 按钮示例
 */
export function ButtonExamples() {
  return (
    <div className="flex flex-wrap gap-4 p-6">
      {/* 主按钮 */}
      <button className="
        bg-primary 
        text-white 
        rounded-lg
        px-6 py-3 
        font-medium
        hover:bg-primary/90 
        active:bg-primary/80
        transition-all duration-300
        shadow-design-md
        hover:shadow-design-lg
      ">
        主要操作
      </button>

      {/* 次要按钮 */}
      <button className="
        bg-primary/15 
        text-primary 
        rounded-lg
        px-6 py-3 
        font-medium
        hover:bg-primary/25 
        active:bg-primary/35
        transition-all duration-300
      ">
        次要操作
      </button>

      {/* 危险按钮 */}
      <button className="
        bg-destructive/15 
        text-destructive 
        rounded-lg
        px-6 py-3 
        font-medium
        hover:bg-destructive/25 
        active:bg-destructive/35
        transition-all duration-300
      ">
        删除
      </button>

      {/* 禁用按钮 */}
      <button 
        disabled
        className="
          bg-muted 
          text-muted-foreground 
          rounded-lg
          px-6 py-3 
          font-medium
          cursor-not-allowed
          opacity-50
        "
      >
        禁用状态
      </button>
    </div>
  );
}

/**
 * 输入框示例
 */
export function InputExample() {
  return (
    <div className="space-y-4 p-6 max-w-md">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          设备名称
        </label>
        <input
          type="text"
          placeholder="请输入设备名称"
          className="
            w-full 
            bg-input 
            border border-border 
            rounded-lg
            px-4 py-3 
            text-foreground
            placeholder:text-muted-foreground
            focus:outline-none 
            focus:ring-2 
            focus:ring-primary 
            focus:border-transparent
            transition-all duration-300
          "
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          设备类型
        </label>
        <select
          className="
            w-full 
            bg-input 
            border border-border 
            rounded-lg
            px-4 py-3 
            text-foreground
            focus:outline-none 
            focus:ring-2 
            focus:ring-primary 
            focus:border-transparent
            transition-all duration-300
          "
        >
          <option>传感器</option>
          <option>执行器</option>
          <option>控制器</option>
        </select>
      </div>
    </div>
  );
}
