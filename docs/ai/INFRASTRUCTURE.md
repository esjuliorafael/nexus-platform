# Nexus Platform - Infraestructura de Producción (Contabo)

Este documento describe la arquitectura real de despliegue en el VPS de Contabo y los procedimientos operativos para mantener la plataforma.

## 1. Arquitectura de Contenedores

La plataforma opera bajo un modelo de **Infraestructura Compartida con Servicios Aislados**.

### Servicios Globales (Nexus Core)
Estos contenedores son compartidos por todos los clientes/tenants en el VPS:
- **nexus-postgres-global:** Motor de base de datos PostgreSQL (Puerto 5432 interno).
- **nexus-redis-global:** Motor de caché y colas BullMQ.
- **nexus-nginx-proxy-manager:** Proxy inverso que maneja el tráfico SSL y redirección de dominios.
- **nexus-evolution-global:** Instancia única de Evolution API para gestión de WhatsApp.
- **nexus-tenant-registry:** Servicio global planeado para resolver dominios de clientes hacia APIs publicas. Es requerido por `nexus-admin-mobile`.

### Estándares de Red y Puertos
- **Red Docker:** `nexus-network` (external: true).
- **API:** Puerto interno `8080`.
- **Admin:** Puerto interno `80`.
- **Storefront:** Puerto interno `3000`.
- **Tenant Registry:** Puerto interno `8080` o el puerto definido por su servicio.

### Nexus Admin Mobile
`nexus-admin-mobile` es una app Expo nativa externa al monorepo principal. No reemplaza los contenedores por tenant. La app resuelve el dominio del cliente mediante `nexus-tenant-registry` y despues consume directamente la API publica del tenant:

```text
cliente escribe dominio -> Tenant Registry -> https://api.dominio.com/api/v1 -> login/API tenant-local
```

El Tenant Registry solo debe exponer metadatos seguros como `apiBaseUrl`, `adminBaseUrl`, `active`, `logoUrl` y flags de modulos. No debe exponer `DATABASE_URL`, `RAFFLE_DATABASE_URL`, nombres internos de contenedores ni secretos.

## 2. Tenant Provisioning Playbook (Paso a Paso)

Este procedimiento garantiza el despliegue de un nuevo cliente en < 10 minutos.

### Paso 1: Preparación de Base de Datos (SQL)
Estandarizar la contraseña con la clave maestra `FraP0Ps7yTKAVkyM` para facilitar la gestión operativa.

```bash
TENANT="nombre_cliente"
docker exec -it nexus-postgres-global psql -U nexus -d postgres -c "CREATE USER $TENANT WITH PASSWORD 'FraP0Ps7yTKAVkyM';"
docker exec -it nexus-postgres-global psql -U nexus -d postgres -c "CREATE DATABASE ${TENANT}_store OWNER $TENANT;"
docker exec -it nexus-postgres-global psql -U nexus -d postgres -c "CREATE DATABASE ${TENANT}_raffle OWNER $TENANT;"
```

### Paso 2: Inicialización de Tablas (Prisma)
Usar un contenedor atómico para evitar conflictos de variables de entorno con otros clientes.

```bash
# Para Store
docker run --rm --network nexus-network -e DATABASE_URL="postgres://${TENANT}:FraP0Ps7yTKAVkyM@nexus-postgres-global:5432/${TENANT}_store" esjuliorafael/nexus-api:latest sh -c "pnpm --dir packages/db exec prisma db push --schema=prisma/store/schema.prisma --accept-data-loss"

# Para Raffle
docker run --rm --network nexus-network -e RAFFLE_DATABASE_URL="postgres://${TENANT}:FraP0Ps7yTKAVkyM@nexus-postgres-global:5432/${TENANT}_raffle" esjuliorafael/nexus-api:latest sh -c "DATABASE_URL=\$RAFFLE_DATABASE_URL pnpm --dir packages/db exec prisma db push --schema=prisma/raffle/schema.prisma --accept-data-loss"
```

### Paso 3: Usuario Maestro (Clonación de Hash)
**Crítico:** No insertar hashes manuales. Clonar el hash de un superadmin funcional para evitar errores 401 por discrepancia de salt/formato.

```bash
# 1. Obtener hash funcional
HASH=$(docker exec -it nexus-postgres-global psql -U nexus -d manzana_store -t -c "SELECT password_hash FROM users WHERE username = 'superadmin' LIMIT 1;" | tr -d '[:space:]')

# 2. Inyectar en nuevo tenant
docker exec -it nexus-postgres-global psql -U nexus -d ${TENANT}_store -c "INSERT INTO users (username, password_hash, name, role, active, must_change_password) VALUES ('superadmin', '$HASH', 'Julio Rafael', 'SUPERADMIN', true, false);"
```

### Paso 4: Configuración Nginx Proxy Manager
Crear 3 Proxy Hosts apuntando a los nombres de contenedor en la red `nexus-network`:
- `dominio.com` -> `http://${TENANT}-front:3000`
- `admin.dominio.com` -> `http://${TENANT}-admin:80`
- `api.dominio.com` -> `http://${TENANT}-api:8080` (Habilitar WebSockets)

