"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, CloudSun, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function TencentMapTestPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testIp, setTestIp] = useState("")
  const [error, setError] = useState<string | null>(null)

  const runTest = async (useCustomIp = false) => {
    setLoading(true)
    setData(null)
    setError(null)
    
    try {
      let url = '/api/weather?useIP=true'
      if (useCustomIp && testIp) {
        const cleanIp = testIp.trim()
        url += `&clientIp=${encodeURIComponent(cleanIp)}`
      }
      
      const startTime = performance.now()
      const res = await fetch(url)
      const endTime = performance.now()
      
      const json = await res.json()
      
      setData({
        ...json,
        _meta: {
          status: res.status,
          duration: Math.round(endTime - startTime),
          url: url
        }
      })
      
      if (!res.ok) {
        setError(json.error || `HTTP Error ${res.status}`)
      }
    } catch (e: any) {
      setError(e.message || "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">腾讯地图服务集成测试</h1>
        <p className="text-muted-foreground">
          验证服务端 IP 定位 (Location) 和天气服务 (Weather) 的连通性及签名 (SN) 配置。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle>测试控制</CardTitle>
            <CardDescription>发起 API 请求以验证配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>测试模式</Label>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => runTest(false)} 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                  使用当前 IP 测试
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="custom-ip">模拟特定 IP (测试 IP 白名单或定位准确性)</Label>
              <div className="flex gap-2">
                <Input 
                  id="custom-ip" 
                  placeholder="例如: 115.192.0.1 (浙江宁波)" 
                  value={testIp}
                  onChange={(e) => setTestIp(e.target.value)}
                />
                <Button 
                  variant="secondary"
                  onClick={() => runTest(true)}
                  disabled={loading || !testIp}
                >
                  测试此 IP
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                注意：在开发环境 localhost 测试时，默认 IP 可能是 127.0.0.1 或 ::1，建议手动输入一个公网 IP 进行测试。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 结果摘要 */}
        <Card>
          <CardHeader>
            <CardTitle>状态摘要</CardTitle>
            <CardDescription>API 响应解析</CardDescription>
          </CardHeader>
          <CardContent>
            {!data && !error && !loading && (
              <div className="flex items-center justify-center h-[140px] text-muted-foreground border-2 border-dashed rounded-lg">
                等待测试...
              </div>
            )}
            
            {loading && (
              <div className="flex items-center justify-center h-[140px] text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>测试失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {data && !loading && !error && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">HTTP 状态</span>
                  <Badge variant={data._meta.status === 200 ? "default" : "destructive"}>
                    {data._meta.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">数据源</span>
                  <Badge variant="outline" className="font-mono">
                    {data.locationSource || 'unknown'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">响应时间</span>
                  <span className="font-mono text-sm">{data._meta.duration}ms</span>
                </div>

                <div className="pt-2 border-t space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{data.location?.name || '未知位置'}</span>
                    <span className="text-xs text-muted-foreground">
                      ({data.location?.region}, {data.location?.country})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CloudSun className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{data.current?.temp_c}°C</span>
                    <span className="text-sm text-muted-foreground">{data.current?.condition?.text}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 详细 JSON */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>完整响应数据</CardTitle>
            <CardDescription className="font-mono text-xs break-all">{data._meta.url}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-auto max-h-[500px] font-mono text-xs">
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
