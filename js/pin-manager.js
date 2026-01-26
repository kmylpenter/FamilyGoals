/**
 * PIN Manager - prosty system zabezpieczenia
 * Nie jest to bank-level security, tylko prywatność
 */
class PinManager {
  static STORAGE_KEY = 'familygoals_pin';
  static SESSION_KEY = 'familygoals_session';
  static ATTEMPTS_KEY = 'familygoals_pin_attempts';
  static LOCKOUT_KEY = 'familygoals_pin_lockout';

  // Configuration constants
  static SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minut
  static MAX_ATTEMPTS = 5;
  static LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minut lockout

  // Backwards compatibility
  static get SESSION_DURATION() { return this.SESSION_DURATION_MS; }

  /**
   * Ustaw nowy PIN
   */
  static async setPin(pin) {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new Error('PIN musi mieć 4 cyfry');
    }
    const hash = await this._hash(pin);
    localStorage.setItem(this.STORAGE_KEY, hash);
  }

  /**
   * Sprawdź czy PIN jest poprawny (z rate limiting)
   */
  static async verify(pin) {
    // Check if locked out
    if (this.isLockedOut()) {
      return { success: false, locked: true, remainingTime: this._getLockoutRemaining() };
    }

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return { success: false };

    // Support both old (base64) and new (SHA-256) hash formats
    const newHash = await this._hash(pin);
    let valid = stored === newHash;

    // Fallback for old format - migrate to new
    if (!valid && stored === this._hashSync(pin)) {
      await this.setPin(pin); // Migrate to new hash
      valid = true;
    }

    if (valid) {
      this._resetAttempts();
      return { success: true };
    } else {
      this._recordFailedAttempt();
      const attempts = this._getAttempts();
      if (attempts >= this.MAX_ATTEMPTS) {
        this._startLockout();
        return { success: false, locked: true, remainingTime: this.LOCKOUT_DURATION_MS };
      }
      return { success: false, attemptsLeft: this.MAX_ATTEMPTS - attempts };
    }
  }

  /**
   * Check if currently locked out
   */
  static isLockedOut() {
    const lockoutUntil = sessionStorage.getItem(this.LOCKOUT_KEY);
    if (!lockoutUntil) return false;
    if (Date.now() < parseInt(lockoutUntil)) return true;
    sessionStorage.removeItem(this.LOCKOUT_KEY);
    this._resetAttempts();
    return false;
  }

  static _getLockoutRemaining() {
    const lockoutUntil = sessionStorage.getItem(this.LOCKOUT_KEY);
    return lockoutUntil ? Math.max(0, parseInt(lockoutUntil) - Date.now()) : 0;
  }

  static _getAttempts() {
    return parseInt(sessionStorage.getItem(this.ATTEMPTS_KEY) || '0');
  }

  static _recordFailedAttempt() {
    const attempts = this._getAttempts() + 1;
    sessionStorage.setItem(this.ATTEMPTS_KEY, attempts.toString());
  }

  static _resetAttempts() {
    sessionStorage.removeItem(this.ATTEMPTS_KEY);
  }

  static _startLockout() {
    const lockoutUntil = Date.now() + this.LOCKOUT_DURATION_MS;
    sessionStorage.setItem(this.LOCKOUT_KEY, lockoutUntil.toString());
  }

  /**
   * Czy PIN jest ustawiony?
   */
  static isEnabled() {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  /**
   * Usuń PIN
   */
  static removePin() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.endSession();
  }

  /**
   * Rozpocznij sesję (po poprawnym PIN)
   */
  static startSession() {
    const expires = Date.now() + this.SESSION_DURATION;
    sessionStorage.setItem(this.SESSION_KEY, expires.toString());
  }

  /**
   * Zakończ sesję
   */
  static endSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Czy sesja jest aktywna?
   */
  static isSessionActive() {
    const expires = sessionStorage.getItem(this.SESSION_KEY);
    if (!expires) return false;
    if (Date.now() > parseInt(expires)) {
      this.endSession();
      return false;
    }
    return true;
  }

  /**
   * Przedłuż sesję
   */
  static extendSession() {
    if (this.isSessionActive()) {
      this.startSession();
    }
  }

  /**
   * Czy wymaga odblokowania?
   */
  static requiresUnlock() {
    if (!this.isEnabled()) return false;
    return !this.isSessionActive();
  }

  /**
   * SHA-256 hash PIN
   */
  static async _hash(pin) {
    const salt = 'familygoals_2025';
    const data = new TextEncoder().encode(pin + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Sync hash for backwards compatibility (fallback)
   */
  static _hashSync(pin) {
    const salt = 'familygoals_2025';
    return btoa(pin + salt);
  }
}

// Export dla modułów
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PinManager;
}
