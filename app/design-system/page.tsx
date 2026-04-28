'use client';

/**
 * 设计系统展示页面
 * 展示新设计规范的所有组件和样式
 */

import { useState } from 'react';
import { designSystem } from '@/lib/design-system';
import {
  DeviceCardExample,
  DeviceCardGrid,
  DataCardExample,
  ButtonExamples,
  InputExample,
} from '@/components/design-system/device-card-example';
import { Palette, Type, Box, Layers, Zap } from 'lucide-react';

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'components' | 'layout' | 'examples'>('colors');

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-[20px] border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">设计系统</h1>
              <p className="text-sm text-muted-foreground mt-1">
                STRAVISION 智慧农业平台 · Design System v1.0
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary">
                v1.0
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 导航标签 */}
      <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 py-2">
            {[
              { id: 'colors', label: '色彩系统', icon: Palette },
              { id: 'typography', label: '字体规范', icon: Type },
              { id: 'components', label: '组件库', icon: Box },
              { id: 'layout', label: '布局系统', icon: Layers },
              { id: 'examples', label: '实例展示', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-300
                    ${activeTab === tab.id
                      ? 'bg-primary text-white shadow-design-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 内容区域 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'colors' && <ColorsSection />}
        {activeTab === 'typography' && <TypographySection />}
        {activeTab === 'components' && <ComponentsSection />}
        {activeTab === 'layout' && <LayoutSection />}
        {activeTab === 'examples' && <ExamplesSection />}
      </main>
    </div>
  );
}

function ColorsSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">主色调</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorCard
            name="Primary"
            color={designSystem.colors.primary.DEFAULT}
            description="主色 - 青绿色"
          />
          <ColorCard
            name="Secondary"
            color={designSystem.colors.secondary.DEFAULT}
            description="辅助色 - 橙色"
          />
          <ColorCard
            name="Success"
            color={designSystem.colors.success}
            description="成功状态"
          />
          <ColorCard
            name="Error"
            color={designSystem.colors.error}
            description="错误状态"
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">中性色阶</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(designSystem.colors.neutral).map(([key, value]) => (
            <ColorCard
              key={key}
              name={key}
              color={value}
              description={`中性色 ${key}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ColorCard({ name, color, description }: { name: string; color: string; description: string }) {
  return (
    <div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-lg p-4 shadow-design-md">
      <div
        className="w-full h-20 rounded-lg mb-3 shadow-design-sm"
        style={{ backgroundColor: color }}
      />
      <h3 className="font-medium text-foreground">{name}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      <code className="text-xs text-primary mt-2 block font-mono">{color}</code>
    </div>
  );
}

function TypographySection() {
  return (
    <div className="space-y-8">
      <div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-lg p-6 shadow-design-lg">
        <h2 className="text-xl font-semibold text-foreground mb-6">字体层级</h2>
        
        <div className="space-y-6">
          <div>
            <h1 className="text-[32px] leading-[40px] font-medium text-foreground">
              H1 标题 - 32px / 40px
            </h1>
            <p className="text-xs text-muted-foreground mt-1">用于页面主标题</p>
          </div>

          <div>
            <h2 className="text-[28px] leading-[36px] font-medium text-foreground">
              H2 标题 - 28px / 36px
            </h2>
            <p className="text-xs text-muted-foreground mt-1">用于章节标题</p>
          </div>

          <div>
            <h3 className="text-[24px] leading-[32px] font-medium text-foreground">
              H3 标题 - 24px / 32px
            </h3>
            <p className="text-xs text-muted-foreground mt-1">用于小节标题</p>
          </div>

          <div>
            <p className="text-base leading-6 text-foreground">
              Body 正文 - 16px / 24px
            </p>
            <p className="text-xs text-muted-foreground mt-1">用于正文内容</p>
          </div>

          <div>
            <p className="text-sm leading-5 text-foreground">
              Caption 说明文字 - 14px / 20px
            </p>
            <p className="text-xs text-muted-foreground mt-1">用于辅助说明</p>
          </div>

          <div>
            <p className="text-2xl leading-8 font-semibold text-foreground">
              Number 数字 - 24px / 32px
            </p>
            <p className="text-xs text-muted-foreground mt-1">用于数据展示</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentsSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">按钮组件</h2>
        <div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-lg p-6 shadow-design-lg">
          <ButtonExamples />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">输入组件</h2>
        <div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-lg p-6 shadow-design-lg">
          <InputExample />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">数据卡片</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DataCardExample />
          <DataCardExample />
          <DataCardExample />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">圆角系统</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(designSystem.radius).map(([key, value]) => (
            <div
              key={key}
              className="bg-card/80 backdrop-blur-[20px] border border-border p-6 shadow-design-md"
              style={{ borderRadius: value }}
            >
              <p className="text-sm font-medium text-foreground">{key}</p>
              <p className="text-xs text-muted-foreground mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LayoutSection() {
  return (
    <div className="space-y-8">
      <div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-lg p-6 shadow-design-lg">
        <h2 className="text-xl font-semibold text-foreground mb-4">布局示例</h2>
        
        <div className="space-y-4">
          <div className="flex gap-4 h-32">
            <div className="w-[280px] bg-sidebar backdrop-blur-[20px] border border-sidebar-border rounded-lg p-4">
              <p className="text-sm text-sidebar-foreground">侧边栏</p>
              <p className="text-xs text-muted-foreground mt-1">280px 宽度</p>
            </div>
            
            <div className="flex-1 bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-foreground">主内容区</p>
              <p className="text-xs text-muted-foreground mt-1">自适应宽度</p>
            </div>
          </div>

          <div className="h-16 bg-card/80 backdrop-blur-[20px] border border-border rounded-lg p-4">
            <p className="text-sm text-foreground">顶部导航栏</p>
            <p className="text-xs text-muted-foreground mt-1">64px 高度</p>
          </div>
        </div>
      </div>

      <div className="bg-card/80 backdrop-blur-[20px] border border-border rounded-lg p-6 shadow-design-lg">
        <h2 className="text-xl font-semibold text-foreground mb-4">间距系统</h2>
        
        <div className="space-y-4">
          {Object.entries(designSystem.spacing).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-24 text-sm text-foreground font-medium">{key}</div>
              <div
                className="h-8 bg-primary/20 border-l-4 border-primary"
                style={{ width: value }}
              />
              <div className="text-xs text-muted-foreground">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExamplesSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">设备卡片示例</h2>
        <DeviceCardGrid />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">单个设备卡片</h2>
        <div className="max-w-md">
          <DeviceCardExample
            name="智能水泵"
            status="online"
            type="water"
            value="120"
            unit="W"
            lastUpdate="刚刚"
          />
        </div>
      </div>
    </div>
  );
}
