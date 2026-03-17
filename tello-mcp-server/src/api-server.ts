import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { TelloClient, logger } from './tello-client.js';
import http from 'http';

export class ApiServer {
  private app: express.Express;
  private server: http.Server;
  private wss: WebSocketServer;
  private tello: TelloClient;
  private port: number;

  constructor(telloClient: TelloClient, port: number = 3001) {
    this.tello = telloClient;
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server, path: '/ws' });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    // CORS?
    this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
  }

  private setupRoutes() {
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
      } catch (error: any) {
        logger.error(`API command failed: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
        res.json({ status: 'ok', connected: this.tello.getState() !== null });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws) => {
      logger.info('WebSocket client connected');

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.command) {
            const result = await this.tello.sendCommand(data.command);
            ws.send(JSON.stringify({ type: 'response', command: data.command, result }));
          }
        } catch (error: any) {
          ws.send(JSON.stringify({ type: 'error', error: error.message }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });
    });

    // Broadcast state updates
    this.tello.on('state', (state) => {
      const msg = JSON.stringify({ type: 'state', data: state });
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      });
    });
  }

  public start() {
    this.server.listen(this.port, () => {
      logger.info(`API Server listening on port ${this.port}`);
    });
  }
}
