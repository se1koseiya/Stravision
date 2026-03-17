import { TelloClient } from './tello-client';
export declare class ApiServer {
    private app;
    private server;
    private wss;
    private tello;
    private port;
    constructor(telloClient: TelloClient, port?: number);
    private setupMiddleware;
    private setupRoutes;
    private setupWebSocket;
    start(): void;
}
//# sourceMappingURL=api-server.d.ts.map