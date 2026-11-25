import { Request } from 'express';

/**
 * Number of trusted reverse-proxy hops in front of the Node process
 * on DigitalOcean App Platform. The platform always puts its load
 * balancer / ingress in front of the container, so this is 1.
 *
 * lectio-api.org also has Cloudflare in front of App Platform, but
 * that extra hop is not counted here: DigitalOcean documents
 * X-Forwarded-For as the ingress address, not the visitor, so a
 * higher hop count would either still miss the client or start
 * trusting a client-supplied X-Forwarded-For. Visitor IPs come from
 * the platform headers handled in getClientIp().
 */
export const TRUST_PROXY_HOPS = 1;

function firstAddress(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  const first = raw.split(',')[0]?.trim();
  return first || undefined;
}

/**
 * The visitor IP for rate limiting and logs.
 *
 * Prefer CF-Connecting-IP when the request was proxied by Cloudflare
 * (CF-Ray is always set on those requests). Otherwise prefer
 * DigitalOcean's do-connecting-ip, which App Platform sets to the
 * address that connected to the ingress (the visitor on a direct
 * App Platform URL; the Cloudflare edge when the domain is proxied).
 * Fall back to Express's req.ip, which with trust proxy = 1 is the
 * one-hop X-Forwarded-For value (the ingress hop on App Platform).
 */
export function getClientIp(req: Request): string {
  const cfConnecting = firstAddress(req.get('cf-connecting-ip'));
  const cfRay = req.get('cf-ray');
  const doConnecting = firstAddress(req.get('do-connecting-ip'));

  if (cfConnecting && (cfRay || !doConnecting)) {
    return cfConnecting;
  }
  if (doConnecting) {
    return doConnecting;
  }
  if (req.ip) {
    return req.ip;
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}
