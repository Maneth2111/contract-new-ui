import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Contract } from '../types/contract';
import { ContractForm } from './ContractForm';
import { ContractFormValues } from '../lib/contractSchema';
import { useContractFormData } from '../hook/useContactByDepartment';
import { ContractRequest, updateContract } from '../services/contractService';
import { useContractDetail } from '../hook/useContracts';
import { useContractFiles } from '../hook/useContractFiles';
import { deleteContractFile, updateContractFile, uploadContractFiles } from '../services/contractFileService';
import toast from 'react-hot-toast';
import {
  buildContractAlertsPayload,
  buildContractPartnersPayload,
  calculateRenewalFrequencyMonths,
  formatContractApiError,
  resolveDepartmentAndContractType,
} from '../utils/contractFormHelpers';
import { mapContractDetailToEditFormValues } from '../utils/contractDetailFormMappers';
import { updatePartner } from '../services/partnerService';

export interface UploadedFile {
  file: File;
  id: string;
  fileId?: number;
}

interface EditContractProps {
  contract: Contract;
  onUpdate: () => void;
  onCancel: () => void;
  currentUser?: import('../services/userService').UserProfile | null;
}

export function EditContract({ contract, onUpdate, onCancel, currentUser }: EditContractProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { departmentList, contractTypeList } = useContractFormData();
  const { contract: fullContract, loading, error } = useContractDetail(contract.contractId);
  const { files: existingFiles, refetch: refetchFiles } = useContractFiles(contract.contractId);

  const defaultValues = useMemo(
    () => fullContract ? mapContractDetailToEditFormValues(fullContract) : undefined,
    [fullContract]
  );

  // Check if File existing
  useEffect(() => {
    if (existingFiles.length > 0) {
      setUploadedFiles(
        existingFiles.map((f) => ({
          file: new File([], f.fileName, { type: f.contentType }),
          id: `existing-${f.fileId}`,
          fileId: f.fileId,
          displaySize: f.fileSize,
        }))
      )
    }
  }, [existingFiles]);
  const handleSubmit = async (data: ContractFormValues) => {
    try {
      const resolved = resolveDepartmentAndContractType(
        departmentList,
        contractTypeList,
        data.department,
        data.contractType,
      )

      if (!resolved) {
        toast.error('Please select a contract type that belongs to the chosen department.')
        return
      }

      const alerts = buildContractAlertsPayload(data)
      const partners = buildContractPartnersPayload(data)

      const payload: ContractRequest = {
        contractTitle: data.title,
        personInCharge: data.personInCharge,
        status: data.status ?? 'ACTIVE',
        contractTerm: data.contractTerms ?? '',
        effectiveDate: data.effectiveDate,
        expireDate: data.expiryDate,
        renewalFrequencyMonths: calculateRenewalFrequencyMonths(data.effectiveDate, data.expiryDate),
        contractValue: parseFloat(data.contractValue ?? '0') || 0,
        remark: data.remarks ?? '',
        contractTypeId: resolved.contractType.contractTypeId,
        departmentId: resolved.department.departmentId,
        partners,
        alerts,
        alertRemark: data.remarks ?? '',
      };


      console.log('Update payload:', JSON.stringify(payload, null, 2));
      await updateContract(contract.contractId, payload);
      for (const partner of data.partners) {
        if (partner.partnerId) {
          const data =await updatePartner(String(partner.partnerId), {
            partnerName: partner.partnerName,
            contactPerson: partner.contactPerson ?? '',
            contactNumber: partner.contactNumber ?? '',
          });
          console.log('Update partner',data)
        }
      }
      const keptIds = new Set<number>(
        uploadedFiles
          .filter((f): f is UploadedFile & { fileId: number } => f.fileId !== undefined)
          .map((f) => f.fileId)
      );

      // Delete files that were removed by the user
      for (const existingFile of existingFiles) {
        if (!keptIds.has(existingFile.fileId)) {
          await deleteContractFile(contract.contractId, existingFile.fileId);
        }
      }

      // Upload new files
      const newFiles = uploadedFiles
        .filter((f) => !f.fileId)
        .map((f) => f.file);
      if (newFiles.length > 0) {
        const upload = await uploadContractFiles(contract.contractId, newFiles);
        console.log("File upload: ", upload);
      }
      const safeTitle = String(data.title ?? contract.title ?? contract.contractCode ?? contract.id ?? '').trim()
      toast.success(
        safeTitle
          ? `Contract "${safeTitle}" has been updated successfully!`
          : 'Contract has been updated successfully!',
      )
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update contract:', error);
      console.error('Error body:', JSON.stringify(error.response.data, null, 2));
      toast.error(formatContractApiError(error, 'Failed to update contract'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] overflow-y-auto py-8">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className='font-medium text-xl'>Edit Contract: {contract.id}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <ContractForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          currentUser={currentUser}
          onSecondaryAction={onCancel}
          submitLabel="Edit Contract"
          secondaryLabel="Cancel"
          uploadedFiles={uploadedFiles}
          onFilesChange={setUploadedFiles}
          onReplaceExistingFile={async (fileId, nextFile) => {
            await updateContractFile(contract.contractId, fileId, nextFile)
            refetchFiles()
          }}
          insideModal
          editPartner
        />
      </div>
    </div>
  );
}