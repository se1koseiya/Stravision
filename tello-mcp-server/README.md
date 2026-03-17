+# Tello Drone Edge Control Node (MCP)

This project provides an independent edge control node for the Tello drone, designed to run as a Model Context Protocol (MCP) extension module for AI assistants.

## Features

- **MCP Server**: Exposes Tello control tools and state resources via Stdio (Standard Input/Output) for AI integration.
- **Mission Pad Cruise**: Automated A-B point cruising with simulated QR code scanning and AI analysis integration.
- **RESTful API**: HTTP endpoints for direct control and state retrieval.
- **WebSocket**: Real-time state streaming and command channel.
- **Reliability**: Automatic reconnection, keep-alive mechanism, and robust error handling.
- **Logging**: Comprehensive logs for debugging and auditing.

## Architecture

- **Tello Client**: Handles UDP communication with the drone (Command: 8889, State: 8890).
- **MCP Server**: Translates AI tool calls into drone commands.
- **API Server**: Provides HTTP/WS interface for external systems.

## Quick Start

1. Connect your computer to the Tello WiFi network.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```

## Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOY.md)
- [中文文档 (Chinese README)](README_CN.md)

## Requirements

- Node.js v18+
- Tello Drone (Ryze Tello / Tello EDU)

## License

MIT
