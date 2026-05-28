import React, { useState } from 'react';
import { ContractForm, UploadedFile } from './ContractForm';
import { ContractFormValues } from '../lib/contractSchema';
import { createContract, ContractRequest } from '../services/contractService';
import { uploadContractFiles } from '../services/contractFileService';
import { RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  buildContractAlertsPayload,
  buildContractPartnersPayload,
  calculateRenewalFrequencyMonths,
  formatContractApiError,
} from '../utils/contractFormHelpers';
import { ConfirmDialog } from './ConfirmationDialog';

interface RegisterContractProps {
  onSuccess?: () => void
  onCancel?: () => void
  currentUser?: import('../services/userService').UserProfile | null
}

export function RegisterContract({ onSuccess, onCancel, currentUser }: RegisterContractProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const isModal = Boolean(onCancel)

  const handleResetConfirm = () => {
    setUploadedFiles([])
    setFormKey(prev => prev + 1)
    setShowResetConfirm(false)
  }

  const handleSubmit = async (data: ContractFormValues, departmentId: number, contractTypeId: number) => {
    try {
      const alerts: ContractRequest['alerts'] = buildContractAlertsPayload(data)

      const payload: ContractRequest = {
        contractTitle: data.title,
        personInCharge: data.personInCharge,
        status: data.status || 'ACTIVE',
        contractTerm: data.contractTerms ?? '',
        effectiveDate: data.effectiveDate,
        expireDate: data.expiryDate,
        renewalFrequencyMonths: calculateRenewalFrequencyMonths(data.effectiveDate, data.expiryDate),
        contractValue: parseFloat(data.contractValue ?? '0') || 0,
        remark: data.remarks ?? '',
        contractTypeId,
        departmentId,
        partners: buildContractPartnersPayload(data),
        alerts,
        alertRemark: data.remarks ?? '',
      };

      const response = await createContract(payload);
      const contractId: number = response.payload.contractId;

      if (uploadedFiles.length > 0) {
        const files = uploadedFiles.map((f) => f.file);
        await uploadContractFiles(contractId, files);
      }

      const safeTitle = String(data.title ?? '').trim()
      toast.success(safeTitle ? `Contract "${safeTitle}" registered successfully!` : 'Contract registered successfully!')
      setUploadedFiles([]);
      setFormKey(prev => prev + 1);
      onSuccess?.()
    } catch (error: any) {
      console.error('Failed to create contract:', error);
      toast.error(formatContractApiError(error, 'Failed to create contract'));
    }
  };

  const form = (
    <ContractForm
      key={formKey}
      onSubmit={handleSubmit}
      currentUser={currentUser}
      onSecondaryAction={isModal ? onCancel : () => setShowResetConfirm(true)}
      submitLabel="Submit"
      secondaryLabel={isModal ? 'Cancel' : 'Reset Form'}
      uploadedFiles={uploadedFiles}
      onFilesChange={setUploadedFiles}
      insideModal={isModal}
    />
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
        <div className="bg-white rounded-lg w-full max-w-4xl mx-4">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="font-medium text-xl">New Contract</h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {form}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="mb-6">Register New Contract</h2>
      {form}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Are you sure you want to Reset form?"
        message="This will clear all entered fields and uploaded files."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        icon={<RefreshCw className="w-5 h-5 text-red-600" />}
        confirmIcon={<RefreshCw className="w-4 h-4" />}
        onConfirm={handleResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  )
}
