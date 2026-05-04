/**
 * Shared-password gate. The password is stored in localStorage after a
 * successful check so reloads don't re-prompt.
 *
 * This is "social-access" security — the password keeps casual visitors out.
 * Real confidentiality depends on the repo being private.
 */

const STORAGE_KEY = 'family-password'

export function getPassword(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setPassword(pw: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, pw)
  } catch {
    // ignore
  }
}

export function clearPassword(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
