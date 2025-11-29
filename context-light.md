# Context Light - BizzSaathi Cheatsheet

## DATABASE SCHEMA

### users
- id (PK INT AUTO), username (TEXT UNIQUE), password (TEXT), status_code (INT), created_at (DATETIME)

### categories
- id (PK INT AUTO), name (TEXT), status_code (INT), created_at (DATETIME)

### suppliers
- id (PK INT AUTO), name (TEXT), contact (TEXT), address (TEXT), gstin (TEXT), email (TEXT), state (TEXT), city (TEXT), country (TEXT), pincode (TEXT), credit_days (INT), status_code (INT), created_at (DATETIME)

### items
- id (PK INT AUTO), name (TEXT), sku (TEXT), hsn_code (TEXT), description (TEXT), unit (TEXT), mrp (REAL), purchase_rate (REAL), sale_rate (REAL), gst_percentage (REAL), category_id (INT) -> categories.id, current_stock (INT), minimum_stock (INT), last_supplier_id (INT) -> suppliers.id, last_purchase_date (DATETIME), status_code (INT), created_at (DATETIME)

### purchases
- id (PK INT AUTO), supplier_id (INT) -> suppliers.id, invoice_number (TEXT), purchase_date (DATE), total_amount (REAL), cgst_total (REAL), sgst_total (REAL), discount (REAL), is_paid (INT), payment_method (TEXT), rounding_off (REAL), status_code (INT), created_at (DATETIME)

### purchase_items
- id (PK INT AUTO), purchase_id (INT) -> purchases.id, item_id (INT) -> items.id, quantity (INT), unit_price (REAL), gst_percentage (REAL), cgst_amount (REAL), sgst_amount (REAL), discount (REAL), total_price (REAL), status_code (INT)

### sales
- id (PK INT AUTO), bill_number (TEXT UNIQUE), customer_name (TEXT), customer_contact (TEXT), customer_address (TEXT), customer_gstin (TEXT), salesman_id (INT), sale_type (TEXT), sale_date (DATE), discount (REAL), total_amount (REAL), rounding_off (REAL), cgst_total (REAL), sgst_total (REAL), is_paid (INT), is_approved (INT), payment_method (TEXT), shipped_to_name (TEXT), shipped_to_contact (TEXT), shipped_to_address (TEXT), shipped_to_gstin (TEXT), is_shipped_different (INT), status_code (INT), created_at (DATETIME)

### sale_items
- id (PK INT AUTO), sale_id (INT) -> sales.id, item_id (INT) -> items.id, quantity (INT), unit_price (REAL), gst_percentage (REAL), cgst_amount (REAL), sgst_amount (REAL), total_price (REAL), sale_type (TEXT), status_code (INT)

### customer
- id (PK INT AUTO), name (TEXT), contact (TEXT UNIQUE), address (TEXT), gstin (TEXT), email (TEXT), state (TEXT), city (TEXT), country (TEXT), pincode (TEXT), credit_limit (REAL), credit_days (INT), status_code (INT), created_at (DATETIME)

### salesman
- id (PK INT AUTO), name (TEXT), contact_info (TEXT), address (TEXT), email (TEXT), state (TEXT), city (TEXT), country (TEXT), pincode (TEXT), gstin (TEXT), joining_date (DATE), credit_limit (REAL), credit_days (INT), working_area (TEXT), status_code (INT), created_at (DATETIME)

### units
- id (PK INT AUTO), name (TEXT UNIQUE), status_code (INT), created_at (DATETIME)

### gst_rates
- id (PK INT AUTO), rate (REAL), description (TEXT), status_code (INT), created_at (DATETIME)

### settings
- id (PK INT AUTO), key (TEXT UNIQUE), value (TEXT), status_code (INT), updated_at (DATETIME)

### payment_verification
- id (PK INT AUTO), sale_id (INT) -> sales.id, purchase_id (INT) -> purchases.id, payment_method (TEXT CHECK IN cash/upi/neft_rtgs/cheque), amount (REAL), payment_date (DATE), status (TEXT CHECK IN pending/verified/failed), created_at (DATETIME)

### payment_upi
- id (PK INT AUTO), payment_verification_id (INT) -> payment_verification.id, transaction_id (TEXT), upi_id (TEXT), app_name (TEXT), reference_number (TEXT), created_at (DATETIME)

### payment_cash
- id (PK INT AUTO), payment_verification_id (INT) -> payment_verification.id, denomination_notes (TEXT), received_by (TEXT), receipt_number (TEXT), created_at (DATETIME)

### payment_neft_rtgs
- id (PK INT AUTO), payment_verification_id (INT) -> payment_verification.id, transaction_reference (TEXT), sender_bank (TEXT), sender_account (TEXT), receiver_bank (TEXT), receiver_account (TEXT), transfer_type (TEXT CHECK IN neft/rtgs), created_at (DATETIME)

