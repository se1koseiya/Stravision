/**
 * 智能命令识别器
 * 
 * 使用意图分类和实体提取来识别用户语音命令
 */

export interface Intent {
  type: string;
  confidence: number;
  entities: Record<string, any>;
}

export interface RecognitionResult {
  intent: Intent;
  needsClarification: boolean;
  clarificationQuestion?: string;
  suggestedActions?: string[];
}

/**
 * 意图类型定义
 */
export enum IntentType {
  // 设备控制
  DEVICE_CONTROL = 'device_control',
  DEVICE_QUERY = 'device_query',
  
  // 环境监控
  ENVIRONMENT_QUERY = 'environment_query',
  SNAPSHOT_ANALYSIS = 'snapshot_analysis',
  
  // 任务管理
  TASK_CREATE = 'task_create',
  TASK_QUERY = 'task_query',
  TASK_CANCEL = 'task_cancel',
  
  // 对话控制
  DISCONNECT = 'disconnect',
  HELP = 'help',
  
  // 通用查询
  GENERAL_QUERY = 'general_query',
  
  // 未知
  UNKNOWN = 'unknown'
}

/**
 * 实体类型定义
 */
export interface Entities {
  device?: {
    id?: number;
    name?: string;
    action?: 'on' | 'off' | 'toggle';
  };
  environment?: {
    metric?: 'temperature' | 'humidity' | 'light' | 'co2';
    value?: number;
    comparison?: 'greater' | 'less' | 'equal';
  };
  time?: {
    type?: 'now' | 'future' | 'past';
    value?: string;
    duration?: number;
  };
  location?: {
    area?: string;
  };
}

/**
 * 意图分类器
 */
export class IntentClassifier {
  /**
   * 分类用户意图
   */
  classify(userText: string): Intent {
    const text = userText.toLowerCase().trim();
    
    // 1. 断开连接意图
    if (this.isDisconnectIntent(text)) {
      return {
        type: IntentType.DISCONNECT,
        confidence: 0.95,
        entities: {}
      };
    }
    
    // 2. 截图分析意图
    if (this.isSnapshotIntent(text)) {
      return {
        type: IntentType.SNAPSHOT_ANALYSIS,
        confidence: 0.9,
        entities: this.extractSnapshotEntities(text)
      };
    }
    
    // 3. 设备控制意图
    if (this.isDeviceControlIntent(text)) {
      return {
        type: IntentType.DEVICE_CONTROL,
        confidence: 0.85,
        entities: this.extractDeviceEntities(text)
      };
    }
    
    // 4. 设备查询意图
    if (this.isDeviceQueryIntent(text)) {
      return {
        type: IntentType.DEVICE_QUERY,
        confidence: 0.8,
        entities: this.extractDeviceEntities(text)
      };
    }
    
    // 5. 环境查询意图
    if (this.isEnvironmentQueryIntent(text)) {
      return {
        type: IntentType.ENVIRONMENT_QUERY,
        confidence: 0.85,
        entities: this.extractEnvironmentEntities(text)
      };
    }
    
    // 6. 任务创建意图
    if (this.isTaskCreateIntent(text)) {
      return {
        type: IntentType.TASK_CREATE,
        confidence: 0.8,
        entities: this.extractTaskEntities(text)
      };
    }
    
    // 7. 任务查询意图
    if (this.isTaskQueryIntent(text)) {
      return {
        type: IntentType.TASK_QUERY,
        confidence: 0.8,
        entities: {}
      };
    }
    
    // 8. 帮助意图
    if (this.isHelpIntent(text)) {
      return {
        type: IntentType.HELP,
        confidence: 0.9,
        entities: {}
      };
    }
    
    // 9. 通用查询
    if (this.isGeneralQueryIntent(text)) {
      return {
        type: IntentType.GENERAL_QUERY,
        confidence: 0.7,
        entities: {}
      };
    }
    
    // 未知意图
    return {
      type: IntentType.UNKNOWN,
      confidence: 0.3,
      entities: {}
    };
  }
  
  // === 意图判断方法 ===
  
  private isDisconnectIntent(text: string): boolean {
    // 明确的断开连接关键词（不包含"关闭"）
    const disconnectKeywords = ['再见', '拜拜', '退出', '结束对话', '挂断', '不用了', '够了', '谢谢', '辛苦了'];
    return disconnectKeywords.some(k => text.includes(k));
  }
  