### Paso 5: Docker Compose
```yaml
services:
  api: { container_name: ${TENANT}-api, ... }
  front: { container_name: ${TENANT}-front, ... }
  admin: { container_name: ${TENANT}-admin, ... }
```

## 3. Estrategia de Base de Datos

Cada cliente utiliza múltiples bases de datos físicas dentro del motor global para garantizar integridad modular:

| Módulo | Base de Datos (Física) | Variable de Entorno |
| :--- | :--- | :--- |
| **Tienda (Core)** | `manzana_store` | `DATABASE_URL` |
| **Rifas (Opcional)** | `manzana_raffle` | `RAFFLE_DATABASE_URL` |

### Protocolo de Migraciones
Prisma no detecta automáticamente cambios en múltiples esquemas durante el build de Docker. Si se añaden tablas a las Rifas, se debe ejecutar manualmente en el VPS:
```bash
docker exec -it manzana-api sh -c "DATABASE_URL=\$RAFFLE_DATABASE_URL pnpm --dir packages/db exec prisma migrate deploy --schema=prisma/raffle/schema.prisma"
```

## 3. Flujo de CI/CD

El despliegue sigue este camino:
1. **GitHub:** Push a la rama `master`.
2. **GitHub Actions:** Construye imágenes Docker y las sube a Docker Hub (`esjuliorafael/nexus-*`) con tags `latest` y SHA de commit para rollback.
3. **VPS (Manual por tenant):** GitHub Actions no entra al VPS ni modifica los tenants; solo publica las imagenes Docker. El operador valida el workflow y actualiza unicamente el tenant solicitado:
   ```bash
   ssh nexus
   cd /home/nexus/trojes   # o /home/nexus/manzana, segun el tenant
   docker compose pull
   docker compose up -d
   docker compose ps
   ```

### Acceso operativo a GitHub

El operador puede consultar los workflows y sus logs con GitHub CLI usando la cuenta autorizada del repositorio:

```powershell
gh auth status
gh run list --repo esjuliorafael/nexus-platform
gh run view <run-id> --repo esjuliorafael/nexus-platform
```

La autenticacion de `gh` es local al equipo del operador. No se guardan tokens de GitHub en el repositorio ni en los tenants. Antes de actualizar produccion se debe confirmar que el workflow termino en `success` y que el commit corresponde a los cambios esperados.

### Estado actual de tenants

- `trojes`: tenant operativo en produccion; es el unico que debe actualizarse cuando se solicite desplegar Las Trojes.
- `manzana`: stack de produccion reservado, actualmente no operativo; no se actualiza como parte de un despliegue de `trojes`.

## 4. Estrategia de Mensajería (WhatsApp)

La plataforma utiliza **Evolution API** con un esquema de aprovisionamiento dinámico para evitar colisiones entre clientes.

### Instancias por Cliente
Cada cliente cuenta con 4 instancias técnicas generadas automáticamente a partir de un **Tenant Prefix** (ej. `manzana`):

1. `[prefix]_main`: Canal principal y fallback del sistema.
2. `[prefix]_combat`: Canal especializado para aves de combate.
3. `[prefix]_breeding`: Canal especializado para aves de cría.
4. `[prefix]_raffles`: Canal especializado para el módulo de rifas.

### Flujo de Activación
1. El prefijo se configura en **Sistema > Infraestructura**.
2. El Backend aprovisiona las 4 instancias mediante `provisionEvolutionInstances`.
3. El Admin permite vincular cada instancia individualmente mediante códigos QR generados dinámicamente.

## 5. Variables de Entorno Críticas (.env)

El archivo `.env` en el servidor debe contener al menos:
- `RAFFLE_ENABLED=true` (Para cargar el plugin en el API).
- `DATABASE_URL` y `RAFFLE_DATABASE_URL` apuntando a `nexus-postgres-global`.
- Configuración de Cloudflare R2 (Access Key, Secret, Bucket).
- Configuración de Evolution API (URL y API Key global).

## 5. Reglas de Mantenimiento

- **No usar `localhost`:** Dentro de los contenedores, siempre referenciar a los servicios globales por su nombre de red (`nexus-postgres-global`, `nexus-redis-global`).
- **Reseteo de Esquemas:** Si una base de datos modular entra en conflicto de tipos, usar `npx prisma db push --force-reset` solo en la base de datos afectada.
- **Sincronización Admin:** La pestaña de Rifas en el Admin es 100% dinámica; depende del valor `raffle_enabled` en la tabla `settings` de la DB de la tienda.

## 6. DNS, Cloudflare Tunnel y Platform Admin (estado real)

Desde el 25/09/2026, los hostnames públicos de producción no dependen de que
los usuarios lleguen directamente a la IP pública del VPS. El tráfico sigue
este flujo:

