'use client';

// ====================================================================
// ORGANA Sidebar — Simplified & Role-Based
// Developed by MADAAR Technologies
// ====================================================================

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderTree,
  CalendarCheck,
  BookOpen,
  AlertTriangle,
  ShieldCheck,
  Settings,
  HeartHandshake,
  BarChart3,
  GraduationCap,
  MessageCircle
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { currentRole, currentUser } = useAuth();

  const getNavItems = (): NavItem[] => {
    // ===== Admin (George - Full Technical & System Access) =====
    if (currentRole === 'admin') {
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/attendance', label: 'تسجيل الحضور', icon: CalendarCheck },
        { href: '/families', label: 'الأسر والقطاعات', icon: FolderTree },
        { href: '/notebooks', label: 'الكشاكيل', icon: BookOpen },
        { href: '/members', label: 'المخدومون', icon: Users },
        { href: '/servants', label: 'الخدام', icon: UserCheck },
        { href: '/alerts', label: 'تنبيهات الغياب', icon: AlertTriangle },
        { href: '/reports', label: 'التقارير', icon: BarChart3 },
        { href: '/academic-years', label: 'السنوات والترحيل السنوي', icon: GraduationCap },
        { href: '/users', label: 'إدارة المستخدمين', icon: ShieldCheck },
        { href: '/settings', label: 'الإعدادات الفنية', icon: Settings },
      ];
    }

    // ===== Priest (قدس أبونا - الرعاية، المتابعة، قبول الخدام) =====
    if (currentRole === 'priest') {
      return [
        { href: '/dashboard', label: 'لوحة الرعاية', icon: LayoutDashboard },
        { href: '/attendance/servants', label: 'غياب ومتابعة الخدام', icon: UserCheck },
        { href: '/alerts', label: 'غياب المخدومين والافتقاد', icon: Users },
        { href: '/families', label: 'الأسر والقطاعات', icon: FolderTree },
        { href: '/notebooks', label: 'الكشاكيل والتقارير', icon: BookOpen },
        { href: '/servants', label: 'سجل الخدام', icon: UserCheck },
        { href: '/reports', label: 'التقارير الرعوية', icon: BarChart3 },
        { href: '/academic-years', label: 'السنوات والترحيل السنوي', icon: GraduationCap },
        { href: '/users', label: 'الخدام الجدد والصلاحيات', icon: ShieldCheck },
      ];
    }

    // ===== Service Secretary (أمين الخدمة) =====
    if (currentRole === 'service_secretary') {
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/attendance', label: 'تسجيل الحضور', icon: CalendarCheck },
        { href: '/notebooks', label: 'الكشاكيل', icon: BookOpen, badge: 'مراجعة' },
        { href: '/families', label: 'الأسر والقطاعات', icon: FolderTree },
        { href: '/servants', label: 'الخدام', icon: UserCheck },
        { href: '/members', label: 'المخدومون', icon: Users },
        { href: '/academic-years', label: 'السنوات والترحيل السنوي', icon: GraduationCap },
        { href: '/alerts', label: 'تنبيهات الغياب', icon: AlertTriangle },
        { href: '/users', label: 'طلبات الانضمام والصلاحيات', icon: ShieldCheck },
      ];
    }

    // ===== Family Leader =====
    if (currentRole === 'family_leader') {
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/attendance', label: 'تسجيل الحضور', icon: CalendarCheck },
        { href: '/notebooks', label: 'الكشكول', icon: BookOpen },
        { href: '/members', label: 'مخدومو الأسرة', icon: Users },
        { href: '/alerts', label: 'تنبيهات الغياب', icon: AlertTriangle },
        { href: '/settings', label: 'الإعدادات', icon: Settings },
      ];
    }

    // ===== Servant =====
    return [
      { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
      { href: '/attendance', label: 'تسجيل الحضور', icon: CalendarCheck },
      { href: '/notebooks', label: 'الكشكول', icon: BookOpen },
      { href: '/members', label: 'مخدوميني', icon: Users },
      { href: '/tasks', label: 'مهام الافتقاد', icon: HeartHandshake },
      { href: '/settings', label: 'الإعدادات', icon: Settings },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-56 bg-white border-l border-[#EAE3E4] flex flex-col h-screen sticky top-0 shrink-0 select-none hidden md:flex z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#EAE3E4]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#702C3B] text-white flex items-center justify-center font-bold text-base shadow-sm">
            أ
          </div>
          <div>
            <div className="text-[9px] text-[#702C3B] font-extrabold leading-tight">مطرانية شبرا الخيمة وتوابعها</div>
            <div className="font-bold text-sm text-[#421923]">أورجانا</div>
            <div className="text-[10px] text-[#81777A]">مارجرجس بسندبيس</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#702C3B] text-white shadow-sm'
                  : 'text-[#282326] hover:bg-[#FAF5F6]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-[#81777A]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Contact Developer & Brand Footer */}
      <div className="p-3 border-t border-[#EAE3E4] space-y-2 text-center">
        <a
          href={`https://wa.me/201202074649?text=${encodeURIComponent(
            `بتواصل معاك بخصوص منظومة اورجانا انا (${currentUser?.full_name || 'مستخدم المنظومة'})`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-2xs active:scale-95"
        >
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          <span>تواصل مع المطور</span>
        </a>
        <div className="text-[10px] text-[#81777A] font-semibold tracking-wider">ORGANA • MADAAR Technologies</div>
      </div>
    </aside>
  );
}
