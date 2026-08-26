/* ============================================================
   KRAFTOHOLICS — PUBLIC SITE LOGIC
   Loads products/reviews from Supabase. If Supabase isn't
   configured yet (see js/supabaseClient.js), the site runs in
   "demo mode" with sample data so it still looks & works great.
============================================================ */

/* ---------------- ICONS (fallback art when a product has no photo yet) ---------------- */
const ICONS = {
  catholic: `<svg viewBox="0 0 64 64" fill="none" stroke="var(--ink)" stroke-width="1.4"><ellipse cx="32" cy="25" rx="20" ry="15"/><path d="M28 39c2 4 6 4 8 0" stroke-width="1.2"/><path d="M32 40v6" stroke-width="1.2"/><circle cx="32" cy="54" r="9" stroke-width="1.3"/><path d="M32 48v12M27 54h10" stroke-width="1"/></svg>`,
  school: `<svg viewBox="0 0 64 64" fill="none" stroke="var(--ink)" stroke-width="1.4"><ellipse cx="32" cy="25" rx="20" ry="15"/><path d="M28 39c2 4 6 4 8 0" stroke-width="1.2"/><path d="M32 40v6" stroke-width="1.2"/><rect x="23" y="46" width="18" height="13" rx="2" stroke-width="1.3"/><path d="M27 52.5h10" stroke-width="1"/></svg>`,
  custom: `<svg viewBox="0 0 64 64" fill="none" stroke="var(--ink)" stroke-width="1.4"><ellipse cx="32" cy="25" rx="20" ry="15"/><path d="M28 39c2 4 6 4 8 0" stroke-width="1.2"/><path d="M32 40v5" stroke-width="1.2"/><path d="M32 59c-8-6-10-13-4-15 3-1 4 1 4 3 0-2 1-4 4-3 6 2 4 9-4 15z" stroke-width="1.2"/></svg>`,
  watercolor: `<svg viewBox="0 0 64 64" fill="none" stroke="var(--ink)" stroke-width="1.4"><rect x="10" y="9" width="44" height="46" rx="1"/><path d="M19 34c4-6 10-8 14-4 2-4 8-6 12-2-4 0-6 2-7 5 5 0 8 3 9 6-6-2-10-1-13 2-2-3-5-4-8-3 1-3 0-5-3-6-2 1-3 2-4 2z" stroke-width="1"/></svg>`
};
const CATEGORY_LABEL = { catholic:"Catholic", school:"School Spirit", custom:"Fully Custom", watercolor:"Watercolor Art" };
const BRACELET_CATS = ["catholic","school","custom"];
const ROPE_COLORS = ["Natural","Black","Navy","Blush Pink","Multi-color"];
const CHARM_OPTIONS = {
  catholic: ["As shown","Miraculous Medal","Saint Benedict Medal","Cross","Dove"],
  school: ["As shown","Initial Charm","Mascot Charm","No Charm"],
  custom: ["As shown","Miraculous Medal","Cross","Initial Charm","Heart Charm","No Charm"]
};
const BRACELET_SIZES = ["Child","Youth","Adult","Adult XL"];
const PRINT_SIZES = ["5×7 Print","8×10 Print","Notecard"];

function productMediaHTML(p){
  if(p.image_url){
    return `<img src="${p.image_url}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:cover;">`;
  }
  return ICONS[p.category] || ICONS.custom;
}
function escapeHtml(str=""){
  return str.replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
}

