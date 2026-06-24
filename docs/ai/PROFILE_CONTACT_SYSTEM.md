# Profile and Public Contact System

## Ownership

- `User` remains the authentication identity and source of private account data.
- `ContactProfile` is the optional public projection of a user.
- `ContactChannel` stores one or more explicit WhatsApp or phone channels.
- There is no independent contacts CRUD. Administrators manage another user's contact projection from `UsersView`; each user manages their own profile from `Mi Perfil`.
- User contact editing uses the same `PublicContactView` surface as self-service profile contact editing. Do not open a separate modal for this workflow; selecting contact from a user card should navigate into the full contact editor and return to `UsersView` after saving.

## Admin Information Architecture

`Mi Perfil` is a top-level Admin destination, not part of `Sistema`. Its QuickActions are:

- Datos personales
- Contacto publico
- Notificaciones
- Seguridad

Notification preferences belong to the authenticated user. Password changes require the current password. Public contact publication is available to `ADMIN` and `SUPERADMIN`; `STAFF` can edit contact details but an administrator controls publication.

## API Contracts

Protected self-service routes under `/api/v1/auth/me`:

- `GET /profile`
- `PUT /profile`
- `PUT /notifications`
- `PUT /contact`
- `PUT /password`

Public route:

- `GET /api/v1/store/contacts`

The public response exposes only editorial contact fields and active channels. It never exposes username, email, private phone, role, notification settings, or authentication fields.

## Permissions

- `SUPERADMIN` can manage every user role and can edit public contact profiles for `ADMIN` and `STAFF` users.
- `ADMIN` can create and manage only `STAFF` accounts.
- `ADMIN` can edit public contact profiles for `STAFF` users.
- `STAFF` cannot access user administration routes.
- A user cannot delete their own account through the users endpoint.
- Generic user updates do not change another user's notification preferences.

## Validation

- Phone numbers use E.164 format, for example `+521234567890`.
- Passwords require at least eight characters.
- Public profiles are returned only when the user is active, the profile is published, and at least one active channel exists.
- A contact profile supports up to six channels and rejects duplicate type/number pairs.

## Deployment

Apply the store database migration before deploying the API:

`packages/db/prisma/store/migrations/20260624113000_add_user_profiles_and_contacts/migration.sql`

Then regenerate the store Prisma client and deploy API, Admin, and Storefront together so their contracts remain aligned.
