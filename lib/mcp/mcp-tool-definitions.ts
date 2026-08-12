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
          }
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
          }
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
          }
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
  ]
}

/** 内置工具服务器 ID 列表（始终可用，不依赖用户 MCP 配置） */
const BUILTIN_SERVER_IDS = ['builtin-sensor-history', 'builtin-agent-tools', 'builtin-skill-loader', 'builtin-device-control', 'builtin-agent-tasks']

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
