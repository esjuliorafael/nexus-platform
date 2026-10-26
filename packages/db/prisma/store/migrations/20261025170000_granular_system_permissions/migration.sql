-- Expand existing grants into explicit capabilities without giving staff new access.
UPDATE "users"
SET "permissions" = ARRAY(
  SELECT DISTINCT permission
  FROM unnest(
    "permissions"
    || CASE WHEN 'users.manage' = ANY("permissions") THEN ARRAY[
      'users.view', 'users.create', 'users.update', 'users.delete',
      'users.permissions.manage'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'users.manage' = ANY("permissions") AND "role"::text = 'SUPERADMIN'
      THEN ARRAY['users.roles.manage']::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'storefront.content.manage' = ANY("permissions") THEN ARRAY[
      'storefront.content.view', 'storefront.branding.view', 'storefront.branding.manage'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'settings.view' = ANY("permissions") THEN ARRAY[
      'storefront.status.view', 'storefront.branding.view', 'inventory.policies.view',
      'raffles.settings.view', 'payments.config.view', 'shipping.view', 'messaging.view'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'settings.manage' = ANY("permissions") THEN ARRAY[
      'storefront.status.manage', 'storefront.branding.manage',
      'inventory.policies.manage', 'shipping.manage', 'payments.config.manage',
      'messaging.manage'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'inventory.audit' = ANY("permissions")
      THEN ARRAY['inventory.reservations.release']::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'raffles.intelligence.view' = ANY("permissions")
      THEN ARRAY['raffles.intelligence.export']::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN "role"::text = 'SUPERADMIN' THEN ARRAY[
      'platform.settings.view', 'platform.settings.manage'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
  ) AS permission
  WHERE permission NOT IN ('users.manage', 'settings.view', 'settings.manage')
);
