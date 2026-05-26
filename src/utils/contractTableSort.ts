import type { Contract } from '../types/contract'
import { calculateDaysRemaining } from './contractUtils'

export const contractTableSortAccessors: Record<string, (c: Contract) => string | number> = {
  id: (c) => c.contractCode || c.id,
  title: (c) => c.title,
  department: (c) => c.department,
  personInCharge: (c) => c.personInCharge,
  partnerName: (c) => c.partnerName,
  effectiveDate: (c) => c.effectiveDate,
  expiryDate: (c) => c.expiryDate,
  daysRemaining: (c) => calculateDaysRemaining(c.expiryDate),
  status: (c) => c.status,
  contractValue: (c) => c.contractValue,
}
