import NodeCache from 'node-cache';

export const lockCache = new NodeCache({ stdTTL: 60 });
export const idempotencyCache = new NodeCache({ stdTTL: 60 });
export const refreshTokenCache = new NodeCache();