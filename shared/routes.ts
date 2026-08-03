import { z } from 'zod';
import { insertThemeSchema, insertBookingSchema, insertEnquirySchema, users, themes, enquiries, loginSchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.object({
          token: z.string(),
          user: z.custom<typeof users.$inferSelect>()
        }),
        401: errorSchemas.unauthorized
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.object({ user: z.custom<typeof users.$inferSelect>() }),
        401: errorSchemas.unauthorized
      }
    }
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>())
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound
      }
    }
  },
  themes: {
    list: {
      method: 'GET' as const,
      path: '/api/themes' as const,
      responses: {
        200: z.array(z.custom<typeof themes.$inferSelect>())
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/themes' as const,
      input: insertThemeSchema,
      responses: {
        201: z.object({ id: z.number(), name: z.string() }),
        401: errorSchemas.unauthorized
      }
    }
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings' as const,
      responses: {
        200: z.array(z.object({
          id: z.string(),
          customerName: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          totalAmount: z.union([z.string(), z.number()]).optional(),
          advancePaid: z.union([z.string(), z.number()]).optional(),
          themeName: z.string().nullable(),
          themeImage: z.string().nullable(),
        }))
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/bookings/:id' as const,
      responses: {
        200: z.custom<typeof bookingDetailsSchema>(),
        404: errorSchemas.notFound
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings' as const,
      input: insertBookingSchema,
      responses: {
        201: z.object({ id: z.string(), message: z.string() })
      }
    }
  },
  enquiries: {
    list: {
      method: 'GET' as const,
      path: '/api/enquiries' as const,
      responses: {
        200: z.array(z.custom<typeof enquiries.$inferSelect>())
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/enquiries/:id' as const,
      responses: {
        200: z.custom<typeof enquiries.$inferSelect>(),
        404: errorSchemas.notFound
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/enquiries' as const,
      input: insertEnquirySchema,
      responses: {
        201: z.object({ id: z.string(), message: z.string() })
      }
    }
  },
  calendar: {
    list: {
      method: 'GET' as const,
      path: '/api/calendar' as const,
      responses: {
        200: z.array(z.object({
          id: z.string(),
          title: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          blockedStartDate: z.string().optional(),
          type: z.enum(['booked', 'enquiry'])
        }))
      }
    }
  },
  auditLogs: {
    get: {
      method: 'GET' as const,
      path: '/api/audit-logs/:entityType/:entityId' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          action: z.string(),
          entity_id: z.string(),
          entity_type: z.string(),
          performed_by: z.string(),
          details: z.any(),
          created_at: z.string()
        })),
        500: z.object({ error: z.string() })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
