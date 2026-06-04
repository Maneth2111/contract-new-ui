import type { Contract as ApiContract } from '../services/contractService'
import type { Contract } from '../types/contract'
import { calculateDaysRemaining, getPrimaryPartnerName } from './contractUtils'

function mapApiStatusToUi (status: string): Contract['status'] {
  switch (status) {
    case 'ACTIVE':
      return 'Active'
    case 'OVERDUE':
      return 'Overdue'
    case 'EXPIRED':
      return 'Expired'
    case 'EXPIRING_SOON':
      return 'Expiring Soon'
    case 'CLOSED':
      return 'Closed'
    default:
      return status as Contract['status']
  }
}

export function mapApiContractToListRow (c: ApiContract): Contract {
  return {
    id: c.contractCode,
    contractId: c.contractId,
    contractCode: c.contractCode,
    title: c.contractTitle,
    department: c.department?.departmentName ?? '',
    departmentDetail: c.department,
    personInCharge: c.personInCharge,
    partnerId: String(c.partners?.[0]?.partnerId ?? ''),
    partnerName: getPrimaryPartnerName(c.partners?.[0]?.partnerName, c.partners),
    partnerContact: c.partners?.[0]?.contactPerson ?? '',
    partnerContactNumber: c.partners?.[0]?.contactNumber ?? '',
    contactPerson: c.partners?.[0]?.contactPerson,
    contactNumber: c.partners?.[0]?.contactNumber,
    expiryDate: c.expireDate,
    effectiveDate: c.effectiveDate,
    status: mapApiStatusToUi(c.status),
    contractValue: c.contractValue,
    confidential: c.confidential ?? false,
    contractType: c.contractType?.contractTypeName ?? '',
    contractTerms: c.contractTerm ?? '',
    remarks: c.remark ?? '',
    autoRenew: false,
    alertDays: c.alertDays ?? 0,
    remainingDays: c.remainingDays ?? calculateDaysRemaining(c.expireDate),
    partners: c.partners ?? [],
    alerts: (c.alerts ?? []).map((alert) => ({
      ...alert,
      daysBeforeExpiry: alert.daysBeforeExpiry ?? 0,
    })),
  }
}

export function listStatusBadgeClass (status: Contract['status']): string {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800'
    case 'Expired':
      return 'bg-gray-100 text-gray-800'
    case 'Expiring Soon':
      return 'bg-orange-100 text-orange-800'
    case 'Overdue':
      return 'bg-red-100 text-red-800'
    case 'Closed':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function listStatusTextClass (status: Contract['status']): string {
  switch (status) {
    case 'Active':
      return 'text-green-600'
    case 'Expired':
      return 'text-gray-600'
    case 'Expiring Soon':
      return 'text-yellow-600'
    case 'Overdue':
      return 'text-red-600'
    case 'Closed':
      return 'text-gray-600'
    default:
      return 'text-gray-600'
  }
}
