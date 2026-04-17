/**
 * 光谱工具连接池
 * 
 * 通过复用SSE连接和MCP会话，大幅减少光谱工具的调用延迟
 * 预期性能提升：从8-12秒降低到1-2秒
 */

interface SpectrumConnection {
  endpoint: string;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  lastUsed: number;
  sessionInitialized: boolean;
}

class SpectrumConnectionPool {
  private connections: Map<string, SpectrumConnection> = new Map();
  private readonly SSE_URL = 'http://8.153.175.190:8000/spectrum-stravision';
  private readonly MAX_IDLE_TIME = 60000; // 60秒空闲后关闭连接
  private readonly INIT_TIMEOUT = 2000; // 初始化超时2秒
  private readonly TOOL_TIMEOUT = 3000; // 工具调用超时3秒
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 启动定期清理任务
    this.startCleanup();
  }

  /**
   * 获取或创建连接
   */
  async getConnection(): Promise<SpectrumConnection> {
    const existing = this.connections.get(this.SSE_URL);
    
    // 如果存在有效连接，直接返回
    if (existing && this.isConnectionValid(existing)) {
      existing.lastUsed = Date.now();
      console.log('[SpectrumPool] Reusing existing connection');
      return existing;
    }

    // 创建新连接
    console.log('[SpectrumPool] Creating new connection');
    return await this.createConnection();
  }

  /**
   * 创建新的SSE连接并完成MCP握手
   */
  private async createConnection(): Promise<SpectrumConnection> {
    try {
      // 1. 建立SSE连接
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.INIT_TIMEOUT);

      const sseRes = await fetch(this.SSE_URL, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!sseRes.ok || !sseRes.body) {
        throw new Error(`SSE连接失败: ${sseRes.status}`);
      }

      const reader = sseRes.body.getReader();
      const decoder = new TextDecoder();

      // 2. 读取endpoint
      const endpoint = await this.readEndpoint(reader, decoder);
      if (!endpoint) {
        throw new Error('无法获取endpoint');
      }

      // 3. 执行MCP握手
      await this.performMCPHandshake(endpoint, reader, decoder);

      // 4. 保存连接
      const connection: SpectrumConnection = {
        endpoint,
        reader,
        lastUsed: Date.now(),
        sessionInitialized: true
      };

      this.connections.set(this.SSE_URL, connection);
      console.log('[SpectrumPool] Connection established and initialized');

      return connection;

    } catch (error) {
      console.error('[SpectrumPool] Failed to create connection:', error);
      throw error;
    }
  }

  /**
   * 从SSE流中读取endpoint
   */
  private async readEndpoint(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder
  ): Promise<string | null> {
    let buffer = '';
    const startTime = Date.now();

    while (Date.now() - startTime < this.INIT_TIMEOUT) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const eventMatch = buffer.match(/event:\s*endpoint[\s\S]*?data:\s*([^\n\r]+)/);
      if (eventMatch && eventMatch[1]) {
        const endpointPath = eventMatch[1].trim().replace(/^["']|["']$/g, '');
        return `http://8.153.175.190:8000${endpointPath}`;
      }
    }

    return null;
  }

  /**
   * 执行MCP协议握手
   */
  private async performMCPHandshake(
    endpoint: string,
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder
  ): Promise<void> {
    // 发送initialize请求
    const initBody = {
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          roots: { listChanged: false },
          sampling: {}
        },
        clientInfo: {
          name: "stravision-iot-platform",
          version: "1.0.0"
        }
      },
      id: Date.now()
    };

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(initBody)
    });

    // 等待initialize响应
    let buffer = '';
    const startTime = Date.now();

    while (Date.now() - startTime < this.INIT_TIMEOUT) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const messageMatch = buffer.match(/event:\s*message[\s\S]*?data:\s*({[\s\S]*?})\n\n/);
      if (messageMatch && messageMatch[1]) {
        try {
          const response = JSON.parse(messageMatch[1]);
          if (response.result) {
            // 发送initialized通知
            await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "notifications/initialized",
                params: {}
              })
            });
            return;
          }
        } catch (e) {
          console.error('[SpectrumPool] Failed to parse init response:', e);
        }
      }
    }

    throw new Error('MCP握手超时');
  }

  /**
   * 使用连接执行工具调用
   */
  async executeToolCall(
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<any> {
    const connection = await this.getConnection();
    const decoder = new TextDecoder();

    try {
      // 决定使用resource还是tool
      const useResource = toolName === 'get_all_spectrum';

      const requestBody: any = {
        jsonrpc: "2.0",
        method: useResource ? "resources/read" : "tools/call",
        params: useResource ? {
          uri: "spectrum://channels"
        } : {
          name: toolName
        },
        id: Date.now()
      };

      if (!useResource && Object.keys(args).length > 0) {
        requestBody.params.arguments = args;
      }

      // 发送工具调用请求
      await fetch(connection.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // 读取响应
      let buffer = '';
      const startTime = Date.now();

      while (Date.now() - startTime < this.TOOL_TIMEOUT) {
        const { value, done } = await connection.reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const messageMatch = buffer.match(/event:\s*message[\s\S]*?data:\s*({[\s\S]*?})\n\n/);
        if (messageMatch && messageMatch[1]) {
          try {
            const responseData = JSON.parse(messageMatch[1]);

            if (responseData.result) {
              // 提取content
              if (responseData.result.content && Array.isArray(responseData.result.content)) {
                const textContent = responseData.result.content.find((c: any) => c.type === 'text');
                if (textContent) {
                  try {
                    return JSON.parse(textContent.text);
                  } catch {
                    return textContent.text;
                  }
                }
              }
              return responseData.result;
            }

            if (responseData.error) {
              throw new Error(responseData.error.message || 'Unknown error');
            }
          } catch (e) {
            console.error('[SpectrumPool] Failed to parse response:', e);
          }
        }
      }

      throw new Error('工具调用超时');

    } catch (error) {
      // 如果调用失败，关闭并移除连接
      this.closeConnection(this.SSE_URL);
      throw error;
    }
  }

  /**
   * 检查连接是否有效
   */
  private isConnectionValid(connection: SpectrumConnection): boolean {
    const idleTime = Date.now() - connection.lastUsed;
    return idleTime < this.MAX_IDLE_TIME && connection.sessionInitialized;
  }

  /**
   * 关闭连接
   */
  private closeConnection(url: string): void {
    const connection = this.connections.get(url);
    if (connection) {
      try {
        connection.reader.cancel();
      } catch (e) {
        // Ignore errors during cleanup
      }
      this.connections.delete(url);
      console.log('[SpectrumPool] Connection closed');
    }
  }

  /**
   * 启动定期清理任务
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [url, connection] of this.connections.entries()) {
        if (now - connection.lastUsed > this.MAX_IDLE_TIME) {
          console.log('[SpectrumPool] Cleaning up idle connection');
          this.closeConnection(url);
        }
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 清理所有连接
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    for (const url of this.connections.keys()) {
      this.closeConnection(url);
    }

    console.log('[SpectrumPool] All connections cleaned up');
  }
}

// 导出单例
export const spectrumConnectionPool = new SpectrumConnectionPool();

// 在应用关闭时清理
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    spectrumConnectionPool.cleanup();
  });
}
