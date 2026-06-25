import { PREDEFINED_ROLES } from './PredefinedRoles';
import { AbilitySchema } from './AbilitySchema';
import { getInvalidPermissions } from './utils';

/**
 * Validates the Phase 2.3 predefined-role matrix. The most important guarantee
 * is that every (subject, ability) pair actually exists in the canonical
 * AbilitySchema — otherwise the seeded permission would silently never match a
 * RequirePermission check.
 */
describe('PredefinedRoles', () => {
  const bySlug = (slug: string) =>
    PREDEFINED_ROLES.find((r) => r.slug === slug)!;

  it('seeds accountant, finance-manager and viewer with unique slugs', () => {
    const slugs = PREDEFINED_ROLES.map((r) => r.slug);
    expect(new Set(slugs)).toEqual(
      new Set(['accountant', 'finance-manager', 'viewer']),
    );
  });

  it('every permission is valid against the AbilitySchema', () => {
    for (const role of PREDEFINED_ROLES) {
      const invalid = getInvalidPermissions(AbilitySchema, role.permissions);
      expect({ slug: role.slug, invalid }).toEqual({
        slug: role.slug,
        invalid: [],
      });
    }
  });

  it('has no duplicate permissions within a role', () => {
    for (const role of PREDEFINED_ROLES) {
      const keys = role.permissions.map((p) => `${p.subject}:${p.ability}`);
      expect(keys.length).toBe(new Set(keys).size);
    }
  });

  const keyset = (slug: string) =>
    new Set(bySlug(slug).permissions.map((p) => `${p.subject}:${p.ability}`));

  it('forms a Viewer ⊆ Accountant ⊆ Finance Manager hierarchy', () => {
    const viewer = keyset('viewer');
    const accountant = keyset('accountant');
    const financeManager = keyset('finance-manager');

    for (const k of viewer) expect(accountant.has(k)).toBe(true);
    for (const k of accountant) expect(financeManager.has(k)).toBe(true);
  });

  it('grants approval Approve/Reject only to Finance Manager', () => {
    expect(keyset('finance-manager').has('Approval:Approve')).toBe(true);
    expect(keyset('finance-manager').has('Approval:Reject')).toBe(true);
    expect(keyset('accountant').has('Approval:Approve')).toBe(false);
    expect(keyset('viewer').has('Approval:Approve')).toBe(false);
  });

  it('keeps the Viewer read-only (no Create/Edit/Delete)', () => {
    for (const p of bySlug('viewer').permissions) {
      expect(['Create', 'Edit', 'Delete']).not.toContain(p.ability);
    }
  });
});
