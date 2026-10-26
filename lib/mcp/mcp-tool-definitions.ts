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
        description: '向用户提问以获取澄清，或让用户在多个方案间做选择。工具会渲染为结构化表单卡片，用户点选即可作答，无需打字。\n【何时调用】仅在①用户请求模糊（推不出方案）②缺少必要参数且无法从设备数据/上下文推断 ③需要在多个方案间由用户拍板时调用。\n【何时禁止】能读代码/设备数据/上下文推断出的信息不要反问；意图明确且参数完整时直接执行；禁止用它问"方案行不行/能不能继续"这类确认问题（这属于 exit_plan_mode 计划审批的职责）。',
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
              description: '快速选项列表（2-4 个），用户点击即选，无需填表。适用于二选一/多选一场景。与 fields 二选一使用。若有推荐方案，把它放第一位并在 label 末尾加「（推荐）」。',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: '选项标识符，如 "option_a"' },
                  label: { type: 'string', description: '选项显示文本，如 "使用默认方案"。若为推荐项，追加「（推荐）」并置于数组首位' }
                },
                required: ['id', 'label']
              }
            },
            questions: {
              type: 'array',
              description: '🔥 分步提问（推荐）：一次调用最多 4 个问题，前端渲染为「1/N + 跳过所有」的分步卡片，用户逐题点选；每题都可补充其他内容。适合需要同时确定多个维度的场景（如"研究方向 / 侧重场景 / 成果形式"），避免来回多轮追问。使用本参数时 title 可省略。与顶层 fields/options 互斥。',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: '问题正文，必须是带问号的完整问句，如 "你希望研究哪个方向？"' },
                  context: { type: 'string', description: '该问题的一句话说明（可选，≤50字）' },
                  multiple: { type: 'boolean', description: '是否多选，默认 false（单选）。仅在多选确实成立时才置 true，且选项之间必须互不冲突' },
                  options: {
                    type: 'array',
                    description: '该问题的选项（2-5 个），用户点选，不需要打字。若有推荐项，置于首位并在 label 末尾加「（推荐）」，每题最多一个推荐',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: '选项标识符' },
                        label: { type: 'string', description: '选项显示文本；推荐项追加「（推荐）」' }
                      },
                      required: ['id', 'label']
                    }
                  },
                  fields: {
                    type: 'array',
                    description: '该问题需要输入具体数值时的表单字段（与顶层 fields 结构一致）',
                    items: {
                      type: 'object',
                      properties: {
                        key: { type: 'string' },
                        label: { type: 'string' },
                        type: { type: 'string', enum: ['number', 'text', 'select', 'switch'] },
                        unit: { type: 'string' },
                        default: {},
                        placeholder: { type: 'string' },
                        min: { type: 'number' },
                        max: { type: 'number' },
                        step: { type: 'number' },
                        options: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: { label: { type: 'string' }, value: { type: 'string' } }
                          }
                        },
                        required: { type: 'boolean' },
                        help: { type: 'string' }
                      },
                      required: ['key', 'label', 'type']
                    }
                  }
                },
                required: ['title']
              }
            }
          },
          required: []
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
        description: '抓取摄像头实时画面并展示给用户（用户说"给我看看""拍张照""现在长什么样""截个图""长势怎么样"时就用它）。抓到的画面由系统**自动发送给用户**，你不需要也不能在回复里粘贴图片/base64；只需用一两句话说明你看到的内容与建议。无需移动云台。摄像头 URL 在系统设置中配置；设备注册表中的设备可用 list_devices 查看（device_id 用于设备注册表标识）。',
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
        description: '移动云台后抓取画面并展示给用户（"看看左边那株""转过去拍一张"时用它）。一次 tool_call 完成"移动+观察"闭环：工具会等电机稳定后截图，画面由系统**自动发送给用户**，你不需要也不能在回复里粘贴图片/base64；如需参数化说明，用 query 传本次观察目的。设备注册表中的设备可用 list_devices 查看（device_id 用于设备注册表标识）。',
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

  // === 内置自动化策略（直写 automation_rules 表，AI 具备完整增删改查能力）===
  // 与设备控制同构：AI 通过原生 tool_call 直接落库，不再依赖输出标签 + 用户手动点保存。
  'builtin-automation-strategy': [
    {
      type: 'function',
      function: {
        name: 'automation_strategy_list',
        description: '查询所有已保存的自动化策略列表（返回 rule_id、名称、描述、启用状态、节点摘要）。当用户想查看、修改、停用或删除已有策略时，必须通过原生 function calling 调用此工具获取 rule_id；禁止只在正文里说"我调用 automation_strategy_list"而不实际发起 tool_call。',
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
        name: 'automation_strategy_detail',
        description: '获取单个自动化策略的完整图数据（nodes/edges，含节点 position 等全部字段）。修改策略内容（如调整阈值、增删节点）前必须先调用此工具，基于返回的原图修改后再调用 automation_strategy_update 提交，禁止凭记忆凭空重建图。',
        parameters: {
          type: 'object',
          properties: {
            rule_id: { type: 'string', description: '策略 ID（来自 automation_strategy_list 返回的 rule_id）' }
          },
          required: ['rule_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'automation_strategy_create',
        description: '创建一个新的自动化策略并直接写入数据库（无需用户再点击保存按钮）。当用户要求"创建/生成/新建一个自动化策略"时调用此工具，返回 rule_id 可用于后续修改或删除。节点缺失 position 时系统会自动分列布局。若你还想在对话中可视化展示这张策略图，可额外输出 <AUTOMATION_STRATEGY> 标签（仅用于展示，不会重复创建）。',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '策略名称（必填，简短明确，如"草莓高温通风策略"）' },
            description: { type: 'string', description: '策略描述（可选，说明触发场景与预期效果）' },
            is_active: { type: 'boolean', description: '创建后立即启用，默认 true；传 false 则创建为停用状态' },
            trigger_type: {
              type: 'string',
              description: '主触发器类型（可选）：sensor(传感器)/schedule(定时)/device(设备状态)/manual(手动)/vlm(视觉)。不传时从 triggerNode 节点的 data.type 自动推断'
            },
            graph_data: {
              type: 'object',
              description: '完整的策略图数据（必填）：{nodes, edges}',
              properties: {
                nodes: {
                  type: 'array',
                  description: '节点列表，至少包含一个 triggerNode 与一个 actionNode',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: '节点 ID，推荐 T1/T2、L1/L2、AN1/AN2、A1/A2 前缀' },
                      type: {
                        type: 'string',
                        enum: ['triggerNode', 'logicNode', 'aiNode', 'actionNode'],
                        description: '节点类型：triggerNode(触发器)/logicNode(逻辑判断)/aiNode(AI处理)/actionNode(执行动作)'
                      },
                      data: {
                        type: 'object',
                        description: '节点数据：label（显示名，必填）、type（子类型）、config（阈值等参数）。\ntriggerNode.type ∈ sensor|schedule|device|manual；logicNode.type ∈ compare|range|condition|and/or；aiNode.type ∈ llm|trend|diagnose|recommend；actionNode.type ∈ device|notification|record'
                      },
                      position: { type: 'object', description: '画布坐标 {x, y}（可选，缺失时自动布局）' }
                    },
                    required: ['id', 'type', 'data']
                  }
                },
                edges: {
                  type: 'array',
                  description: '边列表，source/target 必须对应 nodes 中已定义的 id',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: '边 ID，如 "e1"（可选，缺失时自动生成）' },
                      source: { type: 'string', description: '起点节点 ID' },
                      target: { type: 'string', description: '终点节点 ID' }
                    },
                    required: ['source', 'target']
                  }
                }
              },
              required: ['nodes']
            }
          },
          required: ['name', 'graph_data']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'automation_strategy_update',
        description: '修改一个已保存的自动化策略。可修改名称、描述、启用状态（停用传 is_active=false），或提交修改后的完整图数据 graph_data（必须基于 automation_strategy_detail 返回的原图修改，保留节点原有字段如 position，包含全部节点和边，不是增量补丁）。提交成功后不要再在回复正文中输出策略 JSON。',
        parameters: {
          type: 'object',
          properties: {
            rule_id: { type: 'string', description: '策略 ID（来自 automation_strategy_list 返回的 rule_id）' },
            name: { type: 'string', description: '新的策略名称（可选）' },
            description: { type: 'string', description: '新的策略描述（可选）' },
            is_active: { type: 'boolean', description: '是否启用（可选）：停用策略传 false，启用传 true' },
            trigger_type: { type: 'string', description: '主触发器类型（可选）：sensor|schedule|device|manual|vlm' },
            graph_data: {
              type: 'object',
              description: '修改后的完整图数据（可选）。提供时必须是完整的 {nodes, edges}，节点保留原有全部字段（id/type/data/position 等），只修改需要变更的部分',
              properties: {
                nodes: {
                  type: 'array',
                  description: '全部节点列表',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: '节点 ID，如 "T1"' },
                      type: { type: 'string', enum: ['triggerNode', 'logicNode', 'aiNode', 'actionNode'], description: '节点类型' },
                      data: { type: 'object', description: '节点数据：label（显示名）、type（子类型）及阈值等参数' },
                      position: { type: 'object', description: '画布坐标 {x, y}，保留原值' }
                    },
                    required: ['id', 'type', 'data']
                  }
                },
                edges: {
                  type: 'array',
                  description: '全部边列表，source/target 必须对应 nodes 中已定义的 id',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: '边 ID，如 "e1"' },
                      source: { type: 'string', description: '起点节点 ID' },
                      target: { type: 'string', description: '终点节点 ID' }
                    },
                    required: ['source', 'target']
                  }
                }
              },
              required: ['nodes']
            }
          },
          required: ['rule_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'automation_strategy_delete',
        description: '删除一个已保存的自动化策略（不可恢复）。删除前必须先调用 automation_strategy_list 确认目标；若用户未明确指定要删除哪个策略（如只说"删掉温度那个"，存在多个相似策略），必须先用 ask_user_question 向用户确认，避免误删。',
        parameters: {
          type: 'object',
          properties: {
            rule_id: { type: 'string', description: '要删除的策略 ID（来自 automation_strategy_list 返回的 rule_id）' }
          },
          required: ['rule_id']
        }
      }
    }
  ],

  // === 内置工具索引（按需加载完整工具定义）===
  // 目的：把"每请求携带全部工具 schema"（实测 38 个工具 ≈ 35KB ≈ 10.4k token）
  // 改成"系统提示词只列名字 + 一句话用途，模型要用哪个再加载哪个"。
  // 模型看到清单后，先调 load_tool_schema 取回完整参数定义，下一轮即可正常调用。
  // 兜底：executor 按全局 registry 路由，即使模型跳过本过程直接调用已注册的工具也能执行。
  'builtin-tool-index': [
    {
      type: 'function',
      function: {
        name: 'load_tool_schema',
        description: '按需加载工具的完整参数定义。系统提示词的「可用工具」清单里只有工具名和一句话用途，没有参数结构。当你要调用某个工具时，先调用本工具传入它的名字，加载后即可在下一轮正常调用（参数定义会出现在可用工具列表中）。一次可加载多个。',
        parameters: {
          type: 'object',
          properties: {
            tool_names: {
              type: 'array',
              items: { type: 'string' },
              description: '要加载的工具名列表，例如 ["automation_strategy_list", "toggle_relay"]。名字必须来自系统提示词的「可用工具」清单（原样复制，不要臆造）。'
            }
          },
          required: ['tool_names']
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
  ],

  // === 内置视觉诊断（病虫害图像诊断：走 vision-gateway，统一模型与凭据解析）===
  // 为什么要做成工具而不是靠模型手写 <DIAGNOSIS> 标签：
  // 手写标签依赖模型自觉，实测模型经常直接回散文 → 诊断卡与遮罩图永远不出现。
  // 做成原生工具后，诊断由服务端必定执行，结果经 route.ts 注入标签 → 前端必定渲染。
  'builtin-vision-diagnosis': [
    {
      type: 'function',
      function: {
        name: 'diagnose_plant_image',
        description:
          '对用户发来的植株图片做病虫害诊断：识别病/虫种类、严重度、发病部位、判断依据、鉴别诊断与分级防治方案，并在原图上定位病害区域（归一化 bbox，前端据此生成遮罩图）。\n\n' +
          '【何时必须调用】只要用户本轮消息里带了植株/叶片/果实/花朵的图片，且意图与「看有没有病、这是什么问题、叶子怎么了、果子上是什么」相关，就必须调用本工具，不要用肉眼知识凭空作答。\n\n' +
          '【你不需要传图片】系统会自动把用户本轮发送的图片交给本工具，参数里只需要补充文字线索。\n\n' +
          '【调用后】工具结果会自动渲染成诊断卡片 + 病害部位遮罩图，你只需用一段话总结要点与下一步操作，严禁自己再编造 <DIAGNOSIS> 标签或 JSON。',
        parameters: {
          type: 'object',
          properties: {
            context: {
              type: 'string',
              description:
                '补充线索：发病部位（叶/果/茎/根）、发生范围（单株/整棚/多少比例）、近期天气与管理（连阴雨/打药/施肥）、已用过的药等。越具体诊断越准。'
            },
            question: {
              type: 'string',
              description: '用户具体想问什么，例如"这是灰霉病吗""还能救吗""打什么药"。'
            }
          },
          required: []
        }
      }
    }
  ],

  // === 内置病历查询（只读：把「视觉诊断沉淀的档案」变成 AI 可检索的事实源）===
  // 用户的问题常跨多条记录（"这茬得过几次病""上次那病好了吗""有什么还没处理的"），
  // 没有工具时模型只能反问或瞎猜；有工具后可直接基于真实档案回答。
  'builtin-medical-records': [
    {
      type: 'function',
      function: {
        name: 'query_medical_records',
        description:
          '查询当前用户的「病历」——每次图像诊断都会自动沉淀成一份病历，含病名、严重度、状态（待处置/处置中/已解决/已归档）与复诊疗效。\n\n' +
          '【何时调用】用户问及自己的病害历史与处置进展时，例如"我这茬草莓得过几次病""有什么还没处理的""上次那个灰霉病后来好了吗""我一共治好了几例""最近有没有新病害"。\n\n' +
          '【返回】总览统计 + 匹配到的病历列表（每条带 id，可再用 get_medical_record 取详情）。\n' +
          '【不要编造】如果返回 0 条，就如实说"还没有病历"，并提示用户拍一张植株照片做一次诊断即可自动入档。',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: '按状态筛选：open（待处置）/ treating（处置中）/ resolved（已解决）/ archived（已归档）。不传则全部。'
            },
            disease_name: {
              type: 'string',
              description: '按病名精确筛选，如"灰霉病""白粉病"。不确定确切名字时不要传，改用 keyword。'
            },
            crop: {
              type: 'string',
              description: '按作物筛选，如"草莓"。'
            },
            keyword: {
              type: 'string',
              description: '模糊搜索：会匹配病名、结论摘要与作物名。适合"灰霉""霉层""叶子发黄"这类模糊说法。'
            },
            limit: {
              type: 'number',
              description: '最多返回几条（默认 20，上限 50）。'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_medical_record',
        description:
          '取某一份病历的完整内容：当时的诊断结论（严重度/置信度/发病部位/图中依据/四级防治方案）+ 之后的复诊时间轴（每次疗效与备注）。\n\n' +
          '【何时调用】已经通过 query_medical_records 拿到病历 id，需要展开细节时。典型问题："上次那病当时是怎么治的""后来恢复得怎么样"。',
        parameters: {
          type: 'object',
          properties: {
            record_id: {
              type: 'number',
              description: '病历 id（由 query_medical_records 返回的 id 字段）。'
            }
          },
          required: ['record_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_medical_record',
        description:
          '修改一份病历：推进状态、纠正病名/严重度、写备注。\n\n' +
          '【何时调用】用户要"把白粉病那条标记为已解决""改一下那条的病名，其实是炭疽病""给这条加个备注：已打药"。\n\n' +
          '【先定位再改】调用前先用 query_medical_records / get_medical_record 定位到**唯一**那条病历，' +
          '并在回复里复述"你要改的是 #id（病名 · 首诊日期）对吗"，用户确认后再改。\n' +
          '【改病名要谨慎】病名是当时诊断的结论，只在用户明确指出"判错了 / 其实是 X 病"时才改；' +
          '服务层会保留原值用于追溯，但仍应先把"原值 → 新值"讲清楚。\n' +
          '【恢复归档】把 status 改回 treating / open，即可让一份已归档病历重新回到待办。',
        parameters: {
          type: 'object',
          properties: {
            record_id: {
              type: 'number',
              description: '病历 id（由 query_medical_records 返回）。'
            },
            status: {
              type: 'string',
              description: '新状态：open（待处置）/ treating（处置中）/ resolved（已解决）/ archived（已归档）。不改则不要传。'
            },
            disease_name: {
              type: 'string',
              description: '纠正后的病名（仅在用户明确说原判错误时使用）。'
            },
            severity: {
              type: 'string',
              description: '纠正后的严重度：none / mild / moderate / severe。'
            },
            note: {
              type: 'string',
              description: '病历备注，如"已打药""雨后复发""等雨停再处理"。传空字符串表示清空备注。'
            }
          },
          required: ['record_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'delete_medical_record',
        description:
          '删除一份病历。**默认是「归档」—— 可恢复、数据不丢**；只有用户明确要求才会永久删除。\n\n' +
          '【何时调用】用户说"把蚜虫那条删掉 / 清掉 / 移除 / 不要了"。\n\n' +
          '【默认行为】不传 permanent（或传 false）→ 归档：状态置为 archived，数据完整保留，' +
          '之后可用 update_medical_record 把 status 改回 treating/open 恢复。\n' +
          '【永久删除】仅当用户**明确**说"永久删除 / 彻底删掉 / 从数据库里删 / 不可恢复地删"时，才传 permanent: true。' +
          '含糊的"删掉""清掉"一律按归档处理，并在回复里告诉用户"已归档，可以恢复"。\n' +
          '【先定位再删】执行前先定位到唯一那条病历，并复述"你要删的是 #id（病名 · 首诊日期）"，得到确认后再执行。',
        parameters: {
          type: 'object',
          properties: {
            record_id: {
              type: 'number',
              description: '病历 id（由 query_medical_records 返回）。'
            },
            permanent: {
              type: 'boolean',
              description:
                'true = 永久删除（不可恢复），仅用户明确要求时使用；默认 / false = 归档（可恢复）。'
            }
          },
          required: ['record_id']
        }
      }
    }
  ],

  // === 文档处理（读 / 生成 / 编辑 PDF·Word·Excel·PPT）===
  // 三个工具按「动作」划分而不是按格式：格式只作为参数，模型不需要记住 12 个工具名。
  'builtin-document': [
    {
      type: 'function',
      function: {
        name: 'document_read',
        description:
          '读取用户上传或此前生成的文档（PDF / Word .docx / Excel .xlsx / PowerPoint .pptx / md / txt / csv / json / html），' +
          '返回结构化的正文、大纲、表格与图片说明。\n\n' +
          '【何时调用】用户上传了文件并问内容、要求总结/提取/核对/翻译/"看看这份文件"；' +
          '或在修改文件之前需要先看清原文。\n\n' +
          '【file_id】不传则返回**本次对话里的文件清单**（含 file_id）。不要凭空编造 file_id，' +
          '不知道就用不带参数的方式先列一遍。\n\n' +
          '【扫描件与图片】PDF 的扫描页、PPT 里的图表图片，默认识别不到文字。' +
          '若用户要看这类内容（如"这份扫描合同写了什么"），传 include_images: true —— ' +
          '系统会把页面图片直接交给多模态模型理解（不是 OCR），能得到表格与图表趋势。\n\n' +
          '【大文档】返回里 truncated 为 true 时，用 sections 指定分节续读：' +
          'pdf 传页码、xlsx 传工作表序号、pptx 传幻灯片序号、docx 传章节序号（均从 1 开始）。',
        parameters: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: '文件 id（UUID）。不传则列出本次对话中的文件清单。'
            },
            sections: {
              type: 'array',
              items: { type: 'number' },
              description:
                '只读这些分节，从 1 开始。PDF=页号，Excel=工作表序号，PPT=幻灯片序号，Word=章节序号。' +
                '不传=读全文（受 max_chars 预算限制）。'
            },
            max_chars: {
              type: 'number',
              description: '本次读取的字符预算，默认 30000。要精读某一章时传小一点（如 8000）也没什么用，直接用 sections 更准。'
            },
            include_images: {
              type: 'boolean',
              description:
                'true = 把文档里的图片（含扫描页）交给多模态模型理解并转成文字。' +
                '代价较高（每张图一次模型调用），只在确实需要看图时开启。'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'document_create',
        description:
          '生成一份可下载的文档：Word(.docx) / Excel(.xlsx) / PowerPoint(.pptx) / PDF / Markdown。' +
          '生成后前端会显示下载卡片，用户可直接保存或继续用 Office 打开编辑。\n\n' +
          '【何时调用】用户要"写一份报告/方案/合同/总结（Word）"、"做成 Excel 表格"、' +
          '"做个 PPT / 演示文稿 / 汇报材料"、"导出 PDF"。\n\n' +
          '【内容形式】docx / pdf / pptx / md 用 markdown 传正文：' +
          '# 一级标题（PPT 里=新的一页）、## 二级标题、普通段落、- 列表、| 表格 |、> 引用、``` 代码块。' +
          'pptx 会自动分页：每个 # 一级标题一页，要点过多自动续页，所以**不要**把整篇塞进一个标题下。\n\n' +
          '【Excel 专用】优先用 sheets 传结构化数据（可多个工作表、自动表头样式/冻结/列宽/筛选）；' +
          '只有 markdown 里有表格时也能自动取表，但精度不如 sheets。\n\n' +
          '【不要】不要把 HTML 当内容传进来（会变成转义文本）；不要在正文里写"第 1 页"这类分页指令，' +
          '分页由系统按内容自动处理。',
        parameters: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['docx', 'xlsx', 'pptx', 'pdf', 'md'],
              description: '输出格式。用户要"Word/文档"→docx；"表格/Excel"→xlsx；"PPT/幻灯片"→pptx；"PDF"→pdf。'
            },
            title: {
              type: 'string',
              description: '文档标题。也用于文件名与封面/首页大标题，写清楚对象和主题（如"1号棚灰霉病防治方案"）。'
            },
            subtitle: {
              type: 'string',
              description: '副标题（可选）。docx/pdf 会显示在封面标题下方。'
            },
            markdown: {
              type: 'string',
              description:
                '正文（Markdown）。要求：结构完整、可直接交付，不要写"以下是内容"这类对话性开场白，' +
                '不要用占位符（如"（此处省略）"）。xlsx 可省略。'
            },
            sheets: {
              type: 'array',
              description: 'Excel 专用：工作表列表。传了它就用它，忽略 markdown 里的表格。',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: '工作表名（≤31 字）' },
                  headers: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '表头行。不传则把 rows 第一行当表头。'
                  },
                  rows: {
                    type: 'array',
                    items: { type: 'array', items: {} },
                    description: '数据行，二维数组。数字请传 number（Excel 里能直接求和），日期传 "2026-10-21" 字符串。'
                  },
                  column_widths: {
                    type: 'array',
                    items: { type: 'number' },
                    description: '列宽（字符数）。不传按内容自动估算。'
                  }
                },
                required: ['name', 'rows']
              }
            },
            author: { type: 'string', description: '作者/署名（可选，默认 Stravision AI 助手）' },
            file_name: { type: 'string', description: '文件名（可选）。不传用 title + 扩展名。' },
            cover: { type: 'boolean', description: 'docx/pdf 是否生成封面页，默认 true。' }
          },
          required: ['format', 'title']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'document_edit',
        description:
          '修改用户已有的文档，**保留原有排版与格式**（只改指定的文字/单元格/幻灯片，' +
          '字体、行距、编号、图片位置一律不动）。结果另存为新文件，原件不会被覆盖。\n\n' +
          '【支持的操作】' +
          '\n· Word：replace_text（全文查找替换）、append_paragraph（末尾追加段落）、set_table_cell（改表格某格）' +
          '\n· Excel：set_cell（改单元格，值以 = 开头则写公式）、append_rows（追加数据行）、replace_text、set_sheet_name' +
          '\n· PPT：replace_text（可限定 slide）、set_slide_title、append_slide（新增一页）' +
          '\n· PDF：不支持原地修改（版面固化）。用户要改 PDF → 先 document_read 读出内容，再用 document_create 出 docx 或 pdf 新件。' +
          '\n\n' +
          '【ops 是数组】一次传多个操作按顺序执行。replace_text 的 find 必须是原文里**逐字连续**的片段' +
          '（不要跨段落拼接，也不要带省略号）。\n\n' +
          '【不适用】如果改动范围大到"重写整篇"，直接 document_create 生成新文件更可靠。\n\n' +
          '【回报】结果里会逐条说明每个操作是否命中；没命中时（例如文字在图片里）不要重试同一操作，' +
          '改用重新生成或直接告诉用户原因。',
        parameters: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: '要修改的文件 id（先用 document_read 列出/确认）' },
            ops: {
              type: 'array',
              description: '操作列表，按顺序执行。',
              items: {
                type: 'object',
                properties: {
                  op: {
                    type: 'string',
                    enum: [
                      'replace_text',
                      'append_paragraph',
                      'set_table_cell',
                      'set_cell',
                      'append_rows',
                      'set_slide_title',
                      'append_slide',
                      'set_sheet_name'
                    ],
                    description: '操作类型'
                  },
                  find: { type: 'string', description: 'replace_text：要查找的原文片段（逐字连续）' },
                  replace: { type: 'string', description: 'replace_text：替换成的文本；不需要了传空字符串' },
                  limit: { type: 'number', description: 'replace_text：最多替换几处，不传=全部' },
                  slide: { type: 'number', description: 'replace_text / set_slide_title：限定第几张幻灯片（从 1 开始）' },
                  sheet: { type: 'string', description: 'Excel 操作用的工作表名（或序号 "1"）；不传=第一个' },
                  text: { type: 'string', description: 'append_paragraph：要追加的段落文本' },
                  table: { type: 'number', description: 'set_table_cell：第几张表格（从 0 开始），默认 0' },
                  row: { type: 'number', description: 'set_table_cell：行号（从 0 开始，0=第一行）' },
                  col: { type: 'number', description: 'set_table_cell：列号（从 0 开始，0=第一列）' },
                  value: { type: 'string', description: 'set_table_cell / set_cell：新值（Excel 里 "=B2*C2" 会写成公式）' },
                  cell: { type: 'string', description: 'set_cell：单元格地址，如 "B7"' },
                  rows: {
                    type: 'array',
                    items: { type: 'array', items: {} },
                    description: 'append_rows：要追加的数据行（二维数组）'
                  },
                  title: { type: 'string', description: 'set_slide_title / append_slide：幻灯片标题' },
                  bullets: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'append_slide：该页的要点列表'
                  },
                  name: { type: 'string', description: 'set_sheet_name：新的工作表名' }
                },
                required: ['op']
              }
            },
            file_name: { type: 'string', description: '输出文件名（可选，默认原文件名 + "-已修改"）' }
          },
          required: ['file_id', 'ops']
        }
      }
    }
  ],

  // === 前端工具（client tool）：不在服务端执行，由浏览器执行后回传结果 ===
  // 🚨 故意 **不** 放进 BUILTIN_SERVER_IDS —— 这些工具依赖宿主页面（如画布编辑器）注册的执行器，
  //    只有请求显式声明了对应 clientCapabilities 时才会被注入（见 route.ts）。
  //    否则在主 AI 助手里调它 → 没人执行 → 白等 2 分钟超时。
  'builtin-canvas-client': [
    {
      type: 'function',
      function: {
        name: 'automation_canvas_apply',
        description:
          '直接修改用户当前打开的画布（自动化策略编辑器里的流程节点图），所见即所得：可增删改节点、连线、移动与高亮，一次提交多个操作按顺序执行。' +
          '画布上已有的节点 id / 类型 / 标签会随「当前页面实时上下文」一起提供，修改前请先对照它确定目标 id。' +
          '只影响画布，不会自动保存落库 —— 用户可自行撤销（Ctrl+Z）或点保存。' +
          '当用户说「帮我加一个…」「把这条规则改成…」「连起来」「删掉这个节点」时使用本工具；' +
          '若只是问策略清单/内容而无需改动，用 automation_strategy_* 系列查询即可。' +
          '改完后用一两句话说明改了什么即可，**不要再输出 <AUTOMATION_STRATEGY> 标签或节点 JSON 草稿**（画布上已经是结果了）。',
        parameters: {
          type: 'object',
          properties: {
            ops: {
              type: 'array',
              description: '要执行的操作列表，按数组顺序依次执行',
              items: {
                type: 'object',
                properties: {
                  op: {
                    type: 'string',
                    enum: [
                      'add_node',
                      'update_node',
                      'remove_node',
                      'connect',
                      'disconnect',
                      'move_node',
                      'highlight',
                      'clear',
                    ],
                    description:
                      'add_node=新增节点；update_node=改标签/子类型/配置；remove_node=删除节点（连带其连线）；' +
                      'connect=连线；disconnect=断开连线；move_node=移动节点；highlight=高亮若干节点引起用户注意；clear=清空整个画布',
                  },
                  id: {
                    type: 'string',
                    description:
                      '节点 id。**强烈建议 add_node 时自己指定一个短 id（如 t1 / l1 / a1，同一批 ops 内唯一）**，' +
                      '这样同批后面的 connect 才能准确引用；不指定则自动生成为「类型-序号」并在返回里给出。' +
                      'update_node/remove_node/move_node/highlight 必填',
                  },
                  type: {
                    type: 'string',
                    enum: ['triggerNode', 'logicNode', 'aiNode', 'actionNode'],
                    description: '节点类型，add_node 必填。triggerNode=触发器 / logicNode=逻辑判定 / aiNode=AI 处理 / actionNode=执行动作',
                  },
                  subType: {
                    type: 'string',
                    description:
                      '节点子类型。触发器：vlm/sensor/schedule/manual；判定：compare/range/condition/delay；' +
                      'AI：llm/trend/anomaly/classify；执行：device/notification/webhook/database',
                  },
                  label: { type: 'string', description: '节点显示名（中文短句，如「棚内温度 > 28℃」）' },
                  config: {
                    type: 'object',
                    description: '节点配置键值对，如 { relay: 2, threshold: 28, duration: 600 }',
                  },
                  position: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' } },
                    description: '节点坐标；不传则自动排布到不遮挡已有节点的位置',
                  },
                  source: { type: 'string', description: 'connect/disconnect 的起点节点 id' },
                  target: { type: 'string', description: 'connect/disconnect 的终点节点 id' },
                  sourceHandle: {
                    type: 'string',
                    description: '起点出口。logicNode 有 true/false 两个出口（是/否分支），其余节点不传',
                  },
                  targetHandle: { type: 'string', description: '终点入口，一般不传' },
                  edgeLabel: { type: 'string', description: '连线标签，如「是」「否」' },
                  reason: { type: 'string', description: '一句话说明这一步为什么做，会展示给用户' },
                },
                required: ['op'],
              },
            },
            summary: {
              type: 'string',
              description: '一句话总结这次画布改动（会展示给用户，如「新增夜间低温自动加热链路」）',
            },
          },
          required: ['ops'],
        },
      },
    },
  ],

  /**
   * 通用硬件接入（第三方设备）
   *
   * 与画布工具同理：只能在浏览器里执行 —— 它要打开「设备管理 → 接入向导」并把草稿灌进表单。
   * 🚨 关键设计：**只预填，不落库**。真正的创建仍然由用户点「完成接入」触发，
   *    所以 AI 没有任何途径在用户没看见的情况下往设备表里写东西。
   */
  'builtin-device-access-client': [
    {
      type: 'function',
      function: {
        name: 'device_access_catalog',
        description:
          '查询「平台支持接入哪些第三方硬件、每类协议需要填哪些参数、账号下已经有哪些连接和设备」。' +
          '**当用户提到要接入/新增第三方硬件（传感器、开关、PLC、电表、网关、MQTT 设备…）时，先调用本工具**，' +
          '拿到协议字段清单后，才能有针对性地问用户「Broker 地址是多少 / 设备用的是 HTTP 还是 MQTT」这类问题。' +
          '返回里每个字段都带 required / secret / advanced 标记：secret 是密码类（用户必须自己填，不要向他索要明文后转述），' +
          'advanced 是不填也能跑的。不要凭记忆猜字段名。',
        parameters: {
          type: 'object',
          properties: {
            protocol: {
              type: 'string',
              enum: ['mqtt', 'http', 'modbus_tcp'],
              description: '只看某一种协议时传；不传则返回全部协议 + 现有连接 + 已接入设备概览',
            },
          },
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'device_access_apply_draft',
        description:
          '把整理好的接入方案**填进「接入向导」并打开给用户核对**（不会直接创建设备，用户仍需点「完成接入」）。\n\n' +
          '使用时机：用户表达要接一台具体设备，且你已经知道（或能合理推断）它的协议与要采集/控制的能力。' +
          '不要只把方案写成文字让用户自己抄 —— 直接调用本工具，向导会带着你填好的内容弹出来。\n\n' +
          '填写原则：\n' +
          '① device.thing_model.properties 至少 1 条，key 用英文小写下划线（temperature / soil_moisture），name 用中文；\n' +
          '② 只能上报的属性 access="r"；既能读又能写的用 "rw"；只下发的用 "w"；\n' +
          '③ 上报字段路径 path 按设备实际上报的 JSON 结构写（如 {"data":{"temp":25}} → path="data.temp"），默认等于 key；\n' +
          '④ 原始值是放大整数（如 235 表示 23.5℃）时用 scale（真实值 = 原始值 / scale）；\n' +
          '⑤ connection 传已有连接的 id 就复用；要新建就给 name + protocol（+ config 里的地址等非敏感项），**绝不填密码**；\n' +
          '⑥ 你猜不到、必须用户提供的项（密码、设备序列号、实际从站地址）写进 missing，会在向导顶部列给用户。\n\n' +
          '调用后不要再复述整份 JSON，用一两句话说明你填了什么、还缺什么即可。',
        parameters: {
          type: 'object',
          properties: {
            connection: {
              type: 'object',
              description: '接入连接。能复用已有连接就只传 id；要新建则给 name + protocol',
              properties: {
                id: { type: 'number', description: '已有连接的 id（来自 device_access_catalog）' },
                name: { type: 'string', description: '连接名称，如「一号温室 EMQX」' },
                protocol: { type: 'string', enum: ['mqtt', 'http', 'modbus_tcp'] },
                description: { type: 'string', description: '备注：这条连接接的是哪片区域/哪批设备' },
                config: {
                  type: 'object',
                  description:
                    '非敏感配置，键名必须取自 device_access_catalog 返回的 fields。例：{ "url": "mqtt://broker.example.com:1883", "baseUrl": "http://192.168.1.50:8080", "host": "192.168.1.10", "port": 502, "unitId": 1 }',
                },
                allow_private_network: {
                  type: 'boolean',
                  description: '设备在局域网（192.168.x / 10.x）时必须为 true，否则平台会拦下内网地址（SSRF 防护）',
                },
              },
            },
            device: {
              type: 'object',
              description: '要接入的设备本体与它的物模型',
              properties: {
                name: { type: 'string', description: '设备名称（中文，如「A 区温湿度传感器」）' },
                external_id: {
                  type: 'string',
                  description: '设备在第三方平台/网关里的唯一标识（设备序列号、DevEUI、从站编号）。用于把上行数据对应到这台设备',
                },
                subscribe_topic: { type: 'string', description: 'MQTT 上报 topic（可含 + / # 通配，如 sensors/+/data）' },
                publish_topic: { type: 'string', description: 'MQTT 控制 topic（可用 {{device.external_id}} 占位）' },
                thing_model: {
                  type: 'object',
                  description: '物模型：这台设备能上报什么、能被控制什么',
                  properties: {
                    properties: {
                      type: 'array',
                      description: '属性列表，至少 1 条',
                      items: {
                        type: 'object',
                        properties: {
                          key: { type: 'string', description: '英文标识，如 temperature' },
                          name: { type: 'string', description: '中文名，如 温度' },
                          dataType: { type: 'string', enum: ['number', 'boolean', 'string', 'enum'] },
                          unit: { type: 'string', description: '单位，如 °C / % / kWh' },
                          access: { type: 'string', enum: ['r', 'rw', 'w'], description: 'r=只上报，rw=可读可写，w=只下发' },
                          path: { type: 'string', description: '上报报文里的取值路径，支持 a.b.c 与 a[0].b' },
                          scale: { type: 'number', description: '换算除数：真实值 = 原始值 / scale' },
                          offset: { type: 'number', description: '换算偏移，一般不用' },
                          decimals: { type: 'number', description: '展示保留小数位' },
                          min: { type: 'number' },
                          max: { type: 'number' },
                          enum: {
                            type: 'array',
                            description: 'dataType=enum 时必填',
                            items: {
                              type: 'object',
                              properties: {
                                value: { type: ['string', 'number'] },
                                label: { type: 'string' },
                              },
                            },
                          },
                        },
                        required: ['key', 'name', 'dataType', 'access'],
                      },
                    },
                    actions: {
                      type: 'array',
                      description: '可下发的动作（如开/关、设置档位）。没有就不传',
                      items: {
                        type: 'object',
                        properties: {
                          key: { type: 'string' },
                          name: { type: 'string' },
                          description: { type: 'string' },
                          params: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                key: { type: 'string' },
                                name: { type: 'string' },
                                dataType: { type: 'string', enum: ['number', 'boolean', 'string', 'enum'] },
                                required: { type: 'boolean' },
                              },
                              required: ['key', 'name', 'dataType'],
                            },
                          },
                          transport: {
                            type: 'object',
                            description:
                              '下发通道。payload 支持占位符：{{value}} / {{params.xxx}} / {{device.external_id}}。不传则用 publish_topic + 默认报文',
                            properties: {
                              topic: { type: 'string' },
                              payload: { type: 'string' },
                              method: { type: 'string' },
                              url: { type: 'string' },
                            },
                          },
                        },
                        required: ['key', 'name'],
                      },
                    },
                  },
                  required: ['properties'],
                },
              },
              required: ['name', 'thing_model'],
            },
            missing: {
              type: 'array',
              description: '必须由用户提供、你无法推断的参数（如「MQTT 密码」「设备实际从站地址」），会在向导顶部列出来',
              items: { type: 'string' },
            },
            notes: {
              type: 'array',
              description: '你的判断依据（如「温湿度传感器一般用 MQTT 上报到 sensors/<id>/data」），帮用户在核对时理解为什么这么填',
              items: { type: 'string' },
            },
          },
          required: ['device'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'device_form_read',
        description:
          '读取「用户此刻正在填写的那张设备表单」的实时状态：哪张表、第几步、每个字段已填了什么、还缺哪些必填项、哪里校验没过。\n\n' +
          '**当用户说「帮我填」「这个怎么填」「还差什么」「你看我填的对不对」，或你正要动手改表单之前，先调用本工具** —— ' +
          '不要凭对话记忆猜他填到哪一步：猜错就会把他已经改好的值又覆盖回去，那正是「AI 乱填」的根因。\n\n' +
          '返回内容：\n' +
          '· step / steps / stepTitle —— 分步表单（接入向导）当前在第几步；\n' +
          '· fields —— 每个字段的 key、中文名、当前值、是否必填、是否已填；\n' +
          '· blocks —— 属性表 / 动作这类非单值区块的明细；\n' +
          '· missing —— 必填但还空着的项，你要补的就是这些；\n' +
          '· issues —— 当前校验不通过的原因。\n\n' +
          '用户没打开任何设备表单时会如实告诉你「没有正在填写的表单」，此时**不要凭空编造表单内容**，' +
          '先引导他打开：第三方硬件走「设备管理 → 接入向导」，专属硬件走「设备管理 → 新增设备」。\n' +
          '凭证类字段（secret）只告诉你「用户是否已填写」，值永远不会回传给你 —— 也不要向他索要。',
        parameters: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: ['access-wizard', 'access-connection', 'device-registry'],
              description:
                '指定读哪张表；不传则读「用户此刻正在填的那张」（优先级：接入向导 > 接入连接 > 专属硬件）',
            },
          },
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'device_form_patch',
        description:
          '把字段**增量**填进用户正在填写的设备表单 —— 只改你传进来的键，其余一律保持原样。\n\n' +
          '🚨 与 device_access_apply_draft 的区别（选错就会「乱填」）：\n' +
          '· device_form_patch（本工具）= 增量补字段。用户**已经打开**表单、填了一半时用它，' +
          '只补他缺的那几格，他改过的值不会被覆盖。\n' +
          '· device_access_apply_draft = 整包预填。用户**还没打开**表单、你要从零给他一份完整方案时才用它 —— ' +
          '它会重置整张表。\n\n' +
          '正确流程：device_form_read 看清还缺什么 → 调本工具只补缺的 → 用一两句话说明你填了什么、还缺什么。' +
          '不要把用户已经填好的值再传一遍，也不要复述整份 JSON。\n\n' +
          '可填的键（不同表单支持的键不同；不认识的键会被忽略并在 ignored 里回给你）：\n' +
          '· access-wizard（接入向导）：name / external_id / subscribe_topic / publish_topic / connection_id（已有连接的 id）/ ' +
          'properties（按 key 增量合并：同名覆盖、异名追加）/ actions（同样按 key 合并）\n' +
          '· access-connection（接入连接）：name / description / config（{ 键: 值 } 增量合并，键名必须取自 device_access_catalog）/ ' +
          'allow_private_network。凭证 secrets.* 与 protocol 一律不接受。\n' +
          '· device-registry（专属硬件）：name / type（relay|sensor|camera|stepper）/ category / node_id / ' +
          'subscribe_topic / publish_topic / config（合并进「高级配置」JSON）',
        parameters: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: ['access-wizard', 'access-connection', 'device-registry'],
              description: '指定填哪张表；不传则填「用户此刻正在填的那张」',
            },
            fields: {
              type: 'object',
              description: '要填的字段（键名见说明）。只传需要补的键，多余的键会被忽略',
              additionalProperties: true,
            },
            note: {
              type: 'string',
              description: '一句话说明这次填写的依据，如「按温湿度传感器的常见上报口径补的」',
            },
          },
          required: ['fields'],
        },
      },
    },
  ],
}

