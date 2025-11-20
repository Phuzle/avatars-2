import { config } from './config.js';
import fastify from 'fastify';
import cors from '@fastify/cors';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as dicebear from '@dicebear/api-9';

type AvatarRequest = {
  Params: {
    seed: string;
    '*'?: string;
  };
  Querystring: Record<string, any>;
};

export const app = async () => {
  const app = fastify({
    logger: config.logger,
    ajv: {
      customOptions: {
        coerceTypes: 'array',
        removeAdditional: true,
        useDefaults: false,
      },
    },
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true);
      }

      const url = new URL(origin);
      const hostname = url.hostname;

      // Allowed domain patterns
      const allowedPatterns = [
        /\.shivamdevs\.com$/,
        /\.dewangan\.co$/,
        /\.dewangans\.com$/,
        /^shivamdevs\.com$/,
        /^dewangan\.co$/,
        /^dewangans\.com$/,
      ];

      // Check if origin matches allowed patterns
      if (allowedPatterns.some(pattern => pattern.test(hostname))) {
        return callback(null, true);
      }

      // Deny all other origins
      callback(null, false);
    },
  });

  // Get v9 thumbs style
  const core = dicebear.core;
  const style = dicebear.collection.thumbs;

  // Shared handler function for avatar generation
  const handleAvatarRequest = async (request: FastifyRequest<AvatarRequest>, reply: FastifyReply) => {
    const { format, ...queryOptions } = request.query;

    // Unwrap single-value arrays from query parameters
    const unwrappedOptions: Record<string, any> = {};
    for (const [key, value] of Object.entries(queryOptions)) {
      unwrappedOptions[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
    }

    // Combine seed segments: /seed1/seed2/seed3 -> "seed1/seed2/seed3"
    const seedPath = request.params['*'] || '';
    const finalSeed = seedPath ? `${request.params.seed}/${seedPath}` : request.params.seed;


    const options = { ...unwrappedOptions, seed: finalSeed };
    const outputFormat = format === 'json' ? 'json' : 'svg';

    reply.header('X-Robots-Tag', 'noindex');
    reply.header('Cache-Control', `max-age=${config.cacheControl}`);

    const avatar = core.createAvatar(style, options);

    if (outputFormat === 'json') {
      reply.header('Content-Disposition', `inline; filename="avatar.json"`);
      reply.header('Content-Type', 'application/json');
      return JSON.stringify(avatar.toJson());
    } else {
      reply.header('Content-Disposition', `inline; filename="avatar.svg"`);
      reply.header('Content-Type', 'image/svg+xml');
      return avatar.toString();
    }
  };

  // Route: /:seed/* (with optional path segments)
  app.route<AvatarRequest>({
    method: 'GET',
    url: '/:seed/*',
    handler: handleAvatarRequest,
  });

  // Route: /:seed (single segment fallback)
  app.route<AvatarRequest>({
    method: 'GET',
    url: '/:seed',
    handler: handleAvatarRequest,
  });

  return app;
};
