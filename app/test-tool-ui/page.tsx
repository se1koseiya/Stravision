"use client"

import { MCPToolDisplay } from "@/components/ai/mcp-tool-display"

export default function TestToolUIPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">工具UI测试页面</h1>
      
      <div className="space-y-6">
        {/* 成功状态 */}
        <MCPToolDisplay
          toolName="mcp_caiyun_weather"
          toolDescription="查询指定地点的天气信息"
          result="success"
          executionTime={120}
          input={{
            location: "北京市",
            units: "celsius"
          }}
          output={{
            temperature: 22,
            condition: "晴朗",
            humidity: 45,
            wind: "东北风 3级"
          }}
        />

        {/* 错误状态 */}
        <MCPToolDisplay
          toolName="mcp_exa_search"
          toolDescription="使用Exa搜索引擎进行网络搜索"
          result="error"
          executionTime={5000}
          input={{
            query: "人工智能最新发展",
            num_results: 10
          }}
          errorText="网络连接超时，请稍后重试"
        />

        {/* 加载状态 */}
        <MCPToolDisplay
          toolName="get_all_spectrum"
          toolDescription="获取光谱仪的全波段数据"
          result="loading"
          input={{
            device_id: "spectrum_001",
            channels: "all"
          }}
        />

        {/* 设备状态检查 */}
        <MCPToolDisplay
          toolName="device_status_check"
          toolDescription="确认所有设备关闭状态"
          result="success"
          executionTime={150}
          input={{
            devices: ["water_pump", "fan", "grow_light"]
          }}
          output={{
            water_pump: "关闭",
            fan: "关闭", 
            grow_light: "关闭",
            all_devices_off: true
          }}
        />
      </div>
    </div>
  )
}