/**
 * Guest Checkout Session
 * Manages anonymous guest users for checkout without authentication.
 */

const GUEST_SESSION_KEY = 'pedi-ai-guest-session';

export interface GuestSession {
  id: string;
  isGuest: true;
}

/**
 * Generate a new guest session with a unique UUID.
 */
function getGuestSession(): GuestSession {
  return {
    id: crypto.randomUUID(),
    isGuest: true,
  };
}

/**
 * Store guest session in localStorage.
 */
function setGuestSession(session: GuestSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
}

export { getGuestSession, setGuestSession };
