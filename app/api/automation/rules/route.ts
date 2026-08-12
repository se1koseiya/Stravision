
import { NextRequest, NextResponse } from "next/server";
import { initAutomationTable, getRules, createRule } from "@/lib/db/automation-service";
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    await initAutomationTable();
    const rules = await getRules();
    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error("Failed to fetch rules:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    await initAutomationTable();
    const body = await req.json();
    
    // Basic validation
    if (!body.name || !body.graph_data) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const newRule = await createRule({
        name: body.name,
        description: body.description || "",
        is_active: body.is_active ?? true,
        graph_data: JSON.stringify(body.graph_data), // Store as string
        trigger_type: body.trigger_type || "manual"
    });

    return NextResponse.json({ success: true, data: newRule });
  } catch (error) {
    console.error("Failed to create rule:", error);
    return NextResponse.json({ success: false, error: "Failed to create rule" }, { status: 500 });
  }
}
