/**
 * 技能管理器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
    it('应该自动加载核心技能', async () => {
      const results = await manager.matchSkills({
        userMessage: '你好'
      });

      const coreSkills = results.filter(r => r.skill.autoLoad);
      expect(coreSkills.length).toBeGreaterThan(0);
    });

    it('新架构下不再通过规则匹配非 autoLoad 技能（由 AI 自路由）', async () => {
      // 旧测试期望 "帮我开启风扇" 命中 iot-control（分数>80）
      // 新架构下 matchSkills 只加载 autoLoad 技能，iot-control 不再被规则匹配
      const results = await manager.matchSkills({
        userMessage: '帮我开启风扇'
      });

      const iotSkill = results.find(r => r.skill.id === 'iot-control');
      expect(iotSkill).toBeUndefined();
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

    it('新架构下不再注入"已加载的详细技能模块"段落（由 AI 调用 load_skill 按需加载）', async () => {
      const result = await manager.generatePromptContent({
        userMessage: '帮我开启风扇'
      });

      // 旧架构会注入 "当前已加载的详细技能模块" + 匹配原因
      // 新架构只注入清单 + 路由指令，详细内容由 load_skill 工具返回
      expect(result.content).not.toContain('当前已加载的详细技能模块');
      expect(result.content).toContain('load_skill');
    });

    it('应该包含自动加载技能的内容', async () => {
      const result = await manager.generatePromptContent({
        userMessage: '你好'
      });

      expect(result.content).toContain('莓小智');
    });

    it('应该包含 AI 自路由指令', async () => {
      const result = await manager.generatePromptContent({
        userMessage: '你好'
      });

      expect(result.content).toContain('技能加载机制');
      expect(result.content).toContain('load_skill');
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

    it('autoLoad 技能应标注为已自动加载', async () => {
      const skills = await manager.getAllSkills();
      const manifest = manager.generateSkillManifest(skills);
      const autoLoadSkills = skills.filter(s => s.autoLoad);

      for (const skill of autoLoadSkills) {
        expect(manifest).toContain(`**${skill.id}**`);
        expect(manifest).toContain('已自动加载');
      }
    });

    it('非 autoLoad 技能应包含关键词和依赖信息', async () => {
      const skills = await manager.getAllSkills();
      const manifest = manager.generateSkillManifest(skills);
      const nonAutoLoadWithKw = skills.find(s => !s.autoLoad && s.keywords.length > 0);

      if (nonAutoLoadWithKw) {
        expect(manifest).toContain('关键词:');
      }
    });
  });

  describe('getSkillsByIds', () => {
    it('应该按 ID 返回对应技能', async () => {
      const allSkills = await manager.getAllSkills();
      const targetId = allSkills[0]?.id;
      if (!targetId) return;

      const { found, missingIds } = await manager.getSkillsByIds([targetId]);
      expect(found.length).toBe(1);
      expect(found[0].id).toBe(targetId);
      expect(missingIds).toEqual([]);
    });

    it('未找到的 ID 应在 missingIds 中返回', async () => {
      const { found, missingIds } = await manager.getSkillsByIds(['nonexistent-skill-id']);
      expect(found).toEqual([]);
      expect(missingIds).toEqual(['nonexistent-skill-id']);
    });

    it('应支持批量加载并去重', async () => {
      const allSkills = await manager.getAllSkills();
      const targetId = allSkills[0]?.id;
      if (!targetId) return;

      const { found } = await manager.getSkillsByIds([targetId, targetId]);
      expect(found.length).toBe(1); // 去重
    });

    it('空数组应返回空结果', async () => {
      const { found, missingIds } = await manager.getSkillsByIds([]);
      expect(found).toEqual([]);
      expect(missingIds).toEqual([]);
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
