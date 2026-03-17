import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MobilePwaPrompt } from "@/components/mobile-pwa-prompt"

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <MobileBottomNav />
      <MobilePwaPrompt />
    </>
  )
}
