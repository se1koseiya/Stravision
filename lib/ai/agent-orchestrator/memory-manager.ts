/**
 * 记忆管理器
 * 
 * 实现三层记忆架构：
 * - 短期记忆（STM）：最近的动作和观察
 * - 工作记忆（WM）：当前会话的目标和状态
 * - 长期记忆（LTM）：持久化的用户偏好和模式（TODO: 数据库实现）
 */

import { AgentMemory, ShortTermMemory, WorkingMemory, LongTermMemory, Action, Observation } from './types';

export class MemoryManager {
  private memory: AgentMemory;

  constructor() {
    this.memory = {
      shortTerm: {
        recentActions: [],
        recentObservations: [],
        maxSize: 10
      },
      longTerm: {
        userPreferences: {},
        devicePatterns: [],
        successfulStrategies: []
      },
      working: {
        subGoals: [],
        completedSteps: [],
        pendingActions: []
      }
    };
  }

  /**
   * 添加动作到短期记忆
   */
  addAction(action: Action): void {
    this.memory.shortTerm.recentActions.push(action);

    // 保持滑动窗口
    if (this.memory.shortTerm.recentActions.length > this.memory.shortTerm.maxSize) {
      this.memory.shortTerm.recentActions.shift();
    }

    console.log(`[MemoryManager] Added action: ${action.type}, total: ${this.memory.shortTerm.recentActions.length}`);
  }

  /**
   * 添加观察到短期记忆
   */
  addObservation(observation: Observation): void {
    this.memory.shortTerm.recentObservations.push(observation);

    // 保持滑动窗口（观察可以保留更多）
    const maxObservations = this.memory.shortTerm.maxSize * 2;
    if (this.memory.shortTerm.recentObservations.length > maxObservations) {
      this.memory.shortTerm.recentObservations.shift();
    }

    console.log(`[MemoryManager] Added observation: ${observation.type}, importance: ${observation.importance}`);
  }

  /**
   * 设置当前目标
   */
  setCurrentGoal(goal: string): void {
    this.memory.working.currentGoal = goal;
    this.memory.working.subGoals = [];
    this.memory.working.completedSteps = [];
    this.memory.working.pendingActions = [];

    console.log(`[MemoryManager] Set current goal: ${goal}`);
  }

  /**
   * 添加子目标
   */
  addSubGoal(subGoal: string): void {
    this.memory.working.subGoals.push(subGoal);
    console.log(`[MemoryManager] Added sub-goal: ${subGoal}`);
  }

  /**
   * 标记步骤完成
   */
  completeStep(step: string): void {
    this.memory.working.completedSteps.push(step);
    console.log(`[MemoryManager] Completed step: ${step}`);
  }

  /**
   * 添加待处理动作
   */
  addPendingAction(action: Action): void {
    this.memory.working.pendingActions.push(action);
    console.log(`[MemoryManager] Added pending action: ${action.type}`);
  }

  /**
   * 移除待处理动作
   */
  removePendingAction(actionId: string): void {
    this.memory.working.pendingActions = this.memory.working.pendingActions.filter(
      a => a.id !== actionId
    );
    console.log(`[MemoryManager] Removed pending action: ${actionId}`);
  }

  /**
   * 获取最近的动作
   */
  getRecentActions(count?: number): Action[] {
    if (count) {
      return this.memory.shortTerm.recentActions.slice(-count);
    }
    return [...this.memory.shortTerm.recentActions];
  }

  /**
   * 获取最近的观察
   */
  getRecentObservations(count?: number): Observation[] {
    if (count) {
      return this.memory.shortTerm.recentObservations.slice(-count);
    }
    return [...this.memory.shortTerm.recentObservations];
  }

  /**
   * 获取重要的观察（importance > 0.7）
   */
  getImportantObservations(): Observation[] {
    return this.memory.shortTerm.recentObservations.filter(obs => obs.importance > 0.7);
  }

  /**
   * 获取当前工作记忆
   */
  getWorkingMemory(): WorkingMemory {
    return { ...this.memory.working };
  }

  /**
   * 获取完整记忆
   */
  getMemory(): AgentMemory {
    return JSON.parse(JSON.stringify(this.memory));
  }

  /**
   * 生成记忆摘要（用于注入到 prompt）
   */
  generateMemorySummary(): string {
    const summary: string[] = [];

    // 当前目标
    if (this.memory.working.currentGoal) {
      summary.push(`## 当前目标\n${this.memory.working.currentGoal}`);
    }

    // 已完成的步骤
    if (this.memory.working.completedSteps.length > 0) {
      summary.push(`\n## 已完成步骤\n${this.memory.working.completedSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    }

    // 待处理动作
    if (this.memory.working.pendingActions.length > 0) {
      summary.push(`\n## 待处理动作\n${this.memory.working.pendingActions.map(a => `- ${a.type}: ${JSON.stringify(a.params)}`).join('\n')}`);
    }

    // 最近的动作
    const recentActions = this.getRecentActions(3);
    if (recentActions.length > 0) {
      summary.push(`\n## 最近执行的动作\n${recentActions.map(a => `- ${a.type} (${a.status})`).join('\n')}`);
    }

    // 重要的观察
    const importantObs = this.getImportantObservations();
    if (importantObs.length > 0) {
      summary.push(`\n## 重要观察\n${importantObs.map(o => `- ${o.type}: ${JSON.stringify(o.data)}`).join('\n')}`);
    }

    return summary.join('\n');
  }

  /**
   * 清除工作记忆（会话结束时）
   */
  clearWorkingMemory(): void {
    this.memory.working = {
      subGoals: [],
      completedSteps: [],
      pendingActions: []
    };
    console.log('[MemoryManager] Cleared working memory');
  }

  /**
   * 清除短期记忆
   */
  clearShortTermMemory(): void {
    this.memory.shortTerm.recentActions = [];
    this.memory.shortTerm.recentObservations = [];
    console.log('[MemoryManager] Cleared short-term memory');
  }

  /**
   * 重置所有记忆
   */
  reset(): void {
    this.clearWorkingMemory();
    this.clearShortTermMemory();
    console.log('[MemoryManager] Reset all memory');
  }

  /**
   * 保存用户偏好（长期记忆）
   */
  setUserPreference(key: string, value: any): void {
    this.memory.longTerm.userPreferences[key] = value;
    console.log(`[MemoryManager] Set user preference: ${key} = ${JSON.stringify(value)}`);
    
    // TODO: 持久化到数据库
  }

  /**
   * 获取用户偏好
   */
  getUserPreference(key: string): any {
    return this.memory.longTerm.userPreferences[key];
  }

  /**
   * 获取所有用户偏好
   */
  getAllUserPreferences(): Record<string, any> {
    return { ...this.memory.longTerm.userPreferences };
  }
}

// 导出单例（每个会话应该有自己的实例，这里提供工厂函数）
export function createMemoryManager(): MemoryManager {
  return new MemoryManager();
}
