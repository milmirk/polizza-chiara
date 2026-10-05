import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function basicAuth(credentials = process.env.BASIC_AUTH): RequestHandler {
  if (!credentials) return (_req, _res, next) => next();
  const expected = `Basic ${Buffer.from(credentials).toString('base64')}`;
  return (req, res, next) => {
    if (same(req.headers.authorization ?? '', expected)) return next();
    res.set('WWW-Authenticate', 'Basic realm="Polizza Chiara", charset="UTF-8"').status(401).send('Accesso riservato');
  };
}
