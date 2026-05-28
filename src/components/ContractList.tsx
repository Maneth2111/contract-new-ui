import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract } from '../types/contract';
import { calculateDaysRemaining, formatCurrency, formatDate, pluralS } from '../utils/contractUtils';
import { Search, Eye, Edit2, Trash2, ChevronDown, FilePlus, AlertTriangle, Clock } from 'lucide-react';
import { RegisterContract } from './RegisterContract';
import { titleCase } from 'text-case';
import { usePagination } from '../hook/usePagination';
import { PaginationBar } from './PaginationBar';
import { ConfirmDialog } from './ConfirmationDialog';
import { listStatusBadgeClass, mapApiContractToListRow } from '../utils/contractListMappers';
import toast from 'react-hot-toast';
import { getAllowedDepartments } from '../utils/departmentAccess';
import { contractTableSortAccessors } from '../utils/contractTableSort';
import { useTableSort } from '../hook/useTableSort';
import { SortableTableHead } from './SortableTableHead';
import { tableRowHover, tableTheadClass } from '../utils/tableRowHover';
import type { UserProfile } from '../services/userService';

// ─── Mock data ────────────────────────────────────────────────────────────────
import {
  mockContracts as RAW_CONTRACTS,
  mockDepartments,
  mockContractStatuses,
  type Contract as MockContract,
} from '../data/mockData'; // adjust path to wherever you placed the mock data file

// Map raw mock contracts once to the Contract shape ContractList expects
const MOCK_CONTRACTS: Contract[] = RAW_CONTRACTS.map((c: MockContract) =>
  mapApiContractToListRow({
    contractId: c.contractId,
    contractCode: c.contractCode,
    contractTitle: c.contractTitle,
    personInCharge: c.personInCharge,
    contractTerm: c.contractTerm,
    effectiveDate: c.effectiveDate,
    expireDate: c.expireDate,
    renewalFrequencyMonths: c.renewalFrequencyMonths,
    contractValue: c.contractValue,
    alertDays: c.alertDays,
    remark: c.remark,
    remainingDays: c.remainingDays,
    status: c.status,
    createdBy: c.createdBy,
    department: c.department,
    contractType: c.contractType,
    partners: c.partners,
    alerts: c.alerts,
  } as any)
);

// Notification summary derived from mock contracts
const MOCK_NOTIFICATION_SUMMARY = {
  overdue: RAW_CONTRACTS.filter((c) => c.status === 'OVERDUE').length,
  expire30: RAW_CONTRACTS.filter((c) => c.remainingDays >= 0 && c.remainingDays <= 30).length,
  expire60: RAW_CONTRACTS.filter((c) => c.remainingDays > 30 && c.remainingDays <= 60).length,
  expire90: RAW_CONTRACTS.filter((c) => c.remainingDays > 60 && c.remainingDays <= 90).length,
};

// ─────────────────────────────────────────────────────────────────────────────

interface ContractListProps {
  isLoggedIn?: boolean;
  userConfidentialAccess: boolean;
  contractPermission: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    viewDocuments: boolean;
  };
  onRefetchReady?: (refetch: () => void) => void;
  onTotalsRefresh?: () => void;
  currentUser?: UserProfile | null;
  onSelectContract?: (contract: Contract, formMode?: 'view' | 'edit') => void;
}

