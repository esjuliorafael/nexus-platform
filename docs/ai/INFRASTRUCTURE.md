# Infraestructura de Despliegue - Nexus Platform

Este documento sirve como la **Fuente de Verdad** para el despliegue de la plataforma en un modelo Multi-tenant (una instancia por cliente) compartiendo recursos globales para optimizar costos y rendimiento.

## 1. Servidor Recomendado
- **Proveedor:** Contabo (o similar)
- **Plan:** Cloud VPS 20 (6 vCPU, 12GB RAM, 100GB NVMe)
- **Capacidad estimada:** 5-8 clientes (dependiendo del uso de WhatsApp).

## 2. Arquitectura Global (Compartida)
Para ahorrar RAM, se centralizan los servicios pesados en la carpeta `/home/nexus/infra-global/`.

| Servicio | Tecnología | Rol |
| :--- | :--- | :--- |
| **Reverse Proxy** | Nginx Proxy Manager | Gestiona dominios y certificados SSL (HTTPS). |
| **Base de Datos** | PostgreSQL 16 (Alpine) | Un solo contenedor. Cada cliente tiene su propia DB y Usuario. |
| **Cache / Queues** | Redis 7 (Alpine) | Un solo contenedor para todos los clientes. |
| **WhatsApp** | Evolution API | Una sola instalación. Se crean "Instancias" por cada cliente. |

## 3. Aislamiento por Cliente
Cada cliente vive en su propia carpeta: `/home/nexus/<nombre>/`.
- **Nexus API:** Contenedor independiente con su propio `.env`.
- **Storefront:** Contenedor independiente (Next.js).
- **Red:** Se comunican a través de una Docker Network llamada `nexus-network`.

## 4. Convenciones de Nomenclatura (Ejemplo: 'manzana')
- **Usuario DB:** `manzana`
- **DB Tienda:** `manzana_store`
- **DB Rifas:** `manzana_raffle`
- **Instancia WA:** `manzana-wa`
- **Contenedores:** `manzana-api`, `manzana-front`

## 5. Estrategia de CI/CD
1. **GitHub Actions:** Construye las imágenes de Docker al hacer push a `main`.
2. **Docker Hub:** Almacena las imágenes (versión estable).
3. **Watchtower:** Servicio en el VPS que detecta nuevas imágenes y reinicia los contenedores de los clientes automáticamente.
4. **Migraciones:** El contenedor de la API ejecuta `npx prisma migrate deploy` antes de iniciar para asegurar que la DB esté actualizada.

## 6. Requisitos para nuevos Clientes
1. Ejecutar script `create_tenant.sh <nombre>` para crear DB y Usuario.
2. Clonar carpeta de configuración del cliente en `/home/nexus/<nombre>/`.
3. Configurar `.env` con las credenciales generadas.
4. Apuntar dominio en Nginx Proxy Manager.
