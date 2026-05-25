import api from "../api/axios";
import ssoApi from "../api/azure";
import { PaginationResponse } from "./contractTypeService";
export interface PartnerRequest{
    partnerName: string,
    contactPerson:string,
    contactNumber: string
}

export interface Partner {
  partnerId?: number | null;
  partnerName: string;
  contactPerson?: string;
  contactNumber?: string;
}
export interface SinglePartnerResponse {
  success: boolean;
  message: string;
  status: string;
  payload: Partner
}
export interface PartnerResponse {
  success: boolean;
  message: string;
  status: string;
  payload: {
    items: Partner[];
    paginationResponse: PaginationResponse;
  };
  timestamps: string;
}

export interface PartnerFilter {
  search?: string;
  page?: number;
  size?: number;
}

// Get all Partner
export const getAllPartners = async (filter: PartnerFilter = {}) => {
  const { search, page = 1, size = 10 } = filter;
  const query = new URLSearchParams();
  if (search) query.append('search', search);
  query.append('page', String(page));
  query.append('size', String(size));

  const response = await ssoApi.get<PartnerResponse>(`/partners?${query.toString()}`);
  return response.data.payload;
};

// Get Partner by ID 
export const getPartnerById = async(id: number) =>{
    const response = await ssoApi.get<SinglePartnerResponse>(
        `/partners/${id}`
    )
    console.log('Partner detail: ', response)
    return response.data.payload;
}
// Create Partner
export const createPartner = async (data: PartnerRequest) => {
  const response = await ssoApi.post<SinglePartnerResponse>(
    `/partners`,
    data
  );
  console.log('Partner created: ',response)
  return response.data.payload;
};

// Update Partner by ID
export const updatePartner = async (id: string, data: PartnerRequest) => {
  const response = await ssoApi.put<SinglePartnerResponse>(
    `/partners/${id}`,
    data
  );

  return response.data.payload;
};

// Delete Partner by ID 
export const deletePartner = async(id: string)=>{
    const response = await ssoApi.delete(
        `/partners/${id}`
    )
    return response.data.message
}