/** 内置工具服务器 ID 列表（始终可用，不依赖用户 MCP 配置） */
const BUILTIN_SERVER_IDS = ['builtin-sensor-history', 'builtin-agent-tools', 'builtin-skill-loader', 'builtin-device-control', 'builtin-automation-strategy', 'builtin-tool-index', 'builtin-agent-tasks', 'builtin-deep-research', 'builtin-skill-forge', 'builtin-device-forge', 'builtin-farm-data', 'builtin-user-memory', 'builtin-vision-diagnosis', 'builtin-medical-records', 'builtin-document']

/** 按需加载工具的元工具名（不参与"需要先加载"的流程，始终可直接调用） */
export const TOOL_INDEX_LOADER_NAME = 'load_tool_schema'

/** 前端工具（client tool）所在的 server id —— 不在 BUILTIN_SERVER_IDS 里，需按能力声明注入 */
export const CLIENT_TOOL_SERVER_ID = 'builtin-canvas-client'

/**
 * 所有「前端工具服务器」。
 * 🚨 新增一个前端能力组时**必须**登记到这里，否则 `getClientToolDefinitions`
 *    只扫 canvas 那一组，工具永远注入不到 tools（表现为模型说「我没有这个工具」）。
 */
const CLIENT_TOOL_SERVER_IDS = ['builtin-canvas-client', 'builtin-device-access-client']

