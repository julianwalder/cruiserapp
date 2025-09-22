import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes text by removing diacritics and converting to lowercase
 * This allows for diacritic-insensitive search
 * @param text - The text to normalize
 * @returns Normalized text without diacritics
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD') // Decompose characters into base + combining characters
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .toLowerCase()
    .trim()
}

/**
 * Performs intelligent search matching that prioritizes word boundaries and beginnings
 * @param searchText - The text to search in
 * @param searchValue - The value to search for
 * @returns True if the search value matches intelligently
 */
export function intelligentSearch(searchText: string, searchValue: string): boolean {
  const normalizedSearch = normalizeText(searchValue);
  const normalizedText = normalizeText(searchText);
  
  // If search is empty, return true (show all)
  if (!normalizedSearch) return true;
  
  // Split search text into words
  const words = normalizedText.split(/\s+/);
  
  // Check for exact matches first (highest priority)
  if (normalizedText === normalizedSearch) return true;
  
  // Check if any word starts with the search term (high priority)
  if (words.some(word => word.startsWith(normalizedSearch))) return true;
  
  // Check if any word contains the search term (medium priority)
  if (words.some(word => word.includes(normalizedSearch))) return true;
  
  // Check if the search term appears anywhere in the text (lowest priority)
  return normalizedText.includes(normalizedSearch);
}
