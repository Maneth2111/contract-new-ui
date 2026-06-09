import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Contract, ContractStatus } from '../types/contract';
import { calculateDaysRemaining } from '../utils/contractUtils';
import { Clock, RefreshCw, Edit2, FileText, Users, CalendarDays, AlertTriangle } from 'lucide-react';
import { titleCase } from 'text-case';
import { ContractFormValues } from '../lib/contractSchema';
import toast from 'react-hot-toast';
import { type ContractDetailTab } from '../utils/contractDetailRoute';
import { formatContractApiError } from '../utils/contractFormHelpers';
import { ContractForm, type UploadedFile } from './ContractForm';
import { UserProfile } from '../types/user';
import type { ContractDetailActions } from '../App';


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
  49: [{ historyId: 4, actionType: 'CREATED', actionDate: '2026-01-19T08:30:00Z', actionBy: { fullName: 'John' }, oldValue: null, newValue: null }],
  48: [{ historyId: 5, actionType: 'CREATED', actionDate: '2026-05-19T10:00:00Z', actionBy: { fullName: 'John' }, oldValue: null, newValue: null }],
  46: [{ historyId: 6, actionType: 'CREATED', actionDate: '2026-05-13T09:15:00Z', actionBy: { fullName: 'Test User' }, oldValue: null, newValue: null }],
  43: [{ historyId: 7, actionType: 'CREATED', actionDate: '2026-05-18T08:00:00Z', actionBy: { fullName: 'John Smith' }, oldValue: null, newValue: null }],
  42: [
    { historyId: 8, actionType: 'MODIFIED', actionDate: '2026-05-10T11:00:00Z', actionBy: { fullName: 'Test User' }, oldValue: { remark: '' }, newValue: { remark: 'test' } },
    { historyId: 9, actionType: 'CREATED', actionDate: '2026-05-07T08:00:00Z', actionBy: { fullName: 'Test User' }, oldValue: null, newValue: null },
  ],
  41: [{ historyId: 10, actionType: 'CREATED', actionDate: '2026-01-05T08:00:00Z', actionBy: { fullName: 'Nov Lakena' }, oldValue: null, newValue: null }],
  40: [
    { historyId: 11, actionType: 'MODIFIED', actionDate: '2026-05-20T14:00:00Z', actionBy: { fullName: 'Menghok' }, oldValue: { contractTerm: '' }, newValue: { contractTerm: '5 Years' } },
    { historyId: 12, actionType: 'CREATED', actionDate: '2026-05-15T09:00:00Z', actionBy: { fullName: 'Menghok' }, oldValue: null, newValue: null },
  ],
};

// ─── Mock hooks ───────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Green primary header bar */
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 bg-primary px-4 py-2.5">
      <span className="text-white [&>svg]:w-4 [&>svg]:h-4 shrink-0">{icon}</span>
      <span className="text-xs font-semibold tracking-widest text-white uppercase select-none">{title}</span>
    </div>
  );
}

function FieldRow({ label, children, empty }: { label: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <tr className="border-b border-gray-200 last:border-b-0 block sm:table-row">
      <td className="block sm:table-cell border-r w-full sm:w-55 sm:min-w-55 px-4 pt-3 pb-1 sm:py-3 border sm:border-r border-gray-200 bg-gray-100">
        <span className="text-xs font-medium text-brand-navy uppercase">{label}</span>
      </td>
      <td className="block sm:table-cell w-full px-4 pb-3 pt-1 sm:py-3 bg-white">
        <span className={empty ? 'text-gray-400 italic text-sm' : 'text-sm text-gray-800'}>{children}</span>
      </td>
    </tr>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="shadow-lg border border-gray-100 rounded-lg overflow-hidden mb-4">{children}</div>;
}

function FieldTable({ children }: { children: React.ReactNode }) {
  return <table className="w-full border-collapse"><tbody>{children}</tbody></table>;
}

// ─── Component types ──────────────────────────────────────────────────────────

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
  /** Reports form mode (and optionally the contract title) back to App */
  onFormModeChange?: (mode: ContractDetailsFormMode, title?: string) => void;
  /** Called once capabilities are known so App can show/hide top-bar buttons */
  onActionsReady?: (canEdit: boolean, canShowRenew: boolean) => void;
  /** Ref that App writes action callbacks into to control this component from the top bar */
  actionsRef?: React.MutableRefObject<ContractDetailActions>;
}

