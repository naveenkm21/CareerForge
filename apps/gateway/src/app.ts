import Fastify, { type FastifyInstance } from 'fastify';

/**
 * apps/gateway — the stateful half of the system (ADR-002): sockets, background jobs, long AI
 * streams. Weeks 1–3 ship only the skeleton so the Oracle VM deploy path exists from day one;
 * Socket.IO rooms and BullMQ workers arrive in week 7, the judge proxy in week 4.
 */
export function buildApp(opts: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? true });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'gateway',
    version: process.env.GIT_SHA?.slice(0, 7) ?? 'dev',
    checks: {
      redis: { ok: null, note: 'not configured (week 7)' },
      judge: { ok: null, note: 'not configured (week 4)' },
    },
    time: new Date().toISOString(),
  }));

  return app;
}
