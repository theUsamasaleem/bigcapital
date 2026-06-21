# BigCapital / Finqora — Architecture Map (Milestone 0: System Audit)

> Deliverable for **Milestone 0** of the Zoho Books Parity Program. **No code was changed** to produce this document. It is the baseline understanding every later milestone depends on.
>
> Generated from a full read-only sweep of `packages/server`, `packages/webapp`, the database migrations, and the test suite.

---

## 1. High-level architecture

- **Monorepo** (pnpm workspaces + lerna). Key packages: `packages/server` (NestJS API), `packages/webapp` (React SPA), `shared/*` (`@bigcapital/sdk-ts`, `@bigcapital/utils`, `@bigcapital/pdf-templates`, `@bigcapital/email-components`).
- **Server**: NestJS, Objection/Knex ORM, **multi-tenant** — one **system DB** (`finqora_system`) + one **database per tenant** (`finqora_tenant_<orgId>`). BullMQ (Redis) for background jobs. Event-driven GL posting via NestJS EventEmitter subscribers.
- **Webapp**: React + React Router v5, **React Query** (server state) + **Redux** (UI state), Formik + Blueprint UI, react-intl-universal (en/ar/es/sv). Talks to the API via `@bigcapital/sdk-ts`; request layer injects `Authorization` + `organization-id`.
- **Request/response casing**: the server's global `SerializeInterceptor` converts request bodies snake→camel and responses camel→snake. The frontend speaks snake_case.
- **Deploy**: Docker — `proxy` (Envoy, port 80; `/api`→server, `/`→webapp), `server`, `webapp`, `mysql` (MariaDB), `redis`, `gotenberg` (PDF), plus a one-shot `database_migration` container running `system:migrate:latest && tenants:migrate:latest`.

---

## 2. Accounting core (PROTECT AT ALL COSTS)

All GL posting is **event-driven**: a document is saved → a `*GLEntriesSubscriber` fires → a `*GLEntries` writer builds entries → the **Ledger** layer commits them atomically (entries + account balances + contact balances).

### Ledger engine — `packages/server/src/modules/Ledger/`
| File | Role |
|---|---|
| `LedgerStorage.service.ts` | Master commit orchestrator (entries + balances as one unit) |
| `LedgerEntriesStorage.service.ts` | Persists GL entries to `accounts_transactions` |
| `LedgetAccountStorage.service.ts` | Updates account balances, FX handling |
| `LedgerContactStorage.service.ts` | Updates customer/vendor balances |
| `Ledger.ts` | In-memory ledger value object (filter/sum/reverse) |
| `LedgerStorageRevert.service.ts` | Reverses posted entries (delete + negate) |

### Document GL writers (each must keep posting identical)
Sale Invoices, Bills, Bill Payments, Payments Received, Manual Journals, Credit Notes, Vendor Credits, Sale Receipts, Expenses, Inventory Adjustments, Inventory Cost (COGS), Landed Costs, Credit/Vendor-credit refunds & applications, Customer/Vendor opening balances.

**Regression rule:** any change touching these modules must produce **byte-identical GL entries** for the same input. This is the highest-priority invariant in the whole program.

---

## 3. Server module map (selected)

**Accounting-core:** Accounts, Ledger, ManualJournals, FinancialStatements, Bills, SaleInvoices, PaymentReceived, BillPayments, CreditNotes, VendorCredit, SaleReceipts, Expenses, BankingTransactions, InventoryAdjustments, InventoryCost, BillLandedCosts, CreditNoteRefunds, VendorCreditsRefund, VendorCreditsApplyBills, CreditNotesApplyInvoice, Customers, Vendors.

**Sales/Purchases/Inventory support:** SaleEstimates, Items, ItemCategories, Warehouses, WarehousesTransfers, TaxRates, Branches.

**Banking:** BankingAccounts, BankingTransactions (+ Pending/Uncategorized), BankingMatching, BankingCategorize, BankingTransactionsRecognize, BankingTransactionsExclude, BankRules, BankingPlaid, Plaid.

**Platform:** Tenancy (+ TenancyDB), Auth (+ ApiKeys, UserTenant), Organization, ee/Workspaces, Settings, Currencies, ExchangeRates, Dashboard, Roles, UsersModule, Contacts, Features, Subscription, StripePayment/PaymentServices/PaymentLinks, Mail/MailTenancy, PdfTemplate, Attachments/S3, Import, Export, Views/CustomViews, DynamicListing, Resource, TransactionsLocking, AuditLogs (+ ee/AuditLogs), Socket, Transformer, AutoIncrementOrders, CLI.