### payment_cheque
- id (PK INT AUTO), payment_verification_id (INT) -> payment_verification.id, cheque_number (TEXT), bank_name (TEXT), branch_name (TEXT), cheque_date (DATE), drawer_name (TEXT), micr_code (TEXT), status (TEXT CHECK IN received/deposited/cleared/bounced), created_at (DATETIME)

### bank_accounts
- id (PK INT AUTO), account_name (TEXT), account_number (TEXT), bank_name (TEXT), branch_name (TEXT), ifsc_code (TEXT), account_type (TEXT CHECK IN Savings/Current/Cash Credit/Overdraft), opening_balance (REAL), current_balance (REAL), is_active (INT), status_code (INT), created_at (DATETIME), updated_at (DATETIME)

### bank_transactions
- id (PK INT AUTO), voucher_number (TEXT), voucher_type (TEXT CHECK IN Payment/Receipt/Contra), transaction_date (TEXT), bank_account_id (INT) -> bank_accounts.id, party_name (TEXT), amount (REAL), transaction_type (TEXT CHECK IN Debit/Credit), cheque_number (TEXT), cheque_date (TEXT), narration (TEXT), cleared_status (TEXT CHECK IN Pending/Deposited/Cleared/Bounced/Cancelled), cleared_date (TEXT), reconciled (INT), reconciled_date (TEXT), created_by (TEXT), status_code (INT), created_at (TEXT), updated_at (TEXT)

### bank_ledger_entries
- id (PK INT AUTO), transaction_id (INT) -> bank_transactions.id, ledger_type (TEXT CHECK IN Bank/Party/Expense/Income), ledger_name (TEXT), debit_amount (REAL), credit_amount (REAL), created_at (DATETIME)

### bank_reconciliation
- id (PK INT AUTO), bank_account_id (INT) -> bank_accounts.id, statement_date (DATE), statement_balance (REAL), book_balance (REAL), difference (REAL), reconciled_by (TEXT), reconciled_at (DATETIME), notes (TEXT)

### transaction_categories
- id (PK INT AUTO), category_name (TEXT UNIQUE), category_type (TEXT CHECK IN Expense/Income), description (TEXT), is_default (INT), is_active (INT), created_at (DATETIME)

### post_dated_cheques
- id (PK INT AUTO), transaction_id (INT) -> bank_transactions.id, cheque_number (TEXT), cheque_date (DATE), amount (REAL), party_name (TEXT), bank_name (TEXT), status (TEXT CHECK IN Pending/Deposited/Cleared/Bounced/Cancelled), deposit_date (DATE), cleared_date (DATE), notes (TEXT), created_at (DATETIME), updated_at (DATETIME)

### item_batches
- id (PK INT AUTO), item_id (INT) -> items.id, purchase_item_id (INT) -> purchase_items.id, batch_number (TEXT), mfg_date (DATE), exp_date (DATE), qty_received (REAL), qty_available (REAL), purchase_rate (REAL), mrp (REAL), created_at (DATETIME)

### opening_stock
- id (PK INT AUTO), item_id (INT) -> items.id, financial_year (TEXT), opening_qty (REAL), opening_rate (REAL), opening_amount (REAL), opening_date (DATE), created_at (DATETIME), UNIQUE(item_id, financial_year)

### closing_stock
- id (PK INT AUTO), item_id (INT) -> items.id, closing_date (TEXT), closing_qty (REAL), purchase_rate (REAL), closing_amount (REAL)

### sale_item_cost_allocation
- id (PK INT AUTO), sale_item_id (INT) -> sale_items.id, purchase_item_id (INT) -> purchase_items.id, quantity_allocated (REAL), purchase_rate (REAL), cost_amount (REAL), created_at (DATETIME)

### company_info
- id (PK INT CHECK=1), company_name (TEXT), tagline (TEXT), address_line1 (TEXT), address_line2 (TEXT), city (TEXT), state (TEXT), pincode (TEXT), country (TEXT), phone (TEXT), mobile (TEXT), email (TEXT), website (TEXT), gstin (TEXT), pan (TEXT), cin (TEXT), logo_path (TEXT), footer_text (TEXT), bank_name (TEXT), bank_account_number (TEXT), bank_ifsc (TEXT), bank_branch (TEXT), edit_pin (TEXT), terms_1 (TEXT), terms_2 (TEXT), terms_3 (TEXT), terms_4 (TEXT), terms_5 (TEXT), is_locked (INT), created_at (DATETIME), updated_at (DATETIME)

### bill_message
- id (PK INT AUTO), message (TEXT), status_code (INT), is_print (INT), updated_at (DATETIME)

### credit_debit_notes
- id (PK INT AUTO), note_number (TEXT), note_type (TEXT CHECK IN credit/debit), reference_type (TEXT CHECK IN sale/purchase), sale_id (INT) -> sales.id, purchase_id (INT) -> purchases.id, original_invoice_number (TEXT), original_invoice_date (DATE), party_name (TEXT), party_contact (TEXT), party_address (TEXT), party_gstin (TEXT), party_state (TEXT), party_city (TEXT), note_date (DATE), reason (TEXT), reason_code (TEXT), subtotal (REAL), discount (REAL), cgst_total (REAL), sgst_total (REAL), igst_total (REAL), other_charges (REAL), rounding_off (REAL), total_amount (REAL), is_settled (INT), settlement_method (TEXT), settlement_date (DATE), settlement_reference (TEXT), is_approved (INT), approved_by (TEXT), approved_at (DATETIME), remarks (TEXT), status_code (INT), created_at (DATETIME), updated_at (DATETIME)

