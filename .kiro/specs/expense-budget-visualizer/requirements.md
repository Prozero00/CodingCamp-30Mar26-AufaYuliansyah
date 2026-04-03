# Requirements Document

## Introduction

A mobile-friendly single-page web application that helps users track daily spending. The app displays a running balance, a scrollable transaction history, and a pie chart of spending by category. All data is persisted client-side using the browser's Local Storage API. No backend, no frameworks — just HTML, CSS, and Vanilla JavaScript.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A record consisting of an item name, a monetary amount, and a category.
- **Category**: A spending label assigned to a transaction. The App ships with three default categories (Food, Transport, Fun) and allows users to define additional custom categories.
- **Custom_Category**: A user-defined category name stored alongside the default categories.
- **Balance**: The sum of all transaction amounts currently stored.
- **Transaction_List**: The scrollable UI component that displays all stored transactions.
- **Input_Form**: The UI component containing the item name, amount, and category fields used to add a new transaction.
- **Chart**: The pie chart component that visualises spending distribution across categories.
- **Local_Storage**: The browser's `localStorage` API used for client-side data persistence.
- **Validator**: The logic responsible for checking that all required form fields contain valid values before a transaction is saved.
- **Monthly_Summary**: The UI component that groups and displays total spending per calendar month.
- **Sort_Control**: The UI control that allows the user to choose the ordering of transactions in the Transaction_List.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can record a new spending transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name, a numeric field for amount, and a dropdown selector for category that includes the default categories (Food, Transport, Fun) and any user-defined Custom_Categories.
2. WHEN the user submits the Input_Form, THE Validator SHALL verify that the item name field is non-empty, the amount field contains a positive number, and a category has been selected.
3. IF the Validator detects that any required field is empty or invalid, THEN THE App SHALL display an inline error message identifying the missing or invalid field and SHALL NOT add a transaction.
4. WHEN the Input_Form passes validation, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage.
5. WHEN a transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state.

---

### Requirement 2: Display Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction's item name, amount, and category.
2. WHILE the number of transactions exceeds the visible area of the Transaction_List, THE App SHALL make the Transaction_List scrollable without affecting the rest of the page layout.
3. THE Transaction_List SHALL display transactions in the order they were added, with the most recent transaction appearing at the top.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list, so that I can correct mistakes or remove unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control for each transaction.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List and from Local_Storage.
3. WHEN a transaction is deleted, THE App SHALL update the Balance and the Chart without requiring a page reload.

---

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the Balance at the top of the page at all times.
2. WHEN a transaction is added, THE App SHALL recalculate and display the updated Balance immediately.
3. WHEN a transaction is deleted, THE App SHALL recalculate and display the updated Balance immediately.
4. THE App SHALL initialise the Balance from transactions stored in Local_Storage on page load.

---

### Requirement 5: Spending Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL display spending distribution across all categories (including Custom_Categories) that have at least one transaction.
2. WHEN a transaction is added, THE Chart SHALL update to reflect the new spending distribution without requiring a page reload.
3. WHEN a transaction is deleted, THE Chart SHALL update to reflect the revised spending distribution without requiring a page reload.
4. WHEN no transactions exist, THE Chart SHALL display a placeholder state indicating that no data is available.
5. THE App SHALL render the Chart using Chart.js loaded from a CDN.

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my spending history when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the updated transaction list to Local_Storage before the UI is updated.
2. WHEN a transaction is deleted, THE App SHALL write the updated transaction list to Local_Storage before the UI is updated.
3. WHEN the App initialises, THE App SHALL read all transactions from Local_Storage and render the Transaction_List, Balance, and Chart from the stored data.
4. IF Local_Storage is empty or contains no valid transaction data, THEN THE App SHALL initialise with an empty Transaction_List, a Balance of zero, and the Chart placeholder state.

---

### Requirement 7: Mobile-Friendly Layout

**User Story:** As a user, I want the app to work well on my phone, so that I can track spending on the go.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that adapts to viewport widths from 320px to 1280px without horizontal scrolling.
2. THE Input_Form, Transaction_List, Balance, and Chart SHALL each remain fully usable on a touch-screen device with a viewport width of 375px.
3. THE App SHALL use a single CSS file located at `css/styles.css` and a single JavaScript file located at `js/app.js`.

---

### Requirement 8: Browser Compatibility

**User Story:** As a developer, I want the app to run in all modern browsers, so that users are not restricted to a specific browser.

#### Acceptance Criteria

1. THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari.
2. THE App SHALL be implemented using HTML, CSS, and Vanilla JavaScript with no build step, no framework, and no backend server.
3. THE App SHALL be openable as a standalone local file (via `file://` protocol) or served from any static web server.

---

### Requirement 9: Manage Custom Categories

**User Story:** As a user, I want to create my own spending categories, so that I can track expenses beyond the default Food, Transport, and Fun labels.

#### Acceptance Criteria

1. THE App SHALL provide a dedicated input field and submit control that allows the user to enter a new Custom_Category name.
2. WHEN the user submits a new Custom_Category name, THE Validator SHALL verify that the name is non-empty and does not duplicate an existing category name (case-insensitive).
3. IF the Validator detects that the Custom_Category name is empty or duplicates an existing category, THEN THE App SHALL display an inline error message and SHALL NOT add the Custom_Category.
4. WHEN a Custom_Category passes validation, THE App SHALL add it to the category dropdown in the Input_Form and persist the updated category list to Local_Storage.
5. WHEN the App initialises, THE App SHALL read the persisted category list from Local_Storage and include all Custom_Categories in the Input_Form dropdown alongside the default categories.

---

### Requirement 10: Monthly Summary View

**User Story:** As a user, I want to see my spending grouped by month, so that I can understand how my expenses vary over time.

#### Acceptance Criteria

1. THE App SHALL display a Monthly_Summary component that lists each calendar month for which at least one transaction exists, showing the month label (e.g. "June 2025") and the total spending amount for that month.
2. WHEN a transaction is added, THE Monthly_Summary SHALL update to reflect the new monthly total without requiring a page reload.
3. WHEN a transaction is deleted, THE Monthly_Summary SHALL update to reflect the revised monthly total without requiring a page reload.
4. THE Monthly_Summary SHALL list months in descending chronological order, with the most recent month appearing first.
5. WHEN no transactions exist, THE Monthly_Summary SHALL display a placeholder state indicating that no data is available.

---

### Requirement 11: Sort Transactions

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can quickly find and compare related entries.

#### Acceptance Criteria

1. THE App SHALL display a Sort_Control that offers the following sort options: date added (default, most recent first), amount ascending, amount descending, and category name (A–Z).
2. WHEN the user selects a sort option from the Sort_Control, THE Transaction_List SHALL re-render in the chosen order without requiring a page reload.
3. WHILE a non-default sort option is active, THE Transaction_List SHALL maintain the selected sort order when new transactions are added or existing transactions are deleted.
4. THE App SHALL persist the user's selected sort option to Local_Storage so that the same sort order is restored on page load.
