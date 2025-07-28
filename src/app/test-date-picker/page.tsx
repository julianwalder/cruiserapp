"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DatePicker } from "@/components/ui/date-picker"

export default function TestDatePickerPage() {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(undefined)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-8">Date Picker Test</h1>
        
        <div className="space-y-8">
          {/* Official shadcn/ui Date Picker */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Official shadcn/ui Date Picker</h2>
            <div className="flex flex-col gap-3">
              <Label htmlFor="date" className="px-1">
                Date of birth
              </Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="date"
                    className="w-48 justify-between font-normal"
                  >
                    {date ? date.toLocaleDateString() : "Select date"}
                    <ChevronDownIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setDate(date)
                      setOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Custom DatePicker Component */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Custom DatePicker Component</h2>
            <div className="flex flex-col gap-3">
              <Label htmlFor="custom-date" className="px-1">
                Date of birth (Custom)
              </Label>
              <div className="w-48">
                <DatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="Select date"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 