/* ---------------- DEMO DATA (used only when Supabase isn't configured yet) ---------------- */
const DEMO_PRODUCTS = [
  { id:"d1", name:"Miraculous Medal Bracelet", category:"catholic", price:16, image_url:null, tag:"Bestseller",
    description:"Waterproof wax rope with a Miraculous Medal charm — a First Communion favorite that holds up to everyday wear.", is_active:true },
  { id:"d2", name:"Saint Benedict Bracelet", category:"catholic", price:16, image_url:null, tag:null,
    description:"A Saint Benedict medal on waterproof wax cord, in your choice of rope color.", is_active:true },
  { id:"d3", name:"First Communion Bracelet", category:"catholic", price:18, image_url:null, tag:"New",
    description:"White and gold wax rope with a cross charm — a keepsake gift for the big day.", is_active:true },
  { id:"d4", name:"Confirmation Bracelet", category:"catholic", price:18, image_url:null, tag:null,
    description:"A dove charm on waterproof cord, made to mark a Confirmation gift that lasts.", is_active:true },
  { id:"d5", name:"School Spirit Bracelet", category:"school", price:14, image_url:null, tag:null,
    description:"Waterproof wax rope in your school colors, finished with an initial charm.", is_active:true },
  { id:"d6", name:"Team Spirit Bracelet Set", category:"school", price:40, image_url:null, tag:"Set of 5",
    description:"A set of five matching bracelets for a team, club or classroom.", is_active:true },
  { id:"d7", name:"Fully Custom Rope Bracelet", category:"custom", price:20, image_url:null, tag:null,
    description:"Choose your rope color, charm and add a name — made just for you.", is_active:true },
  { id:"d8", name:"Watercolor Saint Print", category:"watercolor", price:28, image_url:null, tag:null,
    description:"A hand-painted watercolor portrait, ready to frame as a keepsake gift.", is_active:true },
  { id:"d9", name:"Hand-Lettered Scripture Print", category:"watercolor", price:24, image_url:null, tag:null,
    description:"A favorite verse, hand-painted and hand-lettered to order.", is_active:true }
];
const DEMO_REVIEWS = [
  { id:"r1", name:"Marianne O.", rating:5, message:"The Miraculous Medal bracelet is beautiful, and it really doesn't come off in the shower!", created_at:new Date(Date.now()-12*86400000).toISOString() },
  { id:"r2", name:"Devon R.", rating:5, message:"Ordered five bracelets for my daughter's confirmation class and everyone loved the dove charm.", created_at:new Date(Date.now()-30*86400000).toISOString() },
  { id:"r3", name:"Priya S.", rating:4, message:"The watercolor saint print came out even softer and prettier in person than in the photo.", created_at:new Date(Date.now()-33*86400000).toISOString() }
];

let PRODUCTS = [];
let REVIEWS = [];

/* ---------------- LOAD DATA ---------------- */
async function loadProducts(){
  if(!IS_SUPABASE_CONFIGURED){
    PRODUCTS = DEMO_PRODUCTS;
    renderProducts();
    return;
  }
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending:false });

  if(error || !data || data.length === 0){
    console.warn("Falling back to demo products:", error);
    PRODUCTS = DEMO_PRODUCTS;
  } else {
    PRODUCTS = data;
  }
  renderProducts();
}

async function loadReviews(){
  if(!IS_SUPABASE_CONFIGURED){
    REVIEWS = DEMO_REVIEWS;
    renderReviews();
    return;
  }
  const { data, error } = await supabaseClient
    .from("reviews")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending:false })
    .limit(6);

  REVIEWS = (!error && data && data.length) ? data : DEMO_REVIEWS;
  renderReviews();
}

function timeAgo(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if(days < 1) return "Today";
  if(days === 1) return "1 day ago";
  if(days < 30) return `${days} days ago`;
  const months = Math.floor(days/30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/* ---------------- RENDER PRODUCTS ---------------- */
const productGrid = document.getElementById("productGrid");
function findProduct(id){ return PRODUCTS.find(p => String(p.id) === String(id)); }

function renderProducts(filter="all"){
  const list = PRODUCTS.filter(p => filter === "all" || p.category === filter);
  if(list.length === 0){
    productGrid.innerHTML = `<p style="color:var(--ink-soft); grid-column:1/-1;">No products in this category yet — check back soon.</p>`;
    return;
  }
  productGrid.innerHTML = "";
  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.id = p.id;
    card.innerHTML = `
      <div class="product-media">
        ${p.tag ? `<span class="product-tag">${escapeHtml(p.tag)}</span>` : ""}
        ${productMediaHTML(p)}
      </div>
      <div class="product-body">
        <h4>${escapeHtml(p.name)}</h4>
        <p>${escapeHtml(p.description || "")}</p>
        <div class="product-foot">
          <span class="price">$${Number(p.price).toFixed(2)}</span>
          <button class="add-btn" data-id="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></svg>
            Add
          </button>
        </div>
      </div>`;
    productGrid.appendChild(card);
  });
}

document.getElementById("filters").addEventListener("click", e => {
  const btn = e.target.closest(".filter-btn");
  if(!btn) return;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderProducts(btn.dataset.filter);
});

productGrid.addEventListener("click", e => {
  const btn = e.target.closest(".add-btn");
  if(btn){ addToCart(btn.dataset.id); return; }
  const card = e.target.closest(".product-card");
  if(card){ openProductPage(card.dataset.id); }
});