export default function ContractList({
  userConfidentialAccess,
  contractPermission,
  isLoggedIn,
  onRefetchReady,
  onTotalsRefresh,
  currentUser,
  onSelectContract,
}: ContractListProps) {
  // ── Local state ────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [showRegisterContract, setShowRegisterContract] = useState(false);

  // ── Mock-data equivalents for useDepartments / useContractStatus ──────────
  const departmentList = mockDepartments;
  const statuses = mockContractStatuses; // [{ label, key }, …]

  const { allowedDepartments, isSingleDepartment, defaultDepartmentId } =
    getAllowedDepartments(departmentList, currentUser?.moduleAccess);

  // Initialise department from allowed list (mirrors original useEffect)
  useEffect(() => {
    if (isSingleDepartment && defaultDepartmentId != null) {
      setSelectedDepartmentId(defaultDepartmentId);
    }
  }, [defaultDepartmentId, isSingleDepartment]);

  // ── In-memory "contracts" state so delete / register can mutate it ─────────
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);

  // Expose a no-op refetch reference so the parent's contractRefetchRef works
  const refetch = useCallback(() => {
    // Nothing to re-fetch in mock mode; just re-derive from current state
    setContracts((prev) => [...prev]);
  }, []);

  useEffect(() => {
    onRefetchReady?.(refetch);
  }, [refetch, onRefetchReady]);

  // ── Notification summary (static from mock) ────────────────────────────────
  const notificationSummary = MOCK_NOTIFICATION_SUMMARY;
  const overdueCount = notificationSummary.overdue;

  // ── Pagination ─────────────────────────────────────────────────────────────
  const { pagination, goToPage, setSize } = usePagination(10);

  // ── Client-side filter → sort → paginate ──────────────────────────────────
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      if (!userConfidentialAccess && contract.confidential) return false;
      if (selectedDepartmentId !== undefined && (contract as any).departmentId !== selectedDepartmentId) {
        // Fall back to matching on the department name if departmentId isn't on the mapped row
        if (contract.department !== departmentList.find((d) => d.departmentId === selectedDepartmentId)?.departmentName) {
          return false;
        }
      }
      if (selectedStatus !== '') {
        const mapped = titleCase(selectedStatus.replace(/_/g, ' '));
        if (contract.status !== mapped && contract.status !== selectedStatus) return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase().trim();
        return (
          contract.id.toLowerCase().includes(q) ||
          contract.title.toLowerCase().includes(q) ||
          contract.partnerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [contracts, userConfidentialAccess, selectedDepartmentId, selectedStatus, searchText, departmentList]);

  const { sortKey, sortDirection, toggleSort, sortedItems: sortedContracts } =
    useTableSort(filteredContracts, contractTableSortAccessors);

  const total = filteredContracts.length;
  const totalPages = Math.ceil(total / pagination.size);
  const pagedContracts = sortedContracts.slice(
    (pagination.page - 1) * pagination.size,
    pagination.page * pagination.size,
  );

  // ── Delete (in-memory) ────────────────────────────────────────────────────
  const handleDelete = async (contract: Contract) => {
    try {
      setDeletingId(contract.contractId);
      // Simulate async work
      await new Promise((r) => setTimeout(r, 400));
      setContracts((prev) => prev.filter((c) => c.contractId !== contract.contractId));
      toast.success(`Contract ${contract.id} has been Deleted!`);
      onTotalsRefresh?.();
    } catch (error) {
      console.error('Failed to delete contract:', error);
      alert('Failed to delete contract. Please try again.');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // ── View / edit handler ───────────────────────────────────────────────────
  const handleViewContractDetails = (contract: Contract, formMode: 'view' | 'edit' = 'view') => {
    if (formMode === 'view' && !contractPermission.viewDocuments) return;
    if (formMode === 'edit' && !contractPermission.edit) return;
    onSelectContract?.(contract, formMode);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Notification summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
          <div className="flex items-center gap-3">
            <span><AlertTriangle className="w-10 h-10 text-red-600" /></span>
            <div>
              <p className="text-gray-600">Overdue Contract{pluralS(overdueCount)}</p>
              <p className="mt-1">{overdueCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
          <div className="flex items-center gap-3">
            <span><Clock className="w-10 h-10 text-red-500" /></span>
            <div>
              <p className="text-gray-600">30-Day Warning</p>
              <p className="mt-1">{notificationSummary.expire30}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
          <div className="flex items-center gap-3">
            <span><Clock className="w-10 h-10 text-orange-600" /></span>
            <div>
              <p className="text-gray-600">60-Day Warning</p>
              <p className="mt-1">{notificationSummary.expire60}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
          <div className="flex items-center gap-3">
            <span><Clock className="w-10 h-10 text-yellow-600" /></span>
            <div>
              <p className="text-gray-600">90-Day Warning</p>
              <p className="mt-1">{notificationSummary.expire90}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-medium">Contract Management</h2>
          {contractPermission.create && (
            <button
              type="button"
              onClick={() => setShowRegisterContract(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer"
            >
              <FilePlus className="w-4 h-4" />
              New Contract
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Department */}
          <div>
            <label className="block text-gray-700 mb-2">Department</label>
            <div className="relative">
              <select
                value={selectedDepartmentId ?? ''}
                disabled={isSingleDepartment}
                onChange={(e) => {
                  setSelectedDepartmentId(e.target.value === '' ? undefined : Number(e.target.value));
                  goToPage(1);
                }}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white ${isSingleDepartment ? 'cursor-default' : 'cursor-pointer pr-8'
                  }`}
              >
                {!isSingleDepartment && <option value="">All Departments</option>}
                {allowedDepartments.map((dept) => (
                  <option key={dept.departmentId} value={dept.departmentId}>
                    {dept.departmentName}
                  </option>
                ))}
              </select>
              {!isSingleDepartment && (
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-700 mb-2">Status</label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); goToPage(1); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white pr-8 cursor-pointer"
              >
                <option value="">All Status</option>
                {statuses.map((status) => (
                  <option key={status.key} value={status.key}>
                    {titleCase(status.label)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="block text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Contract ID, Title, Partner..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); goToPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contract Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div
          className={[
            'overflow-x-auto',
            pagedContracts.length > 10 ? 'overflow-y-auto max-h-[70vh] lg:overflow-y-hidden' : '',
          ].join(' ').trim() || undefined}
        >
          <table className={`w-full min-w-max text-sm shadow [&_th]:px-2 [&_th]:py-5 [&_th]:whitespace-nowrap [&_td]:px-2 [&_td]:py-3.5 ${tableRowHover}`}>
            <thead className={tableTheadClass}>
              <tr>
                <SortableTableHead label="Contract ID" columnKey="id" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-fit" />
                <SortableTableHead label="Title" columnKey="title" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-40" />
                <SortableTableHead label="Department" columnKey="department" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-40" />
                <SortableTableHead label="Person In Charge" columnKey="personInCharge" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-35" />
                <SortableTableHead label="Partner" columnKey="partnerName" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-36" />
                <SortableTableHead label="Expiry" columnKey="expiryDate" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-28" />
                <SortableTableHead label="Days Left" columnKey="daysRemaining" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-24" />
                <SortableTableHead label="Status" columnKey="status" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-fit" />
                <SortableTableHead label="Total Contract Value" columnKey="contractValue" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-35" />
                <th className="w-fit text-brand-navy font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagedContracts.length === 0 ? (
                <tr data-empty>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    No contracts found
                  </td>
                </tr>
              ) : (
                pagedContracts.map((contract) => {
                  const daysRemaining = calculateDaysRemaining(contract.expiryDate);
                  const isDeleting = deletingId === contract.contractId;

                  return (
                    <tr
                      key={contract.id}
                      onClick={() => contractPermission.viewDocuments && handleViewContractDetails(contract)}
                      className={`transition-opacity cursor-pointer ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                      <td className="whitespace-nowrap lg:max-w-0" title={contract.id}>{contract.id}</td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.title}>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="whitespace-nowrap lg:truncate">{contract.title}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.department}>{contract.department}</td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.personInCharge}>{contract.personInCharge}</td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.partnerName}>{contract.partnerName}</td>
                      <td className="whitespace-nowrap">{formatDate(contract.expiryDate)}</td>
                      <td className="whitespace-nowrap">
                        <span className={daysRemaining < 0 ? 'text-red-600' : ''}>
                          {daysRemaining} days
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap ${listStatusBadgeClass(contract.status)}`}
                          title={contract.status}
                        >
                          {contract.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0 text-center" title={formatCurrency(contract.contractValue)}>
                        {formatCurrency(contract.contractValue)}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          {contractPermission.viewDocuments && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleViewContractDetails(contract); }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-primary cursor-pointer"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {contractPermission.edit && contract.status !== 'Closed' && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleViewContractDetails(contract, 'edit'); }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-primary cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {contractPermission.delete && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(contract); }}
                              disabled={isDeleting}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-red-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count + pagination */}
      <div className="flex flex-col sm:flex-row justify-between w-full items-start sm:items-center gap-3 sm:gap-0">
        <div className="text-gray-600 text-sm sm:text-base whitespace-nowrap">
          Showing {pagedContracts.length} of {total} contracts
        </div>

        <div className="flex items-center gap-3">
          {total > 10 && (
            <select
              value={pagination.size}
              onChange={(e) => { setSize(Number(e.target.value)); goToPage(1); }}
              className="px-2 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer"
            >
              {[10, 20, 50].map((s) => (
                <option key={s} value={s}>Show {s}</option>
              ))}
            </select>
          )}
          <PaginationBar
            currentPage={pagination.page}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Contract"
        message={`Are you sure you want to delete "${deleteTarget?.title} contract"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        icon={<Trash2 className="w-5 h-5 text-red-600" />}
        confirmIcon={<Trash2 className="w-4 h-4" />}
        onConfirm={() => handleDelete(deleteTarget!)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Register contract modal */}
      {showRegisterContract && (
        <RegisterContract
          currentUser={currentUser}
          onCancel={() => setShowRegisterContract(false)}
          onSuccess={async () => {
            setShowRegisterContract(false);
            refetch();
            onTotalsRefresh?.();
          }}
        />
      )}
    </div>
  );
}