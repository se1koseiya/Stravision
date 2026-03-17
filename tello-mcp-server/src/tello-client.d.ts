import { EventEmitter } from 'events';
import winston from 'winston';
export declare const logger: winston.Logger;
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
export declare class TelloClient extends EventEmitter {
    private commandSocket;
    private stateSocket;
    private host;
    private commandPort;
    private statePort;
    private isConnected;
    private lastStateTime;
    private keepAliveInterval;
    private currentState;
    private commandQueue;
    private isProcessingQueue;
    constructor(host?: string, commandPort?: number, statePort?: number);
    connect(): Promise<void>;
    private setupListeners;
    private parseState;
    sendCommand(command: string): Promise<string>;
    private processQueue;
    getState(): TelloState | null;
    private startKeepAlive;
    close(): void;
}
//# sourceMappingURL=tello-client.d.ts.map