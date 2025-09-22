import React from "react";
import { cn } from "@/lib/utils";

// TimeInput component for HH:MM format
interface TimeInputProps {
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  className?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

export function TimeInput({ value, onChange, name, className, onBlur, ...props }: TimeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle input change with basic validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove any non-digit characters except colon
    inputValue = inputValue.replace(/[^\d:]/g, '');
    
    // Auto-add colon after 2 digits
    if (inputValue.length === 2 && !inputValue.includes(':')) {
      inputValue = inputValue + ':';
    }
    
    // Limit to HH:MM format
    if (inputValue.length > 5) {
      inputValue = inputValue.substring(0, 5);
    }
    
    // Validate hours (00-23)
    if (inputValue.length >= 2) {
      const hours = parseInt(inputValue.substring(0, 2));
      if (hours > 23) {
        inputValue = '23' + inputValue.substring(2);
      }
    }
    
    // Validate minutes (00-59)
    if (inputValue.length >= 5) {
      const minutes = parseInt(inputValue.substring(3, 5));
      if (minutes > 59) {
        inputValue = inputValue.substring(0, 3) + '59';
      }
    }
    
    // Update the input value
    e.target.value = inputValue;
    
    // Call the original onChange
    onChange(e);
  };

  // Handle focus to position cursor at beginning
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Position cursor at the beginning of the input
    e.target.setSelectionRange(0, 0);
    
    // Call the original onFocus if provided
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      name={name}
      value={value || ''}
      placeholder="HH:MM (UTC)"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center",
        className
      )}
      style={{
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: '14px',
        letterSpacing: '1px'
      }}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={onBlur}
      maxLength={5}
      {...props}
    />
  );
}

// HobbsInput component for decimal numbers
interface HobbsInputProps {
  value?: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  className?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

export function HobbsInput({ value, onChange, name, className, onBlur, ...props }: HobbsInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Allow normal number input but limit to one decimal place
    if (inputValue.includes('.')) {
      const parts = inputValue.split('.');
      if (parts[1] && parts[1].length > 1) {
        // Limit to one decimal place
        inputValue = parts[0] + '.' + parts[1].substring(0, 1);
      }
    }
    
    // Update the input value
    e.target.value = inputValue;
    
    // Call the original onChange
    onChange(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Format to one decimal place on blur
    if (inputValue && !isNaN(parseFloat(inputValue))) {
      const numValue = parseFloat(inputValue);
      if (numValue >= 0) {
        const formattedValue = numValue.toFixed(1);
        e.target.value = formattedValue;
        
        // Create a new event with the formatted value
        const newEvent = {
          ...e,
          target: { ...e.target, value: formattedValue }
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(newEvent);
      }
    }
    
    // Call the original onBlur if provided
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <input
      type="number"
      name={name}
      value={value || ''}
      step="0.1"
      min="0"
      placeholder="0.0"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center",
        className
      )}
      style={{
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: '14px'
      }}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}
