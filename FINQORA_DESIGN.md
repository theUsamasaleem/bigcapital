# Finqora — Feature Design & Implementation Blueprint

> On-premise accounting & business-management system for a single local company
> (3–4 internal users). Built on the existing NestJS + Objection/Knex (MySQL) +
> React codebase. **Out of scope (do not build):** Customer Portal, Vendor
> Portal, Mobile App, Public Registration, SaaS multi-tenant features.
>
> The app remains technically tenant-scoped under the hood (one tenant DB), which
> is fine for on-prem — no architectural change is needed, and every new module
> simply lives in the tenant database like the rest.

---

## 0. Architecture conventions (all new modules MUST follow)

Derived from the existing codebase (see `BIGCAPITAL_ARCHITECTURE.md`) and the
already-shipped `Approvals` module, which is the reference implementation.

| Concern | Convention |
|---|---|
| Module layout | `modules/<Name>/{Name}.module.ts`, `{Name}.controller.ts`, `commands/` (writes), `queries/` (reads), `models/`, `subscribers/`, `dtos/`, `types/` |
| ORM | Objection model extends `BaseModel`; register in `TenancyModels/Tenancy.module.ts` `models[]`; inject via `@Inject(Model.name) TenantModelProxy<typeof Model>` |
| DB changes | Knex tenant migration in `database/tenant/migrations/<ts>_*.ts` with **`up` and `down`** |
| Transactions | `UnitOfWork.withTransaction(trx => …)` for all multi-write commands |
| Events | `EventEmitter2` + constants in `common/events/events.ts`; `*ing`/`*ed` pre/post pairs |
| AuthZ | `AbilitySubject` enum + `AbilitySchema.ts` entry + `@RequirePermission(action, subject)` |
| Feature gating | extend the existing settings-backed `Features` module (flag **off by default**, per the Approvals pattern) |
| Casing | server speaks camelCase internally; `SerializeInterceptor` converts request snake→camel and response camel→snake |
| Frontend | React Query (`hooks/query/<domain>`), Formik + Blueprint, container per domain under `containers/` |
| Current user / IP | `TenancyContext.getSystemUser()`; IP from request (`x-forwarded-for` via a small decorator) |
| Tests | Jest unit (`*.spec.ts`) for services; e2e (`*.e2e-spec.ts`) per the `test/` harness |

**Prime directive (unchanged):** never alter GL posting behavior. New modules are
additive; where they touch posting documents (Bills, Expenses, Journals) they
*gate* state transitions (e.g. require approval before publish) but never change
the produced GL entries.

---

## 1. Gap analysis — build vs extend

| # | Module | Existing today | Action |
|---|---|---|---|
| 1 | Audit Trail | `audit_logs` table, `AuditLogs` + `ee/AuditLogs` modules, CASL `AuditLog` | **EXTEND** — universal old/new value + IP capture, search UI |
| 2 | Document Management | `Attachments` module, `documents`/`document_links`/`media` tables, S3/local driver | **EXTEND** — version history, wire to PO/Vendor/Customer, delete permission |
| 3 | Approval Workflow | **`Approvals` module already shipped** (flag-gated: request/approve/reject) | **EXTEND** — configurable multi-level rules + document gates |
| 4 | Pakistan Tax | `tax_rates`, `tax_rate_transactions`, sales-tax summary report | **EXTEND** — GST/SST/WHT types + WHT engine + reports |
| 5 | Enhanced Purchase | Bills exist; no PO/Requisition/RFQ | **NET-NEW** — Requisition→RFQ→PO→GoodsReceipt→Bill |
| 6 | Enhanced Inventory | `warehouses`, inventory txns, adjustments, transfers | **EXTEND** — serial/batch, reorder, alerts |
| 7 | Fixed Assets | none | **NET-NEW** |
| 8 | Budgeting | none | **NET-NEW** |
| 9 | Executive Dashboard | `Dashboard` module + meta endpoints | **EXTEND** — widgets/charts |
| 10 | Advanced Reporting | **Strong** — BS, P&L, Trial Balance, GL, Cash Flow, Journal already exist | **VERIFY/POLISH** — export consistency only |
| 11 | Internal Notifications | `Mail` + `Socket` modules | **NET-NEW** — in-app notification center |
| 12 | Backup & Restore | none | **NET-NEW** (on-prem mysqldump-based) |

