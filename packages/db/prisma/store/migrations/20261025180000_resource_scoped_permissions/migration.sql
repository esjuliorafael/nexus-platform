UPDATE "users"
SET "permissions" = ARRAY(
  SELECT DISTINCT permission
  FROM unnest(
    "permissions"
    || CASE WHEN 'users.manage' = ANY("permissions") THEN ARRAY[
      'users.view', 'users.create', 'users.update', 'users.delete',
      'users.permissions.manage'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'settings.view' = ANY("permissions") THEN ARRAY[
      'storefront.status.view', 'storefront.branding.view', 'storefront.heroes.view',
      'storefront.slides.view', 'storefront.announcements.view', 'inventory.policies.view',
      'raffles.settings.view', 'payments.config.view', 'shipping.view', 'messaging.view'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'settings.manage' = ANY("permissions") THEN ARRAY[
      'storefront.status.manage', 'storefront.branding.manage', 'inventory.policies.manage',
      'shipping.manage', 'payments.config.manage', 'messaging.manage'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'products.manage' = ANY("permissions") THEN ARRAY[
      'products.view', 'products.create', 'products.update', 'products.delete'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'payment-links.manage' = ANY("permissions") THEN ARRAY[
      'payment-links.view', 'payment-links.generate', 'payment-links.revoke'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'storefront.content.view' = ANY("permissions") THEN ARRAY[
      'storefront.heroes.view', 'storefront.slides.view', 'storefront.announcements.view'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'storefront.content.manage' = ANY("permissions") THEN ARRAY[
      'storefront.heroes.view', 'storefront.heroes.manage', 'storefront.heroes.delete',
      'storefront.slides.view', 'storefront.slides.manage', 'storefront.slides.delete',
      'storefront.announcements.view', 'storefront.announcements.manage', 'storefront.announcements.delete',
      'storefront.branding.view', 'storefront.branding.manage'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'categories.manage' = ANY("permissions") THEN ARRAY[
      'categories.view', 'categories.delete'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'coupons.manage' = ANY("permissions") THEN ARRAY[
      'coupons.view', 'coupons.delete'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'media.manage' = ANY("permissions") THEN ARRAY[
      'media.view', 'media.delete'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'media.vault.manage' = ANY("permissions") THEN ARRAY[
      'media.vault.view', 'media.vault.upload', 'media.vault.delete'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'raffles.coupons.manage' = ANY("permissions") THEN ARRAY[
      'raffles.coupons.view', 'raffles.coupons.delete'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'inventory.audit' = ANY("permissions") THEN ARRAY[
      'inventory.reservations.release'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'raffles.intelligence.view' = ANY("permissions") THEN ARRAY[
      'raffles.intelligence.export'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN "role"::text = 'SUPERADMIN' THEN ARRAY[
      'platform.settings.view', 'platform.settings.manage'
    ]::TEXT[] ELSE ARRAY[]::TEXT[] END
  ) AS permission
  WHERE permission NOT IN (
    'users.manage', 'settings.view', 'settings.manage', 'products.manage',
    'payment-links.manage', 'storefront.content.view', 'storefront.content.manage',
    'media.vault.manage'
  )
);
