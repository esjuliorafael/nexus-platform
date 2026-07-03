# Nexus Admin Mobile Architecture

## Status
- **Decision date:** 2026-07-02
- **Status:** Approved for planning and MVP implementation
- **Mobile app repository:** `nexus-admin-mobile` (external to this monorepo)
- **Recommended local path:** `C:\Users\Julio\nexus-admin-mobile`

## Goal
Build one central native mobile app for Android and iOS that allows Nexus clients to access their own Admin panel data without creating one app per client.

The mobile app must preserve the current Nexus tenant isolation model:
- Each client keeps its own API container.
- Each client keeps its own `store` and optional `raffle` databases.
- Each client authenticates against its own `users` table.
- Mobile requests are sent to the resolved client API, not to a shared cross-tenant data API.

## Product Decision
Use **Expo native app** consuming the existing Nexus APIs.

Expo is the selected delivery platform because it keeps React Native development fast, supports Android and iOS from one codebase, and provides EAS Build, EAS Submit, and EAS Update for app distribution and over-the-air updates.

The selected implementation is not a WebView wrapper. The app should be a native mobile Admin experience that reuses API contracts and business logic patterns from `apps/admin`, but implements mobile-specific screens, navigation, storage, and upload flows.

## Tenant Identification
Clients will identify their business by domain.

Examples:
- `granjalamanzana.com`
- `rancholastrojes.com.mx`

This is preferable to asking for an internal tenant slug because clients already know their public domain.

## Required Central Service: Tenant Registry
The mobile app cannot derive the API URL from `window.location` like the web Admin does. A native app has no `admin.[domain]` hostname context.

Therefore Nexus needs a small central service that resolves:

```text
client domain -> tenant metadata -> apiBaseUrl
```

Proposed endpoint:

```http
POST /api/mobile/tenants/resolve
Content-Type: application/json

{
  "domain": "rancholastrojes.com.mx"
}
```

Proposed response:

```json
{
  "id": "trojes",
  "name": "Rancho Las Trojes",
  "domain": "rancholastrojes.com.mx",
  "apiBaseUrl": "https://api.rancholastrojes.com.mx/api/v1",
  "adminBaseUrl": "https://admin.rancholastrojes.com.mx",
  "active": true,
  "logoUrl": "https://...",
  "features": {
    "raffles": true
  }
}
```

Minimum registry fields:

```text
id
name
domain
apiBaseUrl
adminBaseUrl
active
logoUrl
features
createdAt
updatedAt
```

## Mobile Authentication Flow
1. User enters a client domain.
2. App calls the Tenant Registry resolver.
3. App receives `apiBaseUrl`.
4. App sends credentials to:

```http
POST {apiBaseUrl}/auth/login
```

5. Client API validates credentials against its own `users` table.
6. Client API returns the tenant-local JWT and user payload.
7. App stores the session securely, scoped by tenant/domain.
8. App sends all future requests to the resolved `apiBaseUrl` with:

```http
Authorization: Bearer {token}
```

## Session Storage
The web Admin currently uses `localStorage`. The mobile app must not.

Mobile storage requirements:
- Use `expo-secure-store` for JWT/session secrets.
- Scope sessions by normalized domain or tenant ID.
- Allow the user to switch tenants without overwriting another tenant session.
- Persist the last selected tenant for fast app startup.

Suggested stored session shape:

```json
{
  "tenantId": "trojes",
  "domain": "rancholastrojes.com.mx",
  "apiBaseUrl": "https://api.rancholastrojes.com.mx/api/v1",
  "token": "...",
  "user": {
    "id": 1,
    "username": "superadmin",
    "name": "Julio Rafael",
    "role": "SUPERADMIN"
  },
  "createdAt": "2026-07-02T00:00:00.000Z"
}
```

## API Consumption Strategy
The mobile app should reuse the existing API surface before requesting backend changes.

