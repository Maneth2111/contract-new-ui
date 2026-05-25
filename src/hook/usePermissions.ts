import { useEffect, useState } from "react";
import { getAllPermissions, PermissionsMap } from "../services/permissionService";


export function usePermissions() {
  const [permissionsMap, setPermissionsMap] = useState<PermissionsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await getAllPermissions();
        setPermissionsMap(data);
      } catch (err) {
        console.error('Failed to fetch permissions:', err);
        setError('Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { permissionsMap, loading, error };
}