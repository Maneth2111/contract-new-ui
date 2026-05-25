import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { ContractFormValues } from "../lib/contractSchema";
import { useContractDetail } from "../hook/useContracts";
import { useContractFiles } from "../hook/useContractFiles";
import { uploadContractFiles } from "../services/contractFileService";
import { ContractForm, UploadedFile } from "./ContractForm";
import toast from "react-hot-toast";
import { formatContractApiError } from "../utils/contractFormHelpers";
import { mapContractDetailToRenewFormValues } from "../utils/contractDetailFormMappers";

interface RenewContractModalProps {
  contractTitle: string;
  contractId: number;
  onClose: () => void;
  onSubmit: (data: ContractFormValues, departmentId: number, contractTypeId: number) => Promise<void>;
}

export function RenewContractModal({ contractTitle, contractId, onClose, onSubmit }: RenewContractModalProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { contract: fullContract, loading } = useContractDetail(contractId);
  const { files: existingFiles } = useContractFiles(contractId)

  const defaultValues = useMemo(
    () => fullContract ? mapContractDetailToRenewFormValues(fullContract) : undefined,
    [fullContract]
  )

  useEffect(() => {
    if (existingFiles.length === 0) return
    setUploadedFiles(
      existingFiles.map((f) => ({
        file: new File([], f.fileName, { type: f.contentType }),
        id: `existing-${f.fileId}`,
        fileId: f.fileId,
        displaySize: f.fileSize,
      }))
    )
  }, [existingFiles])

  // Close form
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (
    data: ContractFormValues,
    departmentId: number,
    contractTypeId: number
  ) => {
    try {
      await onSubmit(data, departmentId, contractTypeId);

      const newFilesOnly = uploadedFiles.filter((f) => f.file.size > 0)
      if (newFilesOnly.length > 0) {
        await uploadContractFiles(contractId, newFilesOnly.map((f) => f.file))
      }
    } catch (error: any) {
      console.error('Failed to renew contract:', error);
      toast.error(formatContractApiError(error, 'Failed to renew contract'));
    }
  };


  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-[60] overflow-y-auto py-8"
      onClick={(e) => e.target === e.currentTarget }
    >
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="font-medium text-xl">Renew Contract: <span>{contractTitle}</span></h2>

          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <ContractForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          currentUser={null}
          onSecondaryAction={onClose}
          submitLabel="Renew Contract"
          secondaryLabel="Cancel"
          uploadedFiles={uploadedFiles}
          onFilesChange={setUploadedFiles}
          insideModal
        />
      </div>
    </div>
  );
}