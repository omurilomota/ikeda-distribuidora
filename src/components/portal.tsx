"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { LayoutDashboard, ShoppingBasket, Package, Wallet, Heart, BadgePercent, UserRound, Search, Bell, ChevronDown, ChevronRight, ArrowRight, ArrowUpRight, Plus, ShoppingCart, MessageCircle, ShieldCheck, Truck, TrendingUp, CalendarDays, Menu, X, LogOut, Check, RefreshCw, SlidersHorizontal, Sparkles, Coffee, Milk, SprayCan, Wheat, Wine, Cookie, CheckCircle2, CircleHelp, ArrowDownToLine, Clock3, Home, Headphones, Sun, Boxes, Copy, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { money, shortDate, priceFor, type PortalData, type View, type Product, type CartItem, type Order } from "@/lib/types";
import { portalAction } from "@/lib/client";
import { Logo, Modal, EmptyState, StatusBadge, LoadingLabel } from "@/components/ui";
import ProductCard from "@/components/product-card";
import CartPanel from "@/components/cart-panel";
import { OrdersTable, OrdersView, FinanceView, ProfileView, TradeView } from "@/components/portal-views";
import { IKEDA_UNITS, buildSupportWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp";

const viewNames: Record<View, string> = { overview: "Visão geral", catalog: "Catálogo de produtos", orders: "Meus pedidos", finance: "Financeiro", favorites: "Favoritos", offers: "Ofertas exclusivas", profile: "Meu cadastro", trade: "Gestão de ofertas" };
const descriptions: Partial<Record<View, string>> = { catalog: "Tudo para o seu estoque, com as condições que você merece.", orders: "Do primeiro clique até a sua porta. Acompanhe tudo por aqui.", finance: "Mais autonomia para cuidar das contas do seu negócio.", favorites: "Seus produtos de sempre, prontos para o próximo pedido.", offers: "Boas oportunidades para comprar melhor e vender mais.", profile: "Uma parceria começa com a gente se conhecendo melhor.", trade: "Crie oportunidades e leve boas ofertas a todos os parceiros." };
const categories: { name: string; icon: LucideIcon }[] = [{ name: "Todos", icon: ShoppingBasket }, { name: "Bebidas", icon: Wine }, { name: "Mercearia", icon: Wheat }, { name: "Biscoitos e snacks", icon: Cookie }, { name: "Laticínios", icon: Milk }, { name: "Limpeza", icon: SprayCan }, { name: "Higiene pessoal", icon: Sparkles }];

export default function Portal({ initialData }: { initialData: PortalData }) {
  const [data, setData] = useState(initialData); const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState(initialData.cart); const cartRef = useRef(initialData.cart); const cartQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [modal, setModal] = useState<"cart" | "login" | "support" | "product" | "success" | null>(null); const [product, setProduct] = useState<Product | null>(null); const [detailQuantity, setDetailQuantity] = useState(1); const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); const [successNumber, setSuccessNumber] = useState("");
  const [successWhatsAppUrl, setSuccessWhatsAppUrl] = useState("");
  const [successMessageText, setSuccessMessageText] = useState("");
  const [copiedSuccessText, setCopiedSuccessText] = useState(false);
  const [headerPanel, setHeaderPanel] = useState<"notifications" | "account" | null>(null); const [sidebarOpen, setSidebarOpen] = useState(false); const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null); const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const searchRef = useRef<HTMLInputElement>(null);
  const notify = useCallback((message: string, error = false) => { setToast({ message, error }); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 4500); }, []);
  const closeModal = useCallback(() => { setModal(null); setSelectedOrder(null); }, []);
  useEffect(() => { const key = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === "k") { event.preventDefault(); searchRef.current?.focus(); } if (event.key === "Escape") { setHeaderPanel(null); setSidebarOpen(false); } }; window.addEventListener("keydown", key); return () => { window.removeEventListener("keydown", key); if (toastTimer.current) clearTimeout(toastTimer.current); }; }, []);
  useEffect(() => {
    let disposed = false;
    async function sync() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/portal", { cache: "no-store" });
        if (!response.ok || disposed) return;
        const next: PortalData = await response.json();
        if (!disposed) setData(previous => previous.customer.id === next.customer.id ? { ...previous, customer: next.customer, products: next.products, promotions: next.promotions, orders: next.orders, invoices: next.invoices } : previous);
      } catch { /* Keep the current view usable during a temporary connection failure. */ }
    }
    const interval = setInterval(sync, 15000);
    window.addEventListener("focus", sync);
    return () => { disposed = true; clearInterval(interval); window.removeEventListener("focus", sync); };
  }, [data.customer.id]);
  async function refresh() { const response = await fetch("/api/portal", { cache: "no-store" }); if (!response.ok) throw new Error("Não foi possível atualizar os dados."); const next: PortalData = await response.json(); setData(next); setCart(next.cart); cartRef.current = next.cart; }
  function navigate(next: View) { setView(next); setQuery(""); setCategory("Todos"); setHeaderPanel(null); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function updateCart(items: CartItem[]) { cartRef.current = items; setCart(items); cartQueue.current = cartQueue.current.catch(() => {}).then(() => portalAction("cart", { items })).catch(e => { notify(e instanceof Error ? e.message : "Erro ao salvar carrinho.", true); }); }
  function addToCart(id: string, quantity: number) { const p = data.products.find(p => p.id === id); if (!p) return; const previous = cartRef.current.find(i => i.productId === id); const nextQuantity = (previous?.quantity ?? 0) + quantity; if (nextQuantity > p.stock || nextQuantity > 999) { notify(`Disponível: ${Math.min(p.stock, 999)} caixas/fardos de ${p.brand}.`, true); return; } updateCart(previous ? cartRef.current.map(i => i.productId === id ? { ...i, quantity: nextQuantity } : i) : [...cartRef.current, { productId: id, quantity }]); notify(`${quantity} ${p.unit.toLowerCase()}${quantity > 1 ? "s" : ""} de ${p.brand} no seu carrinho.`); }
  async function favorite(id: string) { const active = !data.favorites.includes(id); setData(prev => ({ ...prev, favorites: active ? [...prev.favorites, id] : prev.favorites.filter(p => p !== id) })); try { await portalAction("favorite", { productId: id, active }); } catch (e) { notify(e instanceof Error ? e.message : "Erro ao salvar favorito.", true); await refresh(); } }
  function repeatOrder(order: Order) { const next = [...cartRef.current]; let changed = false; for (const item of order.items) { const p = data.products.find(p => p.id === item.productId); if (!p || !p.stock) continue; const index = next.findIndex(i => i.productId === p.id); const quantity = Math.min(p.stock, 999, (index >= 0 ? next[index].quantity : 0) + item.quantity); if (index >= 0) next[index] = { productId: p.id, quantity }; else next.push({ productId: p.id, quantity }); changed = true; } if (!changed) { notify("Os produtos deste pedido estão indisponíveis.", true); return; } updateCart(next); setSelectedOrder(null); setModal("cart"); notify("Produtos adicionados com os preços e estoques atuais."); }
  async function login(email: string, password: string) { await cartQueue.current; await portalAction("login", { email, password }); await refresh(); setModal(null); navigate(email === "comercial@exemplo.com" ? "trade" : "overview"); notify("Bem-vindo! Sua tabela de preços foi carregada."); }
  async function logout() { try { await cartQueue.current; await portalAction("logout"); await refresh(); navigate("overview"); notify("Você voltou para a conta de demonstração."); } catch { notify("Não foi possível sair. Tente novamente.", true); } }
  const c = data.customer; const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0); const cartTotal = cart.reduce((sum, i) => { const p = data.products.find(p => p.id === i.productId); return sum + (p ? Math.round(priceFor(p, c, data.promotions, i.quantity) * i.quantity) : 0); }, 0);
  const activeOrders = data.orders.filter(o => o.status !== "Entregue"); const nextDelivery = [...activeOrders].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))[0]; const nextInvoice = data.invoices.find(i => i.status === "open");
  const savings = data.orders.reduce((sum, o) => sum + o.items.reduce((subtotal, i) => { const p = data.products.find(p => p.id === i.productId); return subtotal + Math.max(0, (p?.originalPrice ?? i.price) - i.price) * i.quantity; }, 0), 0);
  const initials = c.name.split(" ").slice(0, 2).map(n => n[0]).join("");
  const today = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
  const mainNav: { view: View; icon: LucideIcon; badge?: number }[] = [{ view: "overview", icon: LayoutDashboard }, { view: "catalog", icon: ShoppingBasket }, { view: "orders", icon: Package, badge: activeOrders.length }, { view: "finance", icon: Wallet }, { view: "favorites", icon: Heart }];
  const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filteredProducts = data.products.filter(p => (view !== "favorites" || data.favorites.includes(p.id)) && (view !== "offers" || p.originalPrice > p.price || data.promotions.some(promo => promo.active && promo.productId === p.id)) && (category === "Todos" || category === p.category) && normalized(`${p.name} ${p.brand} ${p.category} ${p.ean}`).includes(normalized(query))).sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
  const featured = ["guarana", "coca", "feijao", "cafe"].flatMap(id => { const p = data.products.find(p => p.id === id); return p ? [p] : []; });
  const lastPurchase = data.orders.find(order => order.status === "Entregue") ?? data.orders[0];
  const cardProps = { data, onFavorite: favorite, onAdd: addToCart, onOpen: (p: Product) => { setProduct(p); setDetailQuantity(1); setModal("product"); } };

  return <div className="app-shell">
    {sidebarOpen && <div className="sidebar-shade" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}><div className="sidebar-brand"><button className="brand-button" onClick={() => navigate("overview")} aria-label="Ir para visão geral"><Logo /></button><span className="portal-label">PORTAL DO PARCEIRO</span><button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X size={21} /></button></div><div className="sidebar-nav"><span className="nav-section-label">SEU DIA A DIA</span><nav aria-label="Navegação principal">{mainNav.map(item => <button key={item.view} className={`nav-item ${view === item.view ? "active" : ""}`} onClick={() => navigate(item.view)} aria-current={view === item.view ? "page" : undefined}><item.icon size={19} strokeWidth={1.7} /><span>{viewNames[item.view]}</span>{!!item.badge && <span className={`nav-badge ${item.view === "orders" ? "orange" : ""}`}>{item.badge}</span>}</button>)}</nav><div className="nav-divider" /><span className="nav-section-label">MAIS PARA O SEU NEGÓCIO</span><nav aria-label="Seu negócio"><button className={`nav-item ${view === "offers" ? "active" : ""}`} onClick={() => navigate("offers")}><BadgePercent size={19} strokeWidth={1.7} /><span>Ofertas exclusivas</span><span className="offer-dot" /></button><button className={`nav-item ${view === "profile" ? "active" : ""}`} onClick={() => navigate("profile")}><UserRound size={19} strokeWidth={1.7} /><span>Meu cadastro</span></button>{c.role === "admin" && <button className={`nav-item ${view === "trade" ? "active" : ""}`} onClick={() => navigate("trade")}><SlidersHorizontal size={19} /><span>Gestão de ofertas</span></button>}</nav></div><div className="sidebar-bottom"><div className="representative-card"><span className="representative-eyebrow">UMA PARCERIA DE VERDADE</span><div className="representative-person"><span className="representative-avatar"><Headphones size={19} /><i /></span><div><strong>Estamos por perto</strong><span>Conte com nossa equipe</span></div></div><button onClick={() => setModal("support")}><MessageCircle size={16} />Falar com meu vendedor<ArrowUpRight size={14} /></button></div><button className="help-link" onClick={() => setModal("support")}><CircleHelp size={16} />Precisa de ajuda?<ArrowUpRight size={13} /></button><div className="connection-status"><span /><span>Ambiente de demonstração</span></div></div></aside>

    <div className="workspace"><header className="topbar"><div className="breadcrumb"><button className="icon-button menu-toggle" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button><Home size={15} /><span>/</span><strong>{viewNames[view]}</strong></div><label className="global-search"><Search size={18} /><input ref={searchRef} value={query} onChange={e => { setQuery(e.target.value); if (e.target.value) { setView("catalog"); setCategory("Todos"); } }} onKeyDown={e => { if (e.key === "Enter") { setView("catalog"); searchRef.current?.blur(); } }} placeholder="Busque por produto, marca ou EAN" aria-label="Buscar produtos por nome, marca ou EAN" /><kbd>⌘ K</kbd></label><div className="header-actions"><button className="header-cart" onClick={() => { setHeaderPanel(null); setModal("cart"); }} aria-label={`Meu carrinho, ${cartCount} caixas`}><span className="cart-icon"><ShoppingCart size={20} />{cartCount > 0 && <span>{cartCount > 99 ? "99+" : cartCount}</span>}</span><span>Meu carrinho</span>{cartCount > 0 && <strong>{money(cartTotal)}</strong>}</button><div className="header-popover-anchor"><button className={`notification-button icon-button ${headerPanel === "notifications" ? "is-open" : ""}`} onClick={() => setHeaderPanel(headerPanel === "notifications" ? null : "notifications")} aria-label="Ver notificações" aria-expanded={headerPanel === "notifications"}><Bell size={20} /><i /></button>{headerPanel === "notifications" && <div className="header-popover notifications-popover"><div className="popover-heading"><h3>Boas notícias por aqui</h3><span>{Number(!!nextDelivery) + Number(!!nextInvoice)}</span></div>{nextDelivery && <button onClick={() => { navigate("orders"); setSelectedOrder(nextDelivery); }}><span className="notification-icon blue"><Truck size={18} /></span><div><strong>Seu estoque está a caminho</strong><p>Pedido #{nextDelivery.number} · previsão {shortDate(nextDelivery.deliveryDate)}</p></div><ChevronRight size={16} /></button>}{nextInvoice && <button onClick={() => navigate("finance")}><span className="notification-icon peach"><Wallet size={18} /></span><div><strong>Suas contas, organizadas</strong><p>Próximo vencimento em {shortDate(nextInvoice.dueDate)}.</p></div><ChevronRight size={16} /></button>}{!nextDelivery && !nextInvoice && <p className="popover-empty">Você está em dia. Nenhuma novidade por enquanto.</p>}<div className="popover-foot">Informações do ambiente demonstrativo</div></div>}</div><span className="header-divider" /><div className="header-popover-anchor"><button className="account-button" onClick={() => setHeaderPanel(headerPanel === "account" ? null : "account")} aria-expanded={headerPanel === "account"}><span className="account-avatar">{initials}</span><span className="account-text"><strong>{c.name}</strong><span>{c.priceTable}<span className="tiny-gold-dot" /></span></span><ChevronDown size={15} /></button>{headerPanel === "account" && <div className="header-popover account-popover"><div className="account-popover-heading"><strong>{c.name}</strong><span>{c.email}</span></div><button onClick={() => navigate("profile")}><UserRound size={17} />Meu cadastro</button><button onClick={() => { setHeaderPanel(null); setModal("login"); }}><RefreshCw size={17} />{data.demo ? "Acessar outra conta" : "Trocar de conta"}</button>{!data.demo && <button onClick={logout}><LogOut size={17} />Sair da conta</button>}<div className="popover-foot">Contas fictícias para demonstração</div></div>}</div></div></header>

    <main className="main-content" onClick={() => { if (headerPanel) setHeaderPanel(null); }}><div className="page-heading"><div>{view === "overview" ? <><div className="welcome-kicker"><span />BOM TER VOCÊ POR AQUI</div><h1>Olá, {c.name}<span className="greeting-wave">👋</span></h1><p>Vamos juntos abastecer o seu negócio?</p></> : <><div className="welcome-kicker">SEU NEGÓCIO EM BOAS MÃOS</div><h1>{viewNames[view]}{view === "offers" && <BadgePercent size={26} className="heading-orange-icon" />}</h1><p>{descriptions[view]}</p></>}</div><div className="page-heading-actions">{view === "overview" && <span className="today-label"><CalendarDays size={14} />{today}</span>}{!["catalog", "offers", "favorites", "trade"].includes(view) && <button className="button dark" onClick={() => navigate("catalog")}><Plus size={17} />Novo pedido</button>}{["catalog", "offers", "favorites"].includes(view) && <span className="price-table-chip"><ShieldCheck size={16} /><span>Seus preços <strong>{c.priceTable}</strong></span></span>}</div></div>

    {view === "overview" && <>
      <section className="metrics-grid" aria-label="Resumo do seu negócio"><button className="metric-card metric-clickable" onClick={() => navigate("finance")}><span className="metric-label"><span className="metric-icon green"><Wallet size={17} /></span>Limite disponível</span><strong>{money(c.creditLimit - c.creditUsed)}</strong><div className="metric-bottom"><span>de {money(c.creditLimit)} aprovado</span><ArrowUpRight size={15} /></div></button><button className="metric-card metric-clickable" onClick={() => navigate("orders")}><span className="metric-label"><span className="metric-icon peach"><Package size={17} /></span>Pedidos em andamento</span><strong>{String(activeOrders.length).padStart(2, "0")}<span className="metric-value-suffix">pedidos</span></strong><div className="metric-bottom"><span><i className="small-green-dot" />Acompanhe cada etapa</span><ArrowUpRight size={15} /></div></button><button className="metric-card metric-clickable" onClick={() => { if (nextDelivery) setSelectedOrder(nextDelivery); else navigate("orders"); }}><span className="metric-label"><span className="metric-icon blue"><Truck size={17} /></span>Próxima entrega</span><strong className="delivery-value">{nextDelivery ? shortDate(nextDelivery.deliveryDate) : "Vamos pedir?"}<span className="delivery-check"><Check size={13} /></span></strong><div className="metric-bottom"><span>{nextDelivery ? `Pedido #${nextDelivery.number}` : "Faça seu primeiro pedido"}</span><ArrowUpRight size={15} /></div></button><div className="metric-card"><span className="metric-label"><span className="metric-icon purple"><TrendingUp size={17} /></span>Economia nas compras</span><strong>{money(savings)}</strong><div className="metric-bottom"><span className="savings-caption"><TrendingUp size={13} />Em relação ao preço de referência</span></div></div></section>
      <section className="hero-banner"><img className="hero-image" src="/images/hero-groceries.jpg" alt="Carrinho laranja abastecido com arroz, leite, óleo e outros produtos de mercearia" /><div className="hero-image-fade" /><div className="hero-content"><span className="hero-eyebrow"><span />PARCERIA QUE ABASTECE</span><h2>Seu estoque em dia.<br />Seu negócio <span>mais forte.</span></h2><p>Mais praticidade para comprar.<br className="hero-mobile-break" /> Mais oportunidades para crescer.</p><div className="hero-actions"><button className="button primary" onClick={() => navigate("catalog")}>Começar pedido<ArrowRight size={17} /></button><span><ShieldCheck size={15} />Preços e ofertas da sua tabela</span></div></div><div className="hero-heritage"><span>desde</span><strong>1981</strong><i /><span>ao lado do<br />seu negócio</span></div><div className="hero-pagination"><span className="active" /><span /><span /></div></section>
      <section className="featured-section"><div className="section-heading"><div><h2>Ofertas para o seu negócio<span className="section-orange-dot" /></h2><p>Produtos que giram o estoque. Preços que fazem a diferença.</p></div><button className="text-button orange-text" onClick={() => navigate("catalog")}>Ver catálogo completo<ArrowRight size={16} /></button></div><div className="product-grid">{featured.map(p => <ProductCard key={p.id} product={p} {...cardProps} />)}</div></section>
      <section className="overview-bottom"><div className="panel recent-orders"><div className="panel-heading"><div><h2>Seus últimos pedidos</h2><p>Uma visão rápida do que está acontecendo.</p></div><button className="text-button orange-text" onClick={() => navigate("orders")}>Ver todos<ArrowRight size={15} /></button></div>{data.orders.length ? <OrdersTable orders={data.orders.slice(0, 3)} onOpen={setSelectedOrder} compact /> : <EmptyState title="Vamos começar essa parceria?" text="Seu primeiro pedido vai aparecer aqui." action="Fazer um pedido" onAction={() => navigate("catalog")} />}</div><div className="reorder-card"><span className="reorder-icon"><RefreshCw size={23} /></span><h2>Os favoritos do seu estoque,<br />de novo no seu negócio.</h2><p>Repita um pedido e ganhe tempo para o que importa.</p><button className="button secondary" onClick={() => data.orders.length ? repeatOrder(data.orders.find(o => o.status === "Entregue") ?? data.orders[0]) : navigate("catalog")}>{data.orders.length ? "Repetir último pedido" : "Conhecer o catálogo"}<ArrowRight size={16} /></button></div></section>
    </>}

    {["catalog", "offers", "favorites"].includes(view) && <div className="catalog-view">{view === "offers" && <div className="offers-strip"><span><BadgePercent size={25} /></span><div><strong>Comprar bem é o primeiro passo para vender mais.</strong><p>Ofertas já aplicadas à sua tabela. Descontos por volume são calculados no carrinho.</p></div><Sparkles size={26} /></div>}<div className="category-tabs" aria-label="Filtrar por categoria">{categories.map(item => { const count = item.name === "Todos" ? data.products.length : data.products.filter(product => product.category === item.name).length; return <button className={category === item.name ? "active" : ""} key={item.name} onClick={() => setCategory(item.name)}><item.icon size={17} />{item.name}<span className="category-count">{count}</span></button>; })}</div><div className="catalog-toolbar"><div><strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}{query && <span className="search-result-term"> para “{query}”<button onClick={() => setQuery("")} aria-label="Limpar busca"><X size={13} /></button></span>}</div><span className="catalog-hint"><Search size={15} />Busca por produto, marca ou código EAN.</span></div>{filteredProducts.length ? <div className="product-grid catalog-grid">{filteredProducts.map(p => <ProductCard key={p.id} product={p} {...cardProps} />)}</div> : <EmptyState title={view === "favorites" && !query ? "Seus preferidos têm um lugar aqui" : "Não encontramos esse produto"} text={view === "favorites" && !query ? "Toque no coração dos produtos para montar sua lista e comprar mais rápido." : "Tente outro nome, código EAN ou categoria. Seu próximo bom negócio está por aqui."} action="Ver todos os produtos" onAction={() => navigate("catalog")} />}<div className="catalog-bottom-note"><ShieldCheck size={16} />Preços por caixa ou fardo. Todos os valores seguem a tabela <strong>{c.priceTable}.</strong></div></div>}
    {view === "orders" && <OrdersView data={data} onOpen={setSelectedOrder} onBrowse={() => navigate("catalog")} />}
    {view === "finance" && <FinanceView data={data} onSupport={() => setModal("support")} />}
    {view === "profile" && <ProfileView key={c.id} data={data} refresh={refresh} notify={notify} />}
    {view === "trade" && <TradeView data={data} refresh={refresh} notify={notify} />}
    <footer className="main-footer"><span><span className="footer-brand">ikeda</span>Desde 1981, crescendo com você.</span><span><ShieldCheck size={13} />Dados demonstrativos · ERP não conectado</span></footer>
    </main>{cartCount > 0 && <button className="mobile-cart-bar" onClick={() => { setHeaderPanel(null); setModal("cart"); }} aria-label={`Revisar pedido: ${cartCount} caixas ou fardos, total ${money(cartTotal)}`}><span className="mobile-cart-icon"><ShoppingCart size={20} /><i>{cartCount > 99 ? "99+" : cartCount}</i></span><span className="mobile-cart-copy"><strong>{cartCount} {cartCount === 1 ? "caixa ou fardo" : "caixas e fardos"}</strong><small>{money(cartTotal)}</small></span><span className="mobile-cart-cta">Revisar pedido<ArrowRight size={17} /></span></button>}</div>

    {toast && <div className={`toast ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"}><span>{toast.error ? <CircleHelp size={19} /> : <CheckCircle2 size={19} />}</span><p>{toast.message}</p>{!toast.error && toast.message.includes("carrinho") && <button onClick={() => { setToast(null); setModal("cart"); }}>Ver carrinho<ArrowRight size={14} /></button>}<button className="toast-close" onClick={() => setToast(null)} aria-label="Fechar aviso"><X size={16} /></button></div>}
    {modal === "cart" && <Modal title="Meu carrinho" side onClose={closeModal}><CartPanel data={data} cart={cart} updateCart={updateCart} flushCart={async () => { await cartQueue.current; }} onBrowse={() => { setModal(null); navigate("catalog"); }} onDone={async (number, whatsappUrl, text) => { await refresh(); setSuccessNumber(number); setSuccessWhatsAppUrl(whatsappUrl ?? ""); setSuccessMessageText(text ?? ""); setModal("success"); }} /></Modal>}
    {modal === "login" && <Modal title="Sua conta, suas condições" onClose={closeModal}><LoginForm onLogin={login} onSupport={() => setModal("support")} /></Modal>}
    {modal === "support" && <Modal title="Pode contar com a gente" onClose={closeModal}><SupportForm customerName={c.name} cnpj={c.cnpj} /></Modal>}
    {modal === "success" && <Modal title="Pedido pronto para o vendedor!" wide onClose={closeModal}>
      <div className="success-content">
        <span className="success-icon whatsapp-success-icon"><MessageCircle size={46} strokeWidth={1.7} /></span>
        <span className="eyebrow">PEDIDO REDIRECIONADO AO WHATSAPP</span>
        <h3>Pedido #{successNumber} gerado!</h3>
        <p>A mensagem foi formatada com suas caixas, unidades, tabela e total. O WhatsApp foi aberto para você confirmar o envio com o vendedor.</p>

        <div className="success-actions-row">
          {successWhatsAppUrl && (
            <a className="button-whatsapp" href={successWhatsAppUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} />
              <span>Abrir conversa no WhatsApp</span>
            </a>
          )}
          {successMessageText && (
            <button
              className="button secondary"
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(successMessageText);
                  setCopiedSuccessText(true);
                  setTimeout(() => setCopiedSuccessText(false), 3000);
                } catch { /* clipboard */ }
              }}
            >
              {copiedSuccessText ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedSuccessText ? "Mensagem copiada!" : "Copiar texto do pedido"}</span>
            </button>
          )}
        </div>

        {successMessageText && (
          <div className="whatsapp-preview-box">
            <div className="whatsapp-preview-header">
              <span>Texto pré-formatado para o WhatsApp da Distribuidora Ikeda:</span>
            </div>
            <pre>{successMessageText}</pre>
          </div>
        )}

        <div className="success-footer-actions">
          <button className="button dark" onClick={() => { setModal(null); navigate("orders"); }}>
            Ver meus pedidos registrados
          </button>
          <button className="button secondary" onClick={() => { setModal(null); navigate("catalog"); }}>
            Continuar no catálogo
          </button>
        </div>
      </div>
    </Modal>}
    {modal === "product" && product && <Modal title="Conheça o produto" wide onClose={closeModal}><div className="product-detail"><div className="product-detail-image"><img src={product.image} alt={product.name} /></div><div className="product-detail-info"><span className="eyebrow orange-text">{product.brand} · {product.category}</span><h3>{product.name}</h3><p>{product.description}</p><span className="product-stock"><i className="small-green-dot" />{product.stock} caixas/fardos disponíveis</span><dl><div><dt>Embalagem</dt><dd>{product.unit} com {product.packSize} un.</dd></div><div><dt>Código EAN</dt><dd>{product.ean}</dd></div><div><dt>Peso por embalagem</dt><dd>{product.weightKg.toFixed(1)} kg</dd></div><div><dt>Volume por embalagem</dt><dd>{product.volumeM3.toFixed(3)} m³</dd></div></dl><span className="old-price">{money(product.originalPrice)}</span><div className="detail-price"><strong>{money(priceFor(product, c, data.promotions, detailQuantity))}</strong><span>/{product.unit.toLowerCase()}</span></div><p className="field-hint">Preço da sua tabela {c.priceTable}. Venda por embalagem fechada.</p><div className="detail-actions"><div className="quantity-control"><button disabled={detailQuantity <= 1} onClick={() => setDetailQuantity(q => q - 1)} aria-label="Diminuir quantidade">−</button><span>{detailQuantity}</span><button disabled={detailQuantity >= product.stock} onClick={() => setDetailQuantity(q => q + 1)} aria-label="Aumentar quantidade">+</button></div><button className="button primary" disabled={!product.stock} onClick={() => addToCart(product.id, detailQuantity)}><ShoppingCart size={17} />Adicionar ao carrinho</button><button className={`icon-button favorite-detail ${data.favorites.includes(product.id) ? "orange-text" : ""}`} onClick={() => favorite(product.id)} aria-label="Alternar favorito"><Heart size={20} fill={data.favorites.includes(product.id) ? "currentColor" : "none"} /></button></div></div></div></Modal>}
    {selectedOrder && <Modal title={`Pedido #${selectedOrder.number}`} wide onClose={closeModal}><div className="order-detail"><div className="order-detail-top"><span>Realizado em {shortDate(selectedOrder.createdAt)}</span><StatusBadge status={selectedOrder.status} /></div><div className="order-timeline">{["Confirmado", "Em separação", "Em transporte", "Entregue"].map((step, i, steps) => <div className={i <= steps.indexOf(selectedOrder.status) ? "complete" : ""} key={step}><span>{i <= steps.indexOf(selectedOrder.status) ? <Check size={14} /> : i + 1}</span><strong>{step}</strong></div>)}</div><div className="order-delivery-note"><Truck size={20} /><div><strong>{selectedOrder.status === "Entregue" ? "Entrega realizada" : "Previsão de entrega"}: {shortDate(selectedOrder.deliveryDate)}</strong><span>{c.address}</span></div></div><div className="order-item-list">{selectedOrder.items.map(item => <div key={item.productId}><img src={item.image} alt={item.name} /><span><strong>{item.name}</strong><small>{item.quantity} caixas/fardos · {item.packSize} unidades por embalagem</small></span><strong>{money(item.price * item.quantity)}</strong></div>)}</div><div className="order-detail-summary"><div><span>Pagamento</span><strong>{selectedOrder.payment}</strong></div><div><span>Peso / volume</span><strong>{selectedOrder.weightKg.toFixed(1)} kg / {selectedOrder.volumeM3.toFixed(3)} m³</strong></div><div><span>Total do pedido</span><strong>{money(selectedOrder.total)}</strong></div></div>{selectedOrder.notes && <p className="order-notes"><strong>Observações:</strong> {selectedOrder.notes}</p>}<div className="order-detail-actions"><a className="button secondary" href={`/api/documents/${selectedOrder.id}?type=order`}><ArrowDownToLine size={16} />Baixar resumo</a><button className="button primary" onClick={() => repeatOrder(selectedOrder)}><RefreshCw size={16} />Comprar novamente</button></div><p className="field-hint">Pedido demonstrativo. Status de entrega não sincronizado com um ERP.</p></div></Modal>}
  </div>;
}

function LoginForm({ onLogin, onSupport }: { onLogin: (email: string, password: string) => Promise<void>; onSupport: () => void }) {
  const [email, setEmail] = useState("cliente@exemplo.com"); const [password, setPassword] = useState("ikeda2026"); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(e: FormEvent) { e.preventDefault(); setLoading(true); setError(""); try { await onLogin(email, password); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar."); setLoading(false); } }
  return <form className="login-form form-content" onSubmit={submit}><p>Entre para carregar automaticamente os preços e as condições do seu contrato.</p><label>E-mail de acesso<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Senha<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={128} /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="button primary" disabled={loading}><LoadingLabel loading={loading}>{loading ? "Carregando sua tabela..." : "Entrar no meu portal"}</LoadingLabel><ArrowRight size={17} /></button><div className="demo-accounts"><span className="eyebrow">EXPLORE AS CONTAS DE DEMONSTRAÇÃO</span>{[{ email: "cliente@exemplo.com", name: "Mercadinho São João", table: "Ouro · preços padrão", icon: ShoppingBasket }, { email: "padaria@exemplo.com", name: "Padaria Pão da Terra", table: "Diamante · 5% de desconto", icon: Coffee }, { email: "comercial@exemplo.com", name: "Equipe comercial", table: "Criação e gestão de promoções", icon: SlidersHorizontal }].map(account => <button key={account.email} type="button" disabled={loading} className={email === account.email ? "selected" : ""} onClick={() => { setEmail(account.email); setPassword("ikeda2026"); setError(""); }}><account.icon size={20} /><span><strong>{account.name}</strong><small>{account.table}</small></span>{email === account.email ? <CheckCircle2 size={17} /> : <ChevronRight size={17} />}</button>)}<p>Senha de demonstração: <strong>ikeda2026</strong></p></div><button type="button" className="text-button login-help" onClick={onSupport}>Precisa de ajuda para acessar?<ArrowUpRight size={14} /></button></form>;
}
function SupportForm({ customerName, cnpj }: { customerName: string; cnpj?: string }) {
  const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [protocol, setProtocol] = useState("");

  function handleDirectWhatsApp(phone: string) {
    const text = buildSupportWhatsAppMessage(customerName, cnpj);
    openWhatsApp(phone, text);
  }

  async function submit(e: FormEvent) { e.preventDefault(); setLoading(true); setError(""); try { const result = await portalAction("support", { message }); setProtocol(result.protocol); } catch (e) { setError(e instanceof Error ? e.message : "Erro ao registrar solicitação."); } finally { setLoading(false); } }
  if (protocol) return <div className="success-content"><span className="success-icon"><MessageCircle size={38} /></span><h3>Solicitação registrada!</h3><p>Sua mensagem foi salva no ambiente de demonstração.</p><div className="protocol-box"><span>SEU PROTOCOLO</span><strong>{protocol}</strong></div><p className="field-hint">Em produção, o atendimento poderá ser encaminhado ao representante responsável.</p></div>;
  return (
    <div className="support-wrapper">
      <div className="support-intro">
        <span><Headphones size={26} /></span>
        <div>
          <strong>Atendimento Comercial Direto</strong>
          <p>Fale diretamente com os representantes da Distribuidora Ikeda via WhatsApp ou registre um chamado.</p>
        </div>
      </div>

      <div className="support-whatsapp-options">
        <span className="eyebrow">CHAMAR VENDEDOR NO WHATSAPP</span>
        {IKEDA_UNITS.map(unit => (
          <button
            key={unit.id}
            type="button"
            className="button-whatsapp-unit"
            onClick={() => handleDirectWhatsApp(unit.phone)}
          >
            <div className="unit-info">
              <strong>{unit.name}</strong>
              <small>{unit.region} · {unit.formatted}</small>
            </div>
            <span className="unit-action"><Send size={15} />Conversar</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="form-content support-form">
        <span className="eyebrow">OU DEIXE UMA MENSAGEM NO PORTAL</span>
        <label>Seu negócio<input value={customerName} readOnly /></label>
        <label>Como podemos ajudar?<textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Conte um pouco do que você precisa..." rows={3} required minLength={10} maxLength={2000} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button secondary" disabled={loading}><LoadingLabel loading={loading}>Registrar no portal</LoadingLabel><ArrowRight size={17} /></button>
        <p className="field-hint">Atendimento direto da equipe de Junqueirópolis e Campo Grande.</p>
      </form>
    </div>
  );
}
