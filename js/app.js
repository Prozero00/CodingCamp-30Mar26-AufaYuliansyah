/**
 * Expense & Budget Visualizer
 * Feature: expense-budget-visualizer
 *
 * Single-file SPA — all modules live here, organised by naming convention:
 *   storage_*   → localStorage read/write
 *   state_*     → in-memory AppState + mutation helpers
 *   validation_* → form validation rules
 *   chart_*     → Chart.js wrapper
 *   render_*    → DOM rendering functions
 *   handlers_*  → event listener callbacks
 *   init_*      → bootstrap
 */

'use strict';

/* ============================================================
 * STORAGE MODULE
 * Wraps all localStorage access.  Every read/write is guarded
 * with try/catch so the app continues in-memory if storage is
 * unavailable (private browsing, quota exceeded, etc.).
 * ============================================================ */

const KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  CATEGORIES:   'ebv_categories',
  SORT:         'ebv_sort',
};

/**
 * Read a value from localStorage and JSON-parse it.
 * Returns `defaultValue` on any failure (storage unavailable,
 * key absent, or malformed JSON).
 *
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
function storage_load(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (_parseErr) {
      return defaultValue;
    }
  } catch (_storageErr) {
    return defaultValue;
  }
}

/**
 * Serialise `value` and write it to localStorage.
 * Strings are stored as-is (no extra JSON wrapping).
 * Silently swallows errors so the app never crashes on save.
 *
 * @param {string} key
 * @param {*} value
 */
function storage_save(key, value) {
  try {
    const serialised = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialised);
  } catch (_err) {
    // Storage unavailable or quota exceeded — continue in-memory only.
  }
}

// --- Convenience wrappers ---

/** @returns {Array<Object>} Transaction[] */
function storage_loadTransactions() {
  return storage_load(KEYS.TRANSACTIONS, []);
}

/** @param {Array<Object>} transactions */
function storage_saveTransactions(transactions) {
  storage_save(KEYS.TRANSACTIONS, transactions);
}

/** @returns {string[]} Custom categories only (default categories are never stored) */
function storage_loadCategories() {
  return storage_load(KEYS.CATEGORIES, []);
}

/** @param {string[]} categories */
function storage_saveCategories(categories) {
  storage_save(KEYS.CATEGORIES, categories);
}

/** @returns {string} SortOption — defaults to 'date-desc' */
function storage_loadSort() {
  try {
    const raw = localStorage.getItem(KEYS.SORT);
    if (raw === null) return 'date-desc';
    // Sort option is stored as a plain string (not JSON), so return raw value.
    const valid = ['date-desc', 'amount-asc', 'amount-desc', 'category-asc'];
    return valid.includes(raw) ? raw : 'date-desc';
  } catch (_err) {
    return 'date-desc';
  }
}

/** @param {string} option — one of 'date-desc' | 'amount-asc' | 'amount-desc' | 'category-asc' */
function storage_saveSort(option) {
  storage_save(KEYS.SORT, option);
}

/* ============================================================
 * STATE MODULE
 * Single in-memory AppState object + mutation helpers.
 * Every mutation persists to localStorage then the caller
 * is responsible for triggering render().
 * ============================================================ */

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

/**
 * Central application state.
 * Populated by init(); never mutated directly — use helpers below.
 *
 * @type {{ transactions: Array<Object>, categories: string[], sortOption: string }}
 */
const AppState = {
  transactions: [],   // Transaction[], newest first
  categories: [],     // DEFAULT_CATEGORIES + custom, insertion order
  sortOption: 'date-desc',
};

/**
 * Generate a unique transaction id.
 * Prefers crypto.randomUUID(); falls back for older Safari.
 *
 * @returns {string}
 */
function state_generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

/**
 * Add a validated transaction to state and persist.
 *
 * @param {{ name: string, amount: number, category: string }} fields
 */
function state_addTransaction(fields) {
  const transaction = {
    id: state_generateId(),
    name: fields.name.trim(),
    amount: Number(fields.amount),
    category: fields.category,
    createdAt: Date.now(),
  };
  AppState.transactions.unshift(transaction); // newest first
  storage_saveTransactions(AppState.transactions);
}