  private isSnapshotIntent(text: string): boolean {
    const keywords = ['看看', '查看', '截图', '拍照', '监控', '画面', '大棚', '草莓', '长势', '生长'];
    return keywords.some(k => text.includes(k)) && 
           (text.includes('大棚') || text.includes('草莓') || text.includes('监控'));
  }
  
  private isDeviceControlIntent(text: string): boolean {
    const actionKeywords = ['开', '关', '打开', '关闭', '启动', '停止', '调节', '设置'];
    const deviceKeywords = ['风扇', '水泵', '灯', '加热', '除湿', '设备'];
    
    return actionKeywords.some(k => text.includes(k)) && 
           deviceKeywords.some(k => text.includes(k));
  }
  
  private isDeviceQueryIntent(text: string): boolean {
    const queryKeywords = ['状态', '怎么样', '是否', '有没有', '开着吗', '关着吗'];
    const deviceKeywords = ['风扇', '水泵', '灯', '加热', '除湿', '设备'];
    
    return queryKeywords.some(k => text.includes(k)) && 
           deviceKeywords.some(k => text.includes(k));
  }
  
  private isEnvironmentQueryIntent(text: string): boolean {
    const envKeywords = ['温度', '湿度', '光照', '二氧化碳', 'CO2', '环境', '气候'];
    const queryKeywords = ['多少', '怎么样', '如何', '是否', '现在'];
    
    return envKeywords.some(k => text.includes(k)) || 
           (queryKeywords.some(k => text.includes(k)) && text.includes('大棚'));
  }
  
  private isTaskCreateIntent(text: string): boolean {
    const timeKeywords = ['定时', '每天', '每周', '明天', '今晚', '几点'];
    const actionKeywords = ['开', '关', '提醒', '执行'];
    
    return timeKeywords.some(k => text.includes(k)) && 
           actionKeywords.some(k => text.includes(k));
  }
  
  private isTaskQueryIntent(text: string): boolean {
    const keywords = ['任务', '定时', '计划', '安排'];
    const queryKeywords = ['有哪些', '查看', '显示', '列出'];
    
    return keywords.some(k => text.includes(k)) && 
           queryKeywords.some(k => text.includes(k));
  }
  
  private isHelpIntent(text: string): boolean {
    const keywords = ['帮助', '怎么用', '能做什么', '功能', '教我', '不会'];
    return keywords.some(k => text.includes(k));
  }
  
  private isGeneralQueryIntent(text: string): boolean {
    const queryKeywords = ['什么', '为什么', '怎么', '如何', '吗', '呢'];
    return queryKeywords.some(k => text.includes(k));
  }
  
  // === 实体提取方法 ===
  
  private extractDeviceEntities(text: string): Entities {
    const entities: Entities = { device: {} };
    
    // 提取设备名称
    if (text.includes('所有') || text.includes('全部') || text.includes('所有设备') || text.includes('全部设备')) {
      entities.device!.name = '所有设备';
      entities.device!.id = 0; // 0 表示所有设备
    } else if (text.includes('风扇')) {
      entities.device!.name = '风扇';
      entities.device!.id = 6;
    } else if (text.includes('水泵')) {
      entities.device!.name = '水泵';
      entities.device!.id = 5;
    } else if (text.includes('灯') || text.includes('照明')) {
      entities.device!.name = '灯光';
      entities.device!.id = 7;
    }
    
    // 提取动作
    if (text.includes('开') || text.includes('打开') || text.includes('启动')) {
      entities.device!.action = 'on';
    } else if (text.includes('关') || text.includes('关闭') || text.includes('停止')) {
      entities.device!.action = 'off';
    }
    
    return entities;
  }
  
  private extractEnvironmentEntities(text: string): Entities {
    const entities: Entities = { environment: {} };
    
    // 提取环境指标
    if (text.includes('温度')) {
      entities.environment!.metric = 'temperature';
    } else if (text.includes('湿度')) {
      entities.environment!.metric = 'humidity';
    } else if (text.includes('光照') || text.includes('光')) {
      entities.environment!.metric = 'light';
    } else if (text.includes('二氧化碳') || text.includes('CO2') || text.includes('co2')) {
      entities.environment!.metric = 'co2';
    }
    
    // 提取数值和比较
    const numberMatch = text.match(/(\d+)/);
    if (numberMatch) {
      entities.environment!.value = parseInt(numberMatch[1]);
      
      if (text.includes('高于') || text.includes('大于') || text.includes('超过')) {
        entities.environment!.comparison = 'greater';
      } else if (text.includes('低于') || text.includes('小于') || text.includes('不到')) {
        entities.environment!.comparison = 'less';
      }
    }
    
    return entities;
  }
  
