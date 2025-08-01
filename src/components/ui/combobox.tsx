"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { value: string; label: string; searchText?: string; status?: string }[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  searchFunction?: (option: { value: string; label: string; searchText?: string; status?: string }, searchValue: string) => boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  disabled = false,
  className,
  searchFunction,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Focus the search input when popover opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure the popover is fully rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // Function to find and focus the next focusable element
  const focusNextElement = () => {
    if (buttonRef.current) {
      const currentElement = buttonRef.current
      const focusableElements = document.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      )
      
      const currentIndex = Array.from(focusableElements).indexOf(currentElement)
      const nextElement = focusableElements[currentIndex + 1] as HTMLElement
      
      if (nextElement) {
        nextElement.focus()
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSearchValue("");
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[60vh] z-50">
        <Command shouldFilter={false} className="max-h-[60vh]">
          <CommandInput 
            ref={inputRef}
            placeholder={searchPlaceholder} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <div className="max-h-[calc(60vh-60px)] overflow-y-auto">
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options
                  .filter((option) => {
                    if (!searchValue) return true;
                    
                    // Use custom search function if provided
                    if (searchFunction) {
                      return searchFunction(option, searchValue);
                    }
                    
                    // Default search behavior - search in label and searchText
                    const searchIn = option.searchText || option.label;
                    return searchIn.toLowerCase().includes(searchValue.toLowerCase());
                  })
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(currentValue: string) => {
                        onValueChange(currentValue === value ? "" : currentValue)
                        setOpen(false)
                        // Move focus to next element after selection
                        setTimeout(() => {
                          focusNextElement()
                        }, 100)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className={cn(
                        option.status && option.status !== 'ACTIVE' ? "text-gray-400" : ""
                      )}>
                        {option.label}
                      </span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 