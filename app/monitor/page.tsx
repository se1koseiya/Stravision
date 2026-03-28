import { getMonitorPageVersion } from "@/lib/db/settings-service"
import MonitorBeautiful from "./monitor-beautiful"
import MonitorUgly from "./monitor-ugly"

export const dynamic = "force-dynamic" // Ensure we fetch the latest setting

export default async function MonitorPage() {
  const version = await getMonitorPageVersion()
  
  if (version === 'ugly') {
    return <MonitorUgly />
  }
  
  return <MonitorBeautiful />
}
