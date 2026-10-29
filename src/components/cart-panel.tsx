"use client";
import { useState, useRef } from "react";
import { ShoppingBag, Minus, Plus, Trash2, Truck, Package, Check, Copy, MessageSquare, Send, Sparkles } from "lucide-react";
import { money, priceFor, type CartItem, type PortalData } from "@/lib/types";
import { portalAction } from "@/lib/client";
import { EmptyState, LoadingLabel } from "@/components/ui";
import { IKEDA_UNITS, buildOrderWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp";

type Props = {
  data: PortalData;
  cart: CartItem[];
  updateCart: (items: CartItem[]) => void;
  onDone: (number: string, whatsappUrl?: string, text?: string) => Promise<void>;
  onBrowse: () => void;
  flushCart: () => Promise<void>;
};

export default function CartPanel({ data, cart, updateCart, onDone, onBrowse, flushCart }: Props) {
  const [payment, setPayment] = useState("Boleto · 28 dias");
  const [selectedUnit, setSelectedUnit] = useState<string>("sp-junqueiropolis");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());

  const lines = cart.flatMap(item => {
    const p = data.products.find(prod => prod.id === item.productId);
    return p ? [{ ...item, product: p, price: priceFor(p, data.customer, data.promotions, item.quantity) }] : [];
  });

  const total = lines.reduce((sum, i) => sum + Math.round(i.price * i.quantity), 0);
  const weight = lines.reduce((sum, i) => sum + i.product.weightKg * i.quantity, 0);
  const volume = lines.reduce((sum, i) => sum + i.product.volumeM3 * i.quantity, 0);
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);

  const activeUnit = IKEDA_UNITS.find(u => u.id === selectedUnit) ?? IKEDA_UNITS[0];

  function quantity(id: string, q: number) {
    updateCart(cart.map(i => i.productId === id ? { ...i, quantity: q } : i).filter(i => i.quantity > 0));
  }

  function getMessage(orderNum: string) {
    return buildOrderWhatsAppMessage({
      customer: data.customer,
      items: cart,
      products: data.products,
      promotions: data.promotions,
      payment,
      notes,
      orderNumber: orderNum,
    });
  }

  async function handleSendWhatsApp() {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    const orderNumber = `IK-${Date.now().toString().slice(-6)}`;
    const message = getMessage(orderNumber);

    try {
      await flushCart();
      // Tenta registrar no banco para manter histórico visual, mas não bloqueia se falhar
      try {
        await portalAction("checkout", { items: cart, payment, notes, idempotencyKey: key.current });
      } catch (dbErr) {
        console.warn("Aviso ao salvar histórico local:", dbErr);
      }
      const waUrl = openWhatsApp(activeUnit.phone, message);
      await onDone(orderNumber, waUrl, message);
    } catch (e) {
      // Mesmo com erro de infra, abre o WhatsApp para o cliente não perder o pedido!
      const waUrl = openWhatsApp(activeUnit.phone, message);
      await onDone(orderNumber, waUrl, message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    const orderNumber = `IK-${Date.now().toString().slice(-6)}`;
    const message = getMessage(orderNumber);
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
        success = true;
      }
    } catch {
      /* fallback abaixo */
    }
    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = message;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        success = true;
      } catch {
        setError("Selecione o texto e copie manualmente.");
      }
    }
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  if (!cart.length) {
    return (
      <EmptyState
        title="Seu próximo pedido começa aqui"
        text="Encontre tudo o que seu negócio precisa e adicione caixas ou fardos ao carrinho."
        action="Explorar catálogo"
        onAction={onBrowse}
      />
    );
  }

  return (
    <div className="cart-body">
      <div className="cart-intro">
        <ShoppingBag size={17} />
        <span>{lines.length} produtos <i>·</i> {count} caixas/fardos</span>
        <button disabled={submitting} onClick={() => updateCart([])}>Limpar carrinho</button>
      </div>

      <div className="cart-lines">
        {lines.map(item => (
          <div className="cart-line" key={item.productId}>
            <img src={item.product.image} alt={item.product.name} />
            <div className="cart-line-info">
              <h3>{item.product.name}</h3>
              <p>{item.product.unit} com {item.product.packSize} unidades</p>
              <div className="cart-line-bottom">
                <div className="quantity-control">
                  <button disabled={submitting} onClick={() => quantity(item.productId, item.quantity - 1)} aria-label={`Diminuir ${item.product.name}`}>
                    <Minus size={13} />
                  </button>
                  <span>{item.quantity}</span>
                  <button disabled={submitting || item.quantity >= 999} onClick={() => quantity(item.productId, item.quantity + 1)} aria-label={`Aumentar ${item.product.name}`}>
                    <Plus size={13} />
                  </button>
                </div>
                <strong>{money(item.price * item.quantity)}</strong>
                <button disabled={submitting} className="icon-button" onClick={() => quantity(item.productId, 0)} aria-label={`Remover ${item.product.name}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="logistics-summary">
        <span><Package size={15} />{weight.toFixed(1)} kg</span>
        <span title={`Peso cubado estimado: ${(volume * 300).toFixed(1)} kg, fator 300 kg/m³`}>
          {volume.toFixed(3)} m³ · {(volume * 300).toFixed(1)} kg cubados
        </span>
        <span><Truck size={15} />Entrega estimada em até 3 dias úteis</span>
      </div>

      <div className="cart-section">
        <label htmlFor="unit-select">WhatsApp da Distribuidora Ikeda para envio</label>
        <select id="unit-select" value={selectedUnit} disabled={submitting} onChange={e => setSelectedUnit(e.target.value)}>
          {IKEDA_UNITS.map(unit => (
            <option key={unit.id} value={unit.id}>
              {unit.name} · {unit.formatted} ({unit.region})
            </option>
          ))}
        </select>

        <label htmlFor="payment">Condição de pagamento</label>
        <select id="payment" value={payment} disabled={submitting} onChange={e => setPayment(e.target.value)}>
          <option>Boleto · 28 dias</option>
          <option>Boleto · 14 dias</option>
          <option>Boleto · 21 dias</option>
          <option>À vista · Pix faturado</option>
        </select>

        <label htmlFor="notes">Observações para a entrega <span>(opcional)</span></label>
        <textarea
          id="notes"
          placeholder="Ex.: entregar no período da manhã, descarregar na entrada lateral."
          value={notes}
          disabled={submitting}
          onChange={e => setNotes(e.target.value)}
          maxLength={500}
          rows={2}
        />
      </div>

      <div className="whatsapp-callout">
        <div className="whatsapp-callout-header">
          <span className="whatsapp-pill"><MessageSquare size={14} />Envio direto no WhatsApp</span>
          <span className="whatsapp-number">{activeUnit.formatted}</span>
        </div>
        <p>
          O pedido é formatado com caixas, unidades, tabela <strong>{data.customer.priceTable}</strong> e total de <strong>{money(total)}</strong>. Seu vendedor recebe a mensagem pronta para faturar, sem erros de digitação!
        </p>
      </div>

      <div className="cart-total">
        <span>Total do pedido</span>
        <strong>{money(total)}</strong>
      </div>

      {error && <div role="alert" className="form-error">{error}</div>}

      <div className="cart-cta-group">
        <button className="button-whatsapp" disabled={submitting} onClick={handleSendWhatsApp}>
          <LoadingLabel loading={submitting}>
            <Send size={18} />
            <span>{submitting ? "Abrindo WhatsApp..." : "Enviar Pedido via WhatsApp"}</span>
          </LoadingLabel>
        </button>

        <button className="button secondary button-copy-cart" type="button" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? "Pedido copiado!" : "Copiar texto do pedido"}</span>
        </button>
      </div>

      <p className="cart-disclaimer">
        <Sparkles size={13} />
        O WhatsApp abre com o pedido completo e formatado. Nenhum banco ou ERP externo é exigido.
      </p>
      <p className="secure-note">
        <Check size={13} />
        Tabela {data.customer.priceTable} aplicada com preços negociados para {data.customer.name}.
      </p>
    </div>
  );
}
