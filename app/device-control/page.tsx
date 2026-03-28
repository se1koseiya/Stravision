import { getDeviceControlVersion } from "@/lib/db/settings-service"
import DeviceControlClient from "./device-control-client"

export const dynamic = "force-dynamic"

export default async function DeviceControlPage() {
  const version = await getDeviceControlVersion()
  
  return <DeviceControlClient version={version} />
}
