// Backfills the Finqora predefined roles (Accountant, Finance Manager, Viewer)
// into existing tenant databases. Idempotent: a role is only created when no
// role with its slug already exists, so re-running (or running on a freshly
// seeded tenant that already has them) is a no-op. The built-in `admin`
// (Administrator) role is left untouched.
//
// The role/permission definitions are shared with the build-time seeder via a
// dependency-free module so there is a single source of truth.
const { PREDEFINED_ROLES } = require('../../../modules/Roles/PredefinedRoles');

exports.up = async function (knex) {
  // Only backfill tenants that are already seeded (the built-in `admin` role
  // exists). On a fresh tenant build, migrations run *before* the core role
  // seed (which uses hardcoded ids 1/2) — creating roles here first would
  // collide. Fresh tenants get these roles from the build-time seeder instead.
  const adminRole = await knex('roles').where('slug', 'admin').first();
  if (!adminRole) {
    return;
  }
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
};

exports.down = async function (knex) {
  const slugs = PREDEFINED_ROLES.map((role) => role.slug);
  const roles = await knex('roles').whereIn('slug', slugs).select('id');
  const roleIds = roles.map((role) => role.id);

  if (roleIds.length > 0) {
    await knex('role_permissions').whereIn('role_id', roleIds).delete();
    await knex('roles').whereIn('id', roleIds).delete();
  }
};
