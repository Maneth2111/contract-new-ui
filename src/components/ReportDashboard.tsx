import React, { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract } from '../types/contract';
import { calculateDaysRemaining, formatCurrency, formatDate, getPrimaryPartnerName, pluralS } from '../utils/contractUtils';
import { FileText, Download, ChevronDown, DollarSign, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { PaginationBar } from './PaginationBar';
import { usePagination } from '../hook/usePagination';
import { DateRangePicker } from './ui/date-range-picker';
import { getAllowedDepartments } from '../utils/departmentAccess';
import { contractTableSortAccessors } from '../utils/contractTableSort';
import { useTableSort } from '../hook/useTableSort';
import { SortableTableHead } from './SortableTableHead';
import { tableRowHover, tableTheadClass } from '../utils/tableRowHover';

// ─── Mock data ────────────────────────────────────────────────────────────────
import {
  mockContracts,
  mockDepartments,
  type Contract as MockContract,
  type ContractStatus,
} from '../data/mockData'; // adjust path to wherever you placed the mock data file
import { CustomSelect } from './ui/CustomSelect';
import { listStatusTextClass } from '../utils/contractListMappers';

// ─────────────────────────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' | 'OVERDUE' | 'CLOSED';

const STATUS_FILTER_OPTIONS: StatusFilter[] = ['ALL', 'ACTIVE', 'EXPIRED', 'EXPIRING_SOON', 'OVERDUE', 'CLOSED'];

// ── Map mock ContractStatus → display label used by Contract['status'] ────────
function apiStatusToDisplay(status: ContractStatus): Contract['status'] {
  switch (status) {
    case 'ACTIVE': return 'Active';
    case 'EXPIRING_SOON': return 'Expiring Soon';
    case 'OVERDUE': return 'Overdue';
    case 'EXPIRED': return 'Expired';
    default: return status as Contract['status'];
  }
}

// ── Summary shape (mirrors SummaryReport from the real service) ───────────────
interface SummaryReport {
  totalContracts: number;
  totalValue: number;
  active: number;
  expiringSoon: number;
  closed: number;
}

function getStatusFilterLabel(filter: StatusFilter, summary: SummaryReport | null | undefined): string {
  switch (filter) {
    case 'ALL': return `All Contract${pluralS(summary?.totalContracts ?? 0)}`;
    case 'ACTIVE': return `Active Contract${pluralS(summary?.active ?? 0)}`;
    case 'EXPIRED': return `Expired Contract${pluralS(0)}`;
    case 'EXPIRING_SOON': return 'Expiring Soon (90 days)';
    case 'OVERDUE': return `Overdue Contract${pluralS(0)}`;
    case 'CLOSED': return `Closed Contract${pluralS(summary?.closed ?? 0)}`;
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface ReportDashboardProps {
  currentUser?: import('../services/userService').UserProfile | null;
  onSelectContract?: (contract: Contract) => void;
  onExportCsvReady?: (exportCsv: () => Promise<void>) => void;
  onExportPdfReady?: (exportPdf: () => Promise<void>) => void;
  onReportExportStatusChange?: (status: { total: number; exportingCSV: boolean; exportingPDF: boolean }) => void;
}

// ── Convert a raw mock contract to the Contract shape the table expects ────────
function mockToContract(c: MockContract): Contract {
  return {
    id: String(c.contractId),
    contractCode: c.contractCode,
    contractId: c.contractId,
    title: c.contractTitle,
    contractType: c.contractType.contractTypeName,
    department: c.department.departmentName,
    personInCharge: c.personInCharge,
    partnerId: '',
    partnerName: c.partners.map((p) => p.partnerName).join(', '),
    partnerContact: '',
    partnerContactNumber: '',
    contractTerms: c.contractTerm,
    effectiveDate: c.effectiveDate,
    expiryDate: c.expireDate,
    contractValue: c.contractValue,
    status: apiStatusToDisplay(c.status),
    confidential: false,
    autoRenew: false,
    alertDays: c.alertDays ?? 0,
    remainingDays: c.remainingDays,
    partners: [],
    alerts: [],
  };
}

export function ReportDashboard({
  currentUser,
  onSelectContract,
  onExportCsvReady,
  onExportPdfReady,
  onReportExportStatusChange,
}: ReportDashboardProps) {
  const [reportType] = useState('Contract Summary Report');
  const [selectedDepartment, setSelectedDepartment] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const [createRange, setCreateRange] = useState<DateRange | undefined>(undefined);
  const [expireRange, setExpireRange] = useState<DateRange | undefined>(undefined);

  const createDateFrom = createRange?.from ?? null;
  const createDateTo = createRange?.to ?? null;
  const expireDateFrom = expireRange?.from ?? null;
  const expireDateTo = expireRange?.to ?? null;

  // ── Department list from mock ──────────────────────────────────────────────
  const departmentList = mockDepartments;
  const { allowedDepartments, isSingleDepartment, defaultDepartmentId } =
    getAllowedDepartments(departmentList, currentUser?.moduleAccess);

  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const { pagination, goToPage, setSize } = usePagination(10);

  React.useEffect(() => {
    if (isSingleDepartment && defaultDepartmentId != null) {
      setSelectedDepartment(defaultDepartmentId);
      goToPage(1);
    }
  }, [defaultDepartmentId, isSingleDepartment, goToPage]);

  // ── Status matching helpers ────────────────────────────────────────────────
  const statusMatchesFilter = (status: Contract['status'], filter: StatusFilter): boolean => {
    switch (filter) {
      case 'ACTIVE': return status === 'Active';
      case 'EXPIRED': return status === 'Expired';
      case 'EXPIRING_SOON': return status === 'Expiring Soon';
      case 'OVERDUE': return status === 'Overdue';
      case 'CLOSED': return status === 'Closed';
      case 'ALL':
      default: return true;
    }
  };

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Expired': return 'bg-gray-100 text-gray-800';
      case 'Expiring Soon': return 'bg-orange-100 text-orange-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateForApi = (date: Date | null) =>
    date ? date.toISOString().split('T')[0] : undefined;

  // ── In-memory filtering (replaces useContractReport + fetchAllContractReportPages) ──
  const allMapped: Contract[] = useMemo(() => mockContracts.map(mockToContract), []);

  const filtered: Contract[] = useMemo(() => {
    return allMapped.filter((c) => {
      // Department
      if (selectedDepartment !== undefined) {
        const dept = mockDepartments.find((d) => d.departmentId === selectedDepartment);
        if (dept && c.department !== dept.departmentName) return false;
      }
      // Status
      if (!statusMatchesFilter(c.status, statusFilter)) return false;
      // Creation date range (using effectiveDate as proxy)
      if (createDateFrom && new Date(c.effectiveDate) < createDateFrom) return false;
      if (createDateTo && new Date(c.effectiveDate) > createDateTo) return false;
      // Expiry date range
      if (expireDateFrom && new Date(c.expiryDate) < expireDateFrom) return false;
      if (expireDateTo && new Date(c.expiryDate) > expireDateTo) return false;
      return true;
    });
  }, [allMapped, selectedDepartment, statusFilter, createDateFrom, createDateTo, expireDateFrom, expireDateTo]);

  // ── Summary ────────────────────────────────────────────────────────────────
  const summary: SummaryReport = useMemo(() => ({
    totalContracts: filtered.length,
    totalValue: filtered.reduce((s, c) => s + (Number(c.contractValue) || 0), 0),
    active: filtered.filter((c) => c.status === 'Active').length,
    expiringSoon: filtered.filter((c) => c.status === 'Expiring Soon').length,
    closed: filtered.filter((c) => c.status === 'Closed').length,
  }), [filtered]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const total = filtered.length;
  const totalPages = Math.ceil(total / pagination.size);
  const paged = filtered.slice(
    (pagination.page - 1) * pagination.size,
    pagination.page * pagination.size,
  );

  useEffect(() => {
    onReportExportStatusChange?.({
      total,
      exportingCSV,
      exportingPDF,
    });
  }, [onReportExportStatusChange, total, exportingCSV, exportingPDF]);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const { sortKey, sortDirection, toggleSort, sortedItems: sortedContracts } =
    useTableSort(paged, contractTableSortAccessors);

  // ── Export helpers (same logic as original, data sourced from mock) ────────
  const fetchAllFilteredContracts = async (): Promise<Contract[]> => filtered;

  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);
      const allContracts = await fetchAllFilteredContracts();
      await Promise.all([
        delay(1000),
        (async () => {
          const headers = [
            'Contract ID', 'Title', 'Department', 'Person In Charge',
            'Partner', 'Effective Date', 'Expiry Date', 'Days Remaining',
            'Status', 'Contract Value',
          ];
          const rows = allContracts.map((contract) => {
            const daysRemaining = calculateDaysRemaining(contract.expiryDate);
            return [
              contract.contractCode,
              contract.title,
              contract.department,
              contract.personInCharge,
              contract.partnerName,
              contract.effectiveDate,
              contract.expiryDate,
              `${daysRemaining} days`,
              contract.status,
              contract.contractValue.toString(),
            ];
          });
          const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
          ].join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `contract-report-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          window.URL.revokeObjectURL(url);
        })(),
      ]);
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const allContracts = await fetchAllFilteredContracts();
      await Promise.all([
        delay(2000),
        (async () => {
          const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
          const generatedOn = new Date().toLocaleString();

          doc.setFontSize(14);
          doc.text('Contract Summary Report', 40, 40);
          doc.setFontSize(10);
          doc.text(`Generated on: ${generatedOn}`, 40, 58);

          const filters = [
            selectedDepartment
              ? `Department: ${departmentList.find((d) => d.departmentId === selectedDepartment)?.departmentName ?? selectedDepartment}`
              : 'Department: All',
            `Status: ${getStatusFilterLabel(statusFilter, summary)}`,
            createDateFrom || createDateTo
              ? `Creation Date: ${createDateFrom ? formatDateForApi(createDateFrom) : '…'} - ${createDateTo ? formatDateForApi(createDateTo) : '…'}`
              : 'Creation Date: All',
            expireDateFrom || expireDateTo
              ? `Expiration Date: ${expireDateFrom ? formatDateForApi(expireDateFrom) : '…'} - ${expireDateTo ? formatDateForApi(expireDateTo) : '…'}`
              : 'Expiration Date: All',
          ];

          doc.setFontSize(9);
          doc.text(filters.join('   |   '), 40, 78, { maxWidth: 760 });

          const totalValueForExport = allContracts.reduce((sum, c) => sum + (Number(c.contractValue) || 0), 0);
          const activeForExport = allContracts.filter((c) => c.status === 'Active').length;
          const expiringSoonForExport = allContracts.filter((c) => c.status === 'Expiring Soon').length;

          doc.setFontSize(10);
          doc.text('Summary', 40, 98);
          doc.setFontSize(9);
          doc.text(
            [
              `Total Contracts: ${allContracts.length}`,
              `Total Contract Value: ${formatCurrency(totalValueForExport)}`,
              `Active: ${activeForExport}`,
              `Expiring Soon: ${expiringSoonForExport}`,
            ].join('   |   '),
            40, 114, { maxWidth: 760 },
          );

          autoTable(doc, {
            startY: 132,
            head: [['Contract Code', 'Title', 'Department', 'Person In Charge', 'Partner',
              'Effective Date', 'Expiry Date', 'Days Remaining', 'Status', 'Contract Value']],
            body: allContracts.map((c) => {
              const daysRemaining = calculateDaysRemaining(c.expiryDate);
              return [
                c.contractCode ?? '',
                c.title ?? '',
                c.department ?? '',
                c.personInCharge ?? '',
                c.partnerName ?? '',
                formatDate(c.effectiveDate),
                formatDate(c.expiryDate),
                { content: `${daysRemaining} days`, styles: daysRemaining < 0 ? { textColor: [220, 38, 38] } : {} },
                c.status ?? '',
                formatCurrency(c.contractValue),
              ];
            }),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81] },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { left: 40, right: 40 },
          });

          doc.save(`contract-report-${new Date().toISOString().split('T')[0]}.pdf`);
        })(),
      ]);
    } catch {
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  useEffect(() => {
    onExportCsvReady?.(handleExportCSV);
  }, [onExportCsvReady, handleExportCSV]);

  useEffect(() => {
    onExportPdfReady?.(handleExportPDF);
  }, [onExportPdfReady, handleExportPDF]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Report Filters */}
      <div className="bg-white rounded-lg shadow-sm  p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Department */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Department</label>
            <CustomSelect
              value={selectedDepartment?.toString() ?? ''}
              disabled={isSingleDepartment}
              onChange={(value) => {
                setSelectedDepartment(value === '' ? undefined : Number(value));
                goToPage(1);
              }}
              options={allowedDepartments.map((dept) => ({
                key: dept.departmentId.toString(),
                label: dept.departmentName,
              }))}
              placeholder="All Departments"
            />
          </div>

          {/* Creation Date Range */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Creation Date</label>
            <DateRangePicker
              value={createRange}
              onChange={(range) => { setCreateRange(range); goToPage(1); }}
              placeholder="Start Date – End Date"
            />
          </div>

          {/* Expiration Date Range */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Expiration Date</label>
            <DateRangePicker
              value={expireRange}
              onChange={(range) => { setExpireRange(range); goToPage(1); }}
              placeholder="Start Date – End Date"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-medium">Status</label>
            <CustomSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as StatusFilter);
                goToPage(1);
              }}
              options={STATUS_FILTER_OPTIONS.map((value) => ({
                key: value,
                label: getStatusFilterLabel(value, summary),
              }))}
              showPlaceholder={false}
            />
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white rounded-lg shadow-sm  p-6">
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">

            {/* Total Contracts */}
            <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm hover:shadow-sm     transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Total Contracts
                  </p>

                  <p className="mt-1 text-lg sm:text-xl font-semibold text-gray-900">
                    {summary.totalContracts}
                  </p>
                </div>

                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Total Value */}
            <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm hover:shadow-sm    transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Total Contract Value
                  </p>

                  <p className="mt-1 text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    {formatCurrency(summary.totalValue)}
                  </p>
                </div>

                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                </div>
              </div>
            </div>

            {/* Active */}
            <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm hover:shadow-sm    transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Active
                  </p>

                  <p className="mt-1 text-lg sm:text-xl font-semibold text-gray-900">
                    {summary.active}
                  </p>
                </div>

                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                </div>
              </div>
            </div>

            {/* Expiring Soon */}
            <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm hover:shadow-sm     transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Expiring Soon
                  </p>

                  <p className="mt-1 text-lg sm:text-xl font-semibold text-gray-900">
                    {summary.expiringSoon}
                  </p>
                </div>

                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Report Table */}
        <div
          className={[
            'overflow-x-auto',
            sortedContracts.length > 10 ? 'overflow-y-auto max-h-[70vh] lg:overflow-y-hidden' : '',
          ].join(' ').trim() || undefined}
        >
          <table className={`w-full min-w-max text-sm rounded-t-lg overflow-hidden [&_th]:px-2 [&_th]:py-5 [&_th]:whitespace-nowrap [&_td]:px-2 [&_td]:py-3.5 ${tableRowHover}`}>
            <thead className={tableTheadClass}>
              <tr>
                <SortableTableHead label="Contract ID" columnKey="id" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-fit" />
                <SortableTableHead label="Title" columnKey="title" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-40" />
                <SortableTableHead label="Department" columnKey="department" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-38" />
                <SortableTableHead label="Person In Charge" columnKey="personInCharge" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-26" />
                <SortableTableHead label="Partner" columnKey="partnerName" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-32" />
                <SortableTableHead label="Effective" columnKey="effectiveDate" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-28" />
                <SortableTableHead label="Expiry" columnKey="expiryDate" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-28" />
                <SortableTableHead label="Days Left" columnKey="daysRemaining" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-15" />
                <SortableTableHead label="Status" columnKey="status" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-fit" align="center" />
                <SortableTableHead label="Total Contract Value" columnKey="contractValue" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-fit" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {sortedContracts.length === 0 ? (
                <tr data-empty className='h-28'>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No contracts found
                  </td>
                </tr>
              ) : (
                sortedContracts.map((contract) => {
                  const daysRemaining = calculateDaysRemaining(contract.expiryDate);
                  return (
                    <tr key={contract.id} onClick={() => onSelectContract?.(contract)} className="relative transition-all hover:bg-primary cursor-pointer">
                      <td className="relative whitespace-nowrap lg:max-w-0 text-primary font-medium" title={contract.contractCode}>
                        <span className='text-primary'> {contract.contractCode}</span>
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.title}>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="whitespace-nowrap lg:truncate">{contract.title}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.department}>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="whitespace-nowrap lg:truncate">{contract.department}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.personInCharge}>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="whitespace-nowrap lg:truncate">{contract.personInCharge}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap lg:truncate lg:max-w-0" title={contract.partnerName}>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="whitespace-nowrap lg:truncate">
                            {contract.partnerName.includes(',')
                              ? `${contract.partnerName.split(',')[0].trim()}`
                              : contract.partnerName}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">{formatDate(contract.effectiveDate)}</td>
                      <td className="whitespace-nowrap">{formatDate(contract.expiryDate)}</td>
                      <td className="whitespace-nowrap">
                        <span className={`${listStatusTextClass(contract.status)}`}>
                          {daysRemaining} days
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-left">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap ${getStatusColor(contract.status)}`}
                          title={contract.status}
                        >
                          {contract.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap truncate max-w-0 text-center" title={formatCurrency(contract.contractValue)}>
                        {formatCurrency(contract.contractValue)}
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
          Showing {sortedContracts.length} of {total} contracts
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

    </div>
  );
}