import { useState, useEffect } from 'react';

export function useNotificationCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setCount(0);
          setLoading(false);
          return;
        }

        const response = await fetch('/api/activity', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Count unread notifications (for now, we'll count recent activities as notifications)
          // In a real app, you'd have a separate notifications table with read/unread status
          setCount(Math.min(data.activities?.length || 0, 5)); // Limit to 5 for demo
        } else {
          setCount(0);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationCount();
  }, []);

  return { count, loading };
} 