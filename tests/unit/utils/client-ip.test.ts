import express, { Request, Response } from 'express';
import request from 'supertest';
import { App } from '../../../src/app';
import { getClientIp, TRUST_PROXY_HOPS } from '../../../src/utils/client-ip';

function ipApp() {
  const app = express();
  app.set('trust proxy', TRUST_PROXY_HOPS);
  app.get('/ip', (req: Request, res: Response) => {
    res.json({ ip: req.ip, ips: req.ips, clientIp: getClientIp(req) });
  });
  return app;
}

describe('trust proxy and getClientIp', () => {
  it('configures the real app to trust one App Platform hop', () => {
    expect(TRUST_PROXY_HOPS).toBe(1);
    expect(new App().getApp().get('trust proxy')).toBe(1);
  });

  it('sets req.ip to the single X-Forwarded-For hop', async () => {
    const response = await request(ipApp())
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.10');

    expect(response.body.ip).toBe('203.0.113.10');
    expect(response.body.clientIp).toBe('203.0.113.10');
  });

  it('does not trust a client-supplied left-most X-Forwarded-For address when hop count is 1', async () => {
    const response = await request(ipApp())
      .get('/ip')
      .set('X-Forwarded-For', '198.51.100.1, 203.0.113.10');

    expect(response.body.ip).toBe('203.0.113.10');
    expect(response.body.ips).toEqual(['203.0.113.10']);
    expect(response.body.clientIp).toBe('203.0.113.10');
  });

  it('prefers do-connecting-ip over X-Forwarded-For (App Platform visitor header)', async () => {
    const response = await request(ipApp())
      .get('/ip')
      .set('X-Forwarded-For', '198.51.100.1, 203.0.113.10')
      .set('do-connecting-ip', '203.0.113.50');

    // req.ip still follows the one trusted X-Forwarded-For hop (the ingress)
    expect(response.body.ip).toBe('203.0.113.10');
    expect(response.body.clientIp).toBe('203.0.113.50');
  });

  it('prefers CF-Connecting-IP when Cloudflare proxied the request (CF-Ray present)', async () => {
    const response = await request(ipApp())
      .get('/ip')
      .set('X-Forwarded-For', '198.51.100.1, 203.0.113.10')
      .set('do-connecting-ip', '10.0.0.2')
      .set('CF-Connecting-IP', '203.0.113.9')
      .set('CF-Ray', 'a603cfad8dad5009-IAD');

    expect(response.body.clientIp).toBe('203.0.113.9');
  });

  it('ignores a spoofed CF-Connecting-IP when there is no CF-Ray and do-connecting-ip is set', async () => {
    const response = await request(ipApp())
      .get('/ip')
      .set('do-connecting-ip', '203.0.113.50')
      .set('CF-Connecting-IP', '198.51.100.1');

    expect(response.body.clientIp).toBe('203.0.113.50');
  });
});
