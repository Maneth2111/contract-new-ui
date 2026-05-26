import React, { useEffect, useMemo, useState } from 'react';
import { Contract, ContractStatus } from '../types/contract';
import { calculateDaysRemaining } from '../utils/contractUtils';
import { ArrowLeft, Clock, RefreshCw, Edit2 } from 'lucide-react';
import { useContractDetail, useContractHistory } from '../hook/useContracts';
import { useContractFiles } from '../hook/useContractFiles';
import { useContractFormData } from '../hook/useContactByDepartment';
import { titleCase } from 'text-case';
import { ContractFormValues } from '../lib/contractSchema';
import { ContractRequest, updateContract } from '../services/contractService';
import { deleteContractFile, downloadContractFile, updateContractFile, uploadContractFiles } from '../services/contractFileService';
import toast from 'react-hot-toast';
import { type ContractDetailTab } from '../utils/contractDetailRoute';
import {
  buildContractAlertsPayload,
  buildContractPartnersPayload,
  calculateRenewalFrequencyMonths,
  formatContractApiError,
  resolveContractFileUploadedByName,
  resolveDepartmentAndContractType,
} from '../utils/contractFormHelpers';
import {
  mapContractDetailToEditFormValues,
  mapContractDetailToRenewFormValues,
} from '../utils/contractDetailFormMappers';
import { ContractForm, type UploadedFile } from './ContractForm';
import { updatePartner } from '../services/partnerService';
import type { UserProfile } from '../services/userService';

export type ContractDetailsFormMode = 'view' | 'edit' | 'renew';

interface ContractDetailsProps {
  contract: Contract;
  onClose: () => void;
  onUpdate: () => void;
  hideRenewContract?: boolean;
  canRenew?: boolean;
  canEdit?: boolean;
  initialTab?: ContractDetailTab;
  onUrlTabChange?: (tab: ContractDetailTab) => void;
  variant?: 'page' | 'modal' | 'fullscreen';
  initialFormMode?: ContractDetailsFormMode;
  currentUser?: UserProfile | null;
}

type ViewTab = 'details' | 'history';

