/**
 * MCP 工具定义 — 将 MCP 服务映射为 OpenAI Function Calling 格式
 * 
 * 工作原理：
 * 1. 前端将用户已安装并启用的 MCP 服务列表传到后端
 * 2. 本模块根据 MCP 服务 ID 生成对应的 OpenAI tools schema
 * 3. tools 数组随请求发送给 LLM，LLM 可自主决定何时调用
 */

export interface MCPToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required: string[]
    }
  }
}

/**
 * 所有可用 MCP 工具定义的注册表
 * key = MCP 服务器 ID（与商店中的 id 对应）
 * value = 该服务器提供的工具列表
 */
const MCP_TOOL_REGISTRY: Record<string, MCPToolDefinition[]> = {
  // === 天气服务 ===
  'caiyun-weather': [
    {
      type: 'function',
      function: {
        name: 'mcp_caiyun_weather',
        description: '使用彩云天气API查询中国城市的实时天气、温度、湿度、风速、降水和未来天气预报。适用于需要精确天气数据来做农业决策的场景。',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '要查询的中国城市名称，例如"北京"、"上海"、"杭州"'
            }
          },
          required: ['city']
        }
      }
    }
  ],

  'gaode-weather': [
    {
      type: 'function',
      function: {
        name: 'mcp_gaode_weather',
        description: '使用高德地图天气API查询中国城市的实时天气和天气预报。支持城市自动编码，返回温度、天气状况和预报。',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '要查询的中国城市名称，例如"北京"、"深圳"'
            }
          },
          required: ['city']
        }
      }
    }
  ],

  'hefeng-weather': [
    {
      type: 'function',
      function: {
        name: 'mcp_hefeng_weather',
        description: '使用和风天气API查询中国和全球城市的实时天气、逐日预报、灾害预警和空气质量。',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '要查询的城市名称，例如"北京"、"纽约"'
            }
          },
          required: ['city']
        }
      }
    }
  ],

  // === 路线规划 ===
  'amap-route': [
    {
      type: 'function',
      function: {
        name: 'mcp_amap_route',
        description: '使用高德地图路线规划API，查询两地之间的驾车、步行或骑行路线，返回距离、时间和详细路线。',
        parameters: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: '出发地地址或城市名称，例如"北京市朝阳区"'
            },
            destination: {
              type: 'string',
              description: '目的地地址或城市名称，例如"北京市海淀区"'
            },
            mode: {
              type: 'string',
              enum: ['driving', 'walking', 'bicycling'],
              description: '出行方式：driving(驾车)、walking(步行)、bicycling(骑行)，默认 driving'
            }
          },
          required: ['origin', 'destination']
        }
      }
    }
  ],

  // === 搜索服务 ===
  'brave-search': [
    {
      type: 'function',
      function: {
        name: 'mcp_brave_search',
        description: '使用 Brave 搜索引擎进行网络搜索，获取最新的互联网信息。适用于查找最新资讯、农业技术文章、市场行情等。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索关键词，例如"草莓种植技术"、"农业天气预报"'
            },
            count: {
              type: 'number',
              description: '返回结果数量，默认5，最大10'
            }
          },
          required: ['query']
        }
      }
    }
  ],

  'exa-search': [
    {
      type: 'function',
      function: {
        name: 'mcp_exa_search',
        description: '使用 Exa (原 Metaphor) 神经搜索引擎进行深度语义搜索。擅长理解复杂查询，寻找高质量的技术文章、论文和深度内容。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索关键词或自然语言问题'
            },
            numResults: {
              type: 'number',
              description: '返回结果数量，默认 5'
            },
            useAutoprompt: {
              type: 'boolean',
              description: '是否使用 Exa 的自动提示优化功能，默认 true'
            }
          },
          required: ['query']
        }
      }
    }
  ],

  // === 网页抓取 ===
  'firecrawl': [
    {
      type: 'function',
      function: {
        name: 'mcp_firecrawl_scrape',
        description: '抓取指定网页的内容并转换为结构化文本。适用于获取农业资讯、技术文档等网页内容。',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: '要抓取的网页URL'
            }
          },
          required: ['url']
        }
      }
    }
  ],

  // === 农业专用 ===
  'soil-sensor': [
    {
      type: 'function',
      function: {
        name: 'mcp_soil_sensor_query',
        description: '查询指定区域的土壤传感器数据，获取土壤湿度、温度、pH值、NPK养分等参数。用于精准农业决策。',
        parameters: {
          type: 'object',
          properties: {
            zone: {
              type: 'string',
              description: '监测区域名称或编号，例如"zone-1"、"大棚A"'
            },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: '需要查询的指标列表，可选值：moisture(湿度)、temperature(温度)、ph(pH值)、nitrogen(氮)、phosphorus(磷)、potassium(钾)'
            }
          },
          required: ['zone']
        }
      }
    }
  ],

  'crop-disease': [
    {
      type: 'function',
      function: {
        name: 'mcp_crop_disease_diagnose',
        description: '根据症状描述或图片分析诊断作物病虫害，提供防治建议。',
        parameters: {
          type: 'object',
          properties: {
            crop: {
              type: 'string',
              description: '作物类型，例如"草莓"、"番茄"、"水稻"'
            },
            symptoms: {
              type: 'string',
              description: '病害症状描述，例如"叶片出现黄色斑点，边缘枯萎"'
            }
          },
          required: ['crop', 'symptoms']
        }
      }
    }
  ],

  'irrigation-control': [
    {
      type: 'function',
      function: {
        name: 'mcp_irrigation_query',
        description: '查询当前灌溉系统状态和灌溉计划，或获取灌溉建议。',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['status', 'schedule', 'recommendation'],
              description: 'status(查询状态)、schedule(查看计划)、recommendation(获取建议)'
            },
            zone: {
              type: 'string',
              description: '灌溉区域名称或编号'
            }
          },
          required: ['action']
        }
      }
    }
  ],

  'farm-data': [
    {
      type: 'function',
      function: {
        name: 'mcp_farm_data_query',
        description: '查询农场综合数据，包括传感器汇总、产量统计、历史分析报表。',
        parameters: {
          type: 'object',
          properties: {
            query_type: {
              type: 'string',
              enum: ['summary', 'history', 'report', 'alerts'],
              description: 'summary(实时汇总)、history(历史数据)、report(生成报表)、alerts(预警通知)'
            },
            date_range: {
              type: 'string',
              description: '时间范围，例如"today"、"last_7_days"、"last_30_days"'
            }
          },
          required: ['query_type']
        }
      }
    }
  ],

  'spectrum-mcp': [
    {
      type: 'function',
      function: {
        name: 'get_channel',
        description: '获取光谱传感器指定通道的数值。',
        parameters: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: '通道名称或编号，例如 "ch1", "450nm"'
            }
          },
          required: ['channel']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_all_spectrum',
        description: '获取光谱传感器所有通道的完整光谱数据。',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    }
  ],

  // === 通用工具（简化版，不需要实际执行外部命令的） ===
  'sequential-thinking': [
    {
      type: 'function',
      function: {
        name: 'mcp_sequential_thinking',
        description: '使用结构化的分步思考来解决复杂的农业种植问题。将问题分解为多个阶段进行分析。',
        parameters: {
          type: 'object',
          properties: {
            problem: {
              type: 'string',
              description: '需要解决的复杂问题描述'
            },
            steps: {
              type: 'number',
              description: '建议的思考步骤数，默认5'
            }
          },
          required: ['problem']
        }
      }
    }
  ]
}

/**
 * 根据用户启用的 MCP 服务列表，生成对应的 OpenAI tools 定义
 */
export function getMCPToolDefinitions(enabledMCPConfigs: Array<{ id: string; enabled: boolean }>): MCPToolDefinition[] {
  const tools: MCPToolDefinition[] = []

  for (const config of enabledMCPConfigs) {
    if (!config.enabled) continue
    const toolDefs = MCP_TOOL_REGISTRY[config.id]
    if (toolDefs) {
      tools.push(...toolDefs)
    }
  }

  return tools
}

/**
 * 获取所有已注册的 MCP 工具 ID 列表（用于调试）
 */
export function getRegisteredMCPToolIds(): string[] {
  return Object.keys(MCP_TOOL_REGISTRY)
}

/**
 * 根据 tool function name 反查其归属的 MCP 服务器 ID
 */
export function getMCPServerIdByToolName(toolName: string): string | null {
  for (const [serverId, tools] of Object.entries(MCP_TOOL_REGISTRY)) {
    if (tools.some(t => t.function.name === toolName)) {
      return serverId
    }
  }
  return null
}
