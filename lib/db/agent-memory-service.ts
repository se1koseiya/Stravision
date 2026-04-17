/**
 * Agent 长期记忆数据库服务
 * 
 * 提供持久化的用户偏好、设备模式和成功策略存储
 */

import { getPool } from './database';

export interface UserPreference {
  id?: number;
  user_id: number;
  preference_key: string;
  preference_value: string;
  confidence: number;
  created_at: number;
  updated_at: number;
}

export interface DevicePattern {
  id?: number;
  user_id: number;
  device_id: number;
  pattern_type: string;
  pattern_data: string;
  confidence: number;
  success_count: number;
  total_count: number;
  created_at: number;
  updated_at: number;
}

export interface SuccessfulStrategy {
  id?: number;
  user_id: number;
  goal: string;
  steps: string;
  success_rate: number;
  avg_execution_time: number;
  conditions?: string;
  use_count: number;
  created_at: number;
  updated_at: number;
}

export interface AgentExecutionLog {
  id?: number;
  user_id: number;
  session_id: string;
  action_type: string;
  action_params?: string;
  result?: string;
  status: 'success' | 'failed' | 'timeout';
  execution_time?: number;
  error_message?: string;
  created_at: number;
}

/**
 * 用户偏好管理
 */
export async function getUserPreference(userId: number, key: string): Promise<UserPreference | null> {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM user_preferences WHERE user_id = $1 AND preference_key = $2',
    [userId, key]
  );
  return result.rows[0] || null;
}

export async function setUserPreference(pref: Omit<UserPreference, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  const pool = getPool();
  const now = Date.now();
  
  await pool.query(
    `INSERT INTO user_preferences (user_id, preference_key, preference_value, confidence, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, preference_key) 
     DO UPDATE SET preference_value = $3, confidence = $4, updated_at = $6`,
    [pref.user_id, pref.preference_key, pref.preference_value, pref.confidence, now, now]
  );
}

export async function getAllUserPreferences(userId: number): Promise<UserPreference[]> {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM user_preferences WHERE user_id = $1 ORDER BY confidence DESC',
    [userId]
  );
  return result.rows;
}

/**
 * 设备模式管理
 */
export async function getDevicePatterns(userId: number, deviceId?: number): Promise<DevicePattern[]> {
  const pool = getPool();
  
  if (deviceId !== undefined) {
    const result = await pool.query(
      'SELECT * FROM device_patterns WHERE user_id = $1 AND device_id = $2 ORDER BY confidence DESC',
      [userId, deviceId]
    );
    return result.rows;
  } else {
    const result = await pool.query(
      'SELECT * FROM device_patterns WHERE user_id = $1 ORDER BY confidence DESC',
      [userId]
    );
    return result.rows;
  }
}

