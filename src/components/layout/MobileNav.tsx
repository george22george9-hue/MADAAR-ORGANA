'use client';

// ====================================================================
// ORGANA Mobile Navigation — Simplified & Role-Filtered
// Developed by MADAAR Technologies
// ====================================================================

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import {
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  Users,
  Settings,
  AlertTriangle,
  X,
  HeartHandshake,
  ShieldCheck,
  UserCheck,
  FolderTree,
  BarChart3,
  LogOut,
  GraduationCap,
  Smartphone,
  Download,
  MessageCircle
} from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, currentUser, logout } = useAuth();

  // ── Role-based bottom tabs (max 4-5 for simplicity) ──
  const getBottomTabs = () => {
    if (currentRole === 'admin') {
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/attendance', label: 'الحضور', icon: CalendarCheck },
        { href: '/notebooks', label: 'الكشاكيل', icon: BookOpen },
        { href: '/families', label: 'الأسر', icon: FolderTree },
        { href: '/settings', label: 'الإعدادات', icon: Settings },
      ];
    }
    if (currentRole === 'priest') {
      return [
        { href: '/dashboard', label: 'الرعاية', icon: LayoutDashboard },
        { href: '/alerts', label: 'الافتقاد', icon: AlertTriangle },
        { href: '/attendance/servants', label: 'غياب الخدام', icon: UserCheck },
        { href: '/notebooks', label: 'الكشاكيل', icon: BookOpen },
        { href: '/settings', label: 'الإعدادات', icon: Settings },
      ];
    }
    if (currentRole === 'service_secretary') {
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/attendance', label: 'الحضور', icon: CalendarCheck },
        { href: '/notebooks', label: 'الكشاكيل', icon: BookOpen },
        { href: '/servants', label: 'الخدام', icon: UserCheck },
        { href: '/alerts', label: 'الافتقاد', icon: AlertTriangle },
      ];
    }
    if (currentRole === 'family_leader') {
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/attendance', label: 'الحضور', icon: CalendarCheck },
        { href: '/notebooks', label: 'الكشكول', icon: BookOpen },
        { href: '/members', label: 'المخدومون', icon: Users },
        { href: '/settings', label: 'الإعدادات', icon: Settings },
      ];
    }
    // Servant
    return [
      { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
      { href: '/attendance', label: 'الحضور', icon: CalendarCheck },
      { href: '/members', label: 'مخدوميني', icon: Users },
      { href: '/tasks', label: 'الافتقاد', icon: HeartHandshake },
      { href: '/settings', label: 'الإعدادات', icon: Settings },
    ];
  };

  // ── Role-based drawer links ──
  const getDrawerLinks = () => {
    const common = [
      { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
      { href: '/attendance', label: 'تسجيل الحضور', icon: CalendarCheck },
    ];

    if (currentRole === 'admin') {
      return [
        ...common,
        { href: '/families', label: 'الأسر والقطاعات', icon: FolderTree },
        { href: '/notebooks', label: 'الكشاكيل', icon: BookOpen },
        { href: '/members', label: 'المخدومون', icon: Users },
        { href: '/servants', label: 'الخدام', icon: UserCheck },
        { href: '/alerts', label: 'تنبيهات الغياب', icon: AlertTriangle },
        { href: '/reports', label: 'التقارير', icon: BarChart3 },
        { href: '/academic-years', label: 'السنوات والترحيل', icon: GraduationCap },
        { href: '/users', label: 'إدارة المستخدمين', icon: ShieldCheck },
        { href: '/settings', label: 'الإعدادات الفنية', icon: Settings },
      ];
    }

    if (currentRole === 'priest') {
      return [
        { href: '/dashboard', label: 'لوحة الرعاية', icon: LayoutDashboard },
        { href: '/attendance/servants', label: 'غياب ومتابعة الخدام', icon: UserCheck },
        { href: '/alerts', label: 'غياب المخدومين والافتقاد', icon: AlertTriangle },
        { href: '/families', label: 'الأسر والقطاعات', icon: FolderTree },
        { href: '/notebooks', label: 'الكشاكيل والتقارير', icon: BookOpen },
        { href: '/servants', label: 'سجل الخدام', icon: UserCheck },
        { href: '/reports', label: 'التقارير الرعوية', icon: BarChart3 },
        { href: '/academic-years', label: 'السنوات والترحيل', icon: GraduationCap },
        { href: '/users', label: 'الخدام الجدد والصلاحيات', icon: ShieldCheck },
      ];
    }

    if (currentRole === 'service_secretary') {
      return [
        ...common,
        { href: '/notebooks', label: 'مراجعة الكشاكيل', icon: BookOpen },
        { href: '/families', label: 'الأسر', icon: FolderTree },
        { href: '/servants', label: 'الخدام', icon: UserCheck },
        { href: '/members', label: 'المخدومون', icon: Users },
        { href: '/academic-years', label: 'السنوات والترحيل', icon: GraduationCap },
        { href: '/alerts', label: 'تنبيهات الغياب', icon: AlertTriangle },
        { href: '/users', label: 'طلبات الانضمام والصلاحيات', icon: ShieldCheck },
      ];
    }

    if (currentRole === 'family_leader') {
      return [
        ...common,
        { href: '/notebooks', label: 'الكشكول', icon: BookOpen },
        { href: '/members', label: 'مخدومو الأسرة', icon: Users },
        { href: '/alerts', label: 'تنبيهات الغياب', icon: AlertTriangle },
        { href: '/settings', label: 'الإعدادات', icon: Settings },
      ];
    }

    // Servant
    return [
      ...common,
      { href: '/members', label: 'مخدوميني', icon: Users },
      { href: '/tasks', label: 'مهام الافتقاد', icon: HeartHandshake },
      { href: '/settings', label: 'الإعدادات', icon: Settings },
    ];
  };

  const bottomTabs = getBottomTabs();
  const drawerLinks = getDrawerLinks();

  const ROLE_LABELS: Record<string, string> = {
    admin: 'إدارة المنظومة',
    priest: 'الكاهن',
    service_secretary: 'أمين الخدمة',
    family_leader: 'أمين الأسرة',
    servant: 'خادم',
  };

  const handleLogout = () => {
    onClose();
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Slide-over Drawer */}
      <div
        className={`fixed top-0 bottom-0 right-0 w-64 bg-white z-50 md:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#EAE3E4] flex items-center justify-between bg-[#FAF5F6]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#702C3B] text-white flex items-center justify-center font-bold text-sm">
              أ
            </div>
            <div>
              <div className="font-bold text-sm text-[#421923]">{currentUser.full_name}</div>
              <div className="text-[10px] text-[#81777A]">{ROLE_LABELS[currentRole]}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#EAE3E4] text-[#81777A] hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {drawerLinks.map((link) => {
            const isActive = pathname === link.href || 
              (link.href !== '/dashboard' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-[#702C3B] text-white' : 'text-[#282326] hover:bg-[#FAF5F6]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#81777A]'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Developer Contact, PWA Install & Logout */}
        <div className="p-3 border-t border-[#EAE3E4] space-y-2">
          <a
            href={`https://wa.me/201202074649?text=${encodeURIComponent(
              `بتواصل معاك بخصوص منظومة اورجانا انا (${currentUser?.full_name || 'مستخدم المنظومة'})`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>تواصل مع المطور</span>
          </a>

          <button
            onClick={() => {
              onClose();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('organa-trigger-pwa-install'));
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#702C3B] bg-[#FAF5F6] border border-[#702C3B]/20 hover:bg-[#F3E8EB] transition-colors"
          >
            <Smartphone className="w-4 h-4 text-[#702C3B]" />
            <span>تثبيت التطبيق على الشاشة الرئيسية</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav
        aria-label="شريط التنقل السفلي"
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#EAE3E4] z-30 flex items-center justify-around pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] px-1 shadow-[0_-2px_8px_rgba(66,25,35,0.05)] md:hidden"
      >
        {bottomTabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== '/dashboard' && tab.href !== '/settings' && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 min-w-[48px] transition-all select-none ${
                isActive ? 'text-[#702C3B]' : 'text-[#81777A]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-[#702C3B] stroke-[2.2]' : 'stroke-[1.8]'}`} />
              <span className={`text-[10px] font-bold ${isActive ? 'text-[#702C3B]' : 'text-[#81777A]'}`}>
                {tab.label}
              </span>
              {isActive && <span className="w-1 h-1 rounded-full bg-[#702C3B] mt-0.5" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
