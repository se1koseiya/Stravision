
import { NextRequest, NextResponse } from "next/server";
import { initAutomationTable, updateRule, deleteRule, getRule } from "@/lib/db/automation-service";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    await initAutomationTable();
    const { id } = await params;
    const rule = await getRule(id);
    if (!rule) {
        return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch rule" }, { status: 500 });
  }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    await initAutomationTable();
    const { id } = await params;
    const body = await req.json();

    const updated = await updateRule(id, {
        ...body,
        graph_data: body.graph_data ? JSON.stringify(body.graph_data) : undefined
    });

    if (!updated) {
        return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    await initAutomationTable();
    const { id } = await params;
    const success = await deleteRule(id);
    
    if (!success) {
        return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete rule" }, { status: 500 });
  }
}
