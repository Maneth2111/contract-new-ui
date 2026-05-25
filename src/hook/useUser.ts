import { useCallback, useEffect, useMemo, useState } from 'react';
import {ApiUser, UserProfile, UserRequest, UserSearchParams, UserSummary, createUser, getCurrentUser, getUserById, getUsers, mapApiUserToUser, updateUser } from '../services/userService';
import { User } from '../types/user';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { getPermissionFlagsFromUser } from '../utils/appProfileHelpers';

export function useUsers(params: UserSearchParams = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<UserSummary | null>(null);

  const fetchUsers = useCallback(async () => {
    console.log('fetchUsers called with:', params);
    try {
      setLoading(true);
      setError(null);

      const apiPage = Math.max(0, (params.page ?? 1) - 1)
      const data = await getUsers({ ...params, page: apiPage })

      setUsers(data.users.items.map((user: ApiUser) => mapApiUserToUser(user))); 
      setTotal(data.users.paginationResponse.total);
      setTotalPages(data.users.paginationResponse.totalPages);
      setSummary(data.summary);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      if (err?.response?.status === 404) {
        setUsers([]);
        setTotal(0);
        setTotalPages(0);
        setSummary(null);
      } else {
        console.error('Failed to fetch users:', err);
      }
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [params.search, params.status, params.departmentId, params.role, params.page, params.size]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, summary, loading, error, total, totalPages, refetch: fetchUsers };
}

export function useUserSummary() {
  const [summary, setSummary] = useState<UserSummary | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getUsers({ page: 1, size: 1000 });
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch user summary:', error);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary };
}


export function useUserDetail(userId: number | null) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const fetchUserDetail = useCallback(async () => {
    if (userId === null) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getUserById(userId);
      console.log("get user by ID=======",data)
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch user detail:', err);
      setError('Failed to load user detail');
    } finally {
      setLoading(false);
    }
  }, [userId]); 
 
  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);
 
  return { user, loading, error, refetch: fetchUserDetail };
}

export function useCreateUser(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  const handleCreate = async (data: UserRequest) => {
    const toastId = toast.loading('Creating user...');
    try {
      setLoading(true);
      const res = await createUser(data);
      console.log ( ' Create User: ', JSON.stringify(res,null,2))
      toast.success('User created successfully!', { id: toastId });
      onSuccess?.();
    } catch (err: any) {
      const data = err?.response?.data;
      console.log('User payload:', JSON.stringify(data, null, 2))
      const message = data?.errors && typeof data.errors === 'object'
        ? Object.values(data.errors).join(', ')
        : data?.errors ?? data?.detail ?? data?.message ?? data?.title ?? 'Failed to create user';
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return { handleCreate, loading };
}

export function useUpdateUser(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (id: number, data: UserRequest): Promise<boolean> => {
    try {
      setLoading(true);
      await updateUser(id, data);
      onSuccess?.();
      return true;
    } catch (err: any) {
      const data = err?.response?.data;

      const message = data?.errors && typeof data.errors === 'object'
          ? Object.values(data.errors).join(', ')
          : data?.errors ?? data?.detail ?? data?.message ?? data?.title ?? 'Failed to update user';
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { handleUpdate, loading };
}

export const useCurrentUser = (
  isLoggedIn?: boolean,
  keepTokenIfProfileFails?: boolean
) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = Cookies.get("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err: any) {
        console.error("Failed to load current user:", err);
        if (!keepTokenIfProfileFails) {
          Cookies.remove("token");
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [isLoggedIn, keepTokenIfProfileFails]);

  const permissions = useMemo(() => {
    return getPermissionFlagsFromUser(user)
  }, [user]);

  return { user, permissions, loading };
};