### credit_debit_note_items
- id (PK INT AUTO), note_id (INT) -> credit_debit_notes.id, item_id (INT) -> items.id, original_sale_item_id (INT) -> sale_items.id, original_purchase_item_id (INT) -> purchase_items.id, item_name (TEXT), hsn_code (TEXT), original_quantity (REAL), return_quantity (REAL), unit_price (REAL), discount (REAL), taxable_amount (REAL), gst_percentage (REAL), cgst_amount (REAL), sgst_amount (REAL), igst_amount (REAL), total_amount (REAL), item_condition (TEXT), remarks (TEXT), status_code (INT), created_at (DATETIME)

### note_stock_adjustments
- id (PK INT AUTO), note_item_id (INT) -> credit_debit_note_items.id, item_id (INT) -> items.id, adjustment_type (TEXT CHECK IN add/subtract), quantity (REAL), previous_stock (REAL), new_stock (REAL), adjustment_date (DATETIME), remarks (TEXT)

### note_financial_adjustments
- id (PK INT AUTO), note_id (INT) -> credit_debit_notes.id, adjustment_type (TEXT), amount (REAL), payment_method (TEXT), transaction_reference (TEXT), transaction_date (DATE), adjusted_sale_id (INT) -> sales.id, adjusted_purchase_id (INT) -> purchases.id, remarks (TEXT), created_at (DATETIME)

### license
- machine_id (PK TEXT), activated_on (DATETIME)

### schema_migrations
- id (PK INT AUTO), migration_name (TEXT UNIQUE), executed_at (DATETIME)

---

## STYLING GUIDE

### Colors
- **Primary**: bg-blue-600, bg-blue-700 (hover), bg-blue-50 (light), text-blue-700, border-blue-700, bg-blue-500
- **Neutral**: text-gray-900, text-gray-700, text-gray-600, text-gray-500, bg-gray-50, bg-gray-100, border-gray-200, border-gray-300, bg-white
- **Destructive**: bg-red-600, bg-red-700 (hover), bg-red-50 (light), text-red-700, bg-red-500
- **Success**: bg-green-600, bg-green-700 (hover), bg-green-50 (light), text-green-700

### Border Radius
- Cards: rounded-lg
- Buttons: rounded-md
- Inputs: rounded-md
- Modals: rounded-lg

### Spacing
- p-1 (4px), p-2 (8px), p-3 (12px), p-4 (16px), p-6 (24px)
- px-3, px-4, px-6 | py-1, py-2, py-3, py-4
- space-x-2, space-x-4, space-y-2, space-y-4

### Shadows
- Cards: shadow-sm
- Modals: shadow-xl
- Sidebars: shadow-lg

### Typography
- text-xs, text-sm, text-base, text-lg, text-xl
- font-normal, font-medium, font-semibold, font-bold

### Components

**Primary Button:**
`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors`

**Secondary Button:**
`bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors`

**Destructive Button:**
`bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors`

**Ghost Button:**
`text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors`

**Icon Button:**
`p-2 rounded-md hover:bg-gray-100 transition-colors`

**Text Input:**
`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`

**Input Label:**
`block text-sm font-medium text-gray-700 mb-1`

**Input Error:**
`w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent`

**Card:**
`bg-white rounded-lg shadow-sm border border-gray-200 p-6`

**Active Nav:**
`bg-blue-50 text-blue-700 border-r-2 border-blue-700 px-4 py-3 text-sm font-medium transition-colors`

**Inactive Nav:**
`text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-4 py-3 text-sm font-medium transition-colors`

**Active Tab:**
`border-b-2 border-blue-500 text-blue-600 px-4 py-2 text-sm font-medium`

**Inactive Tab:**
`border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-4 py-2 text-sm font-medium`

**Modal Overlay:**
`fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50`

**Modal Container:**
`bg-white rounded-lg shadow-xl p-6 max-w-md w-full`

**Modal Header:**
`text-lg font-semibold text-gray-900 mb-4`

**Page Header:**
`bg-white shadow-sm border-b border-gray-200`

**Section Header:**
`text-lg font-semibold text-gray-900`

### Icons (lucide-react)
- Small: w-4 h-4 (16px)
- Medium: w-5 h-5 (20px)
- Large: w-6 h-6 (24px)
- Colors: text-gray-500 (default), text-blue-700 (active), text-red-700 (error), text-green-700 (success)

### Z-Index
- z-0 (base), z-10 (dropdowns), z-30 (sidebar), z-40 (overlay), z-50 (modal)
