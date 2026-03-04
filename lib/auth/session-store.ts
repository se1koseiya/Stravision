// Simple in-memory store for login sessions
// In a production environment with multiple instances, this should be Redis
export const loginSessions = new Map<string, { token: string; user: any; timestamp: number }>();

// Cleanup old sessions periodically (e.g. every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [uuid, session] of loginSessions.entries()) {
    if (now - session.timestamp > 10 * 60 * 1000) { // 10 minutes expiry
      loginSessions.delete(uuid);
    }
  }
}, 5 * 60 * 1000);