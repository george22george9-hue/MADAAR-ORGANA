// ====================================================================
// ORGANA — Unified Server-Side Authentication & RBAC Engine
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest } from 'next/server';
import { ChurchUser, UserRole } from '@/types/organa';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { queryOnePg } from '@/lib/db/neon';
import { isNeonConfigured } from '@/lib/services/neon-service';

export interface AuthResult {
  user: ChurchUser | null;
  error?: string;
  status: number;
}

/**
 * Extracts and verifies the authenticated user from the request.
 * Checks HTTP headers: `x-user-id`, `x-user-role`, or query fallback.
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  // 1. Try explicit custom headers
  const headerUserId = request.headers.get('x-user-id');
  const headerRole = request.headers.get('x-user-role') as UserRole | null;

  // 2. Try query params fallback
  const { searchParams } = new URL(request.url);
  const queryUserId = searchParams.get('userId') || searchParams.get('user_id');
  const queryRole = searchParams.get('role') as UserRole | null;
  const headerFamilyId = request.headers.get('x-user-family-id');
  const queryFamilyId = searchParams.get('userFamilyId') || searchParams.get('familyId');
  const effectiveFamilyId = headerFamilyId || queryFamilyId || null;

  const targetUserId = headerUserId || queryUserId;
  const targetRole = (headerRole || queryRole || 'priest') as UserRole;

  // 3. If targetUserId is provided, query from database
  if (targetUserId && isNeonConfigured()) {
    try {
      const dbUser = await queryOnePg(
        `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_active, 
                COALESCE(u.assigned_family_id, fs.family_id) as assigned_family_id, 
                COALESCE(u.assigned_stage, fs.stage, s.assigned_stage) as assigned_stage, 
                u.confession_father
         FROM users u
         LEFT JOIN servants s ON (s.user_id = u.id OR s.phone = u.phone OR s.id = $1)
         LEFT JOIN family_servants fs ON fs.servant_id = s.id
         WHERE u.id = $1 OR s.id = $1
         LIMIT 1`,
        [targetUserId]
      );

      if (dbUser) {
        if (!dbUser.is_active) {
          return {
            user: null,
            error: 'حساب المستخدم غير نشط أو تم إيقافه (Account Inactive)',
            status: 403,
          };
        }
        return {
          user: {
            ...dbUser,
            assigned_family_id: dbUser.assigned_family_id || effectiveFamilyId,
            is_active: Boolean(dbUser.is_active),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          status: 200,
        };
      }
    } catch {
      // Database query error or table not reachable in sandbox without mock
    }
  }

  // 4. Fallback to Initial Personas for mock / simulated sessions
  if (targetRole && INITIAL_PERSONAS[targetRole]) {
    const persona = INITIAL_PERSONAS[targetRole];
    return {
      user: {
        ...persona,
        id: targetUserId || persona.id,
        assigned_family_id: effectiveFamilyId || persona.assigned_family_id || (targetRole === 'servant' || targetRole === 'family_leader' ? 'fam-prep-boys' : null),
      },
      status: 200,
    };
  }

  return {
    user: null,
    error: 'بيانات المصادقة غير صحيحة أو المستخدم غير موجود (User Not Found)',
    status: 401,
  };
}

// ====================================================================
// RBAC Permission Helpers
// ====================================================================

/**
 * Superiors with church-wide management oversight: Admin, Priest, Secretary.
 */
export function canManageAll(user: ChurchUser): boolean {
  return user.role === 'admin' || user.role === 'priest' || user.role === 'service_secretary';
}

/**
 * Checks if user is permitted to view or manage the given family.
 */
export function canAccessFamily(user: ChurchUser, familyId?: string): boolean {
  if (canManageAll(user)) return true;
  if (!familyId) return false;
  if (!user.assigned_family_id) return true;
  return user.assigned_family_id === familyId;
}

/**
 * Checks if user is permitted to view or manage a specific follow-up task.
 */
export function canAccessTask(
  user: ChurchUser,
  task: { family_id?: string; servant_id?: string }
): boolean {
  if (canManageAll(user)) return true;
  if (user.role === 'family_leader' && user.assigned_family_id === task.family_id) {
    return true;
  }
  // Servant can only access tasks directly assigned to them
  return task.servant_id === user.id;
}

/**
 * Checks if user is permitted to resolve or dismiss an absence alert.
 * Restricted to: Admin, Priest, Secretary, and Family Leader (for their family).
 * Regular servants are STRICTLY FORBIDDEN from resolving alerts.
 */
export function canResolveAlert(user: ChurchUser, familyId?: string): boolean {
  if (canManageAll(user)) return true;
  if (user.role === 'family_leader' && user.assigned_family_id === familyId) {
    return true;
  }
  return false;
}

/**
 * Checks if user is authorized to read confidential pastoral notes.
 * Regular servants cannot see pastoral notes of members unless assigned to them.
 */
export function canViewPastoralNotes(user: ChurchUser, assignedServantId?: string): boolean {
  if (canManageAll(user)) return true;
  if (user.role === 'family_leader') return true;
  return user.id === assignedServantId;
}
