// Class-name combiner used across the design system. Thin wrapper over clsx so
// primitives can accept conditional / merged className props ergonomically.
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
