import { pgTable, text, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";

export const customers = pgTable("ikeda_customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  cnpj: text("cnpj").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  priceTable: text("price_table").notNull(),
  discount: integer("discount").notNull().default(0),
  creditLimit: integer("credit_limit").notNull(),
  creditUsed: integer("credit_used").notNull().default(0),
  role: text("role").notNull().default("customer"),
});

export const products = pgTable("ikeda_products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: text("category").notNull(),
  ean: text("ean").notNull(),
  image: text("image").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  packSize: integer("pack_size").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price").notNull(),
  stock: integer("stock").notNull(),
  weightKg: real("weight_kg").notNull(),
  volumeM3: real("volume_m3").notNull(),
  featured: boolean("featured").notNull().default(false),
});

export const promotions = pgTable("ikeda_promotions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  productId: text("product_id").notNull().references(() => products.id),
  kind: text("kind").notNull().default("discount"),
  discount: integer("discount").notNull().default(5),
  minQuantity: integer("min_quantity").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const favorites = pgTable("ikeda_favorites", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  productId: text("product_id").notNull().references(() => products.id),
});

export const carts = pgTable("ikeda_carts", {
  customerId: text("customer_id").primaryKey().references(() => customers.id),
  items: jsonb("items").$type<{ productId: string; quantity: number }[]>().notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orders = pgTable("ikeda_orders", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  number: text("number").notNull().unique(),
  status: text("status").notNull(),
  total: integer("total").notNull(),
  items: jsonb("items").$type<{ productId: string; name: string; quantity: number; price: number; image: string; packSize: number }[]>().notNull(),
  payment: text("payment").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  weightKg: real("weight_kg").notNull().default(0),
  volumeM3: real("volume_m3").notNull().default(0),
  notes: text("notes").notNull().default(""),
  idempotencyKey: text("idempotency_key").unique(),
});

export const invoices = pgTable("ikeda_invoices", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  orderNumber: text("order_number").notNull(),
  amount: integer("amount").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("open"),
});

export const sessions = pgTable("ikeda_sessions", {
  token: text("token").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  expiresAt: timestamp("expires_at").notNull(),
});

export const supportMessages = pgTable("ikeda_support_messages", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
