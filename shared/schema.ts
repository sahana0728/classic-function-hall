import { pgTable, text, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // Make optional for frontend
  role: text("role").notNull().default("Staff"),
});

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  totalAmount: real("total_amount").notNull(),
  advancePaid: real("advance_paid").notNull(),
  themeId: integer("theme_id").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("Booked"),
});

export const enquiries = pgTable("enquiries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  notes: text("notes"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const insertThemeSchema = createInsertSchema(themes).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, status: true }).extend({
  totalAmount: z.coerce.number(),
  advancePaid: z.coerce.number(),
  themeId: z.coerce.number(),
});
export const insertEnquirySchema = createInsertSchema(enquiries).omit({ id: true });

export type User = typeof users.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;

export const bookingDetailsSchema = z.object({
  id: z.string().optional(),
  customerName: z.string(),
  phone: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  totalAmount: z.number(),
  advancePaid: z.number(),
  balanceLeft: z.number(),
  themeId: z.number(),
  themeName: z.string(),
  themeImage: z.string(),
  notes: z.string().optional(),
  status: z.string(),
  decorations: z.array(z.any()).optional(),
  payments: z.array(z.object({
    id: z.number(),
    amount: z.number(),
    payment_date: z.string(),
    recorded_by: z.string().optional()
  })).optional()
});
