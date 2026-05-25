import type { ContractFormValues } from '../lib/contractSchema'
import type { ContractAlertPayload, ContractPartnerPayload } from '../services/contractService'
import type { ContractType } from '../services/contractTypeService'
import type { Department } from '../services/departmentService'

export const CONTRACT_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const MAX_CONTRACT_FILE_BYTES = 10 * 1024 * 1024
export const MAX_CONTRACT_FILES_TOTAL_BYTES = 50 * 1024 * 1024

export function isPdfFileName (fileName: string): boolean {
  return /\.pdf$/i.test(fileName)
}

export function isPdfAttachment (file: File): boolean {
  if (file.type === 'application/pdf') return true
  return isPdfFileName(file.name)
}

function parseDateOnly (dateStr: string): Date | null {
  const part = dateStr.split('T')[0]
  const [y, m, d] = part.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// Full calendar months between effective and expiry (15 days => 0, not 1)
export function calculateRenewalFrequencyMonths (
  effectiveDate: string,
  expiryDate: string
): number {
  const start = parseDateOnly(effectiveDate)
  const end = parseDateOnly(expiryDate)
  if (!start || !end || end <= start) return 0

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())

  if (end.getDate() < start.getDate()) {
    months -= 1
  }

  return Math.max(0, months)
}

// Days between expiry date and a manual/auto alert date 
export function calcAutoAlertDaysFromExpiryAndAlert (
  expireDate: string,
  alertDate: string
): string {
  if (!expireDate || !alertDate) return '0'
  const expire = new Date(expireDate)
  const alert = new Date(alertDate)
  const diffMs = expire.getTime() - alert.getTime()
  return String(Math.round(diffMs / (1000 * 60 * 60 * 24)))
}

export function formatAttachmentFileSize (bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export function validateContractFile(file: File): string | null {
  if (!CONTRACT_ATTACHMENT_ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return `File "${file.name}" is not a supported format. Only PDF, DOC, and DOCX are allowed.`;
  }
  if (file.size > MAX_CONTRACT_FILE_BYTES) {
    return `File "${file.name}" exceeds the 10MB limit.`;
  }
  return null; 
}

export function sanitizeContractValueInput (raw: string): string {
  const noCommas = raw.replace(/,/g, '')
  let out = ''
  let sawDot = false
  for (let i = 0; i < noCommas.length; i++) {
    const ch = noCommas[i]
    if (ch >= '0' && ch <= '9') out += ch
    else if (ch === '.' && !sawDot) {
      sawDot = true
      out += '.'
    }
  }
  return out
}

//Thousands separators every 3 digits 
export function formatContractValueThousands (stored: string): string {
  if (!stored) return ''
  const hasDot = stored.includes('.')
  const parts = stored.split('.')
  const decCombined = parts.length > 1 ? parts.slice(1).join('') : ''
  const intDigits = (parts[0] ?? '').replace(/\D/g, '')
  const intFmt = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (!hasDot) return intFmt
  const decDigits = decCombined.replace(/\D/g, '')
  if (decDigits.length > 0) return `${intFmt || '0'}.${decDigits}`
  return `${intFmt}.`
}

export function buildContractAlertsPayload (data: ContractFormValues): ContractAlertPayload[] {
  const alerts: ContractAlertPayload[] = []
  if (data.autoAlertDays && Number(data.autoAlertDays) > 0) {
    alerts.push({
      alertType: 'AUTO_ALERT',
      daysBeforeExpiry: Number(data.autoAlertDays),
    })
  }
  for (const alertDate of (data.manualAlertDates ?? []).filter((d) => d.value)) {
    alerts.push({
      alertType: 'MANUAL_ALERT',
      alertDate: alertDate.value,
    })
  }
  return alerts
}

export function buildContractPartnersPayload (data: ContractFormValues): ContractPartnerPayload[] {
  return data.partners
    .filter((p) => p.partnerName)
    .map((p) => ({
      partnerId: p.partnerId ?? null,
      partnerName: p.partnerName,
      contactPerson: p.contactPerson ?? '',
      contactNumber: p.contactNumber ?? '',
    }))
}

export function resolveDepartmentAndContractType (
  departmentList: Department[],
  contractTypeList: ContractType[],
  departmentName: string,
  contractTypeName: string,
): { department: Department; contractType: ContractType } | null {
  const department = departmentList.find((d) => d.departmentName === departmentName)
  if (!department) return null

  const contractType = contractTypeList.find(
    (ct) =>
      ct.contractTypeName === contractTypeName &&
      ct.departmentId === department.departmentId,
  )
  if (!contractType) return null

  return { department, contractType }
}

export function formatContractApiError (error: unknown, fallback: string): string {
  const err = error as { response?: { data?: Record<string, unknown> } }
  const data = err?.response?.data
  if (!data) return fallback
  const errorsField = data.errors
  if (errorsField && typeof errorsField === 'object') {
    return Object.values(errorsField as Record<string, unknown>).join(', ')
  }
  const msg =
    (errorsField as string | undefined) ??
    (data.detail as string | undefined) ??
    (data.message as string | undefined) ??
    (data.title as string | undefined)
  return msg ?? fallback
}