/**
 * 前端工具名 → 它需要的「前端能力」标识
 *
 * 前端在 /api/chat 请求体里传 `clientCapabilities: ['automation-canvas']`，
 * 后端据此把对应工具注入 tools；没声明就完全不可见。
 */
const CLIENT_TOOL_CAPABILITIES: Record<string, string> = {
  automation_canvas_apply: 'automation-canvas',
  // 设备接入：查协议字段 / 把草稿灌进接入向导 / 读当前表单 / 增量填字段
  device_access_catalog: 'device-access',
  device_access_apply_draft: 'device-access',
  device_form_read: 'device-access',
  device_form_patch: 'device-access',
}

/** 是否是需要前端执行的工具（由 route.ts 拦截，不交给服务端 executor） */
export function isClientSideTool(toolName: string): boolean {
  return Object.prototype.hasOwnProperty.call(CLIENT_TOOL_CAPABILITIES, toolName)
}

/**
 * 按前端声明的能力取回前端工具定义
 *
 * @param capabilities 如 ['automation-canvas']
 */
export function getClientToolDefinitions(capabilities: string[] = []): MCPToolDefinition[] {
  const caps = new Set((capabilities || []).map(String))
  if (caps.size === 0) return []
  return CLIENT_TOOL_SERVER_IDS.flatMap(id => MCP_TOOL_REGISTRY[id] || []).filter(t =>
    caps.has(CLIENT_TOOL_CAPABILITIES[t.function.name])
  )
}

