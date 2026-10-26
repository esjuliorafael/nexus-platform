UPDATE "users"
SET "permissions" = array_append("permissions", 'dashboard.history.view')
WHERE (
    'orders.view' = ANY("permissions")
    OR 'raffles.participations.view' = ANY("permissions")
  )
  AND 'users.manage' = ANY("permissions")
  AND NOT 'dashboard.history.view' = ANY("permissions");
