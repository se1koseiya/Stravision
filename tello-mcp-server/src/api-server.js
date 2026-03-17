"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiServer = void 0;
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const tello_client_1 = require("./tello-client");
const http_1 = __importDefault(require("http"));
class ApiServer {
    app;
    server;
    wss;
    tello;
    port;
    constructor(telloClient, port = 3000) {
        this.tello = telloClient;
        this.port = port;
        this.app = (0, express_1.default)();
        this.server = http_1.default.createServer(this.app);
        this.wss = new ws_1.WebSocketServer({ server: this.server, path: '/ws' });
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }
    setupMiddleware() {
        this.app.use(express_1.default.json());
        // CORS?
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
    }
    setupRoutes() {
        this.app.get('/api/state', (req, res) => {
            const state = this.tello.getState();
            if (!state) {
                return res.status(503).json({ error: 'Not connected or no state received yet' });
            }
            res.json(state);
        });
        this.app.post('/api/command', async (req, res) => {
            const { command } = req.body;
            if (!command) {
                return res.status(400).json({ error: 'Command is required' });
            }
            try {
                const result = await this.tello.sendCommand(command);
                res.json({ result });
            }
            catch (error) {
                tello_client_1.logger.error(`API command failed: ${error.message}`);
                res.status(500).json({ error: error.message });
            }
        });
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', connected: this.tello.getState() !== null });
        });
    }
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            tello_client_1.logger.info('WebSocket client connected');
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    if (data.command) {
                        const result = await this.tello.sendCommand(data.command);
                        ws.send(JSON.stringify({ type: 'response', command: data.command, result }));
                    }
                }
                catch (error) {
                    ws.send(JSON.stringify({ type: 'error', error: error.message }));
                }
            });
            ws.on('close', () => {
                tello_client_1.logger.info('WebSocket client disconnected');
            });
        });
        // Broadcast state updates
        this.tello.on('state', (state) => {
            const msg = JSON.stringify({ type: 'state', data: state });
            this.wss.clients.forEach((client) => {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(msg);
                }
            });
        });
    }
    start() {
        this.server.listen(this.port, () => {
            tello_client_1.logger.info(`API Server listening on port ${this.port}`);
        });
    }
}
exports.ApiServer = ApiServer;
//# sourceMappingURL=api-server.js.map