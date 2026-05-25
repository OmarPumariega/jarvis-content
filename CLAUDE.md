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
[Usuario] → [Next.js en Vercel] → [PostgreSQL local] → [BullMQ + Redis local]
                                                               ↓
                                       [Motor de vídeo local — /apps/video-engine]
                                       (FFmpeg · yt-dlp · Remotion · n8n)
                                                               ↓
                                       [MinIO local / Cloudflare R2]
```

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
- ⚠️ Redis debe levantarse antes que el motor: `redis-server --daemonize yes`

**Motor de Procesamiento Local** (`/apps/video-engine`)
- `yt-dlp` — descarga YouTube
- `FFmpeg` — transcodificación y composición
- `Remotion` — renderizado programático (**nunca en Vercel**)
- `n8n` — orquestador (webhooks entrantes → scripts locales → webhooks de vuelta)

**Almacenamiento de Objetos**
- Desarrollo: MinIO en Docker → `docker run -p 9000:9000 minio/minio server /data`
- Producción: Cloudflare R2 (compatible S3)

**APIs Externas**

| Servicio | Proveedor | Nota |
|---|---|---|
| Vídeo Avatar | HeyGen API | |
| Clonación de voz | ElevenLabs API | con caché SHA-256 en Redis |
| Detección clips virales | OpusClip API | Vizard no tiene API pública — no usar |
| Generación B-Roll | Runway o InVideo API | |

---

## 3. COMANDOS DE DESARROLLO

```bash
# Instalar dependencias (monorepo)
pnpm install

# Arrancar servicios previos
redis-server --daemonize yes
docker run -p 9000:9000 minio/minio server /data   # MinIO (desarrollo)

# Desarrollo
pnpm --filter web dev              # Next.js en http://localhost:3000
pnpm --filter video-engine dev     # Worker local con hot-reload

# Base de datos
pnpm --filter database generate    # Genera migraciones Drizzle
pnpm --filter database migrate     # Aplica migraciones

# Validación (ejecutar antes de merge a main)
pnpm lint                          # ESLint — cero warnings
pnpm tsc --noEmit                  # TypeScript — cero errores
pnpm audit --audit-level=high      # Vulnerabilidades
pnpm test                          # Tests
pnpm --filter web test -- <ruta>   # Test individual
```

> ⚠️ Copia `.env.example` a `.env` y rellena antes de ejecutar cualquier comando.

---

## 4. VARIABLES DE ENTORNO REQUERIDAS

```bash
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=postgresql://user:password@localhost:5432/jarvis_content
REDIS_URL=redis://localhost:6379

# Almacenamiento — elige uno
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
# o bien:
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# APIs IA
HEYGEN_API_KEY=
ELEVENLABS_API_KEY=
OPUSCLIP_API_KEY=

# Seguridad
WEBHOOK_HMAC_SECRET=
N8N_WEBHOOK_BASE_URL=http://localhost:5678
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
POST /api/videos → QUEUED + correlationId
  → BullMQ Producer → job encolado
  → Webhook HMAC → n8n → worker local (actualiza BD en cada paso)
  → Sube a MinIO/R2 → COMPLETED + URL pública
  → Webhook → /api/videos/callback → frontend
```

**SSE en Vercel:** límite de 25s. Para trabajos largos, usar polling cada 3s contra `/api/videos/[id]/status`.

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
- Todos los webhooks internos se firman con HMAC-SHA256. Rechazar sin firma válida con HTTP 401.
- NextAuth protege todas las rutas `/api/*` excepto `/api/videos/callback` (protegida por HMAC).
- No almacenar tokens en `localStorage`.

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
| 4 — Integraciones IA | `heygen.ts` + `elevenlabs.ts` (con caché) + `opusclip.ts` + n8n HMAC | `feat: add ai service integrations with retry logic` |
| 5 — Observabilidad | pino + correlationId + cron limpieza + dashboard métricas + deploy Vercel | `feat: add observability and deploy configuration` |

---

*Documento vivo: actualiza `docs/agent_log.md` al completar cada tarea.*
