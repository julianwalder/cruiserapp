'use client';

import EnhancedUserBilling from '@/components/EnhancedUserBilling';
import { useState, useEffect } from 'react';

export default function BillingPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUserId(userData.id);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="space-y-6 mt-6">
      <EnhancedUserBilling userId={userId} />
    </div>
  );
} 