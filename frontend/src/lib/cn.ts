import clsx, { type ClassValue } from 'clsx'

/** Class-name combiner (thin wrapper over clsx). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
