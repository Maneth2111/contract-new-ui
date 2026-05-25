import { useEffect, useState } from "react";
import { Department, getAllDepartment } from "../services/departmentService";

export const useDepartments = () =>{
    const [departments, setDepartments] = useState<string[]>(['All Departments']);
    const [departmentList, setDepartmentList] = useState<Department[]>([]);
      useEffect(() => {
      const fetchDepartments = async () => {
        try {
          const data = await getAllDepartment();
          console.log("========================= Department",data)
          setDepartmentList(data.items);  
          const deptNames = data.items.map(d=> d.departmentName);
          setDepartments(['All Departments', ...deptNames]);
        } catch (error) {
          console.error('Failed to fetch departments:', error);
        }
      };
    
      fetchDepartments();
    }, []);
    
    return {departments,departmentList}
}