export type View = "overview" | "catalog" | "orders" | "finance" | "favorites" | "offers" | "profile" | "trade";
export type CartItem = { productId: string; quantity: number };
export type Customer = { id: string; name: string; legalName: string; cnpj: string; email: string; phone: string; address: string; priceTable: string; discount: number; creditLimit: number; creditUsed: number; role: string };
export type Product = { id: string; name: string; brand: string; category: string; ean: string; image: string; description: string; unit: string; packSize: number; price: number; originalPrice: number; stock: number; weightKg: number; volumeM3: number; featured: boolean };
export type Promotion = { id: string; title: string; productId: string; kind: string; discount: number; minQuantity: number; active: boolean };
export type OrderItem = { productId: string; name: string; quantity: number; price: number; image: string; packSize: number };
export type Order = { id: string; customerId: string; number: string; status: string; total: number; items: OrderItem[]; payment: string; deliveryDate: string; createdAt: string; weightKg: number; volumeM3: number; notes: string };
export type Invoice = { id: string; customerId: string; orderNumber: string; amount: number; dueDate: string; status: string };
export type PortalData = { customer: Customer; products: Product[]; orders: Order[]; invoices: Invoice[]; favorites: string[]; promotions: Promotion[]; cart: CartItem[]; demo: boolean };
export const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export const shortDate = (date: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(date));
export function priceFor(product: Product, customer: Customer, promos: Promotion[], quantity = 1) {
  let price = Math.round(product.price * (1 - customer.discount / 100));
  for (const promo of promos.filter(p => p.active && p.productId === product.id && quantity >= p.minQuantity)) {
    price = Math.min(price, promo.kind === "buy3pay2" ? Math.round(product.price * (1 - customer.discount / 100)) * (quantity - Math.floor(quantity / 3)) / quantity : Math.round(product.price * (1 - customer.discount / 100) * (1 - promo.discount / 100)));
  }
  return price;
}
