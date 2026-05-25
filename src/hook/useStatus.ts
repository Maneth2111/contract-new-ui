import { useEffect, useState } from "react"
import { Status, getContractStatuses } from "../services/contractService";
import { deleteUser, getUserStatuses } from "../services/userService";
import toast from "react-hot-toast";

export const useContractStatus = () => {
    const [statuses, setStatuses] = useState<Status[]>([]);
    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const data = await getContractStatuses();
                setStatuses(data);
            } catch (error) {
                console.error("Failed to load statuses", error);
            }
        };

        fetchStatuses();
    }, []);
    return { statuses };

}

export const useUserStatus = () => {
    const [userStatus, setUserStatu] = useState<Status[]>([]);
    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const data = await getUserStatuses();
                setUserStatu(data);
            } catch (error) {
                console.error("Failed to load statuses", error);
            }
        };

        fetchStatuses();
    }, []);
    return { userStatus };

}

export function useUserActions(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (userId: number) => {
    try {
      setLoading(true);
      setError(null);
      await deleteUser(userId);
      onSuccess?.();
      toast.success(`User has been Inactive!`)
    } catch (err: any) {
        toast.error(err.response?.data.detail)
      setError('Failed to Inactive user');
    } finally {
      setLoading(false);
    }
  };

  return { handleDelete, loading, error };
}