// --- State ---
let PRODUCTS = [];
let FILTERS = { category: "all", brand: "", strength: "", q: "", sort: "pop" };
let CART = JSON.parse(localStorage.getItem("cart") || "[]");

// --- Elements ---
const grid = document.getElementById("grid");
const tabs = document.querySelectorAll(".tab");
const brandFilter = document.getElementById("brandFilter");
const strengthFilter = document.getElementById("strengthFilter");
const sortSelect = document.getElementById("sortSelect");
const searchInput = document.getElementById("searchInput");
const cartBtn = document.getElementById("cartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const closeCart = document.getElementById("closeCart");
const backdrop = document.getElementById("backdrop");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutForm = document.getElementById("checkoutForm");
const policyModal = document.getElementById("policyModal");
const openPolicy = document.getElementById("openPolicy");
const closePolicy = document.getElementById("closePolicy");
const ageGate = document.getElementById("ageGate");
const ageYes = document.getElementById("ageYes");
const ageNo = document.getElementById("ageNo");

// --- Init ---
document.addEventListener("DOMContentLoaded", async () => {
  await loadProducts();
  hydrateBrandFilter();
  render();

  // Age gate
  const passed = localStorage.getItem("age18ok") === "1";
  if (!passed) ageGate.classList.remove("hidden"); else ageGate.remove();

  // Events
  tabs.forEach(t => t.addEventListener("click", onTab));
  brandFilter.addEventListener("change", () => { FILTERS.brand = brandFilter.value; render(); });
  strengthFilter.addEventListener("change", () => { FILTERS.strength = strengthFilter.value; render(); });
  sortSelect.addEventListener("change", () => { FILTERS.sort = sortSelect.value; render(); });
  searchInput.addEventListener("input", debounce(e => { FILTERS.q = e.target.value.trim().toLowerCase(); render(); }, 200));

  cartBtn.addEventListener("click", openCart);
  closeCart.addEventListener("click", closeCartDrawer);
  backdrop.addEventListener("click", closeCartDrawer);
  checkoutBtn.addEventListener("click", () => checkoutModal.showModal());
  checkoutForm.addEventListener("submit", onCheckoutSubmit);

  openPolicy.addEventListener("click", (e) => { e.preventDefault(); policyModal.showModal(); });
  closePolicy?.addEventListener("click", () => policyModal.close());

  ageYes.addEventListener("click", () => { localStorage.setItem("age18ok","1"); ageGate.remove(); });
  ageNo.addEventListener("click", () => { window.location.href = "https://google.com"; });
});

async function loadProducts(){
  const res = await fetch("data/products.json");
  PRODUCTS = await res.json();
}

function hydrateBrandFilter(){
  const brands = Array.from(new Set(PRODUCTS.map(p => p.brand))).sort();
  for (const b of brands){
    const opt = document.createElement("option");
    opt.value = b; opt.textContent = `Бренд: ${b}`;
    brandFilter.appendChild(opt);
  }
}

// --- Render ---
function render(){
  const items = pipe(
    filterCategory,
    filterBrand,
    filterStrength,
    filterQuery,
    sortItems
  )(PRODUCTS);

  grid.innerHTML = items.map(cardHTML).join("");

  // bind add-to-cart
  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.add;
      const prod = PRODUCTS.find(p => p.id === id);
      addToCart(prod);
    });
  });

  updateCartUI();
}

function cardHTML(p){
  const badges = [
    p.new ? `<span class="badge">NEW</span>` : "",
    p.popular ? `<span class="badge">HIT</span>` : ""
  ].join(" ");

  const meta = [
    p.brand && `<span>бренд: ${p.brand}</span>`,
    p.flavor && `<span>вкус: ${p.flavor}</span>`,
    Number.isFinite(p.strength) && p.strength>0 ? `<span>${p.strength} mg</span>` : "",
    p.volume_ml ? `<span>${p.volume_ml} мл</span>` : ""
  ].filter(Boolean).join(" • ");

  const old = p.oldPrice ? `<s class="muted">${p.oldPrice} ₴</s>` : "";

  return `
  <article class="card">
    <div class="thumb"><img src="${p.img}" alt="${p.title}"></div>
    <div class="body">
      <div class="title">${p.title}</div>
      <div class="meta">${meta}</div>
      <div class="bottom">
        <div class="price">${p.price} ₴ ${old}</div>
        <button class="btn primary sm" data-add="${p.id}">В корзину</button>
      </div>
      <div class="meta">${badges}</div>
    </div>
  </article>`;
}

