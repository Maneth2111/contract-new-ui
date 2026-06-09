import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract } from '../types/contract';
import { calculateDaysRemaining, formatCurrency, formatDate, pluralS } from '../utils/contractUtils';
import { Search, Eye, Trash2, AlertTriangle, Clock, PenSquare } from 'lucide-react';
import { RegisterContract } from './RegisterContract';
import { titleCase } from 'text-case';
import { usePagination } from '../hook/usePagination';
import { PaginationBar } from './PaginationBar';
import { ConfirmDialog } from './ConfirmationDialog';
import { listStatusBadgeClass, listStatusTextClass, mapApiContractToListRow } from '../utils/contractListMappers';
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
import { CustomSelect } from './ui/CustomSelect';

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
  onRegisterContractReady?: (open: () => void) => void;
  onTotalsRefresh?: () => void;
  currentUser?: UserProfile | null;
  onSelectContract?: (contract: Contract, formMode?: 'view' | 'edit') => void;
}

export function ContractList({
  userConfidentialAccess,
  contractPermission,
  isLoggedIn,
  onRefetchReady,
  onRegisterContractReady,
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

  useEffect(() => {
    onRegisterContractReady?.(() => setShowRegisterContract(true));
  }, [onRegisterContractReady]);

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
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {/* Overdue */}
        <div className="bg-white p-3 rounded-xl  shadow-sm relative overflow-hidden hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Overdue</p>
            <span className="flex items-center justify-center  w-8 h-8 rounded-lg bg-red-100 shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-0.5">{overdueCount}</p>
          <p className="text-xs text-red-500 font-medium">
            {overdueCount === 0 ? 'All clear' : 'Requires immediate action'}
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1  bg-red-500 rounded-b-xl" />
        </div>

        {/* 30 Days */}
        <div className="bg-white p-3 rounded-xl  shadow-sm relative overflow-hidden hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">≤ 30 Days</p>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 shrink-0">
              <Clock className="w-4 h-4 text-red-500" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-0.5">{notificationSummary.expire30}</p>
          <p className="text-xs text-red-400 font-medium">
            {notificationSummary.expire30 === 0 ? 'None expiring' : 'Critical — act now'}
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-red-400 rounded-b-xl" />
        </div>

        {/* 60 Days */}
        <div className="bg-white p-3 rounded-xl  shadow-sm relative overflow-hidden hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">≤ 60 Days</p>
            <span className="flex items-center justify-center  w-8 h-8 rounded-lg bg-orange-100 shrink-0">
              <Clock className="w-4 h-4 text-orange-500" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-0.5">{notificationSummary.expire60}</p>
          <p className="text-xs text-orange-400 font-medium">
            {notificationSummary.expire60 === 0 ? 'None expiring' : 'Urgent attention needed'}
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-400 rounded-b-xl" />
        </div>

        {/* 90 Days */}
        <div className="bg-white p-3 rounded-xl  shadow-sm relative overflow-hidden hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">≤ 90 Days</p>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 shrink-0">
              <Clock className="w-4 h-4 text-yellow-500" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-0.5">{notificationSummary.expire90}</p>
          <p className="text-xs text-yellow-500 font-medium">
            {notificationSummary.expire90 === 0 ? 'None expiring' : 'Plan renewal soon'}
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-b-xl" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md ">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Department */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Department</label>
            <CustomSelect
              value={selectedDepartmentId?.toString() ?? ''}
              disabled={isSingleDepartment}
              onChange={(value) => {
                setSelectedDepartmentId(value === '' ? undefined : Number(value));
                goToPage(1);
              }}
              options={allowedDepartments.map((dept) => ({
                key: dept.departmentId.toString(),
                label: dept.departmentName,
              }))}
              placeholder="All Departments"
              showPlaceholder={!isSingleDepartment}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Status</label>
            <CustomSelect
              value={selectedStatus}
              onChange={(value) => {
                setSelectedStatus(value);
                goToPage(1);
              }}
              options={statuses.map((status) => ({
                key: status.key,
                label: titleCase(status.label),
              }))}
              placeholder="All Status"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Search</label>
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
      <div className="bg-white rounded-lg shadow-md  ">
        <div
          className={[
            'overflow-x-auto',
            pagedContracts.length > 10 ? 'overflow-y-auto max-h-[70vh] lg:overflow-y-hidden' : '',
          ].join(' ').trim() || undefined}
        >
          <table className={`w-full min-w-max text-sm rounded-t-lg overflow-hidden [&_th]:px-2 [&_th]:py-5 [&_th]:whitespace-nowrap [&_td]:px-2 [&_td]:py-3.5 ${tableRowHover}`}>
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
                <th className="w-fit text-white font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {pagedContracts.length === 0 ? (
                <tr data-empty className='h-28'>
                  <td colSpan={10}  className="px-4 py-10 text-center text-gray-500">
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
                      className={`relative transition-all cursor-pointer ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                      <td className="relative whitespace-nowrap lg:max-w-0 text-primary font-medium" title={contract.id}>
                        <span className="text-primary">{contract.id}</span>
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.title}>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="whitespace-nowrap lg:truncate">{contract.title}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.department}>
                        {(() => {
                          const name = contract.department ?? '';
                          const colorMap: Record<string, string> = {
                            'IT Department': 'bg-pink-100 text-pink-700',
                            'Legal and Compliance': 'bg-primary/20 text-primary',
                            'Admin and Marketing': 'bg-purple-100 text-purple-700',
                          };
                          const color = colorMap[name] ?? 'bg-gray-100 text-gray-600';
                          return (
                            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${color}`}>
                              {name}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.personInCharge}>{contract.personInCharge}</td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.partnerName}>{contract.partnerName}</td>
                      <td className="whitespace-nowrap">{formatDate(contract.expiryDate)}</td>
                      <td className="whitespace-nowrap">
                        {(() => {
                          const days = calculateDaysRemaining(contract.expiryDate);
                          const maxDays = Math.max(...pagedContracts.map(c => calculateDaysRemaining(c.expiryDate)));

                          let textColor = 'text-green-600';
                          let barColor = 'bg-green-600';
                          if (days < 0) { textColor = 'text-red-600'; barColor = 'bg-red-500'; }
                          else if (days <= 30) { textColor = 'text-red-500'; barColor = 'bg-red-400'; }
                          else if (days <= 60) { textColor = 'text-orange-500'; barColor = 'bg-orange-400'; }
                          else if (days <= 90) { textColor = 'text-yellow-600'; barColor = 'bg-yellow-400'; }

                          const barWidth = days < 0 ? 100 : maxDays > 0 ? Math.round((days / maxDays) * 100) : 0;

                          return (
                            <div className="flex flex-col gap-1 min-w-18">
                              <span className={`text-sm font-semibold ${textColor}`}>
                                {days < 0 ? `${Math.abs(days)} overdue` : `${days} days`}
                              </span>
                              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          );
                        })()}
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
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-primary cursor-pointer "
                              title="Edit"
                            >
                              <PenSquare className="w-4 h-4 " />
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
        {/* Results count + pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t border-gray-100">
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