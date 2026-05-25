import React, { useEffect, useState } from 'react';
import { Contract } from '../types/contract';
import { calculateDaysRemaining, formatCurrency, formatDate } from '../utils/contractUtils';
import { Search, Eye, Edit2, Trash2, ChevronDown, RefreshCw, FilePlus } from 'lucide-react';
import { RegisterContract } from './RegisterContract';
import { useDepartments } from '../hook/useDepartment';
import { useContractStatus } from '../hook/useStatus';
import { titleCase } from 'text-case';
import { useContracts } from '../hook/useContracts';
import { usePagination } from '../hook/usePagination';
import { PaginationBar } from './PaginationBar';
import { deleteContract } from '../services/contractService';
import { ConfirmDialog } from './ConfirmationDialog';
import { deleteContractFile, getContractFiles } from '../services/contractFileService';
import { listStatusBadgeClass, mapApiContractToListRow } from '../utils/contractListMappers';
import toast from 'react-hot-toast';
import { getAllowedDepartments } from '../utils/departmentAccess';
import type { UserProfile } from '../services/userService';
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

export function ContractList({
  userConfidentialAccess,
  contractPermission,
  isLoggedIn,
  onRefetchReady,
  onTotalsRefresh,
  currentUser,
  onSelectContract,
}: ContractListProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const { departmentList } = useDepartments();
  const {
    allowedDepartments,
    isSingleDepartment,
    defaultDepartmentId,
  } = getAllowedDepartments(departmentList, currentUser?.moduleAccess);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>(() => defaultDepartmentId);
  const [showRegisterContract, setShowRegisterContract] = useState(false);
  const { statuses } = useContractStatus();
  const { pagination, goToPage, setSize } = usePagination(10);
  const { contracts: apiContracts, total, totalPages, refetch } = useContracts({
    search: searchText.trim() || undefined,
    status: selectedStatus === '' ? undefined : selectedStatus,
    departmentId: selectedDepartmentId,
    page: pagination.page,
    size: pagination.size,
  }, isLoggedIn);

  const contracts: Contract[] = apiContracts.map(mapApiContractToListRow);
  useEffect(() => {
    onRefetchReady?.(refetch);
  }, [refetch]);

  useEffect(() => {
    if (isSingleDepartment && defaultDepartmentId != null) {
      setSelectedDepartmentId(defaultDepartmentId)
      goToPage(1)
    }
  }, [defaultDepartmentId, isSingleDepartment, goToPage])
  // Handle delete contract
  const handleDelete = async (contract: Contract) => {
    try {
      setDeletingId(contract.contractId);
      const files = await getContractFiles(contract.contractId);

      if (files && files.length > 0) {
        await Promise.all(
          files.map((file: any) =>
            deleteContractFile(contract.contractId, file.fileId)
          )
        );
      }
      await deleteContract(contract.contractId);
      toast.success(`Contract ${contract.id} has been Deleted!`);

      if (contract) {
        await refetch()
        onTotalsRefresh?.()
      }
    } catch (error) {
      console.error('Failed to delete contract:', error);
      alert('Failed to delete contract. Please try again.');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };
  const filteredContracts = contracts.filter((contract) => {
    if (!userConfidentialAccess && contract.confidential) return false;
    if (selectedDepartment !== '' && contract.department !== selectedDepartment) return false;
    if (searchText) {
      const q = searchText.toLowerCase().trim();
      return (
        contract.id.toLowerCase().includes(q) ||
        contract.title.toLowerCase().includes(q) ||
        contract.partnerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleViewContractDetails = (contract: Contract, formMode: 'view' | 'edit' = 'view') => {
    if (formMode === 'view' && !contractPermission.viewDocuments) return
    if (formMode === 'edit' && !contractPermission.edit) return
    onSelectContract?.(contract, formMode)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2>Contract Management</h2>
          {contractPermission.create && (
            <button
              type="button"
              onClick={() => setShowRegisterContract(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <FilePlus className="w-4 h-4" />
              New Registration
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Department</label>
            <div className="relative">
              <select
                value={selectedDepartmentId ?? ''}
                disabled={isSingleDepartment}
                onChange={(e) => {
                  setSelectedDepartmentId(e.target.value === '' ? undefined : Number(e.target.value))
                  goToPage(1)
                }}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white ${isSingleDepartment ? 'cursor-default' : 'cursor-pointer pr-8'}`}
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
                  <option key={status.key} value={titleCase(status.label)}>
                    {titleCase(status.label)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div
          className={[
            'overflow-x-auto lg:overflow-x-visible',
            filteredContracts.length > 10 ? 'overflow-y-auto max-h-[70vh]' : '',
          ].join(' ').trim() || undefined}
        >
          <table className="w-full min-w-4xl lg:min-w-0 table-auto lg:table-fixed text-sm [&_th]:px-2 [&_th]:py-2 [&_th]:whitespace-nowrap [&_td]:px-2 [&_td]:py-2">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="lg:w-[9%] text-left text-gray-700 font-medium">Contract ID</th>
                <th className="lg:w-[16%] text-left text-gray-700 font-medium wrap-break-word whitespace-normal!">Title</th>
                <th className="w-40 min-w-40 max-w-40 text-left text-gray-700 font-medium whitespace-nowrap">Department</th>
                <th className="lg:w-[10%] text-left text-gray-700 font-medium">In Charge</th>
                <th className="lg:w-[11%] text-left text-gray-700 font-medium wrap-break-word whitespace-normal!">Partner</th>
                <th className="lg:w-[9%] text-left text-gray-700 font-medium">Expiry</th>
                <th className="lg:w-[8%] text-left text-gray-700 font-medium">Days Left</th>
                <th className="lg:w-[9%] text-left text-gray-700 font-medium">Status</th>
                <th className="lg:w-[10%] text-left text-gray-700 font-medium wrap-break-word whitespace-normal!  lg:max-w-0">Total Contract Value</th>
                <th className="lg:w-[11%] text-left text-gray-700 font-medium wrap-break-word whitespace-normal!  lg:max-w-0">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No contracts found
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => {
                  const daysRemaining = calculateDaysRemaining(contract.expiryDate);
                  const isDeleting = deletingId === contract.contractId;

                  return (
                    <tr
                      key={contract.id}
                      onClick={() => contractPermission.viewDocuments && handleViewContractDetails(contract)}
                      className={`hover:bg-gray-50 transition-opacity cursor-pointer ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                      <td className="wrap-break-word whitespace-normal!  lg:max-w-0" title={contract.id}>{contract.id}</td>
                      <td className="wrap-break-word whitespace-normal  lg:max-w-0">
                        <div className="flex flex-wrap items-start gap-1 min-w-0">
                          <span className="wrap-break-word">{contract.title}</span>
                          {contract.confidential && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded whitespace-nowrap">
                              Confidential
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="w-40 min-w-40 max-w-40 whitespace-nowrap truncate" title={contract.department}>{contract.department}</td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.personInCharge}>{contract.personInCharge}</td>
                      <td className="wrap-break-word whitespace-normal  lg:max-w-0">{contract.partnerName}</td>
                      <td className="whitespace-nowrap">{formatDate(contract.expiryDate)}</td>
                      <td className="whitespace-nowrap">
                        <span className={daysRemaining < 0 ? 'text-red-600' : ''}>
                          {daysRemaining} days
                        </span>
                      </td>
                      <td className="text-center align-middle whitespace-nowrap lg:max-w-0">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap ${listStatusBadgeClass(contract.status)}`}
                          title={contract.status}
                        >
                          {contract.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={formatCurrency(contract.contractValue)}>
                        {formatCurrency(contract.contractValue)}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          {contractPermission.viewDocuments && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewContractDetails(contract)
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-blue-600 cursor-pointer"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {contractPermission.edit && contract.status !== 'Closed' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewContractDetails(contract, 'edit')
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-blue-600 cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {contractPermission.delete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget(contract)
                              }}
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
          Showing {contracts.length} of {total} contracts
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

      {showRegisterContract && (
        <RegisterContract
          currentUser={currentUser}
          onCancel={() => setShowRegisterContract(false)}
          onSuccess={async () => {
            setShowRegisterContract(false)
            await refetch()
            onTotalsRefresh?.()
          }}
        />
      )}
    </div>
  );
}