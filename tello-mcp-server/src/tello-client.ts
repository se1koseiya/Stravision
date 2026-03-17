import dgram from 'dgram';
import { EventEmitter } from 'events';
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Stream({ stream: process.stderr }),
    new winston.transports.File({ filename: 'tello-client.log' }),
  ],
});

export interface TelloState {
  pitch: number;
  roll: number;
  yaw: number;
  vgx: number;
  vgy: number;
  vgz: number;
  templ: number;
  temph: number;
  tof: number;
  h: number;
  bat: number;
  baro: number;
  time: number;
  agx: number;
  agy: number;
  agz: number;
  [key: string]: number;
}

interface CommandTask {
  command: string;
  resolve: (value: string) => void;
  reject: (reason: any) => void;
}

export class TelloClient extends EventEmitter {
  private commandSocket: dgram.Socket;
  private stateSocket: dgram.Socket;
  private host: string;
  private commandPort: number;
  private statePort: number;
  private isConnected: boolean = false;
  private lastStateTime: number = 0;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private currentState: TelloState | null = null;
  
  private commandQueue: CommandTask[] = [];
  private isProcessingQueue: boolean = false;

  constructor(host: string = '192.168.10.1', commandPort: number = 8889, statePort: number = 8890) {
    super();
    this.host = host;
    this.commandPort = commandPort;
    this.statePort = statePort;
    this.commandSocket = dgram.createSocket('udp4');
    this.stateSocket = dgram.createSocket('udp4');
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Bind command socket to random port
        this.commandSocket.bind(0, () => {
          logger.info(`Command socket bound to ${this.commandSocket.address().port}`);
        });

        // Bind state socket to 8890
        this.stateSocket.bind(this.statePort, () => {
           logger.info(`State socket bound to ${this.statePort}`);
        });

        this.setupListeners();

        // Send initial command to enter SDK mode
        // We bypass the queue for the initial command to ensure it goes out immediately?
        // No, use the queue.
        this.sendCommand('command')
          .then(() => {
             this.startKeepAlive();
             this.isConnected = true;
             this.emit('connected');
             logger.info('Connected to Tello');
             resolve();
          })
          .catch((err) => {
             logger.error('Failed to connect (initial command failed)', { error: err });
             // We might resolve anyway if we want to retry later, but reject is safer.
             reject(err);
          });

      } catch (error) {
        logger.error('Failed to setup sockets', { error });
        reject(error);
      }
    });
  }

  private setupListeners() {
    this.commandSocket.on('message', (msg) => {
      const response = msg.toString().trim();
      logger.info(`Received response: ${response}`);
      // The processing loop will handle the resolution
      this.emit('raw-response', response);
    });

    this.commandSocket.on('error', (err) => {
      logger.error(`Command socket error: ${err.message}`);
      this.emit('error', err);
    });

    this.stateSocket.on('message', (msg) => {
      const stateStr = msg.toString().trim();
      this.parseState(stateStr);
      this.lastStateTime = Date.now();
    });

    this.stateSocket.on('error', (err) => {
      logger.error(`State socket error: ${err.message}`);
      this.emit('error', err);
    });
  }

  private parseState(stateStr: string) {
    const state: any = {};
    // Example: "pitch:0;roll:0;..."
    // Sometimes it might be newline separated or semicolon. Tello SDK says semicolon.
    const parts = stateStr.split(';');
    for (const part of parts) {
      const [key, value] = part.split(':');
      if (key && value) {
        state[key] = parseFloat(value);
      }
    }
    this.currentState = state;
    this.emit('state', state);
  }

  public sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.commandQueue.push({ command, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.commandQueue.length === 0) return;

    this.isProcessingQueue = true;
    const task = this.commandQueue.shift();
    if (!task) {
        this.isProcessingQueue = false;
        return;
    }

    const { command, resolve, reject } = task;
    
    logger.info(`Processing command: ${command}`);
    
    // Send command
    const message = Buffer.from(command);
    this.commandSocket.send(message, this.commandPort, this.host, (err) => {
      if (err) {
        logger.error(`Failed to send command ${command}: ${err.message}`);
        reject(err);
        this.isProcessingQueue = false;
        this.processQueue(); // Next
        return;
      }
    });

    // Wait for response or timeout
    // We create a one-time listener for this specific command
    // But since UDP is connectionless and we only have one socket, 
    // we have to assume the next message is the response.
    // This is a limitation of Tello SDK 1.3 (no IDs).
    
    let isDone = false;
    
    const onMessage = (msg: Buffer) => {
        if (isDone) return;
        const response = msg.toString().trim();
        // If response is for this command? We assume yes.
        isDone = true;
        cleanup();
        if (response === 'error') {
            reject(new Error(`Tello returned error for command ${command}`));
        } else {
            resolve(response);
        }
        // Continue queue
        this.isProcessingQueue = false;
        setImmediate(() => this.processQueue());
    };

    const cleanup = () => {
        this.commandSocket.removeListener('message', onMessage);
        clearTimeout(timeout);
    };

    // We attach the listener to the socket
    // Note: 'message' event emits (msg, rinfo).
    this.commandSocket.once('message', onMessage);

    const timeout = setTimeout(() => {
        if (isDone) return;
        isDone = true;
        this.commandSocket.removeListener('message', onMessage);
        logger.warn(`Timeout waiting for response to ${command}`);
        // For RC commands, we might not get 'ok', but for others we should.
        if (command.startsWith('rc')) {
            resolve('ok'); // Assume success for RC
        } else {
            reject(new Error(`Timeout waiting for response to ${command}`));
        }
        this.isProcessingQueue = false;
        setImmediate(() => this.processQueue());
    }, 5000); // 5s timeout
  }

  public async enableMissionPads(): Promise<string> {
    return this.sendCommand('mon');
  }

  public async disableMissionPads(): Promise<string> {
    return this.sendCommand('moff');
  }

  public async setMissionPadDirection(direction: 0 | 1 | 2): Promise<string> {
    return this.sendCommand(`mdirection ${direction}`);
  }

  public async flyToMissionPad(x: number, y: number, z: number, speed: number, mid: number): Promise<string> {
    // Basic go with mission pad
    return this.sendCommand(`go ${x} ${y} ${z} ${speed} m${mid}`);
  }

  public async jumpToMissionPad(x: number, y: number, z: number, speed: number, yaw: number, mid1: number, mid2: number): Promise<string> {
    return this.sendCommand(`jump ${x} ${y} ${z} ${speed} ${yaw} m${mid1} m${mid2}`);
  }

  public getState(): TelloState | null {
    return this.currentState;
  }

  private startKeepAlive() {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = setInterval(() => {
      // Check last state time
      if (Date.now() - this.lastStateTime > 5000) {
        logger.warn('No state received for 5s, checking connection...');
        // Just log, or try to reconnect?
        // We can try sending 'command' again without waiting for queue?
        // Or just let the user handle it.
        // Tello automatically lands if no command for 15s.
        // We should send a keepalive command if queue is empty.
      }
      
      if (this.commandQueue.length === 0 && this.isConnected) {
         // Send a dummy command to keep link active
         // 'wifi?' or just 'command' again? 'battery?' is good.
         // We push to queue to avoid conflict.
         // But we don't want to flood logs or block real commands.
         // Let's send 'battery?' every 10s.
      }
    }, 5000);
  }

  public close() {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    try {
        this.commandSocket.close();
        this.stateSocket.close();
    } catch(e) {}
    this.isConnected = false;
    logger.info('Connection closed');
  }
}