/**
 * 按名字取回前端工具定义（不受能力门控）
 *
 * 仅用于 load_tool_schema 的兜底：前端工具的 schema 已经随 tools 全量下发，
 * 模型若仍按"先 load_tool_schema"的习惯请求它，这里要能命中而**不是**报 missing，
 * 否则模型会以为自己臆造了工具名从而放弃调用。
 */
export function getClientToolDefinitionsByNames(names: string[]): MCPToolDefinition[] {
  const wanted = new Set((names || []).map(n => String(n || '').trim()).filter(Boolean))
  if (wanted.size === 0) return []
  return CLIENT_TOOL_SERVER_IDS.flatMap(id => MCP_TOOL_REGISTRY[id] || []).filter(t =>
    wanted.has(t.function.name)
  )
}

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
 * 把冗长的工具描述压成"一句话用途"（用于提示词里的工具清单）
 *
 * 规则：取首个句子 + 去掉 markdown 记号 + 截断到 50 字，
 * 只保留"这个工具是干什么的"信息量，参数细节留给 load_tool_schema。
 */
function summarizeToolDescription(description: string, maxLen = 50): string {
  const flat = (description || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!flat) return '（无说明）'
  const firstSentence = flat.split(/[。；\n]|(?<=\.)\s/)[0] || flat
  const short = firstSentence.length > maxLen ? firstSentence.slice(0, maxLen) + '…' : firstSentence
  return short.trim()
}

