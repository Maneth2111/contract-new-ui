import React, { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract } from '../types/contract';
import { calculateDaysRemaining, formatCurrency, formatDate, getPrimaryPartnerName, pluralS } from '../utils/contractUtils';
import type { ContractReport, SummaryReport } from '../services/reportsService';
import { fetchAllContractReportPages } from '../services/reportsService';
import { FileText, Download, ChevronDown, DollarSign, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDepartments } from '../hook/useDepartment';
import { useContractReport } from '../hook/useContractReports';
import { PaginationBar } from './PaginationBar';
import { usePagination } from '../hook/usePagination';
import { DateRangePicker } from './ui/date-range-picker';
import { getAllowedDepartments } from '../utils/departmentAccess';
import { contractTableSortAccessors } from '../utils/contractTableSort';
import { useTableSort } from '../hook/useTableSort';
import { SortableTableHead } from './SortableTableHead';
import { tableRowHover, tableTheadClass } from '../utils/tableRowHover';

type StatusFilter = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' | 'OVERDUE' | 'CLOSED';

const STATUS_FILTER_OPTIONS: StatusFilter[] = ['ALL', 'ACTIVE', 'EXPIRED', 'EXPIRING_SOON', 'OVERDUE', 'CLOSED'];

function getStatusFilterLabel(filter: StatusFilter, summary: SummaryReport | null | undefined): string {
  switch (filter) {
    case 'ALL':
      return `All Contract${pluralS(summary?.totalContracts ?? 0)}`;
    case 'ACTIVE':
      return `Active Contract${pluralS(summary?.active ?? 0)}`;
    case 'EXPIRED':
      return `Expired Contract${pluralS(0)}`;
    case 'EXPIRING_SOON':
      return 'Expiring Soon (90 days)';
    case 'OVERDUE':
      return `Overdue Contract${pluralS(0)}`;
    case 'CLOSED':
      return `Closed Contract${pluralS(summary?.closed ?? 0)}`;
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface ReportDashboardProps {
  currentUser?: import('../services/userService').UserProfile | null
}

export function ReportDashboard({ currentUser }: ReportDashboardProps) {
  const [reportType] = useState('Contract Summary Report');
  const [selectedDepartment, setSelectedDepartment] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const [createRange, setCreateRange] = useState<DateRange | undefined>(undefined);
  const [expireRange, setExpireRange] = useState<DateRange | undefined>(undefined);

  const createDateFrom = createRange?.from ?? null;
  const createDateTo = createRange?.to ?? null;
  const expireDateFrom = expireRange?.from ?? null;
  const expireDateTo = expireRange?.to ?? null;
  const { departmentList } = useDepartments();
  const {
    allowedDepartments,
    isSingleDepartment,
    defaultDepartmentId,
  } = getAllowedDepartments(departmentList, currentUser?.moduleAccess);
  const [exportingPDF, setExportingPDF] = useState(false);
  const { pagination, goToPage, setSize } = usePagination(10);
  const [exportingCSV, setExportingCSV] = useState(false);

  React.useEffect(() => {
    if (isSingleDepartment && defaultDepartmentId != null) {
      setSelectedDepartment(defaultDepartmentId)
      goToPage(1)
    }
  }, [defaultDepartmentId, isSingleDepartment, goToPage])


  // Map API status
  const mapStatusToApi = (status: StatusFilter) => {
    switch (status) {
      case 'ACTIVE':
        return 'ACTIVE';
      case 'EXPIRED':
        return 'EXPIRED';
      case 'EXPIRING_SOON':
        return 'EXPIRING_SOON';
      case 'OVERDUE':
        return 'OVERDUE';
      case 'CLOSED':
        return 'CLOSED';
      default:
        return undefined;
    }
  };
  const statusMatchesFilter = (status: string, filter: StatusFilter) => {
    switch (filter) {
      case 'ACTIVE':
        return status === 'Active';
      case 'EXPIRED':
        return status === 'Expired';
      case 'EXPIRING_SOON':
        return status === 'Expiring Soon';
      case 'OVERDUE':
        return status === 'Overdue';
      case 'CLOSED':
        return status === 'Closed';
      case 'ALL':
      default:
        return true;
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

  const formatDateForApi = (date: Date | null) => date ? date.toISOString().split('T')[0] : undefined;

  const reportFilterParams = {
    status: mapStatusToApi(statusFilter),
    departmentId: selectedDepartment,
    createDateFrom: formatDateForApi(createDateFrom),
    createDateTo: formatDateForApi(createDateTo),
    expireDateFrom: formatDateForApi(expireDateFrom),
    expireDateTo: formatDateForApi(expireDateTo),
  };

  const mapReportItemToContract = (item: ContractReport): Contract => ({
    id: String(item.contractId),
    contractCode: item.contractCode,
    contractId: item.contractId,
    title: item.title,
    contractType: '',
    department: item.department,
    personInCharge: item.personInCharge,
    partnerId: '',
    partnerName: getPrimaryPartnerName(item.partner),
    partnerContact: '',
    partnerContactNumber: '',
    contractTerms: '',
    effectiveDate: item.effectiveDate,
    expiryDate: item.expiryDate,
    contractValue: item.contractValue,
    status: (
      item.status === 'ACTIVE'
        ? 'Active'
        : item.status === 'EXPIRING_SOON'
          ? 'Expiring Soon'
          : item.status === 'OVERDUE'
            ? 'Overdue'
            : item.status === 'EXPIRED'
              ? 'Expired'
              : item.status === 'CLOSED'
                ? 'Closed'
                : item.status
    ) as Contract['status'],
    confidential: false,
    autoRenew: false,
    alertDays: 0,
    remainingDays: 0,
    partners: [],
    alerts: [],
  });

  const { contracts: apiContracts, total, totalPages, summary } = useContractReport({
    page: pagination.page,
    size: pagination.size,
    ...reportFilterParams,
  });

  const fetchAllFilteredContracts = async (): Promise<Contract[]> => {
    const { items } = await fetchAllContractReportPages(reportFilterParams);
    return items
      .map(mapReportItemToContract)
      .filter((contract) => statusMatchesFilter(contract.status, statusFilter));
  };

  const contracts: Contract[] = apiContracts.map(mapReportItemToContract);

  const filteredContracts = contracts.filter(contract => {
    // Status filter
    if (!statusMatchesFilter(contract.status, statusFilter)) return false;
    return true;
  });

  const { sortKey, sortDirection, toggleSort, sortedItems: sortedContracts } = useTableSort(
    filteredContracts,
    contractTableSortAccessors
  );

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
          const rows = allContracts.map(contract => {
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
            ...rows.map(row => row.map(cell => `\"${cell}\"`).join(',')),
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
    } catch (err) {
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Report Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="font-bold text-xl text-gray-900 shrink-0">Contract Summary Report</h2>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={total === 0 || exportingCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
            >
              {exportingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportingCSV ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={total === 0 || exportingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
            >
              {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportingPDF ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Report Type</label>
            <div className="relative">
              <select
                value={reportType}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-gray-50 pr-8"
              >
                <option>Contract Summary Report</option>
              </select>
              {/* <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" /> */}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Department</label>
            <div className="relative">
              <select
                value={selectedDepartment ?? ''}
                disabled={isSingleDepartment}
                onChange={(e) => { setSelectedDepartment(e.target.value === '' ? undefined : Number(e.target.value)); goToPage(1) }}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white ${isSingleDepartment ? 'cursor-default' : 'cursor-pointer pr-8'}`}
              >
                {!isSingleDepartment && <option value="">All Departments</option>}
                {allowedDepartments.map(dept => (
                  <option key={dept.departmentId} value={dept.departmentId}>{dept.departmentName}</option>
                ))}
              </select>
              {!isSingleDepartment && (
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              )}
            </div>
          </div>

          {/* Creation Date Range Picker */}
          <div>
            <label className="block text-gray-700 mb-2">Creation Date</label>
            <DateRangePicker
              value={createRange}
              onChange={(range) => {
                setCreateRange(range);
                goToPage(1);
              }}
              placeholder="Start Date – End Date"
            />
          </div>

          {/* Expiration Date Range Picker */}
          <div>
            <label className="block text-gray-700 mb-2">Expiration Date</label>
            <DateRangePicker
              value={expireRange}
              onChange={(range) => {
                setExpireRange(range);
                goToPage(1);
              }}
              placeholder="Start Date – End Date"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Status</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); goToPage(1) }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white pr-8 cursor-pointer"
              >
                {STATUS_FILTER_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {getStatusFilterLabel(value, summary)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6 pb-6 border-b border-gray-200">

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded border border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Total Contracts</p>
                  <p className="mt-1">{summary?.totalContracts}</p>
                </div>
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Total Contract Value</p>
                  <p className="mt-1">{formatCurrency(summary?.totalValue ?? 0)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Active</p>
                  <p className="mt-1">{summary?.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Expiring Soon</p>
                  <p className="mt-1">{summary?.expiringSoon}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div
          className={[
            'overflow-x-auto lg:overflow-x-visible',
            sortedContracts.length > 10 ? 'overflow-y-auto max-h-[70vh]' : '',
          ].join(' ').trim() || undefined}
        >
          <table className={`w-full min-w-4xl lg:min-w-0 table-auto lg:table-fixed text-sm [&_th]:px-2 [&_th]:py-5 [&_th]:whitespace-nowrap [&_td]:px-2 [&_td]:py-2 ${tableRowHover}`}>
            <thead className={tableTheadClass}>
              <tr>
                <SortableTableHead label="Contract ID" columnKey="id" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="lg:w-[9%]" />
                <SortableTableHead label="Title" columnKey="title" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="lg:w-[14%]" />
                <SortableTableHead label="Department" columnKey="department" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="w-40 min-w-40 max-w-40 whitespace-nowrap" />
                <SortableTableHead label="In Charge" columnKey="personInCharge" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="lg:w-[9%]" />
                <SortableTableHead label="Partner" columnKey="partnerName" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="lg:w-[13%]" />
                <SortableTableHead label="Effective" columnKey="effectiveDate" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="lg:w-[8%]" />
                <SortableTableHead label="Expiry" columnKey="expiryDate" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="lg:w-[8%]" />
                <SortableTableHead label="Days Left" columnKey="daysRemaining" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="lg:w-[7%]" />
                <SortableTableHead label="Status" columnKey="status" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="lg:w-[9%]" align="center" />
                <SortableTableHead label="Total Contract Value" columnKey="contractValue" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="lg:w-[12%] lg:max-w-0" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedContracts.length === 0 ? (
                <tr data-empty>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No contracts found
                  </td>
                </tr>
              ) : (
                sortedContracts.map(contract => {
                  const daysRemaining = calculateDaysRemaining(contract.expiryDate);
                  return (
                    <tr key={contract.id}>
                      <td className="lg:max-w-0" title={contract.contractCode}>{contract.contractCode}</td>
                      <td className="wrap-break-word whitespace-normal!  lg:max-w-0" title={contract.title}>{contract.title}</td>
                      <td className="w-40 min-w-40 max-w-40 whitespace-nowrap truncate" title={contract.department}>{contract.department}</td>
                      <td className="wrap-break-word whitespace-normal!  lg:max-w-0" title={contract.personInCharge}>{contract.personInCharge}</td>
                      <td className="wrap-break-word whitespace-normal!  lg:max-w-0" title={contract.partnerName}>{contract.partnerName}</td>
                      <td className="whitespace-nowrap">{formatDate(contract.effectiveDate)}</td>
                      <td className="whitespace-nowrap">{formatDate(contract.expiryDate)}</td>
                      <td className="whitespace-nowrap">
                        <span className={daysRemaining < 0 ? 'text-red-600' : ''}>
                          {daysRemaining} days
                        </span>
                      </td>
                      <td className="text-left align-middle whitespace-nowrap lg:max-w-0">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap ${getStatusColor(contract.status)}`}
                          title={contract.status}
                        >
                          {contract.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-center lg:truncate lg:max-w-0" title={formatCurrency(contract.contractValue)}>
                        {formatCurrency(contract.contractValue)}
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
          {total > 10  && (
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
  );
}