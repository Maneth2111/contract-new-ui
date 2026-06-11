import { useState, useEffect } from 'react';
import {
  mockDepartments,
  mockContractTypes,
  Department,
  ContractType,
} from '../data/mockData';

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
    try {
      setIsLoading(true);

      setDepartmentList(mockDepartments);
      setContractTypeList(mockContractTypes);

      const departmentNames = mockDepartments.map(d => d.departmentName);
      setDepartments(['All Departments', ...departmentNames]);

      const deptIdToName: Record<string, string> = {};
      mockDepartments.forEach(d => {
        deptIdToName[String(d.departmentId)] = d.departmentName;
      });

      const grouped: Record<string, string[]> = {};
      mockContractTypes.forEach((ct: ContractType) => {
        const deptName = deptIdToName[String(ct.departmentId)];
        if (!deptName) return;
        if (!grouped[deptName]) grouped[deptName] = [];
        grouped[deptName].push(ct.contractTypeName);
      });

      setContractTypesByDepartment(grouped);
    } catch (err) {
      setError('Failed to load form data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { departments, contractTypesByDepartment, isLoading, error, departmentList, contractTypeList };
}