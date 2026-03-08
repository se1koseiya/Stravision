"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelloMcpServer = void 0;
const mcp_1 = require("@modelcontextprotocol/sdk/server/mcp");
const stdio_1 = require("@modelcontextprotocol/sdk/server/stdio");
const zod_1 = require("zod");
const tello_client_1 = require("./tello-client");
class TelloMcpServer {
    server;
    tello;
    constructor(telloClient) {
        this.tello = telloClient;
        this.server = new mcp_1.McpServer({
            name: "tello-control",
            version: "1.0.0"
        });
        this.registerTools();
        this.registerResources();
    }
    registerTools() {
        this.server.tool("takeoff", {}, async () => {
            try {
                await this.tello.sendCommand("takeoff");
                return { content: [{ type: "text", text: "Takeoff command sent" }] };
            }
            catch (e) {
                return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
            }
        });
        this.server.tool("land", {}, async () => {
            try {
                await this.tello.sendCommand("land");
                return { content: [{ type: "text", text: "Land command sent" }] };
            }
            catch (e) {
                return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
            }
        });
        this.server.tool("emergency", {}, async () => {
            try {
                await this.tello.sendCommand("emergency");
                return { content: [{ type: "text", text: "Emergency stop sent!" }] };
            }
            catch (e) {
                return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
            }
        });
        this.server.tool("move", {
            direction: zod_1.z.enum(["up", "down", "left", "right", "forward", "back"]),
            distance: zod_1.z.number().min(20).max(500).describe("Distance in cm (20-500)")
        }, async ({ direction, distance }) => {
            try {
                await this.tello.sendCommand(`${direction} ${distance}`);
                return { content: [{ type: "text", text: `Moved ${direction} ${distance}cm` }] };
            }
            catch (e) {
                return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
            }
        });
        this.server.tool("rotate", {
            direction: zod_1.z.enum(["cw", "ccw"]),
            degrees: zod_1.z.number().min(1).max(3600).describe("Degrees (1-3600)")
        }, async ({ direction, degrees }) => {
            try {
                await this.tello.sendCommand(`${direction} ${degrees}`);
                return { content: [{ type: "text", text: `Rotated ${direction} ${degrees} degrees` }] };
            }
            catch (e) {
                return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
            }
        });
        this.server.tool("flip", {
            direction: zod_1.z.enum(["l", "r", "f", "b"])
        }, async ({ direction }) => {
            try {
                await this.tello.sendCommand(`flip ${direction}`);
                return { content: [{ type: "text", text: `Flipped ${direction}` }] };
            }
            catch (e) {
                return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
            }
        });
        this.server.tool("command", {
            cmd: zod_1.z.string().describe("Raw Tello SDK command")
        }, async ({ cmd }) => {
            try {
                const res = await this.tello.sendCommand(cmd);
                return { content: [{ type: "text", text: res }] };
            }
            catch (e) {
                return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
            }
        });
    }
    registerResources() {
        this.server.resource("state", "tello://state", async (uri) => {
            const state = this.tello.getState();
            return {
                contents: [{
                        uri: uri.href,
                        text: JSON.stringify(state, null, 2),
                        mimeType: "application/json"
                    }]
            };
        });
    }
    async start() {
        const transport = new stdio_1.StdioServerTransport();
        await this.server.connect(transport);
        tello_client_1.logger.info("MCP Server started on stdio");
    }
}
exports.TelloMcpServer = TelloMcpServer;
//# sourceMappingURL=mcp-server.js.map