Each module follows: `*.module.ts`, `*.controller.ts`, `commands/` (writes), `queries/` (reads), `subscribers/`, models/repositories.

---

## 4. Database schema map

### System DB (`finqora_system`)
`users`, `password_resets`, `user_invites`, `tenants`, `user_tenants` (role owner/member), `tenants_metadata`, `subscription_plans`, `subscription_plan_subscriptions`, `subscriptions_plans` (legacy), `payment_links`, `stripe_accounts`, `plaid_items`, `api_keys`, `imports`, `oneclick_demos`.

### Tenant DB (`finqora_tenant_<orgId>`) — by domain
- **Access/settings:** `roles`, `role_permissions`, `users`, `settings`, `views`, `view_roles`.
- **General:** `currencies`, `exchange_rates`, `documents`, `document_links`, `media`, `media_links`.
- **Accounting/Ledger:** `accounts`, `accounts_transactions` (the GL), `manual_journals`, `manual_journals_entries`.
- **Sales:** `contacts` (customers/vendors/employees), `sales_invoices`, `sales_estimates`, `sales_receipts`, `payment_receives`, `payment_receives_entries`, `credit_notes`, `credit_note_applies_invoices`.
- **Purchases:** `bills`, `bills_payments`, `bill_payments_entries`, `vendor_credits`, `vendor_credit_applied_bill`.
- **Inventory:** `items`, `items_categories`, `items_entries`, `items_warehouses_quantity`, `inventory_transactions`, `inventory_adjustments(_entries)`, `inventory_cost_lot_tracker`, `landed_costs`, `landed_cost_entries`.
- **Banking:** `cashflow_transactions`, `cashflow_transaction_lines`, `uncategorized_cashflow_transactions`, `bank_rules`, `bank_rule_conditions`, `recognized_bank_transactions`, `matched_bank_transactions`.
- **Tax:** `tax_rates`, `tax_rate_transactions`.
- **Projects:** `projects`, `tasks`, `times`.
- **Org structure:** `branches`, `warehouses`, `warehouses_transfers(_entries)`.
- **Expenses:** `expenses_transactions`, `expense_transactions_categories`.
- **Refunds:** `refund_credit_note_transactions`, `refund_vendor_credit_transactions`.
- **Payments/templates:** `payment_integrations`, `transactions_payment_methods`, `pdf_templates`.
- **Audit:** `audit_logs` (action, subject, subject_id, metadata JSON, ip, user_id) — **already exists** (migration `20260408120000`).

> **`feature_flags` table:** does **not** exist. Feature gating today is via the `settings` table (`group='features'`) through the `Features` module — see §7.

---

## 5. API surface
~350+ REST endpoints across ~88 controllers, all under `/api`. Full per-domain listing captured during audit (Auth, Organization/Workspaces, Customers/Contacts, Vendors, Items/Inventory/Warehouses, Sale Invoices/Estimates/Receipts/Credit Notes/Payments Received, Bills/Bill Payments/Vendor Credits, Expenses, Accounts, Manual Journals, Banking, Financial Reports, Settings/Currencies/Tax/Branches/PDF templates, Roles/Users/Invites, Subscriptions/Stripe/Payment services, Audit logs, Attachments, Import/Export, Resource/Views/Transactions-locking).

**Auth/permission model:** `AuthorizationGuard` + `PermissionGuard` + `@RequirePermission(action, subject)` (CASL abilities backed by `roles`/`role_permissions`). Cross-tenant routes use `@TenantAgnosticRoute()`. Setup routes use `@IgnoreTenant*` guards.

---

