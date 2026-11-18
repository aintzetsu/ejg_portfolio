import { neon } from '@neondatabase/serverless';

const ALLOWED_TARGETS = new Set([
  'portfolio',
  'project-simotsarap',
  'project-vesper',
  'project-labelgrid',
  'project-foliovault',
  'project-cutout-studio',
  'project-restbench',
  'project-pathcraft',
  'project-chromalab',
  'project-folio-notes',
  'project-ledgerflow',
  'project-sprintdeck',
  'project-meridian-sync',
  'project-pulsegrid',
  'project-koto-cabin',
]);

const VISITOR_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

let schemaPromise = null;

function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(connectionString);
}

async function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS portfolio_like_targets (
          target TEXT PRIMARY KEY,
          total_likes INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS portfolio_like_voters (
          target TEXT NOT NULL,
          visitor_id TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (target, visitor_id)
        )
      `;
    })().catch(err => {
      schemaPromise = null;
      throw err;
    });
  }
  await schemaPromise;
}

function createEmptyCounts() {
  const counts = {};
  for (const target of ALLOWED_TARGETS) {
    counts[target] = 0;
  }
  return counts;
}

function jsonResponse(payload, status = 200) {
  return Response.json(payload, { status, headers: NO_STORE_HEADERS });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const visitorIdRaw = (searchParams.get('visitorId') || '').trim();
    const visitorId = VISITOR_ID_RE.test(visitorIdRaw) ? visitorIdRaw : null;

    const sql = getSql();
    await ensureSchema(sql);

    const targetRows = await sql`
      SELECT target, total_likes
      FROM portfolio_like_targets
    `;

    const counts = createEmptyCounts();
    let totalAllLikes = 0;
    for (const row of targetRows) {
      if (ALLOWED_TARGETS.has(row.target)) {
        const count = Math.max(0, Number(row.total_likes) || 0);
        counts[row.target] = count;
        totalAllLikes += count;
      }
    }

    let liked = [];
    if (visitorId) {
      const voterRows = await sql`
        SELECT target
        FROM portfolio_like_voters
        WHERE visitor_id = ${visitorId}
      `;
      liked = voterRows
        .map(row => row.target)
        .filter(target => ALLOWED_TARGETS.has(target));
    }

    return jsonResponse({
      ok: true,
      counts,
      liked,
      portfolioLikes: counts.portfolio,
      totalAllLikes,
    });
  } catch (err) {
    console.error('GET /api/likes failed:', err);
    return jsonResponse({ ok: false, error: 'Unable to load likes right now.' }, 500);
  }
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const target = typeof body?.target === 'string' ? body.target.trim() : '';
    const visitorId = typeof body?.visitorId === 'string' ? body.visitorId.trim() : '';
    const action = typeof body?.action === 'string' ? body.action.trim() : 'like';

    if (!ALLOWED_TARGETS.has(target)) {
      return jsonResponse({ ok: false, error: 'Unsupported like target.' }, 400);
    }
    if (!VISITOR_ID_RE.test(visitorId)) {
      return jsonResponse({ ok: false, error: 'Valid visitorId is required.' }, 400);
    }
    if (action !== 'like' && action !== 'unlike') {
      return jsonResponse({ ok: false, error: 'Action must be "like" or "unlike".' }, 400);
    }

    const sql = getSql();
    await ensureSchema(sql);

    let rows;
    if (action === 'like') {
      rows = await sql`
        WITH ins AS (
          INSERT INTO portfolio_like_voters (target, visitor_id)
          VALUES (${target}, ${visitorId})
          ON CONFLICT (target, visitor_id) DO NOTHING
          RETURNING 1
        ),
        upd AS (
          INSERT INTO portfolio_like_targets (target, total_likes, updated_at)
          VALUES (${target}, (SELECT COUNT(*)::INTEGER FROM ins), NOW())
          ON CONFLICT (target) DO UPDATE
          SET total_likes = portfolio_like_targets.total_likes + (SELECT COUNT(*)::INTEGER FROM ins),
              updated_at = NOW()
          RETURNING total_likes
        )
        SELECT total_likes, (SELECT COUNT(*)::INTEGER FROM ins) > 0 AS changed FROM upd
      `;
    } else {
      rows = await sql`
        WITH del AS (
          DELETE FROM portfolio_like_voters
          WHERE target = ${target} AND visitor_id = ${visitorId}
          RETURNING 1
        ),
        upd AS (
          INSERT INTO portfolio_like_targets (target, total_likes, updated_at)
          VALUES (${target}, 0, NOW())
          ON CONFLICT (target) DO UPDATE
          SET total_likes = GREATEST(0, portfolio_like_targets.total_likes - (SELECT COUNT(*)::INTEGER FROM del)),
              updated_at = NOW()
          RETURNING total_likes
        )
        SELECT total_likes, (SELECT COUNT(*)::INTEGER FROM del) > 0 AS changed FROM upd
      `;
    }

    const row = rows[0] || { total_likes: 0, changed: false };
    return jsonResponse({
      ok: true,
      target,
      likes: Math.max(0, Number(row.total_likes) || 0),
      liked: action === 'like',
      changed: Boolean(row.changed),
    });
  } catch (err) {
    console.error('POST /api/likes failed:', err);
    return jsonResponse({ ok: false, error: 'Unable to update like right now.' }, 500);
  }
}