export async function saveDevicePattern(pattern: Omit<DevicePattern, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  const pool = getPool();
  const now = Date.now();
  
  await pool.query(
    `INSERT INTO device_patterns (user_id, device_id, pattern_type, pattern_data, confidence, success_count, total_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [pattern.user_id, pattern.device_id, pattern.pattern_type, pattern.pattern_data, pattern.confidence, pattern.success_count, pattern.total_count, now, now]
  );
}

export async function updateDevicePatternStats(userId: number, deviceId: number, patternType: string, success: boolean): Promise<void> {
  const pool = getPool();
  const now = Date.now();
  
  const result = await pool.query(
    'SELECT * FROM device_patterns WHERE user_id = $1 AND device_id = $2 AND pattern_type = $3',
    [userId, deviceId, patternType]
  );
  
  if (result.rows.length > 0) {
    const pattern = result.rows[0];
    const newSuccessCount = success ? pattern.success_count + 1 : pattern.success_count;
    const newTotalCount = pattern.total_count + 1;
    const newConfidence = newSuccessCount / newTotalCount;
    
    await pool.query(
      'UPDATE device_patterns SET success_count = $1, total_count = $2, confidence = $3, updated_at = $4 WHERE id = $5',
      [newSuccessCount, newTotalCount, newConfidence, now, pattern.id]
    );
  }
}

/**
 * 成功策略管理
 */
export async function getSuccessfulStrategies(userId: number, goal?: string): Promise<SuccessfulStrategy[]> {
  const pool = getPool();
  
  if (goal) {
    const result = await pool.query(
      'SELECT * FROM successful_strategies WHERE user_id = $1 AND goal ILIKE $2 ORDER BY success_rate DESC, use_count DESC LIMIT 5',
      [userId, `%${goal}%`]
    );
    return result.rows;
  } else {
    const result = await pool.query(
      'SELECT * FROM successful_strategies WHERE user_id = $1 ORDER BY success_rate DESC, use_count DESC LIMIT 10',
      [userId]
    );
    return result.rows;
  }
}

export async function saveSuccessfulStrategy(strategy: Omit<SuccessfulStrategy, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  const pool = getPool();
  const now = Date.now();
  
  await pool.query(
    `INSERT INTO successful_strategies (user_id, goal, steps, success_rate, avg_execution_time, conditions, use_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [strategy.user_id, strategy.goal, strategy.steps, strategy.success_rate, strategy.avg_execution_time, strategy.conditions, strategy.use_count, now, now]
  );
}

export async function updateStrategyStats(userId: number, goal: string, executionTime: number, success: boolean): Promise<void> {
  const pool = getPool();
  const now = Date.now();
  
  const result = await pool.query(
    'SELECT * FROM successful_strategies WHERE user_id = $1 AND goal = $2',
    [userId, goal]
  );
  
  if (result.rows.length > 0) {
    const strategy = result.rows[0];
    const newUseCount = strategy.use_count + 1;
    const newAvgTime = Math.round((strategy.avg_execution_time * strategy.use_count + executionTime) / newUseCount);
    const newSuccessRate = success 
      ? (strategy.success_rate * strategy.use_count + 1) / newUseCount
      : (strategy.success_rate * strategy.use_count) / newUseCount;
    
    await pool.query(
      'UPDATE successful_strategies SET use_count = $1, avg_execution_time = $2, success_rate = $3, updated_at = $4 WHERE id = $5',
      [newUseCount, newAvgTime, newSuccessRate, now, strategy.id]
    );
  }
}

/**
 * 执行日志管理
 */
export async function logAgentExecution(log: Omit<AgentExecutionLog, 'id' | 'created_at'>): Promise<void> {
  const pool = getPool();
  const now = Date.now();
  
  await pool.query(
    `INSERT INTO agent_execution_logs (user_id, session_id, action_type, action_params, result, status, execution_time, error_message, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [log.user_id, log.session_id, log.action_type, log.action_params, log.result, log.status, log.execution_time, log.error_message, now]
  );
}

export async function getAgentExecutionLogs(userId: number, sessionId?: string, limit: number = 50): Promise<AgentExecutionLog[]> {
  const pool = getPool();
  
  if (sessionId) {
    const result = await pool.query(
      'SELECT * FROM agent_execution_logs WHERE user_id = $1 AND session_id = $2 ORDER BY created_at DESC LIMIT $3',
      [userId, sessionId, limit]
    );
    return result.rows;
  } else {
    const result = await pool.query(
      'SELECT * FROM agent_execution_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  }
}

export async function getAgentStats(userId: number, days: number = 7): Promise<{
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  topActions: Array<{ action: string; count: number }>;
}> {
  const pool = getPool();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  
  const statsResult = await pool.query(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      AVG(execution_time) as avg_time
     FROM agent_execution_logs 
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, since]
  );
  
  const topActionsResult = await pool.query(
    `SELECT action_type, COUNT(*) as count
     FROM agent_execution_logs
     WHERE user_id = $1 AND created_at >= $2
     GROUP BY action_type
     ORDER BY count DESC
     LIMIT 5`,
    [userId, since]
  );
  
  const stats = statsResult.rows[0];
  
  return {
    totalExecutions: parseInt(stats.total) || 0,
    successfulExecutions: parseInt(stats.successful) || 0,
    failedExecutions: parseInt(stats.failed) || 0,
    avgExecutionTime: Math.round(parseFloat(stats.avg_time)) || 0,
    topActions: topActionsResult.rows.map(row => ({
      action: row.action_type,
      count: parseInt(row.count)
    }))
  };
}
