import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, products, orders, invoices, favorites, promotions, carts, sessions, supportMessages } from "@/db/schema";
import { currentCustomer, getPortalData, tokenHash } from "@/lib/portal";
import { hashPassword, ensureSeed } from "@/lib/seed";
import { eq, and, inArray } from "drizzle-orm";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { priceFor, type CartItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(await getPortalData()); }
function fail(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function validCart(value: unknown): value is CartItem[] {
  return Array.isArray(value) && value.length <= 100 && value.every(i => i && typeof i.productId === "string" && Number.isInteger(i.quantity) && i.quantity >= 1 && i.quantity <= 999) && new Set(value.map(i => i.productId)).size === value.length;
}
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin && new URL(origin).host !== request.headers.get("host") && new URL(origin).host !== request.headers.get("x-forwarded-host")) return fail("Origem não autorizada.", 403);
    const body = await request.json();
    await ensureSeed();
    if (body.action === "login") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (password.length > 128) return fail("Credenciais inválidas.", 401);
      const [user] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
      if (!user || !timingSafeEqual(Buffer.from(hashPassword(password, user.id), "hex"), Buffer.from(user.passwordHash, "hex"))) return fail("E-mail ou senha incorretos.", 401);
      const token = randomBytes(32).toString("hex");
      await db.insert(sessions).values({ token: tokenHash(token), customerId: user.id, expiresAt: new Date(Date.now() + 7 * 86400000) });
      (await cookies()).set("ikeda_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https", path: "/", maxAge: 7 * 86400 });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "logout") {
      const store = await cookies(); const token = store.get("ikeda_session")?.value;
      if (token) await db.delete(sessions).where(eq(sessions.token, tokenHash(token)));
      store.delete("ikeda_session");
      return NextResponse.json({ ok: true });
    }
    const { customer } = await currentCustomer();
    if (body.action === "cart") {
      if (!validCart(body.items)) return fail("Quantidade inválida. Informe de 1 a 999 caixas por produto.");
      await db.insert(carts).values({ customerId: customer.id, items: body.items }).onConflictDoUpdate({ target: carts.customerId, set: { items: body.items, updatedAt: new Date() } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "favorite") {
      const [product] = await db.select().from(products).where(eq(products.id, String(body.productId))).limit(1);
      if (!product) return fail("Produto não encontrado.", 404);
      const id = `${customer.id}-${product.id}`;
      if (body.active) await db.insert(favorites).values({ id, customerId: customer.id, productId: product.id }).onConflictDoNothing();
      else await db.delete(favorites).where(eq(favorites.id, id));
      return NextResponse.json({ ok: true });
    }
    if (body.action === "checkout") {
      if (!validCart(body.items) || body.items.length === 0) return fail("Adicione pelo menos um produto ao pedido.");
      const items: CartItem[] = body.items;
      if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.length > 100) return fail("Identificador do pedido inválido.");
      if (!["Boleto · 28 dias", "Boleto · 14 dias"].includes(body.payment)) return fail("Selecione uma condição de pagamento válida.");
      const result = await db.transaction(async tx => {
        const [existing] = await tx.select().from(orders).where(and(eq(orders.idempotencyKey, body.idempotencyKey), eq(orders.customerId, customer.id))).limit(1);
        if (existing) return existing;
        const [account] = await tx.select().from(customers).where(eq(customers.id, customer.id)).for("update");
        const cartProducts = await tx.select().from(products).where(inArray(products.id, items.map(i => i.productId).sort())).orderBy(products.id).for("update");
        const activePromos = await tx.select().from(promotions).where(eq(promotions.active, true));
        let total = 0, weightKg = 0, volumeM3 = 0;
        const orderItems = items.map(item => {
          const product = cartProducts.find(p => p.id === item.productId);
          if (!product) throw new Error("Um dos produtos não está mais disponível.");
          if (product.stock < item.quantity) throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock} caixas.`);
          const price = priceFor(product, account, activePromos, item.quantity);
          total += Math.round(price * item.quantity); weightKg += product.weightKg * item.quantity; volumeM3 += product.volumeM3 * item.quantity;
          return { productId: product.id, name: product.name, quantity: item.quantity, price, image: product.image, packSize: product.packSize };
        });
        if (total > account.creditLimit - account.creditUsed) throw new Error("O valor do pedido excede seu limite disponível. Ajuste as quantidades ou fale com seu representante.");
        const id = randomUUID(); const number = `IK-${Date.now().toString().slice(-7)}${randomBytes(2).toString("hex").toUpperCase()}`;
        const deliveryDate = new Date(Date.now() + 3 * 86400000);
        const [order] = await tx.insert(orders).values({ id, customerId: account.id, number, status: "Confirmado", total, items: orderItems, payment: body.payment, deliveryDate, weightKg, volumeM3, notes: String(body.notes ?? "").slice(0, 500), idempotencyKey: body.idempotencyKey }).returning();
        await tx.update(customers).set({ creditUsed: account.creditUsed + total }).where(eq(customers.id, account.id));
        for (const item of items) { const p = cartProducts.find(p => p.id === item.productId)!; await tx.update(products).set({ stock: p.stock - item.quantity }).where(eq(products.id, p.id)); }
        await tx.insert(invoices).values({ id: randomUUID(), customerId: account.id, orderNumber: number, amount: total, dueDate: new Date(Date.now() + (body.payment.includes("28") ? 28 : 14) * 86400000), status: "open" });
        await tx.delete(carts).where(eq(carts.customerId, account.id));
        return order;
      });
      return NextResponse.json({ ok: true, orderNumber: result.number });
    }
    if (body.action === "profile") {
      const name = String(body.name ?? "").trim(); const phone = String(body.phone ?? "").trim(); const address = String(body.address ?? "").trim();
      if (name.length < 3 || name.length > 100 || phone.length < 10 || phone.length > 25 || address.length < 10 || address.length > 250) return fail("Confira o nome, telefone e endereço informados.");
      await db.update(customers).set({ name, phone, address }).where(eq(customers.id, customer.id));
      return NextResponse.json({ ok: true });
    }
    if (body.action === "support") {
      const message = String(body.message ?? "").trim();
      if (message.length < 10 || message.length > 2000) return fail("Escreva uma mensagem entre 10 e 2.000 caracteres.");
      const id = randomUUID();
      await db.insert(supportMessages).values({ id, customerId: customer.id, message });
      return NextResponse.json({ ok: true, protocol: `AT-${id.slice(0, 8).toUpperCase()}` });
    }
    if (body.action === "promotion" || body.action === "toggle-promotion") {
      if (customer.role !== "admin") return fail("Acesso exclusivo da equipe comercial.", 403);
      if (body.action === "toggle-promotion") { await db.update(promotions).set({ active: Boolean(body.active) }).where(eq(promotions.id, String(body.id))); }
      else {
        if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.length > 100 || !["discount", "buy3pay2"].includes(body.kind) || !Number.isInteger(body.discount) || body.discount < 1 || body.discount > 50 || !Number.isInteger(body.minQuantity) || body.minQuantity < 1 || body.minQuantity > 999) return fail("Confira os dados da promoção.");
        const [p] = await db.select().from(products).where(eq(products.id, String(body.productId))).limit(1);
        if (!p) return fail("Produto não encontrado.");
        await db.insert(promotions).values({ id: randomUUID(), title: body.title.trim(), productId: p.id, kind: body.kind, discount: body.discount, minQuantity: body.kind === "buy3pay2" ? 3 : body.minQuantity, active: true });
      }
      return NextResponse.json({ ok: true });
    }
    return fail("Operação não encontrada.", 404);
  } catch (error) {
    console.error("Portal action:", error);
    return fail(error instanceof Error && !error.message.includes("query:") ? error.message : "Não foi possível concluir. Tente novamente.");
  }
}