```text
navegador --HTTPS--> Cloudflare Edge
                    --> Cloudflare Tunnel: nexus-platform
                    --> red Docker nexus-network
                    --> nexus-nginx:80
                    --> contenedor final según el Host header
```

El contenedor `nexus-cloudflared` mantiene el conector del túnel y publica las
rutas hacia `http://nexus-nginx:80`. Nginx Proxy Manager sigue siendo el router
interno: recibe el hostname y lo envía al contenedor correspondiente. En la
instalación actual el contenedor de Nginx Proxy Manager se llama `nexus-nginx`;
el nombre anterior `nexus-nginx-proxy-manager` queda como referencia histórica.

### Hostnames publicados

| Zona | Hostnames detrás del túnel | Tratamiento especial |
| :--- | :--- | :--- |
| `granjalamanzana.com` | raíz, `www`, `admin`, `api` | Todos llegan a `nexus-nginx:80`. |
| `rancholastrojes.com.mx` | raíz, `www`, `admin`, `api` | Todos llegan a `nexus-nginx:80`. |
| `link-nex.us` | `admin`, `api` | Raíz y `www` conservan sus registros proxied y la regla 301 hacia `admin`. |

Para `link-nex.us`, no se deben eliminar los registros de raíz ni `www` sin
migrar antes la regla de redirección de Cloudflare. Esos hostnames necesitan
seguir llegando al edge para que la redirección continúe funcionando.

Nginx Proxy Manager escucha los puertos públicos 80, 81 y 443, aunque el
tráfico normal de aplicaciones entra por Cloudflare Tunnel. Los servicios de
aplicación no necesitan publicar sus puertos al exterior: NPM los alcanza por
nombre de contenedor y puerto interno dentro de `nexus-network`.

El Platform Admin es un servicio de plataforma, no un tenant. No debe incluir
Tienda, Rifas, Medios u Órdenes. Sus credenciales de R2 para backups deben ser
independientes de las credenciales de medios de cada tenant.

## 7. Playbook de migración de un tenant a Cloudflare Tunnel

Este procedimiento evita que un cambio de IP del VPS vuelva a afectar
directamente a los usuarios.

1. Confirmar que la zona está activa en Cloudflare y que el certificado SSL
   está disponible para los hostnames requeridos.
2. En el túnel `nexus-platform`, crear una ruta **Published application** por
   cada hostname público. Usar como servicio exactamente
   `http://nexus-nginx:80`.
3. Verificar que Nginx Proxy Manager conserva los Proxy Hosts internos y que
   los contenedores destino siguen conectados a `nexus-network`.
4. Mantener las reglas de redirección de raíz/www cuando formen parte del
   comportamiento comercial del dominio.
5. Probar las rutas nuevas antes de retirar registros A directos. Una vez
   confirmadas, eliminar únicamente los A directos de los hostnames migrados;
   no eliminar raíz/www si sostienen una redirección edge.
6. Comprobar desde un resolver público:

   ```powershell
   nslookup admin.dominio.com 1.1.1.1
   nslookup api.dominio.com 1.1.1.1
   ```

7. Comprobar respuestas HTTPS:

   ```powershell
   curl.exe -k -sS -I --max-time 20 https://admin.dominio.com/
   curl.exe -k -sS -I --max-time 20 https://api.dominio.com/
   ```

   Un `200` en Admin confirma que la aplicación carga. Un `404` JSON en `/`
   del API puede ser correcto si el backend no define esa ruta; confirma que
   el request llegó al API y no que el túnel falló. Las rutas funcionales del
   producto deben probarse con sus endpoints reales.
8. Confirmar que el origen no está expuesto directamente:

   ```powershell
   curl.exe -k -sS -I --connect-timeout 5 --max-time 10 `
     --resolve admin.dominio.com:443:<ORIGIN_IP> https://admin.dominio.com/
   ```

   El resultado esperado es timeout o rechazo. No se debe quitar la regla de
   firewall del origen mientras exista algún hostname que evite Cloudflare.
9. Validar el conector en el VPS sin mostrar secretos:

   ```bash
   ssh nexus "docker ps --filter name=nexus-cloudflared --format '{{.Names}} {{.Status}}'"
   ssh nexus "docker logs --since 5m nexus-cloudflared 2>&1 | tail -n 120"
   ```

No es necesario reiniciar el VPS ni `nexus-cloudflared` después de crear una
ruta desde Cloudflare; el conector recibe la configuración automáticamente.
No se deben copiar tokens del túnel, credenciales ni archivos `.env` al
repositorio.

### Estado verificado el 25/09/2026

- `nexus-cloudflared` está activo y tiene las rutas de Granja, Trojes y
  Link-Nex.
- Admin de Link-Nex responde `200` a través de Cloudflare.
- API de Link-Nex alcanza el backend y responde `404` en `/`, como se espera.
- Raíz y `www` de Link-Nex responden `301` hacia `admin.link-nex.us`.
- El acceso directo a la IP de origen para Admin y API expira por timeout.