/* ---------------- CART (persisted to this browser via localStorage) ---------------- */
const CART_KEY = "kh_cart_v1";
let cart = [];
try{ cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch(e){ cart = []; }

function saveCart(){
  try{ localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e){ /* storage unavailable — cart just won't persist */ }
}

const cartCountEl = document.getElementById("cartCount");
const drawer = document.getElementById("cartDrawer");
const backdrop = document.getElementById("backdrop");
const drawerBody = document.getElementById("drawerBody");
const drawerFoot = document.getElementById("drawerFoot");
const subtotalEl = document.getElementById("subtotal");

function addToCart(id, qty=1){
  const existing = cart.find(i => String(i.id) === String(id));
  if(existing){ existing.qty += qty; } else { cart.push({ id, qty }); }
  saveCart();
  renderCart();
  const p = findProduct(id);
  showToast(`Added "${p ? p.name : "item"}" to cart`, "cart");
  openDrawer();
}

function renderCart(){
  const totalQty = cart.reduce((s,i)=>s+i.qty,0);
  cartCountEl.textContent = totalQty;

  if(cart.length === 0){
    drawerBody.innerHTML = `
      <div class="empty-cart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 2H2"/></svg>
        <p>Your cart is empty.<br>Add a little something from the shop.</p>
      </div>`;
    drawerFoot.style.display = "none";
    return;
  }

  drawerFoot.style.display = "block";
  drawerBody.innerHTML = "";
  let subtotal = 0;
  cart.forEach(item => {
    const p = findProduct(item.id);
    if(!p) return;
    subtotal += p.price * item.qty;
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item-media">${productMediaHTML(p)}</div>
      <div class="cart-item-info">
        <h5>${escapeHtml(p.name)}</h5>
        <div class="price">$${Number(p.price).toFixed(2)}</div>
        <div class="qty-row">
          <button class="qty-minus" data-id="${p.id}">−</button>
          <span>${item.qty}</span>
          <button class="qty-plus" data-id="${p.id}">+</button>
          <button class="remove-btn" data-id="${p.id}">Remove</button>
        </div>
      </div>`;
    drawerBody.appendChild(row);
  });
  subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
}

drawerBody.addEventListener("click", e => {
  const id = e.target.dataset.id;
  if(!id) return;
  if(e.target.classList.contains("qty-plus")){
    cart.find(i=>String(i.id)===String(id)).qty++;
  } else if(e.target.classList.contains("qty-minus")){
    const item = cart.find(i=>String(i.id)===String(id));
    item.qty--;
    if(item.qty<=0) cart = cart.filter(i=>String(i.id)!==String(id));
  } else if(e.target.classList.contains("remove-btn")){
    cart = cart.filter(i=>String(i.id)!==String(id));
  }
  saveCart();
  renderCart();
});

function openDrawer(){ drawer.classList.add("show"); backdrop.classList.add("show"); }
function closeDrawer(){ drawer.classList.remove("show"); backdrop.classList.remove("show"); }
document.getElementById("cartBtn").addEventListener("click", openDrawer);
document.getElementById("drawerClose").addEventListener("click", closeDrawer);
backdrop.addEventListener("click", () => { closeDrawer(); closeModal(); });

/* ---------------- PRODUCT DETAIL PAGE ---------------- */
const productPage = document.getElementById("productPage");
let pdCurrentId = null;
let pdQty = 1;

function openProductPage(id){
  closeDrawer(); closeModal();
  const p = findProduct(id);
  if(!p) return;
  pdCurrentId = id;
  pdQty = 1;

  document.getElementById("pdMedia").innerHTML = productMediaHTML(p);
  document.getElementById("pdCat").textContent = CATEGORY_LABEL[p.category] || p.category;
  document.getElementById("pdTitle").textContent = p.name;
  document.getElementById("pdPrice").textContent = `$${Number(p.price).toFixed(2)}`;
  document.getElementById("pdDesc").textContent = p.description || "";
  document.getElementById("pdQty").textContent = pdQty;

  const isBracelet = BRACELET_CATS.includes(p.category);
  const optionsEl = document.getElementById("pdOptions");
  if(isBracelet){
    const charmList = CHARM_OPTIONS[p.category] || CHARM_OPTIONS.custom;
    const ropeList = (p.rope_colors && p.rope_colors.length) ? p.rope_colors : ROPE_COLORS;
    const charms = (p.charms && p.charms.length) ? p.charms : charmList;
    const sizes = (p.sizes && p.sizes.length) ? p.sizes : BRACELET_SIZES;
    optionsEl.innerHTML = `
      <div class="pd-option"><label class="field-label">Rope color</label>
        <select class="field">${ropeList.map(c=>`<option>${escapeHtml(c)}</option>`).join("")}</select></div>
      <div class="pd-option"><label class="field-label">Charm</label>
        <select class="field">${charms.map(c=>`<option>${escapeHtml(c)}</option>`).join("")}</select></div>
      <div class="pd-option"><label class="field-label">Wrist size</label>
        <select class="field">${sizes.map(c=>`<option>${escapeHtml(c)}</option>`).join("")}</select></div>
      <div class="pd-option"><label class="field-label">Personalize with a name (optional)</label>
        <input class="field" maxlength="20" placeholder="e.g. Sophia"></div>`;
  } else {
    const sizes = (p.sizes && p.sizes.length) ? p.sizes : PRINT_SIZES;
    optionsEl.innerHTML = `
      <div class="pd-option"><label class="field-label">Size</label>
        <select class="field">${sizes.map(c=>`<option>${escapeHtml(c)}</option>`).join("")}</select></div>
      <div class="pd-option"><label class="field-label">Add a name or verse (optional)</label>
        <input class="field" maxlength="40" placeholder="e.g. Philippians 4:13"></div>`;
  }

  const related = PRODUCTS.filter(x => x.category===p.category && String(x.id)!==String(p.id)).slice(0,3);
  const relList = related.length ? related : PRODUCTS.filter(x => String(x.id)!==String(p.id)).slice(0,3);
  document.getElementById("pdRelated").innerHTML = relList.map(r => `
    <div class="mini-card" data-id="${r.id}">
      <div class="mini-media">${productMediaHTML(r)}</div>
      <div class="mini-body"><h5>${escapeHtml(r.name)}</h5><span class="price">$${Number(r.price).toFixed(2)}</span></div>
    </div>`).join("");

  productPage.classList.add("show");
  productPage.scrollTop = 0;
  document.body.style.overflow = "hidden";
}
function closeProductPage(){ productPage.classList.remove("show"); document.body.style.overflow = ""; }

document.getElementById("pdBack").addEventListener("click", e => { e.preventDefault(); closeProductPage(); });
document.getElementById("pdClose").addEventListener("click", closeProductPage);
document.getElementById("pdQtyPlus").addEventListener("click", () => { pdQty++; document.getElementById("pdQty").textContent = pdQty; });
document.getElementById("pdQtyMinus").addEventListener("click", () => { if(pdQty>1) pdQty--; document.getElementById("pdQty").textContent = pdQty; });
document.getElementById("pdAddBtn").addEventListener("click", () => { addToCart(pdCurrentId, pdQty); closeProductPage(); });
document.getElementById("pdRelated").addEventListener("click", e => {
  const card = e.target.closest(".mini-card");
  if(card) openProductPage(card.dataset.id);
});

/* ---------------- ACCOUNT PAGE (placeholder — cart already persists per-browser) ---------------- */
const accountPage = document.getElementById("accountPage");
let acctMode = "signup";
function openAccountPage(){ closeDrawer(); closeModal(); accountPage.classList.add("show"); accountPage.scrollTop = 0; document.body.style.overflow = "hidden"; }
function closeAccountPage(){ accountPage.classList.remove("show"); document.body.style.overflow = ""; }
function setAcctMode(mode){
  acctMode = mode;
  const isSignup = mode === "signup";
  document.getElementById("tabSignup").classList.toggle("active", isSignup);
  document.getElementById("tabLogin").classList.toggle("active", !isSignup);
  document.getElementById("signupOnlyName").style.display = isSignup ? "block" : "none";
  document.getElementById("signupOnlyConfirm").style.display = isSignup ? "block" : "none";
  document.getElementById("acctSubmitBtn").textContent = isSignup ? "Create Account" : "Log In";
}
document.getElementById("accountNavBtn").addEventListener("click", openAccountPage);
document.getElementById("footAccountLink").addEventListener("click", e => { e.preventDefault(); openAccountPage(); });
document.getElementById("acctBack").addEventListener("click", e => { e.preventDefault(); closeAccountPage(); });
document.getElementById("acctClose").addEventListener("click", closeAccountPage);
document.getElementById("tabSignup").addEventListener("click", () => setAcctMode("signup"));
document.getElementById("tabLogin").addEventListener("click", () => setAcctMode("login"));
document.getElementById("accountForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("acctName").value.trim();
  e.target.reset();
  setAcctMode(acctMode);
  closeAccountPage();
  showToast(acctMode === "signup" ? `Welcome${name ? ", " + name : ""}! (placeholder account)` : "Logged in — placeholder only", "check");
});

/* ---------------- CHECKOUT MODAL ---------------- */
const modal = document.getElementById("checkoutModal");
const dots = [document.getElementById("dot1"), document.getElementById("dot2"), document.getElementById("dot3")];
const steps = [document.getElementById("step1"), document.getElementById("step2"), document.getElementById("step3")];

function goToStep(n){
  steps.forEach((s,i)=> s.classList.toggle("active", i===n));
  dots.forEach((d,i)=>{ d.classList.toggle("active", i===n); d.classList.toggle("done", i<n); });
}
function openModal(){
  if(cart.length===0){ showToast("Your cart is empty — add something first", "info"); return; }
  const modalCartList = document.getElementById("modalCartList");
  modalCartList.innerHTML = "";
  let subtotal = 0;
  cart.forEach(item=>{
    const p = findProduct(item.id);
    if(!p) return;
    subtotal += p.price*item.qty;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;font-size:14px;padding:6px 0;color:var(--ink-soft);";
    row.innerHTML = `<span>${escapeHtml(p.name)} × ${item.qty}</span><span>$${(p.price*item.qty).toFixed(2)}</span>`;
    modalCartList.appendChild(row);
  });
  document.getElementById("modalSubtotal").textContent = `$${subtotal.toFixed(2)}`;
  goToStep(0);
  modal.classList.add("show");
  backdrop.classList.add("show");
}
function closeModal(){ modal.classList.remove("show"); backdrop.classList.remove("show"); }

document.getElementById("checkoutBtn").addEventListener("click", () => { closeDrawer(); openModal(); });
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("toStep2").addEventListener("click", () => goToStep(1));

document.getElementById("detailsForm").addEventListener("submit", async e => {
  e.preventDefault();
  const inputs = e.target.querySelectorAll("input");
  const [firstName, lastName, email, address, city, zip] = [...inputs].map(i => i.value.trim());
  const subtotal = cart.reduce((s,i) => { const p = findProduct(i.id); return p ? s + p.price*i.qty : s; }, 0);

  let orderLabel = "KH-" + Math.floor(1000 + Math.random()*9000);

  if(IS_SUPABASE_CONFIGURED){
    const { data: order, error: orderErr } = await supabaseClient
      .from("orders")
      .insert({ customer_name:`${firstName} ${lastName}`.trim(), email, address, city, zip, subtotal })
      .select()
      .single();

    if(!orderErr && order){
      orderLabel = "KH-" + order.id.slice(0,8).toUpperCase();
      const items = cart.map(i => {
        const p = findProduct(i.id);
        return { order_id: order.id, product_id: typeof p.id === "string" && p.id.startsWith("d") ? null : p.id, product_name: p.name, unit_price: p.price, qty: i.qty };
      });
      await supabaseClient.from("order_items").insert(items);
    }
  }

  goToStep(2);
  document.getElementById("orderNo").textContent = "#" + orderLabel;
  document.getElementById("orderModeNote").textContent = IS_SUPABASE_CONFIGURED
    ? "Your order has been recorded — no real payment was processed in this template."
    : "Demo mode — this order wasn't saved anywhere. Connect Supabase to start receiving real orders.";
  cart = [];
  saveCart();
  renderCart();
  e.target.reset();
});
document.getElementById("closeConfirm").addEventListener("click", closeModal);

/* ---------------- REVIEWS ---------------- */
const reviewsGrid = document.getElementById("reviewsGrid");
function starSVG(){ return `<svg viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 1-5.2 5 1.2 7-6-3.4-6 3.4 1.2-7L2 9.5l7-1z"/></svg>`; }
function renderReviews(){
  reviewsGrid.innerHTML = "";
  REVIEWS.slice(0,6).forEach(r => {
    const card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML = `
      <div class="stars">${starSVG().repeat(r.rating)}</div>
      <p class="quote">"${escapeHtml(r.message)}"</p>
      <div class="review-meta"><span class="who">${escapeHtml(r.name)}</span><span>${timeAgo(r.created_at)}</span></div>`;
    reviewsGrid.appendChild(card);
  });
}

let selectedRating = 0;
const starPicker = document.getElementById("starPicker");
starPicker.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if(!btn) return;
  selectedRating = Number(btn.dataset.val);
  [...starPicker.children].forEach(b => b.classList.toggle("active", Number(b.dataset.val) <= selectedRating));
});

document.getElementById("reviewForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("revName").value.trim();
  const message = document.getElementById("revMsg").value.trim();
  if(!selectedRating){ showToast("Pick a star rating first", "info"); return; }

  const newReview = { id:"local-"+Date.now(), name, rating:selectedRating, message, created_at:new Date().toISOString() };

  if(IS_SUPABASE_CONFIGURED){
    const { error } = await supabaseClient.from("reviews").insert({ name, rating:selectedRating, message });
    if(error) showToast("Couldn't post review — try again later", "info");
  }
  REVIEWS.unshift(newReview);
  renderReviews();
  e.target.reset();
  selectedRating = 0;
  [...starPicker.children].forEach(b => b.classList.remove("active"));
  showToast("Thanks for the review!", "check");
});

/* ---------------- CONTACT / NEWSLETTER ---------------- */
document.getElementById("contactForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("cName").value.trim();
  const email = document.getElementById("cEmail").value.trim();
  const message = document.getElementById("cMsg").value.trim();
  if(IS_SUPABASE_CONFIGURED){
    await supabaseClient.from("messages").insert({ name, email, message, source:"contact_form" });
  }
  e.target.reset();
  showToast("Message sent — we'll reply within a day", "check");
});