export function ContractDetails({
  contract,
  onClose,
  onUpdate,
  hideRenewContract = false,
  canRenew = false,
  canEdit = false,
  initialTab,
  onUrlTabChange,
  variant = 'fullscreen',
  initialFormMode = 'view',
  currentUser,
}: ContractDetailsProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>(() =>
    initialTab === 'history' ? 'history' : 'details'
  );
  const [formMode, setFormMode] = useState<ContractDetailsFormMode>(initialFormMode);
  const { contract: detail, loading: detailLoading, refetch: refetchDetail } = useContractDetail(contract.contractId);
  const [historyPage] = useState(1);
  const { items: historyItems } = useContractHistory(contract.contractId, historyPage);
  const [downloadingFileIds, setDownloadingFileIds] = useState<Set<number>>(() => new Set());
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [formKey, setFormKey] = useState(0);
  const { departmentList, contractTypeList } = useContractFormData();
  const { files: apiFiles, refetch: refetchFiles } = useContractFiles(contract.contractId);

  useEffect(() => {
    setFormMode(initialFormMode);
  }, [contract.contractId, initialFormMode]);

  useEffect(() => {
    if (apiFiles.length === 0) {
      setUploadedFiles([]);
      return;
    }
    setUploadedFiles(
      apiFiles.map((f) => ({
        file: new File([], f.fileName, { type: f.contentType }),
        id: `existing-${f.fileId}`,
        fileId: f.fileId,
        displaySize: f.fileSize,
        uploadedAt: f.uploadedAt,
        uploadedByName: resolveContractFileUploadedByName(f, currentUser, {
          preferCurrentUser: formMode === 'view',
        }),
      }))
    );
  }, [apiFiles, currentUser, formMode]);

  const editDefaults = useMemo(
    () => (detail ? mapContractDetailToEditFormValues(detail) : undefined),
    [detail]
  );

  const renewDefaults = useMemo(
    () => (detail ? mapContractDetailToRenewFormValues(detail) : undefined),
    [detail]
  );

  const viewMeta = useMemo(() => {
    if (!detail) return undefined;
    return {
      msChannelTitle: detail.department?.title ?? detail.department?.msChannel ?? null,
      msChannelUrl: detail.department?.msChannelUrl ?? null,
      alertDays: detail.alertDays ?? null,
    };
  }, [detail]);

  const getChangedFields = (
    oldVal: Record<string, unknown> | null,
    newVal: Record<string, unknown> | null
  ) => {
    if (!oldVal || !newVal) return [];
    return Object.keys(newVal)
      .filter((key) => JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key]))
      .map((key) => ({
        field: key,
        from: JSON.stringify(oldVal[key]),
        to: JSON.stringify(newVal[key]),
      }));
  };

  const c: Contract = detail ? {
    id: detail.contractCode,
    contractId: detail.contractId,
    contractCode: detail.contractCode,
    title: detail.contractTitle,
    contractType: detail.contractType?.contractTypeName ?? '',
    department: detail.department?.departmentName ?? '',
    personInCharge: detail.personInCharge,
    partnerName: detail.partners?.[0]?.partnerName ?? '',
    effectiveDate: detail.effectiveDate,
    expiryDate: detail.expireDate,
    contractValue: detail.contractValue,
    remainingDays: detail.remainingDays ?? calculateDaysRemaining(detail.expireDate),
    status: (
      detail.status === 'ACTIVE'
        ? 'Active'
        : detail.status === 'OVERDUE'
          ? 'Overdue'
          : detail.status === 'EXPIRED'
            ? 'Expired'
            : detail.status === 'EXPIRING_SOON'
              ? 'Expiring Soon'
              : detail.status === 'CLOSED'
                ? 'Closed'
                : detail.status
    ) as ContractStatus,
    confidential: false,
    autoRenew: false,
    alertDays: detail.alertDays ?? 0,
    partners: detail.partners ?? [],
    remarks: detail.remark ?? '',
  } : contract;

  const apiStatus = String(detail?.status ?? '').toUpperCase().replace(/\s+/g, '_');
  const canShowRenew =
    !hideRenewContract &&
    canRenew &&
    c.status !== 'Closed' &&
    (['Expired', 'Expiring Soon', 'Overdue'].includes(c.status) ||
      ['EXPIRED', 'EXPIRING_SOON', 'OVERDUE'].includes(apiStatus));

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    const MIN_SPINNER_MS = 1000;
    const startedAt = Date.now();
    setDownloadingFileIds((prev) => new Set(prev).add(fileId));
    try {
      const blob = await downloadContractFile(contract.contractId, fileId);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed';
      toast.error(message);
    } finally {
      const elapsed = Date.now() - startedAt;
      const waitExtra = Math.max(0, MIN_SPINNER_MS - elapsed);
      window.setTimeout(() => {
        setDownloadingFileIds((prev) => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
      }, waitExtra);
    }
  };

  const handleEditSubmit = async (data: ContractFormValues) => {
    try {
      const resolved = resolveDepartmentAndContractType(
        departmentList,
        contractTypeList,
        data.department,
        data.contractType,
      );
      if (!resolved) {
        toast.error('Please select a contract type that belongs to the chosen department.');
        return;
      }
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
        partners: buildContractPartnersPayload(data),
        alerts: buildContractAlertsPayload(data),
        alertRemark: data.remarks ?? '',
      };
      await updateContract(c.contractId, payload);
      for (const partner of data.partners) {
        if (partner.partnerId) {
          await updatePartner(String(partner.partnerId), {
            partnerName: partner.partnerName,
            contactPerson: partner.contactPerson ?? '',
            contactNumber: partner.contactNumber ?? '',
          });
        }
      }
      const keptIds = new Set(
        uploadedFiles
          .filter((f): f is UploadedFile & { fileId: number } => f.fileId !== undefined)
          .map((f) => f.fileId)
      );
      for (const existingFile of apiFiles) {
        if (!keptIds.has(existingFile.fileId)) {
          await deleteContractFile(c.contractId, existingFile.fileId);
        }
      }
      const newFiles = uploadedFiles.filter((f) => !f.fileId).map((f) => f.file);
      if (newFiles.length > 0) {
        await uploadContractFiles(c.contractId, newFiles);
      }
      toast.success(`Contract "${data.title}" has been updated successfully!`);
      await refetchDetail();
      refetchFiles();
      onUpdate();
      if (initialFormMode === 'edit') {
        onClose();
        return;
      }
      setFormMode('view');
      setFormKey((k) => k + 1);
    } catch (error: unknown) {
      console.error('Failed to update contract:', error);
      toast.error(formatContractApiError(error, 'Failed to update contract'));
    }
  };

  const handleRenewSubmit = async (data: ContractFormValues) => {
    try {
      const payload: ContractRequest = {
        contractTitle: detail?.contractTitle ?? c.title,
        personInCharge: detail?.personInCharge ?? c.personInCharge,
        status: data.status || detail?.status || 'ACTIVE',
        contractTerm: detail?.contractTerm ?? '',
        contractTypeId: detail?.contractType?.contractTypeId ?? 0,
        departmentId: detail?.department?.departmentId ?? 0,
        partners: (detail?.partners ?? []).map((p) => ({
          partnerId: p.partnerId ?? null,
          partnerName: p.partnerName,
          contactPerson: p.contactPerson ?? '',
          contactNumber: p.contactNumber ?? '',
        })),
        effectiveDate: data.effectiveDate,
        expireDate: data.expiryDate,
        renewalFrequencyMonths: calculateRenewalFrequencyMonths(data.effectiveDate, data.expiryDate),
        contractValue: parseFloat(data.contractValue ?? '0') || (c.contractValue ?? 0),
        remark: detail?.remark ?? '',
        alerts: buildContractAlertsPayload(data),
        alertRemark: data.remarks ?? '',
      };
      await updateContract(c.contractId, payload);
      const newFilesOnly = uploadedFiles.filter((f) => !f.fileId && f.file.size > 0).map((f) => f.file);
      if (newFilesOnly.length > 0) {
        await uploadContractFiles(c.contractId, newFilesOnly);
      }
      toast.success(`Contract "${c.title}" renewed successfully!`);
      setFormMode('view');
      setFormKey((k) => k + 1);
      await refetchDetail();
      refetchFiles();
      onUpdate();
    } catch (err: unknown) {
      console.error('Failed to renew contract:', err);
      toast.error(formatContractApiError(err, 'Failed to renew contract'));
    }
  };

  const exitFormMode = () => {
    if (initialFormMode === 'edit' && formMode === 'edit') {
      onClose();
      return;
    }
    setFormMode('view');
    setFormKey((k) => k + 1);
    if (apiFiles.length > 0) {
      setUploadedFiles(
        apiFiles.map((f) => ({
          file: new File([], f.fileName, { type: f.contentType }),
          id: `existing-${f.fileId}`,
          fileId: f.fileId,
          displaySize: f.fileSize,
          uploadedAt: f.uploadedAt,
          uploadedByName: resolveContractFileUploadedByName(f, currentUser, {
            preferCurrentUser: true,
          }),
        }))
      );
    }
  };

  useEffect(() => {
    setActiveTab(initialTab === 'history' ? 'history' : 'details');
  }, [contract.contractId, initialTab]);

  const setTab = (tab: ViewTab) => {
    setActiveTab(tab);
    onUrlTabChange?.(tab);
  };

  const isFullscreen = variant === 'fullscreen';
  const isPage = variant === 'page';
  const isFormActive = formMode === 'edit' || formMode === 'renew';

  const handleBack = () => {
    if (isFormActive) {
      exitFormMode();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);
  const formDefaults = formMode === 'renew' ? renewDefaults : editDefaults;
  const detailsFormId = `contract-details-form-${c.contractId}-${formMode}`;

  const renderForm = () => {
    if (detailLoading || !formDefaults) {
      return <p className="p-6 text-gray-500">Loading contract…</p>;
    }
    if (formMode === 'view') {
      return (
        <ContractForm
          key={`view-${formKey}`}
          readOnly
          insideModal={!isPage && !isFullscreen}
          defaultValues={editDefaults}
          viewMeta={viewMeta}
          onSubmit={async () => {}}
          uploadedFiles={uploadedFiles}
          onFilesChange={() => {}}
          onDownloadFile={(fileId, fileName) => {
            void handleDownloadFile(fileId, fileName);
          }}
          downloadingFileIds={downloadingFileIds}
          currentUser={currentUser}
        />
      );
    }
    return (
      <ContractForm
        key={`${formMode}-${formKey}`}
        formId={detailsFormId}
        hideFooter
        defaultValues={formDefaults}
        onSubmit={formMode === 'renew' ? handleRenewSubmit : handleEditSubmit}
        currentUser={currentUser}
        submitLabel={formMode === 'renew' ? 'Renew Contract' : 'Save Changes'}
        uploadedFiles={uploadedFiles}
        onFilesChange={setUploadedFiles}
        onReplaceExistingFile={async (fileId, nextFile) => {
          await updateContractFile(c.contractId, fileId, nextFile);
          refetchFiles();
        }}
        insideModal={false}
        editPartner={formMode === 'edit'}
        requireAttachments={false}
      />
    );
  };

  const panelHeightClass = isPage
    ? 'max-h-[calc(100vh-10rem)] min-h-[24rem]'
    : 'max-h-[calc(100vh-4rem)]'

  const useInnerScroll = isFullscreen || isFormActive

  const panelShellClass = isFullscreen
    ? 'flex flex-col h-full min-h-0 bg-white'
    : `bg-white rounded-lg flex flex-col ${useInnerScroll ? `min-h-0 ${panelHeightClass}` : ''} ${isPage ? 'border border-gray-200' : `w-full max-w-4xl mx-4 ${useInnerScroll ? panelHeightClass : ''}`}`

  const panel = (
    <div className={panelShellClass}>
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className={`px-4 sm:px-6 pt-4 pb-4 ${isFullscreen ? ' w-full' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-center">
            <div className="flex items-start gap-6 min-w-0">
              {(isFullscreen || variant === 'modal') && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-8 h-5" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-medium text-xl">
                  {isFormActive
                    ? formMode === 'renew'
                      ? 'Renew Contract'
                      : 'Edit Contract'
                    : 'Contract Details'}
                </h2>
                <p className="text-gray-600 truncate">{c.title} · {c.id}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 mr-10 min-w-0">
              {isFormActive ? (
                <>
                  <button
                    type="submit"
                    form={detailsFormId}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm"
                  >
                    {formMode === 'renew' ? 'Renew Contract' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={exitFormMode}
                    className="px-4 py-2 text-gray-700 rounded-lg bg-gray-200 hover:bg-gray-300 cursor-pointer text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {canEdit && c.status !== 'Closed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormMode('edit');
                        setActiveTab('details');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Contract
                    </button>
                  )}
                  {canShowRenew && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormMode('renew');
                        setActiveTab('details');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-300 text-green-800 rounded-lg hover:bg-green-400 cursor-pointer text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Renew Contract
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {!isFormActive && (
          <div className={`px-4 sm:px-6 ${isFullscreen ? 'max-w-350 mx-auto w-full' : ''}`}>
            <div className="flex gap-1">
              {(['details', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTab(tab)}
                  className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors cursor-pointer capitalize ${activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className={
          useInnerScroll
            ? `flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 ${isFullscreen ? 'max-w-350 mx-auto w-full' : ''}`
            : `px-4 sm:px-6 py-4 ${isFullscreen ? 'max-w-350 mx-auto w-full' : ''}`
        }
      >
        {isFormActive || activeTab === 'details' ? (
          renderForm()
        ) : (
          <div className="space-y-4">
            {historyItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No history available</div>
            ) : (
              historyItems.map((item) => {
                const changes = getChangedFields(item.oldValue, item.newValue);
                return (
                  <div key={item.historyId} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs rounded font-medium ${item.actionType === 'CREATED'
                              ? 'bg-green-100 text-green-800'
                              : item.actionType === 'MODIFIED'
                                ? 'bg-primary/10 text-brand-navy'
                                : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {titleCase(item.actionType)}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {new Date(item.actionDate).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-800">{item.description}</p>
                        {changes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {changes.map((change) => (
                              <p key={change.field} className="text-sm text-gray-600">
                                <span className="font-medium text-gray-700">{change.field}:</span>{' '}
                                <span className="text-red-500 line-through">{change.from}</span>
                                {' → '}
                                <span className="text-green-600">{change.to}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-gray-500 text-sm mt-1">By: {item.actionBy.fullName}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col h-dvh">
        {panel}
      </div>
    );
  }

  if (isPage) {
    return panel;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 sm:p-8 overflow-hidden">
      {panel}
    </div>
  );
}
