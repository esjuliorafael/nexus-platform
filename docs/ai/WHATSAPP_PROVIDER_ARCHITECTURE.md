# WhatsApp Provider Architecture

Nexus separates notification business rules from the provider used to deliver
each message.

## Providers

- `EVOLUTION`: existing Baileys/Evolution API delivery.
- `KAPSO`: WhatsApp Cloud API through Kapso.

The shared provider contract lives in:

```text
apps/api/src/services/whatsapp
```

Evolution already sends through that contract. Kapso implements the same
contract for text and approved-template messages.

## Channel configuration

Specialized channels persist both provider configurations:

- `provider`
- `instance_name`, `evolution_url`, `evolution_key`
- `kapso_phone_number_id`, `kapso_business_account_id`

The Principal Channel stores the equivalent values in settings:

- `whatsapp_main_provider`
- `whatsapp_evolution_instance`
- `whatsapp_main_kapso_phone_number_id`
- `whatsapp_main_kapso_business_account_id`

Switching providers must not erase the inactive provider configuration. This
allows an immediate rollback without pairing the WhatsApp device again.

`KAPSO_API_KEY` remains an API environment secret shared by the tenant
deployment. It is never returned to Admin or stored in a channel row.

## Operational activation

Automatic jobs resolve the configured provider for each specialized channel and
then the Principal Channel. Kapso is used only when all of these conditions are
true for the specific message:

1. `KAPSO_DELIVERY_ENABLED=true`.
2. The channel has a Phone Number ID and Business Account ID.
3. The current Nexus message has a matching Cloud template mapping.
4. Meta reports that exact content version as `APPROVED`.

If any preflight condition is missing, Nexus uses the Principal Channel and
ultimately its preserved Evolution configuration. An ambiguous Kapso transport
error is retried by BullMQ without sending through a second provider. A final
`failed` webhook may schedule the controlled fallback because Meta has then
confirmed that the original message was not delivered.

## Delivery policy

Provider selection is centralized by notification type. It does not depend on
message length or template complexity.

- `CRITICAL`: payment confirmations and winner notifications prefer Kapso,
  then Evolution.
- `CAMPAIGN`: raffle opening notices, invitations, and participant result
  campaigns prefer Kapso, then Evolution.
- `OPERATIONAL`: reservations, releases, restorations, reminders, and payment
  recovery prefer Evolution, then Kapso.

Within each provider, Nexus preserves sender ownership: the specialized channel
is attempted before the Principal Channel. A missing configuration or a
definitive synchronous rejection may advance to the next route. An accepted,
pending, rate-limited, or otherwise ambiguous response never triggers an
immediate second send.

Asynchronous provider failures use the same matrix. The first fallback changes
from a specialized sender to the Principal Channel; a confirmed failure at the
Principal Channel changes provider. Fallback depth is capped to prevent loops.
Every message log records the delivery class, provider priority, route, and
fallback reason under `responsePayload.nexusRouting`.

Kapso also has a tenant-level master switch:

- `whatsapp_kapso_delivery_enabled=1` keeps the policy matrix active.
- `whatsapp_kapso_delivery_enabled=0` removes Kapso from every route and sends
  all notification types through Evolution.

The server variable `KAPSO_DELIVERY_ENABLED` remains the infrastructure-level
kill switch. Both switches must be enabled for Kapso to send. Disabling the
tenant switch preserves credentials and approved templates for later use.

## Template lifecycle

The Principal Channel is the only editable source of message content. A
specialized channel can override sender identity, provider credentials, bank
details, and Mercado Pago, but it cannot override the message body. Existing
specialized template rows are retained as historical data and are ignored by
delivery and future Cloud synchronization.

Nexus creates `UTILITY` templates with named parameters. The template name
contains a hash of its body, so editing a Nexus template creates a new reviewable
version and cannot silently reuse an approval for stale content.

Admin exposes content editing only in the Principal Channel. Specialized
channels show the canonical catalog as read-only and may synchronize an exact
copy into their own WhatsApp Business Account when their Kapso configuration
requires it. Delivery remains on the safe fallback while a version is `PENDING`,
`REJECTED`, `ERROR`, or out of date.

Kapso webhooks reconcile `sent`, `delivered`, `read`, and `failed` without
regressing a terminal delivery state.

## Payment recovery rollout

Payment recovery notices are gated by the server variable
`PAYMENT_RECOVERY_ENABLED` and the tenant setting
`payment_recovery_enabled`. The server default is `false`; only the exact
environment value `true`, an enabled tenant preference, and ready templates
allow a definitive rejected card payment to claim its active hold and schedule
a delayed WhatsApp job.

Before enabling it for a tenant:

1. Configure the Store and Raffles `PAYMENT_RECOVERY` source templates.
2. Synchronize both Cloud templates and wait for `APPROVED`.
3. Verify the recovery link with a controlled rejected payment.
4. Confirm that a successful retry or conversion to bank transfer consumes the
   same hold and invalidates the link.
5. Set `PAYMENT_RECOVERY_ENABLED=true` and restart the API.

Disabling the flag stops new recovery jobs. It does not invalidate an already
issued link or interfere with an existing payment hold.
