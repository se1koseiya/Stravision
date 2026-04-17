/**
 * 技能管理器测试
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SkillManager } from '../skill-manager';
import { Skill } from '../types';

describe('SkillManager', () => {
  let manager: SkillManager;

  beforeEach(() => {
    manager = new SkillManager();
    manager.clearCache();
  });

  describe('getAllSkills', () => {
    it('应该加载所有启用的技能', async () => {
      const skills = await manager.getAllSkills({
        enableBuiltinSkills: true,
        enableDiskSkills: true,
        enableDatabaseSkills: false
      });

      expect(skills.length).toBeGreaterThan(0);
      expect(skills.some(s => s.source === 'builtin')).toBe(true);
    });

    it('应该缓存技能加载结果', async () => {
      const skills1 = await manager.getAllSkills();
      const skills2 = await manager.getAllSkills();

      expect(skills1).toBe(skills2); // 应该返回相同的引用
    });
  });

  describe('matchSkills', () => {
    it('应该匹配设备控制相关的技能', async () => {
      const results = await manager.matchSkills({
        userMessage: '帮我开启风扇'
      });

      const iotSkill = results.find(r => r.skill.id === 'iot-control');
      expect(iotSkill).toBeDefined();
      expect(iotSkill?.matchScore).toBeGreaterThan(80);
    });

    it('应该匹配任务规划相关的技能', async () => {
      const results = await manager.matchSkills({
        userMessage: '帮我制定一个浇水计划'
      });

      const planningSkill = results.find(r => 
        r.skill.id === 'implementation-workflow' || 
        r.skill.keywords.some(k => k.includes('计划'))
      );
      expect(planningSkill).toBeDefined();
    });

    it('应该自动加载核心技能', async () => {
      const results = await manager.matchSkills({
        userMessage: '你好'
      });

      const coreSkills = results.filter(r => r.skill.autoLoad);
      expect(coreSkills.length).toBeGreaterThan(0);
    });

    it('应该按优先级和分数排序', async () => {
      const results = await manager.matchSkills({
        userMessage: '控制设备'
      });

      for (let i = 0; i < results.length - 1; i++) {
        const current = results[i];
        const next = results[i + 1];
        
        const currentPriority = current.skill.priority || 0;
        const nextPriority = next.skill.priority || 0;

        if (currentPriority === nextPriority) {
          expect(current.matchScore).toBeGreaterThanOrEqual(next.matchScore);
        } else {
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        }
      }
    });
  });

  describe('generatePromptContent', () => {
    it('应该生成包含技能清单的提示词', async () => {
      const result = await manager.generatePromptContent({
        userMessage: '帮我开启风扇'
      });

      expect(result.content).toContain('可用的技能模块');
      expect(result.content).toContain('iot-control');
    });

    it('应该包含匹配到的技能详细内容', async () => {
      const result = await manager.generatePromptContent({
        userMessage: '帮我开启风扇'
      });

      expect(result.matchedSkills.length).toBeGreaterThan(0);
      expect(result.content).toContain('当前已加载的详细技能模块');
    });

    it('应该包含自动加载技能的内容', async () => {
      const result = await manager.generatePromptContent({
        userMessage: '你好'
      });

      expect(result.content).toContain('莓小智');
    });
  });

  describe('generateSkillManifest', () => {
    it('应该按来源分组技能', async () => {
      const skills = await manager.getAllSkills();
      const manifest = manager.generateSkillManifest(skills);

      expect(manifest).toContain('核心技能');
      expect(manifest).toContain('系统技能');
    });

    it('应该包含技能的基本信息', async () => {
      const skills = await manager.getAllSkills();
      const manifest = manager.generateSkillManifest(skills);

      for (const skill of skills.slice(0, 3)) {
        expect(manifest).toContain(skill.id);
        expect(manifest).toContain(skill.name);
      }
    });
  });

  describe('clearCache', () => {
    it('应该清除所有缓存', async () => {
      await manager.getAllSkills();
      manager.clearCache();
      
      const skills = await manager.getAllSkills();
      expect(skills).toBeDefined();
    });

    it('应该清除特定用户的缓存', async () => {
      await manager.getAllSkills({ userId: 123 });
      manager.clearCache(123);
      
      const skills = await manager.getAllSkills({ userId: 123 });
      expect(skills).toBeDefined();
    });
  });
});