/**
 * Remove a transaction by id from state and persist.
 * No-op if the id is not found.
 *
 * @param {string} id
 */
function state_deleteTransaction(id) {
  AppState.transactions = AppState.transactions.filter(t => t.id !== id);
  storage_saveTransactions(AppState.transactions);
}

/**
 * Add a validated custom category to state and persist.
 * Default categories are never written to localStorage.
 *
 * @param {string} name
 */
function state_addCategory(name) {
  const trimmed = name.trim();
  AppState.categories.push(trimmed);
  // Only persist the custom portion (strip defaults before saving)
  const custom = AppState.categories.filter(c => !DEFAULT_CATEGORIES.includes(c));
  storage_saveCategories(custom);
}

/**
 * Remove a custom category by name from state and persist.
 * Default categories cannot be deleted.
 *
 * @param {string} name
 */
function state_deleteCategory(name) {
  if (DEFAULT_CATEGORIES.includes(name)) return; // guard defaults
  AppState.categories = AppState.categories.filter(c => c !== name);
  const custom = AppState.categories.filter(c => !DEFAULT_CATEGORIES.includes(c));
  storage_saveCategories(custom);
}

/**
 * Update the active sort option and persist.
 *
 * @param {string} option — 'date-desc' | 'amount-asc' | 'amount-desc' | 'category-asc'
 */
function state_setSortOption(option) {
  AppState.sortOption = option;
  storage_saveSort(option);
}

/**
 * Initialise AppState from localStorage.
 * Merges default categories with any persisted custom categories.
 * Called once by init().
 */
function state_load() {
  AppState.transactions = storage_loadTransactions();
  const custom = storage_loadCategories();
  // Merge: defaults first, then custom additions (preserve insertion order)
  AppState.categories = [
    ...DEFAULT_CATEGORIES,
    ...custom.filter(c => !DEFAULT_CATEGORIES.map(d => d.toLowerCase()).includes(c.toLowerCase())),
  ];
  AppState.sortOption = storage_loadSort();
}

/**
 * Compute the running balance as the sum of all transaction amounts.
 *
 * @param {Array<Object>} transactions
 * @returns {number}
 */
