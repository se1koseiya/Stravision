"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionManager = void 0;
const tello_client_js_1 = require("./tello-client.js");
const config_js_1 = require("./config.js");
class MissionManager {
    constructor(telloClient) {
        this.isRunning = false;
        this.currentLoop = 0;
        this.totalLoops = 0;
        this.padA = 0;
        this.padB = 0;
        this.tello = telloClient;
    }
    async startCruise(padA, padB, loops) {
        if (this.isRunning) {
            throw new Error('Mission already running');
        }
        this.isRunning = true;
        this.currentLoop = 0;
        this.totalLoops = loops;
        this.padA = padA;
        this.padB = padB;
        tello_client_js_1.logger.info(`Starting cruise mission: Pad ${padA} <-> Pad ${padB}, ${loops} loops`);
        try {
            // 1. Enable Mission Pads
            await this.tello.enableMissionPads();
            await this.tello.setMissionPadDirection(0); // Downward detection
            // 2. Takeoff
            await this.tello.sendCommand('takeoff');
            await this.wait(5000);
            // 3. Start Loop
            await this.runLoop();
        }
        catch (error) {
            tello_client_js_1.logger.error('Mission failed', { error });
            this.isRunning = false;
            try {
                await this.tello.sendCommand('land');
            }
            catch (e) { }
            throw error;
        }
    }
    async runLoop() {
        if (!this.isRunning)
            return;
        while (this.currentLoop < this.totalLoops && this.isRunning) {
            this.currentLoop++;
            tello_client_js_1.logger.info(`Starting loop ${this.currentLoop}/${this.totalLoops}`);
            // Go to Pad A
            tello_client_js_1.logger.info(`Flying to Pad ${this.padA}`);
            await this.tello.flyToMissionPad(0, 0, 100, 50, this.padA);
            await this.performScan(this.padA);
            if (!this.isRunning)
                break;
            // Go to Pad B
            tello_client_js_1.logger.info(`Flying to Pad ${this.padB}`);
            await this.tello.flyToMissionPad(0, 0, 100, 50, this.padB);
            await this.performScan(this.padB);
        }
        if (this.isRunning) {
            tello_client_js_1.logger.info('Mission completed, landing...');
            await this.tello.sendCommand('land');
            await this.tello.disableMissionPads();
            this.isRunning = false;
        }
    }
    async performScan(padId) {
        tello_client_js_1.logger.info(`Scanning at Pad ${padId}...`);
        // TODO: Implement actual photo capture and AI analysis
        // For now, simulate delay and mock response
        await this.wait(2000);
        // Simulate sending to AI assistant
        const aiUrl = `${config_js_1.config.stravision.url}/api/vlm/analyze-frame`;
        tello_client_js_1.logger.info(`[MOCK] Photo taken at Pad ${padId}, would send to AI at ${aiUrl}`);
        // In a real implementation:
        // 1. Capture frame from UDP 11111 (requires ffmpeg or h264 parser)
        // 2. POST frame to Next.js API
        // 3. Log result
    }
    stopMission() {
        if (this.isRunning) {
            tello_client_js_1.logger.info('Stopping mission...');
            this.isRunning = false;
            // We don't await land here to return immediately, but we could trigger emergency if needed
            // Standard stop just breaks the loop and lands gracefully
        }
    }
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.MissionManager = MissionManager;
