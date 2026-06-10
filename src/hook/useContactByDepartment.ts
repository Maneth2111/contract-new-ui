import { useState, useEffect } from 'react';
import { ContractType, getContractTypes } from '../services/contractTypeService';
import { getAllDepartment, Department } from '../services/departmentService';

interface ContractFormData {
  departments: string[];
  contractTypesByDepartment: Record<string, string[]>;
  departmentList: Department[];
  contractTypeList: ContractType[];
  isLoading: boolean;
  error: string | null;
}

export function useContractFormData(): ContractFormData {
  const [departmentList, setDepartmentList] = useState<Department[]>([]);
  const [contractTypeList, setContractTypeList] = useState<ContractType[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [contractTypesByDepartment, setContractTypesByDepartment] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch both in parallel
        const [deptData, contractTypesData] = await Promise.all([
          getAllDepartment(1, 1000),
          getContractTypes(),
        ]);

        const deptItems: Department[] = Array.isArray(deptData)
          ? deptData
          : deptData?.items ?? [];
        setDepartmentList(deptItems);

        const contractTypeItems: ContractType[] = Array.isArray(contractTypesData)
          ? contractTypesData
          : (contractTypesData as any)?.items ?? [];
        setContractTypeList(contractTypeItems);

        // Departments list
        const departmentNames = deptItems.map(d => d.departmentName);
        setDepartments(['All Departments', ...departmentNames]);

        // departmentId -> departmentName
        const deptIdToName: Record<string, string> = {};
        deptItems.forEach(d => {
          deptIdToName[String(d.departmentId)] = d.departmentName;
        });

        // Group contract types by department name
        const grouped: Record<string, string[]> = {};
        contractTypesData.forEach((ct: ContractType) => {
          const deptName = deptIdToName[String(ct.departmentId)];
          if (!deptName) return;

          if (!grouped[deptName]) {
            grouped[deptName] = [];
          }
          grouped[deptName].push(ct.contractTypeName);
        });

        console.log('deptIdToName:', deptIdToName);
        console.log('contractTypesData:', contractTypesData);
        console.log('grouped:', grouped);

        setContractTypesByDepartment(grouped);
      } catch (err) {
        setError('Failed to load form data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { departments, contractTypesByDepartment, isLoading, error, departmentList, contractTypeList };
}