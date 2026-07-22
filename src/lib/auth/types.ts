// Shared auth types. Kept out of the 'use server' module so they can be imported by
// client components (a 'use server' file may only export async functions).
export interface AuthState {
  error?: string;
  check?: boolean;
}