function computeBalance(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Return a new sorted copy of `transactions` according to `option`.
 * Supported options: 'date-desc' | 'amount-asc' | 'amount-desc' | 'category-asc'
 *
 * @param {Array<Object>} transactions
 * @param {string} option
 * @returns {Array<Object>}
 */
function sortTransactions(transactions, option) {
  const copy = transactions.slice();
  switch (option) {
    case 'amount-asc':
      return copy.sort((a, b) => a.amount - b.amount);
    case 'amount-desc':
      return copy.sort((a, b) => b.amount - a.amount);
    case 'category-asc':
      return copy.sort((a, b) => a.category.localeCompare(b.category));
    case 'date-desc':
    default:
      return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/**
 * Group transactions by YYYY-MM month, sum amounts per group,
 * and return entries sorted descending (most recent month first).
 *
 * @param {Array<Object>} transactions
 * @returns {Array<{ month: string, total: number }>}
 */
function groupByMonth(transactions) {
  const map = {};
  for (const t of transactions) {
    const d = new Date(t.createdAt);
    const month =
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    map[month] = (map[month] || 0) + t.amount;
  }
  return Object.entries(map)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Group transactions by category and sum amounts per group.
 * Order of entries is not guaranteed.
 *
 * @param {Array<Object>} transactions
 * @returns {Array<{ category: string, total: number }>}
 */
function groupByCategory(transactions) {
  const map = {};
  for (const t of transactions) {
    map[t.category] = (map[t.category] || 0) + t.amount;
  }
  return Object.entries(map).map(([category, total]) => ({ category, total }));
}

/* ============================================================
 * VALIDATION MODULE
 * Pure functions — no DOM or localStorage dependency.
 * ============================================================ */

/**
 * Validate the fields of a new transaction form submission.
 *
 * @param {{ name: string, amount: string|number, category: string }} fields
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateTransaction(fields) {
  const errors = {};

  if (!fields.name || fields.name.trim() === '') {
    errors.name = 'Item name is required.';
  }

  const amount = Number(fields.amount);
  if (fields.amount === '' || fields.amount === null || fields.amount === undefined || isNaN(amount) || amount <= 0) {
    errors.amount = 'Amount must be a positive number.';
  }

  if (!fields.category || fields.category.trim() === '') {
    errors.category = 'Please select a category.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate a new custom category name against the existing category list.
 *
 * @param {string} name — the proposed new category name
 * @param {string[]} existing — current list of category names (default + custom)
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateCategory(name, existing) {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Category name is required.' };
  }

  const normalised = name.trim().toLowerCase();
  const isDuplicate = existing.some(c => c.toLowerCase() === normalised);
  if (isDuplicate) {
    return { valid: false, error: 'A category with that name already exists.' };
  }

  return { valid: true, error: null };
}

/* ============================================================
 * CHART MODULE
 * Wraps Chart.js. All calls are guarded with `if (window.Chart)`
 * so the app degrades gracefully when the CDN fails to load.
 *
 * The module manages a single Chart instance stored in
 * `_chartInstance`. The canvas and placeholder <p> are toggled
 * based on whether data exists.
 * ============================================================ */

/** @type {Chart|null} */
let _chartInstance = null;

// Distinct palette — cycles if there are more categories than colors
const CHART_COLORS = [
  '#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
  '#06b6d4', '#a855f7', '#e11d48', '#22c55e', '#eab308',
];

function chart_colors(count) {
  return Array.from({ length: count }, (_, i) => CHART_COLORS[i % CHART_COLORS.length]);
}

/**
 * Initialise a new Chart.js pie chart on `#spending-chart`.
 * No-op if Chart.js is unavailable.
 *
 * @param {{ labels: string[], data: number[] }} chartData
 */
function chart_init(chartData) {
  if (!window.Chart) return;

  const canvas = document.getElementById('spending-chart');
  if (!canvas) return;

  _chartInstance = new window.Chart(canvas, {
    type: 'pie',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.data,
        backgroundColor: chart_colors(chartData.data.length),
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

/**
 * Update the existing chart with new data, or create it if it
 * doesn't exist yet.  Shows/hides the canvas and placeholder
 * depending on whether `chartData` contains any entries.
 *
 * @param {{ labels: string[], data: number[] }} chartData
 */
function chart_update(chartData) {
  const canvas = document.getElementById('spending-chart');
  const placeholder = document.getElementById('chart-placeholder');
  const hasData = chartData.labels.length > 0;

  // Toggle visibility
  if (canvas) canvas.style.display = hasData ? 'block' : 'none';
  if (placeholder) placeholder.style.display = hasData ? 'none' : 'block';

  if (!hasData) {
    // Nothing to render — destroy any existing instance and bail
    chart_destroy();
    return;
  }

  if (!window.Chart) return; // CDN unavailable — placeholder already shown above

  if (_chartInstance) {
    // Update in-place to preserve animations
    _chartInstance.data.labels = chartData.labels;
    _chartInstance.data.datasets[0].data = chartData.data;
    _chartInstance.data.datasets[0].backgroundColor = chart_colors(chartData.data.length);
    _chartInstance.update();
  } else {
    chart_init(chartData);
  }
}

/**
 * Destroy the current Chart.js instance and release its canvas.
 * Safe to call when no instance exists.
 */
function chart_destroy() {
  if (_chartInstance) {
    _chartInstance.destroy();
    _chartInstance = null;
  }
}

/* ============================================================
 * RENDER MODULE
 * DOM rendering functions — each replaces the innerHTML of a
 * well-defined container element.  No framework; plain JS only.
 * ============================================================ */

/**
 * Format a number as a USD currency string (e.g. $12.50).
 *
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return '$' + amount.toFixed(2);
}

/**
 * Write the computed balance to #balance-display.
 * Requirement 4.1 — balance is always visible at the top of the page.
 */
function render_balance() {
  const el = document.querySelector('#balance-display .balance-amount');
  if (!el) return;
  const balance = computeBalance(AppState.transactions);
  el.textContent = formatCurrency(balance);
}

/**
 * Replace #transaction-list innerHTML with a sorted <ul> of transactions.
 * Each <li> shows: item name, formatted amount, category badge, delete button.
 * Requirements 2.1, 2.3, 3.1, 11.2
 */
function render_transaction_list() {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  const sorted = sortTransactions(AppState.transactions, AppState.sortOption);

  if (sorted.length === 0) {
    list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
    return;
  }

  list.innerHTML = sorted.map(t => `
    <li data-id="${t.id}">
      <span class="tx-name">${escapeHtml(t.name)}</span>
      <span class="tx-amount">${formatCurrency(t.amount)}</span>
      <span class="tx-category">${escapeHtml(t.category)}</span>
      <button class="tx-delete" data-id="${t.id}" aria-label="Delete ${escapeHtml(t.name)}">Delete</button>
    </li>
  `).join('');
}

/**
 * Populate <select[name=category]> inside #input-form with all categories
 * from AppState.categories.
 * Requirements 1.1, 9.4, 9.5
 */
function render_category_dropdown() {
  const select = document.querySelector('#input-form select[name="category"]');
  if (!select) return;

  // Preserve the current selection if possible
  const current = select.value;

  const options = AppState.categories.map(
    cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
  ).join('');

  select.innerHTML = `<option value="">-- Select category --</option>${options}`;

  // Restore selection if it still exists
  if (current && AppState.categories.includes(current)) {
    select.value = current;
  }
}

/**
 * Render the list of custom categories in #category-list with delete buttons.
 * Default categories are shown without a delete button.
 */
function render_category_list() {
  const list = document.getElementById('category-list');
  if (!list) return;

  list.innerHTML = AppState.categories.map(cat => {
    const isDefault = DEFAULT_CATEGORIES.includes(cat);
    return `<li class="cat-item">
      <span class="cat-name">${escapeHtml(cat)}</span>
      ${isDefault
        ? '<span class="cat-default">default</span>'
        : `<button class="cat-delete" data-cat="${escapeHtml(cat)}" aria-label="Delete category ${escapeHtml(cat)}">✕</button>`
      }
    </li>`;
  }).join('');
}

/**
 * Escape a string for safe insertion into HTML.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Update the spending pie chart from current AppState.
 * Converts groupByCategory data into chart labels/values and
 * delegates to chart_update (which handles show/hide of canvas
 * and placeholder).
 * Requirements 5.1, 5.2, 5.3, 5.4
 */
function render_chart() {
  const categoryData = groupByCategory(AppState.transactions);
  const chartData = {
    labels: categoryData.map(d => d.category),
    data:   categoryData.map(d => d.total),
  };
  chart_update(chartData);
}

/**
 * Replace #monthly-summary-list innerHTML with a <ul> of monthly rows.
 * Each row shows the month label (e.g. "June 2025") and total spending.
 * Shows #monthly-placeholder when no transactions exist.
 * Requirements 10.1, 10.4, 10.5
 */
function render_monthly_summary() {
  const list        = document.getElementById('monthly-summary-list');
  const placeholder = document.getElementById('monthly-placeholder');
  if (!list) return;

  const months = groupByMonth(AppState.transactions);
  const hasData = months.length > 0;

  if (placeholder) placeholder.style.display = hasData ? 'none' : 'block';

  if (!hasData) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = months.map(({ month, total }) => {
    // Convert "YYYY-MM" → "Month YYYY" label (e.g. "2025-06" → "June 2025")
    const [year, mon] = month.split('-');
    const label = new Date(Number(year), Number(mon) - 1, 1)
      .toLocaleString('default', { month: 'long', year: 'numeric' });
    return `<li class="monthly-summary-item">
      <span class="month-label">${escapeHtml(label)}</span>
      <span class="month-total">${formatCurrency(total)}</span>
    </li>`;
  }).join('');
}

/**
 * Top-level render entry point.
 * Repaints every UI region by calling all render sub-functions in sequence.
 * Called after every state mutation.
 * Requirements 3.3, 4.2, 4.3, 5.2, 5.3, 10.2, 10.3
 */
function render() {
  render_balance();
  render_transaction_list();
  render_category_dropdown();
  render_category_list();
  render_chart();
  render_monthly_summary();
}

/* ============================================================
 * HANDLERS MODULE
 * Event listener callbacks.  Each handler follows the pattern:
 *   validate → mutate state → persist → render()
 * ============================================================ */

/**
 * Show an inline error message for a given field.
 *
 * @param {string} errorId  — id of the <span class="error-msg"> element
 * @param {string} message
 */
function _showError(errorId, message) {
  const el = document.getElementById(errorId);
  if (el) el.textContent = message;
}

/**
 * Clear one or more inline error messages.
 *
 * @param {...string} errorIds
 */
function _clearErrors(...errorIds) {
  for (const id of errorIds) {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  }
}

/**
 * Handle #input-form submit — add a new transaction.
 * Requirements: 1.2, 1.3, 1.4, 1.5
 *
 * @param {Event} e
 */
function handlers_addTransaction(e) {
  e.preventDefault();

  const fields = {
    name:     document.getElementById('item-name').value,
    amount:   document.getElementById('amount').value,
    category: document.getElementById('category').value,
  };

  _clearErrors('error-item', 'error-amount', 'error-category');

  const { valid, errors } = validateTransaction(fields);

  if (!valid) {
    if (errors.name)     _showError('error-item',     errors.name);
    if (errors.amount)   _showError('error-amount',   errors.amount);
    if (errors.category) _showError('error-category', errors.category);
    return;
  }

  state_addTransaction(fields);
  e.currentTarget.reset();
  render();
}

/**
 * Handle delete button clicks inside #transaction-list.
 * Uses event delegation on the list container.
 * Requirements: 3.2, 3.3
 *
 * @param {Event} e
 */
function handlers_deleteTransaction(e) {
  const btn = e.target.closest('.tx-delete');
  if (!btn) return;

  const id = btn.dataset.id;
  if (!id) return;

  state_deleteTransaction(id);
  render();
}

/**
 * Handle #add-category-btn click — add a custom category.
 * Requirements: 9.2, 9.3, 9.4
 */
function handlers_addCategory() {
  const input = document.getElementById('custom-category');
  if (!input) return;

  const name = input.value;

  _clearErrors('error-custom-category');

  const { valid, error } = validateCategory(name, AppState.categories);

  if (!valid) {
    _showError('error-custom-category', error);
    return;
  }

  state_addCategory(name);
  input.value = '';
  render();
}

/**
 * Handle delete button clicks inside #category-list (event delegation).
 * Only custom categories can be deleted.
 *
 * @param {Event} e
 */
function handlers_deleteCategory(e) {
  const btn = e.target.closest('.cat-delete');
  if (!btn) return;
  const cat = btn.dataset.cat;
  if (!cat) return;
  state_deleteCategory(cat);
  render();
}

/**
 * Handle #sort-select change — update sort preference.
 * Requirements: 11.2, 11.3, 11.4
 *
 * @param {Event} e
 */
function handlers_changeSort(e) {
  const option = e.currentTarget.value;
  state_setSortOption(option);
  render();
}

/* ============================================================
 * INIT
 * Bootstrap: load persisted state, wire all event listeners,
 * and perform the initial render.
 * ============================================================ */

/**
 * Initialise the application.
 * Requirements: 6.3, 6.4, 9.5, 11.4
 */
function init() {
  // 1. Restore state from localStorage
  state_load();

  // 2. Sync sort control to persisted preference
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = AppState.sortOption;

  // 3. Wire event listeners
  const form = document.querySelector('#input-form form');
  if (form) form.addEventListener('submit', handlers_addTransaction);

  const transactionList = document.getElementById('transaction-list');
  if (transactionList) transactionList.addEventListener('click', handlers_deleteTransaction);

  const addCategoryBtn = document.getElementById('add-category-btn');
  if (addCategoryBtn) addCategoryBtn.addEventListener('click', handlers_addCategory);

  const categoryList = document.getElementById('category-list');
  if (categoryList) categoryList.addEventListener('click', handlers_deleteCategory);

  if (sortSelect) sortSelect.addEventListener('change', handlers_changeSort);

  // 4. Initial render
  render();
}

// Kick off once the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
