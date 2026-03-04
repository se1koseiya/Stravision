# Implementation Plan

- [x] 1. 安装依赖和配置环境





  - 安装mqtt npm包用于Node.js MQTT客户端
  - 创建.env.local文件，配置MQTT连接参数（host、port、username、password、topics）
  - 更新.gitignore确保敏感配置不被提交
  - _Requirements: 1.1, 4.1, 4.2_

- [x] 2. 实现MQTT配置管理模块





  - 创建lib/mqtt-config.ts文件
  - 实现getMQTTConfig()函数，从环境变量读取配置
  - 实现validateMQTTConfig()函数，验证配置完整性和有效性
  - 导出MQTTConfig接口类型定义
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. 实现MQTT服务核心模块




- [x] 3.1 创建MQTTService单例类基础结构


  - 创建lib/mqtt-service.ts文件
  - 实现单例模式（private constructor + getInstance()）
  - 定义DeviceData和ControlCommand接口
  - 初始化私有属性（client、config、latestData、dataListeners）
  - _Requirements: 1.1, 1.2_

- [x] 3.2 实现MQTT连接和断开逻辑


  - 实现connect()方法，使用mqtt.connect()建立TLS连接
  - 配置连接选项（keepalive、reconnectPeriod、clean session）
  - 实现disconnect()方法，优雅关闭连接
  - 实现isConnected()方法，返回连接状态
  - 添加连接成功/失败/断开的事件处理
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3.3 实现MQTT消息订阅和处理


  - 在connect()成功后订阅subscribeTopic
  - 实现handleMessage()私有方法，解析JSON数据
  - 实现数据验证和转换（温度/湿度除以10）
  - 更新latestData缓存
  - 通知所有dataListeners
  - 添加错误处理（JSON解析失败、字段缺失）
  - _Requirements: 1.4, 2.3, 6.1, 6.2, 6.3, 6.4_

- [x] 3.4 实现数据订阅和获取接口


  - 实现getLatestData()方法，返回缓存的最新数据
  - 实现subscribeToData()方法，添加数据监听器
  - 返回取消订阅函数（从dataListeners中移除）
  - _Requirements: 2.3_

- [x] 3.5 实现控制命令发送功能


  - 实现sendControlCommand()方法，接收ControlCommand参数
  - 实现buildControlPayload()私有方法，构建设备协议JSON
  - 处理继电器控制（node0601-node0604映射）
  - 处理LED控制（node0501-node0504映射）
  - 使用client.publish()发送到publishTopic，QoS=1
  - 添加错误处理和日志记录
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 3.6 实现日志记录功能


  - 添加结构化日志输出（时间戳、级别、组件、消息）
  - 记录MQTT连接、断开、订阅、发布事件
  - 记录设备数据摘要（不记录完整数据）
  - 记录控制命令详情
  - 记录错误和异常
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. 实现SSE实时数据推送API




- [x] 4.1 创建SSE API路由


  - 创建app/api/mqtt/stream/route.ts文件
  - 实现GET处理函数，返回text/event-stream响应
  - 设置响应头（Content-Type、Cache-Control、Connection）
  - _Requirements: 2.1_

- [x] 4.2 实现SSE连接管理和数据推送

  - 创建ReadableStream用于SSE数据流
  - 获取MQTTService实例并订阅数据更新
  - 发送初始连接消息（type: 'connected'）
  - 发送最新设备数据（如果有）
  - 监听MQTT数据更新，格式化为SSE消息并推送
  - 实现连接关闭时的清理逻辑（取消订阅）
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 4.3 添加SSE认证和错误处理


  - 从请求头获取JWT token并验证（可选，根据需求）
  - 处理MQTT未连接的情况，返回错误消息
  - 添加try-catch捕获异常
  - _Requirements: 2.2_

- [x] 5. 实现控制命令HTTP API




- [x] 5.1 创建控制API路由


  - 创建app/api/mqtt/control/route.ts文件
  - 定义ControlRequest和ControlResponse接口
  - 实现POST处理函数
  - _Requirements: 3.1_

- [x] 5.2 实现请求验证和命令发送


  - 解析请求body，提取控制参数
  - 验证必填字段（type、relayNum/led值）
  - 验证数据范围（relayNum 5-8、LED 0-255、state 0-1）
  - 调用MQTTService.sendControlCommand()发送命令
  - 返回成功/失败响应
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5.3 添加认证和错误处理


  - 从请求头获取JWT token并验证（可选）
  - 处理MQTT未连接的情况，返回503错误
  - 处理命令发送失败，返回500错误
  - 添加try-catch捕获异常
  - _Requirements: 3.5_

- [x] 6. 前端集成和适配




- [x] 6.1 移除老版本MQTT依赖


  - 从index.html中移除Paho MQTT库引用
  - 删除或注释app.js中的MQTT连接代码
  - _Requirements: 2.1_

- [x] 6.2 实现SSE数据接收（新版本前端）


  - 在设备监控页面创建EventSource连接到/api/mqtt/stream
  - 实现onmessage处理函数，解析设备数据并更新UI
  - 实现onerror处理函数，处理连接错误和重连
  - 实现连接状态显示
  - _Requirements: 2.3_

- [x] 6.3 实现控制命令发送（新版本前端）


  - 修改继电器控制函数，使用fetch POST到/api/mqtt/control
  - 修改LED控制函数，使用fetch POST到/api/mqtt/control
  - 添加请求头（Content-Type、Authorization）
  - 处理响应，显示成功/失败提示
  - 实现乐观更新（立即更新UI，等待服务器确认）
  - _Requirements: 3.1, 3.5_

- [ ] 7. 测试和验证
- [ ] 7.1 测试MQTT连接和数据接收
  - 启动Next.js开发服务器
  - 检查控制台日志，确认MQTT连接成功
  - 使用Python监听器验证MQTT消息格式
  - 验证设备数据能够正确接收和解析
  - _Requirements: 1.1, 1.4, 5.1, 5.2, 5.3_

- [ ] 7.2 测试SSE实时推送
  - 在浏览器中打开设备监控页面
  - 使用开发者工具检查SSE连接状态
  - 验证设备数据能够实时显示在UI上
  - 测试连接断开和重连机制
  - _Requirements: 2.1, 2.3_

- [ ] 7.3 测试控制命令发送
  - 测试继电器开关控制
  - 测试LED亮度调节
  - 验证命令能够通过MQTT发送到设备
  - 验证设备响应并更新状态
  - 使用Python监听器查看发送的MQTT消息
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 7.4 性能和压力测试
  - 测试多个并发SSE连接
  - 测试高频率控制命令发送
  - 监控内存和CPU使用情况
  - 验证MQTT连接稳定性
  - _Requirements: 1.2_

- [ ] 8. 文档和部署准备
- [ ] 8.1 更新项目文档
  - 更新README.md，添加MQTT后端配置说明
  - 创建.env.example文件，提供环境变量模板
  - 更新Python监听器使用说明
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8.2 生产环境配置
  - 配置生产环境的MQTT凭证
  - 设置日志级别为INFO
  - 配置错误监控和告警
  - 准备部署脚本
  - _Requirements: 4.1, 7.5_
