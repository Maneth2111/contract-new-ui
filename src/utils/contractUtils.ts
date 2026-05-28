import type { ContractPartner } from '../types/contract'

export function pluralS(count: number) {
  return count > 1 ? 's' : ''
}


export function getPrimaryPartnerName(
  partnerName?: string | null,
  partners?: ContractPartner[] | null,
): string {
  if (partners && partners.length > 0) {
    const fromList = partners[0]?.partnerName?.trim()
    if (fromList) return fromList
  }

  const raw = (partnerName ?? '').trim()
  if (!raw || raw === 'undefined') return ''

  const [first] = raw.split(/[,;|]/)
  return (first ?? raw).trim()
}

export const calculateDaysRemaining = (expiryDate: string): number => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
