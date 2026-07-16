import { z } from 'zod';

export const appConfigSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: z.string(),
  announcements: z.array(
    z.object({
      id: z.string(),
      title: z.string().max(80),
      body: z.string().max(240),
      enabled: z.boolean(),
    }),
  ),
  features: z.record(z.string(), z.boolean()),
  defaults: z.object({
    maxDailyHabitNotifications: z.number().int().min(0).max(8),
    focusMinutes: z.array(z.number().int().min(1).max(180)).max(8),
    announcementsEnabled: z.boolean().default(false),
    supportEnabled: z.boolean().default(false),
    purchasesEnabled: z.boolean().default(false),
    userReviewEnabled: z.boolean().default(false),
    manualGrantsEnabled: z.boolean().default(false),
    promoCodesEnabled: z.boolean().default(false),
    adminRolesEnabled: z.boolean().default(false),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const defaultAppConfig: AppConfig = {
  schemaVersion: 1,
  updatedAt: '1970-01-01T00:00:00.000Z',
  announcements: [],
  features: {
    supportInbox: false,
    premiumPurchase: false,
    cloudConfig: false,
    globalAnnouncements: false,
    userReview: false,
    manualGrants: false,
    promoCodes: false,
    adminRoles: false,
  },
  defaults: {
    maxDailyHabitNotifications: 4,
    focusMinutes: [5, 10, 25, 50],
    announcementsEnabled: false,
    supportEnabled: false,
    purchasesEnabled: false,
    userReviewEnabled: false,
    manualGrantsEnabled: false,
    promoCodesEnabled: false,
    adminRolesEnabled: false,
  },
};

export const supportMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

export const supportStatusSchema = z.object({
  status: z.enum(['open', 'waiting_on_user', 'resolved']),
});

export const createSupportThreadSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
  appVersion: z.string().max(40),
  platform: z.enum(['android', 'ios']),
});

export const verifyGooglePurchaseSchema = z.object({
  productId: z.string().min(1).max(200),
  purchaseToken: z.string().min(16).max(4096),
  restore: z.boolean().default(false),
});

export const importPromoCodesSchema = z.object({
  codes: z.array(z.string().trim().min(4).max(200)).min(1).max(500),
  campaign: z.string().trim().min(1).max(100),
  productId: z.string().trim().min(1).max(200),
});

export const assignPromoCodeSchema = z.object({
  userId: z.string().min(1).max(128),
});

export const setAdminRoleSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'support', 'content', 'none']),
});

export const grantEntitlementSchema = z.object({
  premium: z.boolean(),
  reason: z.string().trim().min(3).max(300),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const updateAppConfigSchema = appConfigSchema.omit({
  updatedAt: true,
});

export type AdminRole = z.infer<typeof setAdminRoleSchema>['role'];

export interface ApiErrorBody {
  error: string;
  message: string;
  requestId?: string;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}
