import {
  appConfigSchema,
  assignPromoCodeSchema,
  createSupportThreadSchema,
  defaultAppConfig,
  grantEntitlementSchema,
  importPromoCodesSchema,
  setAdminRoleSchema,
  supportMessageSchema,
  supportStatusSchema,
  updateAppConfigSchema,
  verifyGooglePurchaseSchema,
  type AdminRole,
  type AppConfig
} from '@spark/cloud-contracts';
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response
} from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createHash } from 'node:crypto';
import { ZodError } from 'zod';
import type {
  AuthenticatedUser,
  Dependencies,
  EntitlementRecord,
  SupportMessageRecord,
  SupportThreadRecord
} from './types.js';

interface UserRequest extends Request {
  user?: AuthenticatedUser;
}

function bearerToken(request: Request): string | null {
  const value = request.header('authorization');
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim();
}

function routeParam(request: Request, name: string): string {
  const value = request.params[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function normalizeRole(
  user: AuthenticatedUser,
  allowlist: string[]
): AdminRole | undefined {
  if (
    user.email &&
    allowlist.some((email) => email.toLowerCase() === user.email?.toLowerCase())
  ) {
    return 'owner';
  }
  return user.adminRole === 'none' ? undefined : user.adminRole;
}

function activeEntitlement(
  entitlement: EntitlementRecord | null,
  now: Date
): EntitlementRecord {
  if (!entitlement) {
    return {
      premium: false,
      source: 'none',
      expiresAt: null,
      updatedAt: now.toISOString()
    };
  }
  if (
    entitlement.premium &&
    entitlement.expiresAt &&
    new Date(entitlement.expiresAt).getTime() <= now.getTime()
  ) {
    return { ...entitlement, premium: false };
  }
  return entitlement;
}

export function createApp(
  dependencies: Dependencies,
  options: { premiumProductId?: string } = {}
) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || dependencies.allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error('Origin is not allowed.'));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 3600
    })
  );
  app.use(express.json({ limit: '64kb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 180,
      standardHeaders: 'draft-8',
      legacyHeaders: false
    })
  );

  const authenticate = async (
    request: UserRequest,
    response: Response,
    next: NextFunction
  ) => {
    const token = bearerToken(request);
    if (!token) {
      response.status(401).json({ error: 'unauthenticated', message: 'Sign-in is required.' });
      return;
    }
    try {
      const user = await dependencies.auth.verify(token);
      request.user = {
        ...user,
        adminRole: normalizeRole(user, dependencies.adminEmailAllowlist)
      };
      next();
    } catch {
      response.status(401).json({
        error: 'invalid_token',
        message: 'The session is invalid or expired.'
      });
    }
  };

  const requireRole =
    (...roles: AdminRole[]) =>
    (request: UserRequest, response: Response, next: NextFunction) => {
      const role = request.user?.adminRole;
      if (!role || !roles.includes(role)) {
        response.status(403).json({
          error: 'forbidden',
          message: 'This admin role cannot perform that action.'
        });
        return;
      }
      next();
    };

  const supportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'rate_limited',
      message: 'Please wait before sending more support messages.'
    }
  });
  let configCache: { value: AppConfig; expiresAt: number } | null = null;

  const currentConfig = async () => {
    const now = dependencies.now().getTime();
    if (configCache && configCache.expiresAt > now) return configCache.value;
    const value = appConfigSchema.parse(
      (await dependencies.store.getConfig()) ?? defaultAppConfig
    );
    configCache = { value, expiresAt: now + 5 * 60 * 1000 };
    return value;
  };

  app.get('/healthz', (_request, response) => {
    response.json({ ok: true, service: 'spark-control-plane' });
  });

  app.get('/v1/config', async (_request, response, next) => {
    try {
      response.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
      response.json(await currentConfig());
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/me/entitlement', authenticate, async (request: UserRequest, response, next) => {
    try {
      const entitlement = activeEntitlement(
        await dependencies.store.getEntitlement(request.user!.uid),
        dependencies.now()
      );
      response.json({
        premium: entitlement.premium,
        source: entitlement.source,
        expiresAt: entitlement.expiresAt
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/v1/me', authenticate, async (request: UserRequest, response, next) => {
    try {
      const uid = request.user!.uid;
      await dependencies.store.deleteUserData(uid);
      await dependencies.auth.deleteUser(uid);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/v1/purchases/google/verify',
    authenticate,
    async (request: UserRequest, response, next) => {
      try {
        const input = verifyGooglePurchaseSchema.parse(request.body);
        const expected = options.premiumProductId ?? 'spark_premium_lifetime';
        if (input.productId !== expected) {
          response.status(400).json({
            error: 'unknown_product',
            message: 'This product is not recognized by Spark.'
          });
          return;
        }
        const verified = await dependencies.purchases.verifyProduct(input);
        if (!verified.valid) {
          response.status(402).json({
            error: 'purchase_invalid',
            message: 'Google Play did not confirm this purchase.'
          });
          return;
        }
        const now = dependencies.now().toISOString();
        const entitlement: EntitlementRecord = {
          premium: true,
          source: 'play',
          productId: input.productId,
          expiresAt: null,
          updatedAt: now
        };
        await dependencies.store.setEntitlement(request.user!.uid, entitlement);
        await dependencies.store.touchUser(request.user!.uid, {
          email: request.user?.email,
          at: now
        });
        await dependencies.store.writeAudit({
          id: dependencies.id('audit'),
          actorId: request.user!.uid,
          action: 'purchase.verified',
          target: request.user!.uid,
          at: now,
          metadata: {
            productId: input.productId,
            orderId: verified.orderId
          }
        });
        response.json({
          premium: true,
          source: 'play',
          expiresAt: null
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/support/threads',
    authenticate,
    async (request: UserRequest, response, next) => {
      try {
        response.json(await dependencies.store.listUserSupportThreads(request.user!.uid, 20));
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/support/threads',
    supportLimiter,
    authenticate,
    async (request: UserRequest, response, next) => {
      try {
        const input = createSupportThreadSchema.parse(request.body);
        const at = dependencies.now().toISOString();
        const threadId = dependencies.id('thread');
        const thread: SupportThreadRecord = {
          id: threadId,
          ownerId: request.user!.uid,
          subject: input.subject,
          status: 'open',
          createdAt: at,
          lastMessageAt: at,
          unreadByUser: 0,
          unreadByAdmin: 1,
          appVersion: input.appVersion,
          platform: input.platform
        };
        const message: SupportMessageRecord = {
          id: dependencies.id('message'),
          author: 'user',
          authorId: request.user!.uid,
          text: input.message,
          createdAt: at
        };
        await dependencies.store.createSupportThread(thread, message);
        await dependencies.store.touchUser(request.user!.uid, {
          email: request.user?.email,
          platform: input.platform,
          appVersion: input.appVersion,
          at
        });
        response.status(201).json({ id: threadId });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/support/threads/:id/messages',
    authenticate,
    async (request: UserRequest, response, next) => {
      try {
        const thread = await dependencies.store.getSupportThread(routeParam(request, 'id'));
        if (!thread || thread.ownerId !== request.user!.uid) {
          response.status(404).json({
            error: 'not_found',
            message: 'That support conversation was not found.'
          });
          return;
        }
        await dependencies.store.updateSupportThread(thread.id, { unreadByUser: 0 });
        response.json(await dependencies.store.listSupportMessages(thread.id, 100));
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/support/threads/:id/messages',
    supportLimiter,
    authenticate,
    async (request: UserRequest, response, next) => {
      try {
        const input = supportMessageSchema.parse(request.body);
        const thread = await dependencies.store.getSupportThread(routeParam(request, 'id'));
        if (!thread || thread.ownerId !== request.user!.uid) {
          response.status(404).json({
            error: 'not_found',
            message: 'That support conversation was not found.'
          });
          return;
        }
        const at = dependencies.now().toISOString();
        const message: SupportMessageRecord = {
          id: dependencies.id('message'),
          author: 'user',
          authorId: request.user!.uid,
          text: input.text,
          createdAt: at
        };
        await dependencies.store.addSupportMessage(thread.id, message, {
          status: 'open',
          lastMessageAt: at,
          unreadByAdmin: thread.unreadByAdmin + 1
        });
        response.status(201).json({ id: message.id });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/admin/overview',
    authenticate,
    requireRole('owner', 'support', 'content'),
    async (_request, response, next) => {
      try {
        response.json(await dependencies.store.overview());
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/admin/users',
    authenticate,
    requireRole('owner', 'support'),
    async (_request, response, next) => {
      try {
        response.json(await dependencies.store.listUsers(100));
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/admin/support',
    authenticate,
    requireRole('owner', 'support'),
    async (request, response, next) => {
      try {
        const rawStatus = request.query.status;
        const status =
          typeof rawStatus === 'string' && rawStatus !== 'all'
            ? supportStatusSchema.parse({ status: rawStatus }).status
            : undefined;
        response.json(await dependencies.store.listSupportThreads(status, 100));
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/admin/support/:id/messages',
    authenticate,
    requireRole('owner', 'support'),
    async (request, response, next) => {
      try {
        const thread = await dependencies.store.getSupportThread(routeParam(request, 'id'));
        if (!thread) {
          response.status(404).json({ error: 'not_found', message: 'Thread not found.' });
          return;
        }
        await dependencies.store.updateSupportThread(thread.id, { unreadByAdmin: 0 });
        response.json(await dependencies.store.listSupportMessages(thread.id, 100));
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/admin/support/:id/messages',
    authenticate,
    requireRole('owner', 'support'),
    async (request: UserRequest, response, next) => {
      try {
        const input = supportMessageSchema.parse(request.body);
        const thread = await dependencies.store.getSupportThread(routeParam(request, 'id'));
        if (!thread) {
          response.status(404).json({ error: 'not_found', message: 'Thread not found.' });
          return;
        }
        const at = dependencies.now().toISOString();
        const message: SupportMessageRecord = {
          id: dependencies.id('message'),
          author: 'admin',
          authorId: request.user!.uid,
          text: input.text,
          createdAt: at
        };
        await dependencies.store.addSupportMessage(thread.id, message, {
          status: 'waiting_on_user',
          lastMessageAt: at,
          unreadByUser: thread.unreadByUser + 1
        });
        await dependencies.store.writeAudit({
          id: dependencies.id('audit'),
          actorId: request.user!.uid,
          action: 'support.replied',
          target: thread.id,
          at
        });
        response.status(201).json({ id: message.id });
      } catch (error) {
        next(error);
      }
    }
  );

  app.patch(
    '/v1/admin/support/:id/status',
    authenticate,
    requireRole('owner', 'support'),
    async (request: UserRequest, response, next) => {
      try {
        const input = supportStatusSchema.parse(request.body);
        const threadId = routeParam(request, 'id');
        await dependencies.store.updateSupportThread(threadId, {
          status: input.status
        });
        const at = dependencies.now().toISOString();
        await dependencies.store.writeAudit({
          id: dependencies.id('audit'),
          actorId: request.user!.uid,
          action: 'support.status_changed',
          target: threadId,
          at,
          metadata: { status: input.status }
        });
        response.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/admin/config',
    authenticate,
    requireRole('owner', 'content'),
    async (request: UserRequest, response, next) => {
      try {
        const input = updateAppConfigSchema.parse(request.body);
        const config = { ...input, updatedAt: dependencies.now().toISOString() };
        await dependencies.store.setConfig(config);
        configCache = {
          value: appConfigSchema.parse(config),
          expiresAt: dependencies.now().getTime() + 5 * 60 * 1000
        };
        await dependencies.store.writeAudit({
          id: dependencies.id('audit'),
          actorId: request.user!.uid,
          action: 'config.updated',
          target: 'config/current',
          at: config.updatedAt
        });
        response.json(config);
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/admin/promo-codes',
    authenticate,
    requireRole('owner', 'support'),
    async (_request, response, next) => {
      try {
        response.json(await dependencies.store.listPromoCodes(200));
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/admin/promo-codes/import',
    authenticate,
    requireRole('owner'),
    async (request: UserRequest, response, next) => {
      try {
        const input = importPromoCodesSchema.parse(request.body);
        const at = dependencies.now().toISOString();
        const unique = [...new Set(input.codes)];
        const codes = unique.map((code) => ({
          id: createHash('sha256').update(code).digest('hex'),
          code,
          campaign: input.campaign,
          productId: input.productId,
          status: 'available' as const,
          importedAt: at
        }));
        const imported = await dependencies.store.importPromoCodes(codes);
        await dependencies.store.writeAudit({
          id: dependencies.id('audit'),
          actorId: request.user!.uid,
          action: 'promo.imported',
          target: input.campaign,
          at,
          metadata: { requested: unique.length, imported }
        });
        response.status(201).json({ imported });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/admin/promo-codes/assign',
    authenticate,
    requireRole('owner', 'support'),
    async (request: UserRequest, response, next) => {
      try {
        const input = assignPromoCodeSchema.parse(request.body);
        const at = dependencies.now().toISOString();
        const code = await dependencies.store.assignPromoCode(input.userId, at);
        if (!code) {
          response.status(409).json({
            error: 'no_codes',
            message: 'No imported Google Play promo codes are available.'
          });
          return;
        }
        await dependencies.store.writeAudit({
          id: dependencies.id('audit'),
          actorId: request.user!.uid,
          action: 'promo.assigned',
          target: input.userId,
          at,
          metadata: { promoCodeId: code.id, campaign: code.campaign }
        });
        response.json({ code: code.code, productId: code.productId });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/admin/users/:uid/entitlement',
    authenticate,
    requireRole('owner'),
    async (request: UserRequest, response, next) => {
      try {
        const input = grantEntitlementSchema.parse(request.body);
        const at = dependencies.now().toISOString();
        const entitlement: EntitlementRecord = {
          premium: input.premium,
          source: input.premium ? 'admin' : 'none',
          expiresAt: input.expiresAt ?? null,
          updatedAt: at
        };
        const uid = routeParam(request, 'uid');
        await dependencies.store.setEntitlement(uid, entitlement);
        await dependencies.store.writeAudit({
          id: dependencies.id('audit'),
          actorId: request.user!.uid,
          action: input.premium ? 'entitlement.granted' : 'entitlement.revoked',
          target: uid,
          reason: input.reason,
          at,
          metadata: { expiresAt: entitlement.expiresAt }
        });
        response.json(entitlement);
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/admin/roles',
    authenticate,
    requireRole('owner'),
    async (request: UserRequest, response, next) => {
      try {
        const input = setAdminRoleSchema.parse(request.body);
        const changed = await dependencies.auth.setRole(input.email, input.role);
        const at = dependencies.now().toISOString();
        await dependencies.store.writeAudit({
          id: dependencies.id('audit'),
          actorId: request.user!.uid,
          action: 'admin.role_changed',
          target: changed.uid,
          reason: `Role set to ${input.role}`,
          at,
          metadata: { email: changed.email, role: input.role }
        });
        response.json(changed);
      } catch (error) {
        next(error);
      }
    }
  );

  app.use((_request, response) => {
    response.status(404).json({ error: 'not_found', message: 'Endpoint not found.' });
  });

  app.use(
    (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
      if (error instanceof ZodError) {
        response.status(400).json({
          error: 'invalid_request',
          message: error.issues[0]?.message ?? 'The request is invalid.'
        });
        return;
      }
      console.error(error);
      response.status(500).json({
        error: 'internal',
        message: 'Spark could not complete that request.'
      });
    }
  );

  return app;
}
