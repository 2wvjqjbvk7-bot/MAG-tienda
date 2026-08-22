/* ====================================================================
   MAG — configuración y funciones compartidas por TODAS las páginas.
   Este archivo se enlaza desde index.html, personalizacion.html y
   favoritos.html mediante <script src="mag-common.js"></script>.

   Si quieres cambiar el número de WhatsApp, Instagram, email o la
   frase de debajo del logo, cámbialo aquí abajo y se actualizará en
   toda la web.
   ==================================================================== */
window.MAG_CONFIG = {
  WHATSAPP_NUMBER: "34636952595",
  INSTAGRAM_USER: "mag.handmade",
  EMAIL: "mag.handmade@gmail.com",
  TAGLINE: "hecho a mano, pieza a pieza",
};

const SWATCHES = ["#C9BCA8", "#A13D2A", "#7C8863", "#3F6259", "#8C6E4E", "#B79B7A"];

function waLink(text) {
  return `https://wa.me/${window.MAG_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/* ---------------------------------------------------------------
   Productos — se cargan una vez desde products.json y se reutilizan
   en cualquier página (catálogo, búsqueda, favoritos).
   --------------------------------------------------------------- */
let __magProductsCache = null;
async function loadAllProducts() {
  if (__magProductsCache) return __magProductsCache;
  try {
    const res = await fetch("./products.json");
    const data = await res.json();
    __magProductsCache = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("No se pudo cargar products.json:", e);
    __magProductsCache = [];
  }
  return __magProductsCache;
}

/* ---------------------------------------------------------------
   Favoritos — guardados en el navegador del cliente (localStorage)
   --------------------------------------------------------------- */
function getFavorites() {
  try {
    const saved = localStorage.getItem("mag_favorites");
    return saved ? JSON.parse(saved) : [];
  } catch (e) { return []; }
}
function saveFavorites(list) {
  try { localStorage.setItem("mag_favorites", JSON.stringify(list)); } catch (e) {}
}
function isFavorite(nombre) {
  return getFavorites().includes(nombre);
}
function toggleFavorite(nombre) {
  let favs = getFavorites();
  if (favs.includes(nombre)) favs = favs.filter((n) => n !== nombre);
  else favs.push(nombre);
  saveFavorites(favs);
  return favs.includes(nombre);
}
function clearFavorites() {
  if (getFavorites().length === 0) return;
  if (!confirm("¿Vaciar todos los favoritos? Se quitarán todas las piezas guardadas.")) return;
  saveFavorites([]);
  if (typeof window.onFavoritesChanged === "function") window.onFavoritesChanged();
}

/* ---------------------------------------------------------------
   Tarjeta de producto — reutilizada en el catálogo y en favoritos
   --------------------------------------------------------------- */
function productCardHTML(p, idx) {
  const available = (p.disponible || "SI").toUpperCase() !== "NO";
  const bg = p.imagen ? `background-image:url('${p.imagen}')` : `background:${SWATCHES[idx % SWATCHES.length]}`;
  const fav = isFavorite(p.nombre);
  return `
    <div class="card" data-name="${p.nombre}">
      <svg class="hang-tag" viewBox="0 0 36 36"><path d="M4 4 L20 4 L32 16 L20 32 L4 32 Z" fill="#F7F3EA" stroke="#2B2420" stroke-width="1.5"/><circle cx="11" cy="12" r="2.2" fill="none" stroke="#2B2420" stroke-width="1.5"/></svg>
      <button class="favorite-heart-btn ${fav ? "active" : ""}" data-fav-name="${p.nombre}" title="Añadir a favoritos" aria-label="Añadir a favoritos">${fav ? "♥" : "♡"}</button>
      <div class="thumb" style="${bg}">${p.imagen ? "" : `<span class="swatch-label mono">foto pendiente</span>`}</div>
      <div class="body">
        <span class="cat-label">${p.categoria || ""}</span>
        <h3>${p.nombre || ""}</h3>
        <p class="desc">${p.descripcion || ""}</p>
        <div class="price-row">
          <span class="price">${p.precio || "0"} €</span>
          ${available ? `<button class="btn btn-ghost btn-sm add-cart-btn" data-name="${p.nombre}">Añadir a la cesta</button>` : `<span class="unavailable-badge">no disponible</span>`}
        </div>
      </div>
    </div>`;
}

function bindProductCardEvents(container, products) {
  container.querySelectorAll(".favorite-heart-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.favName;
      const nowFav = toggleFavorite(name);
      btn.classList.toggle("active", nowFav);
      btn.textContent = nowFav ? "♥" : "♡";
      if (typeof window.onFavoritesChanged === "function") window.onFavoritesChanged();
    });
  });
  container.querySelectorAll(".add-cart-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = products.find((pr) => pr.nombre === btn.dataset.name);
      if (p) addToCart(p);
    });
  });
}

/* ---------------------------------------------------------------
   Cesta — igual que antes, guardada en localStorage
   --------------------------------------------------------------- */
let cart = [];
function loadCart() {
  try {
    const saved = localStorage.getItem("mag_cart");
    cart = saved ? JSON.parse(saved) : [];
  } catch (e) { cart = []; }
}
function saveCart() {
  try { localStorage.setItem("mag_cart", JSON.stringify(cart)); } catch (e) {}
}
function addToCart(p) {
  const existing = cart.find((item) => item.nombre === p.nombre);
  if (existing) existing.cantidad += 1;
  else cart.push({ nombre: p.nombre, precio: p.precio, imagen: p.imagen || "", cantidad: 1 });
  saveCart();
  renderCart();
  openCart();
}
function removeFromCart(nombre) {
  cart = cart.filter((item) => item.nombre !== nombre);
  saveCart();
  renderCart();
}
function clearCart() {
  if (cart.length === 0) return;
  if (!confirm("¿Vaciar toda la cesta? Se quitarán todas las piezas.")) return;
  cart = [];
  saveCart();
  renderCart();
}
function changeQty(nombre, delta) {
  const item = cart.find((i) => i.nombre === nombre);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) { removeFromCart(nombre); return; }
  saveCart();
  renderCart();
}
function renderCart() {
  const itemsEl = document.getElementById("cart-items");
  const countEls = document.querySelectorAll(".cart-count");
  const totalEl = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("cart-checkout");
  if (!itemsEl) return;

  const totalQty = cart.reduce((sum, i) => sum + i.cantidad, 0);
  countEls.forEach((el) => (el.textContent = totalQty));

  if (cart.length === 0) {
    itemsEl.innerHTML = `<p class="cart-empty">Tu cesta está vacía todavía.<br>Añade alguna pieza del catálogo.</p>`;
  } else {
    itemsEl.innerHTML = cart.map((item) => {
      const bg = item.imagen ? `background-image:url('${item.imagen}')` : `background:${SWATCHES[0]}`;
      return `
        <div class="cart-item">
          <div class="cart-item-thumb" style="${bg}"></div>
          <div class="cart-item-body">
            <span class="cart-item-name">${item.nombre}</span>
            <span class="cart-item-price">${item.precio} € × ${item.cantidad}</span>
            <div class="qty-row">
              <button class="qty-btn" data-action="minus" data-name="${item.nombre}">−</button>
              <span class="mono">${item.cantidad}</span>
              <button class="qty-btn" data-action="plus" data-name="${item.nombre}">+</button>
              <button class="cart-remove" data-action="remove" data-name="${item.nombre}">quitar</button>
            </div>
          </div>
        </div>`;
    }).join("");
    itemsEl.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.name;
        if (btn.dataset.action === "plus") changeQty(name, 1);
        else if (btn.dataset.action === "minus") changeQty(name, -1);
        else if (btn.dataset.action === "remove") removeFromCart(name);
      });
    });
  }

  const total = cart.reduce((sum, i) => sum + (parseFloat(i.precio) || 0) * i.cantidad, 0);
  if (totalEl) totalEl.textContent = total.toFixed(2) + " €";

  if (checkoutBtn) {
    if (cart.length === 0) {
      checkoutBtn.classList.add("cart-checkout-disabled");
      checkoutBtn.href = "#";
    } else {
      checkoutBtn.classList.remove("cart-checkout-disabled");
      const lines = cart.map((i) => `- ${i.nombre} ×${i.cantidad} (${i.precio}€)`).join("\n");
      const msg = `Hola! Quiero hacer este pedido:\n${lines}\n\nTotal: ${total.toFixed(2)}€`;
      checkoutBtn.href = waLink(msg);
    }
  }
}
function openCart() {
  document.getElementById("cart-panel").classList.add("open");
  document.getElementById("cart-overlay").classList.add("open");
}
function closeCart() {
  document.getElementById("cart-panel").classList.remove("open");
  document.getElementById("cart-overlay").classList.remove("open");
}

/* ---------------------------------------------------------------
   Cabecera fija + menú lateral + búsqueda + cesta
   Se inyectan dentro de <div id="mag-chrome"></div>, que debe estar
   presente justo después de <body> en cada página.
   --------------------------------------------------------------- */
function buildSiteChrome() {
  const chrome = document.getElementById("mag-chrome");
  if (!chrome) return;

  chrome.innerHTML = `
    <header class="site-header" id="site-header">
      <div class="site-header-inner">
        <div class="header-left">
          <button class="hamburger-btn" id="menu-open-btn" aria-label="Abrir menú">
            <span></span><span></span><span></span>
          </button>
        </div>
        <a class="header-brand" href="index.html">
          <h1>MAG</h1>
          <span class="tagline">${window.MAG_CONFIG.TAGLINE}</span>
        </a>
        <div class="header-right">
          <button class="header-icon-btn" id="search-open-btn" aria-label="Buscar">🔍</button>
          <button class="header-icon-btn" id="cart-open-btn" aria-label="Ver cesta">🧺<span class="cart-badge cart-count">0</span></button>
        </div>
      </div>
      <div class="search-overlay" id="search-overlay">
        <input type="text" class="search-input" id="search-input" placeholder="Busca una pieza por su nombre..." />
        <div class="search-results" id="search-results"></div>
      </div>
    </header>

    <div class="nav-overlay" id="nav-overlay"></div>
    <nav class="nav-panel" id="nav-panel">
      <div class="nav-panel-header">
        <span class="mono" style="font-size:12px; color:var(--color-ink-soft);">MENÚ</span>
        <button class="cart-close" id="menu-close-btn">×</button>
      </div>
      <a href="index.html#top">INICIO</a>
      <a href="catalogo.html">CATÁLOGO</a>
      <a href="personalizacion.html">PERSONALIZACIÓN 100%</a>
      <a href="favoritos.html">FAVORITOS</a>
      <a href="index.html#sobre">SOBRE MAG</a>
      <a href="index.html#contacto">¿HABLAMOS?</a>
      <a href="index.html#contacto">CONTACTO</a>
    </nav>

    <button class="cart-fab" id="cart-fab">🧺 Cesta <span class="cart-badge cart-count">0</span></button>
    <div class="cart-overlay" id="cart-overlay"></div>
    <div class="cart-panel" id="cart-panel">
      <div class="cart-header">
        <h3 style="font-size:18px;">Tu cesta</h3>
        <button class="cart-close" id="cart-close">×</button>
      </div>
      <div class="cart-subbar">
        <span class="cart-count-label"><span class="cart-count">0</span> piezas</span>
        <button class="cart-clear-btn" id="cart-clear-btn">Vaciar cesta</button>
      </div>
      <div class="cart-items" id="cart-items"></div>
      <div class="cart-footer">
        <div class="cart-total-row"><span>Total</span><span class="amount" id="cart-total">0 €</span></div>
        <a class="btn btn-clay" style="width:100%; justify-content:center;" id="cart-checkout" target="_blank" rel="noreferrer">Pedir por WhatsApp</a>
      </div>
    </div>
  `;

  /* Menú lateral */
  const navPanel = document.getElementById("nav-panel");
  const navOverlay = document.getElementById("nav-overlay");
  document.getElementById("menu-open-btn").addEventListener("click", () => {
    navPanel.classList.add("open");
    navOverlay.classList.add("open");
  });
  function closeMenu() {
    navPanel.classList.remove("open");
    navOverlay.classList.remove("open");
  }
  document.getElementById("menu-close-btn").addEventListener("click", closeMenu);
  navOverlay.addEventListener("click", closeMenu);
  navPanel.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

  /* Búsqueda */
  const searchOverlay = document.getElementById("search-overlay");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  document.getElementById("search-open-btn").addEventListener("click", () => {
    searchOverlay.classList.toggle("open");
    if (searchOverlay.classList.contains("open")) searchInput.focus();
  });
  searchInput.addEventListener("input", async () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { searchResults.innerHTML = ""; return; }
    const products = await loadAllProducts();
    const matches = products.filter((p) => (p.nombre || "").toLowerCase().includes(q));
    if (matches.length === 0) {
      searchResults.innerHTML = `<p style="color:var(--color-ink-soft); font-size:13px; padding:10px 6px;">No hay piezas con ese nombre.</p>`;
    } else {
      searchResults.innerHTML = matches.map((p) => `
        <div class="search-result-item" data-name="${p.nombre}">
          <span>${p.nombre}</span><span class="mono">${p.precio} €</span>
        </div>`).join("");
      searchResults.querySelectorAll(".search-result-item").forEach((el) => {
        el.addEventListener("click", () => {
          window.location.href = `catalogo.html?buscar=${encodeURIComponent(el.dataset.name)}`;
        });
      });
    }
  });

  /* Cesta */
  loadCart();
  renderCart();
  document.querySelectorAll("#cart-open-btn, #cart-fab").forEach((btn) => btn.addEventListener("click", openCart));
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("cart-overlay").addEventListener("click", closeCart);
  document.getElementById("cart-clear-btn").addEventListener("click", clearCart);

  /* Cabecera: se oculta al bajar, aparece al subir */
  const header = document.getElementById("site-header");
  let lastY = window.scrollY;
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        if (currentY > lastY && currentY > 90) {
          header.classList.add("header-hidden");
          searchOverlay.classList.remove("open");
        } else {
          header.classList.remove("header-hidden");
        }
        lastY = currentY;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

document.addEventListener("DOMContentLoaded", buildSiteChrome);