type ViewTab = 'details' | 'history';

// ─── Main component ───────────────────────────────────────────────────────────

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
  onFormModeChange,
  onActionsReady,
  actionsRef,
}: ContractDetailsProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>(() =>
    initialTab === 'history' ? 'history' : 'details'
  );
  const [formMode, setFormMode] = useState<ContractDetailsFormMode>(initialFormMode);
  const { contract: detail, loading: detailLoading, refetch: refetchDetail } = useContractDetail(contract.contractId);
  const [historyPage] = useState(1);
  const { items: historyItems } = useContractHistory(contract.contractId, historyPage);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [formKey, setFormKey] = useState(0);
  const { files: apiFiles, refetch: refetchFiles } = useContractFiles(contract.contractId);

  useEffect(() => { setFormMode(initialFormMode); }, [contract.contractId, initialFormMode]);

  const apiFileIds = apiFiles.map((f) => f.id).join(',');
  useEffect(() => {
    if (apiFiles.length === 0) { setUploadedFiles([]); return; }
    setUploadedFiles(apiFiles);
  }, [apiFileIds]);

  const editDefaults = useMemo(() =>
    detail ? {
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
    } : undefined,
    [detail]
  );

  const renewDefaults = useMemo(() =>
    detail ? {
      title: detail.contractTitle,
      personInCharge: detail.personInCharge,
      effectiveDate: '',
      expiryDate: '',
      contractValue: String(detail.contractValue),
      contractTerms: detail.contractTerm ?? '',
      remarks: detail.remark ?? '',
      department: detail.department?.departmentName ?? '',
      contractType: detail.contractType?.contractTypeName ?? '',
      status: detail.status,
      partners: detail.partners ?? [],
    } : undefined,
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

  const c: Contract = detail ? {
    id: detail.contractCode,
    contractId: detail.contractId,
    contractCode: detail.contractCode,
    title: detail.contractTitle,
    contractType: detail.contractType?.contractTypeName ?? '',
    department: detail.department?.departmentName ?? '',
    personInCharge: detail.personInCharge,
    partnerName: detail.partners?.[0]?.partnerName ?? '',
    partnerId: detail.partners?.[0]?.partnerId ?? null,
    partnerContact: detail.partners?.[0]?.contactPerson ?? '',
    partnerContactNumber: detail.partners?.[0]?.contactNumber ?? '',
    effectiveDate: detail.effectiveDate,
    expiryDate: detail.expireDate,
    contractTerms: detail.contractTerm ?? '',
    contractValue: detail.contractValue,
    remainingDays: detail.remainingDays ?? calculateDaysRemaining(detail.expireDate),
    confidential: false,
    autoRenew: false,
    status: detail.status,
    alertDays: detail.alertDays ?? 0,
    alerts: detail.alerts ?? null,
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

  // ── Expose actions + report capability flags ──────────────────────────────
  useEffect(() => {
    const resolvedCanEdit = Boolean(canEdit && c.status !== 'Closed');
    const resolvedCanShowRenew = Boolean(canShowRenew);
    if (actionsRef) {
      actionsRef.current = {
        enterEditMode: () => { setFormMode('edit'); setActiveTab('details'); },
        enterRenewMode: () => { setFormMode('renew'); setActiveTab('details'); },
        exitFormMode: () => exitFormMode(),
        canEdit: resolvedCanEdit,
        canShowRenew: resolvedCanShowRenew,
      };
    }
    onActionsReady?.(resolvedCanEdit, resolvedCanShowRenew);
    // Re-run when detail loads or permissions change
  }, [detail, canEdit, canShowRenew, c.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report mode changes upward whenever formMode changes
  useEffect(() => {
    onFormModeChange?.(formMode, detail?.contractTitle);
  }, [formMode, detail?.contractTitle]);

  const handleEditSubmit = async (data: ContractFormValues) => {
    try {
      toast.success(`Contract "${data.title}" has been updated successfully!`);
      refetchDetail();
      refetchFiles();
      onUpdate();
      if (initialFormMode === 'edit') { onClose(); return; }
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

  const exitFormMode = useCallback(() => {
    if (initialFormMode === 'edit' && formMode === 'edit') { onClose(); return; }
    setFormMode('view');
    setFormKey((k) => k + 1);
  }, [initialFormMode, formMode, onClose]);

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

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isFullscreen]);

  const formDefaults = formMode === 'renew' ? renewDefaults : editDefaults;
  const detailsFormId = `contract-details-form-${c.contractId}-${formMode}`;

  // ─── View-mode detail layout ─────────────────────────────────────────────

  const renderViewDetails = () => {
    if (!detail) return null;

    const partners = detail.partners ?? [];
    const remainingDays = detail.remainingDays;
    const isOverdue = remainingDays < 0;

    return (
      <div className="space-y-0">
        {/* ── CONTRACT INFORMATION ── */}
        <SectionCard>
          <SectionHeader icon={<FileText />} title="Contract Information" />
          <FieldTable>
            <FieldRow label="Contract Title">{detail.contractTitle}</FieldRow>
            <FieldRow label="Contract Type">{detail.contractType?.contractTypeName}</FieldRow>
            <FieldRow label="Department">{detail.department?.departmentName}</FieldRow>
            <FieldRow label="Person in Charge">{detail.personInCharge}</FieldRow>
            <FieldRow label="Microsoft Channel">
              {viewMeta?.msChannelUrl ? (
                <a href={viewMeta.msChannelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm">
                  {viewMeta.msChannelTitle ?? 'Teams Channel'}
                </a>
              ) : (
                <span className="text-gray-400 italic text-sm">No alerts days</span>
              )}
            </FieldRow>
            <FieldRow label="Alert Days" empty={!detail.alertDays}>
              {detail.alertDays ? `${detail.alertDays} days` : 'No alerts days'}
            </FieldRow>
            <FieldRow label="Contract Terms" empty={!detail.contractTerm}>
              {detail.contractTerm || 'No contract terms specified'}
            </FieldRow>
            <FieldRow label="Remarks" empty={!detail.remark}>
              {detail.remark || 'No remarks specified'}
            </FieldRow>
          </FieldTable>
        </SectionCard>

        {/* ── PARTNER / VENDOR INFORMATION ── */}
        <SectionCard>
          <SectionHeader icon={<Users />} title="Partner / Vendor Information" />
          {partners.length > 0 && (
            <div className="flex flex-wrap gap-4 px-4 py-3 border-b border-gray-100">
              {partners.map((p, i) => {
                const initials = p.partnerName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <div key={p.partnerId} className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">{initials}</div>
                    <div className="leading-tight">
                      <p className="text-sm font-medium text-gray-800">{p.partnerName}</p>
                      <p className="text-xs text-gray-400">Partner {partners.length > 1 && ` ${i + 1}`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <FieldTable>
            {partners.length === 0 ? (
              <FieldRow label="Partners" empty>No partners assigned</FieldRow>
            ) : partners.length === 1 ? (
              <>
                <FieldRow label="Partner Name">{partners[0].partnerName}</FieldRow>
                <FieldRow label="Contact Person">{partners[0].contactPerson}</FieldRow>
                <FieldRow label="Contact Number">
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.58 4.92 2 2 0 0 1 3.54 2.73h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {partners[0].contactNumber}
                  </span>
                </FieldRow>
              </>
            ) : (
              partners.map((p, i) => (
                <FieldRow key={p.partnerId} label={`Partner ${i + 1}`}>
                  {p.partnerName}
                  {p.contactPerson && <span className="text-gray-400 ml-2 text-xs">· {p.contactPerson}</span>}
                </FieldRow>
              ))
            )}
          </FieldTable>
        </SectionCard>

        {/* ── CONTRACT DATES & VALUE ── */}
        <SectionCard>
          <SectionHeader icon={<CalendarDays />} title="Contract Dates & Value" />

          {/* Mobile */}
          <div className="block sm:hidden">
            <FieldTable>
              <FieldRow label="Effective Date">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(detail.effectiveDate).toLocaleDateString()}
                </div>
              </FieldRow>
              <FieldRow label="Expiry Date">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                    {new Date(detail.expireDate).toLocaleDateString()}
                  </span>
                  {isOverdue && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                      {Math.abs(remainingDays)} days overdue
                    </span>
                  )}
                </div>
              </FieldRow>
              <FieldRow label="Renewal Frequency">
                {detail.renewalFrequencyMonths ? `${detail.renewalFrequencyMonths} months` : 'Auto calculated'}
              </FieldRow>
              <FieldRow label="Total Contract Value">
                <div className="inline-flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full">
                  <span className="text-green-600">$</span>
                  <span className="text-green-700">{detail.contractValue.toLocaleString()}</span>
                  <span className="text-green-600 text-xs">USD</span>
                </div>
              </FieldRow>
            </FieldTable>
          </div>

          {/* Desktop */}
          <table className="hidden sm:table w-full border border-gray-100 border-collapse">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="w-1/4 bg-gray-50 px-4 py-3 border-r border-gray-200">
                  <span className="text-xs font-medium text-brand-navy uppercase">Effective Date</span>
                </td>
                <td className="w-1/4 px-4 py-3 border-r border-gray-200">
                  <div className="text-sm flex items-center gap-1.5 whitespace-nowrap">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                    {new Date(detail.effectiveDate).toLocaleDateString()}
                  </div>
                </td>
                <td className="bg-gray-100 px-4 py-3 border-r border-gray-200">
                  <span className="text-xs font-medium text-brand-navy uppercase">Expiry Date</span>
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(detail.expireDate).toLocaleDateString()}
                    </span>
                    {isOverdue && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                        {Math.abs(remainingDays)} days overdue
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="bg-gray-100 px-4 py-3 border-r border-gray-200">
                  <span className="text-xs font-medium text-brand-navy uppercase">Renewal Frequency</span>
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  {detail.renewalFrequencyMonths
                    ? `${detail.renewalFrequencyMonths} months`
                    : <span className="italic text-gray-400">Not calculated</span>}
                </td>
                <td className="bg-gray-50 px-4 py-3 border-r border-gray-200">
                  <span className="text-xs font-medium text-brand-navy uppercase">Total Contract Value</span>
                </td>
                <td className="px-4 py-3">
                  <div className="inline-flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full">
                    <span className="text-green-600">$</span>
                    <span className="text-green-700">{detail.contractValue.toLocaleString()}</span>
                    <span className="text-green-600 text-xs">USD</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </SectionCard>

        {detail.remark && (
          <SectionCard>
            <SectionHeader
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              title="Remarks"
            />
            <div className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">{detail.remark}</div>
          </SectionCard>
        )}
      </div>
    );
  };

  // ─── Form renderer ───────────────────────────────────────────────────────

  const renderForm = () => {
    if (detailLoading || !formDefaults) {
      return <p className="p-6 text-gray-500">Loading contract…</p>;
    }
    if (formMode === 'view') {
      return renderViewDetails();
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

  // ─── Layout shells ────────────────────────────────────────────────────────

  const useInnerScroll = isFullscreen;
  const panelHeightClass = isPage ? '' : 'max-h-[calc(100vh-4rem)]';

  const panelShellClass = isFullscreen
    ? 'flex flex-col h-full min-h-0 bg-white'
    : `bg-white rounded-lg flex flex-col ${useInnerScroll ? `min-h-0 ${panelHeightClass}` : ''} ${isPage ? 'border border-gray-200' : `w-full max-w-4xl mx-4 ${useInnerScroll ? panelHeightClass : ''}`}`;

  const centerClass = isFullscreen ? 'max-w-350 mx-auto w-full' : '';

  const panel = (
    <div className={panelShellClass}>
      {/* ── Top bar (only rendered for fullscreen/modal — in page mode App owns the header) ── */}
      {!isPage && (
        <div className="shrink-0 bg-white border-b border-gray-200">
          <div className={`px-4 sm:px-6 pt-4 ${centerClass}`}>
            {/* Title row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
              <div className="min-w-0">
                {isFormActive ? (
                  <h2 className="text-xl font-semibold text-gray-900">
                    {formMode === 'renew' ? 'Renew Contract' : 'Edit Contract'}
                  </h2>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight whitespace-nowrap">{c.title}</h2>
                    {renderStatusBadge(apiStatus)}
                  </div>
                )}
                {!isFormActive && (
                  <p className="text-sm text-gray-500 mt-0.5 whitespace-nowrap">
                    {c.contractCode}{c.department ? <> · {c.department}</> : null}
                  </p>
                )}
              </div>
              {/* Fullscreen/modal action buttons stay here */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full sm:w-auto">
                {isFormActive ? (
                  <>
                    <button type="button" onClick={exitFormMode} className="px-4 py-2 text-primary rounded-lg bg-white border border-primary hover:bg-primary/10 cursor-pointer text-sm transition-colors">Cancel</button>
                    <button type="submit" form={detailsFormId} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm">
                      {formMode === 'renew' ? 'Renew Contract' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    {canEdit && c.status !== 'Closed' && (
                      <button type="button" onClick={() => { setFormMode('edit'); setActiveTab('details'); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm font-medium">
                        <Edit2 className="w-4 h-4" /> Edit Contract
                      </button>
                    )}
                    {canShowRenew && (
                      <button type="button" onClick={() => { setFormMode('renew'); setActiveTab('details'); }} className="flex items-center gap-2 px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink/80 cursor-pointer text-sm font-medium">
                        <RefreshCw className="w-4 h-4" /> Renew Contract
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Alert banner */}
            {renderAlertBanner(detail, isFormActive)}

            {/* Tabs */}
            {!isFormActive && (
              <div className="flex gap-1">
                {(['details', 'history'] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setTab(tab)}
                    className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors cursor-pointer capitalize ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Page-variant header (tabs + alert — no action buttons, those are in App's top bar) ── */}
      {isPage && (
        <div className="shrink-0  border-b border-gray-200 rounded-t-lg px-5 bg-white">
          <div className={`px-0 ${centerClass}`}>
            {/* Contract name + status badge */}
            {!isFormActive && (
              <div>
                <div className="flex items-center gap-2 flex-wrap px-0 pt-3 pb-2">
                  <h2 className="text-lg font-bold text-gray-900 leading-tight whitespace-nowrap">{c.title}</h2>
                  {renderStatusBadge(apiStatus)}

                </div>

                {c.contractCode && (
                  <span className="text-sm text-gray-400">{c.contractCode}</span>
                )}
                {c.department && (
                  <span className="text-sm text-gray-400"> · {c.department}</span>
                )}
              </div>
            )}
            {isFormActive && (
              <h2 className="text-lg font-semibold text-gray-900 pt-3 pb-2">
                {formMode === 'renew' ? 'Renew Contract' : 'Edit Contract'}
              </h2>
            )}

            {/* Alert banner */}
            {renderAlertBanner(detail, isFormActive)}

            {/* Tabs */}
            {!isFormActive && (
              <div className="flex gap-1">
                {(['details', 'history'] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setTab(tab)}
                    className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors cursor-pointer capitalize ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className={useInnerScroll ? `flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 ${centerClass}` : `px-4 sm:px-6 py-4 ${centerClass}`}>
        {isFormActive || activeTab === 'details' ? (
          renderForm()
        ) : (
          <div className="space-y-4">
            {historyItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No history available</div>
            ) : (
              historyItems.map((item) => (
                <div key={item.historyId} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${item.actionType === 'CREATED' ? 'bg-green-100 text-green-800' : item.actionType === 'MODIFIED' ? 'bg-primary/10 text-brand-navy' : 'bg-red-100 text-red-800'}`}>
                          {titleCase(item.actionType)}
                        </span>
                        <span className="text-gray-500 text-sm">{new Date(item.actionDate).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-500 text-sm mt-1">By: {item.actionBy.fullName}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isFullscreen) {
    return <div className="fixed inset-0 z-50 bg-white flex flex-col h-dvh">{panel}</div>;
  }
  if (isPage) return panel;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 sm:p-8 overflow-hidden">
      {panel}
    </div>
  );
}

// ─── Extracted helpers to avoid duplication ───────────────────────────────────

function renderStatusBadge(apiStatus: string) {
  if (apiStatus === 'OVERDUE')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">Overdue</span>;
  if (apiStatus === 'EXPIRING_SOON')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">Expiring Soon</span>;
  if (apiStatus === 'ACTIVE')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Active</span>;
  if (apiStatus === 'EXPIRED')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">Expired</span>;
  return null;
}

function renderAlertBanner(detail: { remainingDays: number; expireDate: string } | null, isFormActive: boolean) {
  if (isFormActive || !detail) return null;
  const days = detail.remainingDays;
  if (days < 0) {
    return (
      <div className="flex items-start gap-2 mt-3 mb-3 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
        <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>
          This contract expired on{' '}
          <strong>{new Date(detail.expireDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
          {' '}— {Math.abs(days)} days overdue. Please renew or archive it immediately.
        </span>
      </div>
    );
  }
  if (days <= 90) {
    return (
      <div className="flex items-start gap-2 mt-3 mb-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-orange-600">
        <AlertTriangle className="w-6 h-6 text-yellow-500" />
        <span>
          This contract expires on{' '}
          <strong>{new Date(detail.expireDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
          {' '}— {days} days remaining.
        </span>
      </div>
    );
  }
  return null;
}