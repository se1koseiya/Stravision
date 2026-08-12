"use client"

import React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
        <div className="mb-8">
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-white/40 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            返回登录
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">隐私政策 (Privacy Policy)</h1>
          <p className="text-white/40 text-sm">生效日期：2026年7月25日 | 版本：3.0</p>
        </div>

        <GlassCard className="p-0 overflow-hidden flex flex-col md:flex-row h-[80vh]">
          {/* 侧边导航 */}
          <div className="hidden md:flex w-64 border-r border-white/10 bg-white/5 flex-col h-full overflow-hidden">
            <div className="p-6 pb-2 shrink-0">
              <h3 className="font-bold text-primary">政策目录</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
              <nav className="space-y-2 text-sm text-white/60">
                {[
                  "1. 引言与概述",
                  "2. 定义与关键术语",
                  "3. 我们收集的信息",
                  "4. 信息收集方式",
                  "5. 信息使用目的",
                  "6. Cookie 与追踪技术",
                  "7. 信息共享与披露",
                  "8. 第三方服务与子处理者",
                  "9. 数据存储与保留",
                  "10. 数据安全措施",
                  "11. 国际数据传输",
                  "12. 您的权利",
                  "13. 未成年人保护",
                  "14. AI 与自动化决策",
                  "15. 数据泄露响应",
                  "16. 政策更新与通知",
                  "17. 法律依据",
                  "18. 联系我们"
                ].map((item, i) => (
                  <a 
                    key={i} 
                    href={`#section-${i + 1}`} 
                    className="block hover:text-white transition-colors py-1"
                  >
                    {item}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
              <div className="space-y-12 text-white/80 leading-relaxed text-sm md:text-base">

              {/* Section 1: 引言与概述 */}
              <section id="section-1">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">01.</span> 引言与概述
                </h2>
                <div className="space-y-4">
                  <p>
                    Stravision Inc.（注册地址：[公司注册地址]，以下简称"Stravision"、"我们"、"我们的"或"本公司"）深知个人信息和隐私对您的重要性。本隐私政策（以下简称"本政策"）旨在向您全面、透明地说明我们在提供 Berry Realm IoT 智能平台及相关服务（包括但不限于 Web 应用、移动应用、API 接口、AI 助手、嵌入式 SDK、MQTT 消息服务、MCP 设备控制协议，统称"本服务"）的过程中，如何收集、使用、存储、传输、共享和保护您的个人信息及设备数据。
                  </p>
                  <p>
                    本政策适用于以下使用场景：(a) 您通过我们的网站或应用注册账户并登录使用本服务；(b) 您将 IoT 设备连接到我们的平台并通过 MQTT/HTTP/CoAP 等协议上传遥测数据；(c) 您使用我们的 AI 智能助手、数据分析、自动化策略、视觉巡检等功能；(d) 您通过 API 或 SDK 集成我们的服务；(e) 您访问我们的营销网站、文档站点或参与我们的社区论坛。
                  </p>
                  <p className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                    <strong>重要提示：</strong>在使用本服务前，请您仔细阅读并充分理解本政策的全部内容。对于本政策中与您的权益存在重大关系的条款以及涉及敏感个人信息处理的条款，我们已采用加粗、下划线等方式予以显著标识。一旦您点击"同意"、"注册"按钮或实际使用本服务，即表示您已阅读、理解并同意我们按照本政策处理您的信息。如果您不同意本政策的任何内容，请立即停止使用本服务并注销您的账户。
                  </p>
                  <p>
                    本政策可能会根据法律法规的变化和业务发展需要不时更新。我们会在更新时通过适当的渠道通知您，具体方式请参见<a href="#section-16" className="text-primary hover:underline">第16条"政策更新与通知"</a>。
                  </p>
                </div>
              </section>

              {/* Section 2: 定义与关键术语 */}
              <section id="section-2">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">02.</span> 定义与关键术语
                </h2>
                <div className="space-y-3">
                  <p>为便于您理解本政策，以下关键术语定义如下：</p>
                  <ul className="list-disc pl-5 space-y-2 marker:text-white/30">
                    <li><strong>个人信息</strong>：以电子或其他方式记录的与已识别或可识别的自然人有关的各种信息，不包括匿名化处理后的信息。包括但不限于姓名、电子邮件地址、手机号码、IP 地址、设备标识符等。</li>
                    <li><strong>敏感个人信息</strong>：一旦泄露或非法使用，容易导致自然人的人格尊严受到侵害或人身、财产安全受到危害的个人信息，包括生物识别信息、宗教信仰、特定身份、医疗健康、金融账户、行踪轨迹等信息，以及不满十四周岁未成年人的个人信息。</li>
                    <li><strong>设备数据</strong>：指您拥有或控制的 IoT 设备通过本平台协议上传的遥测数据，包括但不限于传感器读数（温度、湿度、光照、土壤 pH 值、CO₂浓度等）、设备状态（在线/离线、运行模式、故障代码）、位置坐标、设备元数据（MAC 地址、固件版本、序列号、设备型号）及设备日志。</li>
                    <li><strong>匿名化</strong>：指个人信息经过处理无法识别特定自然人且不能复原的过程。</li>
                    <li><strong>去标识化</strong>：指个人信息经过处理，使其在不借助额外信息的情况下无法识别特定自然人的过程。</li>
                    <li><strong>数据控制者</strong>：指决定个人信息处理目的和方式的组织或个人。就本服务而言，Stravision 是您账户信息的数据控制者，而您（作为设备所有者）是您设备数据的数据控制者。</li>
                    <li><strong>数据处理者</strong>：指代表数据控制者处理个人信息的组织或个人。当您使用我们的平台处理您的设备数据时，Stravision 同时作为数据处理者。</li>
                    <li><strong>AI 服务</strong>：指本平台提供的基于人工智能和机器学习技术的功能，包括智能问答、数据分析、自动化策略建议、视觉巡检分析、预测性维护、自然语言交互等。</li>
                    <li><strong>Cookie</strong>：指网站存储在用户本地终端上的小型文本文件，用于记录用户偏好、维持会话状态和进行统计分析。</li>
                  </ul>
                </div>
              </section>

              {/* Section 3: 我们收集的信息 */}
              <section id="section-3">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">03.</span> 我们收集的信息
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.1 账户注册与个人资料信息</h3>
                    <p className="mb-2">当您注册和使用账户时，我们收集以下信息：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>必填信息</strong>：电子邮箱地址、用户名、登录密码（经 bcrypt/Argon2 加盐哈希后存储，我们无法解密您的原始密码）。</li>
                      <li><strong>选填信息</strong>：头像、昵称、手机号码（用于双因素认证 2FA 和账户恢复）、职业、公司/组织名称、个人简介。</li>
                      <li><strong>第三方登录信息</strong>：如果您通过 GitHub、Google、微信等第三方账号登录，我们会从该第三方获取您的公开资料信息（如昵称、头像、邮箱），具体范围取决于您在第三方平台的授权设置。</li>
                      <li><strong>账户活动信息</strong>：注册时间、最后登录时间、登录 IP 地址、登录设备信息、账户状态变更记录。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.2 IoT 设备数据</h3>
                    <p className="mb-2">当您将设备连接到本平台时，我们收集以下设备相关数据：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>遥测数据</strong>：设备传感器采集的各类环境与运行数据，包括但不限于温度、湿度、光照强度、土壤湿度、土壤 pH 值、EC 值（电导率）、CO₂浓度、风速、降雨量、设备运行电流/电压、功率消耗等。</li>
                      <li><strong>设备元数据</strong>：设备 MAC 地址、IMEI 号、序列号、固件/软件版本号、硬件型号、制造商信息、设备名称（由用户自定义）、设备分组标签。</li>
                      <li><strong>设备状态数据</strong>：在线/离线状态、CPU 使用率、内存使用率、存储空间使用率、网络信号强度（RSSI）、电池电量、上次数据上报时间戳。</li>
                      <li><strong>设备日志</strong>：设备启动/关机日志、错误日志、固件 OTA 升级记录、指令执行记录。</li>
                      <li><strong>位置数据</strong>：设备部署的地理位置（经纬度坐标），由用户手动输入或设备 GPS 模块自动上报。</li>
                      <li><strong>视频/图像数据</strong>：如果您启用了视觉巡检功能，设备摄像头拍摄的图像和视频流会通过平台传输并由 AI 模型进行分析。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.3 使用行为数据</h3>
                    <p className="mb-2">当您使用本服务时，我们自动收集以下使用行为数据：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>访问日志</strong>：IP 地址、访问时间戳、请求 URL、HTTP 方法、HTTP 状态码、响应时间、User-Agent 字符串、Referer 头部。</li>
                      <li><strong>操作日志</strong>：页面浏览记录、按钮点击事件、功能使用频率、功能使用时长、控制指令发送记录、自动化策略创建/修改记录。</li>
                      <li><strong>性能数据</strong>：页面加载时间、API 响应延迟、前端错误日志、WebSocket 连接状态。</li>
                      <li><strong>设备和浏览器信息</strong>：操作系统类型和版本、浏览器类型和版本、屏幕分辨率、语言偏好、时区设置。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.4 AI 交互数据</h3>
                    <p className="mb-2">当您使用 AI 智能助手、数据分析、自动化策略生成等 AI 功能时，我们收集以下数据：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>对话内容</strong>：您与 AI 助手之间的文本对话记录，包括您输入的问题、指令以及 AI 生成的回复。</li>
                      <li><strong>上下文数据</strong>：AI 交互时的设备状态快照、当前页面上下文、选中的设备或数据范围。</li>
                      <li><strong>反馈数据</strong>：您对 AI 回复的点赞/点踩反馈、纠错信息、评分。</li>
                      <li><strong>嵌入向量数据</strong>：为提供语义搜索和知识库问答功能，我们会对您的文档和知识库内容进行向量化处理（embedding）。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.5 支付与订阅信息</h3>
                    <p className="mb-2">当您购买付费服务时，我们收集以下信息：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>订单信息</strong>：订阅方案类型、订阅周期、订单金额、订单号、购买时间。</li>
                      <li><strong>账单信息</strong>：账单地址、公司名称（如适用）、税号（如适用）。</li>
                      <li><strong>支付信息</strong>：我们<strong>不直接存储</strong>您的完整信用卡号、银行卡号或支付账户密码。支付交易由第三方支付服务商（Stripe、支付宝、微信支付等）处理，我们仅接收支付服务商返回的交易结果（成功/失败）、交易 ID 和支付方式的最后四位数字/掩码信息。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.6 客户支持与通信数据</h3>
                    <p className="mb-2">当您联系我们的客服或技术支持团队时，我们收集：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>通信记录</strong>：电子邮件往来、工单内容、在线聊天记录、电话录音（在告知并征得同意后）。</li>
                      <li><strong>问题描述</strong>：您报告的问题详情、相关截图或附件、诊断信息。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.7 社区与反馈数据</h3>
                    <p className="mb-2">如果您参与我们的社区论坛、提交功能建议或参与用户调研，我们收集：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>您在社区论坛发布的帖子、评论和回复。</li>
                      <li>您提交的功能请求、bug 报告和改进建议。</li>
                      <li>您参与问卷调查或用户访谈时提供的信息。</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 4: 信息收集方式 */}
              <section id="section-4">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">04.</span> 信息收集方式
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">4.1 直接收集</h3>
                    <p>您主动提供的信息，例如注册表单填写、设备信息录入、AI 对话输入、客户支持请求等。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">4.2 自动收集</h3>
                    <p>通过服务器日志、Cookie、Web Beacon、JavaScript 标签、WebSocket 连接等技术手段自动收集的信息，包括访问日志、设备传感器数据流、性能监控数据等。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">4.3 从第三方获取</h3>
                    <p>我们从以下渠道获取您的信息：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>第三方认证服务商（如 GitHub OAuth、Google OAuth）在您授权后提供的基本资料信息。</li>
                      <li>支付服务商提供的交易确认信息和风控评估结果。</li>
                      <li>公开可获取的数据源（如您公开发布的企业信息），用于完善我们的商业客户画像。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">4.4 设备数据上报</h3>
                    <p>您部署的 IoT 设备通过 MQTT、HTTP/HTTPS、CoAP、WebSocket 等标准物联网协议，按照您配置的频率自动向平台上报遥测数据和状态信息。设备数据上报的内容和频率由您通过设备固件配置和平台规则设置决定。</p>
                  </div>
                </div>
              </section>

              {/* Section 5: 信息使用目的 */}
              <section id="section-5">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">05.</span> 信息使用目的
                </h2>
                <div className="space-y-4">
                  <p>我们收集的信息严格用于以下目的，且仅在实现这些目的所必需的范围内使用：</p>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">5.1 核心服务提供</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-primary/50">
                      <li>创建和管理您的用户账户，验证您的身份，确保账户安全。</li>
                      <li>接收、存储、处理和可视化展示您的 IoT 设备遥测数据，提供实时数据仪表盘、历史数据查询和图表分析功能。</li>
                      <li>执行您发送的设备控制指令（如开关控制、参数调节、固件 OTA 升级），并将执行结果反馈给您。</li>
                      <li>根据您设定的阈值规则触发告警通知，通过邮件、短信、站内消息或 Webhook 等方式向您发送设备异常告警。</li>
                      <li>提供自动化策略引擎，根据您定义的规则自动执行设备联动操作。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">5.2 AI 智能服务</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-primary/50">
                      <li>利用大型语言模型 (LLM) 和机器学习模型，为您提供自然语言交互的智能问答、设备状态解读和农业种植建议。</li>
                      <li>基于您的设备数据和历史趋势，提供数据洞察、异常检测和预测性分析。</li>
                      <li>对您上传的文档和知识库内容进行向量化处理，实现语义搜索和增强检索生成 (RAG) 功能。</li>
                      <li>对视觉巡检图像进行 VLM（视觉语言模型）分析，识别作物病害、虫害、营养缺乏等问题。</li>
                      <li>利用您对 AI 回复的反馈数据持续优化模型表现，提升服务质量。</li>
                    </ul>
                    <p className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60">
                      <strong>关于 AI 训练：</strong>我们<strong>不会</strong>使用您的对话数据或设备数据来训练基础 AI 模型（如 GPT、Claude 等）。我们仅使用 AI 服务提供商的 API 接口进行推理调用，且已与 AI 服务提供商签署数据处理协议 (DPA)，明确禁止其使用您的数据训练模型。我们仅使用去标识化的反馈数据来微调我们自己的路由和提示词策略。
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">5.3 产品改进与研发</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-primary/50">
                      <li>分析聚合后的匿名化使用数据，了解用户行为模式、功能使用偏好和平台性能瓶颈，指导产品迭代方向。</li>
                      <li>进行 A/B 测试以评估新功能的效果和用户接受度。</li>
                      <li>监控平台稳定性、识别和修复 bug，优化系统性能。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">5.4 安全与合规</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-primary/50">
                      <li>监测和防范安全威胁，包括但不限于未授权访问、DDoS 攻击、账户盗用、恶意软件注入等。</li>
                      <li>进行身份验证和访问控制，实施基于角色的权限管理 (RBAC)。</li>
                      <li>遵守适用的法律法规要求，响应执法机关的合法请求。</li>
                      <li>进行内部审计和合规检查。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">5.5 通信与营销</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-primary/50">
                      <li>向您发送与服务相关的必要通知，如账户变更、服务更新、安全警报、账单提醒等。</li>
                      <li>在您明确同意的情况下，向您发送产品更新、促销活动、行业洞察等营销信息。您可以随时通过邮件底部的退订链接或账户设置页面取消订阅。</li>
                      <li>邀请您参与用户调研、Beta 测试和用户社区活动。</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 6: Cookie 与追踪技术 */}
              <section id="section-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">06.</span> Cookie 与追踪技术
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">6.1 我们使用的 Cookie 类型</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-2 px-3 text-white/90">Cookie 类型</th>
                            <th className="text-left py-2 px-3 text-white/90">用途</th>
                            <th className="text-left py-2 px-3 text-white/90">生命周期</th>
                            <th className="text-left py-2 px-3 text-white/90">必要性</th>
                          </tr>
                        </thead>
                        <tbody className="text-white/60">
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-3">必要 Cookie (Essential)</td>
                            <td className="py-2 px-3">维持登录会话 (Session Token)、CSRF 防护、负载均衡</td>
                            <td className="py-2 px-3">会话/短期</td>
                            <td className="py-2 px-3">必需</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-3">偏好 Cookie (Preferences)</td>
                            <td className="py-2 px-3">记住语言偏好、主题设置（深色/浅色模式）、仪表盘布局偏好</td>
                            <td className="py-2 px-3">持久/长期</td>
                            <td className="py-2 px-3">可选</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-3">分析 Cookie (Analytics)</td>
                            <td className="py-2 px-3">页面访问统计、用户行为分析、性能监控</td>
                            <td className="py-2 px-3">持久/中期</td>
                            <td className="py-2 px-3">可选</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3">功能 Cookie (Functional)</td>
                            <td className="py-2 px-3">记住已关闭的引导提示、新手教程完成状态、AI 对话历史偏好</td>
                            <td className="py-2 px-3">持久/长期</td>
                            <td className="py-2 px-3">可选</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">6.2 其他追踪技术</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>LocalStorage / SessionStorage</strong>：用于存储用户偏好设置、UI 状态、草稿数据等非敏感信息，这些数据不会自动发送到服务器。</li>
                      <li><strong>Web Beacon（像素标签）</strong>：嵌入在邮件中的微小图片，用于追踪邮件的打开率和链接点击率，帮助我们评估邮件沟通效果。</li>
                      <li><strong>IndexedDB</strong>：用于在浏览器端缓存大量数据，如离线数据缓存和仪表盘快照，提升页面加载速度。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">6.3 您的 Cookie 选择</h3>
                    <p>
                      您可以通过浏览器设置来控制和管理 Cookie。大多数浏览器允许您查看、删除和阻止 Cookie。您也可以在我们的平台上通过 Cookie 偏好设置面板选择接受或拒绝非必要 Cookie。请注意，禁用必要 Cookie 可能导致您无法登录或使用平台的核心功能。
                    </p>
                    <p className="mt-2">
                      我们<strong>不会</strong>使用 Cookie 或类似技术进行跨网站的广告追踪 (Cross-site Tracking) 或行为定向广告 (Behavioral Targeting Advertising)。我们的平台不包含第三方广告网络。
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 7: 信息共享与披露 */}
              <section id="section-7">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">07.</span> 信息共享与披露
                </h2>
                <div className="space-y-4">
                  <p className="font-medium text-white/90">我们郑重承诺：<strong>我们不会出售您的个人信息。</strong>我们不会将您的个人信息用于与您使用服务无关的商业目的。</p>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">7.1 与服务提供商共享</h3>
                    <p>我们与经过严格筛选的第三方服务提供商共享必要的信息，以支持我们提供和改善服务。这些服务提供商包括：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>云基础设施提供商</strong>（如 AWS、阿里云、腾讯云）：用于数据存储、计算资源、CDN 加速。</li>
                      <li><strong>AI 模型服务商</strong>（如 OpenAI、Anthropic、智谱 AI）：用于提供 AI 智能助手功能。我们仅向 AI 服务商发送必要的查询上下文，不会共享您的完整账户信息或设备数据。</li>
                      <li><strong>通信服务商</strong>（如 Resend、阿里云短信）：用于发送邮件通知和短信告警。</li>
                      <li><strong>支付处理商</strong>（如 Stripe、支付宝、微信支付）：用于处理支付交易。</li>
                      <li><strong>分析服务商</strong>（如自建或开源分析平台）：用于匿名化的使用行为分析。</li>
                      <li><strong>客户支持平台</strong>：用于管理客户服务工单。</li>
                    </ul>
                    <p className="mt-2 text-sm text-white/60">
                      所有服务提供商均受合同约束，必须遵守不低于本政策标准的数据保护要求。我们与其签署了数据处理协议 (DPA)，明确规定了数据使用范围、安全标准和保密义务。具体服务提供商列表请参见<a href="#section-8" className="text-primary hover:underline">第8条"第三方服务与子处理者"</a>。
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">7.2 法律要求与权益保护</h3>
                    <p>在以下情况下，我们可能披露您的信息：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>为遵守适用的法律法规、法院命令或政府机关的强制性要求。</li>
                      <li>为检测、预防或处理欺诈、安全或技术问题，保护 Stravision、用户或公众的权利、财产或安全。</li>
                      <li>为执行我们的服务条款或其它协议，调查可能的违规行为。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">7.3 业务转让</h3>
                    <p>
                      如果 Stravision 涉及合并、收购、重组、资产出售或破产清算，您的信息可能作为业务资产的一部分被转让。我们将通过邮件/平台公告通知您，并确保接收方继续遵守本政策的承诺。
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">7.4 经您授权的共享</h3>
                    <p>
                      在获得您的明确授权或指示的情况下，我们可能将您的信息共享给您指定的第三方。例如，您通过 API Key 授权第三方应用访问您的设备数据，或将您的数据导出到第三方平台。
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">7.5 聚合与匿名化信息的共享</h3>
                    <p>
                      我们可能将去标识化或匿名化处理后的聚合数据（无法识别到具体个人或设备）用于行业分析报告、学术研究、产品宣传或商业合作。此类数据的使用不受本政策的限制。
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 8: 第三方服务与子处理者 */}
              <section id="section-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">08.</span> 第三方服务与子处理者
                </h2>
                <div className="space-y-4">
                  <p>为确保服务的高可用性和全球化覆盖，我们使用了以下主要第三方服务（子处理者）。所有子处理者均经过安全评估，并签署了数据处理协议：</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-white/90">服务商</th>
                          <th className="text-left py-2 px-3 text-white/90">服务类型</th>
                          <th className="text-left py-2 px-3 text-white/90">数据处理地点</th>
                          <th className="text-left py-2 px-3 text-white/90">涉及的数据类型</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/60">
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-3">AWS / 阿里云</td>
                          <td className="py-2 px-3">云基础设施 (计算、存储、CDN)</td>
                          <td className="py-2 px-3">中国/新加坡/美国</td>
                          <td className="py-2 px-3">全部平台数据</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-3">OpenAI / Anthropic / 智谱 AI</td>
                          <td className="py-2 px-3">AI 模型推理</td>
                          <td className="py-2 px-3">美国/中国</td>
                          <td className="py-2 px-3">AI 对话内容和设备上下文</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-3">Stripe / 支付宝 / 微信支付</td>
                          <td className="py-2 px-3">支付处理</td>
                          <td className="py-2 px-3">美国/中国</td>
                          <td className="py-2 px-3">支付交易信息</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-3">Resend / 阿里云短信</td>
                          <td className="py-2 px-3">邮件和短信通知</td>
                          <td className="py-2 px-3">美国/中国</td>
                          <td className="py-2 px-3">邮箱地址、手机号、通知内容</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2 px-3">GitHub / Google OAuth</td>
                          <td className="py-2 px-3">第三方登录认证</td>
                          <td className="py-2 px-3">美国</td>
                          <td className="py-2 px-3">公开资料信息</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">自建分析平台</td>
                          <td className="py-2 px-3">使用分析</td>
                          <td className="py-2 px-3">与数据存储区域一致</td>
                          <td className="py-2 px-3">匿名化使用数据</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-white/60">
                    我们保留更换或增加子处理者的权利。如有重大变更，我们将更新本政策并通过适当方式通知您。如果您对子处理者变更持有异议，您有权停止使用本服务并注销账户。
                  </p>
                </div>
              </section>

              {/* Section 9: 数据存储与保留 */}
              <section id="section-9">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">09.</span> 数据存储与保留
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">9.1 数据存储地点</h3>
                    <p>
                      您的数据默认存储在您注册时所属区域的数据中心。我们提供以下数据中心区域供选择：中国内地（阿里云）、亚太（新加坡 AWS）、北美（美国 AWS）。我们严格遵守各区域的数据本地化法律要求，包括但不限于中国的《网络安全法》《数据安全法》《个人信息保护法》。
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">9.2 数据加密</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>传输加密</strong>：所有数据传输均使用 TLS 1.3 协议加密。MQTT 设备连接使用 TLS + 客户端证书双向认证。</li>
                      <li><strong>存储加密</strong>：所有持久化数据使用 AES-256-GCM 算法进行静态加密。数据库启用透明数据加密 (TDE)。</li>
                      <li><strong>密钥管理</strong>：加密密钥由云服务商的密钥管理服务 (KMS) 管理，定期轮换。</li>
                      <li><strong>密码存储</strong>：用户密码使用 bcrypt/Argon2id 进行加盐哈希后存储，不存储明文密码。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">9.3 数据保留期限</h3>
                    <p>我们根据以下原则确定数据保留期限：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>账户信息</strong>：在您的账户存续期间保留。账户注销后，我们将在 30 天内完成数据删除或匿名化处理，法律另有要求的除外。</li>
                      <li><strong>设备遥测数据</strong>：根据您的订阅方案，保留 1 个月至 5 年不等。您可以在平台设置中配置数据保留期限。超过保留期限的历史数据将自动删除。</li>
                      <li><strong>AI 对话记录</strong>：默认保留 90 天，用于支持对话上下文连续性。您可以在设置中随时删除特定对话或全部对话历史。</li>
                      <li><strong>系统日志</strong>：服务器访问日志和操作日志保留 90 天至 1 年，用于安全审计和故障排查。</li>
                      <li><strong>支付记录</strong>：根据税务和财务法规要求，保留至少 5 年。</li>
                      <li><strong>备份数据</strong>：数据库备份保留 30 天，采用滚动覆盖策略。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">9.4 数据删除</h3>
                    <p>当数据达到保留期限或您主动要求删除时，我们将：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>从生产数据库中永久删除数据。</li>
                      <li>确保备份数据在备份周期内自然过期后一并清除。</li>
                      <li>对于需要物理销毁的存储介质，采用 NIST SP 800-88 标准进行安全擦除或物理销毁。</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 10: 数据安全措施 */}
              <section id="section-10">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">10.</span> 数据安全措施
                </h2>
                <div className="space-y-4">
                  <p>我们采用多层次、纵深防御的安全体系来保护您的数据安全：</p>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">10.1 组织安全</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>设立专职的数据保护官 (DPO) 和信息安全团队。</li>
                      <li>所有员工签署保密协议 (NDA)，并接受年度信息安全培训。</li>
                      <li>实施基于最小权限原则 (Principle of Least Privilege) 的访问控制策略。</li>
                      <li>对生产环境数据访问实施审批流程和操作审计。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">10.2 技术安全</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>网络防护</strong>：部署 Web 应用防火墙 (WAF)、DDoS 防护、入侵检测与防御系统 (IDS/IPS)。</li>
                      <li><strong>身份认证</strong>：支持双因素认证 (2FA/TOTP)、API Key + HMAC 签名认证、基于角色的访问控制 (RBAC)。</li>
                      <li><strong>漏洞管理</strong>：定期进行渗透测试、漏洞扫描和代码安全审计。对发现的漏洞按 CVSS 评分优先级进行修复。</li>
                      <li><strong>安全开发</strong>：遵循 OWASP Top 10 安全开发规范，代码审查中包含安全检查点。</li>
                      <li><strong>监控告警</strong>：7×24 小时安全监控，异常行为实时告警，自动化响应机制。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">10.3 物理安全</h3>
                    <p>
                      我们的服务器托管在通过 ISO 27001、SOC 2 Type II 认证的数据中心，配备 24 小时安保、生物识别门禁、视频监控、冗余电力供应和环境控制系统。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">10.4 用户安全责任</h3>
                    <p>
                      尽管我们采取了上述安全措施，但没有任何系统是绝对安全的。您应妥善保管您的账户密码、API Key 和 Token，不要在不可信的网络环境中使用本服务，不与他人共享账户凭证。如果您发现任何安全漏洞或账户异常，请立即通过<a href="#section-18" className="text-primary hover:underline">第18条</a>中的联系方式通知我们。
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 11: 国际数据传输 */}
              <section id="section-11">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">11.</span> 国际数据传输
                </h2>
                <div className="space-y-4">
                  <p>
                    由于我们使用全球化的云基础设施和第三方服务，您的信息可能会被传输到您所在国家/地区以外的服务器进行处理。在进行此类跨境数据传输时，我们将确保：
                  </p>
                  <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                    <li>数据传输符合适用的数据保护法律，包括但不限于 GDPR（欧盟通用数据保护条例）、PIPL（中国个人信息保护法）、CCPA/CPRA（加州消费者隐私法）。</li>
                    <li>对于从欧盟/欧洲经济区传出的数据，我们依据欧盟标准合同条款 (SCC 2021) 或充分性认定 (Adequacy Decision) 提供充分保护。</li>
                    <li>对于从中国境内传出的数据，我们遵循《个人信息保护法》和《数据出境安全评估办法》的规定，在必要时通过安全评估、标准合同或认证。</li>
                    <li>所有子处理者均签署了数据处理协议，确保数据接收方提供同等水平的保护。</li>
                  </ul>
                  <p className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60">
                    如果您选择的数据中心区域与您所在地区不同，您在注册过程中将被明确告知数据将被存储在哪个区域，并需要主动确认同意跨境传输。
                  </p>
                </div>
              </section>

              {/* Section 12: 您的权利 */}
              <section id="section-12">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">12.</span> 您的权利
                </h2>
                <div className="space-y-4">
                  <p>
                    根据适用的数据保护法律（包括 GDPR、PIPL、CCPA/CPRA），您拥有以下权利。我们将在收到您的请求后 30 天内予以响应，复杂情况可延长至 60 天但会提前通知您：
                  </p>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.1 访问权 (Right of Access)</h3>
                    <p>您有权查询我们是否处理您的个人信息，并获取我们所持有的您的个人信息副本。您可以通过"个人设置"页面下载您的数据导出包。</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.2 更正权 (Right to Rectification)</h3>
                    <p>您有权更正不准确或不完整的个人信息。您可以在"个人设置"页面直接修改大部分个人信息。</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.3 删除权 / 被遗忘权 (Right to Erasure)</h3>
                    <p>在以下情况下，您有权要求我们删除您的个人信息：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>个人信息对于实现收集目的已不再必要。</li>
                      <li>您撤回同意，且没有其他法律依据支持我们继续处理。</li>
                      <li>您反对处理，且没有更重要的合法理由支持我们继续处理。</li>
                      <li>个人信息被非法处理。</li>
                      <li>为遵守法律义务需要删除。</li>
                    </ul>
                    <p className="mt-2 text-sm text-white/60">请注意，某些情况下我们可能无法满足删除请求，例如为遵守法律义务、建立/行使/辩护法律主张所必需。</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.4 限制处理权 (Right to Restriction of Processing)</h3>
                    <p>在以下情况下，您有权要求我们限制对您个人信息的处理：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>您对信息的准确性提出异议（限制期至我们核实完毕）。</li>
                      <li>处理是非法的，但您不希望删除数据。</li>
                      <li>我们不再需要该信息，但您需要它用于法律主张。</li>
                      <li>您反对处理，我们正在核实是否有更重要的合法理由。</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.5 数据携带权 (Right to Data Portability)</h3>
                    <p>您有权以结构化、通用、机器可读的格式（如 JSON、CSV）接收您主动提供给我们的个人信息，并有权将这些数据转移给其他数据控制者。</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.6 反对权 (Right to Object)</h3>
                    <p>您有权随时反对我们对您个人信息的特定处理，包括基于我们合法利益的处理和直接营销。如果您反对直接营销，我们将立即停止为此目的处理您的信息。</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.7 撤回同意权 (Right to Withdraw Consent)</h3>
                    <p>如果处理是基于您的同意，您有权随时撤回同意。撤回同意不影响撤回前基于同意进行的处理的合法性。</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.8 自动化决策相关权利</h3>
                    <p>您有权不受仅基于自动化处理（包括用户画像）的决策的约束，如果该决策对您产生法律效力或类似重大影响。我们的 AI 功能仅提供建议性内容，最终决策由您做出。</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.9 申诉权</h3>
                    <p>如果您对我们的数据处理方式不满意，您有权向您所在地区的监管机构提出投诉。主要监管机构包括：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>中国：国家互联网信息办公室 (CAC) 及各地方网信部门</li>
                      <li>欧盟/欧洲经济区：您所在成员国的数据保护机构 (DPA)</li>
                      <li>美国加州：加州隐私保护局 (CPPA)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <h3 className="font-bold text-white mb-2">如何行使您的权利</h3>
                    <p className="text-sm">
                      您可以通过以下方式行使上述权利：(a) 登录账户后在"个人设置 → 隐私与数据"页面自助操作；(b) 发送邮件至 <a href="mailto:privacy@stravision.com" className="text-primary hover:underline">privacy@stravision.com</a>，我们将在收到请求后验证您的身份并在规定时限内处理。为保护您的隐私，我们可能会要求您提供身份验证信息。
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 13: 未成年人保护 */}
              <section id="section-13">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">13.</span> 未成年人保护
                </h2>
                <div className="space-y-4">
                  <p>
                    本服务主要面向企业和成年个人用户。我们高度重视未成年人的个人信息保护：
                  </p>
                  <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                    <li>我们<strong>不会有意收集</strong>未满 14 周岁（或当地法律规定的儿童年龄）的未成年人的个人信息。</li>
                    <li>如果您是未满 18 周岁的未成年人，您需要在父母或监护人的同意和指导下使用本服务。</li>
                    <li>如果您是父母或监护人，并发现您的孩子未经您同意向我们提供了个人信息，请立即联系我们。我们将在核实后尽快删除相关数据。</li>
                    <li>如果我们发现我们在不知情的情况下收集了未成年人的个人信息，我们将采取合理措施尽快从我们的系统中删除。</li>
                  </ul>
                  <p className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60">
                    根据中国《未成年人保护法》和《儿童个人信息网络保护规定》，处理不满十四周岁未成年人个人信息的，应当征得未成年人父母或其他监护人的同意，并制定专门的儿童个人信息保护规则。
                  </p>
                </div>
              </section>

              {/* Section 14: AI 与自动化决策 */}
              <section id="section-14">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">14.</span> AI 与自动化决策
                </h2>
                <div className="space-y-4">
                  <p>
                    本平台集成了多项 AI 功能，包括大型语言模型 (LLM) 驱动的智能助手、机器学习模型驱动的数据分析和预测、视觉语言模型 (VLM) 驱动的图像识别等。以下是我们对 AI 功能的数据处理说明：
                  </p>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">14.1 AI 数据处理原则</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>最小化原则</strong>：我们仅发送实现当前 AI 功能所必需的最少数据给 AI 模型服务商。</li>
                      <li><strong>禁止训练</strong>：我们与所有 AI 服务商签署了协议，明确禁止其使用您的数据来训练或改进其基础模型。</li>
                      <li><strong>零保留</strong>：AI 服务商在处理完您的请求后，不会保留您的数据用于其他目的（部分服务商可能保留 30 天用于滥用监控，具体见其隐私政策）。</li>
                      <li><strong>透明度</strong>：平台中涉及 AI 生成的内容均会标注为"AI 生成"或"AI 建议"，以便您识别和判断。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">14.2 自动化决策声明</h3>
                    <p>
                      我们的 AI 功能仅提供<strong>辅助性建议</strong>，不会做出对您产生法律效力或类似重大影响的自动化决策。例如：
                    </p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>AI 提供的草莓种植建议仅供参考，您应结合实际情况和专业判断做出最终决策。</li>
                      <li>自动化策略引擎执行的是您预先定义的规则，而非 AI 自主决策。</li>
                      <li>设备异常告警的触发条件由您设定，AI 仅辅助分析异常模式。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">14.3 AI 输出质量</h3>
                    <p>
                      AI 生成的内容可能包含错误、不准确或过时的信息。我们不断优化 AI 服务质量，但无法保证 AI 输出始终准确、完整或适用于您的特定场景。您应自行评估 AI 建议的适用性。
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 15: 数据泄露响应 */}
              <section id="section-15">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">15.</span> 数据泄露响应
                </h2>
                <div className="space-y-4">
                  <p>
                    我们建立了完善的数据泄露应急响应机制，以最大程度降低数据泄露事件对您的影响：
                  </p>
                  <ul className="list-disc pl-5 space-y-2 marker:text-white/30">
                    <li><strong>检测与评估</strong>：通过安全监控系统、入侵检测和异常行为分析，及时发现潜在的数据泄露事件。事件发生后，安全团队将在 1 小时内启动初步评估，确定事件范围和影响程度。</li>
                    <li><strong>遏制与恢复</strong>：立即采取隔离受影响系统、修补漏洞、重置凭证等措施遏制事件扩散，并尽快恢复正常服务。</li>
                    <li><strong>通知义务</strong>：
                      <ul className="list-circle pl-5 space-y-1 mt-1 marker:text-white/20">
                        <li>如果数据泄露可能对您的权利和自由造成高风险，我们将在发现后 72 小时内通知您和适用的监管机构。</li>
                        <li>通知内容将包括：事件性质、可能受影响的个人信息类别和数量、已采取和计划采取的应对措施、您可以采取的减轻风险的措施、我们的联系方式。</li>
                      </ul>
                    </li>
                    <li><strong>事后改进</strong>：每起安全事件后，我们将进行根因分析 (Root Cause Analysis)，制定并实施改进措施，防止类似事件再次发生。</li>
                    <li><strong>记录保存</strong>：我们将保留所有数据泄露事件的调查记录和改进措施文档，供监管机构审查。</li>
                  </ul>
                </div>
              </section>

              {/* Section 16: 政策更新与通知 */}
              <section id="section-16">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">16.</span> 政策更新与通知
                </h2>
                <div className="space-y-4">
                  <p>
                    我们保留根据业务发展、技术变更和法律法规变化不时更新本政策的权利。更新流程如下：
                  </p>
                  <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                    <li><strong>常规更新</strong>（如文字修正、联系方式变更）：在更新后即时生效，我们将更新本页面顶部的"生效日期"和"版本号"。</li>
                    <li><strong>重大变更</strong>（如收集信息的目的、范围或方式变化、数据共享对象变化、用户权利重大变化）：我们将在变更生效前至少 30 天通过以下方式通知您：
                      <ul className="list-circle pl-5 space-y-1 mt-1 marker:text-white/20">
                        <li>向您注册的电子邮箱发送通知邮件。</li>
                        <li>在平台内显示弹窗公告。</li>
                        <li>在登录页面显示变更摘要。</li>
                      </ul>
                    </li>
                    <li><strong>您的选择</strong>：如果您不同意更新后的政策，您可以在变更生效前停止使用本服务并注销账户。在变更生效后继续使用本服务，即表示您接受更新后的政策。</li>
                  </ul>
                  <p className="text-sm text-white/60">
                    我们建议您定期查阅本页面，以了解最新的隐私实践。本政策的历史版本可通过联系 privacy@stravision.com 获取。
                  </p>
                </div>
              </section>

              {/* Section 17: 法律依据 */}
              <section id="section-17">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">17.</span> 数据处理的法律依据
                </h2>
                <div className="space-y-4">
                  <p>我们依据以下法律基础处理您的个人信息：</p>
                  <ul className="list-disc pl-5 space-y-2 marker:text-white/30">
                    <li><strong>履行合同必要性</strong>：为提供本服务（包括账户管理、设备数据接收和处理、AI 功能服务）而处理您的信息，这是履行与您之间的服务协议所必需的。</li>
                    <li><strong>您的同意</strong>：对于非核心功能（如营销邮件、Cookie 偏好收集）和敏感个人信息的处理，我们基于您的明确同意进行。</li>
                    <li><strong>合法利益</strong>：为改进产品、保障平台安全、防范欺诈、进行匿名化统计分析等目的，我们基于合法利益处理信息，但前提是不损害您的基本权利和自由。</li>
                    <li><strong>法律义务</strong>：为遵守法律法规（如税务、反洗钱、网络安全报告义务）而处理您的信息。</li>
                  </ul>
                  <p className="text-sm text-white/60">
                    对于中国用户，我们严格遵守《个人信息保护法》(PIPL) 的规定，在收集敏感个人信息前取得单独同意，并在处理个人信息时遵循"告知-同意"原则。
                  </p>
                </div>
              </section>

              {/* Section 18: 联系我们 */}
              <section id="section-18">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">18.</span> 联系我们
                </h2>
                <div className="space-y-4">
                  <p>
                    如果您对本隐私政策有任何疑问、投诉或建议，或者希望行使您的数据权利，请通过以下方式联系我们的数据保护团队：
                  </p>
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                    <p className="font-bold text-white">Stravision 数据保护团队 (Data Protection Team)</p>
                    <p><strong>数据保护官 (DPO)：</strong> [DPO 姓名]</p>
                    <p><strong>电子邮箱：</strong> <a href="mailto:privacy@stravision.com" className="text-primary hover:underline">privacy@stravision.com</a></p>
                    <p><strong>安全漏洞报告：</strong> <a href="mailto:security@stravision.com" className="text-primary hover:underline">security@stravision.com</a></p>
                    <p><strong>公司地址：</strong> [公司具体注册地址]</p>
                    <p><strong>联系电话：</strong> [公司联系电话]</p>
                    <p><strong>响应时间：</strong>我们将在收到您的请求后 5 个工作日内确认收到，并在 30 个自然日内完成处理。如需延长处理时间，我们将提前告知您原因和预计完成时间。</p>
                  </div>
                  <p className="text-sm text-white/60">
                    如果您对我们的回复不满意，您有权向您所在地区的个人信息保护监管机构投诉。对于中国用户，您可向国家互联网信息办公室 (www.cac.gov.cn) 或地方网信部门投诉。
                  </p>
                </div>
              </section>

              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}