# Kapso Local Pilot

This pilot validates one WhatsApp number on the Kapso Free plan. Production
remains unchanged; local automatic delivery can be enabled independently after
the required Meta templates are approved.

## Safety boundary

- Work from the `codex/kapso-local-pilot` branch.
- Do not use a production notification number during the first test.
- Keep `KAPSO_PILOT_ENABLED` unset or `false` in Contabo.
- Keep `KAPSO_DELIVERY_ENABLED=false` in Contabo until the tenant rollout.
- Workers only use an exact template version reported as `APPROVED`.

## Required Kapso data

From the Kapso project:

- Project API key
- WhatsApp `phone_number_id`
- Meta `business_account_id`
- A random webhook secret generated locally

Store them only in `apps/api/.env`:

```dotenv
KAPSO_PILOT_ENABLED=true
KAPSO_DELIVERY_ENABLED=true
KAPSO_API_KEY="..."
KAPSO_PHONE_NUMBER_ID="..."
KAPSO_BUSINESS_ACCOUNT_ID="..."
KAPSO_WEBHOOK_SECRET="..."
KAPSO_API_BASE_URL="https://api.kapso.ai"
```

## Local pilot identity

The July 2026 local pilot uses these non-secret Kapso and Meta identifiers:

- Kapso project: `bd530dc9-7dd0-4af8-bc42-7cba007c36cd`
- Kapso customer: `db51d7e0-111e-449f-8828-03c1756c3a9e`
- Kapso WhatsApp config: `14e7ec52-6138-430a-858f-8273f1ae6644`
- Meta phone number ID: `1163292596877250`
- Meta business account ID: `1386130106746750`
- Connection type: Coexistence
- Pilot template: `nexus_local_pilot`
- Pilot template ID: `1845844909722838`

The API key and webhook secret remain only in `apps/api/.env`. Never commit the
temporary setup link or a Cloudflare quick-tunnel URL.

## Test API

All diagnostic routes require an Admin JWT:

```text
GET  /api/v1/admin/whatsapp/kapso/diagnostics
GET  /api/v1/admin/whatsapp/kapso/templates
GET  /api/v1/admin/whatsapp/kapso/messages
POST /api/v1/admin/whatsapp/kapso/test-text
POST /api/v1/admin/whatsapp/kapso/test-template
POST /api/v1/admin/whatsapp/kapso/register-webhook
POST /api/v1/admin/whatsapp/kapso/sync-templates
GET  /api/v1/admin/whatsapp/kapso/template-readiness
```

Kapso sends message events to:

```text
POST /api/v1/webhooks/kapso
```

The webhook verifies `X-Webhook-Signature` using HMAC-SHA256 and stores delivery
progress in `whatsapp_message_logs`.

`test-text` only works inside WhatsApp's customer-service window. Send a
message from the recipient to the connected business number first, then use
the route to reply. Outside that window, use an approved template.

For local testing, expose port `3001` through a temporary tunnel and register
the resulting public base URL. Quick-tunnel URLs are ephemeral; create and
register a new one whenever the tunnel changes.

## Template constraint

Evolution templates in Nexus are free-form text. WhatsApp Cloud API requires a
Meta-approved template to start a conversation outside the 24-hour service
window. Nexus creates versioned `UTILITY` templates in `es_MX` with named
parameters. Editing a message changes its content hash and requires approval of
a new Meta template. While a required version is pending or rejected, delivery
stays on the configured Principal/Evolution fallback.
