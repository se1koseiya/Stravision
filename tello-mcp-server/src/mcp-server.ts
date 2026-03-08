import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TelloClient, logger } from "./tello-client.js";
import { MissionManager } from "./mission-manager.js";

export class TelloMcpServer {
  private server: McpServer;
  private tello: TelloClient;
  private missionManager: MissionManager;

  constructor(telloClient: TelloClient) {
    this.tello = telloClient;
    this.missionManager = new MissionManager(telloClient);
    this.server = new McpServer({
      name: "tello-control",
      version: "1.0.0"
    });
    
    this.registerTools();
    this.registerResources();
  }

  private registerTools() {
    this.server.tool("takeoff", {}, async () => {
      try {
        await this.tello.sendCommand("takeoff");
        return { content: [{ type: "text", text: "Takeoff command sent" }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    });

    this.server.tool("land", {}, async () => {
      try {
        await this.tello.sendCommand("land");
        return { content: [{ type: "text", text: "Land command sent" }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    });

    this.server.tool("emergency", {}, async () => {
      try {
        await this.tello.sendCommand("emergency");
        return { content: [{ type: "text", text: "Emergency stop sent!" }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    });

    this.server.tool("move", {
        direction: z.enum(["up", "down", "left", "right", "forward", "back"]),
        distance: z.number().min(20).max(500).describe("Distance in cm (20-500)")
    }, async ({ direction, distance }) => {
        try {
            await this.tello.sendCommand(`${direction} ${distance}`);
            return { content: [{ type: "text", text: `Moved ${direction} ${distance}cm` }] };
        } catch (e: any) {
            return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
    });

    this.server.tool("rotate", {
        direction: z.enum(["cw", "ccw"]),
        degrees: z.number().min(1).max(3600).describe("Degrees (1-3600)")
    }, async ({ direction, degrees }) => {
        try {
            await this.tello.sendCommand(`${direction} ${degrees}`);
            return { content: [{ type: "text", text: `Rotated ${direction} ${degrees} degrees` }] };
        } catch (e: any) {
             return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
    });
    
    this.server.tool("flip", {
        direction: z.enum(["l", "r", "f", "b"])
    }, async ({ direction }) => {
        try {
            await this.tello.sendCommand(`flip ${direction}`);
            return { content: [{ type: "text", text: `Flipped ${direction}` }] };
        } catch (e: any) {
             return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
    });

    this.server.tool("command", {
        cmd: z.string().describe("Raw Tello SDK command")
    }, async ({ cmd }) => {
         try {
            const res = await this.tello.sendCommand(cmd);
            return { content: [{ type: "text", text: res }] };
        } catch (e: any) {
             return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
    });

    this.server.tool("start_cruise_mission", {
        padA: z.number().min(1).max(8).describe("ID of Mission Pad A (1-8)"),
        padB: z.number().min(1).max(8).describe("ID of Mission Pad B (1-8)"),
        loops: z.number().min(1).max(10).describe("Number of cruise loops")
    }, async ({ padA, padB, loops }) => {
        try {
            // We start this asynchronously
            this.missionManager.startCruise(padA, padB, loops).catch(err => {
                logger.error("Mission execution error", { error: err });
            });
            return { content: [{ type: "text", text: `Cruise mission started: Pad ${padA} <-> Pad ${padB} for ${loops} loops.` }] };
        } catch (e: any) {
             return { content: [{ type: "text", text: `Error starting mission: ${e.message}` }], isError: true };
        }
    });

    this.server.tool("stop_mission", {}, async () => {
        this.missionManager.stopMission();
        return { content: [{ type: "text", text: "Mission stop signal sent." }] };
    });
  }

  private registerResources() {
     this.server.resource(
        "state",
        "tello://state",
        async (uri) => {
            const state = this.tello.getState();
            return {
                contents: [{
                    uri: uri.href,
                    text: JSON.stringify(state, null, 2),
                    mimeType: "application/json"
                }]
            };
        }
     );
  }

  public async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info("MCP Server started on stdio");
  }
}
