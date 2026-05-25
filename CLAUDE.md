# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠️ NUNCA hagas commits directamente en `main`. Lee este archivo íntegro antes de ejecutar cualquier acción.

---

## 1. CONTEXTO DEL PRODUCTO

**Jarvis Content** es un SaaS autohospedado que automatiza la creación de contenido vertical (Shorts/Reels/TikToks) a través de tres flujos:

| Flujo | Descripción |
|---|---|
| **Repurposing** | Recorta vídeos largos de YouTube (pantalla + cara) y los reencuadra dinámicamente a 9:16 |
| **Clonación de Tendencias** | Replica guiones virales con avatar de IA y voz clonada del usuario |
| **Modo Rápido** | Chat web que acepta texto o audio y lo convierte en vídeo vertical con maquetación dinámica |

---

## 2. ARQUITECTURA TÉCNICA

### 2.1 Mapa de Servicios

```
[Usuario] → [Next.js en Vercel] → [PostgreSQL] ← [BullMQ Worker local]
                  ↓                                        ↑
           [BullMQ Producer]  →  [Redis]  →  [video-engine]
                                                     ↓
                                           [MinIO local / Cloudflare R2]
```

Flujo simplificado: sin n8n. El worker local lee jobs de Redis, procesa el vídeo, escribe el estado directamente en Postgres y sube el resultado a storage. El frontend hace polling cada 3s.

### 2.2 Stack por Capa

**Frontend & API Web**
- Framework: Next.js 14+ con App Router
- Deploy: Vercel — solo frontend y API routes ligeras. **Sin FFmpeg ni Remotion.**
- UI: Tailwind CSS + shadcn/ui
- Auth: Auth.js v5 (NextAuth) con Google OAuth

**Base de Datos**
- Motor: PostgreSQL (local en macOS)
- ORM: Drizzle ORM (preferido) — migraciones siempre versionadas
- Package manager: **pnpm** con workspaces

**Cola de Tareas**
- BullMQ + Redis
- ⚠️ Levantar con Docker Compose antes de arrancar el motor: `docker compose up -d`

**Motor de Procesamiento Local** (`/apps/video-engine`)
- `yt-dlp` — descarga YouTube
- `FFmpeg` — transcodificación y composición
- `Remotion` — renderizado programático (**nunca en Vercel**)
- Sin n8n — el worker conecta directamente a Postgres y Redis

**Almacenamiento de Objetos**
- Desarrollo: MinIO vía Docker Compose (incluido en `docker-compose.yml`)
- Producción: Cloudflare R2 (compatible S3)

**APIs Externas**

| Servicio | Proveedor | Estado |
|---|---|---|
| LLM / guiones | OpenAI API | ✅ Disponible |
| Detección clips virales | OpusClip API | Pendiente — Vizard no tiene API pública, no usar |
| Vídeo Avatar | HeyGen API | Pendiente |
| Clonación de voz | ElevenLabs API | Pendiente — implementar caché SHA-256 cuando se contrate |
| Generación B-Roll | Runway o InVideo API | Pendiente |

---

## 3. COMANDOS DE DESARROLLO

```bash
# Primera vez — copiar variables de entorno
cp .env.example .env               # Rellenar con tus claves

# Levantar servicios (Postgres + Redis + MinIO)
docker compose up -d

# Instalar dependencias (monorepo)
pnpm install

# Desarrollo
pnpm --filter @jarvis/web dev              # Next.js en http://localhost:3000
pnpm --filter @jarvis/video-engine dev     # Worker local con hot-reload

# Base de datos
pnpm --filter @jarvis/database generate    # Genera migraciones Drizzle
pnpm --filter @jarvis/database migrate     # Aplica migraciones

# Validación (obligatorio antes de merge a main)
pnpm lint                                  # ESLint — cero warnings
pnpm tsc                                   # TypeScript — cero errores
pnpm audit --audit-level=high              # Vulnerabilidades
pnpm test                                  # Tests
pnpm --filter @jarvis/web test -- <ruta>   # Test individual
```

> ⚠️ Copia `.env.example` a `.env` y rellena antes de ejecutar cualquier comando.

---

## 4. VARIABLES DE ENTORNO REQUERIDAS

```bash
# Auth
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Base de datos (credenciales del docker-compose.yml)
DATABASE_URL=postgresql://jarvis:jarvis@localhost:5432/jarvis_content

# Redis
REDIS_URL=redis://localhost:6379

# MinIO (desarrollo — credenciales del docker-compose.yml)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=jarvis-content

# Cloudflare R2 (producción)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# APIs IA (añadir cuando se contraten)
OPENAI_API_KEY=
HEYGEN_API_KEY=
ELEVENLABS_API_KEY=
OPUSCLIP_API_KEY=
```

---

## 5. ESTRUCTURA DE CARPETAS

