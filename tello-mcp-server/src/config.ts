import dotenv from 'dotenv';

dotenv.config();

export const config = {
  tello: {
    ip: process.env.TELLO_IP || '192.168.10.1',
    commandPort: parseInt(process.env.TELLO_COMMAND_PORT || '8889', 10),
    statePort: parseInt(process.env.TELLO_STATE_PORT || '8890', 10),
    localPort: parseInt(process.env.TELLO_LOCAL_PORT || '8889', 10), // Port to listen for responses
  },
  api: {
    port: parseInt(process.env.API_PORT || '3001', 10),
  },
  stravision: {
    url: process.env.STRAVISION_URL || 'http://localhost:3000',
  },
  mcp: {
    name: 'tello-mcp-server',
    version: '1.0.0',
  }
};
