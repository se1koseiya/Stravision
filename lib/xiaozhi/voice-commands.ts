/**
 * 语音助手命令处理
 * 识别用户语音命令并执行相应操作
 */

import { executeSnapshotAnalysisWorkflow } from './monitor-snapshot';

export interface VoiceCommandResult {
  recognized: boolean;
  action?: string;
  response?: string;
  error?: string;
  shouldDisconnect?: boolean; // 是否应该断开连接
}

/**
 * 识别并执行语音命令
 * @param userText 用户说的话
 * @returns 命令执行结果
 */
export async function processVoiceCommand(userText: string): Promise<VoiceCommandResult> {
  const text = userText.toLowerCase().trim();
  
  // 断开连接命令（告别语）
  const disconnectKeywords = [
    '不需要你了',
    '不用了',
    '再见',
    '拜拜',
    '退出',
    '关闭',
    '结束对话',
    '挂断',
    '停止',
    '够了',
    '可以了',
    '谢谢你',
    '辛苦了',
    '休息吧',
    '下次再聊',
  ];
  
  const isDisconnectCommand = disconnectKeywords.some(keyword => text.includes(keyword));
  
  if (isDisconnectCommand) {
    return {
      recognized: true,
      action: 'disconnect',
      response: '好的，再见！有需要随时叫我。',
      shouldDisconnect: true,
    };
  }
  
  // 监控截图分析命令
  const snapshotKeywords = [
    '看看大棚',
    '查看大棚',
    '大棚情况',
    '草莓长得怎么样',
    '草莓生长',
    '监控画面',
    '截图分析',
    '拍个照',
    '看一下大棚',
    '大棚里',
    '草莓',
    '长势',
    '生长情况',
  ];
  
  const isSnapshotCommand = snapshotKeywords.some(keyword => text.includes(keyword));
  
  if (isSnapshotCommand) {
    try {
      // 执行截图分析工作流
      const result = await executeSnapshotAnalysisWorkflow(
        '请详细分析这张监控截图中的草莓生长情况，包括：\n' +
        '1. 植株整体健康状况\n' +
        '2. 叶片颜色和形态\n' +
        '3. 果实发育情况\n' +
        '4. 是否有病虫害迹象\n' +
        '5. 环境条件是否适宜\n' +
        '6. 改进建议'
      );
      
      if (result.success) {
        return {
          recognized: true,
          action: 'snapshot_analysis',
          response: '好的，我已经从监控画面截图，正在跳转到AI助手进行分析，请稍候...',
        };
      } else {
        return {
          recognized: true,
          action: 'snapshot_analysis',
          error: result.error || '截图失败',
          response: `抱歉，${result.error || '截图失败'}，请确保监控页面已打开。`,
        };
      }
    } catch (error) {
      console.error('Snapshot command error:', error);
      return {
        recognized: true,
        action: 'snapshot_analysis',
        error: '执行失败',
        response: '抱歉，执行截图分析时出现错误，请稍后重试。',
      };
    }
  }
  
  // 未识别的命令
  return {
    recognized: false,
  };
}

/**
 * 检查是否是需要特殊处理的命令
 * @param userText 用户说的话
 * @returns 是否是特殊命令
 */
export function isSpecialCommand(userText: string): boolean {
  const text = userText.toLowerCase().trim();
  
  const specialKeywords = [
    // 断开连接命令
    '不需要你了',
    '不用了',
    '再见',
    '拜拜',
    '退出',
    '关闭',
    '结束对话',
    '挂断',
    '停止',
    '够了',
    '可以了',
    '谢谢你',
    '辛苦了',
    '休息吧',
    '下次再聊',
    // 截图分析命令
    '看看大棚',
    '查看大棚',
    '大棚情况',
    '草莓长得怎么样',
    '草莓生长',
    '监控画面',
    '截图分析',
    '拍个照',
    '看一下大棚',
    '大棚里',
    '草莓',
    '长势',
    '生长情况',
  ];
  
  return specialKeywords.some(keyword => text.includes(keyword));
}