```
jarvis-content/
├── apps/
│   ├── web/                    # Next.js — solo deploy en Vercel
│   │   └── src/
│   │       ├── app/            # App Router (páginas y API routes)
│   │       ├── services/       # Una clase/módulo por proveedor externo
│   │       ├── queues/         # Productores BullMQ
│   │       └── components/
│   └── video-engine/           # Motor local — NUNCA en Vercel
│       ├── workers/            # Consumidores BullMQ
│       ├── remotion/           # Templates: UltraDynamic · Corporate · HybridTutorial
│       └── scripts/            # Wrappers yt-dlp / FFmpeg
├── packages/
│   ├── database/               # Drizzle schema + migraciones
│   ├── types/                  # Tipos Zod compartidos (HeyGen, ElevenLabs, OpusClip)
│   └── config/                 # ESLint, Prettier, tsconfig base
└── docs/
    └── agent_log.md            # Registro de tareas completadas
```

---

## 6. CICLO DE VIDA DE UN VÍDEO

### Estados

```typescript
type VideoStatus =
  | 'QUEUED' | 'DOWNLOADING' | 'EXTRACTING_CLIPS'
  | 'GENERATING_AVATAR' | 'RENDERING' | 'UPLOADING'
  | 'COMPLETED' | 'FAILED';
```

Los estados nunca retroceden. `/api/videos/callback` ignora actualizaciones si el estado actual ya es `COMPLETED` o `FAILED`.

### Flujo

```
POST /api/videos → crea registro QUEUED + correlationId en Postgres
  → BullMQ Producer encola job en Redis
  → BullMQ Worker local toma el job
  → Worker actualiza estado en Postgres en cada paso (DOWNLOADING → RENDERING → UPLOADING)
  → Worker sube resultado a MinIO/R2
  → Worker marca COMPLETED + URL pública en Postgres
  → Frontend polling cada 3s a /api/videos/[id]/status
```

Sin webhooks de vuelta ni callbacks HTTP — el worker escribe directamente en Postgres. El frontend detecta el cambio por polling.

---

## 7. ESTÁNDARES DE INGENIERÍA

### TypeScript
- `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`
- Prohibido `any` — usar `unknown` con narrowing explícito
- Todas las respuestas de APIs externas se validan con **Zod** antes de usarse
- Tipos de HeyGen, ElevenLabs y OpusClip viven en `/packages/types/`

### Arquitectura
- Las route handlers de Next.js **no contienen lógica de negocio**: solo validan (Zod), delegan a `services/` y devuelven respuesta
- Un archivo de servicio por proveedor externo — cambiar proveedor = editar solo ese archivo
- Remotion: cada template recibe `inputProps` tipados con Zod, sin valores hardcodeados

### Manejo de Errores
- Todas las llamadas a APIs externas usan exponential backoff, máximo 3 reintentos:

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
    }
  }
  throw new Error('Unreachable');
}
```

- Logger: `pino` con `correlationId` en todos los logs. Prohibido `console.log` en producción.

### Seguridad
- NextAuth protege todas las rutas `/api/*`.
- No almacenar tokens en `localStorage`.
- Si en el futuro se añaden webhooks externos (HeyGen, ElevenLabs), firmarlos con HMAC-SHA256 y rechazar sin firma válida con HTTP 401.

### Optimización de Costes
- Antes de llamar a ElevenLabs: calcular `audio:${sha256(text + voiceId)}` y buscar en caché (Redis / tabla `audio_cache`).
- Cron diario: eliminar `/tmp/yt-dlp/` >48h y `/tmp/renders/` ya subidos; registrar espacio liberado.

---

## 8. GIT FLOW

Ramas: `feature/<desc>` · `bugfix/<desc>` · `chore/<desc>` · `refactor/<desc>`

Commits semánticos: `feat:` · `fix:` · `docs:` · `refactor:` · `chore:`

**Pre-merge checklist:**
- [ ] `pnpm tsc --noEmit` sin errores
- [ ] `pnpm lint` sin warnings
- [ ] Sin `any`, `console.log` ni credenciales hardcodeadas
- [ ] Nuevos endpoints con validación Zod
- [ ] Nuevos servicios con reintentos y manejo de errores

---

## 9. ORDEN DE IMPLEMENTACIÓN

| Fase | Contenido | Commit |
|---|---|---|
| 1 — Fundación | Monorepo pnpm + ESLint + Prettier + Husky + `.env.example` | `chore: initial monorepo setup` |
| 2 — DB y Auth | Schema Drizzle (`videos` con `correlationId`, `status`, `userId`) + Auth.js Google OAuth + middleware sesión | `feat: add database schema and google oauth` |
| 3 — Motor Local | yt-dlp + FFmpeg wrappers + Remotion (3 templates) + BullMQ worker | `feat: add local video engine with remotion templates` |
| 4 — Integraciones IA | `openai.ts` + `opusclip.ts` + `heygen.ts` + `elevenlabs.ts` (con caché SHA-256) — según disponibilidad de APIs | `feat: add ai service integrations with retry logic` |
| 5 — Observabilidad | pino + correlationId + cron limpieza + dashboard métricas + deploy Vercel | `feat: add observability and deploy configuration` |

---

*Documento vivo: actualiza `docs/agent_log.md` al completar cada tarea.*