## 6. Frontend map
- **Routing:** `packages/webapp/src/routes/dashboard.tsx` (~1346 lines, lazy-loaded), guarded by `PrivatePages.tsx` (`EnsureAuthenticated` → `EnsureUserEmailVerified` → `EnsureOrganizationIsReady`). `/setup` wizard runs pre-ready.
- **Feature containers:** one per domain under `containers/` (Customers, Vendors, Sales/*, Purchases/*, Expenses, Items, Accounting, CashFlow/Banking, FinancialStatements, Projects, TaxRates, Preferences, Setup, Subscriptions, ee/workspaces).
- **Data layer:** React Query hooks under `hooks/query/*` (one folder per domain), request layer `hooks/useRequest.tsx` (`useApiFetcher`, auth/error interceptors, snake↔camel), Redux slices under `store/*` for UI state. RQ defaults: `refetchOnWindowFocus: true`, `staleTime: 30s`.
- **Feature flags (client):** `constants/features.tsx` (`Warehouses, Branches, ManualJournal, Projects, BankSyncing`) consumed via `useFeatureCan()`, fed from `dashboard.features` Redux slice (server-driven).

---

## 7. Feature-flag mechanism (today)
- **Server:** `Features/FeaturesManager.ts` (`turnOn/turnOff/accessible/all`) backed by `FeaturesSettingsDriver` → persists to the **`settings`** table (`group='features'`), per-tenant. Defaults in `FeaturesConfigure.ts` (Branches/Warehouses off; BankSyncing from env).
- **Client:** `useFeatureCan()` reads `dashboard.features`.
- **Implication for the roadmap:** the program asks for a `feature_flags` table. We have a working, per-tenant, settings-backed flag system already. **Decision needed** (see §10): extend the existing `Features` mechanism vs. introduce a dedicated `feature_flags` table.

---

## 8. Test inventory & coverage
- **Server:** 2 spec files (an empty `App.controller.spec.ts`, `Import/_utils.spec.ts`). Jest configured (`testRegex .*\.spec\.ts$`).
- **Webapp:** 9 pure-function specs (MoneyInputGroup formatting only).
- **E2E (Playwright):** `e2e/authentication.spec.ts`, `e2e/items.spec.ts` (stubs), `e2e/onboarding.spec.ts`.
- **Estimated automated coverage: <5%.** **Zero** tests for GL posting, invoices, bills, payments, manual journals, or financial reports.

> This is the single biggest risk to the program's prime directive (accounting integrity). Milestone 1 (testing foundation) is therefore the real prerequisite for safely doing anything else.

---

## 9. Gap analysis vs. the 15-milestone roadmap
Several milestones are **already partially or largely implemented** — the program should **extend/verify**, not rebuild:

| Milestone | Status in codebase | Implication |
|---|---|---|
| M2 Audit Log | **Exists** — `audit_logs` table + `AuditLogs` + `ee/AuditLogs` modules + API | Verify coverage/completeness, don't rebuild |
| M4 Estimates | **Exists** — `sales_estimates`, approve/reject/deliver/**convert→invoice** | Mostly done; add expiration/acceptance polish |
| M7 Banking | **Partial** — Plaid, bank rules, matching, categorize, reconcile UI | Gap = CSV/OFX/MT940 file import |
| M9 Payments | **Partial** — Stripe, payment links, `payment_integrations` | Gap = PayPal/Razorpay, refunds polish |
| M11 Tax | **Partial** — `tax_rates`, `tax_rate_transactions`, sales-tax report | Gap = multi-jurisdiction GST/VAT/WHT engine |
| M13 Public API | **Partial** — `api_keys` table + auth | Gap = OAuth2, documented public surface, webhooks |
| M14 Reporting | **Strong** — full financial statements + aging + tax summary | Gap = customer/vendor statements, profitability |
| M3 Customer Portal | **Missing** | Net-new (portal users, login, invoice viewing) |
| M5 Sales Orders | **Missing** | Net-new (estimate→SO→delivery→invoice) |
| M6 Purchase Orders | **Missing** | Net-new (PO→goods receipt→bill) |
| M8 Approval Workflow | **Missing** | Net-new |
| M10 Automation | **Missing** | Net-new (trigger/condition/action) |
| M12 Communication Center | **Partial** — Mail module + templates | Gap = reminder scheduling/sequences |

---

## 10. Recommended sequencing & open decisions
**Sequence (matches the roadmap's safety-first intent):**
1. **M1 — Testing foundation FIRST.** Lock down accounting-core behavior with characterization tests (GL entries for invoice/bill/payment/manual-journal, plus Balance Sheet/P&L/Trial Balance numbers) so every later change is regression-checked. This is the safety net the prime directive demands.
2. **Feature-flag infra** (small) so all net-new modules ship disabled-by-default.
3. Then net-new modules in dependency order, each behind a flag, each with migrations+rollbacks and a regression pass: Customer Portal → Sales Orders → Purchase Orders → Approvals → Automation, interleaving the "extend" milestones (banking import, tax, payments, public API, statements).

**Open decisions (need your call before M1):**
- **D1 — Feature flags:** extend the existing settings-backed `Features` module, **or** add a dedicated `feature_flags` table as the roadmap literally states? (Recommendation: extend `Features` — it already works per-tenant and is wired to the client.)
- **D2 — Test scope for M1:** target the roadmap's 90% on accounting core/invoices/bills/reports (large effort), or start with high-value **characterization tests** on GL posting + the 4 core reports (faster safety net, then grow)?
- **D3 — Dev workflow:** run server+webapp in **dev/hot-reload** for this program (fast iteration) vs. the current rebuild-image-per-change loop (slow). Strongly recommend dev mode for a multi-milestone effort.

---

*End of Milestone 0 deliverable. No source files were modified.*
