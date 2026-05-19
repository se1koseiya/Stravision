"use client"

import React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"

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
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            返回登录
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">服务条款 (Terms of Service)</h1>
          <p className="text-white/40 text-sm">生效日期：2024年3月15日 | 版本：2.0</p>
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
                  "2. 定义",
                  "3. 账户注册与管理",
                  "4. 服务使用规范",
                  "5. 设备连接与数据",
                  "6. 知识产权",
                  "7. 付费服务与订阅",
                  "8. 免责声明",
                  "9. 责任限制",
                  "10. 协议修改与终止",
                  "11. 法律管辖"
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
                  <span className="text-primary">01.</span> 接受条款
                </h2>
                <p>
                  欢迎使用 Stravision IoT 平台（以下简称“本平台”）。本协议是您（个人或实体，以下简称“用户”或“您”）与 Stravision Inc.（以下简称“我们”或“Stravision”）之间关于使用本平台及其相关服务（包括但不限于网站、API、移动应用、嵌入式软件，统称“服务”）的法律协议。
                </p>
                <p className="mt-4 font-medium text-white/90">
                  请您在注册或使用本服务前仔细阅读本协议。一旦您点击“注册”、“登录”按钮或实际使用本服务，即表示您已阅读、理解并同意接受本协议所有条款的约束。如果您不同意本协议的任何内容，请立即停止使用本服务。
                </p>
              </section>

              <section id="section-2">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">02.</span> 定义
                </h2>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary/50">
                  <li><strong>平台/服务</strong>：指 Stravision 提供的物联网设备管理、数据采集、分析和可视化平台及相关软件服务。</li>
                  <li><strong>设备</strong>：指通过本平台协议接入的任何硬件设备，包括传感器、控制器、网关等。</li>
                  <li><strong>用户数据</strong>：指用户在使用服务过程中产生、上传、传输或存储的任何数据，包括设备遥测数据、配置信息、个人资料等。</li>
                  <li><strong>API</strong>：指 Stravision 提供的应用程序编程接口，允许用户或第三方系统与平台进行交互。</li>
                </ul>
              </section>

              <section id="section-3">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">03.</span> 账户注册与管理
                </h2>
                <div className="space-y-4">
                  <p><strong>3.1 资格</strong>：您确认您已年满18周岁（或当地法律规定的成年年龄），具备完全民事行为能力。如果您代表企业注册，您声明并保证您已获得该企业的充分授权。</p>
                  <p><strong>3.2 真实信息</strong>：您应提供真实、准确、完整且最新的注册信息。因信息不实导致的任何损失或法律后果由您自行承担。</p>
                  <p><strong>3.3 安全责任</strong>：您有责任妥善保管您的账户凭证（包括用户名、密码、API Key、Token）。任何通过您的账户（或使用您的 API Key）进行的操作均视为您的行为，您需对此承担全部法律责任。若发现未授权使用，请立即通知我们。</p>
                </div>
              </section>

              <section id="section-4">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">04.</span> 服务使用规范
                </h2>
                <p className="mb-4">您承诺不会利用本服务进行以下行为：</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-primary/50">
                  <li>上传、传输或分享任何违反适用法律法规、侵犯第三方权益（包括知识产权、隐私权）的内容。</li>
                  <li>干扰、破坏本服务的基础设施（如进行 DDoS 攻击、注入病毒、木马或恶意代码）。</li>
                  <li>试图未经授权访问本服务的任何部分、服务器系统或其他用户的账户。</li>
                  <li>对本服务进行反向工程、反编译或试图提取源代码，除非法律明确允许。</li>
                  <li>利用本服务从事任何欺诈、洗钱、赌博或其他非法活动。</li>
                  <li>滥用 API 接口，超出平台规定的调用频率限制，影响平台稳定性。</li>
                </ul>
                <p className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
                  违反上述规范可能导致您的账户被立即冻结或永久终止，且我们保留追究法律责任的权利。
                </p>
              </section>

              <section id="section-5">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">05.</span> 设备连接与数据
                </h2>
                <p><strong>5.1 设备合规</strong>：您应确保连接到平台的设备符合相关技术标准和安全规范。对于因设备本身故障、固件漏洞或安全设置不当导致的问题，平台不承担责任。</p>
                <p className="mt-2"><strong>5.2 数据所有权</strong>：您保留您上传至平台的用户数据的所有权。您授予 Stravision 全球性的、免版税的、非独占的许可，允许我们为提供、维护和改进服务的目的使用、存储、复制、修改和传输这些数据。</p>
                <p className="mt-2"><strong>5.3 数据聚合</strong>：我们有权对用户数据进行去标识化或匿名化处理，并利用聚合数据进行行业分析、产品改进或发布统计报告。此类聚合数据不再属于您的个人信息或专有数据。</p>
              </section>

              <section id="section-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">06.</span> 知识产权
                </h2>
                <p>
                  Stravision 平台及其包含的所有内容（包括但不限于软件代码、界面设计、图表、商标、文档）均为 Stravision 或其许可方的财产，受著作权法、商标法及其他知识产权法律保护。除本协议明确授予的有限使用许可外，您不得擅自使用、复制、修改或分发本平台的任何内容。
                </p>
              </section>

              <section id="section-7">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">07.</span> 付费服务与订阅
                </h2>
                <p><strong>7.1 费用</strong>：部分服务为付费服务。您同意按照我们在定价页面公布的价格支付相关费用。价格可能会根据市场情况进行调整，我们会提前通知您。</p>
                <p className="mt-2"><strong>7.2 续费与取消</strong>：订阅服务通常会自动续费。您可以随时在账单周期结束前取消订阅，取消将在当前周期结束后生效。除非法律另有规定，已支付的费用不予退还。</p>
                <p className="mt-2"><strong>7.3 欠费处理</strong>：如果您的付款方式失效或欠费，我们保留暂停或终止您访问付费服务的权利。</p>
              </section>

              <section id="section-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">08.</span> 免责声明
                </h2>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="uppercase tracking-widest text-xs text-white/50 mb-2">重要提示</p>
                  <p>
                    本服务按“现状”和“现有”基础提供，不附带任何明示或暗示的保证（包括但不限于适销性、特定用途适用性或非侵权性的保证）。我们不保证服务将不间断、零错误、完全安全或免受病毒侵害。您自行承担使用本服务的风险。对于因网络连接问题、设备故障、第三方服务中断或不可抗力导致的服务中断，我们不承担责任。
                  </p>
                </div>
              </section>

              <section id="section-9">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">09.</span> 责任限制
                </h2>
                <p>
                  在法律允许的最大范围内，Stravision 及其关联方、高管、员工或代理人均不对因本协议引起的任何间接、附带、特殊、后果性或惩罚性损害（包括利润损失、数据丢失、业务中断）承担责任，即使我们已被告知发生此类损害的可能性。我们对您的全部赔偿责任上限不超过您在引起索赔的事件发生前 12 个月内向我们支付的服务费用总额。
                </p>
              </section>

              <section id="section-10">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">10.</span> 协议修改与终止
                </h2>
                <p>
                  我们保留随时修改本协议的权利。修改后的协议将在平台公布时生效。若属于重大变更，我们会通过邮件或平台公告通知您。如果您继续使用服务，即表示接受修改。您可以随时停止使用服务。如果您违反本协议，我们有权立即终止您的账户且不退还任何费用。
                </p>
              </section>

              <section id="section-11">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-primary">11.</span> 法律管辖
                </h2>
                <p>
                  本协议受中华人民共和国法律管辖，不考虑其法律冲突原则。因本协议引起的任何争议，双方应首先友好协商解决；协商不成的，任何一方均可向 Stravision 所在地有管辖权的人民法院提起诉讼。
                </p>
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