  private extractSnapshotEntities(text: string): Entities {
    const entities: Entities = { location: {} };
    
    if (text.includes('大棚')) {
      entities.location!.area = '大棚';
    }
    
    return entities;
  }
  
  private extractTaskEntities(text: string): Entities {
    const entities: Entities = { time: {} };
    
    // 提取时间
    if (text.includes('现在') || text.includes('立即')) {
      entities.time!.type = 'now';
    } else if (text.includes('明天') || text.includes('今晚') || text.includes('每天')) {
      entities.time!.type = 'future';
      entities.time!.value = text;
    }
    
    // 提取时间点
    const timeMatch = text.match(/(\d+)[点时]/);
    if (timeMatch) {
      entities.time!.value = `${timeMatch[1]}:00`;
    }
    
    return entities;
  }
}

/**
 * 智能命令识别器
 */
export class SmartCommandRecognizer {
  private classifier: IntentClassifier;
  
  constructor() {
    this.classifier = new IntentClassifier();
  }
  
  /**
   * 识别命令
   */
  recognize(userText: string, context?: any): RecognitionResult {
    // 1. 意图分类
    const intent = this.classifier.classify(userText);
    
    // 2. 检查是否需要澄清
    const needsClarification = this.checkNeedsClarification(intent);
    
    // 3. 生成澄清问题
    let clarificationQuestion: string | undefined;
    if (needsClarification) {
      clarificationQuestion = this.generateClarificationQuestion(intent);
    }
    
    // 4. 生成建议动作
    const suggestedActions = this.generateSuggestedActions(intent);
    
    return {
      intent,
      needsClarification,
      clarificationQuestion,
      suggestedActions
    };
  }
  
  /**
   * 检查是否需要澄清
   */
  private checkNeedsClarification(intent: Intent): boolean {
    // 置信度低于 0.7 需要澄清
    if (intent.confidence < 0.7) {
      return true;
    }
    
    // 设备控制但没有指定设备
    if (intent.type === IntentType.DEVICE_CONTROL && !intent.entities.device?.name) {
      return true;
    }
    
    // 设备控制但没有指定动作
    if (intent.type === IntentType.DEVICE_CONTROL && !intent.entities.device?.action) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 生成澄清问题
   */
  private generateClarificationQuestion(intent: Intent): string {
    switch (intent.type) {
      case IntentType.DEVICE_CONTROL:
        if (!intent.entities.device?.name) {
          return '您想控制哪个设备？（风扇、水泵、灯光）';
        }
        if (!intent.entities.device?.action) {
          return `您想${intent.entities.device.name}开启还是关闭？`;
        }
        break;
        
      case IntentType.ENVIRONMENT_QUERY:
        if (!intent.entities.environment?.metric) {
          return '您想查询哪个环境指标？（温度、湿度、光照、CO2）';
        }
        break;
        
      case IntentType.UNKNOWN:
        return '抱歉，我没有理解您的意思。您可以说"帮助"查看我能做什么。';
    }
    
    return '请问您需要什么帮助？';
  }
  
  /**
   * 生成建议动作
   */
  private generateSuggestedActions(intent: Intent): string[] {
    const actions: string[] = [];
    
    switch (intent.type) {
      case IntentType.DEVICE_CONTROL:
        if (intent.entities.device?.name && intent.entities.device?.action) {
          actions.push(`${intent.entities.device.action === 'on' ? '开启' : '关闭'}${intent.entities.device.name}`);
        }
        break;
        
      case IntentType.ENVIRONMENT_QUERY:
        if (intent.entities.environment?.metric) {
          actions.push(`查询${intent.entities.environment.metric}`);
        }
        break;
        
      case IntentType.SNAPSHOT_ANALYSIS:
        actions.push('截图分析大棚情况');
        break;
        
      case IntentType.HELP:
        actions.push('显示帮助信息');
        break;
    }
    
    return actions;
  }
}

/**
 * 创建智能命令识别器实例
 */
export function createSmartRecognizer(): SmartCommandRecognizer {
  return new SmartCommandRecognizer();
}
