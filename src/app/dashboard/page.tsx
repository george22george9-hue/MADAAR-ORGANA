'use client';

// ====================================================================
// ORGANA Dynamic Dashboard View (Renders for Priest, Secretary, Leader, Servant)
// Developed by MADAAR Technologies
// ====================================================================

import React from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { PriestDashboard } from '@/components/dashboard/PriestDashboard';
import { SecretaryDashboard } from '@/components/dashboard/SecretaryDashboard';
import { FamilyLeaderDashboard } from '@/components/dashboard/FamilyLeaderDashboard';
import { ServantDashboard } from '@/components/dashboard/ServantDashboard';

export default function DashboardPage() {
  const { currentRole } = useAuth();

  return (
    <AppLayout>
      {(currentRole === 'admin' || currentRole === 'priest') && <PriestDashboard />}
      {currentRole === 'service_secretary' && <SecretaryDashboard />}
      {currentRole === 'family_leader' && <FamilyLeaderDashboard />}
      {currentRole === 'servant' && <ServantDashboard />}
    </AppLayout>
  );
}