Initial endpoints:
- `POST /auth/login`
- `GET /auth/me`
- `GET /admin/dashboard/stats`
- `GET /store/orders/admin`
- `PATCH /store/orders/admin/:id/status`
- `POST /store/orders/admin/read`
- `GET /admin/products`
- `POST /admin/products`
- `PUT /admin/products/:id`
- `PATCH /admin/products/:id/status`

Later endpoints:
- Raffles: `/raffles/admin`, `/raffles/:id/tickets`, `/ticket-sales/:id/status`
- Media: `/admin/media`, `/admin/uploads`
- Settings: `/admin/settings`
- WhatsApp: `/admin/whatsapp-channels`, `/admin/whatsapp/*`

## MVP Scope
The first mobile milestone should include:
- Domain resolver screen.
- Tenant confirmation screen.
- Login screen.
- Secure session persistence.
- Dashboard overview.
- Orders list and status changes.
- Products list and status changes.

Excluded from MVP:
- Media uploads.
- WhatsApp QR linking.
- Full system settings.
- User management.
- Billing management.
- Offline write queue.

These are valuable, but they increase risk and should follow after the first authenticated tenant flow is stable.

## Repository Boundary
`nexus-admin-mobile` should start as a separate project/repository instead of `apps/mobile` inside this monorepo.

Reason:
- `nexus-platform` currently uses `apps/*` in `pnpm-workspace.yaml`.
- Adding `apps/mobile` would enroll Expo into the monorepo workspace.
- Existing Docker builds copy the whole repository and run `pnpm install --frozen-lockfile`.
- The current CI/CD pipeline is optimized for Docker images for API, Admin, and Storefront.
- Keeping mobile separate avoids accidental production build impact while the app is being developed.

Future integration is possible, but only after the mobile build pipeline is explicit and isolated.

## CI/CD and Release Strategy
Mobile delivery should use Expo EAS:
- **EAS Build:** Creates Android and iOS binaries.
- **EAS Submit:** Uploads binaries to Google Play and App Store Connect.
- **EAS Update:** Publishes JavaScript and asset updates over the air without a full store review, as long as no native code/configuration changes are required.

Changes that can usually ship with EAS Update:
- UI changes.
- JavaScript logic.
- Copy/text changes.
- Styling.
- API client adjustments that do not require native modules.

Changes that require a new binary build and store submission:
- New native permissions.
- Native dependency changes.
- App icon/splash/native configuration changes.
- Push notification native setup.
- Camera/media capabilities if native configuration changes.

## Contabo Infrastructure Impact
The mobile app does not replace the current tenant containers.

Current tenant pattern remains:

```text
domain.com       -> tenant-front:3000
admin.domain.com -> tenant-admin:80
api.domain.com   -> tenant-api:8080
```

New global service to add:

```text
mobile-core.nexus-domain.com -> nexus-tenant-registry:8080
```

The Tenant Registry may share global infrastructure:
- `nexus-postgres-global` for registry database/table.
- `nexus-network` Docker network.
- `nexus-nginx-proxy-manager` for SSL and routing.

The registry should not directly read tenant store or raffle databases during the MVP. It only resolves metadata and lets the mobile app authenticate against the tenant API.

## Security Notes
- The Tenant Registry must never return database URLs or internal Docker hostnames.
- It returns only public HTTPS API URLs and safe tenant metadata.
- Tenant APIs remain responsible for authentication and authorization.
- The app must validate that the resolved tenant is active before showing login.
- The app should normalize domains before resolving them:
  - trim whitespace
  - lowercase
  - remove `https://`
  - remove `http://`
  - remove trailing slash
  - optionally remove leading `www.`

## Open Decisions
- Exact public hostname for Tenant Registry.
- Whether Tenant Registry lives in a new repo or a small service inside `nexus-platform`.
- Whether tenant records are managed manually at first or through a protected internal admin.
- Token expiration and refresh strategy for mobile sessions.
- Push notification architecture.
- Whether the mobile app supports multiple active tenant sessions in the first release.

