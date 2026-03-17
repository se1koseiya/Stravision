/**
 * 监控截图工具
 * 用于语音助手触发监控截图并跳转到 AI 助手
 */

export interface SnapshotResult {
  success: boolean;
  imageData?: string;
  cameraName?: string;
  error?: string;
}

/**
 * 检查是否在监控页面
 */
function isOnMonitorPage(): boolean {
  return typeof window !== 'undefined' && window.location.pathname === '/monitor';
}

/**
 * 优雅地跳转到监控页面
 * 使用 View Transitions API（如果支持）+ 边缘渐变效果
 */
async function navigateToMonitorPage(): Promise<void> {
  if (typeof window === 'undefined') return;

  // 创建边缘渐变遮罩
  const mask = document.createElement('div');
  mask.className = 'page-transition-mask';
  document.body.appendChild(mask);

  // 触发遮罩动画
  requestAnimationFrame(() => {
    mask.classList.add('active');
  });

  // 等待遮罩动画
  await new Promise(resolve => setTimeout(resolve, 300));

  // 检查是否支持 View Transitions API
  if ('startViewTransition' in document) {
    try {
      // @ts-ignore
      const transition = document.startViewTransition(() => {
        window.location.href = '/monitor';
      });
      await transition.finished;
    } catch (error) {
      console.error('[Snapshot] View transition error:', error);
      window.location.href = '/monitor';
    }
  } else {
    // 降级方案：直接跳转
    window.location.href = '/monitor';
  }

  // 清理遮罩
  setTimeout(() => {
    mask.classList.remove('active');
    setTimeout(() => {
      mask.remove();
    }, 300);
  }, 100);
}

/**
 * 等待页面加载完成
 */
async function waitForPageLoad(timeout: number = 5000): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve(true);
      return;
    }

    const timer = setTimeout(() => {
      resolve(false);
    }, timeout);

    window.addEventListener('load', () => {
      clearTimeout(timer);
      resolve(true);
    }, { once: true });
  });
}

/**
 * 等待视频加载完成
 * @param video 视频元素
 * @param timeout 超时时间（毫秒）
 * @returns 是否加载成功
 */
async function waitForVideoReady(video: HTMLVideoElement, timeout: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    // 如果视频已经准备好，直接返回
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      console.log('[Snapshot] Video already ready');
      resolve(true);
      return;
    }

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('[Snapshot] Video load timeout');
        resolve(false);
      }
    }, timeout);

    const onReady = () => {
      if (!resolved && video.videoWidth > 0 && video.videoHeight > 0) {
        resolved = true;
        clearTimeout(timer);
        console.log('[Snapshot] Video ready');
        resolve(true);
      }
    };

    // 监听多个事件以确保视频准备好
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('playing', onReady, { once: true });
  });
}

/**
 * 打开监控模态框
 * @param cameraId 摄像头 ID (1 或 2)
 * @returns 是否成功打开
 */
async function openCameraModal(cameraId: number = 1): Promise<boolean> {
  try {
    // 查找摄像头卡片
    const cameraCards = document.querySelectorAll('[data-camera-id]');
    let targetCard: HTMLElement | null = null;
    
    for (const card of cameraCards) {
      const id = parseInt((card as HTMLElement).dataset.cameraId || '0');
      if (id === cameraId) {
        targetCard = card as HTMLElement;
        break;
      }
    }

    // 如果没有找到带 data-camera-id 的，尝试通过索引查找
    if (!targetCard) {
      const allCameraCards = document.querySelectorAll('[class*="camera"]');
      if (allCameraCards.length >= cameraId) {
        targetCard = allCameraCards[cameraId - 1] as HTMLElement;
      }
    }

    // 如果还是没找到，尝试查找包含"摄像头"文本的元素
    if (!targetCard) {
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        const text = el.textContent || '';
        if (text.includes(`摄像头 ${cameraId === 1 ? 'A' : 'B'}`) || 
            text.includes(`温室摄像头 ${cameraId === 1 ? 'A' : 'B'}`)) {
          // 找到最近的可点击父元素
          let parent = el.parentElement;
          while (parent) {
            if (parent.onclick || parent.classList.contains('cursor-pointer')) {
              targetCard = parent;
              break;
            }
            parent = parent.parentElement;
          }
          if (targetCard) break;
        }
      }
    }

    if (!targetCard) {
      console.error('[Snapshot] Camera card not found');
      return false;
    }

    // 点击摄像头卡片打开模态框
    console.log('[Snapshot] Clicking camera card');
    targetCard.click();

    // 等待模态框打开
    await new Promise(resolve => setTimeout(resolve, 800));

    return true;
  } catch (error) {
    console.error('[Snapshot] Failed to open camera modal:', error);
    return false;
  }
}

