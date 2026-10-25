UPDATE "users"
SET "permissions" = array_remove("permissions", 'dashboard.view')
  || ARRAY['dashboard.operations.view']::TEXT[]
  || CASE
    WHEN "role"::text IN ('SUPERADMIN', 'ADMIN') THEN ARRAY[
      'dashboard.sales.view',
      'dashboard.milestones.view',
      'dashboard.milestones.acknowledge',
      'messaging.cost.view'
    ]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END
WHERE 'dashboard.view' = ANY("permissions");
