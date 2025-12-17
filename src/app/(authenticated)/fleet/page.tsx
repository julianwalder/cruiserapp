'use client';

import FleetManagement from '@/components/FleetManagement';
import { useState, useEffect } from 'react';

export default function FleetPage() {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      // Check for impersonation token first, fallback to regular token
      const impersonationToken = localStorage.getItem('impersonationToken');
      const token = impersonationToken || localStorage.getItem('token');
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
    <div className="space-y-6 mt-6">
      <FleetManagement canEdit={canEdit} />
    </div>
  );
} 