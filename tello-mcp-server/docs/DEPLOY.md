# Tello Edge Control Node Deployment Guide

## Prerequisites

- Node.js (v18+)
- npm or pnpm
- A Tello Drone connected via WiFi
- Or a simulated Tello environment

## Installation

1. Clone the repository or copy the `tello-mcp-server` directory.
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the root directory:

```env
# Tello Configuration
TELLO_IP=192.168.10.1
TELLO_COMMAND_PORT=8889
TELLO_STATE_PORT=8890
TELLO_LOCAL_PORT=8889

# API Server Configuration
API_PORT=3000

# Logging
LOG_LEVEL=info
```

## Running the Server

### Development Mode
Runs with `ts-node` and hot-reloading (if nodemon is installed).

```bash
npm run dev
```

### Production Mode
Builds the TypeScript code and runs the optimized JS.

```bash
npm run build
npm start
```

## MCP Integration

To use this node as an MCP extension for an AI assistant (e.g., Claude Desktop, Trae, etc.):

1. Configure the AI assistant to use the MCP server.
2. Command to run:
   ```bash
   node /path/to/tello-mcp-server/dist/index.js
   ```
3. Ensure the environment variables are set or passed to the command.

## Troubleshooting

- **Connection Refused**: Ensure you are connected to the Tello WiFi network.
- **Port In Use**: Check if another Tello application is running (e.g., Tello App on phone).
- **No State Data**: Ensure firewall allows incoming UDP traffic on port 8890.
- **Command Timeout**: The drone might be too far or low battery.

## Logs

Logs are written to `tello-client.log` in the root directory.
Console logs are directed to `stderr` to avoid interfering with MCP Stdio protocol.
