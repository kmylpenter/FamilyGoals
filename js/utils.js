/**
 * FamilyGoals - Shared Utilities
 * Consolidates duplicated code across modules
 */

// ============================================
// CONSTANTS
// ============================================

const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

const MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
                      'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

// Category configuration (D5)
const CATEGORY_CONFIG = {
  housing: { icon: '🏠', name: 'Mieszkanie', color: '#4A90A4' },
  food: { icon: '🍽️', name: 'Jedzenie', color: '#7CB342' },
  transport: { icon: '🚗', name: 'Transport', color: '#FF7043' },
  children: { icon: '👶', name: 'Dzieci', color: '#AB47BC' },
  health: { icon: '❤️', name: 'Zdrowie', color: '#EF5350' },
  entertainment: { icon: '🎬', name: 'Rozrywka', color: '#5C6BC0' },
  clothing: { icon: '👕', name: 'Ubrania', color: '#26A69A' },
  education: { icon: '📚', name: 'Edukacja', color: '#42A5F5' },
  savings: { icon: '💰', name: 'Oszczędności', color: '#66BB6A' },
  other: { icon: '📦', name: 'Inne', color: '#78909C' }
};

// Achievement category names (D10)
const ACHIEVEMENT_CATEGORY_NAMES = {
  start: '🌟 Pierwsze kroki',
  savings: '💰 Oszczędności',
  consistency: '📈 Systematyczność',
  goals: '🎯 Cele',
  income: '💵 Przychody',
  couple: '💑 Para',
  coop: '🤝 Współpraca',
  streak: '🔥 Streak',
  level: '📊 Poziomy',
  special: '🎉 Specjalne',
  expert: '🏆 Ekspert',
  tracking: 'Śledzenie wydatków',
  family: 'Rodzina'
};

// ============================================
// FORMATTING FUNCTIONS (D1)
// ============================================

/**
 * Format number as Polish currency
 * @param {number} n - Amount to format
 * @returns {string} Formatted string like "1 234 zł"
 */
function formatMoney(n) {
  return (n || 0).toLocaleString('pl-PL') + ' zł';
}

/**
 * Format number as Polish currency with Intl
 * @param {number} amount - Amount to format
 * @returns {string} Formatted string
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('PLN', 'zł');
}

/**
 * Format date as month name + year
 * @param {Date} date - Date to format
 * @returns {string} Formatted string like "Styczeń 2026"
 */
function formatMonth(date) {
  return MONTHS[date.getMonth()] + ' ' + date.getFullYear();
}

/**
 * Format date as short month + year
 * @param {Date} date - Date to format
 * @returns {string} Formatted string like "sty 2026"
 */
function formatMonthShort(date) {
  return MONTHS_SHORT[date.getMonth()] + ' ' + date.getFullYear();
}

// ============================================
// DATE HELPERS (D8, D11, D18)
// ============================================

/**
 * Get current year-month string
 * @returns {string} Format "YYYY-MM"
 */
function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get date string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} ISO date string
 */
function getDateString(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate days between two dates
 * @param {string} date1Str - Start date string
 * @param {string} date2Str - End date string
 * @returns {number} Number of days
 */
function daysBetween(date1Str, date2Str) {
  if (!date1Str || !date2Str) return 0;
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.floor((d2 - d1) / 86400000);
}

/**
 * Calculate days since a date
 * @param {string} dateStr - Date string
 * @returns {number} Days since that date
 */
function daysSince(dateStr) {
  if (!dateStr) return 999;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return 999;
  const now = new Date();
  return Math.floor((now - then) / 86400000);
}

/**
 * Check if date is in given month
 * @param {string} dateStr - Date string
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @returns {boolean}
 */
function isInMonth(dateStr, year, month) {
  const date = new Date(dateStr);
  return date.getFullYear() === year && date.getMonth() === month;
}

/**
 * Check if date is this month
 * @param {string} dateStr - Date string
 * @returns {boolean}
 */
function isThisMonth(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getMonth() === now.getMonth() &&
         date.getFullYear() === now.getFullYear();
}

/**
 * Filter array by month
 * @param {Array} array - Array of objects with date field
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @param {string} dateField - Name of date field (default: 'date')
 * @returns {Array} Filtered array
 */
function filterByMonth(array, year, month, dateField = 'date') {
  return array.filter(item => {
    const date = new Date(item[dateField]);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

// ============================================
// DOM HELPERS (D7, D12)
// ============================================

/**
 * Render empty state message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Message to display
 */
function renderEmptyState(container, message) {
  container.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Create dynamic modal
 * @param {string} id - Modal ID
 * @param {string} title - Modal title
 * @param {string} content - Modal body HTML
 * @returns {HTMLElement} Modal element
 */
function createDynamicModal(id, title, content) {
  let modal = document.getElementById(id);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('active');
    };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h2>${escapeHtml(title)}</h2>
        <button type="button" class="modal-close" onclick="this.closest('.modal').classList.remove('active')" aria-label="Zamknij">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
    </div>
  `;

  return modal;
}

// ============================================
// STORAGE HELPERS (D2)
// ============================================

/**
 * Safe JSON parse with fallback
 * @param {string} data - JSON string
 * @param {*} fallback - Fallback value
 * @returns {*} Parsed data or fallback
 */
function safeJsonParse(data, fallback = null) {
  if (!data) return fallback;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('JSON parse error:', e);
    return fallback;
  }
}

/**
 * Get from localStorage with JSON parse
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Parsed value or default
 */
function getFromStorage(key, defaultValue = null) {
  const data = localStorage.getItem(key);
  return safeJsonParse(data, defaultValue);
}

/**
 * Save to localStorage as JSON
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate YYYY-MM date format
 * @param {string} dateStr - Date string
 * @returns {boolean} True if valid
 */
function isValidYearMonth(dateStr) {
  return /^\d{4}-\d{2}$/.test(dateStr);
}

/**
 * Validate and parse date
 * @param {string} dateStr - Date string
 * @returns {Date|null} Date object or null if invalid
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// ============================================
// EXPORT TO WINDOW
// ============================================

window.FGUtils = {
  // Constants
  MONTHS,
  MONTHS_SHORT,
  CATEGORY_CONFIG,
  ACHIEVEMENT_CATEGORY_NAMES,

  // Formatting
  formatMoney,
  formatCurrency,
  formatMonth,
  formatMonthShort,

  // Date helpers
  getCurrentYearMonth,
  getDateString,
  daysBetween,
  daysSince,
  isInMonth,
  isThisMonth,
  filterByMonth,

  // DOM helpers
  renderEmptyState,
  escapeHtml,
  createDynamicModal,

  // Storage helpers
  safeJsonParse,
  getFromStorage,
  saveToStorage,

  // Validation
  isValidYearMonth,
  parseDate
};

// Also export individual functions for convenience
window.formatMoney = formatMoney;
window.escapeHtml = escapeHtml;
window.safeJsonParse = safeJsonParse;
window.renderEmptyState = renderEmptyState;
window.formatMonth = formatMonth;
window.formatMonthShort = formatMonthShort;
