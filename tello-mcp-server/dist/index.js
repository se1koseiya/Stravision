"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("./config.js");
const tello_client_js_1 = require("./tello-client.js");
const mcp_server_js_1 = require("./mcp-server.js");
const api_server_js_1 = require("./api-server.js");
async function main() {
    tello_client_js_1.logger.info('Starting Tello Edge Control Node...');
    const tello = new tello_client_js_1.TelloClient(config_js_1.config.tello.ip, config_js_1.config.tello.commandPort, config_js_1.config.tello.statePort);
    const mcpServer = new mcp_server_js_1.TelloMcpServer(tello);
    const apiServer = new api_server_js_1.ApiServer(tello, config_js_1.config.api.port);
    // Connect to Tello
    try {
        await tello.connect();
        tello_client_js_1.logger.info('Connected to Tello successfully');
    }
    catch (error) {
        tello_client_js_1.logger.error('Failed to connect to Tello, starting in offline mode (will retry)', { error });
    }
    // Start Servers
    try {
        await mcpServer.start();
        apiServer.start();
        tello_client_js_1.logger.info('All services started');
    }
    catch (error) {
        tello_client_js_1.logger.error('Failed to start servers', { error });
        process.exit(1);
    }
    // Handle shutdown
    process.on('SIGINT', () => {
        tello_client_js_1.logger.info('Shutting down...');
        tello.close();
        process.exit(0);
    });
}
main().catch((err) => {
    tello_client_js_1.logger.error('Unhandled error in main', { error: err });
    process.exit(1);
});
