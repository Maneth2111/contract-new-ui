import { useEffect, useState } from "react";
import { ContractType, getContractTypes } from "../services/contractTypeService";

export const useContractType = () => {
    const [contracts, setContracts] = useState<string[]>(['']);
    useEffect(() => {
        const fetchContractTypes = async () => {
            try {
                const data = await getContractTypes();
                const contractNames = data.map((c: ContractType) => c.contractTypeName);

                setContracts(contractNames);
            } catch (error) {
                console.error('Failed to fetch contract types:', error);
            }
        };

        fetchContractTypes();
    }, []);
    return { contracts };
}