document.getElementById("newsForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("newsEmail").value.trim();
  if(IS_SUPABASE_CONFIGURED){
    await supabaseClient.from("newsletter_signups").insert({ email });
  }
  e.target.reset();
  showToast("Subscribed! Welcome to the shop", "check");
});

/* ---------------- CHAT WIDGET ---------------- */
const chatPanel = document.getElementById("chatPanel");
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");
let chatSeeded = false;
function seedChat(){
  if(chatSeeded) return;
  chatSeeded = true;
  addMsg("owner", "Hi there! \uD83D\uDC4B Thanks for stopping by Kraftoholics — anything I can help you find?");
}
function addMsg(who, text){
  const el = document.createElement("div");
  el.className = `msg ${who}`;
  el.textContent = text;
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function addTyping(){
  const el = document.createElement("div");
  el.className = "msg owner typing";
  el.id = "typingIndicator";
  el.innerHTML = "<span></span><span></span><span></span>";
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function removeTyping(){ const el = document.getElementById("typingIndicator"); if(el) el.remove(); }
function toggleChat(force){
  const show = force !== undefined ? force : !chatPanel.classList.contains("show");
  chatPanel.classList.toggle("show", show);
  if(show) seedChat();
}
document.getElementById("chatBubble").addEventListener("click", () => toggleChat());
document.getElementById("chatNavBtn").addEventListener("click", () => toggleChat(true));

const REPLIES = [
  "Thanks for the message! I'll get back to you within a day \uD83D\uDC9B",
  "Good question — let me check my supplies and I'll follow up shortly!",
  "That's so sweet of you to say, thank you!",
  "Yes, custom orders are absolutely doable — just tell me what you have in mind."
];
async function sendChat(){
  const text = chatInput.value.trim();
  if(!text) return;
  addMsg("customer", text);
  chatInput.value = "";
  if(IS_SUPABASE_CONFIGURED){
    await supabaseClient.from("messages").insert({ message:text, source:"chat_widget" });
  }
  addTyping();
  setTimeout(() => {
    removeTyping();
    addMsg("owner", REPLIES[Math.floor(Math.random()*REPLIES.length)]);
  }, 1100 + Math.random()*700);
}
document.getElementById("chatSend").addEventListener("click", sendChat);
chatInput.addEventListener("keydown", e => { if(e.key === "Enter") sendChat(); });

/* ---------------- TOAST ---------------- */
const toastEl = document.getElementById("toast");
const TOAST_ICONS = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 2H2"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M12 8v.01M12 11v5"/></svg>`
};
let toastTimer;
function showToast(msg, icon="check"){
  clearTimeout(toastTimer);
  toastEl.innerHTML = `${TOAST_ICONS[icon] || ""}<span>${msg}</span>`;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
}

/* ---------------- NAV / MISC ---------------- */
const navLinks = document.getElementById("navLinks");
document.getElementById("hamburgerBtn").addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));
document.getElementById("year").textContent = new Date().getFullYear();

const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
}, { threshold:0.12 });
revealEls.forEach(el => io.observe(el));

/* ---------------- DEMO BANNER ---------------- */
if(!IS_SUPABASE_CONFIGURED){
  const banner = document.getElementById("demoBanner");
  if(banner) banner.style.display = "block";
}

/* ---------------- INIT ---------------- */
renderCart();
loadProducts();
loadReviews();
