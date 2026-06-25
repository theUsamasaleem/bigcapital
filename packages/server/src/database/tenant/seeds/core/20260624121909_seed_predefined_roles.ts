import { TenantSeeder } from '@/libs/migration-seed/TenantSeeder';
import { PREDEFINED_ROLES } from '@/modules/Roles/PredefinedRoles';

/**
 * Seeds the Finqora predefined roles (Accountant, Finance Manager, Viewer) for
 * freshly built tenants. Runs after the core admin/staff role seed, so these
 * take auto-increment ids after the hardcoded 1/2. Idempotent by slug.
 */
export default class SeedPredefinedRoles extends TenantSeeder {
  // eslint-disable-next-line class-methods-use-this
  async up(knex) {
    for (const role of PREDEFINED_ROLES) {
      const existing = await knex('roles').where('slug', role.slug).first();
      if (existing) {
        continue;
      }
      const inserted = await knex('roles').insert({
        name: role.name,
        slug: role.slug,
        description: role.description,
        predefined: true,
      });
      const roleId = Array.isArray(inserted) ? inserted[0] : inserted;

      if (role.permissions.length > 0) {
        await knex('role_permissions').insert(
          role.permissions.map((permission) => ({
            role_id: roleId,
            subject: permission.subject,
            ability: permission.ability,
            value: true,
          })),
        );
      }
    }
  }
}
