import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * 监控截图 API
 * 用于语音助手触发截图并获取图片数据
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageData, cameraName } = await req.json();

    if (!imageData) {
      return Response.json({ error: 'Image data is required' }, { status: 400 });
    }

    // 返回图片数据，供前端使用
    return Response.json({
      success: true,
      imageData,
      cameraName: cameraName || '监控摄像头',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Snapshot API error:', error);
    return Response.json(
      { error: '截图失败' },
      { status: 500 }
    );
  }
}
