/**
 * 技能加载器 - 从不同来源加载技能
 */

import fs from 'node:fs';
import path from 'node:path';
import { Skill, SkillLoaderOptions } from './types';
import { getUserInstalledSkills } from '../../db/skill-store-service';

/**
 * 磁盘技能加载器
 */
export class DiskSkillLoader {
  private skillsDir: string;

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir || path.join(process.cwd(), '.agents', 'skills');
  }

  async load(): Promise<Skill[]> {
    if (!fs.existsSync(this.skillsDir)) {
      console.warn('[DiskSkillLoader] Skills directory not found:', this.skillsDir);
      return [];
    }

    const skillFolders = fs.readdirSync(this.skillsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const skills: Skill[] = [];

    for (const folder of skillFolders) {
      const skillPath = path.join(this.skillsDir, folder, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        try {
          const skill = this.parseSkillFile(skillPath, folder);
          if (skill) skills.push(skill);
        } catch (err) {
          console.error(`[DiskSkillLoader] Failed to load skill: ${folder}`, err);
        }
      }
    }

    return skills;
  }

  private parseSkillFile(filePath: string, folderId: string): Skill | null {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // 解析 Frontmatter
    const fmMatch = fileContent.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
    if (!fmMatch) {
      console.warn(`[DiskSkillLoader] No frontmatter found in: ${filePath}`);
      return null;
    }

    const metadata: Record<string, string> = {};
    const body = fmMatch[2];

    // 解析 YAML 格式的 frontmatter
    fmMatch[1].split('\n').forEach(line => {
      const [key, ...val] = line.split(':');
      if (key && val.length > 0) {
        metadata[key.trim()] = val.join(':').trim();
      }
    });

    return {
      id: folderId,
      name: metadata.name || folderId,
      description: metadata.description || '',
      keywords: (metadata.keywords || '').split(',').map(k => k.trim()).filter(Boolean),
      priority: metadata.priority ? parseInt(metadata.priority) : undefined,
      dependencies: metadata.dependencies ? metadata.dependencies.split(',').map(d => d.trim()) : undefined,
      autoLoad: metadata.autoLoad === 'true',
      content: body.trim(),
      source: 'disk'
    };
  }
}

/**
 * 数据库技能加载器
 */
export class DatabaseSkillLoader {
  async load(userId: number): Promise<Skill[]> {
    try {
      const dbSkills = await getUserInstalledSkills(userId);
      return dbSkills.map(s => ({
        id: s.skill_id,
        name: s.name,
        description: s.description,
        keywords: s.keywords.split(',').map(k => k.trim()).filter(Boolean),
        content: s.content,
        source: 'database' as const
      }));
    } catch (err) {
      console.error('[DatabaseSkillLoader] Failed to load skills:', err);
      return [];
    }
  }
}

/**
 * 内置技能加载器（用于核心系统技能）
 */
export class BuiltinSkillLoader {
  async load(): Promise<Skill[]> {
    return [
      {
        id: 'core-identity',
        name: '核心身份',
        description: '莓小智的核心身份和角色定位',
        keywords: ['你是谁', '你的名字', '莓小智'],
        autoLoad: true,
        priority: 100,
        content: `你是"莓小智"，是"莓界智慧农业平台"的**智能体 (Agent)**。
你的核心职责是**主动管理**大棚环境，通过感知、思考、决策、行动的闭环流程，帮助农场主实现精准种植。

## 你的角色设定
- **名字**：莓小智
- **身份**：大棚智能管家 / 农业智能体 (Agent)
- **性格**：主动、严谨、负责、贴心
- **语气**：自信且专业，像一位资深的农业专家在现场指导`,
        source: 'builtin'
      },
      {
        id: 'ui-tags',
        name: 'UI 标签指南',
        description: '交互 UI 标签使用指南',
        keywords: ['标签', 'UI', '显示'],
        autoLoad: true,
        priority: 99,
        content: `## 交互 UI 标签指南
- <DEVICE_BENTO>: 展示环境概况
- <CONTROL_BENTO>: 展示设备控制面板
- <SPECTRAL>: 展示光谱分析图
- <SCHEDULED_TASKS>: 展示/管理定时任务
- <MONITOR>: 展示实时直播流
- <AUTOMATION_STRATEGY>: 展示自动化策略卡片
- <SKILL_FORGE>: 技能锻造结果卡片。仅当 create_skill_from_doc / refine_skill 工具返回的 note 中给出了卡片 JSON 时才输出，且必须原样复制工具给的 JSON，禁止自己编造或改写 JSON 字段`,
        source: 'builtin'
      }
    ];
  }
}

/**
 * 统一技能加载器
 */
export class SkillLoader {
  private diskLoader = new DiskSkillLoader();
  private databaseLoader = new DatabaseSkillLoader();
  private builtinLoader = new BuiltinSkillLoader();

  async loadAll(options: SkillLoaderOptions = {}): Promise<Skill[]> {
    const {
      enableDiskSkills = true,
      enableDatabaseSkills = true,
      enableBuiltinSkills = true,
      userId
    } = options;

    const skillPromises: Promise<Skill[]>[] = [];

    if (enableBuiltinSkills) {
      skillPromises.push(this.builtinLoader.load());
    }

    if (enableDiskSkills) {
      skillPromises.push(this.diskLoader.load());
    }

    if (enableDatabaseSkills && userId) {
      skillPromises.push(this.databaseLoader.load(userId));
    }

    const skillArrays = await Promise.all(skillPromises);
    const allSkills = skillArrays.flat();

    // 过滤无关技能：排除没有 keywords 的 disk skills
    // TRAE IDE 平台会注入 60+ 个 UI 设计风格 skills（vintage/neon/material...），
    // 它们没有 keywords 字段，与农业平台完全无关，参与匹配只会浪费性能并引入噪音
    const filtered = allSkills.filter(skill => {
      if (skill.source === 'disk' && (!skill.keywords || skill.keywords.length === 0)) {
        return false
      }
      return true
    })

    // 去重（优先级：builtin > disk > database）
    const uniqueSkills = new Map<string, Skill>();
    for (const skill of filtered) {
      const existing = uniqueSkills.get(skill.id);
      if (!existing || this.getSourcePriority(skill.source) > this.getSourcePriority(existing.source)) {
        uniqueSkills.set(skill.id, skill);
      }
    }

    return Array.from(uniqueSkills.values());
  }

  private getSourcePriority(source: Skill['source']): number {
    switch (source) {
      case 'builtin': return 3;
      case 'disk': return 2;
      case 'database': return 1;
      default: return 0;
    }
  }
}
