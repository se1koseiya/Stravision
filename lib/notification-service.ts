
/**
 * Notification Service
 * Handles sending notifications to external services like Enterprise WeChat (WeCom).
 */

const WECOM_WEBHOOK_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=b2d8ef10-c258-4393-b31a-cef018ebe7d0';

interface WeComMessage {
  msgtype: 'text' | 'markdown';
  text?: {
    content: string;
    mentioned_list?: string[];
    mentioned_mobile_list?: string[];
  };
  markdown?: {
    content: string;
  };
}

/**
 * Send a message to Enterprise WeChat via Webhook
 * @param content The message content
 * @param type The message type ('text' or 'markdown')
 */
export async function sendWeComNotification(content: string, type: 'text' | 'markdown' = 'markdown'): Promise<void> {
  try {
    const payload: WeComMessage = {
      msgtype: type,
      [type]: {
        content: content
      }
    };

    const response = await fetch(WECOM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send WeCom notification:', response.status, errorText);
    } else {
      // const responseData = await response.json();
      // console.log('WeCom notification sent:', responseData);
    }
  } catch (error) {
    console.error('Error sending WeCom notification:', error);
  }
}
