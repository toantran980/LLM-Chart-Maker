import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { log } from './logger';

export interface SharedDiagram {
  id: string;
  title: string | null;
  mermaid: string;
  diagramType: string;
  direction: string | null;
  theme: string | null;
  sourceText: string | null;
  createdAt: string;
}

// In-memory fallback cache in case DB is unconfigured or temporarily unreachable
const inMemoryDiagrams = new Map<string, SharedDiagram>();

export function getDatabaseUrl(): string | null {
  const { DATABASE_URL, DB_URL, DB_USER, DB_PSWD } = process.env;

  if (DATABASE_URL && DATABASE_URL.trim()) {
    return DATABASE_URL.trim();
  }

  if (!DB_URL || !DB_URL.trim()) {
    return null;
  }

  const trimmedDbUrl = DB_URL.trim();

  if (DB_USER && DB_PSWD) {
    try {
      const parsed = new URL(trimmedDbUrl);
      parsed.username = encodeURIComponent(DB_USER.trim());
      parsed.password = encodeURIComponent(DB_PSWD.trim());
      return parsed.toString();
    } catch {
      // If URL parsing fails, format directly
      const cleanUrl = trimmedDbUrl.replace(/^postgresql:\/\//i, '');
      return `postgresql://${encodeURIComponent(DB_USER.trim())}:${encodeURIComponent(DB_PSWD.trim())}@${cleanUrl}`;
    }
  }

  return trimmedDbUrl;
}

let sqlClient: ReturnType<typeof neon> | null = null;
let schemaInitialized = false;

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

function getSql(): ReturnType<typeof neon> | null {
  if (sqlClient) return sqlClient;
  const url = getDatabaseUrl();
  if (!url) return null;
  try {
    sqlClient = neon(url);
    return sqlClient;
  } catch (err) {
    log('error', 'Failed to initialize Neon SQL client', { error: String(err) });
    return null;
  }
}

export async function initDbSchema(): Promise<boolean> {
  if (schemaInitialized) return true;
  const sql = getSql();
  if (!sql) return false;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS shared_diagrams (
        id VARCHAR(32) PRIMARY KEY,
        title VARCHAR(255),
        mermaid TEXT NOT NULL,
        diagram_type VARCHAR(64) NOT NULL,
        direction VARCHAR(32),
        theme VARCHAR(64),
        source_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    schemaInitialized = true;
    log('info', 'Neon database schema verified/initialized successfully');
    return true;
  } catch (err) {
    log('warn', 'Failed to initialize Neon database schema; falling back to in-memory store', {
      error: String(err),
    });
    return false;
  }
}

export async function saveDiagram(input: {
  id?: string;
  title?: string;
  mermaid: string;
  diagramType: string;
  direction?: string;
  theme?: string;
  sourceText?: string;
}): Promise<SharedDiagram> {
  const id = input.id || crypto.randomBytes(6).toString('base64url');
  const now = new Date().toISOString();

  const record: SharedDiagram = {
    id,
    title: input.title || null,
    mermaid: input.mermaid,
    diagramType: input.diagramType,
    direction: input.direction || null,
    theme: input.theme || null,
    sourceText: input.sourceText || null,
    createdAt: now,
  };

  // Always keep in-memory backup
  inMemoryDiagrams.set(id, record);

  const sql = getSql();
  if (!sql) {
    return record;
  }

  try {
    await initDbSchema();
    await sql`
      INSERT INTO shared_diagrams (
        id, title, mermaid, diagram_type, direction, theme, source_text, created_at, updated_at
      ) VALUES (
        ${id},
        ${record.title},
        ${record.mermaid},
        ${record.diagramType},
        ${record.direction},
        ${record.theme},
        ${record.sourceText},
        ${record.createdAt},
        ${record.createdAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        mermaid = EXCLUDED.mermaid,
        diagram_type = EXCLUDED.diagram_type,
        direction = EXCLUDED.direction,
        theme = EXCLUDED.theme,
        source_text = EXCLUDED.source_text,
        updated_at = NOW();
    `;
    return record;
  } catch (err) {
    log('warn', 'Failed to persist shared diagram to Neon; retained in-memory fallback', {
      id,
      error: String(err),
    });
    return record;
  }
}

export async function getDiagram(id: string): Promise<SharedDiagram | null> {
  const sql = getSql();
  if (sql) {
    try {
      await initDbSchema();
      const result = await sql`
        SELECT
          id,
          title,
          mermaid,
          diagram_type as "diagramType",
          direction,
          theme,
          source_text as "sourceText",
          created_at as "createdAt"
        FROM shared_diagrams
        WHERE id = ${id}
        LIMIT 1;
      `;
      const rows = result as unknown as Record<string, unknown>[];
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0] as unknown as SharedDiagram;
        inMemoryDiagrams.set(id, row); // Cache locally
        return row;
      }
    } catch (err) {
      log('warn', 'Failed to fetch diagram from Neon; falling back to in-memory cache', {
        id,
        error: String(err),
      });
    }
  }

  // Fallback to in-memory store
  return inMemoryDiagrams.get(id) || null;
}
