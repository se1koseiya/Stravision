import { getDashboardVersion } from "@/lib/db/settings-service"
import DashboardClient from "./dashboard-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const version = await getDashboardVersion()
  
  return <DashboardClient version={version} />
}
