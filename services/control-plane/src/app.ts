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
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import type {
  AuthenticatedUser,
  Dependencies,
  EntitlementRecord,
  SupportMessageRecord,
  SupportThreadRecord
} from './types.js';

interface UserRequest extends Request {
  user?: AuthenticatedUser;
  requestId?: string;
}

const pubSubEnvelopeSchema = z.object({
  message: z.object({
    messageId: z.string().min(1).max(300),
    data: z.string().min(1).max(100_000)
  }),
  subscription: z.string().optional()
});

const developerNotificationSchema = z.object({
  packageName: z.string(),
  eventTimeMillis: z.string().optional(),
  oneTimeProductNotification: z
    .object({
      notificationType: z.number().int(),
      purchaseToken: z.string(),
      sku: z.string()
    })
    .optional(),
  voidedPurchaseNotification: z
    .object({
      purchaseToken: z.string(),
      orderId: z.string().optional(),
      productType: z.number().int(),
      refundType: z.number().int().optional()
    })
    .optional(),
  testNotification: z.record(z.string(), z.unknown()).optional()
});

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

function queryValue(request: Request, name: string): string | undefined {
  const value = request.query[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function pageInput(request: Request, defaultLimit = 50, maxLimit = 100) {
  const requested = Number(queryValue(request, 'limit') ?? defaultLimit);
  return {
    limit: Number.isInteger(requested)
      ? Math.max(1, Math.min(maxLimit, requested))
      : defaultLimit,
    cursor: queryValue(request, 'cursor')
  };
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString();
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
  options: {
    premiumProductId?: string;
    packageName?: string;
    supportRetentionDays?: number;
    auditRetentionDays?: number;
  } = {}
) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((request: UserRequest, response, next) => {
    const incoming = request.header('x-request-id');
    request.requestId =
      incoming && /^[A-Za-z0-9._-]{1,100}$/.test(incoming)
        ? incoming
        : randomUUID();
    response.set('X-Request-Id', request.requestId);
    const startedAt = Date.now();
    response.on('finish', () => {
      console.log(
        JSON.stringify({
          severity: response.statusCode >= 500 ? 'ERROR' : 'INFO',
          event: 'http.request',
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          status: response.statusCode,
          durationMs: Date.now() - startedAt
        })
      );
    });
    next();
  });
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
  app.use(express.json({ limit: '128kb' }));
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
  const purchaseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'rate_limited',
      message: 'Please wait before checking this purchase again.'
    }
  });
  let configCache: { value: AppConfig; expiresAt: number } | null = null;

  const currentConfig = async () => {
    const now = dependencies.now().getTime();
    if (configCache && configCache.expiresAt > now) return configCache.value;
    const value = appConfigSchema.parse(
      (await dependencies.store.getConfig()) ?? defaultAppConfig
    );
    // Mutation routes re-check frequently so an emergency shutdown propagates
    // across independently scaled Cloud Run instances without a restart.
    configCache = { value, expiresAt: now + 30 * 1000 };
    return value;
  };

  type CostedFeature =
    | 'support'
    | 'purchases'
    | 'userReview'
    | 'manualGrants'
    | 'promoCodes'
    | 'adminRoles';

  const requireFeature =
    (feature: CostedFeature) =>
    async (_request: UserRequest, response: Response, next: NextFunction) => {
      try {
        const config = await currentConfig();
        const enabled = {
          support: config.defaults.supportEnabled,
          purchases: config.defaults.purchasesEnabled,
          userReview: config.defaults.userReviewEnabled,
          manualGrants: config.defaults.manualGrantsEnabled,
          promoCodes: config.defaults.promoCodesEnabled,
          adminRoles: config.defaults.adminRolesEnabled
        }[feature];
        if (!enabled) {
          const labels: Record<CostedFeature, string> = {
            support: 'Private support',
            purchases: 'Purchases',
            userReview: 'User and operations review',
            manualGrants: 'Manual premium grants',
            promoCodes: 'Promo-code operations',
            adminRoles: 'Admin role management'
          };
          response.status(503).json({
            error: 'feature_disabled',
            message: `${labels[feature]} is disabled by the cost-control configuration.`
          });
          return;
        }
        next();
      } catch (error) {
        next(error);
      }
    };

  const authenticateInternal = async (
    request: UserRequest,
    response: Response,
    next: NextFunction
  ) => {
    const token = bearerToken(request);
    if (!token) {
      response.status(401).json({
        error: 'unauthenticated',
        message: 'Internal authentication is required.'
      });
      return;
    }
    try {
      await dependencies.internalAuth.verify(token);
      next();
    } catch {
      response.status(401).json({
        error: 'invalid_internal_token',
        message: 'The internal caller identity is invalid.'
      });
    }
  };

  const writeAudit = async (
    record: Omit<Parameters<Dependencies['store']['writeAudit']>[0], 'deleteAfter'>
  ) => {
    const retentionDays = options.auditRetentionDays ?? 365;
    await dependencies.store.writeAudit({
      ...record,
      deleteAfter: addDays(record.at, retentionDays)
    });
  };

  app.get('/healthz', (_request, response) => {
    response.json({ ok: true, service: 'spark-control-plane' });
  });

  app.get('/readyz', async (_request, response, next) => {
    try {
      await dependencies.store.healthCheck();
      response.json({ ok: true, dependencies: { firestore: 'ready' } });
    } catch (error) {
      next(error);
    }
  });

  app.get('/v1/config', async (_request, response, next) => {
    try {
      response.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
      response.json(await currentConfig());
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/v1/internal/google-play/rtdn',
    authenticateInternal,
    requireFeature('purchases'),
    async (request: UserRequest, response, next) => {
      let claimedEventId: string | null = null;
      try {
        const envelope = pubSubEnvelopeSchema.parse(request.body);
        const receivedAt = dependencies.now().toISOString();
        const eventId = createHash('sha256')
          .update(`google-play:${envelope.message.messageId}`)
          .digest('hex');
        const firstDelivery = await dependencies.store.claimInternalEvent({
          id: eventId,
          receivedAt,
          deleteAfter: addDays(receivedAt, 30)
        });
        if (!firstDelivery) {
          response.status(204).end();
          return;
        }
        claimedEventId = eventId;

        const decoded = Buffer.from(envelope.message.data, 'base64').toString('utf8');
        let notification: z.infer<typeof developerNotificationSchema>;
        try {
          notification = developerNotificationSchema.parse(JSON.parse(decoded));
        } catch (reason) {
          console.warn(
            JSON.stringify({
              severity: 'WARNING',
              event: 'google_play.rtdn_invalid_payload',
              requestId: request.requestId,
              message: reason instanceof Error ? reason.message.slice(0, 300) : 'Invalid payload'
            })
          );
          response.status(204).end();
          return;
        }
        if (
          options.packageName &&
          notification.packageName !== options.packageName
        ) {
          response.status(204).end();
          return;
        }

        const oneTime = notification.oneTimeProductNotification;
        if (oneTime) {
          const expected = options.premiumProductId ?? 'spark_premium_lifetime';
          if (oneTime.sku === expected) {
            const verified = await dependencies.purchases.verifyProduct({
              productId: oneTime.sku,
              purchaseToken: oneTime.purchaseToken
            });
            const result = await dependencies.store.reconcilePlayPurchase({
              tokenHash: createHash('sha256')
                .update(oneTime.purchaseToken)
                .digest('hex'),
              orderIdHash: verified.orderId
                ? createHash('sha256').update(verified.orderId).digest('hex')
                : undefined,
              productId: oneTime.sku,
              state: verified.state,
              at: receivedAt
            });
            await writeAudit({
              id: dependencies.id('audit'),
              actorId: 'google-play-rtdn',
              action: `purchase.rtdn.${verified.state}`,
              target: result.ownerId ?? 'unbound-purchase',
              at: receivedAt,
              metadata: {
                productId: oneTime.sku,
                notificationType: oneTime.notificationType,
                entitlementChanged: result.changed
              }
            });
          }
        }

        const voided = notification.voidedPurchaseNotification;
        if (voided && voided.productType === 2) {
          const result = await dependencies.store.revokePlayPurchase({
            tokenHash: createHash('sha256')
              .update(voided.purchaseToken)
              .digest('hex'),
            orderIdHash: voided.orderId
              ? createHash('sha256').update(voided.orderId).digest('hex')
              : undefined,
            reason: `voided:${voided.refundType ?? 'unknown'}`,
            at: receivedAt
          });
          await writeAudit({
            id: dependencies.id('audit'),
            actorId: 'google-play-rtdn',
            action: 'purchase.voided',
            target: result.ownerId ?? 'unbound-purchase',
            at: receivedAt,
            metadata: {
              refundType: voided.refundType,
              entitlementChanged: result.changed
            }
          });
        }
        response.status(204).end();
      } catch (error) {
        if (claimedEventId) {
          try {
            await dependencies.store.releaseInternalEvent(claimedEventId);
          } catch (releaseError) {
            console.error(
              JSON.stringify({
                severity: 'ERROR',
                event: 'google_play.rtdn_release_failed',
                requestId: request.requestId,
                errorName:
                  releaseError instanceof Error
                    ? releaseError.name
                    : 'UnknownError'
              })
            );
          }
        }
        next(error);
      }
    }
  );

  app.post(
    '/v1/internal/maintenance',
    authenticateInternal,
    async (_request, response, next) => {
      try {
        const result = await dependencies.store.purgeExpired(
          dependencies.now().toISOString(),
          200
        );
        response.json({ ok: true, purged: result });
      } catch (error) {
        next(error);
      }
    }
  );

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
    purchaseLimiter,
    authenticate,
    requireFeature('purchases'),
    async (request: UserRequest, response, next) => {
      try {
        const input = verifyGooglePurchaseSchema.parse(request.body);
        const now = dependencies.now().toISOString();
        const expected = options.premiumProductId ?? 'spark_premium_lifetime';
        if (input.productId !== expected) {
          await writeAudit({
            id: dependencies.id('audit'),
            actorId: request.user!.uid,
            action: 'purchase.rejected_unknown_product',
            target: request.user!.uid,
            at: now,
            metadata: { productId: input.productId }
          });
          response.status(400).json({
            error: 'unknown_product',
            message: 'This product is not recognized by Spark.'
          });
          return;
        }
        let verified: Awaited<ReturnType<Dependencies['purchases']['verifyProduct']>>;
        try {
          verified = await dependencies.purchases.verifyProduct(input);
        } catch (error) {
          await writeAudit({
            id: dependencies.id('audit'),
            actorId: request.user!.uid,
            action: 'purchase.verification_failed',
            target: request.user!.uid,
            at: now,
            metadata: { productId: input.productId }
          });
          throw error;
        }
        if (verified.state === 'canceled') {
          await writeAudit({
            id: dependencies.id('audit'),
            actorId: request.user!.uid,
            action: 'purchase.rejected',
            target: request.user!.uid,
            at: now,
            metadata: { productId: input.productId }
          });
          response.status(402).json({
            error: 'purchase_invalid',
            message: 'Google Play did not confirm this purchase.'
          });
          return;
        }
        if (
          verified.obfuscatedAccountId &&
          ![
            request.user!.uid,
            createHash('sha256').update(request.user!.uid).digest('hex')
          ].includes(verified.obfuscatedAccountId) &&
          !input.restore
        ) {
          await writeAudit({
            id: dependencies.id('audit'),
            actorId: request.user!.uid,
            action: 'purchase.account_mismatch',
            target: request.user!.uid,
            at: now,
            metadata: { productId: input.productId }
          });
          response.status(409).json({
            error: 'purchase_account_mismatch',
            message:
              'Google Play attached this purchase to another Spark identity. Use Restore to transfer the single entitlement.'
          });
          return;
        }
        const tokenHash = createHash('sha256')
          .update(input.purchaseToken)
          .digest('hex');
        const orderIdHash = verified.orderId
          ? createHash('sha256').update(verified.orderId).digest('hex')
          : undefined;
        const entitlement: EntitlementRecord | undefined =
          verified.state === 'purchased'
            ? {
                premium: true,
                source: 'play',
                productId: input.productId,
                expiresAt: null,
                updatedAt: now
              }
            : undefined;
        const claimed = await dependencies.store.claimPlayPurchase({
          purchase: {
            tokenHash,
            orderIdHash,
            ownerId: request.user!.uid,
            productId: input.productId,
            state: verified.state === 'purchased' ? 'active' : 'pending',
            verifiedAt: now,
            updatedAt: now
          },
          entitlement,
          allowTransfer: input.restore
        });
        if (claimed.status === 'conflict') {
          await writeAudit({
            id: dependencies.id('audit'),
            actorId: request.user!.uid,
            action: 'purchase.claim_conflict',
            target: request.user!.uid,
            at: now,
            metadata: { productId: input.productId }
          });
          response.status(409).json({
            error: 'purchase_already_claimed',
            message:
              'This purchase is attached to another Spark cloud identity. Use Restore to transfer the single active entitlement.'
          });
          return;
        }
        await dependencies.store.touchUser(request.user!.uid, {
          email: request.user?.email,
          at: now
        });
        await writeAudit({
          id: dependencies.id('audit'),
          actorId: request.user!.uid,
          action:
            verified.state === 'pending'
              ? 'purchase.pending'
              : claimed.status === 'transferred'
                ? 'purchase.transferred'
                : claimed.status === 'existing'
                  ? 'purchase.duplicate'
                : input.restore
                  ? 'purchase.restored'
                  : 'purchase.verified',
          target: request.user!.uid,
          at: now,
          metadata: {
            productId: input.productId,
            transferredFromAnotherIdentity: Boolean(claimed.previousOwnerId)
          }
        });
        if (verified.state === 'pending') {
          response.status(409).json({
            error: 'purchase_pending',
            message:
              'Google Play is still processing this payment. Spark will grant access after Play confirms it.'
          });
          return;
        }
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
    requireFeature('support'),
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
    requireFeature('support'),
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
          platform: input.platform,
          deleteAfter: addDays(at, options.supportRetentionDays ?? 90)
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
    requireFeature('support'),
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
    requireFeature('support'),
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
          unreadByAdmin: thread.unreadByAdmin + 1,
          deleteAfter: addDays(at, options.supportRetentionDays ?? 90)
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
    requireFeature('userReview'),
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
    requireFeature('userReview'),
    async (request, response, next) => {
      try {
        response.json(
          await dependencies.store.listUsers({
            ...pageInput(request),
            search: queryValue(request, 'search')
          })
        );
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/admin/support',
    authenticate,
    requireRole('owner', 'support'),
    requireFeature('support'),
    async (request, response, next) => {
      try {
        const rawStatus = request.query.status;
        const status =
          typeof rawStatus === 'string' && rawStatus !== 'all'
            ? supportStatusSchema.parse({ status: rawStatus }).status
            : undefined;
        response.json(
          await dependencies.store.listSupportThreads(status, pageInput(request))
        );
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/admin/support/:id/messages',
    authenticate,
    requireRole('owner', 'support'),
    requireFeature('support'),
    async (request, response, next) => {
      try {
        const thread = await dependencies.store.getSupportThread(routeParam(request, 'id'));
        if (!thread) {
          response.status(404).json({ error: 'not_found', message: 'Thread not found.' });
          return;
        }
        await dependencies.store.updateSupportThread(thread.id, { unreadByAdmin: 0 });
        response.json(
          await dependencies.store.listSupportMessagesPage(
            thread.id,
            pageInput(request, 100, 100)
          )
        );
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/admin/support/:id/messages',
    authenticate,
    requireRole('owner', 'support'),
    requireFeature('support'),
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
          unreadByUser: thread.unreadByUser + 1,
          deleteAfter: addDays(at, options.supportRetentionDays ?? 90)
        });
        await writeAudit({
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
    requireFeature('support'),
    async (request: UserRequest, response, next) => {
      try {
        const input = supportStatusSchema.parse(request.body);
        const threadId = routeParam(request, 'id');
        const thread = await dependencies.store.getSupportThread(threadId);
        if (!thread) {
          response.status(404).json({
            error: 'not_found',
            message: 'Thread not found.'
          });
          return;
        }
        await dependencies.store.updateSupportThread(threadId, {
          status: input.status
        });
        const at = dependencies.now().toISOString();
        await writeAudit({
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
          expiresAt: dependencies.now().getTime() + 30 * 1000
        };
        await writeAudit({
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
    requireFeature('promoCodes'),
    async (request, response, next) => {
      try {
        response.json(
          await dependencies.store.listPromoCodes(pageInput(request, 100, 200))
        );
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    '/v1/admin/audits',
    authenticate,
    requireRole('owner'),
    requireFeature('userReview'),
    async (request, response, next) => {
      try {
        const filters = {
          action: queryValue(request, 'action'),
          actorId: queryValue(request, 'actorId'),
          target: queryValue(request, 'target')
        };
        if (Object.values(filters).filter(Boolean).length > 1) {
          response.status(400).json({
            error: 'too_many_filters',
            message: 'Use one exact audit filter at a time to keep queries bounded and cheap.'
          });
          return;
        }
        response.json(
          await dependencies.store.listAudits({
            ...pageInput(request),
            ...filters
          })
        );
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    '/v1/admin/promo-codes/import',
    authenticate,
    requireRole('owner'),
    requireFeature('promoCodes'),
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
        await writeAudit({
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
    requireFeature('promoCodes'),
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
        await writeAudit({
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
    requireFeature('manualGrants'),
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
        await writeAudit({
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
    requireFeature('adminRoles'),
    async (request: UserRequest, response, next) => {
      try {
        const input = setAdminRoleSchema.parse(request.body);
        const changed = await dependencies.auth.setRole(input.email, input.role);
        const at = dependencies.now().toISOString();
        await writeAudit({
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
    (error: unknown, request: UserRequest, response: Response, _next: NextFunction) => {
      if (error instanceof ZodError) {
        response.status(400).json({
          error: 'invalid_request',
          message: error.issues[0]?.message ?? 'The request is invalid.',
          requestId: request.requestId
        });
        return;
      }
      console.error(
        JSON.stringify({
          severity: 'ERROR',
          event: 'http.error',
          requestId: request.requestId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
          message:
            error instanceof Error
              ? error.message.slice(0, 500)
              : 'Unknown server error'
        })
      );
      response.status(500).json({
        error: 'internal',
        message: 'Spark could not complete that request.',
        requestId: request.requestId
      });
    }
  );

  return app;
}
