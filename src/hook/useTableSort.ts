import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

type SortValue = string | number | null | undefined

function compareValues (a: SortValue, b: SortValue, direction: SortDirection): number {
  const aEmpty = a == null || a === ''
  const bEmpty = b == null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  let result = 0
  if (typeof a === 'number' && typeof b === 'number') {
    result = a - b
  } else {
    result = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
  }
  return direction === 'asc' ? result : -result
}

export function useTableSort<T> (
  items: T[],
  accessors: Record<string, (item: T) => SortValue>
) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const toggleSort = (key: string) => {
    if (!accessors[key]) return
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  const sortedItems = useMemo(() => {
    if (!sortKey || !accessors[sortKey]) return items
    const accessor = accessors[sortKey]
    return [...items].sort((a, b) => compareValues(accessor(a), accessor(b), sortDirection))
  }, [items, sortKey, sortDirection, accessors])

  return { sortKey, sortDirection, toggleSort, sortedItems }
}
