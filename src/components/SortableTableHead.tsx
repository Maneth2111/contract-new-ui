import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { SortDirection } from '../hook/useTableSort'

interface SortableTableHeadProps {
  label: string
  columnKey: string
  sortKey: string | null
  sortDirection: SortDirection
  onSort: (key: string) => void
  className?: string
  align?: 'left' | 'center' | 'right'
}

export function SortableTableHead ({
  label,
  columnKey,
  sortKey,
  sortDirection,
  onSort,
  className = '',
  align = 'left',
}: SortableTableHeadProps) {
  const active = sortKey === columnKey
  const alignClass =
    align === 'center' ? 'justify-center text-center' : align === 'right' ? 'justify-end text-right' : 'justify-start text-left'

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 w-full font-medium text-gray-700 hover:text-gray-900 cursor-pointer select-none ${alignClass}`}
      >
        <span>{label}</span>
        {active ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="w-4 h-4 shrink-0 text-primary" aria-hidden />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0 text-primary" aria-hidden />
          )
        ) : (
          <ChevronsUpDown className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
        )}
      </button>
    </th>
  )
}
