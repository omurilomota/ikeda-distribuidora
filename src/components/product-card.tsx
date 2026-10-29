"use client";
import { useState } from "react";
import { Heart, Plus, Minus, ShoppingCart } from "lucide-react";
import { money, priceFor, type Product, type PortalData } from "@/lib/types";

type Props = { product: Product; data: PortalData; onFavorite: (id: string) => void; onAdd: (id: string, quantity: number) => void; onOpen: (product: Product) => void };
export default function ProductCard({ product, data, onFavorite, onAdd, onOpen }: Props) {
  const [quantity, setQuantity] = useState(1);
  const price = priceFor(product, data.customer, data.promotions, quantity);
  const discount = Math.round((1 - price / product.originalPrice) * 100);
  const favorite = data.favorites.includes(product.id);
  const offer = data.promotions.find(p => p.active && p.productId === product.id);
  return <article className="product-card">
    <div className="product-card-top"><span className="discount-badge">−{discount}%</span><button className={`favorite-button ${favorite ? "is-favorite" : ""}`} onClick={() => onFavorite(product.id)} aria-label={`${favorite ? "Remover" : "Adicionar"} ${product.name} ${favorite ? "dos" : "aos"} favoritos`}><Heart size={18} fill={favorite ? "currentColor" : "none"} strokeWidth={1.7} /></button></div>
    <button className="product-image-button" onClick={() => onOpen(product)} aria-label={`Ver detalhes de ${product.name}`}><img src={product.image} alt={product.name} className={`product-image product-${product.id}`} loading="lazy" /></button>
    <div className="product-info"><span className="product-brand">{product.brand}</span><button className="product-title" onClick={() => onOpen(product)}>{product.name}</button><p className="product-pack">{product.unit} com {product.packSize} unidades <span>·</span> {money(Math.round(price / product.packSize))}/un.</p>{offer && <span className="volume-offer">{offer.kind === "buy3pay2" ? "Leve 3, pague 2" : `${offer.discount}% extra a partir de ${offer.minQuantity} caixas`}</span>}<div className="product-price"><span className="old-price">{money(product.originalPrice)}</span><div><strong>{money(price)}</strong><span>/{product.unit.toLowerCase()}</span></div></div><div className="product-actions"><div className="quantity-control"><button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label={`Diminuir quantidade de ${product.name}`}><Minus size={14} /></button><span>{quantity}</span><button onClick={() => setQuantity(q => Math.min(999, product.stock, q + 1))} disabled={quantity >= product.stock} aria-label={`Aumentar quantidade de ${product.name}`}><Plus size={14} /></button></div><button className="add-button" disabled={product.stock === 0} onClick={() => onAdd(product.id, quantity)}><ShoppingCart size={15} />{product.stock === 0 ? "Esgotado" : "Adicionar"}</button></div></div>
  </article>;
}
