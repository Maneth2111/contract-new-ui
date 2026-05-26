import { useNotifications } from '../hook/useNotification';
import { calculateDaysRemaining, formatDate, pluralS } from '../utils/contractUtils';
import { AlertTriangle, Clock, Bell } from 'lucide-react';
import { PaginationBar } from './PaginationBar';

interface NotificationCenterProps {
  onSelectContract: (contractId: number) => void;
  isLoggedIn?: boolean;
}

export function NotificationCenter({ onSelectContract, isLoggedIn }: NotificationCenterProps) {
  const { data, overduePage, setOverduePage, expireSoonPage, setExpireSoonPage } = useNotifications(isLoggedIn);

  const overdueContracts = data?.overdueContracts.items ?? [];
  const expiringSoonContracts = (data?.expireSoonContracts.items ?? []).filter(
    (c) => c.status !== 'OVERDUE' && (c.daysRemaining ?? 0) >= 0
  );
  const summary = data?.summary;
  const overdueTotalPages = data?.overdueContracts.paginationResponse.totalPages ?? 0;
  const expireSoonTotalPages = data?.expireSoonContracts.paginationResponse.totalPages ?? 0;
  const overdueCount = summary?.overdue ?? 0;

  const getWarningCategory = (
    alertType: string,
    daysRemaining?: number
  ): { label: string; color: string } => {
    const normalized = alertType?.toUpperCase().replace(/[\s-]/g, '_') ?? ''

    if (
      normalized === 'OVERDUE_ALERT' ||
      normalized === 'OVERDUE' ||
      (daysRemaining !== undefined && daysRemaining < 0)
    ) {
      return { label: 'Overdue', color: 'text-red-600 bg-red-50 border-red-200' }
    }

    const is30 =
      normalized === '30DAYS' ||
      normalized === 'EXPIRE_30' ||
      normalized.endsWith('_30')
    const is60 =
      normalized === '60DAYS' ||
      normalized === 'EXPIRE_60' ||
      normalized.endsWith('_60')
    const is90 =
      normalized === '90DAYS' ||
      normalized === 'EXPIRE_90' ||
      normalized.endsWith('_90')

    if (is30 || (daysRemaining !== undefined && daysRemaining >= 0 && daysRemaining <= 30)) {
      return { label: '30 days warning', color: 'text-red-600 bg-red-50 border-red-200' }
    }
    if (is60 || (daysRemaining !== undefined && daysRemaining >= 0 && daysRemaining <= 60)) {
      return { label: '60 days warning', color: 'text-orange-600 bg-orange-50 border-orange-200' }
    }
    if (is90 || (daysRemaining !== undefined && daysRemaining >= 0 && daysRemaining <= 90)) {
      return { label: '90 days warning', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
    }
    return { label: 'Normal', color: 'text-gray-600 bg-gray-50 border-gray-200' }
  }

  return (
    <div className="space-y-6">
      {/* Overdue Contracts */}
      {overdueContracts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-red-50 border-b border-red-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-red-900">
                Overdue Contract{pluralS(overdueContracts.length)} ({overdueContracts.length})
              </h3>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {overdueContracts.map((contract, index) => {
              const daysOverdue = Math.abs(calculateDaysRemaining(contract.expireDate));
              return (
                <div key={`overdue-${contract.contractId}-${index}`} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                          {contract.contractCode}
                        </span>
                        <h4 className="text-red-900">{contract.contractTitle}</h4>
                        <span className="px-3 py-1 rounded-full border text-sm text-red-600 bg-red-50 border-red-200">
                          Overdue
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm text-gray-600">
                        <div>
                          <span className="block">Department</span>
                          <span className="text-gray-900">{contract.departmentName}</span>
                        </div>
                        <div>
                          <span className="block">Person In Charge</span>
                          <span className="text-gray-900">{contract.personInCharge}</span>
                        </div>
                        <div>
                          <span className="block">Partner</span>
                          <span className="text-gray-900">{contract.partners[0]?.partnerName}</span>
                        </div>
                        <div>
                          <span className="block">Expired On</span>
                          <span className="text-red-600">{formatDate(contract.expireDate)}</span>
                        </div>
                        <div>
                          <span className="block">Days Overdue</span>
                          <span className="text-red-600">{daysOverdue} days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="border-t border-gray-200 flex justify-center sm:justify-end">
        <PaginationBar
          currentPage={overduePage}
          totalPages={overdueTotalPages}
          onPageChange={setOverduePage}
        />
      </div>

      {/* Expiring Soon Contracts */}
      {expiringSoonContracts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-orange-50 border-b border-orange-200 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-orange-600" />
              <h3 className="text-orange-900">
                Expiring Soon Contract{pluralS(expiringSoonContracts.length)} ({expiringSoonContracts.length})
              </h3>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {expiringSoonContracts.map((contract, index) => {
              const daysRemaining = calculateDaysRemaining(contract.expireDate);
              const warning = getWarningCategory(
                contract.alertType,
                contract.daysRemaining ?? daysRemaining
              );
              return (
                <div key={`expire-${contract.contractId}-${index}`} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          {contract.contractCode}
                        </span>
                        <h4 className="text-sm sm:text-base">{contract.contractTitle}</h4>
                        <span className={`px-3 py-1 rounded-full border text-sm ${warning.color}`}>
                          {warning.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm text-gray-600">
                        <div>
                          <span className="block">Department</span>
                          <span className="text-gray-900">{contract.departmentName}</span>
                        </div>
                        <div>
                          <span className="block">Person In Charge</span>
                          <span className="text-gray-900">{contract.personInCharge}</span>
                        </div>
                        <div>
                          <span className="block">Partner</span>
                          <span className="text-gray-900">{contract.partners[0]?.partnerName}</span>
                        </div>
                        <div>
                          <span className="block">Expiry Date</span>
                          <span className="text-orange-600">{formatDate(contract.expireDate)}</span>
                        </div>
                        <div>
                          <span className="block">Days Remaining</span>
                          <span className={warning.color.split(' ')[0]}>{daysRemaining} days</span>
                        </div>
                      </div>
                    </div>
                    {/* <button
                      onClick={() => onSelectContract(contract.contractId)}
                      className="w-full sm:w-auto sm:ml-4 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer whitespace-nowrap text-center"
                    >
                      Review Contract
                    </button> */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="border-t border-gray-200 flex justify-center sm:justify-end">
        <PaginationBar
          currentPage={expireSoonPage}
          totalPages={expireSoonTotalPages}
          onPageChange={setExpireSoonPage}
        />
      </div>

      {/* No Alerts */}
      {overdueContracts.length === 0 && expiringSoonContracts.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-green-900 mb-2">All Clear!</h3>
          <p className="text-green-700">No overdue or expiring contracts at this time.</p>
        </div>
      )}
    </div>
  );
}
