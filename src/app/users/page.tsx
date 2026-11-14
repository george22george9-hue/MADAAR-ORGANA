'use client';

// ====================================================================
// ORGANA — User Management, RBAC & Servant Join Requests Approval Portal
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { ChurchUser, UserRole, Family, JoinRequest } from '@/types/organa';
import {
  ShieldCheck,
  Plus,
  Search,
  User,
  Phone,
  Mail,
  Shield,
  CheckCircle2,
  XCircle,
  Edit2,
  FileCheck2,
  Users,
  CalendarCheck,
  Info,
  Clock,
  Check,
  X,
  AlertCircle,
  Building2,
  UserPlus,
  Sparkles,
  Lock
} from 'lucide-react';

function UsersContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'requests' ? 'requests' : 'users';

  const { currentRole, currentUser } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<'users' | 'requests'>(initialTab);

  // Users State
  const [users, setUsers] = useState<ChurchUser[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | UserRole>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ChurchUser | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('priest');
  const [formFamilyId, setFormFamilyId] = useState('');
  const [formConfessionFather, setFormConfessionFather] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Join Requests State
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Rejection Modal State
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadData = () => {
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/families').then(r => r.json()),
      fetch('/api/join-requests').then(r => r.json()),
    ])
      .then(([uRes, fRes, rRes]) => {
        if (uRes.success) setUsers(uRes.users);
        if (fRes.success) setFamilies(fRes.families);
        if (rRes.success) setRequests(rRes.requests);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole(currentRole === 'admin' ? 'priest' : 'servant');
    setFormFamilyId('fam-prep-boys');
    setFormConfessionFather('');
    setFormPassword('organa2026');
    setShowModal(true);
  };

  const openEditModal = (u: ChurchUser) => {
    setEditingUser(u);
    setFormName(u.full_name);
    setFormEmail(u.email);
    setFormPhone(u.phone);
    setFormRole(u.role);
    setFormFamilyId(u.assigned_family_id || '');
    setFormConfessionFather(u.confession_father || '');
    setFormPassword('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;
    setSubmitting(true);

    try {
      const url = '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = {
        id: editingUser?.id,
        full_name: formName.trim(),
        email: formEmail.trim() || `${formPhone.trim()}@organa.eg`,
        phone: formPhone.trim(),
        role: formRole,
        assigned_family_id: formRole === 'family_leader' || formRole === 'servant' ? formFamilyId || null : null,
        confession_father: formConfessionFather.trim() || null,
        password: formPassword.trim() || undefined,
        actorRole: currentRole,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Approve Request
  const handleApproveRequest = async (requestItem: JoinRequest) => {
    setRequestActionLoadingId(requestItem.id);
    setActionNotice(null);

    try {
      const res = await fetch(`/api/join-requests/${requestItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          reviewerRole: currentRole,
          reviewerId: currentUser.id,
          reviewerName: currentUser.full_name,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: `تم بنجاح اعتماد وتفعيل حساب ${requestItem.full_name} كـ (${requestItem.requested_role === 'family_leader' ? 'أمين أسرة' : 'خادم في الأسرة'})! يمكنه الآن تسجيل الدخول مباشرة برقم هاتفه.`,
          type: 'success',
        });
        loadData();
      } else {
        setActionNotice({
          text: data.error || 'تعذر اعتماد الطلب',
          type: 'error',
        });
      }
    } catch (err) {
      setActionNotice({ text: 'حدث خطأ في الاتصال بالسيرفر', type: 'error' });
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  // Handle Reject Request
  const handleRejectConfirm = async () => {
    if (!rejectingRequestId) return;
    setRequestActionLoadingId(rejectingRequestId);
    setActionNotice(null);

    try {
      const res = await fetch(`/api/join-requests/${rejectingRequestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: rejectionReason.trim() || undefined,
          reviewerRole: currentRole,
          reviewerId: currentUser.id,
          reviewerName: currentUser.full_name,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionNotice({
          text: 'تم رفض طلب الانضمام بنجاح.',
          type: 'success',
        });
        setRejectingRequestId(null);
        setRejectionReason('');
        loadData();
      } else {
        setActionNotice({
          text: data.error || 'تعذر رفض الطلب',
          type: 'error',
        });
      }
    } catch (err) {
      setActionNotice({ text: 'حدث خطأ في الاتصال بالسيرفر', type: 'error' });
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const roleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE4E6] text-[#9F1239] border border-rose-200">إدارة المنظومة</span>;
      case 'priest':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FCE7F3] text-[#9D174D] border border-pink-200">كاهن الكنيسة</span>;
      case 'service_secretary':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-blue-200">أمين الخدمة</span>;
      case 'family_leader':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-amber-200">أمين أسرة</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-emerald-200">خادم أسرة</span>;
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const priestsCount = users.filter(u => u.role === 'priest').length;
  const secretariesCount = users.filter(u => u.role === 'service_secretary').length;
  const leadersCount = users.filter(u => u.role === 'family_leader').length;
  const servantsCount = users.filter(u => u.role === 'servant').length;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      !search ||
      u.full_name.includes(search) ||
      u.email.includes(search) ||
      u.phone.includes(search);
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredRequests = requests.filter(r => {
    const matchesFilter = requestsFilter === 'all' || r.status === requestsFilter;
    const matchesSearch =
      !search ||
      r.full_name.includes(search) ||
      r.phone.includes(search) ||
      (r.requested_family_name && r.requested_family_name.includes(search));
    return matchesFilter && matchesSearch;
  });

  const getFamilyName = (familyId?: string | null) => {
    if (!familyId) return '—';
    const fam = families.find(f => f.id === familyId);
    return fam ? fam.name : familyId;
  };

  // Access check: only admin, priest, or service_secretary can access this page
  const canManage = currentRole === 'admin' || currentRole === 'priest' || currentRole === 'service_secretary';

  if (!canManage) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#FAF5F6] border border-[#EAE3E4] text-[#702C3B] mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#421923]">صلاحية الوصول مقتصرة على الإدارة والرعاة</h2>
          <p className="text-xs text-[#81777A] leading-relaxed">
            وفقاً لسياسة المنظومة الكنسية، فإن إدارة الحسابات واعتماد طلبات انضمام الخدام وصلاحيات المستخدمين مقتصرة حصراً على <strong>إدارة المنظومة</strong>، <strong>الآباء الكهنة</strong>، و<strong>أمناء الخدمة</strong>.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-[#EAE3E4] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-[#702C3B]" />
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                إدارة المستخدمين وطلبات الاعتماد (RBAC)
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              مراجعة واعتماد طلبات انضمام الخدام الجدد، تسكين أمناء الأسر، وضبط صلاحيات الهيكل الكنسي
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 rounded-2xl bg-[#5A1E2D] hover:bg-[#421923] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حساب يدوي</span>
            </button>
          </div>
        </div>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium flex items-start justify-between gap-3 animate-in fade-in ${actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
              }`}
          >
            <div className="flex items-start gap-2">
              {actionNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{actionNotice.text}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Tab Switcher (المستخدمون النشطون vs طلبات الانضمام والاعتماد) */}
        <div className="bg-white p-1.5 rounded-2xl border border-[#EAE3E4] shadow-2xs flex items-center gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveMainTab('users')}
            className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${activeMainTab === 'users'
              ? 'bg-[#702C3B] text-white shadow-xs'
              : 'text-[#421923] hover:text-[#702C3B] hover:bg-[#FAF5F6]'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>المستخدمون النشطون والمعتمدون ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('requests')}
            className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 relative ${activeMainTab === 'requests'
              ? 'bg-[#702C3B] text-white shadow-xs'
              : 'text-[#421923] hover:text-[#702C3B] hover:bg-[#FAF5F6]'
              }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>طلبات الانضمام والاعتماد ({requests.length})</span>
            {pendingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                {pendingRequests.length} بانتظار الاعتماد
              </span>
            )}
          </button>
        </div>

        {/* ================================================================ */}
        {/* TAB 1: ACTIVE USERS LIST                                         */}
        {/* ================================================================ */}
        {activeMainTab === 'users' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* 5 Role Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Admin */}
              <div
                onClick={() => setSelectedRoleFilter('admin')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedRoleFilter === 'admin'
                  ? 'border-[#702C3B] bg-[#FAF5F6] shadow-xs'
                  : 'border-[#EAE3E4] bg-white hover:border-[#702C3B]/40'
                  }`}
              >
                <div className="flex items-center justify-between text-xs text-[#81777A]">
                  <span className="font-bold">إدارة المنظومة</span>
                  <Shield className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-bold text-[#421923] my-1">{adminCount}</div>
                <div className="text-[10px] text-[#81777A]">مسؤول النظام والتحكم</div>
              </div>

              {/* Priests */}
              <div
                onClick={() => setSelectedRoleFilter('priest')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedRoleFilter === 'priest'
                  ? 'border-[#702C3B] bg-[#FAF5F6] shadow-xs'
                  : 'border-[#EAE3E4] bg-white hover:border-[#702C3B]/40'
                  }`}
              >
                <div className="flex items-center justify-between text-xs text-[#81777A]">
                  <span className="font-bold">الآباء الكهنة</span>
                  <Shield className="w-4 h-4 text-[#9D174D]" />
                </div>
                <div className="text-2xl font-bold text-[#421923] my-1">{priestsCount}</div>
                <div className="text-[10px] text-[#81777A]">رعاة الكنيسة — صلاحيات عليا</div>
              </div>

              {/* Secretaries */}
              <div
                onClick={() => setSelectedRoleFilter('service_secretary')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedRoleFilter === 'service_secretary'
                  ? 'border-[#702C3B] bg-[#FAF5F6] shadow-xs'
                  : 'border-[#EAE3E4] bg-white hover:border-[#702C3B]/40'
                  }`}
              >
                <div className="flex items-center justify-between text-xs text-[#81777A]">
                  <span className="font-bold">أمناء الخدمة</span>
                  <FileCheck2 className="w-4 h-4 text-[#1D4ED8]" />
                </div>
                <div className="text-2xl font-bold text-[#421923] my-1">{secretariesCount}</div>
                <div className="text-[10px] text-[#81777A]">إشراف عام ومراجعة كشاكيل</div>
              </div>

              {/* Family Leaders */}
              <div
                onClick={() => setSelectedRoleFilter('family_leader')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedRoleFilter === 'family_leader'
                  ? 'border-[#702C3B] bg-[#FAF5F6] shadow-xs'
                  : 'border-[#EAE3E4] bg-white hover:border-[#702C3B]/40'
                  }`}
              >
                <div className="flex items-center justify-between text-xs text-[#81777A]">
                  <span className="font-bold">أمناء الأسر</span>
                  <Users className="w-4 h-4 text-[#B45309]" />
                </div>
                <div className="text-2xl font-bold text-[#421923] my-1">{leadersCount}</div>
                <div className="text-[10px] text-[#81777A]">أمين معتمد لكل أسرة (10 أسر)</div>
              </div>

              {/* Servants */}
              <div
                onClick={() => setSelectedRoleFilter('servant')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedRoleFilter === 'servant'
                  ? 'border-[#702C3B] bg-[#FAF5F6] shadow-xs'
                  : 'border-[#EAE3E4] bg-white hover:border-[#702C3B]/40'
                  }`}
              >
                <div className="flex items-center justify-between text-xs text-[#81777A]">
                  <span className="font-bold">خدام الأسر</span>
                  <CalendarCheck className="w-4 h-4 text-[#166534]" />
                </div>
                <div className="text-2xl font-bold text-[#421923] my-1">{servantsCount}</div>
                <div className="text-[10px] text-[#81777A]">موزعون على الأسر لافتقادها</div>
              </div>
            </div>

            {/* Users Table Card */}
            <div className="bg-white rounded-3xl border border-[#EAE3E4] shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                  <button
                    onClick={() => setSelectedRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all ${selectedRoleFilter === 'all'
                      ? 'bg-[#5A1E2D] text-white'
                      : 'bg-[#FAF5F6] text-[#282326] hover:bg-[#EAE3E4]'
                      }`}
                  >
                    الكل ({users.length})
                  </button>
                  <button
                    onClick={() => setSelectedRoleFilter('admin')}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all ${selectedRoleFilter === 'admin'
                      ? 'bg-[#5A1E2D] text-white'
                      : 'bg-[#FAF5F6] text-[#282326] hover:bg-[#EAE3E4]'
                      }`}
                  >
                    الإدارة ({adminCount})
                  </button>
                  <button
                    onClick={() => setSelectedRoleFilter('priest')}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all ${selectedRoleFilter === 'priest'
                      ? 'bg-[#5A1E2D] text-white'
                      : 'bg-[#FAF5F6] text-[#282326] hover:bg-[#EAE3E4]'
                      }`}
                  >
                    الكهنة ({priestsCount})
                  </button>
                  <button
                    onClick={() => setSelectedRoleFilter('service_secretary')}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all ${selectedRoleFilter === 'service_secretary'
                      ? 'bg-[#5A1E2D] text-white'
                      : 'bg-[#FAF5F6] text-[#282326] hover:bg-[#EAE3E4]'
                      }`}
                  >
                    أمناء الخدمة ({secretariesCount})
                  </button>
                  <button
                    onClick={() => setSelectedRoleFilter('family_leader')}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all ${selectedRoleFilter === 'family_leader'
                      ? 'bg-[#5A1E2D] text-white'
                      : 'bg-[#FAF5F6] text-[#282326] hover:bg-[#EAE3E4]'
                      }`}
                  >
                    أمناء الأسر ({leadersCount})
                  </button>
                  <button
                    onClick={() => setSelectedRoleFilter('servant')}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all ${selectedRoleFilter === 'servant'
                      ? 'bg-[#5A1E2D] text-white'
                      : 'bg-[#FAF5F6] text-[#282326] hover:bg-[#EAE3E4]'
                      }`}
                  >
                    الخدام ({servantsCount})
                  </button>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#81777A] absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث بالاسم، الهاتف، البريد..."
                    className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-[#EAE3E4] text-[#81777A] bg-[#FAF5F6]">
                      <th className="py-3 px-3">الاسم بالكامل</th>
                      <th className="py-3 px-3">الرتبة والصلاحية</th>
                      <th className="py-3 px-3">الأسرة المخصصة</th>
                      <th className="py-3 px-3">أب الاعتراف</th>
                      <th className="py-3 px-3">الهاتف</th>
                      <th className="py-3 px-3">البريد الإلكتروني</th>
                      <th className="py-3 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE3E4]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAF5F6]/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-[#421923] text-sm flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#FAF5F6] text-[#702C3B] font-bold text-xs flex items-center justify-center border border-[#EAE3E4]">
                            {u.full_name.substring(0, 1)}
                          </div>
                          <span>{u.full_name}</span>
                        </td>
                        <td className="py-3 px-3">{roleBadge(u.role)}</td>
                        <td className="py-3 px-3">
                          {u.role === 'admin' || u.role === 'priest' || u.role === 'service_secretary' ? (
                            <span className="text-[#81777A] font-medium">كافة الأسر (صلاحية عليا)</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-[#421923] font-bold text-[11px]">
                              {getFamilyName(u.assigned_family_id)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#702C3B] font-medium">{u.confession_father || '—'}</td>
                        <td className="py-3 px-3 text-[#282326] font-mono">{u.phone}</td>
                        <td className="py-3 px-3 text-[#81777A]">{u.email}</td>
                        <td className="py-3 px-3 text-center">
                          {u.role === 'admin' && currentRole !== 'admin' ? (
                            <span className="text-[10px] text-gray-400 font-bold px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">
                              🔒 محمي
                            </span>
                          ) : (
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:bg-[#FAF5F6] hover:text-[#702C3B] transition-colors"
                              title="تعديل الحساب"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: JOIN REQUESTS & APPROVAL WORKFLOW                         */}
        {/* ================================================================ */}
        {activeMainTab === 'requests' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* KPI Strip for Requests */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div
                onClick={() => setRequestsFilter('all')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${requestsFilter === 'all'
                  ? 'border-[#702C3B] bg-[#FAF5F6] shadow-xs'
                  : 'border-[#EAE3E4] bg-white hover:border-[#702C3B]/40'
                  }`}
              >
                <div className="text-xs text-[#81777A] font-bold">إجمالي الطلبات</div>
                <div className="text-2xl font-bold text-[#421923] my-1">{requests.length}</div>
                <div className="text-[10px] text-[#81777A]">كافة طلبات الانضمام</div>
              </div>

              <div
                onClick={() => setRequestsFilter('pending')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${requestsFilter === 'pending'
                  ? 'border-amber-400 bg-amber-50 shadow-xs'
                  : 'border-[#EAE3E4] bg-white hover:border-amber-300'
                  }`}
              >
                <div className="text-xs text-amber-800 font-bold flex items-center justify-between">
                  <span>بانتظار الاعتماد</span>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-900 my-1">{pendingRequests.length}</div>
                <div className="text-[10px] text-amber-700">تحتاج موافقة لتفعيل الحساب</div>
              </div>

              <div
                onClick={() => setRequestsFilter('approved')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${requestsFilter === 'approved'
                  ? 'border-emerald-400 bg-emerald-50 shadow-xs'
                  : 'border-[#EAE3E4] bg-white hover:border-emerald-300'
                  }`}
              >
                <div className="text-xs text-emerald-800 font-bold flex items-center justify-between">
                  <span>تم الاعتماد</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-900 my-1">{approvedRequests.length}</div>
                <div className="text-[10px] text-emerald-700">حسابات مفعلة تعمل بالخدمة</div>
              </div>

              <div
                onClick={() => setRequestsFilter('rejected')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${requestsFilter === 'rejected'
                  ? 'border-red-400 bg-red-50 shadow-xs'
                  : 'border-[#EAE3E4] bg-white hover:border-red-300'
                  }`}
              >
                <div className="text-xs text-red-800 font-bold flex items-center justify-between">
                  <span>مرفوضة</span>
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-900 my-1">{rejectedRequests.length}</div>
                <div className="text-[10px] text-red-700">طلبات لم تتم الموافقة عليها</div>
              </div>
            </div>

            {/* Filter Buttons & Search */}
            <div className="bg-white p-4 rounded-3xl border border-[#EAE3E4] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs w-full sm:w-auto">
                <button
                  onClick={() => setRequestsFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${requestsFilter === 'all'
                    ? 'bg-[#702C3B] text-white shadow-2xs'
                    : 'bg-[#FAF5F6] text-[#282326] hover:bg-[#EAE3E4]'
                    }`}
                >
                  الكل ({requests.length})
                </button>
                <button
                  onClick={() => setRequestsFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${requestsFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                >
                  <span>قيد المراجعة</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-[10px]">
                    {pendingRequests.length}
                  </span>
                </button>
                <button
                  onClick={() => setRequestsFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${requestsFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                >
                  تم الاعتماد ({approvedRequests.length})
                </button>
                <button
                  onClick={() => setRequestsFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${requestsFilter === 'rejected'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-red-50 text-red-800 hover:bg-red-100'
                    }`}
                >
                  مرفوض ({rejectedRequests.length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#81777A] absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث في الطلبات بالاسم أو الهاتف..."
                  className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B]"
                />
              </div>
            </div>

            {/* Requests Cards List */}
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#EAE3E4] p-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-[#421923]">لا توجد طلبات مطابقة لهذا الفلتر</p>
                <p className="text-xs text-[#81777A]">جميع الطلبات الواردة تمت معالجتها أو لا توجد طلبات جديدة.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((reqItem) => {
                  const isPending = reqItem.status === 'pending';
                  const isApproved = reqItem.status === 'approved';
                  const isRejected = reqItem.status === 'rejected';
                  const isProcessing = requestActionLoadingId === reqItem.id;

                  return (
                    <div
                      key={reqItem.id}
                      className={`p-5 rounded-3xl bg-white border transition-all shadow-xs ${isPending
                        ? 'border-amber-300 ring-2 ring-amber-100/60'
                        : isApproved
                          ? 'border-emerald-200'
                          : 'border-red-200 opacity-80'
                        }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Right: Applicant Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-[#421923]">
                              {reqItem.full_name}
                            </span>

                            {/* Role Badge */}
                            {reqItem.requested_role === 'family_leader' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-amber-300 flex items-center gap-1">
                                <span>👑 أمين الأسرة (طلب قيادة المرحلة)</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#166534] border border-emerald-300 flex items-center gap-1">
                                <span>🤝 خادم في الأسرة (افتقاد ومتابعة)</span>
                              </span>
                            )}

                            {/* Status Pill */}
                            {isPending && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>قيد المراجعة</span>
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>معتمد ومفعل</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                                <X className="w-3 h-3" />
                                <span>طلب مرفوض</span>
                              </span>
                            )}
                          </div>

                          {/* Family & Contact Info */}
                          <div className="flex items-center gap-3 text-xs text-[#81777A] flex-wrap">
                            <span className="flex items-center gap-1 font-bold text-[#421923]">
                              <Building2 className="w-3.5 h-3.5 text-[#702C3B]" />
                              <span>الأسرة المطلوبة:</span>
                              <span className="px-2 py-0.5 rounded-md bg-[#FAF5F6] border border-[#EAE3E4] text-[#702C3B]">
                                {reqItem.requested_family_name || getFamilyName(reqItem.requested_family_id)}
                              </span>
                            </span>

                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <a
                                href={`tel:${reqItem.phone}`}
                                className="font-mono text-[#282326] font-bold hover:underline"
                              >
                                {reqItem.phone}
                              </a>
                            </span>

                            {reqItem.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                <span>{reqItem.email}</span>
                              </span>
                            )}

                            <span className="text-[11px] text-[#A89FA2]">
                              تاريخ التقديم: {new Date(reqItem.created_at).toLocaleDateString('ar-EG')}
                            </span>
                          </div>

                          {/* Applicant Notes */}
                          {reqItem.notes && (
                            <div className="p-2.5 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] text-xs text-[#421923] leading-relaxed">
                              <span className="font-bold text-[#81777A] block mb-0.5">نبذة / ملاحظات الخادم:</span>
                              {reqItem.notes}
                            </div>
                          )}

                          {/* Approval / Rejection Audit Info */}
                          {isApproved && reqItem.reviewed_by_name && (
                            <div className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                              ✓ تم الاعتماد وتفعيل الحساب بواسطة: <strong>{reqItem.reviewed_by_name}</strong>
                              {reqItem.reviewed_at && ` بتاريخ ${new Date(reqItem.reviewed_at).toLocaleString('ar-EG')}`}
                            </div>
                          )}

                          {isRejected && (
                            <div className="text-[11px] text-red-800 bg-red-50/70 p-2 rounded-xl border border-red-100">
                              ✕ تم الرفض بواسطة: <strong>{reqItem.reviewed_by_name || 'الإدارة'}</strong>
                              {reqItem.rejection_reason && ` — سبب الرفض: "${reqItem.rejection_reason}"`}
                            </div>
                          )}
                        </div>

                        {/* Left: Action Controls */}
                        {isPending && (
                          <div className="flex items-center gap-2 shrink-0 self-stretch md:self-center justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#EAE3E4]">
                            <button
                              disabled={isProcessing}
                              onClick={() => handleApproveRequest(reqItem)}
                              className="flex-1 md:flex-none px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                            >
                              <Check className="w-4 h-4" />
                              <span>{isProcessing ? 'جارٍ الاعتماد...' : 'قبول وتفعيل الحساب ✓'}</span>
                            </button>

                            <button
                              disabled={isProcessing}
                              onClick={() => {
                                setRejectingRequestId(reqItem.id);
                                setRejectionReason('');
                              }}
                              className="px-3.5 py-2.5 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                            >
                              <X className="w-4 h-4" />
                              <span>رفض ✕</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* MODAL: CREATE / EDIT USER                                        */}
        {/* ================================================================ */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <h3 className="font-bold text-base text-[#421923]">
                  {editingUser ? `تعديل حساب: ${editingUser.full_name}` : 'إضافة حساب جديد للمنظومة'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#81777A] block mb-1">الاسم بالكامل:</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="الاسم الثلاثي أو اللقب الكنسي"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#81777A] block mb-1">الرتبة / الدور في الخدمة:</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] font-bold text-[#421923] focus:outline-none focus:border-[#702C3B]"
                  >
                    {currentRole === 'admin' && (
                      <>
                        <option value="priest">كاهن الكنيسة (صلاحية كاملة)</option>
                        <option value="service_secretary">أمين الخدمة (إشراف عام)</option>
                        <option value="admin">إدارة المنظومة (مسؤول النظام)</option>
                      </>
                    )}
                    <option value="family_leader">أمين أسرة (إدارة أسرته فقط)</option>
                    <option value="servant">خادم (متابعة وافتقاد أسرته فقط)</option>
                  </select>
                </div>

                {(formRole === 'family_leader' || formRole === 'servant') && (
                  <div>
                    <label className="font-bold text-[#81777A] block mb-1">الأسرة المخصصة:</label>
                    <select
                      value={formFamilyId}
                      onChange={(e) => setFormFamilyId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] font-bold text-[#421923] focus:outline-none focus:border-[#702C3B]"
                    >
                      {families.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-[#81777A] block mb-1">رقم الهاتف المحمول:</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#81777A] block mb-1">البريد الإلكتروني (اختياري):</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@organa.eg (اختياري)"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#81777A] block mb-1">أب الاعتراف:</label>
                  <input
                    type="text"
                    value={formConfessionFather}
                    onChange={(e) => setFormConfessionFather(e.target.value)}
                    placeholder="مثال: القمص / القس ..."
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#81777A] block mb-1">
                    كلمة المرور للحساب (لتسليمها للمستخدم):
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="مثال: Abouna1234 أو organa2026"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] font-mono text-right focus:outline-none focus:border-[#702C3B]"
                  />
                  <span className="text-[10px] text-[#81777A] mt-0.5 block">
                    {editingUser ? 'اتركها فارغة إذا كنت لا ترغب في تغيير كلمة المرور الحالية.' : 'سيستخدم هذا الباسورد للدخول للمنظومة.'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-[#5A1E2D] hover:bg-[#421923] text-white font-bold transition-colors shadow-sm"
                  >
                    {submitting ? 'جارٍ الحفظ...' : (editingUser ? 'حفظ التعديلات' : 'إضافة الحساب')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="py-2.5 px-4 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:bg-[#FAF5F6]"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MODAL: REJECT JOIN REQUEST REASON                                */}
        {/* ================================================================ */}
        {rejectingRequestId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <h3 className="font-bold text-sm text-[#421923]">تأكيد رفض طلب الانضمام</h3>
                <button
                  onClick={() => setRejectingRequestId(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-[#81777A]">
                  هل أنت متأكد من رغبتك في رفض هذا الطلب؟ يمكنك تدوين سبب الرفض لتوضيحه للخادم:
                </p>

                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="سبب الرفض (مثال: الأسرة مكتملة العدد حالياً، يرجى التنسيق مع أمين الخدمة...)"
                  className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-red-400 text-xs resize-none"
                />

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleRejectConfirm}
                    disabled={requestActionLoadingId === rejectingRequestId}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-sm"
                  >
                    {requestActionLoadingId === rejectingRequestId ? 'جارٍ الرفض...' : 'تأكيد الرفض ✕'}
                  </button>
                  <button
                    onClick={() => setRejectingRequestId(null)}
                    className="py-2.5 px-4 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:bg-[#FAF5F6]"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function UsersPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F4F3] flex items-center justify-center p-8 text-center text-xs font-bold text-[#702C3B]">
          جارٍ تحميل إدارة المستخدمين والاعتمادات...
        </div>
      }
    >
      <UsersContent />
    </React.Suspense>
  );
}