/**
 * 从监控页面截图
 * @param cameraId 摄像头 ID (可选，默认为 1)
 * @param autoOpenModal 是否自动打开模态框（默认为 true）
 * @param autoNavigate 是否自动跳转到监控页面（默认为 true）
 * @returns 截图结果
 */
export async function captureMonitorSnapshot(
  cameraId: number = 1,
  autoOpenModal: boolean = true,
  autoNavigate: boolean = true
): Promise<SnapshotResult> {
  try {
    console.log('[Snapshot] Starting capture process...');

    // 检查是否在监控页面
    if (!isOnMonitorPage()) {
      if (autoNavigate) {
        console.log('[Snapshot] Not on monitor page, navigating...');
        
        // 跳转到监控页面
        await navigateToMonitorPage();
        
        // 等待页面加载
        const loaded = await waitForPageLoad(5000);
        if (!loaded) {
          return {
            success: false,
            error: '页面加载超时',
          };
        }

        // 等待一下让页面完全渲染
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        return {
          success: false,
          error: '请先打开监控页面',
        };
      }
    }

    // 如果需要自动打开模态框
    if (autoOpenModal) {
      const opened = await openCameraModal(cameraId);
      if (!opened) {
        return {
          success: false,
          error: '无法打开监控画面，请手动打开后重试',
        };
      }
    }

    // 查找视频元素
    let video = document.querySelector('video') as HTMLVideoElement | null;
    
    if (!video) {
      // 等待一下，可能视频元素还在加载
      await new Promise(resolve => setTimeout(resolve, 1000));
      video = document.querySelector('video') as HTMLVideoElement | null;
    }

    if (!video) {
      return {
        success: false,
        error: '未找到监控画面，请确保视频正在播放',
      };
    }

    console.log('[Snapshot] Video element found, waiting for ready...');

    // 等待视频加载完成
    const isReady = await waitForVideoReady(video, 10000);
    
    if (!isReady) {
      return {
        success: false,
        error: '视频加载超时，请检查网络连接',
      };
    }

    console.log('[Snapshot] Video ready, capturing...');

    // 创建 canvas 进行截图
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        success: false,
        error: '无法创建画布',
      };
    }

    // 绘制视频帧到 canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 转换为 Base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    console.log('[Snapshot] Capture successful');

    return {
      success: true,
      imageData,
      cameraName: `监控摄像头 ${cameraId === 1 ? 'A' : 'B'}`,
    };
  } catch (error) {
    console.error('[Snapshot] Capture error:', error);
    return {
      success: false,
      error: '截图失败',
    };
  }
}

/**
 * 跳转到 AI 助手并发送截图分析请求
 * @param imageData 图片 Base64 数据
 * @param prompt 用户提示词
 */
export function navigateToAIAssistantWithSnapshot(
  imageData: string,
  prompt: string = '请分析这张监控截图中的草莓生长情况'
) {
  // 将数据存储到 sessionStorage
  sessionStorage.setItem('xiaozhi_snapshot_data', JSON.stringify({
    imageData,
    prompt,
    timestamp: Date.now(),
  }));
  
  // 跳转到 AI 助手页面
  window.location.href = '/ai-assistant?from=xiaozhi&action=analyze_snapshot';
}

/**
 * 从 sessionStorage 获取截图数据
 */
export function getSnapshotDataFromSession(): {
  imageData: string;
  prompt: string;
  timestamp: number;
} | null {
  try {
    const data = sessionStorage.getItem('xiaozhi_snapshot_data');
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    // 清除数据（一次性使用）
    sessionStorage.removeItem('xiaozhi_snapshot_data');
    
    // 检查数据是否过期（5分钟）
    if (Date.now() - parsed.timestamp > 5 * 60 * 1000) {
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Get snapshot data error:', error);
    return null;
  }
}

/**
 * 完整的截图分析工作流
 * 1. 截图
 * 2. 跳转到 AI 助手
 * 3. 自动发送分析请求
 */
export async function executeSnapshotAnalysisWorkflow(
  prompt: string = '请分析这张监控截图中的草莓生长情况，包括植株健康状况、果实发育情况、是否有病虫害迹象等'
): Promise<{ success: boolean; error?: string }> {
  // 1. 截图
  const snapshotResult = await captureMonitorSnapshot();
  
  if (!snapshotResult.success || !snapshotResult.imageData) {
    return {
      success: false,
      error: snapshotResult.error || '截图失败',
    };
  }
  
  // 2. 跳转到 AI 助手并传递数据
  navigateToAIAssistantWithSnapshot(snapshotResult.imageData, prompt);
  
  return { success: true };
}
