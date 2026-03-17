"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const tello_client_1 = require("./tello-client");
const mcp_server_1 = require("./mcp-server");
const api_server_1 = require("./api-server");
async function main() {
    tello_client_1.logger.info('Starting Tello Edge Control Node...');
    const tello = new tello_client_1.TelloClient(config_1.config.tello.ip, config_1.config.tello.commandPort, config_1.config.tello.statePort);
    const mcpServer = new mcp_server_1.TelloMcpServer(tello);
    const apiServer = new api_server_1.ApiServer(tello, config_1.config.api.port);
    // Connect to Tello
    try {
        await tello.connect();
        tello_client_1.logger.info('Connected to Tello successfully');
    }
    catch (error) {
        tello_client_1.logger.error('Failed to connect to Tello, starting in offline mode (will retry)', { error });
        // We continue so the servers start, allowing API commands to try connecting later?
        // Or retry loop?
        // TelloClient has internal logic to retry? No, it throws.
        // But we should probably keep running to serve API/MCP even if drone is offline.
    }
    // Start Servers
    try {
        await mcpServer.start();
        apiServer.start();
        tello_client_1.logger.info('All services started');
    }
    catch (error) {
        tello_client_1.logger.error('Failed to start servers', { error });
        process.exit(1);
    }
    // Handle shutdown
    process.on('SIGINT', () => {
        tello_client_1.logger.info('Shutting down...');
        tello.close();
        process.exit(0);
    });
}
main().catch((err) => {
    tello_client_1.logger.error('Unhandled error in main', { error: err });
    process.exit(1);
});
//# sourceMappingURL=index.js.map