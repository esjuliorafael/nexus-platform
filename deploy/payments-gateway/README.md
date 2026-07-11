# Nexus Mercado Pago Gateway

Servicio compartido que recibe el callback OAuth y los webhooks de Mercado Pago para todos los tenants.

## Variables requeridas

- `NEXUS_SERVICE_MODE=payments-gateway`
- `PORT=8080`
- `REDIS_URL`: Redis global de Nexus.
- `PLATFORM_DATABASE_URL`: base global de Nexus, usada para el registro persistente de conexiones.
- `MP_GATEWAY_URL=https://api.link-nex.us`
- `MP_GATEWAY_SHARED_SECRET`: secreto aleatorio compartido con cada API tenant.
- `MP_APP_CLIENT_ID` y `MP_APP_CLIENT_SECRET`: credenciales de la aplicacion global Nexus Platform.
- `MP_WEBHOOK_SECRET`: secreto configurado en los webhooks de Mercado Pago.

## Variables por tenant

Cada API tenant que use Mercado Pago debe configurar:

- `MP_GATEWAY_URL=https://api.link-nex.us`
- `MP_GATEWAY_SHARED_SECRET`: el mismo secreto del gateway.
- `MP_TENANT_ID`: identificador estable, por ejemplo `trojes`.
- `MP_TENANT_API_URL`: URL interna del contenedor API, por ejemplo `http://trojes-api:8080`.
- `MP_TENANT_PUBLIC_API_URL`: API publica propia del tenant, usada para volver del checkout, por ejemplo `https://api.rancholastrojes.com.mx`.

## Rutas expuestas

- `GET /api/v1/mp/oauth/start`: inicio OAuth.
- `GET /api/v1/mp/callback`: callback registrado en Mercado Pago.
- `POST /api/v1/mp/webhook`: webhook global de Mercado Pago.

El callback y el webhook se enrutan al tenant por una solicitud interna firmada. Los tokens de los vendedores permanecen en la base de datos aislada de cada tenant.
