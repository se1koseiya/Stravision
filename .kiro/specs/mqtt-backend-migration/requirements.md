# Requirements Document

## Introduction

本文档定义了将老版本物联网设备监控系统的MQTT后端功能迁移到新版本Next.js应用的需求。老版本使用浏览器端直接连接MQTT Broker（通过Paho MQTT WebSocket），新版本需要实现服务器端MQTT连接和WebSocket API，以提供更安全、可靠的后端架构。

## Glossary

- **MQTT Broker**: HiveMQ Cloud上的MQTT消息代理服务器，用于设备数据的发布和订阅
- **Next.js API Routes**: Next.js框架提供的服务器端API路由功能
- **WebSocket**: 全双工通信协议，用于实时数据推送
- **Device Data**: 物联网设备上报的环境数据（温度、湿度、光照、CO2、土壤数据等）
- **Control Command**: 发送给设备的控制指令（继电器开关、LED亮度调节等）
- **System**: 指新版本的Next.js应用后端系统

## Requirements

### Requirement 1

**User Story:** 作为系统管理员，我希望后端能够安全地连接到MQTT Broker，以便接收设备数据和发送控制命令

#### Acceptance Criteria

1. WHEN System启动时，THE System SHALL使用配置的凭证（host、port、username、password）建立到MQTT Broker的TLS/SSL连接
2. WHILE System运行期间，THE System SHALL维持与MQTT Broker的持久连接，并在断开时自动重连
3. IF MQTT连接失败，THEN THE System SHALL记录错误日志并在30秒后重试连接
4. THE System SHALL订阅主题"meimefarm/basic_env_data"以接收设备数据
5. THE System SHALL能够向主题"data/set"发布控制命令

### Requirement 2

**User Story:** 作为前端开发者，我希望通过WebSocket API实时接收设备数据，以便在界面上显示最新的传感器读数

#### Acceptance Criteria

1. THE System SHALL提供WebSocket端点"/api/mqtt/stream"供前端连接
2. WHEN 前端客户端连接到WebSocket端点时，THE System SHALL验证客户端身份（如果需要）
3. WHEN MQTT Broker推送新的设备数据时，THE System SHALL解析JSON数据并通过WebSocket转发给所有已连接的前端客户端
4. THE System SHALL在WebSocket消息中包含时间戳和数据类型标识
5. IF WebSocket连接断开，THEN THE System SHALL清理相关资源

### Requirement 3

**User Story:** 作为用户，我希望通过前端界面控制设备（继电器、LED），以便远程操作物联网设备

#### Acceptance Criteria

1. THE System SHALL提供HTTP POST端点"/api/mqtt/control"接收控制命令
2. WHEN 接收到继电器控制请求时，THE System SHALL构建符合设备协议的JSON数据包（包含rw_prot结构）
3. WHEN 接收到LED亮度控制请求时，THE System SHALL将LED值映射到node0501-node0504节点
4. THE System SHALL通过MQTT发布控制命令到"data/set"主题，QoS设置为1
5. THE System SHALL返回HTTP响应，指示命令是否成功发送

### Requirement 4

**User Story:** 作为系统管理员，我希望MQTT配置可以通过环境变量管理，以便在不同环境中灵活部署

#### Acceptance Criteria

1. THE System SHALL从环境变量读取MQTT配置（MQTT_HOST、MQTT_PORT、MQTT_USERNAME、MQTT_PASSWORD等）
2. WHERE 环境变量未设置，THE System SHALL使用默认配置值
3. THE System SHALL在启动时验证MQTT配置的完整性
4. IF 配置无效，THEN THE System SHALL记录错误并拒绝启动MQTT服务

### Requirement 5

**User Story:** 作为开发者，我希望保留Python监听器工具，以便在开发和调试时监控MQTT消息

#### Acceptance Criteria

1. THE System SHALL保持mqtt_listener.py脚本的功能不变
2. THE System SHALL确保Python脚本可以独立运行，不依赖Next.js应用
3. THE System SHALL在README中提供Python监听器的使用说明

### Requirement 6

**User Story:** 作为用户，我希望系统能够处理设备数据的各种格式，以便兼容不同版本的设备固件

#### Acceptance Criteria

1. THE System SHALL解析包含温度、湿度、光照、CO2、土壤数据、继电器状态、LED状态的JSON数据
2. THE System SHALL将温度和湿度值除以10转换为实际值（如234 -> 23.4°C）
3. IF 接收到的数据字段缺失，THEN THE System SHALL使用默认值或null
4. THE System SHALL验证数据的合法性（如温度范围-50到100°C）

### Requirement 7

**User Story:** 作为系统管理员，我希望系统记录MQTT通信日志，以便排查问题和监控系统状态

#### Acceptance Criteria

1. THE System SHALL记录MQTT连接、断开、订阅、发布等关键事件
2. THE System SHALL记录接收到的设备数据摘要（不记录完整数据以避免日志过大）
3. THE System SHALL记录发送的控制命令详情
4. THE System SHALL使用结构化日志格式（包含时间戳、日志级别、消息内容）
5. WHERE 生产环境，THE System SHALL仅记录INFO级别及以上的日志
