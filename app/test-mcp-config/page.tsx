"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function TestMCPConfigPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [rawData, setRawData] = useState<any>({})

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = () => {
    try {
      // 读取已安装的服务器列表
      const installedStr = localStorage.getItem('mcp-installed-servers')
      console.log('Installed servers:', installedStr)
      
      if (installedStr) {
        const serverIds = JSON.parse(installedStr)
        
        const loadedConfigs = serverIds.map((id: string) => {
          const configStr = localStorage.getItem(`mcp-config-${id}`)
          const enabled = localStorage.getItem(`mcp-enabled-${id}`)
          
          console.log(`Config for ${id}:`, configStr)
          console.log(`Enabled for ${id}:`, enabled)
          
          if (configStr) {
            const config = JSON.parse(configStr)
            const apiKey = config.envVars ? Object.values(config.envVars)[0] : null
            
            return {
              id: config.id,
              name: config.name,
              displayName: config.displayName || config.name,
              enabled: enabled !== "false",
              apiKey: apiKey ? `${String(apiKey).substring(0, 10)}...` : 'N/A',
              fullConfig: config
            }
          }
          return null
        }).filter(Boolean)
        
        setConfigs(loadedConfigs)
        
        // 保存原始数据用于调试
        setRawData({
          installedServers: serverIds,
          configs: loadedConfigs.map(c => c.fullConfig)
        })
      }
    } catch (error) {
      console.error('Failed to load configs:', error)
    }
  }

  const testWeatherAPI = async () => {
    const weatherService = configs.find(c => 
      c.enabled && ['caiyun-weather', 'gaode-weather', 'hefeng-weather'].includes(c.id)
    )
    
    if (!weatherService) {
      alert('没有找到已启用的天气服务')
      return
    }
    
    console.log('Testing with service:', weatherService)
    
    try {
      const response = await fetch('/api/mcp/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: weatherService.id.replace('-weather', ''),
          city: '北京',
          apiKey: weatherService.fullConfig.envVars[Object.keys(weatherService.fullConfig.envVars)[0]]
        })
      })
      
      const result = await response.json()
      console.log('Weather API result:', result)
      alert(JSON.stringify(result, null, 2))
    } catch (error) {
      console.error('Weather API error:', error)
      alert('API 调用失败: ' + error)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">MCP 配置测试</h1>
      
      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">已安装的 MCP 服务</h2>
          
          {configs.length === 0 ? (
            <p className="text-zinc-500">没有找到已安装的服务</p>
          ) : (
            <div className="space-y-2">
              {configs.map((config) => (
                <div key={config.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{config.displayName}</p>
                      <p className="text-sm text-zinc-500">ID: {config.id}</p>
                      <p className="text-sm text-zinc-500">API Key: {config.apiKey}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-sm ${config.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {config.enabled ? '已启用' : '已禁用'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">操作</h2>
          <div className="space-x-2">
            <Button onClick={loadConfigs}>刷新配置</Button>
            <Button onClick={testWeatherAPI} variant="outline">测试天气 API</Button>
            <Button 
              onClick={() => {
                console.log('Raw data:', rawData)
                alert('查看控制台输出')
              }}
              variant="outline"
            >
              查看原始数据
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">原始数据（JSON）</h2>
          <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(rawData, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  )
}
