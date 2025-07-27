"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDateFormat } from "@/contexts/DateFormatContext"
import { formatDate, normalizeDate } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({ value, onChange, placeholder = "Select date", disabled, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const { dateFormat } = useDateFormat()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          {value ? formatDate(value, dateFormat) : placeholder}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          captionLayout="dropdown"
          onSelect={(date) => {
            // Normalize the date to avoid timezone shifts
            const normalizedDate = date ? normalizeDate(date) : undefined;
            onChange?.(normalizedDate)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
} 