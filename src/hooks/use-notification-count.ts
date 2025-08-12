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

        const response = await fetch('/api/notifications?status=unread&limit=1', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Get the total count of unread notifications from pagination
          setCount(data.pagination?.total || 0);
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

    // Set up polling to refresh notification count every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);

    // Listen for notification updates
    const handleNotificationUpdate = () => {
      fetchNotificationCount();
    };

    window.addEventListener('notification-updated', handleNotificationUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-updated', handleNotificationUpdate);
    };
  }, []);

  return { count, loading };
} 