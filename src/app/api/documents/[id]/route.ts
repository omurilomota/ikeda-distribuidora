import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { currentCustomer } from "@/lib/portal";
import { db } from "@/db";
import { invoices, orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { money } from "@/lib/types";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer } = await currentCustomer();
  const type = request.nextUrl.searchParams.get("type");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 780;
  function line(text: string, size = 11, strong = false) {
    if (y < 60) { page = pdf.addPage([595, 842]); y = 780; }
    page.drawText(text.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, " "), { x: 48, y, size, font: strong ? bold : font, color: rgb(.17, .18, .19), maxWidth: 495, lineHeight: 17 });
    y -= size > 18 ? 42 : 27;
  }
  line("ikeda", 34, true); line("PORTAL B2B - AMBIENTE DE DEMONSTRAÇÃO", 10); y -= 15;
  let filename = "documento";
  if (type === "order") {
    const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.customerId, customer.id))).limit(1);
    if (!order) return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
    filename = `pedido-${order.number}`;
    line(`Resumo do pedido #${order.number}`, 18, true); line(customer.name, 12, true); line(`CNPJ demonstrativo: ${customer.cnpj}`); line(`Status: ${order.status}`); line(`Pagamento: ${order.payment}`); line(`Previsão de entrega: ${order.deliveryDate.toLocaleDateString("pt-BR")}`); y -= 8;
    for (const item of order.items) { line(item.name, 11, true); line(`${item.quantity} caixa(s)/fardo(s) x ${money(item.price)} = ${money(item.quantity * item.price)}`, 10); }
    y -= 10; line(`TOTAL: ${money(order.total)}`, 18, true); line(`Peso: ${order.weightKg.toFixed(2)} kg | Volume: ${order.volumeM3.toFixed(3)} m3`, 10);
    if (order.notes) line(`Observações: ${order.notes.slice(0, 100)}`, 10);
  } else {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.customerId, customer.id))).limit(1);
    if (!invoice) return Response.json({ error: "Título não encontrado" }, { status: 404 });
    filename = `demonstrativo-${invoice.orderNumber}`;
    line("Demonstrativo financeiro", 22, true); line("SEM VALOR DE COBRANÇA", 14, true); y -= 15;
    line(`Cliente: ${customer.name}`); line(`CNPJ demonstrativo: ${customer.cnpj}`); line(`Referência: Pedido #${invoice.orderNumber}`); line(`Vencimento: ${invoice.dueDate.toLocaleDateString("pt-BR")}`); line(`Situação: ${invoice.status === "paid" ? "Pago (demonstração)" : "Em aberto (demonstração)"}`); y -= 10; line(`Valor: ${money(invoice.amount)}`, 22, true);
    y -= 25; line("Este documento não é um boleto bancário.", 12, true); line("Não possui código de barras ou instrução de pagamento.", 10); line("A emissão de boletos reais depende da integração com o ERP/banco.", 10);
  }
  y -= 20; line("Dados fictícios para demonstração. Não representa operação real da Ikeda.", 9);
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "no-store" } });
}
