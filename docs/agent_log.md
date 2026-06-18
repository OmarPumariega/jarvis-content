# Agent Log

## 2026-05-27 — Fase 4: Integraciones IA

- **Estado**: COMPLETADO
- **Rama**: feature/database-and-auth
- **Archivos creados**:
  - `packages/types/src/heygen.ts` — schemas Zod: HeyGenVideoStatus, HeyGenAvatarVideoInput, CreateVideoResponse, VideoStatusResponse
  - `packages/types/src/elevenlabs.ts` — schemas Zod: VoiceSettings, TTSRequest, CacheMeta
  - `packages/types/src/opusclip.ts` — schemas Zod: JobStatus, CreateJobRequest, Clip, CreateJobResponse, JobStatusResponse
  - `apps/web/src/services/heygen.ts` — createAvatarVideo, pollVideoUntilDone, generateAvatarVideo (con retry x3 + polling hasta 6 min)
  - `apps/web/src/services/elevenlabs.ts` — synthesizeSpeech con caché doble: Redis (opcional) + filesystem `/tmp/elevenlabs-cache` SHA-256
  - `apps/web/src/services/opusclip.ts` — createClipJob, pollClipJobUntilDone, detectViralClips (con retry x3 + polling hasta 10 min)
- **Archivos modificados**:
  - `apps/video-engine/workers/flows/trendCloning.ts` — llama HeyGen API directamente (generateHeyGenVideo + ElevenLabs cache); ya no requiere inputUrl pre-renderizado
  - `apps/video-engine/workers/types.ts` — extendido con heygenAvatarId, heygenVoiceId, script, elevenlabsVoiceId, narrationText
  - `apps/web/src/queues/types.ts` — sincronizado con video-engine/workers/types.ts
  - `apps/web/src/app/api/videos/route.ts` — propaga campos HeyGen/ElevenLabs al job; usa spread condicional para exactOptionalPropertyTypes
  - `packages/types/src/video.ts` — CreateVideoSchema extendido con campos opcionales de avatar y voz
- **Notas**: TypeScript strict sin errores en ambos apps; z.input<> usado en opusclip para tipos de entrada con defaults Zod

## 2026-05-26 — Fase 3: Motor Local

- **Estado**: COMPLETADO
- **Rama**: feature/database-and-auth
- **Archivos creados**:
  - `apps/video-engine/scripts/ytdlp.ts` — wrapper yt-dlp con descarga, metadata y limpieza de /tmp
  - `apps/video-engine/scripts/ffmpeg.ts` — wrapper FFmpeg: extractClip, reframeTo916, mergeAudioVideo, getVideoDuration, cleanOldRenders
  - `apps/video-engine/remotion/types.ts` — schemas Zod para los 3 templates
  - `apps/video-engine/remotion/UltraDynamic.tsx` — template 9:16 con captions animados y accent color
  - `apps/video-engine/remotion/Corporate.tsx` — template con header/footer deslizante y logo
  - `apps/video-engine/remotion/HybridTutorial.tsx` — template pantalla + face-cam PiP + step indicators
  - `apps/video-engine/remotion/Root.tsx` — composiciones Remotion con schemas
  - `apps/video-engine/remotion/render.ts` — función renderComposition (bundle + renderMedia)
  - `apps/video-engine/workers/types.ts` — interfaz VideoJobData
  - `apps/video-engine/workers/queue.ts` — Queue BullMQ con backoff exponencial
  - `apps/video-engine/workers/storage.ts` — upload a MinIO / R2 con S3Client
  - `apps/video-engine/workers/flows/repurposing.ts` — descarga + reframe + UltraDynamic
  - `apps/video-engine/workers/flows/trendCloning.ts` — Corporate template para avatar HeyGen
  - `apps/video-engine/workers/flows/quickMode.ts` — HybridTutorial para grabaciones rápidas
  - `apps/video-engine/workers/videoWorker.ts` — Worker BullMQ con HMAC webhook, status updates, reintentos
  - `apps/video-engine/src/index.ts` — entry point con graceful shutdown y cron limpieza diaria
  - `apps/web/src/queues/types.ts` — VideoJobData compartido
  - `apps/web/src/queues/videoQueue.ts` — Queue producer BullMQ en web
  - `apps/web/src/app/api/videos/route.ts` — actualizado para encolar job tras crear registro
  - `apps/web/src/app/api/videos/callback/route.ts` — webhook HMAC, estados terminales inmutables
- **Notas**: TypeScript strict sin errores en ambos apps; zod + drizzle-orm añadidos al video-engine; signatura de eventos fluent-ffmpeg corregida

## 2026-05-26 — Fase 1: Monorepo Setup

- **Estado**: COMPLETADO
- **Rama**: feature/monorepo-setup
- **Archivos creados**: package.json, pnpm-workspace.yaml, docker-compose.yml, .env.example, .gitignore, tsconfig.json, packages/config/*, apps/web/package.json, apps/video-engine/package.json, packages/database/package.json, packages/types/package.json
- **Notas**: Stack simplificado — eliminado n8n, flujo directo BullMQ → worker → Postgres
