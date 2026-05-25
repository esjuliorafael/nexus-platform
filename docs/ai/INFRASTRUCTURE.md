# Nexus Platform - Infraestructura de Producción (Contabo)

Este documento describe la arquitectura real de despliegue en el VPS de Contabo y los procedimientos operativos para mantener la plataforma.

## 1. Arquitectura de Contenedores

La plataforma opera bajo un modelo de **Infraestructura Compartida con Servicios Aislados**.

### Servicios Globales (Nexus Core)
Estos contenedores son compartidos por todos los clientes/tenants en el VPS:
- **nexus-postgres-global:** Motor de base de datos PostgreSQL (Puerto 5432 interno).
- **nexus-redis-global:** Motor de caché y colas BullMQ.
- **nexus-nginx:** Proxy inverso que maneja el tráfico SSL y redirección de dominios.
- **nexus-evolution-global:** Instancia única de Evolution API para gestión de WhatsApp.

### Servicios por Cliente (Tenant: Granja La Manzana)
Ubicación: `/home/nexus/manzana`
- **manzana-api:** Backend Fastify.
- **manzana-front:** Frontend Next.js (Storefront).
- **manzana-admin:** Panel Administrativo (Vite).

## 2. Estrategia de Base de Datos

Cada cliente utiliza múltiples bases de datos físicas dentro del motor global para garantizar integridad modular:

| Módulo | Base de Datos (Física) | Variable de Entorno |
| :--- | :--- | :--- |
| **Tienda (Core)** | `manzana_store` | `DATABASE_URL` |
| **Rifas (Opcional)** | `manzana_raffle` | `RAFFLE_DATABASE_URL` |

### Protocolo de Migraciones
Prisma no detecta automáticamente cambios en múltiples esquemas durante el build de Docker. Si se añaden tablas a las Rifas, se debe ejecutar manualmente en el VPS:
```bash
docker exec -it manzana-api sh -c "DATABASE_URL=\$RAFFLE_DATABASE_URL pnpm --filter @nexus/db exec prisma migrate deploy --schema=prisma/raffle/schema.prisma"
```

## 3. Flujo de CI/CD

El despliegue sigue este camino:
1. **GitHub:** Push a la rama `master`.
2. **GitHub Actions:** Construye imágenes Docker y las sube a Docker Hub (`esjuliorafael/nexus-*`).
3. **VPS (Manual):**
   ```bash
   cd /home/nexus/manzana
   docker compose pull
   docker compose up -d
   ```

## 4. Variables de Entorno Críticas (.env)

El archivo `.env` en el servidor debe contener al menos:
- `RAFFLE_ENABLED=true` (Para cargar el plugin en el API).
- `DATABASE_URL` y `RAFFLE_DATABASE_URL` apuntando a `nexus-postgres-global`.
- Configuración de Cloudflare R2 (Access Key, Secret, Bucket).
- Configuración de Evolution API (URL y API Key global).

## 5. Reglas de Mantenimiento

- **No usar `localhost`:** Dentro de los contenedores, siempre referenciar a los servicios globales por su nombre de red (`nexus-postgres-global`, `nexus-redis-global`).
- **Reseteo de Esquemas:** Si una base de datos modular entra en conflicto de tipos, usar `npx prisma db push --force-reset` solo en la base de datos afectada.
- **Sincronización Admin:** La pestaña de Rifas en el Admin es 100% dinámica; depende del valor `raffle_enabled` en la tabla `settings` de la DB de la tienda.
