/**
 * AI 功能过滤测试脚本
 * 
 * 在浏览器控制台运行此脚本来测试过滤功能
 */

// 测试用例
const testCases = [
  {
    name: "任务列表标签",
    input: '<TASK_LIST>{"status":"in_progress","tasks":[]}</TASK_LIST>这是正常文本',
    shouldRemove: true,
    feature: 'enableTaskList'
  },
  {
    name: "设备状态标签",
    input: '<DEVICE_BENTO />这是正常文本',
    shouldRemove: true,
    feature: 'enableDeviceBento'
  },
  {
    name: "控制面板标签",
    input: '<CONTROL_BENTO />这是正常文本',
    shouldRemove: true,
    feature: 'enableControlBento'
  },
  {
    name: "监控画面标签",
    input: '<MONITOR>camera_a</MONITOR>这是正常文本',
    shouldRemove: true,
    feature: 'enableMonitor'
  },
  {
    name: "图表标签",
    input: '<CHART type="echarts">{"data":[]}</CHART>这是正常文本',
    shouldRemove: true,
    feature: 'enableChart'
  },
  {
    name: "思考过程标签",
    input: '<REASONING>这是思考过程</REASONING>这是正常文本',
    shouldRemove: true,
    feature: 'enableReasoning'
  },
  {
    name: "引用来源标签",
    input: '<SOURCES>[1] 来源</SOURCES>这是正常文本',
    shouldRemove: true,
    feature: 'enableSources'
  },
  {
    name: "网页预览标签",
    input: '<WEB_PREVIEW>https://example.com</WEB_PREVIEW>这是正常文本',
    shouldRemove: true,
    feature: 'enableWebPreview'
  },
  {
    name: "混合多个标签",
    input: '<TASK_LIST>{}</TASK_LIST>文本<DEVICE_BENTO />更多文本<MONITOR />',
    shouldRemove: true,
    feature: 'multiple'
  },
  {
    name: "未闭合的标签",
    input: '<TASK_LIST>{"status":"in_progress"',
    shouldRemove: true,
    feature: 'enableTaskList'
  }
];

// 模拟配置（所有功能都禁用）
const disabledConfig = {
  enableTaskList: false,
  enableDeviceBento: false,
  enableControlBento: false,
  enableMonitor: false,
  enableScheduledTasks: false,
  enableChart: false,
  enableSpectral: false,
  enableReasoning: false,
  enableSources: false,
  enableToolUsed: false,
  enableScheduleTask: false,
  enableDeviceControl: false,
  enableHTMLPreview: false,
  enableWebPreview: false
};

// 运行测试
async function runTests() {
  console.log('🧪 开始测试 AI 功能过滤...\n');
  
  // 获取当前配置
  try {
    const response = await fetch('/api/ai-features');
    const currentConfig = await response.json();
    console.log('📋 当前配置:', currentConfig);
    console.log('');
  } catch (e) {
    console.error('❌ 无法获取配置:', e);
    return;
  }
  
  // 测试过滤函数（需要在页面上下文中运行）
  console.log('⚠️ 注意：此脚本需要在 AI 助手页面的控制台中运行\n');
  
  // 检查是否有 filterDisabledFeatures 函数
  if (typeof window.filterDisabledFeatures === 'undefined') {
    console.log('💡 提示：filterDisabledFeatures 函数在模块作用域中');
    console.log('   你可以通过以下方式测试：');
    console.log('   1. 在 AI 助手页面发送消息');
    console.log('   2. 观察控制台日志：');
    console.log('      - [AI Features] Current config:');
    console.log('      - [Frontend Filter] Applied to streaming content');
    console.log('      - [Filter] Removed TASK_LIST tags');
    console.log('');
  }
  
  // 提供手动测试指令
  console.log('📝 手动测试步骤：');
  console.log('1. 确认配置文件 data/ai-features-config.json 中 enableTaskList: false');
  console.log('2. 刷新页面');
  console.log('3. 发送消息："帮我规划一下今天的工作"');
  console.log('4. 检查：');
  console.log('   ✅ 不应该看到 <TASK_LIST> 标签');
  console.log('   ✅ 不应该看到任务规划器组件');
  console.log('   ✅ 控制台显示过滤日志');
  console.log('');
  
  // 测试配置 API
  console.log('🔍 测试配置 API...');
  try {
    const response = await fetch('/api/ai-features');
    const config = await response.json();
    
    console.log('✅ 配置 API 正常');
    console.log('   返回的配置:', config);
    
    // 检查关键配置
    if (config.enableTaskList === false) {
      console.log('   ✅ enableTaskList 已禁用');
    } else {
      console.log('   ⚠️ enableTaskList 未禁用');
    }
  } catch (e) {
    console.error('❌ 配置 API 错误:', e);
  }
  
  console.log('\n✨ 测试准备完成！');
  console.log('💡 现在可以在 AI 助手页面进行实际测试');
}

// 自动运行
runTests();

// 导出测试函数供手动调用
window.testAIFeaturesFilter = runTests;

console.log('💡 提示：可以随时运行 testAIFeaturesFilter() 重新测试');
