ALTER TABLE "users"
ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "users"
SET "permissions" = CASE "role"::text
  WHEN 'SUPERADMIN' THEN ARRAY[
    'dashboard.view', 'orders.view', 'orders.manage', 'orders.financial.manage',
    'orders.refund', 'orders.restore', 'payment-links.manage', 'products.view',
    'products.manage', 'categories.manage', 'storefront.content.manage',
    'shipping.view', 'shipping.manage', 'payments.config.manage', 'settings.view',
    'settings.manage', 'billing.view', 'billing.manage', 'channels.view',
    'channels.manage', 'messaging.view', 'messaging.manage', 'messaging.send',
    'coupons.manage', 'media.manage', 'media.upload', 'media.vault.manage',
    'inventory.audit', 'raffles.view', 'raffles.manage', 'raffles.results.manage',
    'raffles.participations.view', 'raffles.participations.manage',
    'raffles.financial.manage', 'raffles.coupons.manage', 'raffles.settings.manage',
    'raffles.intelligence.view', 'raffles.intelligence.manage', 'users.manage'
  ]::TEXT[]
  WHEN 'ADMIN' THEN ARRAY[
    'dashboard.view', 'orders.view', 'orders.manage', 'orders.financial.manage',
    'orders.refund', 'orders.restore', 'payment-links.manage', 'products.view',
    'products.manage', 'categories.manage', 'storefront.content.manage',
    'shipping.view', 'settings.view', 'billing.view', 'billing.manage', 'channels.view',
    'channels.manage', 'messaging.view', 'messaging.manage', 'messaging.send',
    'coupons.manage', 'media.manage', 'media.upload', 'media.vault.manage',
    'inventory.audit', 'raffles.view', 'raffles.manage', 'raffles.results.manage',
    'raffles.participations.view', 'raffles.participations.manage',
    'raffles.financial.manage', 'raffles.coupons.manage', 'raffles.settings.manage',
    'raffles.intelligence.view', 'raffles.intelligence.manage', 'users.manage'
  ]::TEXT[]
  ELSE ARRAY[
    'dashboard.view', 'orders.view', 'products.view', 'shipping.view', 'settings.view',
    'billing.view', 'channels.view', 'messaging.view', 'media.manage',
    'raffles.view', 'raffles.participations.view'
  ]::TEXT[]
END;
