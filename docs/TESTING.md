# Stravision 莓界 - 专业测试流程

本文档详细介绍了 Stravision 智慧农业物联网平台的测试策略、工具链及执行流程，旨在确保系统的稳定性、可靠性与高质量交付。

## 1. 测试策略概览 (Testing Strategy)

本项目采用分层测试策略（测试金字塔），从下至上依次为：

| 测试层级 | 关注点 | 工具栈 | 覆盖范围 |
| :--- | :--- | :--- | :--- |
| **E2E (端到端) 测试** | 关键业务流程、用户体验 | **Playwright** (推荐) | 登录、设备控制、大屏监控、AI 对话 |
| **集成测试 (Integration)** | 模块间交互、API 接口、数据库操作 | **Vitest**, **Supertest** | API Routes, Prisma, MQTT 消息处理 |
| **单元测试 (Unit)** | 独立函数、组件、Hooks、工具类 | **Vitest**, **React Testing Library** | Components, Utils, Hooks, Reducers |
| **静态分析 (Static Analysis)** | 代码规范、类型安全 | **ESLint**, **TypeScript**, **Prettier** | 全项目代码 |

---

## 2. 环境准备 (Environment Setup)

在开始测试之前，请确保本地开发环境已准备就绪。

### 2.1 安装依赖
```bash
pnpm install
```

### 2.2 配置测试环境变量
复制 `.env.example` 为 `.env.test`，并配置测试专用的数据库（建议使用 SQLite 或独立的 PostgreSQL Schema 以避免污染开发数据）。

```bash
# .env.test 示例
DATABASE_URL="file:./test.db"  # 或测试专用的 PostgreSQL URL
MQTT_BROKER_URL="mqtt://localhost:1883"
```

---

## 3. 单元测试与组件测试 (Unit & Component Testing)

我们使用 **Vitest** 作为主要的测试运行器，它兼容 Jest API 但速度更快，且完美支持 TypeScript 和 ESM。

### 3.1 运行单元测试
```bash
# 运行所有单元测试
pnpm test

# 监听模式（开发时使用）
pnpm test:watch

# 生成覆盖率报告
pnpm test --coverage
```

### 3.2 编写测试用例规范
*   **文件命名**：测试文件应与源文件同名，后缀为 `.test.ts` 或 `.test.tsx`（例如 `components/Button.tsx` -> `components/Button.test.tsx`）。
*   **测试结构**：使用 `describe` 分组，`it` 或 `test` 定义用例，`expect` 进行断言。

#### 示例：测试工具函数 (Utils)
```typescript
// lib/utils/math.test.ts
import { describe, it, expect } from 'vitest';
import { calculateGrowthRate } from './plant-analysis-helper';

describe('calculateGrowthRate', () => {
  it('should return correct growth rate', () => {
    const rate = calculateGrowthRate(10, 15); // initial, final
    expect(rate).toBe(0.5); // 50% growth
  });
});
```

#### 示例：测试 React 组件 (Components)
```typescript
// components/ui/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';
import { describe, it, expect, vi } from 'vitest';

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 4. 集成测试 (Integration Testing)

集成测试主要关注 API 接口与数据库的交互，以及 MQTT 消息的流转。

### 4.1 API 路由测试
对于 Next.js 的 API Routes，建议模拟 Request 对象并验证 Response。

```typescript
// app/api/device/control/route.test.ts
import { GET } from './route';
import { describe, it, expect, vi } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  db: {
    device: {
      findMany: vi.fn().mockResolvedValue([{ id: '1', name: 'Sensor A' }]),
    },
  },
}));

describe('GET /api/device/control', () => {
  it('returns a list of devices', async () => {
    const req = new Request('http://localhost:3000/api/device/control');
    const res = await GET(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Sensor A');
  });
});
```

### 4.2 IoT/MQTT 集成测试
使用内存中的 MQTT Broker (如 `aedes`) 或 Mock Client 来模拟设备通信。

```typescript
// tests/mqtt/integration.test.ts
// 伪代码示例
import mqtt from 'mqtt';
import { createServer } from 'aedes';

describe('MQTT Integration', () => {
  let broker;
  let client;

  beforeAll((done) => {
    broker = createServer();
    broker.listen(1883, done);
  });

  afterAll((done) => {
    broker.close(done);
  });

  it('should receive device status update', (done) => {
    client = mqtt.connect('mqtt://localhost:1883');
    client.on('connect', () => {
      client.subscribe('device/+/status');
      client.publish('device/123/status', JSON.stringify({ temp: 25 }));
    });

    client.on('message', (topic, message) => {
      expect(topic).toBe('device/123/status');
      expect(JSON.parse(message.toString()).temp).toBe(25);
      client.end();
      done();
    });
  });
});
```

---

## 5. 端到端 (E2E) 测试 (推荐)

目前项目尚未集成 E2E 测试框架，强烈建议引入 **Playwright** 以覆盖关键用户旅程。

### 5.1 安装 Playwright
```bash
pnpm create playwright
```

### 5.2 关键测试场景
1.  **用户登录流程**：验证登录成功、Token 存储及页面跳转。
2.  **仪表盘加载**：验证关键数据图表是否渲染。
3.  **设备控制**：模拟点击开关 -> 验证 API 调用 -> 验证 UI 状态更新。
4.  **AI 助手对话**：发送消息 -> 等待流式响应结束 -> 验证内容。

### 5.3 示例 E2E 测试脚本
```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login and view dashboard', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // 等待跳转到 Dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

---

## 6. 持续集成 (CI/CD)

建议在 GitHub Actions 中配置自动化测试流程，确保每次代码提交 (Push) 或合并请求 (PR) 都能通过所有测试。

### `.github/workflows/test.yml` 参考配置

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install

      - name: Run Linter
        run: pnpm lint

      - name: Run Unit & Integration Tests
        run: pnpm test

      - name: Build Project (Ensure no build errors)
        run: pnpm build
```

---

## 7. 性能测试 (Performance Testing)

对于高并发场景（如大量设备同时上报数据），建议使用 **k6** 进行负载测试。

*   **关注指标**：API 响应时间 (Latnecy)、吞吐量 (RPS)、数据库连接数。
*   **测试目标**：确保在 1000+ 设备并发连接下系统依然稳定。

---

## 8. 总结与建议

1.  **优先补充关键路径的 E2E 测试**：登录、监控、控制是核心价值，必须保证 100% 可用。
2.  **完善 Mock 数据**：为 AI 和 IoT 接口建立完善的 Mock 数据集，避免测试依赖外部不稳定服务。
3.  **代码覆盖率目标**：
    *   核心工具类 (Utils): > 90%
    *   业务组件 (Components): > 70%
    *   API 接口: > 80%

遵循此流程，Stravision 平台将具备企业级的质量保障体系。
