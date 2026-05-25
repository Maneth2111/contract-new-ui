import type { ContractFormValues } from '../lib/contractSchema'
import type { Contract as ApiContract } from '../services/contractService'
import { calcAutoAlertDaysFromExpiryAndAlert } from './contractFormHelpers'

//Maps contracts by ID into ContractForm default values for edit
export function mapContractDetailToEditFormValues (
  contract: ApiContract
): Partial<ContractFormValues> {
  const autoAlert = contract.alerts?.find((a) => a.alertType === 'AUTO_ALERT')
  const manualAlerts = contract.alerts?.filter((a) => a.alertType === 'MANUAL_ALERT') ?? []

  return {
    title: contract.contractTitle,
    contractType: contract.contractType?.contractTypeName ?? '',
    department: contract.department?.departmentName ?? '',
    personInCharge: contract.personInCharge,
    status: contract.status,
    contractTerms: contract.contractTerm,
    effectiveDate: contract.effectiveDate,
    expiryDate: contract.expireDate,
    contractValue: contract.contractValue.toString(),
    autoAlertDays: autoAlert
      ? calcAutoAlertDaysFromExpiryAndAlert(contract.expireDate, autoAlert.alertDate ?? '')
      : '',
    confidential: contract.confidential ?? false,
    remarks: contract.remark ?? '',
    partners: contract.partners?.length
      ? contract.partners.map((p) => ({
        partnerId: p.partnerId ?? null,
        partnerName: p.partnerName,
        contactPerson: p.contactPerson,
        contactNumber: p.contactNumber,
      }))
      : [{ partnerName: '', contactPerson: '', contactNumber: '' }],
    manualAlertDates: manualAlerts.length
      ? manualAlerts.map((a) => ({ value: a.alertDate ?? '' }))
      : [{ value: '' }],
  }
}

// Maps contract detail, clears effective/expiry 
export function mapContractDetailToRenewFormValues (
  contract: ApiContract
): Partial<ContractFormValues> {
  const autoAlert = contract.alerts?.find((a) => a.alertType === 'AUTO_ALERT')
  const manualAlerts = contract.alerts?.filter((a) => a.alertType === 'MANUAL_ALERT') ?? []

  return {
    title: contract.contractTitle,
    contractType: contract.contractType?.contractTypeName ?? '',
    department: contract.department?.departmentName ?? '',
    personInCharge: contract.personInCharge,
    status: contract.status || 'ACTIVE',
    contractTerms: contract.contractTerm,
    effectiveDate: '',
    expiryDate: '',
    contractValue: contract.contractValue != null ? String(contract.contractValue) : '',
    autoAlertDays: autoAlert
      ? calcAutoAlertDaysFromExpiryAndAlert(contract.expireDate, autoAlert.alertDate ?? '')
      : '15',
    confidential: contract.confidential ?? false,
    remarks: contract.remark ?? '',
    partners: contract.partners?.length
      ? contract.partners.map((p) => ({
        partnerId: p.partnerId ?? null,
        partnerName: p.partnerName,
        contactPerson: p.contactPerson,
        contactNumber: p.contactNumber,
      }))
      : [{ partnerName: '', contactPerson: '', contactNumber: '' }],
    manualAlertDates: manualAlerts.length
      ? manualAlerts.map((a) => ({ value: a.alertDate ?? '' }))
      : [{ value: '' }],
  }
}
