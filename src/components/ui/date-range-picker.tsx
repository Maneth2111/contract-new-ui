import * as React from 'react'
import type { DateRange } from 'react-day-picker'
import {
  addMonths,
  format,
  setMonth,
  setYear,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isWithinInterval,
  subMonths,
} from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from './utils'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (dateRange: DateRange | undefined) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
  isDisabled?: boolean
}

export const DateRangePicker = React.forwardRef<HTMLDivElement,DateRangePickerProps>(({
      value,
      onChange,
      placeholder = 'Pick a date range',
      disabled,
      className,
      isDisabled = false,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false)
    const [tempRange, setTempRange] = React.useState<DateRange | undefined>(value)
    const [displayMonth, setDisplayMonth] = React.useState<Date>(
      value?.from || new Date(),
    )
    const [showMonthSelector, setShowMonthSelector] = React.useState(false)

    React.useEffect(() => {
      setTempRange(value)
    }, [value])

    const formatDateRange = React.useCallback(() => {
      if (!value?.from) return placeholder

      if (!value.to) {
        return format(value.from, 'MM/dd/yyyy')
      }

      if (value.from.getTime() === value.to.getTime()) {
        return format(value.from, 'MM/dd/yyyy')
      }

      return `${format(value.from, 'MM/dd/yyyy')} - ${format(value.to, 'MM/dd/yyyy')}`
    }, [value, placeholder])

    const handleApply = () => {
      onChange?.(tempRange)
      setOpen(false)
    }

    const handleClear = () => {
      setTempRange(undefined)
      onChange?.(undefined)
      setOpen(false)
    }

    const currentMonth = displayMonth.getMonth()
    const currentYear = displayMonth.getFullYear()

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthsFull = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]

    const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i)

    const monthStart = startOfMonth(displayMonth)
    const monthEnd = endOfMonth(displayMonth)

    const startDate = monthStart.getDay() === 0
      ? new Date(monthStart.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(monthStart.getTime() - monthStart.getDay() * 24 * 60 * 60 * 1000)
    const endDate = new Date(monthEnd.getTime() + (6 - monthEnd.getDay()) * 24 * 60 * 60 * 1000)
    const allDays = eachDayOfInterval({ start: startDate, end: endDate })

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

    const isDateInRange = (date: Date) => {
      if (!tempRange?.from || !tempRange?.to) return false
      return isWithinInterval(date, { start: tempRange.from, end: tempRange.to })
    }

    const isDateStart = (date: Date) => {
      if (!tempRange?.from) return false
      return date.toDateString() === tempRange.from.toDateString()
    }

    const isDateEnd = (date: Date) => {
      if (!tempRange?.to) return false
      return date.toDateString() === tempRange.to.toDateString()
    }

    const goPrevMonth = () => setDisplayMonth((d) => subMonths(d, 1))
    const goNextMonth = () => setDisplayMonth((d) => addMonths(d, 1))

    return (
      <div ref={ref} className={cn('w-full', className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm',
                'text-gray-900 transition-colors ',
                !value?.from && 'text-gray-500',
                isDisabled && 'pointer-events-none opacity-50',
              )}
              disabled={isDisabled}
            >
              <CalendarIcon className="h-4 w-4 shrink-0 text-primary cursor-pointer" />
              <span className="min-w-0 flex-1 truncate">{formatDateRange()}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-65 p-0" align="start">
            <div className="w-65 space-y-0">
              <div className="flex items-center gap-1 border-b border-gray-100 px-1.5 py-1.5">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4 cursor-pointer" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowMonthSelector(!showMonthSelector)}
                  className="min-w-0 flex-1 flex items-center justify-center rounded-md px-1 py-1.5 text-center text-xs font-semibold text-gray-900 hover:bg-gray-50 cursor-pointer"
                >
                  <span className="block truncate">
                    {monthsFull[currentMonth]} {currentYear}
                  </span>
                  <span className="text-[10px] mt-0.5 ml-0.5 text-gray-400">▾</span>
                </button>
                <button
                  type="button"
                  onClick={goNextMonth}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4 cursor-pointer" />
                </button>
              </div>

              {showMonthSelector && (
                <div className="space-y-2 border-b border-gray-100 bg-gray-50 p-2.5">
                  <div className="max-h-28 space-y-0.5 overflow-y-auto rounded border border-gray-200 bg-white p-1.5">
                    {years.map((year) => (
                      <button
                        type="button"
                        key={year}
                        onClick={() => {
                          setDisplayMonth(setYear(displayMonth, year))
                        }}
                        className={cn(
                          'w-full rounded px-2 py-1 text-left text-xs cursor-pointer',
                          year === currentYear
                            ? 'bg-primary/5 font-semibold text-brand-navy'
                            : 'text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-0.5">
                    {months.map((month, idx) => (
                      <button
                        type="button"
                        key={month}
                        onClick={() => {
                          setDisplayMonth(setMonth(displayMonth, idx))
                          setShowMonthSelector(false)
                        }}
                        className={cn(
                          'rounded px-1 py-1.5 text-[10px] font-medium transition-colors cursor-pointer',
                          idx === currentMonth
                            ? 'bg-primary text-white'
                            : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!showMonthSelector && (
                <div className="space-y-2 p-2.5">
                  <div className="grid grid-cols-7 gap-0.5 text-center">
                    {weekDays.map((day) => (
                      <div key={day} className="py-0.5 text-[10px] font-semibold text-gray-500">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5">
                    {allDays.map((date, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          if (!tempRange?.from) {
                            setTempRange({ from: date, to: undefined })
                          } else if (!tempRange?.to) {
                            if (date < tempRange.from) {
                              setTempRange({ from: date, to: tempRange.from })
                            } else {
                              setTempRange({ from: tempRange.from, to: date })
                            }
                          } else {
                            setTempRange({ from: date, to: undefined })
                          }
                        }}
                        disabled={disabled?.(date)}
                        className={cn(
                          'h-7 w-7 rounded text-[11px] transition-colors cursor-pointer',
                          !isSameMonth(date, displayMonth)
                            ? 'text-gray-300'
                            : 'text-gray-900',
                          isDateStart(date) || isDateEnd(date)
                            ? 'bg-primary font-semibold text-white'
                            : isDateInRange(date)
                              ? 'bg-primary/10 text-brand-navy'
                              : 'hover:bg-gray-100',
                          isToday(date) && !isDateStart(date) && !isDateEnd(date)
                            ? 'border border-primary/60'
                            : '',
                          disabled?.(date) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                        )}
                      >
                        {date.getDate()}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 border-t border-gray-100 p-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClear}
                      className="h-8 flex-1 border-gray-300 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      onClick={handleApply}
                      className="h-8 flex-1 bg-primary text-xs text-white hover:bg-primary/90 cursor-pointer"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  },
)

DateRangePicker.displayName = 'DateRangePicker'
