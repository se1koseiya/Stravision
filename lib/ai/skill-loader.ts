import fs from 'fs';
import path from 'path';
// import matter from 'gray-matter'; // 手工解析 Frontmatter 以减少依赖

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  keywords: string[];
}

/**
 * 从 .agents/skills 目录实时加载技能
 */
export function loadSkillsFromDisk(): Skill[] {
  const skillsDir = path.join(process.cwd(), '.agents', 'skills');
  
  if (!fs.existsSync(skillsDir)) {
    console.warn('[SkillLoader] .agents/skills directory not found at:', skillsDir);
    return [];
  }

  const skillFolders = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const skills: Skill[] = [];

  for (const folder of skillFolders) {
    const skillPath = path.join(skillsDir, folder, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      try {
        const fileContent = fs.readFileSync(skillPath, 'utf8');
        // 简单的手工解析 Frontmatter (如果不引入 gray-matter)
        const fmMatch = fileContent.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
        
        let metadata: any = {};
        let body = fileContent;

        if (fmMatch) {
          const fm = fmMatch[1];
          body = fmMatch[2];
          // 解析简单的 key: value
          fm.split('\n').forEach(line => {
             const [key, ...val] = line.split(':');
             if (key && val) metadata[key.trim()] = val.join(':').trim();
          });
        }

        skills.push({
          id: folder,
          name: metadata.name || folder,
          description: metadata.description || '',
          keywords: (metadata.keywords || '').split(',').map((k: string) => k.trim()).filter(Boolean),
          content: body.trim()
        });
      } catch (err) {
        console.error(`[SkillLoader] Failed to read skill: ${folder}`, err);
      }
    }
  }

  return skills;
}

/**
 * 生成包含所有可用技能的清单（用于提示词中告诉 AI 它具有哪些能力）
 */
export function getSkillManifest(skills: Skill[]): string {
  if (skills.length === 0) return '';
  
  return `## 可用的扩展技能模块 (Available Skills)
你拥有以下技能模块。如果你的回答涉及相关领域，系统会自动加载详细信息：
${skills.map(s => `- **${s.id}**: ${s.name} - ${s.description}`).join('\n')}`;
}
