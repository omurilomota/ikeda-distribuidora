import { money, type CartItem, type Customer, type Product, type Promotion } from "@/lib/types";

export interface WhatsAppUnit {
  id: string;
  name: string;
  region: string;
  phone: string;
  formatted: string;
}

export const IKEDA_UNITS: WhatsAppUnit[] = [
  {
    id: "sp-junqueiropolis",
    name: "Distribuidora Ikeda · Matriz SP",
    region: "Junqueirópolis, Dracena e Alta Paulista",
    phone: "5518999990105",
    formatted: "(18) 99999-0105",
  },
  {
    id: "ms-campogrande",
    name: "Distribuidora Ikeda · Filial MS",
    region: "Campo Grande, Dourados e Interior MS",
    phone: "5567999990106",
    formatted: "(67) 99999-0106",
  },
];

export function buildOrderWhatsAppMessage({
  customer,
  items,
  products,
  promotions,
  payment,
  notes,
  orderNumber,
}: {
  customer: Customer;
  items: CartItem[];
  products: Product[];
  promotions: Promotion[];
  payment: string;
  notes?: string;
  orderNumber?: string;
}): string {
  const lines = items.flatMap(item => {
    const p = products.find(prod => prod.id === item.productId);
    if (!p) return [];
    let price = Math.round(p.price * (1 - customer.discount / 100));
    for (const promo of promotions.filter(pr => pr.active && pr.productId === p.id && item.quantity >= pr.minQuantity)) {
      price = Math.min(
        price,
        promo.kind === "buy3pay2"
          ? Math.round(p.price * (1 - customer.discount / 100)) * (item.quantity - Math.floor(item.quantity / 3)) / item.quantity
          : Math.round(p.price * (1 - customer.discount / 100) * (1 - promo.discount / 100))
      );
    }
    const subtotal = Math.round(price * item.quantity);
    return [{
      name: p.name,
      brand: p.brand,
      ean: p.ean,
      unit: p.unit,
      packSize: p.packSize,
      quantity: item.quantity,
      price,
      subtotal,
      weightKg: p.weightKg * item.quantity,
      volumeM3: p.volumeM3 * item.quantity,
    }];
  });

  const total = lines.reduce((acc, l) => acc + l.subtotal, 0);
  const totalBoxes = lines.reduce((acc, l) => acc + l.quantity, 0);
  const totalWeight = lines.reduce((acc, l) => acc + l.weightKg, 0);
  const totalVolume = lines.reduce((acc, l) => acc + l.volumeM3, 0);
  const cubedWeight = totalVolume * 300;

  const header = [
    `🛒 *NOVO PEDIDO B2B · DISTRIBUIDORA IKEDA*`,
    orderNumber ? `📋 *Nº do Pedido:* #${orderNumber}` : `📋 *Data:* ${new Date().toLocaleDateString("pt-BR")}`,
    `----------------------------------------`,
    `🏢 *Cliente:* ${customer.name}`,
    `📄 *CNPJ:* ${customer.cnpj}`,
    `📍 *Endereço:* ${customer.address}`,
    `📞 *Telefone:* ${customer.phone}`,
    `🏷️ *Tabela Contratual:* ${customer.priceTable}${customer.discount > 0 ? ` (${customer.discount}% desc.)` : ""}`,
    `💳 *Condição:* ${payment}`,
    `----------------------------------------`,
    `📦 *ITENS DO PEDIDO (por caixas/fardos):*`,
  ];

  const itemList = lines.map(
    (l, idx) =>
      `${idx + 1}. *${l.quantity}x ${l.name}*\n   ${l.unit} c/ ${l.packSize} un. · EAN: ${l.ean}\n   ${money(l.price)}/cx ➔ *${money(l.subtotal)}*`
  );

  const footer = [
    `----------------------------------------`,
    `📊 *RESUMO LOGÍSTICO:*`,
    `• Total de caixas/fardos: *${totalBoxes}*`,
    `• Peso estimado: *${totalWeight.toFixed(1)} kg*`,
    `• Volume cúbico: *${totalVolume.toFixed(3)} m³* (~${cubedWeight.toFixed(1)} kg cubados)`,
    `💰 *VALOR TOTAL DO PEDIDO: ${money(total)}*`,
    `----------------------------------------`,
  ];

  if (notes && notes.trim().length > 0) {
    footer.push(`📝 *Observações:* ${notes.trim()}`, `----------------------------------------`);
  }

  footer.push(`_Pedido gerado via Portal do Parceiro Distribuidora Ikeda_`);

  return [...header, ...itemList, ...footer].join("\n");
}

export function buildSupportWhatsAppMessage(customerName: string, cnpj?: string): string {
  return [
    `Olá, equipe comercial da *Distribuidora Ikeda*!`,
    `Sou da loja *${customerName}*${cnpj ? ` (CNPJ: ${cnpj})` : ""}.`,
    `Gostaria de falar com meu representante para tirar dúvidas sobre reposição de estoque, tabela e pedidos.`,
  ].join("\n");
}

export function openWhatsApp(phone: string, text: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return url;
}
