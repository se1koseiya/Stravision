
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AutomationEngine, AutomationContext } from "@/lib/automation/engine";
import { MQTTService } from "@/lib/mqtt-service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { graph_data, force = false, context: providedContext } = await req.json();

    if (!graph_data) {
      return NextResponse.json({ error: "Missing graph data" }, { status: 400 });
    }

    const mqttService = MQTTService.getInstance();
    const latestData = mqttService.getLatestData();

    // Prioritize provided context (from frontend real-time data), fallback to backend memory
    let context: AutomationContext = {
      sensorData: undefined,
      timestamp: Date.now(),
    };

    if (providedContext && providedContext.sensorData) {
        context = providedContext;
    } else if (latestData) {
        context = {
            sensorData: {
                temperature: latestData.temperature / 10,
                humidity: latestData.humidity / 10,
                light: latestData.light,
                co2: latestData.co2,
            },
            timestamp: Date.now()
        };
    }

    let actions = [];
    if (force) {
      // Bypassing triggers, but still respecting logic nodes
      actions = AutomationEngine.forceExecute(graph_data, context);
    } else {
      // Standard evaluation
      actions = AutomationEngine.evaluate({ graph_data, is_active: true }, context);
    }

    if (actions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No actions triggered by current conditions",
        actions: [],
        debug: {
            context,
            reason: !context.sensorData ? "No sensor data available" : "Logic conditions not met"
        }
      });
    }

    // Execute actions
    for (const action of actions) {
      await mqttService.executeAction(action);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully executed ${actions.length} actions`,
      actions,
      debug: {
          context
      }
    });

  } catch (error) {
    console.error("Failed to execute automation:", error);
    const errorMessage = error instanceof Error ? error.message : "Execution failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
