# Payment Hold Architecture

## Objective

Card payments must not create commercial records before Mercado Pago approves the charge.

- `Order` represents a real store order.
- `TicketSale` represents a real raffle participation.
- `StorePaymentHold` and `RafflePaymentHold` represent temporary checkout inventory claims.
- `OrderPaymentAttempt` and `RafflePaymentAttempt` preserve the technical payment audit trail.

Admin order and participation views read only commercial records. They never list payment holds.

## Store flow

1. The checkout validates customer, shipping, coupon, inventory and total.
2. `POST /api/v1/store/orders/payment-holds` creates a short-lived hold and reserves inventory atomically.
3. The embedded Mercado Pago form charges against `store_hold_<hold_id>`.
4. A rejected payment updates only the attempt and leaves the hold available for another card attempt until expiry.
5. An approved payment promotes the hold to one paid `Order` in a transaction.
6. An unused hold releases inventory and coupon usage when it expires.

Transfers keep the existing behavior: they create a pending `Order` immediately because the order itself is the manual-payment reservation.

## Raffle flow

1. The checkout validates the raffle window, folios and coupon.
2. `POST /api/v1/raffles/:id/payment-holds` creates a short-lived hold for all selected folios.
3. Transfer reservations and card holds share a PostgreSQL advisory lock per raffle, preventing concurrent claims.
4. The embedded Mercado Pago form charges against `raffle_hold_<raffle_id>_<hold_id>`.
5. A rejected payment creates no `TicketSale`.
6. An approved payment promotes the complete hold to one paid reservation group.
7. Expiry removes the held folios and publishes the availability change.

Transfers keep creating pending `TicketSale` rows because those rows represent the manual-payment reservation.

## Required invariants

- A card rejection never creates an `Order` or `TicketSale`.
- A hold promotion is idempotent across API response, webhook and reconciliation.
- An approved payment is recorded on the hold before local promotion is attempted.
- A payment still reported as `pending`, `in_process` or `authorized` keeps its hold and is reconciled again.
- A network-uncertain attempt is searched by `external_reference` before inventory is released.
- The tenant-configurable retry window is stored in `mp_payment_hold_minutes`, defaults to 30 minutes and is clamped to 5-60 minutes.
- Non-terminal Mercado Pago payments are reconciled every 10 minutes. This cadence is platform policy, not tenant configuration.
- After the processing limit (120 minutes by default), Nexus requests cancellation from Mercado Pago and reconciles again before releasing inventory.
- `MP_PAYMENT_PROCESSING_MAX_MINUTES` can change the platform processing limit between 60 minutes and 24 hours.
- If cancellation or reconciliation cannot be confirmed, the hold remains closed and another reconciliation is scheduled. Inventory is never released from an ambiguous payment state.
- WhatsApp payment confirmation is queued only by the first successful promotion.
- Store products and raffle folios cannot be claimed by a transfer and a card hold concurrently.
- A customer may change from card to transfer only when the card attempt is terminal or was never sent.
- Conversion promotes the existing hold atomically; it never releases and reserves the same inventory again.
- A pending, in-process or authorized payment is cancelled and reconciled before conversion.
- An approved payment always promotes the hold as paid, even if transfer conversion was requested concurrently.
- Card processing claims an `ACTIVE` hold before contacting Mercado Pago, making charging and transfer conversion mutually exclusive.

## State transitions

```text
ACTIVE -> PROCESSING -> CONSUMED
   |          |
   |          +-> ACTIVE (rejected; customer may retry)
   +------------> EXPIRED (no approved or processing payment)
```

`CANCELLED` is reserved for an explicit customer or operator cancellation flow.
