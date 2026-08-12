/**
 * 匹配器测试
 */

import { describe, it, expect } from 'vitest';
import { KeywordMatcher, SkillMatcher } from '../matchers';
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
    // 使用 keywords 不覆盖但 description 包含的 query
    const skillWithDesc: Skill = {
      ...mockSkill,
      keywords: ['不相关的词'],
      description: '这是一个专门的农业诊断模块'
    };
    const result = matcher.match(skillWithDesc, {
      userMessage: '这是一个专门的农业诊断模块'
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
      id: 'ui-tags',
      name: 'UI 标签',
      description: 'UI 标签指南',
      keywords: ['标签'],
      autoLoad: true,
      priority: 99,
      dependencies: ['core-identity'],
      content: 'UI 标签内容',
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

  it('应该自动加载 autoLoad 技能', () => {
    const results = matcher.matchSkills(mockSkills, {
      userMessage: '你好'
    });

    const coreSkill = results.find(r => r.skill.id === 'core-identity');
    expect(coreSkill).toBeDefined();
    expect(coreSkill?.matchScore).toBe(100);
  });

  it('新架构下不再通过关键词/意图匹配非 autoLoad 技能（由 AI 自路由）', () => {
    // "帮我控制设备" 以前会命中 iot-control，现在不再走规则匹配
    const results = matcher.matchSkills(mockSkills, {
      userMessage: '帮我控制设备'
    });

    const iotSkill = results.find(r => r.skill.id === 'iot-control');
    expect(iotSkill).toBeUndefined();
  });

  it('应该自动加载 autoLoad 技能的依赖', () => {
    // ui-tags 是 autoLoad 且依赖 core-identity → core-identity 也应被加载
    // （core-identity 自身也是 autoLoad，所以必然存在）
    const results = matcher.matchSkills(mockSkills, {
      userMessage: '你好'
    });

    const uiTags = results.find(r => r.skill.id === 'ui-tags');
    const coreSkill = results.find(r => r.skill.id === 'core-identity');
    expect(uiTags).toBeDefined();
    expect(coreSkill).toBeDefined();
  });

  it('非 autoLoad 技能的依赖不会被加载（依赖信息已在清单中，由 AI 调用 load_skill 时处理）', () => {
    // implementation-workflow 依赖 iot-control，但两者都非 autoLoad
    // 新架构下两者都不会被 matchSkills 加载，AI 会通过 load_skill 工具按需加载
    const results = matcher.matchSkills(mockSkills, {
      userMessage: '帮我制定计划'
    });

    const workflowSkill = results.find(r => r.skill.id === 'implementation-workflow');
    const iotSkill = results.find(r => r.skill.id === 'iot-control');
    expect(workflowSkill).toBeUndefined();
    expect(iotSkill).toBeUndefined();
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
