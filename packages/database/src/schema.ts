import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ─── Auth.js required tables ────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// ─── App tables ───────────────────────────────────────────────────────────────

export const videoStatusEnum = pgEnum('video_status', [
  'QUEUED',
  'DOWNLOADING',
  'EXTRACTING_CLIPS',
  'GENERATING_AVATAR',
  'RENDERING',
  'UPLOADING',
  'COMPLETED',
  'FAILED',
]);

export const videoFlowEnum = pgEnum('video_flow', [
  'REPURPOSING',
  'TREND_CLONING',
  'QUICK_MODE',
]);

export const videos = pgTable('videos', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  correlationId: text('correlation_id')
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  flow: videoFlowEnum('flow').notNull(),
  status: videoStatusEnum('status').notNull().default('QUEUED'),
  inputUrl: text('input_url'),
  outputUrl: text('output_url'),
  errorMessage: text('error_message'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});
