// ====================================================================
// ORGANA — Church Notifications & Broadcast API (/api/notifications)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  isNeonConfigured,
  getNotificationsPg,
  createNotificationPg,
  markNotificationAsReadPg,
  sendTuesdayNotebookReminderPg,
} from '@/lib/services/neon-service';
import { sendPushToAllPg } from '@/lib/services/push-service';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const familyId = searchParams.get('familyId') || undefined;

    if (isNeonConfigured()) {
      const notifications = await getNotificationsPg(userId, familyId);
      const unreadCount = notifications.filter(n => !n.is_read).length;
      return NextResponse.json({ success: true, notifications, unreadCount });
    }

    return NextResponse.json({ success: true, notifications: [], unreadCount: 0 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'broadcast';

    // 1. Mark notification as read
    if (action === 'mark_read') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, error: 'معرف الإشعار مطلوب' }, { status: 400 });
      if (isNeonConfigured()) {
        await markNotificationAsReadPg(id);
      }
      return NextResponse.json({ success: true });
    }

    // 2. Trigger Tuesday Notebook Preparation Reminder
    if (action === 'tuesday_reminder') {
      const senderName = body.senderName || 'إدارة الخدمة';
      if (isNeonConfigured()) {
        const notif = await sendTuesdayNotebookReminderPg(senderName);
        // Deliver lock-screen push notification to all servants
        sendPushToAllPg({
          title: '📓 كشكول الخدمة — مارجرجس سندبيس',
          body: notif.message,
          url: '/notebooks',
          tag: 'tuesday-prep',
        }).catch(console.error);
        return NextResponse.json({ success: true, notification: notif });
      }
      return NextResponse.json({ success: true });
    }

    // 3. Broadcast Priest or Admin Message
    const senderRole = (body.senderRole as UserRole) || 'priest';
    const senderName = body.senderName || (senderRole === 'priest' ? 'قدس أبونا الكاهن' : 'إدارة المنظومة');
    const message = (body.message || '').trim();

    if (!message) {
      return NextResponse.json({ success: false, error: 'يرجى كتابة نص الرسالة أولاً' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      const title = senderRole === 'priest' ? '✝️ رسالة من قدس أبونا' : '📢 تنبيه من إدارة الخدمة';
      const notif = await createNotificationPg({
        target_type: 'all',
        sender_id: body.senderId || null,
        sender_name: senderName,
        sender_role: senderRole,
        title: title,
        message: message,
        type: senderRole === 'priest' ? 'priest_broadcast' : 'general',
      });

      // Deliver lock-screen push notification to all servants
      sendPushToAllPg({
        title: `${title} — مارجرجس سندبيس`,
        body: message,
        url: '/alerts',
        tag: 'church-broadcast',
      }).catch(console.error);

      return NextResponse.json({ success: true, notification: notif });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
