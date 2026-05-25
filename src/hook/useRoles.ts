import { useState, useEffect } from "react";
import { getAllRoles, Roles } from "../services/roleService";


export const useRoles = () => {
  const [roles, setRoles] = useState<Roles[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);

    try {
      const data: Roles[] = await getAllRoles();

      const roleNames = data;

      const allPermissions = Array.from(new Set(data.flatMap(r => r.permissions)));

      setRoles(roleNames);
      setPermissions(allPermissions);
    } catch (err: any) {
      console.error("Failed to fetch roles:", err);
      setError(err.message || "Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return { roles, permissions, loading, error, refetch: fetchRoles };
};