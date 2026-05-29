import React, { useEffect, useMemo, useState } from 'react';
import { Contract, ContractStatus } from '../types/contract';
import { calculateDaysRemaining } from '../utils/contractUtils';
import { ArrowLeft, Clock, RefreshCw, Edit2 } from 'lucide-react';
import { titleCase } from 'text-case';
import { ContractFormValues } from '../lib/contractSchema';
import toast from 'react-hot-toast';
import { type ContractDetailTab } from '../utils/contractDetailRoute';
import { formatContractApiError } from '../utils/contractFormHelpers';
import { ContractForm, type UploadedFile } from './ContractForm';
import { UserProfile } from '../types/user';


// ─── Mock types ───────────────────────────────────────────────────────────────

interface MockDepartment {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  description: string;
  msChannel: string;
  title: string;
  msWebhookUrl: string;
  msChannelUrl: string;
}

interface MockContractType {
  contractTypeId: number;
  departmentId: number;
  contractTypeCode: string;
  contractTypeName: string;
  description: string;
}

interface MockPartner {
  partnerId: number;
  partnerName: string;
  contactPerson: string;
  contactNumber: string;
}

interface MockContractDetail {
  contractId: number;
  contractCode: string;
  contractTitle: string;
  personInCharge: string;
  contractTerm: string;
  effectiveDate: string;
  expireDate: string;
  renewalFrequencyMonths: number;
  contractValue: number;
  alertDays: number | null;
  remark: string;
  remainingDays: number;
  status: string;
  createdBy: number;
  department: MockDepartment;
  contractType: MockContractType;
  partners: MockPartner[];
  alerts: unknown | null;
}

