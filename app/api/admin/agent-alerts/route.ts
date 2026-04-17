import { NextRequest, NextResponse } from 'next/server';
import { getGlobalAlertManager } from '@/lib/ai/agent-orchestrator/alert-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') as any;
    const acknowledged = searchParams.get('acknowledged');
    const limit = searchParams.get('limit');

    const alertManager = getGlobalAlertManager();
    
    const options: any = {};
    if (severity) options.severity = severity;
    if (acknowledged !== null) options.acknowledged = acknowledged === 'true';
    if (limit) options.limit = parseInt(limit);

    const alerts = alertManager.getAlerts(options);
    const stats = alertManager.getStats();

    return NextResponse.json({
      success: true,
      alerts,
      stats,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to get agent alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId } = body;

    const alertManager = getGlobalAlertManager();

    if (action === 'acknowledge') {
      alertManager.acknowledgeAlert(alertId);
      return NextResponse.json({ success: true });
    }

    if (action === 'clear') {
      alertManager.clearAlerts();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to process alert action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
