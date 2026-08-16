UPDATE "raffle_result_events" AS event
SET "event_type" = 'DATE_CHANGE_QUEUED'
FROM "raffle_draw_reminder_campaigns" AS campaign
WHERE event."event_type" = 'DRAW_REMINDER_QUEUED'
  AND event."raffle_id" = campaign."raffle_id"
  AND (event."metadata" ->> 'campaignId') = campaign."id"::text
  AND campaign."kind" = 'DATE_CHANGE';
