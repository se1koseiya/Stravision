/**
 * 匹配器测试
 */

import { describe, it, expect } from '@jest/globals';
import { KeywordMatcher, IntentMatcher, SkillMatcher } from '../matchers';
import { Skill } from '../types';

describe('KeywordMatcher', () => {
  const matcher = new KeywordMatcher();

  const mockSkill: Skill = {
    id: 'test-skill',
    name: '测试技能',
    description: '用于测试的技能',
    keywords: ['测试', '控制', '开'],
    content: '测试内容',
    source: 'builtin'
  };

  it('应该匹配长关键词', () => {
    const result = matcher.match(mockSkill, {
      userMessage: '我想测试一下'
    });

    expect(result).not.toBeNull();
    expect(result?.matchScore).toBeGreaterThan(80);
  });

  it('应该匹配短关键词（带上下文）', () => {
    const result = matcher.match(mockSkill, {
      userMessage: '帮我开启设备'
    });

    expect(result).not.toBeNull();
  });

  it('不应该匹配短关键词（无上下文）', () => {
    const result = matcher.match(mockSkill, {
      userMessage: '开心'
    });

    expect(result).toBeNull();
  });

  it('应该匹配技能描述', () => {
    const result = matcher.match(mockSkill, {
      userMessage: '用于测试'
    });

    expect(result).not.toBeNull();
    expect(result?.matchScore).toBe(70);
  });

  it('应该匹配技能 ID', () => {
    const result = matcher.match(mockSkill, {
      userMessage: 'test-skill'
    });

    expect(result).not.toBeNull();
    expect(result?.matchScore).toBe(95);
  });
});

describe('IntentMatcher', () => {
  const matcher = new IntentMatcher();

  it('应该匹配控制意图', () => {
    const mockSkill: Skill = {
      id: 'iot-control',
      name: 'IoT 控制',
      description: '设备控制',
      keywords: ['控制'],
      content: '内容',
      source: 'disk'
    };

    const result = matcher.match(mockSkill, {
      userMessage: '帮我控制设备'
    });

    expect(result).not.toBeNull();
    expect(result?.matchScore).toBe(85);
  });

  it('应该匹配规划意图', () => {
    const mockSkill: Skill = {
      id: 'implementation-workflow',
      name: '执行工作流',
      description: '任务规划',
      keywords: ['计划'],
      content: '内容',
      source: 'disk'
    };

    const result = matcher.match(mockSkill, {
      userMessage: '帮我制定一个计划'
    });

    expect(result).not.toBeNull();
    expect(result?.matchScore).toBe(80);
  });

  it('不应该匹配不相关的技能', () => {
    const mockSkill: Skill = {
      id: 'other-skill',
      name: '其他技能',
      description: '其他',
      keywords: ['其他'],
      content: '内容',
      source: 'disk'
    };

    const result = matcher.match(mockSkill, {
      userMessage: '帮我控制设备'
    });

    expect(result).toBeNull();
  });
});

describe('SkillMatcher', () => {
  const matcher = new SkillMatcher();

  const mockSkills: Skill[] = [
    {
      id: 'core-identity',
      name: '核心身份',
      description: '身份定位',
      keywords: ['你是谁'],
      autoLoad: true,
      priority: 100,
      content: '我是莓小智',
      source: 'builtin'
    },
    {
      id: 'iot-control',
      name: 'IoT 控制',
      description: '设备控制',
      keywords: ['控制', '设备'],
      priority: 90,
      content: '控制内容',
      source: 'disk'
    },
    {
      id: 'implementation-workflow',
      name: '执行工作流',
      description: '任务规划',
      keywords: ['计划', '任务'],
      priority: 85,
      dependencies: ['iot-control'],
      content: '工作流内容',
      source: 'disk'
    }
  ];

  it('应该自动加载核心技能', () => {
    const results = matcher.matchSkills(mockSkills, {
      userMessage: '你好'
    });

    const coreSkill = results.find(r => r.skill.id === 'core-identity');
    expect(coreSkill).toBeDefined();
    expect(coreSkill?.matchScore).toBe(100);
  });

  it('应该匹配相关技能', () => {
    const results = matcher.matchSkills(mockSkills, {
      userMessage: '帮我控制设备'
    });

    const iotSkill = results.find(r => r.skill.id === 'iot-control');
    expect(iotSkill).toBeDefined();
  });

  it('应该自动加载依赖技能', () => {
    const results = matcher.matchSkills(mockSkills, {
      userMessage: '帮我制定计划'
    });

    const workflowSkill = results.find(r => r.skill.id === 'implementation-workflow');
    const iotSkill = results.find(r => r.skill.id === 'iot-control');

    expect(workflowSkill).toBeDefined();
    expect(iotSkill).toBeDefined();
    expect(iotSkill?.matchReason).toContain('依赖');
  });

  it('应该按优先级排序', () => {
    const results = matcher.matchSkills(mockSkills, {
      userMessage: '控制设备'
    });

    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i];
      const next = results[i + 1];
      
      const currentPriority = current.skill.priority || 0;
      const nextPriority = next.skill.priority || 0;

      expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
    }
  });
});
