import { TelloClient } from "./tello-client";
export declare class TelloMcpServer {
    private server;
    private tello;
    constructor(telloClient: TelloClient);
    private registerTools;
    private registerResources;
    start(): Promise<void>;
}
//# sourceMappingURL=mcp-server.d.ts.map