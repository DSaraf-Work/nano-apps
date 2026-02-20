/**
 * POST /api/reminders/:id/synced
 * Called by Remindly PWA after successfully importing a reminder into IndexedDB.
 * Marks the D1 row as synced so it won't be returned again.
 *
 * Auth: Authorization: Bearer <REMINDLY_API_KEY>
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function onRequest(ctx) {
  const { request, env, params } = ctx;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${env.REMINDLY_API_KEY}`) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const { id } = params;
  await env.DB.prepare('UPDATE reminders SET synced = 1 WHERE id = ?').bind(id).run();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
