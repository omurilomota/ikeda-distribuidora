import { db } from "@/db";
import { customers, products, orders, invoices, favorites, promotions, carts, sessions } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { cookies } from "next/headers";
import { eq, desc, and, gt } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { PortalData, Customer } from "@/lib/types";

export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function currentCustomer() {
  await ensureSeed();
  const cookieStore = await cookies();
  const token = cookieStore.get("ikeda_session")?.value;
  if (token) {
    const [session] = await db.select().from(sessions).where(and(eq(sessions.token, tokenHash(token)), gt(sessions.expiresAt, new Date()))).limit(1);
    if (session) {
      const [customer] = await db.select().from(customers).where(eq(customers.id, session.customerId)).limit(1);
      if (customer) return { customer, demo: false };
    }
  }
  const [customer] = await db.select().from(customers).where(eq(customers.id, "mercadinho")).limit(1);
  return { customer, demo: true };
}
export async function getPortalData(): Promise<PortalData> {
  const { customer, demo } = await currentCustomer();
  const [allProducts, customerOrders, customerInvoices, customerFavorites, allPromos, cart] = await Promise.all([
    db.select().from(products),
    db.select().from(orders).where(eq(orders.customerId, customer.id)).orderBy(desc(orders.createdAt)),
    db.select().from(invoices).where(eq(invoices.customerId, customer.id)).orderBy(invoices.dueDate),
    db.select().from(favorites).where(eq(favorites.customerId, customer.id)),
    db.select().from(promotions).orderBy(desc(promotions.createdAt)),
    db.select().from(carts).where(eq(carts.customerId, customer.id)).limit(1),
  ]);
  const { passwordHash: _, ...safeCustomer } = customer;
  return { customer: safeCustomer as Customer, products: allProducts, orders: customerOrders.map(o => ({ ...o, deliveryDate: o.deliveryDate.toISOString(), createdAt: o.createdAt.toISOString() })), invoices: customerInvoices.map(i => ({ ...i, dueDate: i.dueDate.toISOString() })), favorites: customerFavorites.map(f => f.productId), promotions: allPromos.map(p => ({ ...p })), cart: cart[0]?.items ?? [], demo };
}
