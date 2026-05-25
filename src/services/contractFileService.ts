import api from "../api/axios";
import ssoApi from "../api/azure";

export interface ContractFile {
  fileId: number;
  contractId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  uploadedBy: number;
  uploadedByName: string;
}

export interface ContractFilesResponse {
  success: boolean;
  message: string;
  status: string;
  payload: ContractFile[];
  timestamps: string;
}

export interface UploadFilesResponse {
  success: boolean;
  message: string;
  status: string;
  payload: ContractFile[];
  timestamps: string;
}

export interface UpdateUploadFilesResponse {
  success: boolean;
  message: string;
  status: string;
  payload: ContractFile;
  timestamps: string;
}
export interface DownloadFilesResponse {
  success: boolean;
  message: string;
  status: string;
  payload: {
    downloadUrl: string;
  }
  timestamps: string;
}

// Get Contract Files
export const getContractFiles = async (contractId: number): Promise<ContractFile[]> => {
  const response = await ssoApi.get<ContractFilesResponse>(`/contracts/${contractId}/files`);
  console.log('get contract file: ',response)
  return response.data.payload;
};

// Upload Contract Files
export const uploadContractFiles = async (contractId: number,files: File[]): Promise<ContractFile[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await api.post<UploadFilesResponse>(
    `/contracts/${contractId}/files`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  console.log('upload contract file',response)
  return response.data.payload;
};

// Update Contract Files
export const updateContractFile = async (contractId: number,fileId: number,file: File): Promise<ContractFile> => {
  const formData = new FormData();
  formData.append("file", file); 

  const response = await ssoApi.put<UpdateUploadFilesResponse>(
    `/contracts/${contractId}/files/${fileId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  console.log('updatae contract file',response)
  return response.data.payload;
};
// Delete Contract Files
export const deleteContractFile = async (contractId: number,fileId: number): Promise<void> => {
  await ssoApi.delete(`/contracts/${contractId}/files/${fileId}`);
};

// Download Contract file
export const downloadContractFile = async (contractId: number, fileId: number): Promise<Blob> => {
  const response = await ssoApi.get(
    `/contracts/${contractId}/files/${fileId}/download`,
    { responseType: 'blob' }
  );
  return response.data;
};