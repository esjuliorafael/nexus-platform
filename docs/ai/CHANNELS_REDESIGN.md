# Channels Redesign Specification

## Purpose

Redesign the Admin Channels screen so it clearly represents the real operational model:

Every payment or WhatsApp notification tries to use a specialized channel first. If no specialized channel exists or if it is incomplete, the system falls back to the Principal Channel.

The screen must make this fallback logic visible, editable, and trustworthy.

## Current Problem

The existing screen mixes several concepts:

- tenant-global fallback configuration stored in `settings`
- specialized payment channels stored in `payment_channels`
- specialized WhatsApp channels stored in `whatsapp_channels`
- Mercado Pago OAuth at both global and channel level
- WhatsApp QR linking through Evolution API
- templates for store and raffle events

Technically, the system mostly works. Product-wise, the UI does not explain what will happen when an order, ticket reservation, payment confirmation, or automatic release occurs.

## Core Mental Model

### Principal Channel

The Principal Channel is the default/fallback channel. It should always exist conceptually, even if the data lives in `settings`.

Used for:

- general store orders
- mixed orders
- article-only orders
- raffle flows when there is no active raffle channel
- any specialized channel that lacks payment, WhatsApp, or template configuration

Contains:

- bank information
- Mercado Pago principal account
- WhatsApp principal number and Evolution instance
- default store templates
- default raffle templates

### Specialized Channels

Optional channels for specific business purposes:

- `COMBAT`
- `BREEDING`
- `RAFFLES`

Each specialized channel can override:

- bank information
- Mercado Pago account
- WhatsApp number and Evolution instance
- templates

If a specialized channel is missing or incomplete, the system uses the Principal Channel.

## Navigation

Admin path:

```txt
Sistema > Departamentos
```

Recommended UI title:

```txt
Canales Operativos
```

Recommended secondary copy:

```txt
Configura la ruta de cobro y mensajeria para cada flujo de venta.
```

## Information Architecture

### Screen 1: Channels Hub

Purpose: give a high-level operational map.

Sections:

1. Hero summary
2. Principal Channel
3. Specialized Channels
4. Delivery Matrix

### Screen 2: Channel Detail

Purpose: edit a single channel through clear operational cards.

Sections:

1. Channel identity header
2. Bank information card
3. Mercado Pago card
4. WhatsApp card
5. Templates card
6. Fallback explanation

### Screen 3: Create Channel

Purpose: create a specialized channel. Keep as a guided form, but simplify language and avoid excessive choreography.

Steps:

1. Identity
2. Bank information
3. WhatsApp number
4. Optional Mercado Pago

Templates can be configured after creation in the detail screen.

## Channels Hub Layout

### NexusHero

Title:

```txt
Canales Operativos
```

Subtitle:

```txt
Cobro, mensajeria y fallback
```

Badge options:

- `Principal listo`
- `Principal incompleto`
- `Sin WhatsApp`
- `Sin pasarela`

Hero metrics:

- active specialized channels
- WhatsApp connected count
- Mercado Pago connected count
- template completion count

### Principal Channel Section

Component:

```txt
NexusSection
```

Title:

```txt
Canal Principal
```

Subtitle:

```txt
Fallback para tienda general, pedidos mixtos y flujos sin canal especializado
```

Action:

```txt
Administrar
```

Cards inside:

1. Bank
2. Mercado Pago
3. WhatsApp
4. Templates

Each card should show:

- status
- concise configured value
- risk or missing state
- direct action

### Specialized Channels Section

Title:

```txt
Canales Especializados
```

Subtitle:

```txt
Sobrescriben el canal principal cuando el flujo coincide con su proposito
```

Cards:

- Canal de Combate
- Canal de Cria
- Canal de Rifas

Each card should show:

- purpose
- active/inactive
- bank status
- WhatsApp status
- Mercado Pago status
- template status
- fallback status
- action: `Administrar`

### Delivery Matrix Section

Purpose: explain what route the system will use.

Rows:

- Store: articles only
- Store: mixed order
- Store: combat birds
- Store: breeding birds
- Raffles: ticket reservation
- Raffles: payment confirmed
- Store/Raffles: automatic release

Columns:

- payment route
- WhatsApp route
- template source

This is not an editable table. It is a confidence map.

## Channel Detail Layout

Use a detail page instead of the current tab-heavy editor.

### Header Section

Component:

```txt
NexusSection
```

Title examples:

```txt
Canal Principal
Canal de Combate
Canal de Cria
Canal de Rifas
```

Action:

```txt
Editar identidad
```

Content:

- name
- purpose
- active state
- fallback behavior
- health summary

### Card: Bank Information

Title:

```txt
Informacion bancaria
```

Shows:

- bank
- beneficiary
- CLABE
- card number

Actions:

- `Editar`

Modal:

- bank
- beneficiary
- CLABE
- card number

Important: if specialized channel has incomplete bank info, show:

```txt
Usara la informacion bancaria del Canal Principal.
```

### Card: Mercado Pago

Title:

```txt
Mercado Pago
```

Avoid:

```txt
dueno
```

Use:

```txt
Cuenta principal
Cuenta vinculada
Pasarela principal
Pasarela del canal
```

States:

- not configured
- linked
- linked but missing user id
- using Principal Channel

