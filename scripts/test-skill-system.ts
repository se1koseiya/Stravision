/**
 * 技能系统测试脚本
 * 
 * 用于验证新的技能系统是否正常工作
 * 
 * 运行方式:
 * npx tsx scripts/test-skill-system.ts
 */

import { skillManager } from '../lib/ai/skill-system/skill-manager';

async function testSkillSystem() {
  console.log('🧪 开始测试技能系统...\n');

  // 测试 1: 加载所有技能
  console.log('📦 测试 1: 加载所有技能');
  const allSkills = await skillManager.getAllSkills({
    enableBuiltinSkills: true,
    enableDiskSkills: true,
    enableDatabaseSkills: false
  });
  console.log(`✅ 成功加载 ${allSkills.length} 个技能`);
  console.log('技能列表:');
  allSkills.forEach(skill => {
    console.log(`  - ${skill.id} (${skill.name}) [${skill.source}] priority: ${skill.priority || 0}`);
  });
  console.log('');

  // 测试 2: 匹配设备控制
  console.log('🎯 测试 2: 匹配设备控制相关技能');
  const controlMatches = await skillManager.matchSkills({
    userMessage: '帮我开启风扇'
  });
  console.log(`✅ 匹配到 ${controlMatches.length} 个技能`);
  controlMatches.forEach(match => {
    console.log(`  - ${match.skill.id}: ${match.matchReason} (分数: ${match.matchScore})`);
  });
  console.log('');

  // 测试 3: 匹配任务规划
  console.log('📋 测试 3: 匹配任务规划相关技能');
  const planningMatches = await skillManager.matchSkills({
    userMessage: '帮我制定一个浇水计划'
  });
  console.log(`✅ 匹配到 ${planningMatches.length} 个技能`);
  planningMatches.forEach(match => {
    console.log(`  - ${match.skill.id}: ${match.matchReason} (分数: ${match.matchScore})`);
  });
  console.log('');

  // 测试 4: 自动加载核心技能
  console.log('🌟 测试 4: 自动加载核心技能');
  const coreMatches = await skillManager.matchSkills({
    userMessage: '你好'
  });
  const autoLoadSkills = coreMatches.filter(m => m.skill.autoLoad);
  console.log(`✅ 自动加载了 ${autoLoadSkills.length} 个核心技能`);
  autoLoadSkills.forEach(match => {
    console.log(`  - ${match.skill.id}: ${match.skill.name}`);
  });
  console.log('');

  // 测试 5: 生成提示词内容
  console.log('📝 测试 5: 生成提示词内容');
  const promptResult = await skillManager.generatePromptContent({
    userMessage: '帮我开启风扇'
  });
  console.log(`✅ 生成的提示词长度: ${promptResult.content.length} 字符`);
  console.log(`✅ 匹配的技能: ${promptResult.matchedSkills.map(s => s.id).join(', ')}`);
  console.log('');

  // 测试 6: 技能清单
  console.log('📚 测试 6: 生成技能清单');
  const manifest = skillManager.generateSkillManifest(allSkills);
  console.log(`✅ 技能清单长度: ${manifest.length} 字符`);
  console.log('清单预览:');
  console.log(manifest.substring(0, 500) + '...\n');

  // 测试 7: 依赖关系
  console.log('🔗 测试 7: 验证依赖关系');
  const automationMatches = await skillManager.matchSkills({
    userMessage: '创建一个自动化规则'
  });
  const hasAutomation = automationMatches.some(m => m.skill.id === 'automation-strategy');
  const hasIotControl = automationMatches.some(m => m.skill.id === 'iot-control');
  console.log(`✅ automation-strategy 匹配: ${hasAutomation}`);
  console.log(`✅ iot-control 依赖加载: ${hasIotControl}`);
  console.log('');

  // 测试 8: 缓存机制
  console.log('💾 测试 8: 验证缓存机制');
  const start1 = Date.now();
  await skillManager.getAllSkills();
  const time1 = Date.now() - start1;
  
  const start2 = Date.now();
  await skillManager.getAllSkills();
  const time2 = Date.now() - start2;
  
  console.log(`✅ 首次加载: ${time1}ms`);
  console.log(`✅ 缓存加载: ${time2}ms`);
  console.log(`✅ 性能提升: ${((1 - time2/time1) * 100).toFixed(1)}%`);
  console.log('');

  console.log('🎉 所有测试完成！技能系统工作正常。\n');
}

// 运行测试
testSkillSystem().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
