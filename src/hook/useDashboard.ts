import { useEffect, useState } from "react"
import { ContractByDepartment, getContractsByDepartment, getDashboardSummary, getStatusDistribution, getUpcommingExpirations, StatusDistrabution, SummaryDashboard, UpcomingExpirations } from "../services/dashboardService";


export const useDashboardSummary = () => {
    const [summaryDashboard, setSummaryDashoard] = useState<SummaryDashboard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchUserSummary = async () => {
            try {
                const data = await getDashboardSummary();
                console.log("summary Dashboard =======", data)
                setSummaryDashoard(data)
            } catch (error: any) {
                console.error('Fail to fetch user summary ', error)
            }finally{
                setIsLoading(false)
            }
        }
        fetchUserSummary();
    }, [])
    return { summaryDashboard,isLoading }
}

export const useContractsByDepartment = () => {
    const [DepartmentCounts,setContractCount] = useState<ContractByDepartment[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(()=>{
        const fetchDepartmentCounts = async() => {
            try{
                const response = await getContractsByDepartment();
                console.log('contract count: ',response)
                setContractCount(response);
            }catch(err: any){
                console.error('Fail to get contract count!!');
            }finally{
                setIsLoading(false);
            }
        }
        fetchDepartmentCounts();
    },[]);
    return {DepartmentCounts,isLoading};
    
}

export const useUpcomingExprirations = () => {
    const [upcomingExpirations,setUpcomingExpirations] = useState<UpcomingExpirations[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(()=>{
        const fetchUpcomingExprirations = async() => {
            try{
                const response = await getUpcommingExpirations();
                console.log('contract count: ',response)
                setUpcomingExpirations(response);
            }catch(err: any){
                console.error('Fail to get contract count!!');
            }finally{
                setIsLoading(false);
            }
        }
        fetchUpcomingExprirations();
    },[]);
    return {upcomingExpirations,isLoading};
    
}

export const useStatusDistribution = () => {
    const [statusDistrabution,setStatusDistrabution] = useState<StatusDistrabution | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(()=>{
        const fetchStatusDistrabution = async() => {
            try{
                const response = await getStatusDistribution();
                console.log('contract count: ',response)
                setStatusDistrabution(response);
            }catch(err: any){
                console.error('Fail to get Status Distribution!!');
            }finally{
                setIsLoading(false);
            }
        }
        fetchStatusDistrabution();
    },[]);
    return {statusDistrabution,isLoading};
    
}