Actions:

- `Vincular`
- `Desvincular`
- `Revisar estado`

Modal:

- explain account being linked
- confirm OAuth redirect
- unlink confirmation

### Card: WhatsApp

Title:

```txt
Mensajeria WhatsApp
```

Shows:

- configured phone
- Evolution instance
- connection state
- active/inactive

Actions:

- `Editar numero`
- `Vincular QR`
- `Desvincular`
- `Revisar conexion`

Important flow:

Before QR linking, user must manually confirm or enter the phone number that will be linked.

QR modal steps:

1. Confirm phone number
2. Generate QR
3. Poll connection status
4. Close automatically on success

### Card: Templates

Title:

```txt
Plantillas
```

Group templates by context:

#### Tienda

- Apartado de orden
- Pago confirmado
- Liberacion de orden

#### Rifas

- Apartado de boletos
- Pago confirmado
- Liberacion de boletos

Each row shows:

- configured/missing
- source: channel or principal
- last updated if available
- action: `Editar`

Template editor modal:

- textarea
- variable helper
- preview panel
- save action

Suggested variables:

Store:

- `{{greeting}}`
- `{{customerName}}`
- `{{orderId}}`
- `{{itemList}}`
- `{{amount}}`
- `{{bank_info}}`
- `{{time_store}}`

Raffles:

- `{{customerName}}`
- `{{ticket}}`
- `{{raffleName}}`
- `{{amount}}`
- `{{bank_info}}`
- `{{time_limit_raffle}}`

## Modal Strategy

Use focused modals by concern:

- identity modal
- bank modal
- Mercado Pago modal
- WhatsApp phone modal
- WhatsApp QR modal
- template editor modal

Do not use one giant edit form.

Reason:

Each concern has different risk, validation, and user intent.

## Status Vocabulary

Use consistent states:

- `Listo`
- `Incompleto`
- `Usa principal`
- `Desconectado`
- `Vinculado`
- `Desactivado`
- `Sin plantilla`

Avoid:

- `dueno`
- overly technical labels as primary copy
- ambiguous "departamento" when the user is configuring payment/notification routing

## Backend Alignment Needed

### Current State

Principal fallback data lives in `settings`:

- bank principal fields
- Mercado Pago principal fields
- WhatsApp global Evolution config
- global store templates

Specialized channels live in:

- `payment_channels`
- `whatsapp_channels`
- `whatsapp_templates`

### Recommended Short-Term Approach

Do not migrate schema yet.

Create a Channels Overview endpoint that normalizes data for the UI:

```txt
GET /api/v1/admin/channels/overview
```

Return:

- principal channel virtual object
- specialized channels
- delivery matrix
- health states

This keeps the UI simple without forcing database changes.

### Recommended Later Approach

Consider creating a real `GENERAL` or `PRINCIPAL` channel record.

Benefits:

- unified channel model
- less special-case settings logic
- easier template management
- clearer global intelligence later

Risk:

- migration must be careful because existing worker/fallback logic depends on `settings`.

## Template Model Gap

The current enum has:

- `RESERVATION`
- `RELEASE`
- `PAYMENT_CONFIRMED`

But the product needs context-aware templates:

- store reservation
- store payment confirmed
- store release
- raffle reservation
- raffle payment confirmed
- raffle release

Short-term:

- Use UI grouping and existing fallbacks where possible.
- Principal store templates can still map to existing settings.
- Channel templates can still use existing enum for specialized context.

Long-term:

Create context-aware template types:

```txt
STORE_RESERVATION
STORE_PAYMENT_CONFIRMED
STORE_RELEASE
RAFFLE_RESERVATION
RAFFLE_PAYMENT_CONFIRMED
RAFFLE_RELEASE
```

This will make the system less ambiguous.

## UX Rules

- The Principal Channel must always be visually first.
- Specialized channels must clearly say when they fall back to Principal.
- The user should never wonder which WhatsApp number will send a message.
- The user should never wonder which bank information will be sent.
- The user should never wonder which template will be used.
- Editing should happen in small modals, not a full-page multi-tab form.
- Creation can remain guided, but editing should be card-based.

## Implementation Phases

### Phase 1: UI Restructure Without Schema Migration

- Redesign `ChannelsHub`.
- Replace the tab editor with a card-based channel detail.
- Keep existing APIs.
- Rename "Configuracion de Respaldo" to "Canal Principal".
- Rename "Mercado Pago Dueno" to "Mercado Pago Principal".
- Add clear fallback copy.

### Phase 2: Normalized Overview Endpoint

- Add backend endpoint that returns principal, specialized channels, and health matrix.
- Move frontend logic out of `ChannelsHub`.

### Phase 3: Template Editor Upgrade

- Group templates by Tienda/Rifas.
- Add preview and variable helper.
- Support payment confirmation template explicitly.

### Phase 4: Data Model Upgrade

- Add context-aware template types.
- Optionally create a real `GENERAL` channel.

## Success Criteria

The redesigned screen succeeds if a user can answer in under 10 seconds:

- Which bank info is sent for a store order?
- Which WhatsApp number sends store notifications?
- Which channel handles raffle reservations?
- What happens if the raffle channel is incomplete?
- Is Mercado Pago active for this channel?
- Are all required templates configured?

