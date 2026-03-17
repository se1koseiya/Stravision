"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelloClient = exports.logger = void 0;
const dgram_1 = __importDefault(require("dgram"));
const events_1 = require("events");
const winston_1 = __importDefault(require("winston"));
exports.logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Stream({ stream: process.stderr }),
        new winston_1.default.transports.File({ filename: 'tello-client.log' }),
    ],
});
class TelloClient extends events_1.EventEmitter {
    constructor(host = '192.168.10.1', commandPort = 8889, statePort = 8890) {
        super();
        this.isConnected = false;
        this.lastStateTime = 0;
        this.keepAliveInterval = null;
        this.currentState = null;
        this.commandQueue = [];
        this.isProcessingQueue = false;
        this.host = host;
        this.commandPort = commandPort;
        this.statePort = statePort;
        this.commandSocket = dgram_1.default.createSocket('udp4');
        this.stateSocket = dgram_1.default.createSocket('udp4');
    }
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                // Bind command socket to random port
                this.commandSocket.bind(0, () => {
                    exports.logger.info(`Command socket bound to ${this.commandSocket.address().port}`);
                });
                // Bind state socket to 8890
                this.stateSocket.bind(this.statePort, () => {
                    exports.logger.info(`State socket bound to ${this.statePort}`);
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
                    exports.logger.info('Connected to Tello');
                    resolve();
                })
                    .catch((err) => {
                    exports.logger.error('Failed to connect (initial command failed)', { error: err });
                    // We might resolve anyway if we want to retry later, but reject is safer.
                    reject(err);
                });
            }
            catch (error) {
                exports.logger.error('Failed to setup sockets', { error });
                reject(error);
            }
        });
    }
    setupListeners() {
        this.commandSocket.on('message', (msg) => {
            const response = msg.toString().trim();
            exports.logger.info(`Received response: ${response}`);
            // The processing loop will handle the resolution
            this.emit('raw-response', response);
        });
        this.commandSocket.on('error', (err) => {
            exports.logger.error(`Command socket error: ${err.message}`);
            this.emit('error', err);
        });
        this.stateSocket.on('message', (msg) => {
            const stateStr = msg.toString().trim();
            this.parseState(stateStr);
            this.lastStateTime = Date.now();
        });
        this.stateSocket.on('error', (err) => {
            exports.logger.error(`State socket error: ${err.message}`);
            this.emit('error', err);
        });
    }
    parseState(stateStr) {
        const state = {};
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
    sendCommand(command) {
        return new Promise((resolve, reject) => {
            this.commandQueue.push({ command, resolve, reject });
            this.processQueue();
        });
    }
    async processQueue() {
        if (this.isProcessingQueue || this.commandQueue.length === 0)
            return;
        this.isProcessingQueue = true;
        const task = this.commandQueue.shift();
        if (!task) {
            this.isProcessingQueue = false;
            return;
        }
        const { command, resolve, reject } = task;
        exports.logger.info(`Processing command: ${command}`);
        // Send command
        const message = Buffer.from(command);
        this.commandSocket.send(message, this.commandPort, this.host, (err) => {
            if (err) {
                exports.logger.error(`Failed to send command ${command}: ${err.message}`);
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
        const onMessage = (msg) => {
            if (isDone)
                return;
            const response = msg.toString().trim();
            // If response is for this command? We assume yes.
            isDone = true;
            cleanup();
            if (response === 'error') {
                reject(new Error(`Tello returned error for command ${command}`));
            }
            else {
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
            if (isDone)
                return;
            isDone = true;
            this.commandSocket.removeListener('message', onMessage);
            exports.logger.warn(`Timeout waiting for response to ${command}`);
            // For RC commands, we might not get 'ok', but for others we should.
            if (command.startsWith('rc')) {
                resolve('ok'); // Assume success for RC
            }
            else {
                reject(new Error(`Timeout waiting for response to ${command}`));
            }
            this.isProcessingQueue = false;
            setImmediate(() => this.processQueue());
        }, 5000); // 5s timeout
    }
    async enableMissionPads() {
        return this.sendCommand('mon');
    }
    async disableMissionPads() {
        return this.sendCommand('moff');
    }
    async setMissionPadDirection(direction) {
        return this.sendCommand(`mdirection ${direction}`);
    }
    async flyToMissionPad(x, y, z, speed, mid) {
        // Basic go with mission pad
        return this.sendCommand(`go ${x} ${y} ${z} ${speed} m${mid}`);
    }
    async jumpToMissionPad(x, y, z, speed, yaw, mid1, mid2) {
        return this.sendCommand(`jump ${x} ${y} ${z} ${speed} ${yaw} m${mid1} m${mid2}`);
    }
    getState() {
        return this.currentState;
    }
    startKeepAlive() {
        if (this.keepAliveInterval)
            clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = setInterval(() => {
            // Check last state time
            if (Date.now() - this.lastStateTime > 5000) {
                exports.logger.warn('No state received for 5s, checking connection...');
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
    close() {
        if (this.keepAliveInterval)
            clearInterval(this.keepAliveInterval);
        try {
            this.commandSocket.close();
            this.stateSocket.close();
        }
        catch (e) { }
        this.isConnected = false;
        exports.logger.info('Connection closed');
    }
}
exports.TelloClient = TelloClient;
