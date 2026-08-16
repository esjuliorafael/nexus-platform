UPDATE "raffle_result_events" AS event
SET "message" = concat(
  'Se prepar', chr(243), ' el aviso de cambio de fecha para ',
  event."metadata" ->> 'totalRecipients',
  ' destinatario(s).'
)
WHERE event."event_type" = 'DATE_CHANGE_QUEUED';
