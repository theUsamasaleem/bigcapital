/**
 * Finqora predefined roles (Phase 2.3 RBAC).
 *
 * This module is intentionally dependency-free (no `@/` aliases, no enum
 * imports) so it can be required from both the build-time tenant seeder
 * (alias-aware) and a knex migration (which may run without alias resolution).
 * The subject / ability strings are kept in sync with `AbilitySchema.ts` and
 * the per-module action enums by value.
 *
 * Note: the `admin` role is seeded separately and resolves to full
 * `manage all` access by slug (see TenantAbilities.getSuperAdminRules). Its
 * display name is "Administrator". These three roles fill the rest of the
 * Administrator / Accountant / Finance Manager / Viewer matrix.
 */

export interface PredefinedPermission {
  subject: string;
  ability: string;
}

export interface PredefinedRoleDef {
  slug: string;
  name: string;
  description: string;
  permissions: PredefinedPermission[];
}

// Subjects that follow the standard View/Create/Edit/Delete action set.
const CRUD_SUBJECTS = [
  'Account',
  'Item',
  'Customer',
  'Vendor',
  'SaleEstimate',
  'SaleInvoice',
  'SaleReceipt',
  'CreditNode', // matches AbilitySubject.CreditNote value ('CreditNode')
  'PaymentReceive',
  'Bill',
  'VendorCredit',
  'PaymentMade',
  'Expense',
  'ManualJournal',
  'InventoryAdjustment',
];

// All report read abilities (kept in sync with ReportsAction in AbilitySchema).
const REPORT_ABILITIES = [
  'read-balance-sheet',
  'read-profit-loss',
  'read-journal',
  'read-general-ledger',
  'read-cashflow',
  'read-ar-aging-summary',
  'read-ap-aging-summary',
  'read-purchases-by-items',
  'read-sales-by-items',
  'read-customers-transactions',
  'read-vendors-transactions',
  'read-customers-summary-balance',
  'read-vendors-summary-balance',
  'read-inventory-valuation-summary',
  'read-inventory-item-details',
];

const crud = (subject: string, abilities: string[]): PredefinedPermission[] =>
  abilities.map((ability) => ({ subject, ability }));

const allReports = (): PredefinedPermission[] =>
  REPORT_ABILITIES.map((ability) => ({ subject: 'Report', ability }));

const viewAllCrud = (): PredefinedPermission[] =>
  CRUD_SUBJECTS.map((subject) => ({ subject, ability: 'View' }));

const fullAllCrud = (): PredefinedPermission[] =>
  CRUD_SUBJECTS.flatMap((subject) =>
    crud(subject, ['View', 'Create', 'Edit', 'Delete']),
  );

/**
 * Viewer — read-only across the application and all reports.
 */
const VIEWER: PredefinedRoleDef = {
  slug: 'viewer',
  name: 'Viewer',
  description: 'Read-only access to records and reports.',
  permissions: [
    ...viewAllCrud(),
    { subject: 'Cashflow', ability: 'View' },
    { subject: 'Attachment', ability: 'View' },
    { subject: 'Approval', ability: 'View' },
    ...allReports(),
  ],
};

/**
 * Accountant — full day-to-day bookkeeping; can submit for approval but cannot
 * approve, change system preferences, or manage roles.
 */
const ACCOUNTANT: PredefinedRoleDef = {
  slug: 'accountant',
  name: 'Accountant',
  description:
    'Day-to-day bookkeeping across sales, purchases, banking and journals.',
  permissions: [
    ...fullAllCrud(),
    ...crud('Cashflow', ['View', 'Create', 'Delete']),
    ...crud('Attachment', ['View', 'Delete']),
    { subject: 'Approval', ability: 'View' },
    { subject: 'Approval', ability: 'Request' },
    ...allReports(),
  ],
};

/**
 * Finance Manager — everything the Accountant can do, plus approvals, audit log
 * visibility and system preferences.
 */
const FINANCE_MANAGER: PredefinedRoleDef = {
  slug: 'finance-manager',
  name: 'Finance Manager',
  description:
    'Bookkeeping plus approvals, audit-log review and system preferences.',
  permissions: [
    ...fullAllCrud(),
    ...crud('Cashflow', ['View', 'Create', 'Delete']),
    ...crud('Attachment', ['View', 'Delete']),
    { subject: 'AuditLog', ability: 'View' },
    { subject: 'Preferences', ability: 'Mutate' },
    { subject: 'Approval', ability: 'View' },
    { subject: 'Approval', ability: 'Request' },
    { subject: 'Approval', ability: 'Approve' },
    { subject: 'Approval', ability: 'Reject' },
    ...allReports(),
  ],
};

/**
 * Director — executive second-level approver for high-value documents
 * (> 100,000 PKR). Read access across records and reports, plus full approval
 * authority; not a day-to-day bookkeeper (no create/edit/delete).
 */
const DIRECTOR: PredefinedRoleDef = {
  slug: 'director',
  name: 'Director',
  description:
    'Executive oversight: views records and reports and gives final approval.',
  permissions: [
    ...viewAllCrud(),
    { subject: 'Cashflow', ability: 'View' },
    { subject: 'Attachment', ability: 'View' },
    { subject: 'AuditLog', ability: 'View' },
    { subject: 'Approval', ability: 'View' },
    { subject: 'Approval', ability: 'Approve' },
    { subject: 'Approval', ability: 'Reject' },
    ...allReports(),
  ],
};

/**
 * The roles seeded in addition to the built-in `admin` (Administrator) role.
 */
export const PREDEFINED_ROLES: PredefinedRoleDef[] = [
  ACCOUNTANT,
  FINANCE_MANAGER,
  VIEWER,
  DIRECTOR,
];
