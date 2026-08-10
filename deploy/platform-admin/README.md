# Platform Admin

Panel privado para la administracion de Nexus. El acceso publico queda protegido
por Nginx Proxy Manager y el panel agrega una sesion propia mediante cookie
HttpOnly.

## Configuracion de produccion

Antes de desplegar una version con autenticacion, crea un `.env` junto a este
compose con:

- `PLATFORM_ADMIN_USERNAME`
- `PLATFORM_ADMIN_PASSWORD_HASH`, en formato `scrypt$sal$hash`
- `PLATFORM_ENCRYPTION_KEY`, 32 bytes expresados como 64 caracteres hexadecimales

No uses las credenciales de los buckets de medios. La configuracion se guarda en
el volumen Docker `platform_admin_data` y las claves secretas se cifran antes de
persistirse.

El panel guarda una sola configuracion central de R2 y el interruptor de politica
por tenant. Los objetos se escriben con esta estructura:

```text
nexus-backups/<tenant>/store/YYYY-MM-DD.dump.zst.enc
nexus-backups/<tenant>/raffle/YYYY-MM-DD.dump.zst.enc
```

La clave privada de R2 se cifra con AES-256-GCM antes de persistirse en el
volumen del panel. Las fuentes de PostgreSQL se declaran por entorno mediante
`PLATFORM_BACKUP_DATABASES_JSON`; no se derivan automaticamente de los
tenants y no se muestran en la interfaz. Ejemplo de forma, sin credenciales
reales:

```json
[{"tenantKey":"trojes","storeDatabaseUrl":"postgres://.../trojes_store","raffleDatabaseUrl":"postgres://.../trojes_raffle"}]
```

Los backups solo se ejecutan para tenants habilitados en el panel. `POST
/api/backups/run` permite una ejecucion manual autenticada. Para programarlos,
define `PLATFORM_BACKUP_INTERVAL_MINUTES` con un valor positivo; `0` deja el
worker desactivado. La ejecucion elimina sus temporales al terminar y conserva
los dumps separados por base de datos. La restauracion aun debe validarse en un
entorno aislado antes de habilitarla en produccion.
