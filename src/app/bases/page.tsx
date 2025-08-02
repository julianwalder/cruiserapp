'use client';

import { AppLayout } from '@/components/AppLayout';
import BaseManagement from '@/components/BaseManagement';
import { useState, useEffect } from 'react';

export default function BasesPage() {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setCanEdit(userData?.userRoles?.some((ur: any) => ['SUPER_ADMIN', 'ADMIN'].includes(ur.roles.name)));
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <AppLayout>
      <BaseManagement canEdit={canEdit} />
    </AppLayout>
  );
} 