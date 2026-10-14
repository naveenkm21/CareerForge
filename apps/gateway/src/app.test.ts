import { describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('gateway', () => {
  it('reports health', async () => {
    const app = buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', service: 'gateway' });
    await app.close();
  });
});
