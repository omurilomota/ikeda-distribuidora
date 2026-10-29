import { describe, expect, it } from "vitest";
import {
  buildOrderWhatsAppMessage,
  buildSupportWhatsAppMessage,
  IKEDA_UNITS,
} from "./whatsapp";
import { money, priceFor, type Customer, type Product, type Promotion } from "./types";

const customer: Customer = {
  id: "mercadinho",
  name: "Mercadinho São José",
  legalName: "Mercadinho São José Ltda",
  cnpj: "12.345.678/0001-90",
  email: "contato@mercadinho.com.br",
  phone: "(18) 99999-0000",
  address: "Rua A, 10 — Junqueirópolis/SP",
  priceTable: "Atacado",
  discount: 10,
  creditLimit: 500000,
  creditUsed: 0,
  role: "cliente",
};

const product: Product = {
  id: "refri",
  name: "Refrigerante Cola 2L",
  brand: "Ikeda",
  category: "Bebidas",
  ean: "7891234567890",
  image: "/produtos/refri.jpg",
  description: "Caixa com 6 unidades",
  unit: "CX",
  packSize: 6,
  price: 10000,
  originalPrice: 11000,
  stock: 120,
  weightKg: 10,
  volumeM3: 0.001,
  featured: true,
};

describe("priceFor", () => {
  it("aplica o desconto da tabela contratual", () => {
    expect(priceFor(product, customer, [], 1)).toBe(9000);
  });

  it("aplica promoção percentual", () => {
    const promo: Promotion = {
      id: "p1",
      title: "10% OFF",
      productId: product.id,
      kind: "percent",
      discount: 10,
      minQuantity: 2,
      active: true,
    };
    expect(priceFor(product, customer, [promo], 2)).toBe(8100);
    // abaixo da quantidade mínima, mantém o preço da tabela
    expect(priceFor(product, customer, [promo], 1)).toBe(9000);
  });

  it("aplica buy 3 pay 2", () => {
    const promo: Promotion = {
      id: "p2",
      title: "Leve 3 pague 2",
      productId: product.id,
      kind: "buy3pay2",
      discount: 0,
      minQuantity: 3,
      active: true,
    };
    expect(priceFor(product, customer, [promo], 3)).toBe(6000);
  });

  it("ignora promoções inativas e de outro produto", () => {
    const promo: Promotion = {
      id: "p3",
      title: "Metade",
      productId: "outro",
      kind: "percent",
      discount: 50,
      minQuantity: 1,
      active: true,
    };
    expect(priceFor(product, customer, [promo], 1)).toBe(9000);
    expect(
      priceFor(product, customer, [{ ...promo, productId: product.id, active: false }], 1),
    ).toBe(9000);
  });
});

describe("buildOrderWhatsAppMessage", () => {
  it("monta o cabeçalho do cliente e o resumo logístico", () => {
    const message = buildOrderWhatsAppMessage({
      customer,
      items: [{ productId: product.id, quantity: 3 }],
      products: [product],
      promotions: [],
      payment: "Boleto 28 dias",
      orderNumber: "1042",
    });

    expect(message).toContain("NOVO PEDIDO B2B");
    expect(message).toContain("*Nº do Pedido:* #1042");
    expect(message).toContain("*Cliente:* Mercadinho São José");
    expect(message).toContain("CNPJ:* 12.345.678/0001-90");
    expect(message).toContain("Tabela Contratual:* Atacado (10% desc.)");
    expect(message).toContain("3x Refrigerante Cola 2L");
    expect(message).toContain("CX c/ 6 un.");
    const plain = message.replace(/\u00a0/g, " ");
    expect(plain).toContain("R$ 90,00/cx ➔ *R$ 270,00*");
    expect(message).toContain("Total de caixas/fardos: *3*");
    expect(message).toContain("Peso estimado: *30.0 kg*");
    expect(message).toContain("Volume cúbico: *0.003 m³*");
    expect(plain).toContain("VALOR TOTAL DO PEDIDO: R$ 270,00");
  });

  it("ignora itens sem produto cadastrado", () => {
    const message = buildOrderWhatsAppMessage({
      customer,
      items: [
        { productId: product.id, quantity: 1 },
        { productId: "fantasma", quantity: 5 },
      ],
      products: [product],
      promotions: [],
      payment: "Pix",
    });
    expect(message).toContain("Refrigerante Cola 2L");
    expect(message).toContain("Total de caixas/fardos: *1*");
  });

  it("inclui observações quando informadas", () => {
    const message = buildOrderWhatsAppMessage({
      customer,
      items: [{ productId: product.id, quantity: 1 }],
      products: [product],
      promotions: [],
      payment: "Pix",
      notes: "Entregar após as 14h",
    });
    expect(message).toContain("Observações:* Entregar após as 14h");
  });
});

describe("buildSupportWhatsAppMessage", () => {
  it("identifica a loja e o CNPJ", () => {
    expect(buildSupportWhatsAppMessage("Mercadinho", "00.000.000/0001-00")).toContain(
      "CNPJ: 00.000.000/0001-00",
    );
    expect(buildSupportWhatsAppMessage("Mercadinho")).not.toContain("CNPJ:");
  });
});

describe("unidades de atendimento", () => {
  it("mantém telefones apenas com dígitos e DDI", () => {
    for (const unit of IKEDA_UNITS) {
      expect(unit.phone).toMatch(/^55\d{10,11}$/);
    }
  });
});

describe("money", () => {
  it("formata centavos em reais", () => {
    expect(money(27000).replace(/\u00a0/g, " ")).toBe("R$ 270,00");
  });
});
