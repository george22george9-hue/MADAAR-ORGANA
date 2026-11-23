// ====================================================================
// ORGANA — Web Push Notification Service (Lock-Screen Push Notifications)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { setVapidDetails, sendNotification } from 'web-push';
import { queryPg, queryOnePg } from '@/lib/db/neon';

function isConfigured(): boolean {
  return true;
}

// Production VAPID Keys
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  'BB7odpSqlX57YkML5OSr95CFMHo27XDSNJV4ExvAd-Js_ZQ6MQSjkzMgSSzUAXzF5Hb5AvSDPh3r99HdrCraCvE';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'HsmbCllW_WUj3QDZsEIlXG13UfqKk2NtE8UWXkcfCpU';

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:service@madaar-organa.vercel.app';

// Configure web-push once
try {
  setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('VAPID initialization notice:', err);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Save or update a servant's device push subscription in Neon DB
 */
export async function savePushSubscriptionPg(
  userId: string,
  sub: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userAgent?: string
): Promise<boolean> {
  if (!isConfigured() || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return false;
  }

  const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  await queryPg(`
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)
    VALUES ($1, $2, $3, $4, $5, $6, now(), now())
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      last_used_at = now()
  `, [
    id,
    userId,
    sub.endpoint,
    sub.keys.p256dh,
    sub.keys.auth,
    userAgent || null,
  ]);

  return true;
}

/**
 * Send a push notification to all devices registered for a specific user
 */
export async function sendPushToUserPg(userId: string, payload: PushPayload): Promise<number> {
  if (!isConfigured() || !userId) return 0;

  const rows = await queryPg<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(`
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = $1 
       OR user_id IN (SELECT user_id FROM servants WHERE id = $1)
       OR user_id IN (SELECT id FROM servants WHERE user_id = $1)
  `, [userId]);

  if (rows.length === 0) return 0;

  return sendPushToSubscribers(rows, payload);
}

/**
 * Send a broadcast push notification to ALL registered servants' devices
 */
export async function sendPushToAllPg(payload: PushPayload): Promise<number> {
  if (!isConfigured()) return 0;

  const rows = await queryPg<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(`
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
  `);

  if (rows.length === 0) return 0;

  return sendPushToSubscribers(rows, payload);
}

/**
 * Send a push notification specifically to Church Administrators, Priests, and Service Secretaries
 */
export async function sendPushToAdminsPg(payload: PushPayload): Promise<number> {
  if (!isConfigured()) return 0;

  const rows = await queryPg<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(`
    SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
    FROM push_subscriptions ps
    JOIN users u ON ps.user_id = u.id
    WHERE u.role = 'admin' OR u.id = 'usr-admin'
  `);

  if (rows.length === 0) return 0;

  return sendPushToSubscribers(rows, payload);
}

/**
 * Internal delivery helper that pushes payload to devices and removes dead subscriptions
 */
async function sendPushToSubscribers(
  subscribers: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload
): Promise<number> {
  let deliveredCount = 0;
  const expiredIds: string[] = [];

  const stringPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
    tag: payload.tag || 'organa-alert',
  });

  await Promise.all(
    subscribers.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          stringPayload,
          {
            TTL: 60 * 60 * 24, // 24 hours
            urgency: 'high',
          }
        );
        deliveredCount++;
      } catch (err: any) {
        // If device unsubscribed or subscription expired (HTTP 404 or 410)
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredIds.push(sub.id);
        } else {
          console.warn(`Push delivery warning for ${sub.endpoint.slice(0, 30)}:`, err.message);
        }
      }
    })
  );

  // Clean up dead subscriptions
  if (expiredIds.length > 0) {
    try {
      await queryPg(
        `DELETE FROM push_subscriptions WHERE id = ANY($1::text[])`,
        [expiredIds]
      );
    } catch (cleanupErr) {
      console.warn('Failed to prune expired push subscriptions:', cleanupErr);
    }
  }

  return deliveredCount;
}
