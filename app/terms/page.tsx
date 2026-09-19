"use client"

import React from "react"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { IconArrowLeft } from "@/components/icon";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
        <div className="mb-8">
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-white/40 hover:text-white transition-colors mb-6 group"
          >
            <IconArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            返回登录
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">服务条款 (Terms of Service)</h1>
          <p className="text-white/40 text-sm">生效日期：2026年7月25日 | 版本：3.0</p>
        </div>

        <GlassCard className="p-0 overflow-hidden flex flex-col md:flex-row h-[80vh]">
          {/* 侧边导航 - 仅在桌面端显示 */}
          <div className="hidden md:flex w-64 border-r border-white/10 bg-white/5 flex-col h-full overflow-hidden">
            <div className="p-6 pb-2 shrink-0">
              <h3 className="font-bold text-primary">条款目录</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
              <nav className="space-y-2 text-sm text-white/60">
                {[
                  "1. 接受条款",
                  "2. 定义与关键术语",
                  "3. 账户注册与管理",
                  "4. 服务描述与范围",
                  "5. 服务使用规范",
                  "6. 设备连接与数据",
                  "7. API 使用条款",
                  "8. AI 服务条款",
                  "9. 知识产权",
                  "10. 付费服务与订阅",
                  "11. 退款政策",
                  "12. 服务等级协议 (SLA)",
                  "13. 免责声明",
                  "14. 责任限制",
                  "15. 赔偿条款",
                  "16. 保密条款",
                  "17. 协议修改与终止",
                  "18. 法律管辖与争议解决",
                  "19. 不可抗力",
                  "20. 其他条款"
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

              {/* Section 1: 接受条款 */}
              <section id="section-1">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">01.</span> 接受条款
                </h2>
                <div className="space-y-4">
                  <p>
                    欢迎使用 Berry Realm IoT 智能平台（以下简称"本平台"或"Berry Realm"）。本服务条款协议（以下简称"本协议"）是您（个人或实体，以下简称"用户"、"您"或"您的"）与 Stravision Inc.（注册地址：[公司注册地址]，以下简称"Stravision"、"我们"、"我们的"或"本公司"）之间关于您访问和使用本平台及其相关服务（包括但不限于 Web 应用、移动应用、API 接口、AI 智能助手、嵌入式 SDK、MQTT 消息服务、MCP 设备控制协议、文档站点、社区论坛，统称"本服务"）的具有法律约束力的合同。
                  </p>
                  <p>
                    本协议由<strong>主协议条款</strong>、<strong>隐私政策</strong>、<strong>可接受使用政策 (AUP)</strong>、<strong>数据处理协议 (DPA)</strong>（如适用）以及<strong>服务等级协议 (SLA)</strong>（仅适用于付费方案）共同构成，所有文件均为本协议不可分割的组成部分。
                  </p>
                  <p className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                    <strong>重要提示 — 请仔细阅读：</strong>本协议包含影响您法律权利和义务的条款，包括责任限制、免责声明、争议解决条款和集体诉讼豁免。一旦您点击"注册"、"登录"、"同意并继续"按钮，或通过任何方式访问或使用本服务的任何部分，即表示您已阅读、理解并同意接受本协议所有条款的约束。如果您代表某个实体（如公司、组织）使用本服务，您声明并保证您已获得该实体的充分授权，有权代表该实体接受本协议。如果您不同意本协议的任何条款，请<strong>立即停止</strong>注册流程，不要使用本服务。
                  </p>
                  <p>
                    您确认您已年满 18 周岁（或您所在司法管辖区规定的法定成年年龄），具备完全民事行为能力，能够合法地签署具有约束力的合同。如果您未满 18 周岁，您只能在父母或法定监护人的监督和同意下使用本服务。
                  </p>
                </div>
              </section>

              {/* Section 2: 定义与关键术语 */}
              <section id="section-2">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">02.</span> 定义与关键术语
                </h2>
                <div className="space-y-3">
                  <p>除非上下文另有说明，本协议中的以下术语具有如下含义：</p>
                  <ul className="list-disc pl-5 space-y-2 marker:text-white/30">
                    <li><strong>"平台" / "Berry Realm"</strong>：指 Stravision 提供的物联网设备管理、数据采集、存储、分析、可视化和 AI 辅助决策的综合性云平台，可通过网站、移动应用和 API 访问。</li>
                    <li><strong>"服务"</strong>：指 Stravision 通过平台提供的所有功能、特性、应用、API、SDK、文档、支持服务以及任何相关的软件、数据和内容。</li>
                    <li><strong>"设备"</strong>：指通过本平台支持的通信协议（包括但不限于 MQTT、HTTP/HTTPS、CoAP、WebSocket、Modbus TCP）接入平台的任何硬件设备，包括但不限于传感器、执行器、控制器、网关、摄像头、边缘计算节点。</li>
                    <li><strong>"用户数据"</strong>：指您在使用本服务过程中产生、上传、传输、存储或处理的任何数据、信息、内容或材料，包括但不限于：(a) 设备遥测数据（传感器读数、状态信息）；(b) 设备元数据和配置信息；(c) 用户账户信息和个人资料；(d) AI 对话记录和查询内容；(e) 上传的文档、图片和知识库内容；(f) 自定义仪表盘、自动化规则和告警策略配置。</li>
                    <li><strong>"API"</strong>：指 Stravision 提供的应用程序编程接口，包括 RESTful API、MQTT API、WebSocket API 和 SDK，允许用户或第三方系统以编程方式与平台交互。</li>
                    <li><strong>"API Key" / "Token"</strong>：指用于认证和授权 API 调用的唯一凭证字符串，包括但不限于 Access Token、API Key、MQTT 客户端证书。</li>
                    <li><strong>"Stravision 内容"</strong>：指 Stravision 拥有或控制的、在本服务中提供的所有内容，包括但不限于软件代码、用户界面设计、图表、图形、商标、品牌标识、文档、底层算法和数据库结构。</li>
                    <li><strong>"免费方案" / "Free Tier"</strong>：指本服务提供的免费使用层级，具有特定的功能限制和使用配额。</li>
                    <li><strong>"付费方案" / "Paid Plan"</strong>：指用户通过支付订阅费用获得的增强服务层级，提供更多功能、更高配额和更优服务水平。</li>
                    <li><strong>"有效订阅"</strong>：指用户已支付当期费用、账户状态正常（未被暂停或终止）的付费方案订阅。</li>
                    <li><strong>"第三方服务"</strong>：指由 Stravision 之外的实体提供的、与本服务集成或被本服务依赖的产品、服务或软件。</li>
                  </ul>
                </div>
              </section>

              {/* Section 3: 账户注册与管理 */}
              <section id="section-3">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">03.</span> 账户注册与管理
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.1 注册资格</h3>
                    <p>您声明并保证：(a) 您已年满 18 周岁（或当地法律规定的成年年龄），具备完全民事行为能力；(b) 如果您代表企业或组织注册，您已获得该实体的充分授权；(c) 您未被任何适用法律或政府命令禁止使用本服务；(d) 您此前未被 Stravision 终止或禁止使用本服务。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.2 注册信息</h3>
                    <p>您同意在注册过程中提供真实、准确、完整和最新的信息（"注册信息"），并在注册信息发生变更时及时更新。您不得使用他人身份信息注册，不得创建虚假身份或冒用他人身份。因注册信息不真实、不准确或不完整导致的任何问题、损失或法律责任，由您自行承担。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.3 账户安全</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>您对维护您账户凭证（包括用户名、密码、API Key、Token、MQTT 客户端证书）的机密性承担全部责任。</li>
                      <li>您账户下的所有活动（包括通过您的 API Key 进行的任何操作）均视为您的行为，由您承担全部法律责任。</li>
                      <li>您同意不将账户凭证转让、出售或授权给任何第三方使用（为您的内部业务目的而授权您的员工或承包商使用，且您已与其签署保密协议的除外）。</li>
                      <li>您应立即通知我们任何未经授权使用您账户或任何其他违反安全的行为。我们不对因您未能遵守本条款而导致的任何损失或损害承担责任。</li>
                      <li>我们强烈建议您启用双因素认证 (2FA/TOTP) 以增强账户安全性。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.4 账户类型</h3>
                    <p>本平台支持以下账户类型：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>个人账户</strong>：以自然人身份注册，适用于个人开发者、爱好者和小规模使用场景。</li>
                      <li><strong>企业账户</strong>：以企业或组织身份注册，支持多用户协作、基于角色的权限管理 (RBAC) 和组织层级管理。企业账户的管理员对其组织下的所有用户行为负责。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">3.5 账户冻结与终止</h3>
                    <p>我们有权在以下情况下暂停或终止您的账户：(a) 您违反本协议的任何条款；(b) 您提供虚假、不准确的注册信息；(c) 您的行为可能对平台、其他用户或第三方造成法律或安全风险；(d) 应法律或监管机构的要求；(e) 您的账户长期（超过 12 个月）处于非活跃状态。在终止前，我们将通过您注册的邮箱发送通知，说明终止原因（法律禁止的除外）。</p>
                  </div>
                </div>
              </section>

              {/* Section 4: 服务描述与范围 */}
              <section id="section-4">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">04.</span> 服务描述与范围
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">4.1 核心服务</h3>
                    <p>Berry Realm 是一个综合性的 IoT 智能平台，提供以下核心服务：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>设备连接与管理</strong>：通过 MQTT、HTTP、CoAP、WebSocket 等标准物联网协议实现设备接入，支持设备注册、认证、配置管理、分组管理和固件 OTA 远程升级。</li>
                      <li><strong>数据采集与存储</strong>：实时接收和存储设备上报的遥测数据、状态信息、事件日志，支持时序数据的高效存储和查询。</li>
                      <li><strong>数据可视化</strong>：提供可定制的实时仪表盘、历史数据图表、地理信息展示 (GIS)、设备拓扑图等可视化工具。</li>
                      <li><strong>告警与通知</strong>：基于用户自定义规则触发告警，通过邮件、短信、站内消息、Webhook 等方式发送通知。</li>
                      <li><strong>自动化策略引擎</strong>：允许用户创建基于条件和事件的自动化规则，实现设备联动控制和场景自动化。</li>
                      <li><strong>AI 智能助手</strong>：集成大型语言模型 (LLM)，提供自然语言交互、数据洞察分析、种植建议、异常检测、视觉巡检等智能服务。</li>
                      <li><strong>API 与集成</strong>：提供 RESTful API、MQTT API、WebSocket API 和 SDK，支持第三方系统集成和数据导出。</li>
                      <li><strong>MCP 设备控制</strong>：通过 Model Control Protocol 实现对步进电机、丝杆滑台、摄像头云台等设备的精确控制。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">4.2 服务方案</h3>
                    <p>本服务提供多个层级的使用方案，不同方案的功能范围、资源配额、数据保留期限和服务水平有所不同。具体方案详情请参见我们的<a href="/pricing" className="text-primary hover:underline">定价页面</a>。我们保留根据市场情况和业务发展调整服务方案、功能和定价的权利，但已购买的服务期内的价格不会变更。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">4.3 服务变更</h3>
                    <p>我们持续改进和更新本服务，有权随时修改、增强、暂停或终止服务的任何功能或组成部分。对于重大变更，我们将通过邮件、平台公告或登录页面提示等方式提前通知您（紧急安全更新除外）。如果您不同意某项重大变更，您有权在变更生效前终止使用本服务并注销账户。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">4.4 Beta 功能</h3>
                    <p>我们可能提供标记为"Beta"、"实验性"、"预览版"或类似标签的功能。此类功能按"现状"提供，不提供任何服务水平承诺，可能存在缺陷或不稳定。我们不对 Beta 功能的可用性、性能或可靠性做出任何保证，并有权随时修改或终止 Beta 功能。</p>
                  </div>
                </div>
              </section>

              {/* Section 5: 服务使用规范 */}
              <section id="section-5">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">05.</span> 服务使用规范
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">5.1 可接受使用政策 (AUP)</h3>
                    <p>您同意仅将本服务用于合法目的，并遵守本可接受使用政策。您承诺<strong>不会</strong>利用本服务进行以下行为：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>违法活动</strong>：上传、传输、存储或分享任何违反适用法律法规的内容，包括但不限于侵犯知识产权的盗版内容、欺诈信息、诽谤言论、仇恨言论、暴力威胁、儿童性虐待材料 (CSAM) 或任何其他非法内容。</li>
                      <li><strong>侵犯权益</strong>：侵犯或盗用任何第三方的知识产权、隐私权、公开权或其他专有权利。</li>
                      <li><strong>安全攻击</strong>：干扰、破坏或未经授权访问本服务的基础设施，包括但不限于发起 DDoS 攻击、传播病毒/蠕虫/木马/恶意代码、进行端口扫描、尝试绕过安全机制、利用漏洞进行越权操作。</li>
                      <li><strong>未经授权的访问</strong>：尝试以任何方式访问不属于您的账户、数据或系统资源，或测试本服务的安全漏洞。</li>
                      <li><strong>逆向工程</strong>：对本服务的任何部分进行反向工程、反编译、反汇编或试图提取源代码，除非适用法律明确允许此类行为且无法通过合同排除。</li>
                      <li><strong>API 滥用</strong>：超出合理使用范围或 API 频率限制进行调用，使用自动化工具进行过量请求，或通过技术手段规避 API 调用限制。</li>
                      <li><strong>欺诈行为</strong>：利用本服务从事任何欺诈、虚假陈述、洗钱、传销、赌博、网络钓鱼或其他欺骗性活动。</li>
                      <li><strong>资源滥用</strong>：过度消耗平台资源（包括计算资源、存储空间、网络带宽），对平台稳定性或其他用户的使用体验造成实质性影响。</li>
                      <li><strong>垃圾信息</strong>：通过本服务发送未经请求的批量邮件 (SPAM)、短信或推送通知。</li>
                      <li><strong>虚假身份</strong>：在 AI 对话或平台交互中冒充他人、虚假陈述您的身份或与某个人/实体的关联关系。</li>
                      <li><strong>规避限制</strong>：创建多个账户以规避免费方案的使用限制、配额限制或账户封禁。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">5.2 违规后果</h3>
                    <p className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
                      违反本可接受使用政策可能导致以下后果（由我们根据违规行为的严重程度和影响酌情决定）：(a) 发出警告并要求整改；(b) 临时限制或暂停特定功能的使用；(c) 暂停或永久终止您的账户；(d) 删除违规内容；(e) 向相关执法机构报告；(f) 保留追究法律责任和要求赔偿的权利。对于因违反本政策而导致的账户终止，我们<strong>不退还</strong>已支付的费用。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">5.3 用户内容责任</h3>
                    <p>您对您通过本服务上传、发布、传输或存储的所有内容（包括设备数据、文档、对话记录、配置信息）承担全部责任。您声明并保证：(a) 您拥有或已获得使用和授权我们使用此类内容所需的所有权利、许可和同意；(b) 此类内容不会侵犯任何第三方的权利或违反适用法律。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">5.4 出口管制</h3>
                    <p>您在使用本服务时应遵守所有适用的出口管制和贸易制裁法律，包括但不限于美国的《出口管理条例》(EAR)、中国的《出口管制法》以及联合国、欧盟的相关制裁规定。您不得将本服务用于任何受制裁国家/地区、实体或个人，或用于任何受限制的最终用途（如核武器、化学武器、生物武器或导弹技术的开发）。</p>
                  </div>
                </div>
              </section>

              {/* Section 6: 设备连接与数据 */}
              <section id="section-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">06.</span> 设备连接与数据
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">6.1 设备合规性</h3>
                    <p>您应确保连接到本平台的所有设备：(a) 符合适用的技术标准、安全规范和无线电法规；(b) 固件已更新至最新安全版本，不含已知漏洞；(c) 使用安全的通信协议和加密方式连接平台；(d) 不会对平台基础设施或其他用户造成安全威胁。对于因设备本身故障、固件漏洞、安全配置不当或不合规操作导致的问题，平台不承担任何责任。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">6.2 数据所有权</h3>
                    <p>在您与 Stravision 之间，您保留对您上传至平台的<strong>所有用户数据</strong>的完整所有权。Stravision 不对您的用户数据主张任何所有权。本协议中的任何内容均不授予 Stravision 对您用户数据的所有权。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">6.3 数据使用许可</h3>
                    <p>为向您提供本服务，您授予 Stravision 一项全球性的、免版税的、非独占的、不可转让的（可向我们的服务提供商进行分许可的）有限许可，允许我们在本协议有效期内为以下目的使用、存储、复制、修改、传输和展示您的用户数据：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>提供、维护和优化本服务的核心功能（包括数据存储、处理、展示和传输）。</li>
                      <li>响应您的技术支持请求和故障排除。</li>
                      <li>遵守适用法律、监管要求或法律程序。</li>
                      <li>检测、预防和解决安全、欺诈或技术问题。</li>
                    </ul>
                    <p className="mt-2 text-sm text-white/60">此项许可仅在本协议有效期内有效，且严格限于上述目的。我们不会将您的用户数据用于任何其他目的，除非获得您的明确授权或适用法律要求。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">6.4 聚合数据与匿名化数据</h3>
                    <p>我们有权对用户数据进行去标识化或匿名化处理（经过处理无法识别到特定个人或设备），并利用此类聚合数据、统计数据或匿名化数据用于以下目的：(a) 行业分析、趋势研究和统计报告；(b) 产品改进和功能开发；(c) 学术研究和公开发表；(d) 商业合作和营销宣传。此类经过匿名化处理的数据不再构成您的用户数据，您可以自由使用且不受本协议中关于用户数据的限制。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">6.5 数据备份</h3>
                    <p>我们定期对平台数据进行备份以保障数据安全，但您应自行负责在平台之外保留您的用户数据的独立备份副本。我们不对因您未备份而导致的数据丢失承担责任。为明确起见，我们的备份机制是为了灾难恢复目的，不构成向您提供的备份服务。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">6.6 数据导出与迁移</h3>
                    <p>在您的账户有效期内，您可以随时通过平台提供的工具或 API 导出您的用户数据。账户终止后，我们将根据隐私政策中规定的数据保留期限，在合理时间内提供数据导出窗口，之后将按照数据删除流程处理您的数据。</p>
                  </div>
                </div>
              </section>

              {/* Section 7: API 使用条款 */}
              <section id="section-7">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">07.</span> API 使用条款
                </h2>
                <div className="space-y-4">
                  <p>本条款适用于您通过 Stravision 提供的 API（包括 REST API、MQTT API、WebSocket API 和 SDK）访问和使用本服务的行为。</p>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">7.1 API 凭证</h3>
                    <p>您需要创建 API Key 或 Token 来认证 API 调用。您对您的 API 凭证承担全部保密责任。任何使用您的 API 凭证进行的操作均视为您授权行为，由您承担全部法律责任。如发现 API 凭证泄露，您应立即在平台中重新生成或撤销该凭证。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">7.2 调用频率限制</h3>
                    <p>我们对 API 调用实施频率限制 (Rate Limiting)，具体限制取决于您的订阅方案。超过限制的 API 调用将返回 429 Too Many Requests 错误。我们建议您实施指数退避 (Exponential Backoff) 和重试机制。如果您有超出标准频率限制的合理需求，请联系我们协商定制方案。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">7.3 API 变更</h3>
                    <p>我们保留修改、更新或弃用 API 的权利。对于重大 API 变更（向后不兼容的变更），我们将通过开发者公告、邮件通知和 API 响应头中的弃用警告，提前至少 90 天通知您。对于安全相关的紧急变更，我们可能缩短通知期限。我们鼓励您关注我们的<a href="/changelog" className="text-primary hover:underline">更新日志</a>和<a href="/docs/api" className="text-primary hover:underline">API 文档</a>。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">7.4 第三方应用</h3>
                    <p>如果您通过 API 将第三方应用或服务与本平台集成，您应自行负责评估该第三方应用的安全性和合规性。Stravision 不对任何第三方应用、服务或集成所导致的任何问题承担责任。</p>
                  </div>
                </div>
              </section>

              {/* Section 8: AI 服务条款 */}
              <section id="section-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">08.</span> AI 服务条款
                </h2>
                <div className="space-y-4">
                  <p>
                    本平台集成了基于大型语言模型 (LLM)、机器学习 (ML) 和视觉语言模型 (VLM) 的 AI 功能（统称"AI 服务"）。以下是 AI 服务的特定使用条款，与本协议其他条款共同适用于您对 AI 服务的使用：
                  </p>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">8.1 AI 输出的性质</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>AI 服务生成的内容（包括文本回答、数据分析结果、图像识别结果、农业种植建议、自动化策略建议等）均由机器学习模型生成，<strong>仅供参考</strong>，不构成专业建议（包括但不限于农业科学建议、法律建议、医疗建议或财务建议）。</li>
                      <li>AI 输出可能包含错误、不准确、不完整或过时的信息。您不应仅依赖 AI 输出来做出关键决策。</li>
                      <li>您应结合您的专业知识、实际经验和独立判断来评估 AI 输出的适用性和准确性。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">8.2 AI 数据处理</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>为提供 AI 服务，我们会将您的查询内容、相关设备上下文数据发送给 AI 模型服务提供商（如 OpenAI、Anthropic、智谱 AI）进行推理处理。</li>
                      <li>我们已与 AI 服务提供商签署了数据处理协议，明确禁止其使用您的数据来训练或改进其基础模型。</li>
                      <li>AI 服务提供商在处理完成后不会保留您的数据（或仅保留有限时间用于滥用监控）。</li>
                      <li>您不得通过 AI 服务提交任何敏感个人信息（如身份证号、银行账户信息、健康信息等）。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">8.3 AI 使用限制</h3>
                    <p>在使用 AI 服务时，您还须遵守以下额外限制：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>不得使用 AI 服务生成违法、有害、欺骗性、侵权或冒犯性内容。</li>
                      <li>不得试图通过提示词注入 (Prompt Injection)、越狱 (Jailbreak) 或其他技术手段绕过 AI 服务的安全过滤机制。</li>
                      <li>不得将 AI 服务用于自动化决策，如果该决策可能对个人产生法律效力或类似的重大影响（如信贷审批、雇佣决策、医疗诊断等）。</li>
                      <li>不得使用 AI 服务创建与 Stravision 竞争的产品或服务。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">8.4 AI 服务的免责声明</h3>
                    <p className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      AI 服务按"现状"和"现有"基础提供，不附带任何明示或暗示的保证。Stravision 不对 AI 输出的准确性、完整性、可靠性、安全性、及时性、适销性或特定用途适用性做出任何保证。您使用 AI 服务并依赖其输出，由您自行承担风险。对于因依赖 AI 输出而导致的任何损失或损害，包括但不限于农业减产、设备损坏、业务中断或利润损失，Stravision 不承担任何责任。
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 9: 知识产权 */}
              <section id="section-9">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">09.</span> 知识产权
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">9.1 Stravision 的知识产权</h3>
                    <p>
                      Stravision 平台及其包含的所有内容——包括但不限于软件代码、源代码和目标代码、用户界面设计、视觉设计元素、图形、图表、商标、服务标志、品牌标识、徽标、域名、文档、技术文档、API 规范、数据库结构、算法、数据处理流程、商业方法——均为 Stravision 或其许可方的专有财产，受中国著作权法、美国著作权法、国际著作权条约、商标法、专利法及其他知识产权法律的保护。
                    </p>
                    <p className="mt-2">
                      本协议不向您转让任何 Stravision 知识产权的所有权。我们仅授予您一项有限的、非独占的、不可转让的、不可分许可的、可撤销的许可，允许您在本协议有效期内仅为使用本服务的目的访问和使用 Stravision 内容。此许可不允许您对 Stravision 内容进行复制、修改、分发、销售、出租、出借、公开展示、公开表演、创作衍生作品或进行任何其他未经明确授权的使用。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">9.2 用户的知识产权</h3>
                    <p>
                      您保留您上传至本平台的所有用户数据中您拥有的知识产权。本协议不向 Stravision 转让任何用户知识产权的所有权。您声明并保证您拥有或已获得使用和授权我们使用用户数据所需的所有权利、许可和同意。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">9.3 反馈与建议</h3>
                    <p>
                      如果您向 Stravision 提供任何关于本服务的反馈、建议、想法、改进方案或功能请求（统称"反馈"），您授予 Stravision 一项永久的、不可撤销的、全球性的、免版税的、可转让的、可分许可的许可，允许我们不受限制地使用、修改、纳入、商业化或以其他方式利用您的反馈，而无需向您支付任何报酬或承担任何义务。您确认您提供的反馈是自愿的，且不包含任何您视为机密或专有的信息。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">9.4 商标</h3>
                    <p>
                      "Stravision"、"Berry Realm"、我们的徽标以及所有相关名称、标志、产品和服务名称、设计和标语均为 Stravision 或其关联方的商标或注册商标。未经我们事先书面许可，您不得以任何方式使用这些商标。本平台上出现的所有其他商标均为其各自所有者的财产。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">9.5 侵权通知</h3>
                    <p>
                      如果您认为本平台上的任何内容侵犯了您的知识产权，请向我们的指定代理发送侵权通知，包含以下信息：(a) 被侵权作品的描述和所有权证明；(b) 侵权内容在本平台上的具体位置（URL）；(c) 您的联系信息（姓名、地址、电话、邮箱）；(d) 一份声明，说明您真诚地认为该使用未经授权，且通知中的信息准确无误。请将侵权通知发送至 <a href="mailto:legal@stravision.com" className="text-primary hover:underline">legal@stravision.com</a>。
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 10: 付费服务与订阅 */}
              <section id="section-10">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">10.</span> 付费服务与订阅
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">10.1 费用与支付</h3>
                    <p>部分服务为付费服务。您同意按照我们在定价页面公布的价格以及您购买时确认的订单金额支付相关费用。所有价格均不含适用税费（如增值税、销售税、消费税等），您需自行承担此类税费，除非适用法律另有规定。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">10.2 价格变更</h3>
                    <p>我们保留随时调整服务价格的权利。价格变更不会影响您当前有效订阅周期内的价格。价格变更将在您的下一个续费周期生效，我们将通过邮件提前至少 30 天通知您。如果您不同意价格变更，您可以在当前订阅周期结束前取消自动续费。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">10.3 自动续费</h3>
                    <p>除非您在当前订阅周期结束前取消，您的付费订阅将自动续费。续费时将使用您默认的支付方式，按当时的有效价格收费。您可以在账户设置中随时管理或取消自动续费。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">10.4 欠费处理</h3>
                    <p>如果您的支付失败或逾期未付，我们将在支付失败后 7 天内发送提醒通知。如在此宽限期内仍未完成支付，我们有权暂停您对付费功能的访问。如暂停超过 30 天仍未完成支付，我们有权终止您的付费订阅并降级为免费方案，届时您将失去付费方案的专属功能和数据。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">10.5 超额使用</h3>
                    <p>如果您超出订阅方案包含的资源配额（如设备连接数、数据存储量、API 调用次数、AI 对话次数等），您可能会被限制继续使用超出部分的功能，或按超额使用计费。超额使用费率和政策详见定价页面。</p>
                  </div>
                </div>
              </section>

              {/* Section 11: 退款政策 */}
              <section id="section-11">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">11.</span> 退款政策
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">11.1 一般原则</h3>
                    <p>除非本退款政策或适用法律另有规定，所有已支付的费用均<strong>不予退还</strong>。订阅费用是基于时间段（月度/年度）的预付费用，而非基于实际使用量的费用。您在中途取消订阅不会获得按比例退款。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">11.2 退款例外</h3>
                    <p>在以下情况下，我们可能提供退款：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>首次购买退款保证</strong>：如果您是首次购买付费方案，可在购买后 7 天内申请全额退款（前提是您尚未大量使用服务，具体标准由我们酌情判断）。</li>
                      <li><strong>服务不可用</strong>：如果本服务连续 24 小时以上不可用且由我们单方面原因造成（非不可抗力或计划内维护），您可申请按比例退款。</li>
                      <li><strong>重大服务变更</strong>：如果我们对服务进行重大负面变更，且您因此无法继续使用，您可申请剩余期限的按比例退款。</li>
                      <li><strong>法律要求</strong>：适用法律要求退款的情况。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">11.3 退款申请流程</h3>
                    <p>退款申请需发送至 <a href="mailto:billing@stravision.com" className="text-primary hover:underline">billing@stravision.com</a>，说明退款原因和订单信息。我们将在收到申请后 10 个工作日内完成审核并回复。通过审核的退款将原路退回至您的支付方式，退款到账时间取决于您的支付服务商，通常为 5-15 个工作日。</p>
                  </div>
                </div>
              </section>

              {/* Section 12: 服务等级协议 */}
              <section id="section-12">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">12.</span> 服务等级协议 (SLA)
                </h2>
                <div className="space-y-4">
                  <p>本服务等级协议仅适用于付费方案用户，不适用于免费方案用户。</p>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.1 服务可用性承诺</h3>
                    <p>我们承诺本服务核心功能的月度可用性不低于 99.9%（"SLA 目标"）。"可用性"定义为：在一个自然月内，核心服务（设备数据接收、API 响应、Web 应用访问）正常运行的时间百分比。计算公式：可用性 = (总分钟数 - 不可用分钟数) / 总分钟数 × 100%。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.2 不可用排除</h3>
                    <p>以下情况不计入不可用时间：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li>预先通知的计划内维护（我们将在维护前至少 48 小时通知，紧急维护至少 2 小时通知）。</li>
                      <li>由您的原因导致的服务不可用（如设备断网、提供错误凭证、配置错误等）。</li>
                      <li>由第三方服务（如云基础设施提供商、AI 服务商）故障导致的服务不可用，非因我们合理控制范围所致。</li>
                      <li>不可抗力事件（参见<a href="#section-19" className="text-primary hover:underline">第19条"不可抗力"</a>）。</li>
                      <li>Beta 功能或实验性功能的不可用。</li>
                      <li>免费方案用户的任何服务中断。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">12.3 SLA 补偿</h3>
                    <p>如果月度可用性低于 SLA 目标，您可在次月前 10 个工作日内申请 SLA 补偿。补偿标准如下：</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-2 px-3 text-white/90">月度可用性</th>
                            <th className="text-left py-2 px-3 text-white/90">补偿比例</th>
                          </tr>
                        </thead>
                        <tbody className="text-white/60">
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-3">99.0% - 99.9%</td>
                            <td className="py-2 px-3">当月费用的 10%</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-2 px-3">95.0% - 99.0%</td>
                            <td className="py-2 px-3">当月费用的 25%</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3">低于 95.0%</td>
                            <td className="py-2 px-3">当月费用的 50%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-sm text-white/60">SLA 补偿以服务积分 (Service Credit) 形式发放，用于抵扣未来账单，不提供现金退款。SLA 补偿是本协议项下服务不可用的唯一和排他性救济。</p>
                  </div>
                </div>
              </section>

              {/* Section 13: 免责声明 */}
              <section id="section-13">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">13.</span> 免责声明
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <p className="uppercase tracking-widest text-xs text-white/50 mb-2">重要法律声明 — 请仔细阅读</p>
                    <p>
                      在适用法律允许的最大范围内，本服务按<strong>"现状"（AS IS）和"现有"（AS AVAILABLE）</strong>基础提供，不附带任何形式的明示或暗示的保证、陈述或条件。Stravision 及其关联方、许可方和服务提供商明确否认所有保证，包括但不限于：
                    </p>
                    <ul className="list-disc pl-5 space-y-1 mt-2 marker:text-white/30">
                      <li>适销性 (Merchantability) 的暗示保证。</li>
                      <li>特定用途适用性 (Fitness for a Particular Purpose) 的暗示保证。</li>
                      <li>非侵权性 (Non-infringement) 的保证。</li>
                      <li>所有权 (Title) 的保证。</li>
                      <li>服务将不间断、及时、安全或无错误的保证。</li>
                      <li>通过本服务获取的任何信息或内容将是准确、可靠、完整或无错误的保证。</li>
                      <li>服务中的缺陷或错误将被纠正的保证。</li>
                      <li>服务不受病毒或其他有害组件影响的保证。</li>
                    </ul>
                  </div>
                  <p>
                    在不限制前述规定的前提下，我们不对以下情况做出任何保证：(a) 本服务将满足您的特定要求或期望；(b) 设备连接将始终稳定，数据上报不会出现延迟或丢失；(c) AI 服务输出的准确性、相关性或完整性；(d) 第三方服务或集成的可用性或性能；(e) 通过本服务下载或获取的任何内容、材料或数据的准确性。
                  </p>
                  <p>
                    您明确理解并同意，您使用本服务由您自行承担风险。对于因网络连接问题、设备故障、第三方服务中断、电力故障、自然灾害、政府行为或任何其他超出我们合理控制范围的原因导致的服务中断、数据丢失或任何其他损害，我们不承担责任。
                  </p>
                  <p className="text-sm text-white/60">
                    某些司法管辖区不允许排除某些保证或限制消费者法定权利，因此上述部分免责声明可能不适用于您。在这种情况下，此类保证的排除和限制将在适用法律允许的最小范围内适用。
                  </p>
                </div>
              </section>

              {/* Section 14: 责任限制 */}
              <section id="section-14">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">14.</span> 责任限制
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <p className="uppercase tracking-widest text-xs text-white/50 mb-2">重要法律声明 — 请仔细阅读</p>
                    <div>
                      <h3 className="font-bold text-white/90 mb-2">14.1 间接损害免责</h3>
                      <p>
                        在适用法律允许的最大范围内，Stravision 及其关联方、高管、董事、员工、代理人、许可方和服务提供商在任何情况下均不对任何<strong>间接、附带、特殊、惩罚性、惩戒性、后果性或衍生性损害</strong>承担责任，包括但不限于：
                      </p>
                      <ul className="list-disc pl-5 space-y-1 mt-2 marker:text-white/30">
                        <li>利润损失、收入损失或预期储蓄损失。</li>
                        <li>数据丢失、数据损坏或数据恢复成本。</li>
                        <li>业务中断或业务机会损失。</li>
                        <li>商誉损失或声誉损害。</li>
                        <li>替代产品或服务的采购成本。</li>
                        <li>农作物减产、设备损坏或其他实物资产损失。</li>
                        <li>任何因使用或无法使用本服务而产生的损害。</li>
                      </ul>
                      <p className="mt-2">上述责任限制适用于：(a) 基于合同、侵权（包括过失）、严格责任、违反法定责任或任何其他法律理论的索赔；(b) 即使 Stravision 已被告知此类损害的可能性；以及 (c) 即使本协议中规定的救济措施未能实现其根本目的。</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">14.2 赔偿总额上限</h3>
                    <p>
                      除非适用法律禁止，在任何情况下，Stravision 及其关联方因本协议或与本协议相关的所有索赔（无论基于合同、侵权或其他理论）对您承担的赔偿总额不超过以下两者中的<strong>较高者</strong>：(a) 您在导致索赔的事件发生前 12 个月内向 Stravision 实际支付的服务费用总额；或 (b) 100 美元（或等值当地货币）。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">14.3 例外情况</h3>
                    <p>上述责任限制不适用于以下情况，但仅限于适用法律禁止此类责任限制的范围：(a) Stravision 的故意不当行为或重大过失；(b) 因 Stravision 的过失导致的人身伤害或死亡；(c) 适用法律不可排除或限制的责任（如某些司法管辖区对产品责任的规定）。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">14.4 索赔时效</h3>
                    <p>您必须在导致索赔的事件发生之日起 12 个月内提起与本协议相关的任何索赔，否则该索赔将被永久禁止，无论是否有任何相反的法规或法律规定。</p>
                  </div>
                </div>
              </section>

              {/* Section 15: 赔偿条款 */}
              <section id="section-15">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">15.</span> 赔偿条款
                </h2>
                <div className="space-y-4">
                  <p>
                    您同意赔偿、辩护并使 Stravision 及其关联方、高管、董事、员工、代理人、许可方和服务提供商免受因以下原因引起或与之相关的任何及所有索赔、损害赔偿、损失、责任、成本和费用（包括合理的律师费）的损害：
                  </p>
                  <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                    <li>您违反本协议的任何条款（包括可接受使用政策）。</li>
                    <li>您的用户数据侵犯或盗用任何第三方的知识产权、隐私权或其他权利。</li>
                    <li>您使用本服务的行为违反任何适用法律或法规。</li>
                    <li>您的设备对平台或第三方造成损害或安全威胁。</li>
                    <li>您与任何第三方之间的纠纷。</li>
                    <li>您的重大过失、故意不当行为或欺诈行为。</li>
                  </ul>
                  <p className="text-sm text-white/60">
                    Stravision 保留对任何需由您赔偿的事宜进行独家辩护和控制的权利，费用由您承担。在此情况下，您同意配合 Stravision 进行辩护。未经 Stravision 事先书面同意，您不得就任何涉及 Stravision 的索赔达成和解。
                  </p>
                </div>
              </section>

              {/* Section 16: 保密条款 */}
              <section id="section-16">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">16.</span> 保密条款
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">16.1 保密信息定义</h3>
                    <p>
                      "保密信息"指一方（"披露方"）向另一方（"接收方"）披露的、在披露时被明确标识为保密或根据其性质和披露环境应被合理理解为保密的所有非公开信息。就本协议而言，Stravision 的保密信息包括但不限于：本服务的底层技术、算法、架构设计、安全机制、未公开的 API 规范、商业计划、定价策略和客户名单。您的保密信息包括但不限于：您的用户数据（不包括聚合或匿名化数据）和未公开的业务信息。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">16.2 保密义务</h3>
                    <p>接收方同意：(a) 仅在本协议目的范围内使用保密信息；(b) 采取不低于保护自身同类保密信息的合理谨慎程度（但不得低于合理标准）保护保密信息；(c) 仅向需要知晓保密信息且受不低于本协议标准的保密义务约束的员工、承包商和顾问披露保密信息。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">16.3 例外情况</h3>
                    <p>保密义务不适用于以下信息：(a) 接收方在披露前已合法知晓且无保密义务的信息；(b) 非因接收方的过错而进入公共领域的信息；(c) 接收方从有权披露的第三方处合法获取的信息；(d) 接收方独立开发且未使用保密信息的信息；(e) 法律、法规或法院命令要求披露的信息（前提是接收方在合理可行的范围内提前通知披露方）。</p>
                  </div>
                </div>
              </section>

              {/* Section 17: 协议修改与终止 */}
              <section id="section-17">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">17.</span> 协议修改与终止
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">17.1 协议修改</h3>
                    <p>我们保留随时修改本协议的权利。修改流程如下：</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>常规修改</strong>（如文字调整、格式修正）：在更新后即时生效，我们将更新本页面顶部的"生效日期"和"版本号"。</li>
                      <li><strong>重大修改</strong>（如用户权利义务的重大变化、责任限制的变更、新增强制性条款）：我们将在变更生效前至少 30 天通过邮件通知您，并在平台内发布公告。</li>
                      <li>如果您不同意修改后的协议，您可以在变更生效前停止使用本服务和注销账户。在变更生效后继续使用本服务，即表示您接受修改后的协议。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">17.2 由您终止</h3>
                    <p>您可以随时通过以下方式终止本协议：(a) 在账户设置中注销账户；(b) 发送终止请求至 <a href="mailto:support@stravision.com" className="text-primary hover:underline">support@stravision.com</a>。终止将在我们处理您的请求后生效。终止后，您将无法访问您的账户和相关数据。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">17.3 由我们终止</h3>
                    <p>我们有权在以下情况下终止本协议或暂停您的账户：(a) 您违反本协议的任何条款；(b) 法律或监管机构要求；(c) 您从事欺诈或非法活动；(d) 您长期未支付费用；(e) 我们决定停止提供本服务（将提前至少 60 天通知）。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">17.4 终止后的效力</h3>
                    <p>协议终止后：(a) 您使用本服务的权利立即终止；(b) 我们将根据隐私政策处理您的数据；(c) 以下条款在终止后继续有效：第6条（设备连接与数据，限于数据所有权和聚合数据权利）、第9条（知识产权）、第13条（免责声明）、第14条（责任限制）、第15条（赔偿条款）、第16条（保密条款）、第18条（法律管辖与争议解决）、第20条（其他条款）以及按其性质应在终止后继续有效的任何其他条款。</p>
                  </div>
                </div>
              </section>

              {/* Section 18: 法律管辖与争议解决 */}
              <section id="section-18">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">18.</span> 法律管辖与争议解决
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">18.1 适用法律</h3>
                    <p>
                      本协议受中华人民共和国法律管辖并据其解释，不考虑其法律冲突原则。《联合国国际货物销售合同公约》(CISG) 不适用于本协议。如果适用法律要求适用其他司法管辖区的法律（如某些消费者保护法律），则上述法律选择条款将在此类法律要求的范围内进行修改。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">18.2 非正式争议解决</h3>
                    <p>
                      在提起任何正式法律程序之前，您和 Stravision 同意首先尝试通过非正式协商解决任何争议。发起方应向另一方发送书面通知，描述争议的性质和寻求的救济。双方应在收到通知后 30 天内进行善意协商。协商可通过电子邮件、电话或视频会议进行。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">18.3 仲裁与诉讼</h3>
                    <p>
                      如果双方在 30 天内无法通过协商解决争议，任何一方可向 Stravision 所在地有管辖权的人民法院提起诉讼。双方同意接受该法院的属人管辖权，并放弃对此类法院的审判地或管辖权提出任何异议。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">18.4 集体诉讼豁免</h3>
                    <p>
                      在适用法律允许的最大范围内，您和 Stravision 同意，任何争议解决程序将仅在个人基础上进行，不得在集体诉讼、合并诉讼或代表诉讼中进行。您放弃提起或参与集体诉讼、集体仲裁或代表诉讼的权利。如果本集体诉讼豁免条款被认定为不可执行，则本第18.4条将被视为与本协议分离，但本协议的其余条款仍然完全有效。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">18.5 禁令救济</h3>
                    <p>
                      尽管有上述规定，任何一方均可在任何有管辖权的法院寻求禁令救济或其他衡平法救济，以保护其知识产权、保密信息或防止不可弥补的损害，无需提供保证金或证明实际损害。
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 19: 不可抗力 */}
              <section id="section-19">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">19.</span> 不可抗力
                </h2>
                <div className="space-y-4">
                  <p>
                    对于因超出我们合理控制范围的事件（"不可抗力事件"）而导致的任何延迟或未能履行本协议项下的义务，我们概不承担任何责任。不可抗力事件包括但不限于：
                  </p>
                  <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                    <li>自然灾害：地震、洪水、火灾、飓风、台风、龙卷风、海啸、火山爆发等。</li>
                    <li>公共卫生事件：流行病、大流行病 (Pandemic)、传染病爆发、政府实施的隔离或封锁措施。</li>
                    <li>战争与恐怖主义：战争（无论是否宣战）、武装冲突、恐怖袭击、内乱、暴动、叛乱。</li>
                    <li>政府行为：政府命令、法律变更、贸易禁运、制裁、进出口限制、征用或国有化。</li>
                    <li>基础设施故障：电力中断、互联网骨干网故障、电信网络中断、DNS 故障（非因我们的基础设施引起）。</li>
                    <li>第三方服务中断：云服务提供商（AWS、阿里云等）的大规模区域性服务中断。</li>
                    <li>劳工行动：罢工、停工、怠工或劳工短缺。</li>
                    <li>供应链中断：关键硬件、软件或服务的供应中断。</li>
                  </ul>
                  <p>
                    在不可抗力事件持续期间，受影响的义务将被暂停，履行期限将相应延长。如果不可抗力事件持续超过 60 天，任何一方均可终止本协议，此种终止不视为违约。
                  </p>
                </div>
              </section>

              {/* Section 20: 其他条款 */}
              <section id="section-20">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">20.</span> 其他条款
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">20.1 完整协议</h3>
                    <p>
                      本协议（包括隐私政策、可接受使用政策、SLA 和本协议引用的任何其他文件）构成您与 Stravision 之间就本服务达成的完整协议，取代双方之前就本服务达成的任何口头或书面协议、谅解或陈述。双方确认，在签订本协议时，不依赖本协议中未明确列出的任何声明、陈述、保证或谅解。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">20.2 可分割性</h3>
                    <p>
                      如果本协议的任何条款被有管辖权的法院或仲裁庭认定为无效、非法或不可执行，该条款将在必要的最小范围内被修改或删除，以使其有效、合法和可执行，且本协议的其余条款将继续完全有效。如果无效条款的删除会根本性地改变本协议的经济利益平衡，则本协议整体可能被视为无效。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">20.3 不弃权</h3>
                    <p>
                      Stravision 未能执行或延迟执行本协议的任何条款，不构成对该条款或任何其他条款的弃权。任何弃权必须以书面形式由 Stravision 授权代表签署方为有效。对任何违约行为的弃权不应被视为对任何后续或之前违约行为的弃权。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">20.4 转让</h3>
                    <p>
                      未经 Stravision 事先书面同意，您不得转让本协议或本协议项下的任何权利或义务，无论是通过法律实施、合并、资产出售或其他方式。任何未经授权的转让均无效。Stravision 可自由转让本协议或其任何部分，无需获得您的同意，包括但不限于在合并、收购、重组或资产出售的情况下。本协议对双方及其各自的继承人、受让人和法定代表人均具有约束力并符合其利益。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">20.5 独立缔约方</h3>
                    <p>
                      本协议不创建任何合资企业、合伙、代理、雇佣或特许经营关系。双方均为独立缔约方，任何一方均无权代表另一方行事或约束另一方。除本协议明确规定外，本协议不授予任何第三方任何权利或救济。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">20.6 通知</h3>
                    <p>
                      我们向您发送的通知将通过以下方式送达：(a) 发送至您注册的邮箱；(b) 在平台内发布公告；(c) 在登录页面显示。您向 Stravision 发送的通知应通过邮件发送至相关邮箱（法律事务：<a href="mailto:legal@stravision.com" className="text-primary hover:underline">legal@stravision.com</a>；技术支持：<a href="mailto:support@stravision.com" className="text-primary hover:underline">support@stravision.com</a>；账单事务：<a href="mailto:billing@stravision.com" className="text-primary hover:underline">billing@stravision.com</a>）。通知在发送时视为送达（邮件通知在发送后 24 小时视为送达，平台公告在发布时视为送达）。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">20.7 条款标题</h3>
                    <p>本协议中各条款的标题仅为方便阅读而设，不具有法律效力，不影响本协议的解释。</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">20.8 语言</h3>
                    <p>
                      本协议以中文和英文两种语言版本提供。如果中文版本与英文版本之间存在任何不一致，在适用法律允许的范围内，以中文版本为准。对于欧盟用户，如法律要求，英文版本将作为参考。
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">20.9 存续</h3>
                    <p>
                      本协议和隐私政策的最新版本可在本平台的相关页面永久查阅。我们建议您下载或打印本协议的副本以备日后参考。您也可以通过联系 legal@stravision.com 获取本协议的历史版本。
                    </p>
                  </div>
                </div>
              </section>

              <div className="pt-12 border-t border-white/10 text-center">
                <p className="text-white/40 text-sm">如有任何法律疑问，请联系：</p>
                <a href="mailto:legal@stravision.com" className="text-primary hover:underline mt-1 inline-block">legal@stravision.com</a>
              </div>

              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}