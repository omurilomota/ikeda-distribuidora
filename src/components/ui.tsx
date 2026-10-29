"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, PackageOpen, ArrowRight, LoaderCircle } from "lucide-react";

export function Logo() { return <div className="brand" aria-label="Ikeda Distribuidora"><span className="brand-name">ikeda<span className="brand-dot">®</span></span><span className="brand-caption">D I S T R I B U I D O R A</span></div>; }
export function Modal({ title, children, onClose, side = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; side?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null); const id = useId();
  useEffect(() => {
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const previous = document.activeElement as HTMLElement;
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, a[href], [tabindex="0"]') ?? []);
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "Tab") { const all = focusable(); const first = all[0]; const last = all[all.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", key); previous?.focus(); };
  }, [onClose]);
  return <div className={`modal-backdrop ${side ? "drawer-backdrop" : ""}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={`${side ? "drawer" : "modal"} ${wide ? "modal-wide" : ""}`}><div className="modal-header"><div><span className="eyebrow">PORTAL DO PARCEIRO</span><h2 id={id}>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar janela"><X size={21} /></button></div>{children}</div></div>;
}
export function StatusBadge({ status }: { status: string }) { const kind = status === "Entregue" || status === "Pago" ? "green" : status === "Em transporte" ? "blue" : status === "Em separação" ? "amber" : "neutral"; return <span className={`status-badge ${kind}`}><i />{status}</span>; }
export function EmptyState({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) { return <div className="empty-state"><div className="empty-icon"><PackageOpen size={32} strokeWidth={1.5} /></div><h3>{title}</h3><p>{text}</p>{action && <button className="button primary" onClick={onAction}>{action}<ArrowRight size={16} /></button>}</div>; }
export function LoadingLabel({ loading, children }: { loading: boolean; children: ReactNode }) { return <>{loading && <LoaderCircle size={17} className="spin" />}{children}</>; }