interface MockHistoryItem {
  historyId: number;
  actionType: string;
  actionDate: string;
  actionBy: { fullName: string };
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

// ─── Mock seed data ───────────────────────────────────────────────────────────

const mockDepartments: MockDepartment[] = [
  { departmentId: 1, departmentCode: 'IT', departmentName: 'IT Department', description: 'Handles IT systems and infrastructure', msChannel: 'Contract Management Alert', title: 'Contract Management Alert', msWebhookUrl: 'https://example.webhook.office.com/it', msChannelUrl: 'https://teams.microsoft.com/it-channel' },
  { departmentId: 3, departmentCode: 'LC', departmentName: 'Legal and Compliance', description: 'Description', msChannel: 'Legal and Compliance Channel', title: 'Legal and Compliance Department', msWebhookUrl: 'https://example.webhook.office.com/lc', msChannelUrl: 'https://teams.microsoft.com/lc-channel' },
  { departmentId: 5, departmentCode: 'AM', departmentName: 'Admin and Marketing', description: 'Description', msChannel: 'Admin and Marketing Channel', title: 'Admin and Marketing', msWebhookUrl: 'https://example.webhook.office.com/am', msChannelUrl: 'https://teams.microsoft.com/am-channel' },
  { departmentId: 6, departmentCode: 'COD', departmentName: 'CEO Office Department', description: 'CEO Office Department', msChannel: 'IT Contract Notification Channel', title: 'IT Contract Notification Channel', msWebhookUrl: 'https://example.webhook.office.com/ceo', msChannelUrl: 'https://teams.microsoft.com/ceo-channel' },
];

const mockContractTypes: MockContractType[] = [
  { contractTypeId: 1, departmentId: 1, contractTypeCode: 'ITO', contractTypeName: 'Other', description: 'description' },
  { contractTypeId: 2, departmentId: 1, contractTypeCode: 'ITCHDA', contractTypeName: 'Cloud Hosting / Data Center Agreement', description: 'description' },
  { contractTypeId: 5, departmentId: 1, contractTypeCode: 'ITSLA', contractTypeName: 'Software Licensing Agreement (core system, CRM, digital onboarding)', description: 'description' },
  { contractTypeId: 6, departmentId: 5, contractTypeCode: 'ORAG', contractTypeName: 'Other', description: 'description' },
  { contractTypeId: 7, departmentId: 5, contractTypeCode: 'MSAG', contractTypeName: 'Marketing Service Agreement', description: 'description' },
  { contractTypeId: 10, departmentId: 3, contractTypeCode: 'LGAC', contractTypeName: 'Other', description: 'description' },
  { contractTypeId: 11, departmentId: 3, contractTypeCode: 'LGPA', contractTypeName: 'Partnership Agreement', description: 'description' },
  { contractTypeId: 12, departmentId: 3, contractTypeCode: 'LGGC', contractTypeName: 'General Contract', description: 'description' },
  { contractTypeId: 13, departmentId: 3, contractTypeCode: 'LGNDA', contractTypeName: 'Non-Disclosure Agreement', description: 'description' },
  { contractTypeId: 14, departmentId: 3, contractTypeCode: 'LGNPa', contractTypeName: 'Plusdico Agreement', description: 'description' },
  { contractTypeId: 15, departmentId: 3, contractTypeCode: 'LGMAE', contractTypeName: 'Morokot Agreement', description: 'description' },
  { contractTypeId: 16, departmentId: 5, contractTypeCode: 'ADGA', contractTypeName: 'General Agreement', description: 'description' },
  { contractTypeId: 18, departmentId: 5, contractTypeCode: 'ADLA', contractTypeName: 'Lease Agreement', description: 'description' },
  { contractTypeId: 22, departmentId: 1, contractTypeCode: 'ITSMC', contractTypeName: 'IT Support & Maintenance Contract', description: 'description' },
  { contractTypeId: 24, departmentId: 3, contractTypeCode: 'LGAAC', contractTypeName: 'Agency Contract', description: 'description' },
  { contractTypeId: 25, departmentId: 3, contractTypeCode: 'LGCSA', contractTypeName: 'Cozy Space Agreement', description: 'description' },
  { contractTypeId: 26, departmentId: 6, contractTypeCode: 'CEOF', contractTypeName: 'Other', description: 'description' },
  { contractTypeId: 27, departmentId: 6, contractTypeCode: 'CEOOF', contractTypeName: 'CEO Office', description: 'description' },
  { contractTypeId: 28, departmentId: 5, contractTypeCode: 'AdPO', contractTypeName: 'Purchase Order (PO-based)', description: 'description' },
  { contractTypeId: 29, departmentId: 5, contractTypeCode: 'ADFA', contractTypeName: 'Framework Agreement', description: 'description' },
  { contractTypeId: 30, departmentId: 5, contractTypeCode: 'ADCC', contractTypeName: 'Construction Contract', description: 'description' },
  { contractTypeId: 31, departmentId: 5, contractTypeCode: 'ADOC', contractTypeName: 'One-Time Contract', description: 'description' },
  { contractTypeId: 32, departmentId: 5, contractTypeCode: 'ADFPC', contractTypeName: 'Fixed-Price Contract', description: 'description' },
  { contractTypeId: 33, departmentId: 5, contractTypeCode: 'ADMC', contractTypeName: 'Maintenance Contract', description: 'description' },
  { contractTypeId: 34, departmentId: 5, contractTypeCode: 'ADSC', contractTypeName: 'Supply Contract', description: 'description' },
  { contractTypeId: 35, departmentId: 5, contractTypeCode: 'ADSA', contractTypeName: 'Service Agreement', description: 'description' },
  { contractTypeId: 37, departmentId: 1, contractTypeCode: 'ITTPAA', contractTypeName: 'Third-Party Administrator Agreement', description: 'description' },
];

const mockPartners: MockPartner[] = [
  { partnerId: 1, partnerName: 'ABC Company', contactPerson: 'Sok Dara', contactNumber: '012100001' },
  { partnerId: 4, partnerName: 'YTest Corp', contactPerson: 'YTest', contactNumber: '0123456782' },
  { partnerId: 6, partnerName: 'Global Software', contactPerson: 'Lim David', contactNumber: '099887766' },
  { partnerId: 7, partnerName: 'Training Experts', contactPerson: 'Kim Long', contactNumber: '010223344' },
  { partnerId: 21, partnerName: 'S Company', contactPerson: 'A Person', contactNumber: '092682683' },
  { partnerId: 22, partnerName: 'EE Solutions', contactPerson: 'E Contact', contactNumber: '012200300' },
  { partnerId: 24, partnerName: 'Sok Theavy', contactPerson: 'Sok Theavy', contactNumber: '+85588694999' },
];

const dept = (id: number): MockDepartment => mockDepartments.find((d) => d.departmentId === id)!;
const ctype = (id: number): MockContractType => mockContractTypes.find((t) => t.contractTypeId === id)!;
const ptnr = (id: number): MockPartner => mockPartners.find((p) => p.partnerId === id)!;

// All 9 contracts from mock data, keyed by contractId
const MOCK_CONTRACT_DETAILS: Record<number, MockContractDetail> = {
  56: { contractId: 56, contractCode: 'CCF-2026-049', contractTitle: 'Test Contract', personInCharge: 'Test User', contractTerm: '', effectiveDate: '2026-05-01', expireDate: '2026-05-16', renewalFrequencyMonths: 1, contractValue: 5000, alertDays: null, remark: '', remainingDays: -6, status: 'OVERDUE', createdBy: 9, department: dept(6), contractType: ctype(27), partners: [ptnr(4)], alerts: null },
  50: { contractId: 50, contractCode: 'CCF-2026-046', contractTitle: 'Legal Contract', personInCharge: 'John', contractTerm: '', effectiveDate: '2026-01-19', expireDate: '2026-08-19', renewalFrequencyMonths: 7, contractValue: 100, alertDays: null, remark: '', remainingDays: 89, status: 'EXPIRING_SOON', createdBy: 1, department: dept(3), contractType: ctype(13), partners: [ptnr(6)], alerts: null },
  49: { contractId: 49, contractCode: 'CCF-2026-045', contractTitle: 'Contract Testing', personInCharge: 'John', contractTerm: '', effectiveDate: '2026-01-19', expireDate: '2026-07-21', renewalFrequencyMonths: 6, contractValue: 200, alertDays: null, remark: '', remainingDays: 60, status: 'EXPIRING_SOON', createdBy: 1, department: dept(3), contractType: ctype(25), partners: [ptnr(7)], alerts: null },
  48: { contractId: 48, contractCode: 'CCF-2026-044', contractTitle: 'Lease Agreement', personInCharge: 'John', contractTerm: '', effectiveDate: '2026-05-19', expireDate: '2026-08-19', renewalFrequencyMonths: 3, contractValue: 200, alertDays: null, remark: '', remainingDays: 89, status: 'EXPIRING_SOON', createdBy: 1, department: dept(5), contractType: ctype(18), partners: [ptnr(6)], alerts: null },
  46: { contractId: 46, contractCode: 'CCF-2026-042', contractTitle: 'Testing Agreement', personInCharge: 'Test User', contractTerm: '', effectiveDate: '2026-05-13', expireDate: '2026-06-18', renewalFrequencyMonths: 1, contractValue: 5000, alertDays: null, remark: '', remainingDays: 27, status: 'EXPIRING_SOON', createdBy: 9, department: dept(3), contractType: ctype(25), partners: [ptnr(4)], alerts: null },
  43: { contractId: 43, contractCode: 'CCF-2026-039', contractTitle: 'Testing', personInCharge: 'John Smith', contractTerm: '', effectiveDate: '2026-05-18', expireDate: '2026-07-18', renewalFrequencyMonths: 2, contractValue: 6000, alertDays: null, remark: '', remainingDays: 57, status: 'EXPIRING_SOON', createdBy: 10, department: dept(1), contractType: ctype(1), partners: [ptnr(1)], alerts: null },
  42: { contractId: 42, contractCode: 'CCF-2026-038', contractTitle: 'Test Contract B', personInCharge: 'Test User', contractTerm: 'ffjhjt', effectiveDate: '2026-05-07', expireDate: '2026-07-16', renewalFrequencyMonths: 2, contractValue: 9000, alertDays: null, remark: 'test', remainingDays: 55, status: 'EXPIRING_SOON', createdBy: 9, department: dept(6), contractType: ctype(26), partners: [ptnr(4)], alerts: null },
  41: { contractId: 41, contractCode: 'CCF-2026-037', contractTitle: 'CHK Branch Lease Renewal', personInCharge: 'Nov Lakena', contractTerm: '5 years', effectiveDate: '2026-01-05', expireDate: '2026-12-30', renewalFrequencyMonths: 12, contractValue: 33360, alertDays: null, remark: '', remainingDays: 222, status: 'ACTIVE', createdBy: 17, department: dept(5), contractType: ctype(18), partners: [ptnr(24)], alerts: null },
  40: { contractId: 40, contractCode: 'CCF-2026-036', contractTitle: 'VG Agreement', personInCharge: 'Menghok', contractTerm: '5 Years', effectiveDate: '2026-05-15', expireDate: '2026-06-30', renewalFrequencyMonths: 2, contractValue: 10000, alertDays: null, remark: 'fffff', remainingDays: 39, status: 'EXPIRING_SOON', createdBy: 13, department: dept(6), contractType: ctype(26), partners: [ptnr(22), ptnr(21)], alerts: null },
};

const MOCK_HISTORY: Record<number, MockHistoryItem[]> = {
  56: [
    { historyId: 1, actionType: 'CREATED', actionDate: '2026-05-01T09:00:00Z', actionBy: { fullName: 'Test User' }, oldValue: null, newValue: null },
  ],
  50: [
    { historyId: 2, actionType: 'MODIFIED', actionDate: '2026-03-10T14:22:00Z', actionBy: { fullName: 'Ouy Ponlouer' }, oldValue: { contractValue: '50' }, newValue: { contractValue: '100' } },
    { historyId: 3, actionType: 'CREATED', actionDate: '2026-01-19T08:00:00Z', actionBy: { fullName: 'John' }, oldValue: null, newValue: null },
  ],
  49: [
    { historyId: 4, actionType: 'CREATED', actionDate: '2026-01-19T08:30:00Z', actionBy: { fullName: 'John' }, oldValue: null, newValue: null },
  ],
  48: [
    { historyId: 5, actionType: 'CREATED', actionDate: '2026-05-19T10:00:00Z', actionBy: { fullName: 'John' }, oldValue: null, newValue: null },
  ],
  46: [
    { historyId: 6, actionType: 'CREATED', actionDate: '2026-05-13T09:15:00Z', actionBy: { fullName: 'Test User' }, oldValue: null, newValue: null },
  ],
  43: [
    { historyId: 7, actionType: 'CREATED', actionDate: '2026-05-18T08:00:00Z', actionBy: { fullName: 'John Smith' }, oldValue: null, newValue: null },
  ],
  42: [
    { historyId: 8, actionType: 'MODIFIED', actionDate: '2026-05-10T11:00:00Z', actionBy: { fullName: 'Test User' }, oldValue: { remark: '' }, newValue: { remark: 'test' } },
    { historyId: 9, actionType: 'CREATED', actionDate: '2026-05-07T08:00:00Z', actionBy: { fullName: 'Test User' }, oldValue: null, newValue: null },
  ],
  41: [
    { historyId: 10, actionType: 'CREATED', actionDate: '2026-01-05T08:00:00Z', actionBy: { fullName: 'Nov Lakena' }, oldValue: null, newValue: null },
  ],
  40: [
    { historyId: 11, actionType: 'MODIFIED', actionDate: '2026-05-20T14:00:00Z', actionBy: { fullName: 'Menghok' }, oldValue: { contractTerm: '' }, newValue: { contractTerm: '5 Years' } },
    { historyId: 12, actionType: 'CREATED', actionDate: '2026-05-15T09:00:00Z', actionBy: { fullName: 'Menghok' }, oldValue: null, newValue: null },
  ],
};

// ─── Mock hook replacements (same return shape as the real hooks) ─────────────

function useContractDetail(contractId: number) {
  const detail = MOCK_CONTRACT_DETAILS[contractId] ?? null;
  return { contract: detail, loading: false, refetch: () => { } };
}

function useContractHistory(contractId: number, _page: number) {
  return { items: MOCK_HISTORY[contractId] ?? [] };
}

function useContractFiles(_contractId: number) {
  return { files: [] as UploadedFile[], refetch: () => { } };
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const { files: apiFiles, refetch: refetchFiles } = useContractFiles(contract.contractId);

  useEffect(() => {
    setFormMode(initialFormMode);
  }, [contract.contractId, initialFormMode]);

  useEffect(() => {
    if (apiFiles.length === 0) {
      setUploadedFiles([]);
      return;
    }
    setUploadedFiles(apiFiles);
  }, [apiFiles]);

  const editDefaults = useMemo(
    () =>
      detail
        ? {
          title: detail.contractTitle,
          personInCharge: detail.personInCharge,
          effectiveDate: detail.effectiveDate,
          expiryDate: detail.expireDate,
          contractValue: String(detail.contractValue),
          contractTerms: detail.contractTerm ?? '',
          remarks: detail.remark ?? '',
          department: detail.department?.departmentName ?? '',
          contractType: detail.contractType?.contractTypeName ?? '',
          status: detail.status,
          partners: detail.partners ?? [],
        }
        : undefined,
    [detail]
  );

  const renewDefaults = useMemo(
    () =>
      detail
        ? {
          effectiveDate: detail.expireDate,
          expiryDate: '',
          contractValue: String(detail.contractValue),
          remarks: detail.remark ?? '',
          status: detail.status,
          partners: detail.partners ?? [],
        }
        : undefined,
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
    partnerId: detail.partners?.[0]?.partnerId ?? null,           // ← add
    partnerContact: detail.partners?.[0]?.contactPerson ?? '',    // ← add
    partnerContactNumber: detail.partners?.[0]?.contactNumber ?? '', // ← add
    effectiveDate: detail.effectiveDate,
    expiryDate: detail.expireDate,
    contractTerms: detail.contractTerm ?? '',                     // ← add
    contractValue: detail.contractValue,
    remainingDays: detail.remainingDays ?? calculateDaysRemaining(detail.expireDate),
    confidential: false,
    autoRenew: false,
    alertDays: detail.alertDays ?? 0,
    alerts: detail.alerts ?? null,                                // ← add
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

  const handleEditSubmit = async (data: ContractFormValues) => {
    try {
      toast.success(`Contract "${data.title}" has been updated successfully!`);
      refetchDetail();
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
      toast.success(`Contract "${c.title}" renewed successfully!`);
      setFormMode('view');
      setFormKey((k) => k + 1);
      refetchDetail();
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
          onSubmit={async () => { }}
          uploadedFiles={uploadedFiles}
          onFilesChange={() => { }}
          onDownloadFile={() => { }}
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
        onReplaceExistingFile={async () => { refetchFiles(); }}
        insideModal={false}
        editPartner={formMode === 'edit'}
        requireAttachments={false}
      />
    );
  };

  const panelHeightClass = isPage
    ? 'max-h-[calc(100vh-10rem)] min-h-[24rem]'
    : 'max-h-[calc(100vh-4rem)]';

  const useInnerScroll = isFullscreen || isFormActive;

  const panelShellClass = isFullscreen
    ? 'flex flex-col h-full min-h-0 bg-white'
    : `bg-white rounded-lg flex flex-col ${useInnerScroll ? `min-h-0 ${panelHeightClass}` : ''} ${isPage ? 'border border-gray-200' : `w-full max-w-4xl mx-4 ${useInnerScroll ? panelHeightClass : ''}`}`;

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

            <div className="flex flex-nowrap items-center justify-end gap-2 mr-10 min-w-0">
              {isFormActive ? (
                <>
                  <button
                    type="button"
                    onClick={exitFormMode}
                    className="px-4 py-2 text-gray-700 rounded-lg bg-gray-200 hover:bg-gray-300 cursor-pointer text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form={detailsFormId}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm"
                  >
                    {formMode === 'renew' ? 'Renew Contract' : 'Save Changes'}
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
                      className="flex items-center gap-2 px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink/80 cursor-pointer text-sm"
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
                        {/* {changes.length > 0 && (
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
                        )} */}
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
  );

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