const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    // POST /api/score
    if (request.method === 'POST' && url.pathname === '/api/score') {
      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON'); }

      const { puzzleId, difficulty, timeSec, username } = body;

      if (typeof puzzleId !== 'number') return err('puzzleId must be a number');
      if (!['easy','medium','hard'].includes(difficulty)) return err('Invalid difficulty');
      if (typeof timeSec !== 'number' || timeSec < 1 || timeSec > 86400) return err('Invalid timeSec');
      if (typeof username !== 'string' || !username.trim()) return err('username required');

      const name = username.trim().slice(0, 20).replace(/[^a-zA-Z0-9 _\-]/g, '');
      if (!name) return err('username contains no valid characters');

      // One score per username per puzzle+difficulty (keep best)
      const existing = await env.DB.prepare(
        'SELECT id, time_sec FROM scores WHERE puzzle_id=? AND difficulty=? AND username=?'
      ).bind(puzzleId, difficulty, name).first();

      if (existing) {
        if (timeSec < existing.time_sec) {
          await env.DB.prepare(
            'UPDATE scores SET time_sec=?, created_at=datetime("now") WHERE id=?'
          ).bind(timeSec, existing.id).run();
        }
      } else {
        await env.DB.prepare(
          'INSERT INTO scores (puzzle_id, difficulty, username, time_sec) VALUES (?,?,?,?)'
        ).bind(puzzleId, difficulty, name, timeSec).run();
      }

      // Return rank
      const rank = await env.DB.prepare(
        'SELECT COUNT(*)+1 AS rank FROM scores WHERE puzzle_id=? AND difficulty=? AND time_sec<?'
      ).bind(puzzleId, difficulty, timeSec).first();

      return json({ ok: true, rank: rank?.rank ?? 1 });
    }

    // GET /api/leaderboard?puzzleId=X&difficulty=Y
    if (request.method === 'GET' && url.pathname === '/api/leaderboard') {
      const puzzleId = parseInt(url.searchParams.get('puzzleId'), 10);
      const difficulty = url.searchParams.get('difficulty');

      if (isNaN(puzzleId)) return err('puzzleId required');
      if (!['easy','medium','hard'].includes(difficulty)) return err('Invalid difficulty');

      const { results } = await env.DB.prepare(
        `SELECT username, time_sec
         FROM scores
         WHERE puzzle_id=? AND difficulty=?
         ORDER BY time_sec ASC
         LIMIT 10`
      ).bind(puzzleId, difficulty).all();

      return json({ leaderboard: results ?? [] });
    }

    return err('Not found', 404);
  },
};
