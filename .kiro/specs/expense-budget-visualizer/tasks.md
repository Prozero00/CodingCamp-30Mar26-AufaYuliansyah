# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a three-file SPA (index.html, css/styles.css, js/app.js) with a state→render loop, localStorage persistence, Chart.js pie chart, and property-based tests covering all 11 correctness properties.

## Tasks

- [x] 1. Scaffold index.html
  - Create `index.html` with all required sections: `#balance-display`, `#input-form`, `#category-manager`, `#sort-control`, `#transaction-list`, `#chart-container` (with `<canvas id="spending-chart">`), and `#monthly-summary`
  - Add `<link>` to `css/styles.css` and `<script>` tags for Chart.js CDN and `js/app.js`
  - Include placeholder text inside `#chart-container` and `#monthly-summary` for empty states
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.4, 5.5, 7.3, 9.1, 10.1, 10.5, 11.1_

- [x] 2. Implement CSS (css/styles.css)
  - Write mobile-first responsive styles covering 320px–1280px with no horizontal scroll
  - Style all sections: balance display, input form, category manager, sort control, transaction list (scrollable), chart container, monthly summary
  - Ensure all interactive controls are touch-friendly at 375px viewport width
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 3. Implement storage module in js/app.js
  - [x] 3.1 Implement `storage_load` and `storage_save` functions for `ebv_transactions`, `ebv_categories`, and `ebv_sort` keys
    - Wrap all `localStorage` reads/writes in `try/catch`; fall back to in-memory state on failure
    - Wrap `JSON.parse` in `try/catch`; return empty/default value on malformed JSON
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1_

  - [ ]* 3.2 Write property test for storage round-trip (Property 4)
    - **Property 4: Transaction list serialisation round-trip**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 3.3 Write property test for sort preference round-trip (Property 7)
    - **Property 7: Sort preference round-trip**
    - **Validates: Requirements 11.4**

- [ ] 4. Implement state module in js/app.js
  - [x] 4.1 Define `AppState` object and mutation helpers (`addTransaction`, `deleteTransaction`, `addCategory`, `setSortOption`)
    - Use `crypto.randomUUID()` for transaction ids with `Date.now().toString() + Math.random()` fallback
    - Merge default categories (`['Food', 'Transport', 'Fun']`) with persisted custom categories at init; never write defaults to `ebv_categories`
    - _Requirements: 1.4, 3.2, 6.1, 6.2, 8.1, 9.4, 9.5_

  - [x] 4.2 Implement `computeBalance`, `sortTransactions`, `groupByMonth`, `groupByCategory`
    - `computeBalance`: reduce over `transactions` summing `amount`
    - `sortTransactions`: support `date-desc`, `amount-asc`, `amount-desc`, `category-asc`
    - `groupByMonth`: group by `YYYY-MM` from `createdAt`, sum per group, sort descending
    - `groupByCategory`: group by `category`, sum per group
    - _Requirements: 4.1, 4.2, 4.3, 10.1, 10.4, 11.1_

  - [ ]* 4.3 Write property test for balance consistency (Property 3)
    - **Property 3: Balance equals sum of all transaction amounts**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 4.4 Write property test for delete invariant (Property 5)
    - **Property 5: Delete removes exactly one transaction**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 4.5 Write property test for sort order invariant (Property 6)
    - **Property 6: Sort order invariant**
    - **Validates: Requirements 11.1, 11.2, 11.3**

  - [ ]* 4.6 Write property test for monthly summary consistency (Property 10)
    - **Property 10: Monthly summary totals are consistent with transactions**
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [ ]* 4.7 Write property test for chart data consistency (Property 11)
    - **Property 11: Chart data totals are consistent with transactions**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 5. Implement validation module in js/app.js
  - [x] 5.1 Implement `validateTransaction(fields)` and `validateCategory(name, existing)`
    - `validateTransaction`: reject empty name, zero/negative amount, missing category; return `{ valid, errors }`
    - `validateCategory`: reject empty string and case-insensitive duplicates; return `{ valid, error }`
    - _Requirements: 1.2, 1.3, 9.2, 9.3_

  - [ ]* 5.2 Write property test for invalid transaction rejection (Property 2)
    - **Property 2: Invalid transactions are rejected**
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 5.3 Write property test for duplicate category rejection (Property 8)
    - **Property 8: Custom category duplicate rejection**
    - **Validates: Requirements 9.2, 9.3**

- [ ] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement chart module in js/app.js
  - Implement `chart_init`, `chart_update`, and `chart_destroy` wrapping Chart.js
  - Guard all Chart.js calls with `if (window.Chart)` check; show static fallback `<p>` when Chart.js is unavailable or no transactions exist
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Implement render module in js/app.js
  - [x] 8.1 Implement `render_balance`, `render_transaction_list`, `render_category_dropdown`
    - `render_balance`: write computed balance to `#balance-display`
    - `render_transaction_list`: replace `#transaction-list` innerHTML with sorted `<ul>` of transactions; each `<li>` shows name, amount, category badge, and delete button with `data-id`
    - `render_category_dropdown`: populate `<select[name=category]>` with current categories
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 4.1, 11.2_

  - [x] 8.2 Implement `render_chart`, `render_monthly_summary`
    - `render_chart`: call `chart_update` with `groupByCategory` data; show placeholder when empty
    - `render_monthly_summary`: replace `#monthly-summary` innerHTML with `groupByMonth` rows; show placeholder when empty
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.1, 10.4, 10.5_

  - [x] 8.3 Implement top-level `render()` that calls all render functions in sequence
    - _Requirements: 3.3, 4.2, 4.3, 5.2, 5.3, 10.2, 10.3_

- [ ] 9. Implement handlers and init in js/app.js
  - [x] 9.1 Implement `handlers_addTransaction`, `handlers_deleteTransaction`, `handlers_addCategory`, `handlers_changeSort`
    - Each handler: validate → mutate state → persist to localStorage → call `render()`
    - Show inline error messages on validation failure; clear errors on success
    - Reset `#input-form` fields after successful add
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.2, 9.2, 9.3, 9.4, 11.2, 11.3, 11.4_

  - [x] 9.2 Implement `init` function: load state from localStorage, wire all event listeners, call `render()`
    - Merge default + custom categories; restore persisted sort option
    - _Requirements: 6.3, 6.4, 9.5, 11.4_

- [ ] 10. Implement property-based tests for persistence properties
  - [ ]* 10.1 Write property test for valid transaction persistence (Property 1)
    - **Property 1: Valid transaction is persisted and retrievable**
    - **Validates: Requirements 1.4, 6.1**

  - [ ]* 10.2 Write property test for custom category persistence (Property 9)
    - **Property 9: Custom category persisted and restored**
    - **Validates: Requirements 9.4, 9.5**

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check (loadable via CDN or npm for test-only use), minimum 100 iterations each
- Each property test must include the comment: `// Feature: expense-budget-visualizer, Property N: <property text>`
- All 11 correctness properties from the design document are covered across tasks 3–10
