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
          <p className="text-white/40 text-sm">生效日期：2024年3月15日 | 版本：2.0</p>
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
                  "1. 引言",
                  "2. 我们收集的信息",
                  "3. 信息使用方式",
                  "4. 信息共享与披露",
                  "5. 数据存储与安全",
                  "6. Cookie 与追踪技术",
                  "7. 您的权利",
                  "8. 未成年人保护",
                  "9. 全球数据传输",
                  "10. 政策更新",
                  "11. 联系我们"
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
              
              <section id="section-1">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">01.</span> 引言
                </h2>
                <p>
                  Stravision Inc.（以下简称“我们”）深知个人信息对您的重要性，并致力于保护您的隐私和数据安全。本隐私政策详细说明了在您使用 Stravision IoT 平台及相关服务时，我们如何收集、使用、存储、共享和保护您的信息。
                </p>
                <p className="mt-4">
                  请在使用我们的服务前仔细阅读本政策。使用我们的服务，即表示您同意我们按照本政策处理您的信息。
                </p>
              </section>

              <section id="section-2">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">02.</span> 我们收集的信息
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">2.1 您主动提供的信息</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>账户信息</strong>：注册时提供的电子邮件、用户名、密码（加密存储）、手机号码（用于 2FA）。</li>
                      <li><strong>个人资料</strong>：头像、职业、公司名称等选填信息。</li>
                      <li><strong>支付信息</strong>：通过第三方支付渠道（如支付宝、Stripe）支付时的订单记录和账单地址。我们不直接存储您的完整信用卡号。</li>
                      <li><strong>反馈与支持</strong>：您在联系客服或提交反馈时提供的通信记录。</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 mb-2">2.2 服务使用中自动收集的信息</h3>
                    <ul className="list-disc pl-5 space-y-1 marker:text-white/30">
                      <li><strong>设备数据（IoT 核心数据）</strong>：您连接到平台的设备上传的遥测数据（如温度、湿度、位置坐标、运行状态）、设备元数据（MAC 地址、固件版本、序列号）以及设备日志。</li>
                      <li><strong>日志信息</strong>：IP 地址、浏览器类型、访问时间、请求 URL、操作记录（如点击、页面停留时间）。</li>
                      <li><strong>网络信息</strong>：运营商信息、网络质量数据。</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="section-3">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">03.</span> 信息使用方式
                </h2>
                <p className="mb-4">我们收集的信息将用于以下目的：</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary/50">
                  <li><strong>核心服务提供</strong>：处理设备数据连接、存储、可视化展示以及设备远程控制功能。</li>
                  <li><strong>告警与通知</strong>：根据您设置的规则发送设备状态异常告警（邮件、短信）。</li>
                  <li><strong>安全保障</strong>：监测异常登录、防范网络攻击、验证身份。</li>
                  <li><strong>产品改进</strong>：分析用户使用行为和设备数据分布，优化平台性能和功能设计。</li>
                  <li><strong>AI 服务</strong>：如果您启用 AI 助手功能，我们会使用去标识化的数据来提供智能问答和数据分析服务。</li>
                </ul>
              </section>

              <section id="section-4">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">04.</span> 信息共享与披露
                </h2>
                <p className="mb-4">我们承诺不会出售您的个人信息。我们仅在以下情况共享信息：</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary/50">
                  <li><strong>服务提供商</strong>：与代表我们提供基础设施服务的第三方（如 AWS/阿里云用于数据存储、Resend 用于邮件发送）共享必要信息。这些第三方受严格的数据处理协议 (DPA) 约束。</li>
                  <li><strong>法律要求</strong>：在遵守法律程序、法院命令或政府强制要求的情况下披露信息。</li>
                  <li><strong>业务转让</strong>：在合并、收购或资产出售中，用户信息可能作为转让资产的一部分。</li>
                  <li><strong>获得您同意</strong>：在获得您明确授权的情况下共享给其他第三方。</li>
                </ul>
              </section>

              <section id="section-5">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">05.</span> 数据存储与安全
                </h2>
                <p><strong>5.1 存储地点</strong>：您的数据主要存储在中国境内或您选择的特定区域数据中心。我们严格遵守当地的数据本地化法律。</p>
                <p className="mt-2"><strong>5.2 存储期限</strong>：我们仅在提供服务所需的期限内保留您的数据。用户注销账户后，我们会按照法律规定在合理期限内删除或匿名化处理您的个人信息。</p>
                <p className="mt-2"><strong>5.3 安全措施</strong>：我们采用多层次安全措施，包括 HTTPS 传输加密、AES-256 数据存储加密、严格的访问控制策略以及定期的安全审计，以防止数据泄露。</p>
              </section>

              <section id="section-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">06.</span> Cookie 与追踪技术
                </h2>
                <p>
                  我们使用 Cookie、LocalStorage 和类似技术来维持您的登录会话、保存偏好设置（如语言、主题）以及分析流量。您可以通过浏览器设置拒绝 Cookie，但这可能导致无法登录或使用部分功能。我们不会使用 Cookie 进行跨网站的广告追踪。
                </p>
              </section>

              <section id="section-7">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">07.</span> 您的权利
                </h2>
                <div className="space-y-2">
                  <p>根据适用的数据保护法律，您拥有以下权利：</p>
                  <ul className="list-disc pl-5 space-y-1 marker:text-primary/50">
                    <li><strong>访问权</strong>：查询我们持有的您的个人信息副本。</li>
                    <li><strong>更正权</strong>：更正不准确的个人信息。</li>
                    <li><strong>删除权</strong>：在特定情况下要求删除您的数据（“被遗忘权”）。</li>
                    <li><strong>限制处理权</strong>：要求限制我们处理您的数据。</li>
                    <li><strong>数据携带权</strong>：以结构化、通用的格式导出您的数据。</li>
                    <li><strong>撤回同意</strong>：随时撤回您对数据处理的同意。</li>
                  </ul>
                  <p className="mt-2 text-sm text-white/60">您可以通过“个人设置”页面直接行使上述大部分权利，或联系 privacy@stravision.com 获取帮助。</p>
                </div>
              </section>

              <section id="section-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">08.</span> 未成年人保护
                </h2>
                <p>
                  本服务主要面向成年人。我们不会有意收集未满 14 周岁（或当地法律规定的儿童年龄）未成年人的个人信息。如果您发现我们在不知情的情况下收集了未成年人的信息，请立即联系我们，我们将尽快删除相关数据。
                </p>
              </section>

              <section id="section-9">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">09.</span> 全球数据传输
                </h2>
                <p>
                  如果您在不同国家/地区访问本服务，您的信息可能会被传输到您所在国家/地区以外的服务器进行处理。此类传输将依据标准合同条款 (SCC) 或其他法律机制进行，确保您的数据享有同等水平的保护。
                </p>
              </section>

              <section id="section-10">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">10.</span> 政策更新
                </h2>
                <p>
                  我们会根据业务发展和法律法规的变化不时更新本隐私政策。更新后的版本将在生效前通过网站公告或邮件通知您。建议您定期查阅本页面以了解最新的隐私实践。
                </p>
              </section>

              <section id="section-11">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">11.</span> 联系我们
                </h2>
                <p>
                  如果您对本隐私政策或个人信息处理有任何疑问、投诉或建议，请通过以下方式联系我们的数据保护官 (DPO)：
                </p>
                <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="font-bold text-white">Stravision Privacy Team</p>
                  <p className="mt-1">Email: <a href="mailto:privacy@stravision.com" className="text-emerald-400 hover:underline">privacy@stravision.com</a></p>
                  <p className="mt-1">地址: [公司具体注册地址]</p>
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
