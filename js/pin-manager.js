/**
 * PIN Manager - prosty system zabezpieczenia
 * Nie jest to bank-level security, tylko prywatność
 */
class PinManager {
  static STORAGE_KEY = 'familygoals_pin';
  static SESSION_KEY = 'familygoals_session';
  static SESSION_DURATION = 30 * 60 * 1000; // 30 minut

  /**
   * Ustaw nowy PIN
   */
  static setPin(pin) {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new Error('PIN musi mieć 4 cyfry');
    }
    const hash = this._hash(pin);
    localStorage.setItem(this.STORAGE_KEY, hash);
  }

  /**
   * Sprawdź czy PIN jest poprawny
   */
  static verify(pin) {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return false;
    return stored === this._hash(pin);
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
   * Prosty hash (nie kryptograficzny)
   */
  static _hash(pin) {
    const salt = 'familygoals_2025';
    return btoa(pin + salt);
  }
}

// Export dla modułów
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PinManager;
}
