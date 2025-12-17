'use client';

import BaseManagement from '@/components/BaseManagement';
import { useState, useEffect } from 'react';

export default function BasesPage() {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    console.log('🔍 BasesPage - Component mounted');
    const fetchUser = async () => {
      console.log('🔍 BasesPage - Fetching user data');
      // Check for impersonation token first, fallback to regular token
      const impersonationToken = localStorage.getItem('impersonationToken');
      const token = impersonationToken || localStorage.getItem('token');
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          console.log('🔍 BasesPage - User data:', userData);
          const hasEditPermission = userData?.userRoles?.some((ur: any) => ['SUPER_ADMIN', 'ADMIN'].includes(ur.roles.name));
          console.log('🔍 BasesPage - Can edit:', hasEditPermission);
          setCanEdit(hasEditPermission);
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="space-y-6 mt-6">
      <BaseManagement canEdit={canEdit} />
    </div>
  );
} 