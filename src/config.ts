import { Config } from './types.js';

export const config: Config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  logger: Boolean(Number(process.env.LOGGER) ?? 0),
  workers: Number(process.env.WORKERS ?? 1),
  cacheControl: Number(process.env.CACHE_CONTROL ?? 60 * 60 * 24 * 365),
};
