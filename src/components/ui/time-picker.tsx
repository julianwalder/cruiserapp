"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  step?: number
}

export function TimePicker({ 
  value, 
  onChange, 
  placeholder = "Select time", 
  disabled,
  step = 60 
}: TimePickerProps) {
  return (
    <Input
      type="time"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      step={step}
              className="bg-white dark:bg-gray-900 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
    />
  )
} 