/**
 * 生成「工具名 + 一句话用途」清单（注入系统提示词用）
 *
 * 提示词里只放这份清单，"参数定义"由 load_tool_schema 按需加载 ——
 * 这样每次请求省掉约 10k token 的工具 schema，同时模型仍知道自己有哪些能力。
 */
export function getToolIndexEntries(
  enabledMCPConfigs: Array<{ id: string; enabled: boolean }> = []
): Array<{ name: string; summary: string }> {
  return getMCPToolDefinitions(enabledMCPConfigs)
    .filter(t => t.function.name !== TOOL_INDEX_LOADER_NAME)
    .map(t => ({
      name: t.function.name,
      summary: summarizeToolDescription(t.function.description),
    }))
}

/**
 * 按工具名取回完整定义（load_tool_schema 的底层实现）
 *
 * @returns found = 命中的完整定义（可直接并入 tools 数组）；
 *          missing = 未注册的名字（提示模型拼写错误，避免它继续对不存在的工具重试）。
 */
export function getToolDefinitionsByNames(
  names: string[],
  enabledMCPConfigs: Array<{ id: string; enabled: boolean }> = []
): { found: MCPToolDefinition[]; missing: string[] } {
  const all = getMCPToolDefinitions(enabledMCPConfigs)
  const wanted = new Set((names || []).map(n => String(n || '').trim()).filter(Boolean))
  const found = all.filter(t => wanted.has(t.function.name))
  const foundNames = new Set(found.map(t => t.function.name))
  const missing = [...wanted].filter(n => !foundNames.has(n))
  return { found, missing }
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
