import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import ActivityPageClient from "./activity-client"

export const dynamic = "force-dynamic"

export default async function ActivityPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  return <ActivityPageClient user={user} />
}
