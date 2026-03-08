import { config } from './config.js';
import { TelloClient, logger } from './tello-client.js';
import { TelloMcpServer } from './mcp-server.js';
import { ApiServer } from './api-server.js';

async function main() {
  logger.info('Starting Tello Edge Control Node...');

  const tello = new TelloClient(
    config.tello.ip,
    config.tello.commandPort,
    config.tello.statePort
  );

  const mcpServer = new TelloMcpServer(tello);
  const apiServer = new ApiServer(tello, config.api.port);

  // Connect to Tello
  try {
    await tello.connect();
    logger.info('Connected to Tello successfully');
  } catch (error) {
    logger.error('Failed to connect to Tello, starting in offline mode (will retry)', { error });
  }

  // Start Servers
  try {
    await mcpServer.start();
    apiServer.start();
    logger.info('All services started');
  } catch (error) {
    logger.error('Failed to start servers', { error });
    process.exit(1);
  }

  // Handle shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down...');
    tello.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Unhandled error in main', { error: err });
  process.exit(1);
});
