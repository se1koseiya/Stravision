
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
                soil_moisture: latestData.soil_moisture || 0,
            },
            timestamp: Date.now()
        };
    }

    // Validate that we have sensor data for evaluation
    if (!context.sensorData && !force) {
      return NextResponse.json({ 
        success: false, 
        error: "No sensor data available",
        message: "无法执行自动化：传感器数据不可用。请确保设备已连接并正在发送数据。",
        debug: {
            latestData,
            providedContext
        }
      }, { status: 400 });
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
        message: force ? "强制执行完成，但没有生成任何动作" : "当前条件未触发任何动作",
        actions: [],
        debug: {
            context,
            hasNodes: graph_data?.nodes?.length || 0,
            hasEdges: graph_data?.edges?.length || 0,
            reason: !context.sensorData ? "传感器数据不可用" : "逻辑条件未满足"
        }
      });
    }

    // Execute actions
    const executionResults = [];
    for (const action of actions) {
      try {
        await mqttService.executeAction(action);
        executionResults.push({ action, success: true });
      } catch (err) {
        executionResults.push({ 
          action, 
          success: false, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `成功执行 ${actions.length} 个动作`,
      actions,
      executionResults,
      debug: {
          context,
          graphInfo: {
              nodes: graph_data?.nodes?.length || 0,
              edges: graph_data?.edges?.length || 0
          }
      }
    });

  } catch (error) {
    console.error("Failed to execute automation:", error);
    const errorMessage = error instanceof Error ? error.message : "Execution failed";
    return NextResponse.json({ 
      error: errorMessage,
      message: "自动化执行失败：" + errorMessage
    }, { status: 500 });
  }
}
