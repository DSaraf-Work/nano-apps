/**
 * POST /api/reminders  — create a reminder (called by iOS Shortcut)
 * GET  /api/reminders  — fetch unsynced reminders (called by Remindly PWA on open)
 *
 * Auth: Authorization: Bearer <REMINDLY_API_KEY>
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function unauthorized() {
  return new Response('Unauthorized', { status: 401, headers: CORS });
}

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.REMINDLY_API_KEY}`;
}

export async function onRequest(ctx) {
  const { request, env } = ctx;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (!checkAuth(request, env)) return unauthorized();

  // ── POST /api/reminders — create a reminder ────────────────────────────
  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const { title, description = '', nextFireAt: rawFireAt, repeat = 'none', intervalMs = 0, followUps = [] } = body;

    if (!title) {
      return json({ error: 'title is required' }, 400);
    }

    // nextFireAt is optional — omit it to send raw text for client-side parsing.
    // Accepts: Unix ms number, ISO 8601 string, or absent/0 (raw text mode).
    let nextFireAt = 0;
    if (rawFireAt) {
      nextFireAt = typeof rawFireAt === 'number'
        ? rawFireAt
        : new Date(rawFireAt).getTime();
      if (isNaN(nextFireAt)) nextFireAt = 0;
    }

    const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();

    await env.DB.prepare(`
      INSERT INTO reminders (id, title, description, next_fire_at, repeat, interval_ms, follow_ups, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, title, description, nextFireAt, repeat, intervalMs, JSON.stringify(followUps), createdAt).run();

    return json({ id, title, nextFireAt, createdAt }, 201);
  }

  // ── GET /api/reminders — return all unsynced reminders ────────────────
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM reminders WHERE synced = 0 ORDER BY created_at DESC'
    ).all();

    const reminders = results.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      nextFireAt: r.next_fire_at,
      repeat: r.repeat,
      intervalMs: r.interval_ms,
      followUps: JSON.parse(r.follow_ups || '[]'),
      createdAt: r.created_at,
    }));

    return json({ reminders });
  }

  return new Response('Method Not Allowed', { status: 405, headers: CORS });
}
