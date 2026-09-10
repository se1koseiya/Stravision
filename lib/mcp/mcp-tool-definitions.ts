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
  // === 内置工具（不依赖用户 MCP 配置，始终可用）===
  'builtin-sensor-history': [
    {
      type: 'function',
      function: {
        name: 'get_sensor_history',
        description: '查询本地温室传感器的历史数据（最近 7 天内）。支持查询温度、湿度、光照、CO2、土壤湿度、氮磷钾肥力等指标的历史趋势，返回时间序列数据点（含降采样聚合）。适用于回答"过去几小时温度变化""昨天最高湿度""最近一周 CO2 趋势"等历史数据问题。',
        parameters: {
          type: 'object',
          properties: {
            metrics: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['temperature', 'humidity', 'light', 'co2', 'soilMoisture', 'nitrogen', 'phosphorus', 'potassium', 'fertility', 'rainfall']
              },
              description: '要查询的指标列表，可同时查多个。temperature=温度(°C), humidity=湿度(%), light=光照(lux), co2=CO2浓度(ppm), soilMoisture=土壤湿度(%), nitrogen=氮含量, phosphorus=磷含量, potassium=钾含量, fertility=综合肥力, rainfall=雨量'
            },
            range: {
              type: 'string',
              enum: ['10m', '1h', '7h', '1d', '7d'],
              description: '时间范围：10m=最近10分钟, 1h=最近1小时, 7h=最近7小时, 1d=最近24小时, 7d=最近7天。默认 1h'
            }
          },
          required: ['metrics']
        }
      }
    }
  ],

  // === 内置 Agent 工具包（用户交互、定时任务、任务管理）===
  'builtin-agent-tools': [
    // --- 用户交互：AskUserQuestion ---
    {
      type: 'function',
      function: {
        name: 'ask_user_question',
        description: '向用户提问以获取澄清或确认。当用户请求模糊、缺少必要参数、或需要用户在多个选项间做选择时调用此工具。工具会渲染为结构化表单卡片，用户通过填写表单或选择选项来回答，无需手动打字。这是比纯文本提问更好的交互方式。',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '提问的标题，简短概括需要澄清的内容。例如："需要确认施药方案"'
            },
            context: {
              type: 'string',
              description: '为什么需要这些信息的简短说明，帮助用户理解提问目的。例如："为了给出精准的用药建议，需要了解当前病虫害的具体情况"'
            },
            fields: {
              type: 'array',
              description: '表单字段列表，让用户通过 UI 填写而非打字。适用于需要多个参数输入的场景。',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string', description: '字段标识符，如 "temperature"' },
                  label: { type: 'string', description: '字段标签，如 "当前温度"' },
                  type: { type: 'string', enum: ['number', 'text', 'select', 'switch'], description: '字段类型' },
                  unit: { type: 'string', description: '单位，如 "°C"、"%", 仅 number 类型适用' },
                  default: { description: '默认值。number 类型为数字，select 类型为选项 value，switch 类型为 boolean' },
                  placeholder: { type: 'string', description: '输入框占位提示文本' },
                  min: { type: 'number', description: '最小值，仅 number 类型' },
                  max: { type: 'number', description: '最大值，仅 number 类型' },
                  step: { type: 'number', description: '步进值，仅 number 类型' },
                  options: {
                    type: 'array',
                    description: '可选项列表，仅 select 类型',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        value: { type: 'string' }
                      }
                    }
                  },
                  required: { type: 'boolean', description: '是否必填' },
                  help: { type: 'string', description: '帮助文本' }
                },
                required: ['key', 'label', 'type']
              }
            },
            options: {
              type: 'array',
              description: '快速选项列表，用户可直接点击选择，无需填表。适用于简单的二选一/多选一场景。与 fields 二选一使用。',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: '选项标识符，如 "option_a"' },
                  label: { type: 'string', description: '选项显示文本，如 "使用默认方案"' }
                },
                required: ['id', 'label']
              }
            }
          },
          required: ['title']
        }
      }
    },

    // --- 定时任务管理 ---
    {
      type: 'function',
      function: {
        name: 'cron_create',
        description: '创建一个定时任务。任务会在指定延迟后或按 cron 表达式周期性执行。支持分析任务、通知提醒、设备控制等类型。创建后会返回任务 ID。',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '任务标题，如"每日温度巡检"' },
            task_type: {
              type: 'string',
              enum: ['analysis', 'notification', 'reminder', 'device_control', 'custom'],
              description: '任务类型：analysis=数据分析, notification=通知, reminder=提醒, device_control=设备控制, custom=自定义'
            },
            delay_seconds: {
              type: 'number',
              description: '延迟执行的秒数。例如 3600=1小时后执行，86400=1天后执行。与 cron_expression 二选一。'
            },
            cron_expression: {
              type: 'string',
              description: '标准 cron 表达式（分 时 日 月 周），用于周期性任务。例如"0 8 * * *"=每天8点，"0 */2 * * *"=每2小时。与 delay_seconds 二选一。'
            },
            task_action: {
              type: 'string',
              description: '任务具体内容描述。对于 analysis 类型，写明要分析的内容；对于 device_control 类型，写明控制指令；对于 notification/reminder 类型，写明通知内容。'
            }
          },
          required: ['title', 'task_type', 'task_action']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'cron_list',
        description: '查询当前用户的所有定时任务列表，包括待执行和已执行的任务。',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'all'],
              description: '筛选状态：pending=待执行, completed=已完成, all=全部。默认 all'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'cron_delete',
        description: '删除一个定时任务。只能删除待执行（pending）状态的任务。',
        parameters: {
          type: 'object',
          properties: {
            task_id: { type: 'number', description: '要删除的任务 ID' }
          },
          required: ['task_id']
        }
      }
    },

    // --- 任务管理（Todo/Task）---
    {
      type: 'function',
      function: {
        name: 'task_create',
        description: '创建一个子任务并加入任务清单。适用于将复杂任务拆分为多个步骤跟踪执行进度。任务会以清单形式展示给用户。',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: '任务内容描述，如"检查 1 号温室温度传感器"' },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: '优先级：high=高, medium=中, low=低。默认 medium'
            }
          },
          required: ['content']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'task_list',
        description: '查询当前任务清单中所有任务及其状态。',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'all'],
              description: '筛选状态。默认 all'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'task_update',
        description: '更新任务状态（标记开始、完成等）或修改任务内容。',
        parameters: {
          type: 'object',
          properties: {
            task_id: { type: 'number', description: '任务 ID' },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: '新状态'
            },
            content: { type: 'string', description: '修改后的任务内容（可选）' }
          },
          required: ['task_id']
        }
      }
    },

    // --- 计划模式 ---
    {
      type: 'function',
      function: {
        name: 'enter_plan_mode',
        description: '进入计划模式。在计划模式下，你只能进行调研和信息收集（查询传感器、天气、搜索等），不能执行任何有副作用的操作（设备控制、创建任务、发通知等）。适用于用户请求复杂、需要先规划再执行的场景。进入计划模式后，请先收集所需信息，然后调用 exit_plan_mode 提交计划。',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: '进入计划模式的原因，如"需要综合分析温湿度、天气和病虫害情况后制定管理方案"'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'exit_plan_mode',
        description: '退出计划模式并提交计划给用户审批。用户审批后，你将按计划步骤逐步执行。必须在 enter_plan_mode 之后调用。计划必须详尽、可执行：每步要写明做什么、为什么、用什么工具、关键参数/阈值。不要写"检查温度"这种过于简略的步骤。',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '计划标题，如"本周草莓种植管理方案"'
            },
            summary: {
              type: 'string',
              description: '计划概述，简述整体思路、核心目标、关键依据（≤150字）。如"基于当前开花期+未来3天阴雨天气，将夜温维持18-20°C，白天22-25°C，湿度<75%防灰霉病；增施磷钾肥促进坐果。"'
            },
            steps: {
              type: 'array',
              description: '计划步骤列表，按执行顺序排列。至少 3 步，复杂任务 5-8 步。每步 content 必须包含：做什么 + 为什么 + 关键参数。',
              minItems: 3,
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: '步骤标识，如 "step1"' },
                  content: {
                    type: 'string',
                    description: '步骤详细描述，必须包含：①做什么 ②为什么这么做 ③关键参数/阈值/目标值。长度 30-100 字。示例："查询过去24小时1号棚温湿度趋势（get_sensor_history），判断是否超出生理阈值（昼25°C/夜18°C，湿度75%），为后续调控提供依据。" 而不是"检查温度"。'
                  },
                  tool: {
                    type: 'string',
                    description: '该步骤预计使用的工具，如 "get_sensor_history"、"toggle_relay"、"cron_create"、"mcp_caiyun_weather" 等'
                  }
                },
                required: ['id', 'content']
              }
            }
          },
          required: ['title', 'summary', 'steps']
        }
      }
    }
  ],

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

  // === AnySearch 远程 MCP（Streamable HTTP，匿名可用）===
  'anysearch': [
    {
      type: 'function',
      function: {
        name: 'mcp_anysearch_search',
        description: 'AnySearch 实时搜索：通用自然语言网页搜索，也支持垂直领域（金融/学术/安全/法律/代码等）结构化检索。一次调用只承载一个意图。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '自然语言搜索查询，一次一个意图'
            },
            max_results: {
              type: 'number',
              description: '返回结果数 1-10，默认 10'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'mcp_anysearch_get_sub_domains',
        description: '查询 AnySearch 垂直领域目录（金融/学术/法律等），返回可用的 sub_domain 及其参数 schema。在调用带 domain 的 search 之前必须先调用本工具。',
        parameters: {
          type: 'object',
          properties: {
            domains: {
              type: 'array',
              items: { type: 'string' },
              description: '要查询的领域列表（最多 5 个），如 ["finance", "academic"]'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'mcp_anysearch_batch_search',
        description: 'AnySearch 并行批量搜索：一次执行 1-5 个相互独立的搜索查询，单个失败不影响其他。',
        parameters: {
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              description: '1-5 个查询对象，每个含 query 字段（可选 max_results）',
              items: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: '搜索查询' },
                  max_results: { type: 'number', description: '该条结果数 1-10' }
                },
                required: ['query']
              }
            }
          },
          required: ['queries']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'mcp_anysearch_extract',
        description: 'AnySearch 网页全文提取：抓取 URL 对应 HTML 页面的完整内容并转为 Markdown（截断至 5 万字符）。',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: '目标网页 URL（http/https）'
            }
          },
          required: ['url']
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

  // === 光谱传感器 ===
  'spectrum-stravision': [
    {
      type: 'function',
      function: {
        name: 'get_channel',
        description: '获取光谱传感器的特定通道值。',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '要查询的通道名称，例如 "410", "435"... "940"',
              enum: ["410", "435", "460", "485", "510", "535", "560", "585", "610", "645", "680", "705", "730", "760", "810", "860", "900", "940"]
            }
          },
          required: ['name']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_all_spectrum',
        description: '获取光谱传感器的所有通道数据，返回完整的 18 通道光谱值数组。',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }
  ],

  // === 内置设备控制（阻塞式 MCP 工具，替代旧的 JSON 输出 + 前端解析模式）===
  'builtin-device-control': [
    {
      type: 'function',
      function: {
        name: 'list_devices',
        description: '列出设备注册表中的所有可用设备（继电器/传感器/摄像头/步进电机）。无需参数。返回每个设备的 ID、名称、类型、分类、node_id 及启用状态。在控制任何设备前，若不确定设备 ID，可先调用此工具发现可用设备。控制设备时使用返回的 id 作为 device_id 参数。',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'toggle_relay',
        description: '开关继电器设备（水泵/风扇/补光灯等）。工具会阻塞等待设备真实上报状态确认后再返回结果给 agent。支持两种指定设备的方式：① device_id（推荐，设备注册表 ID，可调用 list_devices 查询）；② device（传统继电器编号 5-8：5=水泵 6=风扇 7=RGB灯 8=白光灯，向后兼容）。两者提供其一即可，优先使用 device_id。这是原生 tool_call，不要再输出 JSON 代码块。',
        parameters: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: '设备注册表 ID（推荐）。自定义设备或注册表中的继电器设备用此参数，系统会自动查找设备的 node_id 发送控制命令。可先调用 list_devices 获取可用设备 ID。'
            },
            device: {
              type: 'number',
              enum: [5, 6, 7, 8],
              description: '传统继电器编号（向后兼容）：5=水泵, 6=风扇, 7=RGB补光灯, 8=白光补光灯。当未提供 device_id 时使用此参数。'
            },
            value: {
              type: 'number',
              enum: [0, 1],
              description: '目标状态：1=开启, 0=关闭'
            }
          },
          required: ['value']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'set_led',
        description: '设置 RGB LED 补光灯颜色。工具会发送 MQTT 命令并等待设备状态上报后返回。AI 传入 RGB 语义值，系统自动转换为硬件 BRG 顺序。设备注册表中的设备可通过 list_devices 查看（device_id 用于设备注册表标识）。',
        parameters: {
          type: 'object',
          properties: {
            r: { type: 'number', minimum: 0, maximum: 255, description: '红色分量 0-255' },
            g: { type: 'number', minimum: 0, maximum: 255, description: '绿色分量 0-255' },
            b: { type: 'number', minimum: 0, maximum: 255, description: '蓝色分量 0-255' }
          },
          required: ['r', 'g', 'b']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'control_camera',
        description: '控制摄像头云台（步进电机/丝杆滑台）左右移动。工具会发送 MQTT 命令并阻塞等待电机移动完成、位置稳定后再返回结果。量程 0-700mm，超出边界会返回错误。设备注册表中的设备可通过 list_devices 查看（device_id 用于设备注册表标识）。',
        parameters: {
          type: 'object',
          properties: {
            direction: {
              type: 'number',
              enum: [0, 1, 2],
              description: '移动方向：0=停止, 1=左移（向原点方向）, 2=右移（远离原点）'
            },
            distance_mm: {
              type: 'number',
              minimum: 0,
              maximum: 700,
              description: '移动距离（毫米），与 direction 配合使用。direction=0 时忽略。'
            },
            pulses: {
              type: 'number',
              description: '移动脉冲数（160脉冲=1mm）。优先使用 distance_mm，pulses 为底层参数。'
            }
          },
          required: ['direction']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'reset_camera',
        description: '将摄像头云台（丝杆滑台）复位到最左侧原点（0mm）。工具会阻塞等待复位完成。如果已在原点则跳过。设备注册表中的设备可通过 list_devices 查看（device_id 用于设备注册表标识）。',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'take_camera_snapshot',
        description: '从指定摄像头抓取一帧画面，返回多模态结果（image_url）供 agent 直接视觉分析。无需移动云台。摄像头 URL 在系统设置中配置。设备注册表中的设备可通过 list_devices 查看（device_id 用于设备注册表标识）。',
        parameters: {
          type: 'object',
          properties: {
            camera_id: {
              type: 'string',
              enum: ['a', 'b'],
              description: '摄像头编号：a=温室摄像头A, b=温室摄像头B。默认 a。'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'move_camera_and_look',
        description: '组合工具：先移动云台到指定位置，等电机稳定后截图，返回多模态结果供 agent 视觉分析。这是视觉巡检的推荐入口，agent 在一次 tool_call 中即可完成"移动+观察"闭环。设备注册表中的设备可通过 list_devices 查看（device_id 用于设备注册表标识）。',
        parameters: {
          type: 'object',
          properties: {
            direction: {
              type: 'number',
              enum: [1, 2],
              description: '移动方向：1=左移, 2=右移'
            },
            distance_mm: {
              type: 'number',
              minimum: 0,
              maximum: 700,
              description: '移动距离（毫米）'
            },
            camera_id: {
              type: 'string',
              enum: ['a', 'b'],
              description: '使用的摄像头，默认 a'
            },
            query: {
              type: 'string',
              description: '本次视觉巡检的关注点/问题（如"检查叶片是否有黄化"），会附加到截图摘要中提示 agent 分析方向'
            }
          },
          required: ['direction', 'distance_mm']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'delete_device',
        description: '从设备注册表删除一条设备（仅 admin / super_admin 可调用；删除后不可恢复，MQTT 订阅会立即同步）。\n\n使用场景：用户明确要求把某设备"从平台删除 / 移除 / 注销"，或设备文档/草稿测试后需要清理。\n\n安全保护：critical（关键设备）默认拒绝删除，必须显式传 force=true 才会被强制移除——防止 AI 助手误操作把水泵/风扇等关键控制设备从注册表里清掉。如需删除关键设备，请先与用户二次确认后用 delete_device({ device_id: X, force: true })。\n\n参数优先级：device_id（推荐）> device_name（同名取第一个）。删除前可先调用 list_devices 确认 id 与名称。',
        parameters: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: '设备注册表 ID（推荐）。可先调用 list_devices 获取可用设备 ID。'
            },
            device_name: {
              type: 'string',
              description: '按设备名称匹配删除（同名取第一个）。建议优先使用 device_id 避免歧义。'
            },
            force: {
              type: 'boolean',
              description: '强制删除关键设备（critical）。默认 false；只有用户明确同意后才能传 true。'
            }
          },
          required: []
        }
      }
    }
  ],

  // === AI 增强 ===
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
  ],

  // === 内置技能加载器（AI 自路由架构：按需加载技能全文）===
  'builtin-skill-loader': [
    {
      type: 'function',
      function: {
        name: 'load_skill',
        description: '按需加载技能模块的完整内容。系统提示词中只注入了技能清单（id/名称/描述/关键词），不含完整规范。当回答用户问题需要某个技能的详细内容时调用此工具，传入技能 ID 列表，系统会返回对应技能的完整内容。一次可请求多个技能（并行加载）。若技能有 dependencies，请一并传入依赖技能的 ID。',
        parameters: {
          type: 'object',
          properties: {
            skill_ids: {
              type: 'array',
              items: { type: 'string' },
              description: '要加载的技能 ID 列表（来自系统提示词中的技能清单）。例如 ["iot-control", "agriculture-expert"]。已自动加载的技能无需再传入。'
            }
          },
          required: ['skill_ids']
        }
      }
    }
  ],

  // === 内置任务管理（update_task：替代旧的重复输出 <TASK_LIST> 标签模式）===
  // 首次规划时 AI 输出一次 <TASK_LIST> 标签建立初始任务列表，
  // 后续状态变更（in_progress → completed 等）必须通过 update_task 工具调用，
  // 工具返回更新后的完整 task list，前端据此刷新卡片。
  'builtin-agent-tasks': [
    {
      type: 'function',
      function: {
        name: 'update_task',
        description: '更新任务规划器中某个任务的状态。首次规划后通过 <TASK_LIST> 标签建立任务列表，后续每次任务状态变更（如 in_progress → completed、pending → in_progress）必须调用此工具，严禁再次输出 <TASK_LIST> 标签。工具会返回更新后的完整任务列表，前端 UI 卡片会自动刷新。这是原生 tool_call，不要再输出 JSON 代码块形式的 TASK_LIST。',
        parameters: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: '要更新的任务 ID（必须与首次 <TASK_LIST> 中 tasks[].id 一致，如 "1"、"2"）'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'failed'],
              description: '目标状态：pending=未开始, in_progress=进行中, completed=已完成, failed=失败'
            },
            note: {
              type: 'string',
              description: '可选备注，说明状态变更原因或执行结果摘要（如"传感器数据已采集，平均温度 22.5°C"）'
            }
          },
          required: ['task_id', 'status']
        }
      }
    }
  ],

  // === 内置技能工坊（读文档 → 生成技能 → 自测 → 注册全域可用）===
  'builtin-skill-forge': [
    {
      type: 'function',
      function: {
        name: 'create_skill_from_doc',
        description: '技能工坊：读取一份技术文档（设备协议、产品说明、接口文档、报文示例等），自动分析其中的能力/属性/数据规则，生成一个平台技能，并进行自测（关键词路由测试 + AI 彩排回答测试），通过后注册并发布到技能商店——之后平台 AI 助手在任何对话中都能通过技能清单路由加载它。当用户提供技术文档并希望"接入平台""做成技能""让 AI 学会这个设备"时使用本工具。注意：1. 全流程含多轮 AI 调用，约需 1-3 分钟；2. 仅当用户已给出较完整的技术文档原文时才调用本工具——若用户只说"接入某设备"但没提供文档，先用 ask_user_question 或直接回复索取文档原文/关键参数；3. 若文档关键信息（功能/字段/报文）明显不足，本工具会返回 needs_user_input 与待补充问题清单，此时必须向用户追问（优先 ask_user_question）而不是重试。',
        parameters: {
          type: 'object',
          properties: {
            document: {
              type: 'string',
              description: '技术文档原文（含报文示例、字段定义等关键内容），完整粘贴'
            },
            document_name: {
              type: 'string',
              description: '可选：文档名称（如"XX土壤传感器通信协议V2"），用于锻造记录'
            },
            publish: {
              type: 'boolean',
              description: '是否发布到技能商店，默认 true。用户明确说"先测试别上线"时传 false（保存为草稿）'
            }
          },
          required: ['document']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'refine_skill',
        description: '技能工坊：按用户反馈修订一个已注册的技能。支持重新命名/重新映射、补充报文样例后重新生成、修正字段理解偏差等。系统会自动使用该技能最初锻造时的源文档（也支持用 extra_document 补充新资料），重新走生成 → 校验 → 自测 → 更新注册全流程。当用户对已生成技能的某些字段、指令或回答效果不满意时使用。',
        parameters: {
          type: 'object',
          properties: {
            skill_id: {
              type: 'string',
              description: '要修订的技能 ID（来自先前 create_skill_from_doc 的结果或技能清单）'
            },
            feedback: {
              type: 'string',
              description: '用户反馈/修改要求，尽量具体（如"温度单位应该是摄氏度，且波特率写错了"）'
            },
            extra_document: {
              type: 'string',
              description: '可选：用户补充的新资料/报文样例原文，与源文档合并用于重新生成'
            },
            publish: {
              type: 'boolean',
              description: '修订后是否发布，默认 true'
            }
          },
          required: ['skill_id', 'feedback']
        }
      }
    }
  ],

  // === 内置设备接入工坊（读接入文档 → 生成 devices 配置草稿 → 用户确认装入）===
  'builtin-device-forge': [
    {
      type: 'function',
      function: {
        name: 'connect_device_from_doc',
        description: '设备接入工坊：读取一份设备接入文档（MQTT 通信协议、报文样例、字段定义表等），自动分析设备类型/数据点/控制通道，生成一份可直接写入平台 devices 注册表的接入配置草稿（订阅 topic、发布 topic、数据点字段映射 metrics 等），并经校验 + 报文干跑核对。当用户提供设备接入文档并希望"把这个设备接入平台/接入莓小智/让平台收它的数据/能在平台控制它"时使用。注意：1. 全流程含多轮 AI 调用约需 1-2 分钟；2. 仅当用户已给出较完整的接入文档原文时才调用——若用户只说"接入某设备"但没给文档，先用 ask_user_question 或直接回复索取文档/关键参数；3. 生成的是草稿不落库，前端会渲染成可编辑表单，用户点「装入莓小智」才真正写入 devices 表；4. 若用户想让 AI 也"学会"该设备（如对话中查询/操作），装入后可在表单上点「发布技能工坊」→ 走 create_skill_from_doc。',
        parameters: {
          type: 'object',
          properties: {
            document: {
              type: 'string',
              description: '设备接入文档原文（MQTT topic/报文样例/字段单位/控制指令等），完整粘贴'
            },
            document_name: {
              type: 'string',
              description: '可选：文档名称（如"XX土壤传感器MQTT协议V2"），用于记录'
            }
          },
          required: ['document']
        }
      }
    }
  ],

  // === 内置深度研究工具包（联网搜索 + 知识沉淀）===
  'builtin-deep-research': [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: '联网搜索最新信息。返回结构化的搜索结果（标题/摘要/链接/来源/发布时间）。适用于需要即时信息的问题：最新新闻、价格行情、天气、新发布的资料等。只做快速检索，不生成长文；如需系统性研究某个主题并沉淀为知识，请改用 deep_research 工具。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索关键词。建议用具体、精炼的词组，一次只搜一个主题'
            },
            count: {
              type: 'number',
              description: '返回结果条数，默认 6，最大 20'
            },
            recency: {
              type: 'string',
              enum: ['day', 'week', 'month', 'year'],
              description: '时间范围过滤：day=一天内, week=一周内, month=一月内, year=一年内。不传则不限时间'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'deep_research',
        description: '深度研究：AI 自动多视角拆解子查询、联网检索并阅读网页、分析信息缺口并补搜，最终把多源信息融合成一篇带引用标注的结构化知识条目，自动存入用户知识库（打上「AI研究」标签并向量化）。存入后用户后续提问可直接命中这条知识。适用于「帮我研究 XX 并记住」「整理一份关于 XX 的资料存到知识库」这类沉淀型请求。注意：整个流程约需 1-3 分钟，简单事实问题请用 web_search 而不要用本工具。',
        parameters: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: '要研究的主题，一句话描述。例如："草莓白粉病的综合防治方案"'
            },
            collectionId: {
              type: 'number',
              description: '可选：存入的知识库集合 ID。不传则存到用户默认空间'
            },
            maxSubQueries: {
              type: 'number',
              description: '拆解的子查询数量（1-6），默认 3。主题越宽泛可适当调大'
            },
            maxRounds: {
              type: 'number',
              description: '信息缺口补搜轮数（0-3），默认 1。0 表示只搜一轮不补搜'
            }
          },
          required: ['topic']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'knowledge_save',
        description: '把用户直接提供的内容（笔记、资料、要点、对话结论等）保存到用户的知识库并自动向量化。当用户说「记住这个」「把这个存到知识库」「收进知识库」「帮我记下」并提供具体内容时，必须使用本工具真正落库，而不要只输出文本让用户手动粘贴。注意：需要联网调研的主题请用 deep_research；本工具用于直接保存用户给定的内容，不联网。',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '条目标题，简洁准确，包含关键检索词（如作物名+病症+措施）'
            },
            content: {
              type: 'string',
              description: '条目正文（Markdown）。应完整保留用户提供的原始信息，可适当整理结构但不得编造或遗漏'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: '可选标签（最多 10 个），建议嵌入高频检索关键词以提升召回'
            },
            collectionId: {
              type: 'number',
              description: '可选：存入的知识库集合 ID。不传则存到用户默认空间'
            }
          },
          required: ['title', 'content']
        }
      }
    }
  ],

  // === 农业数据（内置：直连本地 sensor_readings / device_logs，无需任何外部 API） ===
  'builtin-farm-data': [
    {
      type: 'function',
      function: {
        name: 'get_current_conditions',
        description: '获取大棚当前环境态势：空气温湿度、光照、CO2、土壤湿度、氮磷钾、雨量共 9 项指标的最新值，以及 24 小时均值和变化趋势（升/降/平）。当用户问"现在棚里什么情况""当前温湿度""环境正常吗"时使用。注意：本工具返回的是"当前瞬时值"，查询历史曲线请用 get_sensor_history。',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'analyze_soil',
        description: '土壤诊断：读取土壤湿度与氮磷钾含量，给出丰缺评级（缺乏/中等/丰富）、综合肥力指数以及灌溉与施肥建议。当用户问"土壤怎么样""要不要浇水""该施什么肥""缺不缺肥""地干不干"时使用。',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'generate_inspection_report',
        description: '执行一次大棚综合巡检：汇总环境、土壤、设备数据，并自动对照作物适宜区间标出所有偏离项（含处置建议）。当用户要求"巡检""巡棚""做个检查""生成巡检报告""看看有没有问题""现在状态正常吗"时使用。返回已标注异常的结论，可直接据此撰写报告。注意：本工具只做数据侧检查，要看作物长势画面请另行调用 take_camera_snapshot。',
        parameters: {
          type: 'object',
          properties: {
            crop: {
              type: 'string',
              description: '可选：作物类型，默认"草莓"。当前内置草莓的适宜区间阈值，其他作物仅做数据汇总不做异常判定'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_device_activity',
        description: '查询设备操作记录（谁在什么时间对哪个设备做了什么操作，如灌溉、补光、通风、开关继电器）。用于回答"上周浇过几次水""最近谁动过设备""有没有按时通风"这类农事追溯问题。',
        parameters: {
          type: 'object',
          properties: {
            deviceName: {
              type: 'string',
              description: '可选：只看指定设备的记录，不传则返回全部设备'
            },
            sinceHours: {
              type: 'number',
              description: '可选：回溯多少小时，默认 168（7 天）'
            },
            limit: {
              type: 'number',
              description: '可选：最多返回多少条，默认 20，上限 100'
            }
          },
          required: []
        }
      }
    }
  ],

  // === 内置用户记忆（显式工具：AI 自主判断何时记住/更新/删除用户信息）===
  'builtin-user-memory': [
    {
      type: 'function',
      function: {
        name: 'remember_user_info',
        description: '记住用户的一条个人信息。当用户在对话中透露出可长期复用的稳定信息时调用，例如"我叫小朱"（key=user_name）、"我种的是红颜草莓"（key=strawberry_variety）、"我在1号棚"（key=greenhouse_info）。\n\n【重要】当用户在【纠正】之前记住的信息时也调用本工具——例如"你记错了，我叫小朱不叫小张"、"我改名了，现在叫老王"，此时把 key 传成对应类型、value 传【纠正后的正确值】（小朱、老王）即可，系统会覆盖旧值。\n\n不要记忆临时性指令（如"帮我开风扇"）。value 用简短中文（≤20字）。',
        parameters: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: '信息类型。常用：user_name=用户称呼/姓名, greenhouse_info=大棚/场地, strawberry_variety=草莓品种, growth_stage=生育期/定植时间, focus_area=关注重点/目标, preferred_temperature=偏好温度, preferred_humidity=偏好湿度, watering_habit=浇水习惯, response_style=回复风格, automation_preference=自动化倾向。也可传中文（如"称呼""品种"）。'
            },
            value: {
              type: 'string',
              description: '具体内容（≤20字），只填核心值，不要带主语前缀。如用户说"我叫小朱"→ value="小朱"（不是"我小朱"）；"我种的是红颜草莓"→ value="红颜"；"我在1号棚"→ value="1号棚"。'
            }
          },
          required: ['key', 'value']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_user_memory',
        description: '列出已记住的关于当前用户的全部信息。当需要确认"我之前记住了什么"、或用户问"你记得我什么/你记住我叫什么了吗"时，先调用本工具查一下再回答，避免瞎猜。',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'forget_user_info',
        description: '删除已记住的一条用户信息。当用户说"别记了""删掉""忘记我叫XX""以后别叫我XX了""别记我名字"时调用。传 key 删除指定项（如 user_name），传 key="*" 清空该用户全部记忆。',
        parameters: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: '要删除的信息类型 key（如 user_name、strawberry_variety），传 "*" 或 "all" 清空全部记忆'
            }
          },
          required: ['key']
        }
      }
    }
  ]
}

/** 内置工具服务器 ID 列表（始终可用，不依赖用户 MCP 配置） */
const BUILTIN_SERVER_IDS = ['builtin-sensor-history', 'builtin-agent-tools', 'builtin-skill-loader', 'builtin-device-control', 'builtin-agent-tasks', 'builtin-deep-research', 'builtin-skill-forge', 'builtin-device-forge', 'builtin-farm-data', 'builtin-user-memory']

/**
 * 根据用户启用的 MCP 服务列表，生成对应的 OpenAI tools 定义
 *
 * 内置工具（如本地传感器历史查询）始终包含，无需用户安装。
 */
export function getMCPToolDefinitions(enabledMCPConfigs: Array<{ id: string; enabled: boolean }>): MCPToolDefinition[] {
  const tools: MCPToolDefinition[] = []

  // 1. 始终注入内置工具
  for (const id of BUILTIN_SERVER_IDS) {
    const toolDefs = MCP_TOOL_REGISTRY[id]
    if (toolDefs) tools.push(...toolDefs)
  }

  // 2. 注入用户已启用的 MCP 工具
  for (const config of enabledMCPConfigs) {
    if (!config.enabled) continue
    if (BUILTIN_SERVER_IDS.includes(config.id)) continue // 避免重复
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