// --- Filters / Sort ---
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);
const filterCategory = arr => FILTERS.category==="all" ? arr : arr.filter(p => p.category===FILTERS.category);
const filterBrand = arr => FILTERS.brand ? arr.filter(p => p.brand===FILTERS.brand) : arr;
const filterStrength = arr => FILTERS.strength!=="" ? arr.filter(p => String(p.strength)===String(FILTERS.strength)) : arr;
const filterQuery = arr => {
  const q = FILTERS.q;
  if (!q) return arr;
  return arr.filter(p => [p.title,p.brand,p.flavor].join(" ").toLowerCase().includes(q));
};
const sortItems = arr => {
  const s = FILTERS.sort;
  const dup = [...arr];
  if (s==="price_asc") return dup.sort((a,b)=>a.price-b.price);
  if (s==="price_desc") return dup.sort((a,b)=>b.price-a.price);
  if (s==="new") return dup.sort((a,b)=> (b.new?1:0) - (a.new?1:0));
  return dup.sort((a,b)=> (b.popular?1:0) - (a.popular?1:0));
};

// --- Tabs ---
function onTab(e){
  tabs.forEach(t=>t.classList.remove("active"));
  e.currentTarget.classList.add("active");
  FILTERS.category = e.currentTarget.dataset.category;
  render();
}

// --- Cart ---
function addToCart(p){
  const idx = CART.findIndex(i => i.id===p.id);
  if (idx>=0) CART[idx].qty += 1;
  else CART.push({ id: p.id, title: p.title, price: p.price, img: p.img, qty: 1 });
  persistCart();
  openCart();
  updateCartUI();
}

function updateCartUI(){
  const sum = CART.reduce((s,i)=> s + i.price*i.qty, 0);
  cartTotal.textContent = `${sum} ₴`;
  cartCount.textContent = CART.reduce((s,i)=> s + i.qty, 0);

  cartItems.innerHTML = CART.length ? CART.map(ciHTML).join("") : `<div class="muted">Корзина пуста</div>`;
  bindCartItemEvents();
}

function ciHTML(i){
  return `
  <div class="cart-item">
    <img src="${i.img}" alt="${i.title}">
    <div>
      <div class="ci-title">${i.title}</div>
      <div class="muted">${i.price} ₴</div>
      <button class="icon-btn" data-rem="${i.id}">Удалить</button>
    </div>
    <div class="qty">
      <button data-dec="${i.id}">−</button>
      <span>${i.qty}</span>
      <button data-inc="${i.id}">+</button>
    </div>
  </div>`;
}

function bindCartItemEvents(){
  cartItems.querySelectorAll("[data-inc]").forEach(b=>b.addEventListener("click", ()=>changeQty(b.dataset.inc, +1)));
  cartItems.querySelectorAll("[data-dec]").forEach(b=>b.addEventListener("click", ()=>changeQty(b.dataset.dec, -1)));
  cartItems.querySelectorAll("[data-rem]").forEach(b=>b.addEventListener("click", ()=>removeItem(b.dataset.rem)));
}

function changeQty(id, delta){
  const i = CART.find(x=>x.id===id);
  if (!i) return;
  i.qty = Math.max(1, i.qty + delta);
  persistCart(); updateCartUI();
}
function removeItem(id){ CART = CART.filter(i=>i.id!==id); persistCart(); updateCartUI(); }
function persistCart(){ localStorage.setItem("cart", JSON.stringify(CART)); }

function openCart(){ cartDrawer.classList.add("open"); backdrop.classList.add("show"); }
function closeCartDrawer(){ cartDrawer.classList.remove("open"); backdrop.classList.remove("show"); }

// --- Checkout ---
function onCheckoutSubmit(ev){
  ev.preventDefault();

  const data = Object.fromEntries(new FormData(checkoutForm).entries());
  const items = CART.map(i => `${i.title} × ${i.qty} = ${i.price * i.qty}₴`).join("\n");
  const total = CART.reduce((s, i) => s + i.price * i.qty, 0);

  const text =
`🧾 Заказ с сайта
Имя: ${data.name}
Телефон: ${data.phone}
Доставка: ${data.delivery}
Комментарий: ${data.comment || "-"}
—
Товары:
${items}
Итого: ${total} ₴`;

  // username берём из window.TG_USERNAME, иначе по умолчанию твой
  const username = (window.TG_USERNAME || "viibbee_17").replace("@", "");
  const encoded = encodeURIComponent(text);

  // 1) Пытаемся открыть приложение Telegram
  const tgDeep = `tg://resolve?domain=${username}&text=${encoded}`;
  // 2) Фолбек — веб Telegram
  const tgWeb  = `https://t.me/${username}?text=${encoded}`;

  let opened = false;
  try {
    // _self снижает шанс блокировки поп-апов
    const w = window.open(tgDeep, "_self");
    opened = !!w;
  } catch (_) {}

  setTimeout(() => {
    if (!opened) window.open(tgWeb, "_blank");
  }, 300);

  checkoutModal.close();
}
