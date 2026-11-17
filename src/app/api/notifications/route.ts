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
  deleteNotificationPg,
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

    // 1.1 Delete notification
    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, error: 'معرف الإشعار مطلوب' }, { status: 400 });
      if (isNeonConfigured()) {
        await deleteNotificationPg(id);
      }
      return NextResponse.json({ success: true, message: 'تم حذف الرسالة بنجاح' });
    }

    // 2. Trigger Tuesday Notebook Preparation Reminder
    if (action === 'tuesday_reminder') {
      const senderName = body.senderName || 'إدارة الأبلكيشن';
      if (isNeonConfigured()) {
        const notif = await sendTuesdayNotebookReminderPg(senderName);
        // Deliver lock-screen push notification only if fresh (created in the last 60 seconds)
        const isFresh = notif.created_at && (Date.now() - new Date(notif.created_at).getTime() < 60000);
        if (isFresh) {
          sendPushToAllPg({
            title: '📓 كشكول الخدمة — مارجرجس سندبيس',
            body: notif.message,
            url: '/notebooks',
            tag: 'tuesday-prep',
          }).catch(console.error);
        }
        return NextResponse.json({ success: true, notification: notif });
      }
      return NextResponse.json({ success: true });
    }

    // 3. Broadcast Message with Strict Role & Sender Enforcement (محدش يقدر يبعت باسم التاني)
    const clientRole = (body.senderRole as UserRole) || 'admin';
    const message = (body.message || '').trim();

    if (!message) {
      return NextResponse.json({ success: false, error: 'يرجى كتابة نص الرسالة أولاً' }, { status: 400 });
    }

    let enforcedSenderName = 'إدارة الأبلكيشن';
    let enforcedRole: UserRole = 'admin';
    let enforcedType: 'priest_broadcast' | 'general' = 'general';
    let enforcedTitle = '📢 تنبيه من إدارة الأبلكيشن';

    if (clientRole === 'priest') {
      enforcedRole = 'priest';
      enforcedSenderName = 'قدس أبونا الكاهن';
      enforcedType = 'priest_broadcast';
      enforcedTitle = '✝️ رسالة من قدس أبونا';
    } else if (clientRole === 'service_secretary') {
      enforcedRole = 'service_secretary';
      enforcedSenderName = 'أمين الخدمة';
      enforcedType = 'general';
      enforcedTitle = '📋 تنبيه من أمين الخدمة';
    } else {
      enforcedRole = 'admin';
      enforcedSenderName = 'إدارة الأبلكيشن';
      enforcedType = 'general';
      enforcedTitle = '📢 تنبيه من إدارة الأبلكيشن';
    }

    if (isNeonConfigured()) {
      const notif = await createNotificationPg({
        target_type: 'all',
        sender_id: body.senderId || null,
        sender_name: enforcedSenderName,
        sender_role: enforcedRole,
        title: enforcedTitle,
        message: message,
        type: enforcedType,
      });

      // Deliver lock-screen push notification to all servants
      sendPushToAllPg({
        title: `${enforcedTitle} — مارجرجس سندبيس`,
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'معرف الإشعار مطلوب' }, { status: 400 });
    if (isNeonConfigured()) {
      await deleteNotificationPg(id);
    }
    return NextResponse.json({ success: true, message: 'تم حذف الرسالة بنجاح' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