> Reporting (#10) is largely complete already — treat it as the lowest-effort item
> (verify the 5 statements export to PDF/Excel cleanly), not a rebuild.

---

## 2. Database design (new/changed tables, per module)

All tenant-DB tables, snake_case columns, `id` PK, `created_at`/`updated_at`.

### 1) Audit Trail — extend `audit_logs`
Add columns: `old_values` JSON, `new_values` JSON, `module` varchar, `entity_id`,
`ip` (exists), keep `action`,`subject`,`user_id`. Indexes on
`(subject, subject_id)`, `(user_id)`, `(created_at)`.

### 2) Document Management
- `document_versions` (`document_id` FK, `version` int, `media_id`, `uploaded_by`, `size`, `mime`, `created_at`)
- reuse `documents`/`document_links` for polymorphic linking (`link_type`,`link_id`).

### 3) Approval Workflow (extends shipped module)
- `approval_rules` (`document_type`, `min_amount`, `max_amount`, `active`, `order`)
- `approval_rule_levels` (`rule_id` FK, `level` int, `approver_role_id` | `approver_user_id`)
- `approval_requests` (**exists**) + add `rule_id`, `current_level`
- `approval_request_actions` (`request_id`, `level`, `user_id`, `action`, `reason`, `acted_at`)

### 4) Pakistan Tax
- extend `tax_rates`: `tax_type` enum(`GST`,`SST`,`WHT`,`OTHER`), `jurisdiction`, `is_withholding` bool, `wht_section` varchar
- `withholding_tax_entries` (`source_type`,`source_id`,`tax_rate_id`,`base_amount`,`wht_amount`,`certificate_no`,`date`)

### 5) Enhanced Purchase
- `purchase_requisitions` + `purchase_requisition_entries`
- `rfqs` + `rfq_entries` + `rfq_vendors` (vendor quotes for comparison)
- `purchase_orders` + `purchase_order_entries` (status: draft/approved/sent/received/closed)
- `goods_receipts` + `goods_receipt_entries` (link PO → received qty)
- Bill gains optional `purchase_order_id`

### 6) Enhanced Inventory
- `item_serials` (`item_id`,`warehouse_id`,`serial_no`,`status`,`ref_type`,`ref_id`)
- `item_batches` (`item_id`,`warehouse_id`,`batch_no`,`expiry_date`,`quantity`)
- extend `items`: `reorder_level`, `reorder_quantity`, `track_serial` bool, `track_batch` bool

### 7) Fixed Assets
- `fixed_assets` (`name`,`code`,`category`,`acquisition_date`,`cost`,`salvage_value`,`useful_life_months`,`method` enum(`straight_line`,`reducing_balance`),`asset_account_id`,`accum_dep_account_id`,`dep_expense_account_id`,`status`,`branch_id`)
- `asset_depreciation_schedule` (`asset_id`,`period`,`amount`,`book_value`,`posted` bool,`journal_id`)
- `asset_disposals` (`asset_id`,`date`,`proceeds`,`gain_loss`,`journal_id`)
- `asset_maintenance` (`asset_id`,`date`,`description`,`cost`,`vendor_id`)

### 8) Budgeting
- `budgets` (`name`,`fiscal_year`,`start_date`,`end_date`,`type` enum(`annual`,`department`),`department`,`status`)
- `budget_lines` (`budget_id`,`account_id`,`period`,`amount`)
- Budget-vs-Actual is computed from `accounts_transactions` (no extra table).

### 11) Notifications
- `notifications` (`user_id`,`type`,`title`,`body`,`link`,`entity_type`,`entity_id`,`read_at`,`created_at`)

### 12) Backup & Restore
- `backups` (`filename`,`size`,`type` enum(`manual`,`scheduled`),`status`,`created_by`,`created_at`,`path`)

---

## 3. API surface (representative, all under `/api`, CASL-guarded)

- **Audit:** `GET /audit-logs?subject&user&action&from&to&q` (search), `GET /audit-logs/:id`
- **Documents:** `POST /documents/:linkType/:linkId`, `GET …`, `GET /documents/:id/versions`, `GET /documents/:id/download`, `DELETE /documents/:id`
- **Approvals:** (exists) + `GET/POST/PUT /approval-rules`, gate hooks on publish
- **Tax:** `GET/POST/PUT /tax-rates` (typed), `GET /reports/tax-summary?type=GST|SST|WHT`, `GET /reports/wht-statement`
- **Purchase:** `…/purchase-requisitions`, `…/rfqs` (+`/compare`), `…/purchase-orders` (+`/approve`,`/send`,`/receive`), `…/goods-receipts`
- **Inventory:** `…/items/:id/serials`, `…/items/:id/batches`, `GET /inventory/reorder-alerts`, reports `stock-movement`,`inventory-aging`,`inventory-valuation` (last exists)
- **Fixed Assets:** `…/fixed-assets` (CRUD), `POST /:id/depreciate`, `POST /:id/dispose`, `POST /:id/transfer`, `…/:id/maintenance`, reports `asset-summary`,`depreciation`
- **Budgeting:** `…/budgets` + `…/budgets/:id/lines`, `GET /budgets/:id/vs-actual`
- **Dashboard:** `GET /dashboard/executive` (aggregated widgets)
- **Notifications:** `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`, SSE/WebSocket via existing `Socket`
- **Backup:** `POST /backups`, `GET /backups`, `POST /backups/:id/restore`, `GET /backups/:id/download`

---

## 4. Module deep-design notes

- **Audit (universal):** a global Objection `$afterInsert/$afterUpdate/$afterDelete`
  hook or a `@SubscribeAudit()` interceptor that diffs old vs new and writes
  `audit_logs` with `module`, `old_values`, `new_values`, `ip`, `user_id`. Use an
  allow-list of audited models to avoid noise. UI: a searchable, filterable table
  (React Query + DataTable) reusing the existing AuditLogs container.

- **Approval Workflow (config):** evaluate `approval_rules` by `document_type` +
  amount → build the level chain from `approval_rule_levels`. On document publish
  (`OpenBill`/`PublishExpense`/`PublishJournal`/PO approve) a flag-gated guard
  checks for an `approved` request; otherwise blocks with a clear error. Each
  level approval advances `current_level`; final level flips status. Emits
  `approval.*` events that feed Notifications (#11).

- **Pakistan Tax / WHT:** GST/SST are output/input VAT-style (already representable
  by `tax_rates` + `tax_rate_transactions`); add `tax_type` + reports. **WHT** is
  withholding at payment time: when recording a Payment Made / Bill, compute WHT on
  the taxable base, post the withheld portion to a WHT-payable account, and record
  a `withholding_tax_entries` row + certificate number. Dedicated screens: Tax
  Rates (typed), Tax Summary, WHT Statement.

- **Fixed Assets:** depreciation job computes monthly schedule (straight-line /
  reducing-balance), posts a Manual-Journal-equivalent GL entry (Dr Dep Expense,
  Cr Accum Dep) **through the existing Ledger layer** — never hand-rolled — and
  marks the period posted. Disposal computes gain/loss vs book value and posts the
  reversal + proceeds. This is the only net-new module that touches GL, so it must
  reuse `Ledger/LedgerStorage` exactly like other documents.

- **Budgeting:** pure additive; Budget-vs-Actual reads `accounts_transactions`
  summed by account/period and diffs against `budget_lines`. No GL impact.

- **Notifications:** event subscribers on `approval.*`, due-date cron (existing
  BullMQ), and inventory reorder checks insert `notifications` rows and push via
  the existing `Socket` module; a bell/Notification Center in the topbar.

- **Backup & Restore (on-prem):** a server command shells `mysqldump` of the
  tenant DB to a configured path, records `backups`; scheduled via BullMQ cron;
  restore streams a chosen dump back via `mysql`. Admin-only CASL subject. (On-prem
  only — safe because there's no multi-tenant blast radius.)

---

## 5. Incremental implementation sequence

Ordered by value-per-risk, dependencies, and reuse. Each item ships behind a
feature flag, with migration+rollback, services, controller, React UI, unit +
e2e tests, and docs — then is validated before the next.

**Phase 1 (foundation):**
1. **Audit Trail completion** (low risk, high governance value; pure additive)
2. **Approval Workflow configuration** (builds directly on the shipped Approvals module)
3. **Document Management** versioning + wiring (extends Attachments)
4. **Pakistan Tax engine** (GST/SST typing + WHT + reports)

**Phase 2 (operations):**
5. **Fixed Assets** (net-new; GL via Ledger — highest care)
6. **Budgeting** (net-new; no GL)
7. **Enhanced Inventory** (serial/batch/reorder/alerts)
8. **Enhanced Purchase** (Requisition→RFQ→PO→GoodsReceipt→Bill) — largest; do last in phase

**Phase 3 (management):**
9. **Internal Notifications** (consumes events from #2/#5/#7)
10. **Executive Dashboard** (consumes data from all above)
11. **Advanced Reporting** polish (verify exports; mostly done)
12. **Backup & Restore** (on-prem ops)

---

## 6. Deliverables per module (definition of done)

1. DB migration (`up`+`down`) 2. Objection model(s) + repository pattern via
services 3. REST APIs (controller + command/query services) 4. React UI
(container + RQ hooks + Blueprint forms) 5. CASL subject + feature flag 6. Unit
tests (services) 7. e2e tests (endpoints) 8. Short module doc in `/docs`.

**Constraints honored:** no Customer/Vendor portal, no mobile, no public signup,
no SaaS features; on-prem single-company; existing Docker image untouched until
you choose to rebuild post-demo.
