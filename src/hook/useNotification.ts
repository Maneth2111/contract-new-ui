import { useCallback, useEffect, useState } from 'react';
import { getNotifications, NotificationResponse } from '../services/notificationService';

export function useNotifications(isLoggedIn?: boolean) {
  const [data, setData] = useState<NotificationResponse | null>(null);
  const [overduePage, setOverduePage] = useState(1);
  const [expireSoonPage, setExpireSoonPage] = useState(1);
  const pageSize = 10;

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await getNotifications(overduePage, pageSize, expireSoonPage, pageSize);
      console.log('Get notifications:', res);
      setData(res);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [overduePage, expireSoonPage,isLoggedIn]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { data, refetch: fetchNotifications, overduePage, setOverduePage, expireSoonPage, setExpireSoonPage };
}