/* ============================================================
   KRAFTOHOLICS — ADMIN DASHBOARD
============================================================ */

const CATEGORY_LABEL = { catholic:"Catholic", school:"School Spirit", custom:"Fully Custom", watercolor:"Watercolor Art" };
const SOURCE_LABEL = { contact_form:"Contact form", chat_widget:"Chat widget" };

function escapeHtml(str=""){
  return String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
}
function fmtDate(iso){
  return new Date(iso).toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
}
function starRow(n){
  const svg = `<svg viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 1-5.2 5 1.2 7-6-3.4-6 3.4 1.2-7L2 9.5l7-1z"/></svg>`;
  return `<span class="review-stars-inline">${svg.repeat(n)}</span>`;
}

/* ---------------- CONFIG CHECK ---------------- */
if(!IS_SUPABASE_CONFIGURED){
  document.getElementById("configWarningWrap").style.display = "block";
  document.getElementById("loginForm").querySelector("button").disabled = true;
}

/* ---------------- TOAST ---------------- */
const toastEl = document.getElementById("toast");
let toastTimer;
function showToast(msg, isError=false){
  clearTimeout(toastTimer);
  toastEl.style.background = isError ? "#9A3B2A" : "var(--ink)";
  toastEl.innerHTML = `<span>${msg}</span>`;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
}

/* ---------------- AUTH ---------------- */
const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const headerActions = document.getElementById("headerActions");
let currentUser = null;

async function checkSession(){
  if(!IS_SUPABASE_CONFIGURED) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(session){ await handleLogin(session.user); }
}

async function handleLogin(user){
  const { data: profile, error } = await supabaseClient
    .from("profiles").select("is_admin, email").eq("id", user.id).single();

  if(error || !profile || !profile.is_admin){
    document.getElementById("loginError").textContent = "This account isn't set up as an admin yet. Ask the site owner to grant access.";
    document.getElementById("loginError").classList.add("show");
    await supabaseClient.auth.signOut();
    return;
  }

  currentUser = user;
  loginScreen.style.display = "none";
  dashboard.style.display = "block";
  headerActions.style.display = "flex";
  document.getElementById("adminUserEmail").textContent = profile.email || user.email;
  loadEverything();
}

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPass").value;
  const errEl = document.getElementById("loginError");
  errEl.classList.remove("show");

  const btn = document.getElementById("loginSubmitBtn");
  btn.disabled = true; btn.textContent = "Signing in…";

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  btn.disabled = false; btn.textContent = "Log In";

  if(error){
    errEl.textContent = error.message || "Couldn't sign in — check your email and password.";
    errEl.classList.add("show");
    return;
  }
  await handleLogin(data.user);
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  dashboard.style.display = "none";
  headerActions.style.display = "none";
  loginScreen.style.display = "flex";
});

/* ---------------- TABS ---------------- */
document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.panel).classList.add("active");
  });
});

function loadEverything(){
  loadProducts();
  loadOrders();
  loadMessages();
  loadReviews();
  loadNewsletter();
}

/* ============================================================
   PRODUCTS
============================================================ */
let productsCache = [];

async function loadProducts(){
  const { data, error } = await supabaseClient.from("products").select("*").order("created_at", { ascending:false });
  if(error){ showToast("Couldn't load products", true); return; }
  productsCache = data || [];
  document.getElementById("statProducts").textContent = productsCache.length;
  renderProductsTable();
}

function renderProductsTable(){
  const tbody = document.getElementById("productsTbody");
  const empty = document.getElementById("productsEmpty");
  if(productsCache.length === 0){ tbody.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";

  tbody.innerHTML = productsCache.map(p => `
    <tr>
      <td>
        <div class="row-name">
          ${p.image_url
            ? `<img class="thumb" src="${p.image_url}" alt="">`
            : `<div class="thumb-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="1.3"><circle cx="12" cy="12" r="9"/></svg></div>`}
          ${escapeHtml(p.name)}
        </div>
      </td>
      <td>${CATEGORY_LABEL[p.category] || p.category}</td>
      <td>$${Number(p.price).toFixed(2)}</td>
      <td><span class="pill ${p.is_active ? "active" : "inactive"}">${p.is_active ? "Active" : "Hidden"}</span></td>
      <td>
        <div class="row-actions">
          <button data-action="edit" data-id="${p.id}">Edit</button>
          <button data-action="toggle" data-id="${p.id}">${p.is_active ? "Hide" : "Show"}</button>
          <button data-action="delete" data-id="${p.id}" class="danger">Delete</button>
        </div>
      </td>
    </tr>`).join("");
}

document.getElementById("productsTbody").addEventListener("click", async e => {
  const btn = e.target.closest("button[data-action]");
  if(!btn) return;
  const id = btn.dataset.id;
  const product = productsCache.find(p => p.id === id);
  if(!product) return;

  if(btn.dataset.action === "edit"){
    openProductForm(product);
  } else if(btn.dataset.action === "toggle"){
    const { error } = await supabaseClient.from("products").update({ is_active: !product.is_active }).eq("id", id);
    if(error){ showToast("Couldn't update product", true); return; }
    showToast(product.is_active ? "Product hidden from shop" : "Product is now visible");
    loadProducts();
  } else if(btn.dataset.action === "delete"){
    if(!confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if(error){ showToast("Couldn't delete product", true); return; }
    showToast("Product deleted");
    loadProducts();
  }
});

const productForm = document.getElementById("productForm");
const pfImagePreview = document.getElementById("pfImagePreview");
const pfImageFile = document.getElementById("pfImageFile");
let pfExistingImageUrl = null;

function openProductForm(product=null){
  productForm.classList.add("show");
  document.getElementById("productFormTitle").textContent = product ? "Edit product" : "Add a new product";
  document.getElementById("pfId").value = product ? product.id : "";
  document.getElementById("pfName").value = product ? product.name : "";
  document.getElementById("pfDesc").value = product ? product.description || "" : "";
  document.getElementById("pfPrice").value = product ? product.price : "";
  document.getElementById("pfCategory").value = product ? product.category : "catholic";
  document.getElementById("pfTag").value = product ? (product.tag || "") : "";
  document.getElementById("pfActive").value = product ? String(product.is_active) : "true";
  document.getElementById("pfRope").value = product && product.rope_colors ? product.rope_colors.join(", ") : "";
  document.getElementById("pfCharms").value = product && product.charms ? product.charms.join(", ") : "";
  document.getElementById("pfSizes").value = product && product.sizes ? product.sizes.join(", ") : "";
  pfExistingImageUrl = product ? product.image_url : null;
  pfImageFile.value = "";
  pfImagePreview.innerHTML = pfExistingImageUrl
    ? `<img src="${pfExistingImageUrl}" alt="">`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="1.3"><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-4 4-3-3-5 5"/></svg>`;
  productForm.scrollIntoView({ behavior:"smooth", block:"start" });
}
function closeProductForm(){
  productForm.classList.remove("show");
  productForm.reset();
}
document.getElementById("addProductBtn").addEventListener("click", () => openProductForm(null));
document.getElementById("pfCancelBtn").addEventListener("click", closeProductForm);

pfImageFile.addEventListener("change", () => {
  const file = pfImageFile.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => { pfImagePreview.innerHTML = `<img src="${ev.target.result}" alt="">`; };
  reader.readAsDataURL(file);
});

async function uploadProductImage(file){
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await supabaseClient.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, { upsert:false });
  if(error) throw error;
  const { data } = supabaseClient.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function splitList(str){
  return str.split(",").map(s => s.trim()).filter(Boolean);
}

productForm.addEventListener("submit", async e => {
  e.preventDefault();
  const saveBtn = document.getElementById("pfSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";

  try{
    let imageUrl = pfExistingImageUrl;
    const file = pfImageFile.files[0];
    if(file){
      document.getElementById("pfUploadProgress").classList.add("show");
      imageUrl = await uploadProductImage(file);
      document.getElementById("pfUploadProgress").classList.remove("show");
    }

    const payload = {
      name: document.getElementById("pfName").value.trim(),
      description: document.getElementById("pfDesc").value.trim(),
      price: parseFloat(document.getElementById("pfPrice").value) || 0,
      category: document.getElementById("pfCategory").value,
      tag: document.getElementById("pfTag").value.trim() || null,
      is_active: document.getElementById("pfActive").value === "true",
      rope_colors: splitList(document.getElementById("pfRope").value),
      charms: splitList(document.getElementById("pfCharms").value),
      sizes: splitList(document.getElementById("pfSizes").value),
      image_url: imageUrl
    };

    const id = document.getElementById("pfId").value;
    const { error } = id
      ? await supabaseClient.from("products").update(payload).eq("id", id)
      : await supabaseClient.from("products").insert(payload);

    if(error) throw error;

    showToast(id ? "Product updated" : "Product added");
    closeProductForm();
    loadProducts();
  } catch(err){
    console.error(err);
    showToast("Couldn't save product — " + (err.message || "try again"), true);
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = "Save Product";
  }
});

/* ============================================================
   ORDERS
============================================================ */
async function loadOrders(){
  const { data, error } = await supabaseClient
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending:false });
  if(error){ showToast("Couldn't load orders", true); return; }

  document.getElementById("statOrders").textContent = data.length;
  const tbody = document.getElementById("ordersTbody");
  const empty = document.getElementById("ordersEmpty");
  if(data.length === 0){ tbody.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";

  tbody.innerHTML = data.map(o => {
    const items = (o.order_items || []).map(i => `${escapeHtml(i.product_name)} × ${i.qty}`).join("<br>");
    return `
      <tr>
        <td>${fmtDate(o.created_at)}</td>
        <td>${escapeHtml(o.customer_name)}<br><span style="color:var(--ink-soft); font-size:12px;">${escapeHtml(o.email)}</span></td>
        <td>${items || "—"}</td>
        <td>$${Number(o.subtotal).toFixed(2)}</td>
        <td>
          <select class="status-select" data-id="${o.id}">
            ${["placed","shipped","completed","cancelled"].map(s => `<option value="${s}" ${o.status===s?"selected":""}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}
          </select>
        </td>
      </tr>`;
  }).join("");
}

document.getElementById("ordersTbody").addEventListener("change", async e => {
  if(!e.target.classList.contains("status-select")) return;
  const { error } = await supabaseClient.from("orders").update({ status: e.target.value }).eq("id", e.target.dataset.id);
  showToast(error ? "Couldn't update order" : "Order status updated", !!error);
});

/* ============================================================
   MESSAGES
============================================================ */
async function loadMessages(){
  const { data, error } = await supabaseClient.from("messages").select("*").order("created_at", { ascending:false });
  if(error){ showToast("Couldn't load messages", true); return; }

  const unread = data.filter(m => !m.is_read).length;
  document.getElementById("statUnread").textContent = unread;
  document.getElementById("msgTabCount").textContent = unread;

  const tbody = document.getElementById("messagesTbody");
  const empty = document.getElementById("messagesEmpty");
  if(data.length === 0){ tbody.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";

  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${fmtDate(m.created_at)}</td>
      <td>${escapeHtml(m.name || "Chat visitor")}${m.email ? `<br><span style="color:var(--ink-soft); font-size:12px;">${escapeHtml(m.email)}</span>` : ""}</td>
      <td>${SOURCE_LABEL[m.source] || m.source}</td>
      <td style="white-space:normal; max-width:260px;">
        ${escapeHtml(m.message)}
        ${m.reply ? `<div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--line); color:var(--ink-soft); font-size:12px;"><strong>Your reply:</strong> ${escapeHtml(m.reply)}</div>` : `
        <div class="reply-box">
          <input class="field" placeholder="Write a reply (saved here, not emailed)" data-reply-for="${m.id}">
          <button class="btn ghost small" data-save-reply="${m.id}">Save</button>
        </div>`}
      </td>
      <td><span class="pill ${m.is_read ? "read" : "unread"}">${m.is_read ? "Read" : "Unread"}</span></td>
      <td>${!m.is_read ? `<div class="row-actions"><button data-mark-read="${m.id}">Mark Read</button></div>` : ""}</td>
    </tr>`).join("");
}

document.getElementById("messagesTbody").addEventListener("click", async e => {
  const readBtn = e.target.closest("[data-mark-read]");
  if(readBtn){
    await supabaseClient.from("messages").update({ is_read:true }).eq("id", readBtn.dataset.markRead);
    loadMessages();
    return;
  }
  const replyBtn = e.target.closest("[data-save-reply]");
  if(replyBtn){
    const id = replyBtn.dataset.saveReply;
    const input = document.querySelector(`[data-reply-for="${id}"]`);
    const reply = input.value.trim();
    if(!reply) return;
    const { error } = await supabaseClient.from("messages").update({ reply, replied_at:new Date().toISOString(), is_read:true }).eq("id", id);
    showToast(error ? "Couldn't save reply" : "Reply saved (not emailed — see README for adding real email replies)", !!error);
    loadMessages();
  }
});

/* ============================================================
   REVIEWS
============================================================ */
async function loadReviews(){
  const { data, error } = await supabaseClient.from("reviews").select("*").order("created_at", { ascending:false });
  if(error){ showToast("Couldn't load reviews", true); return; }

  document.getElementById("statReviews").textContent = data.length;
  const tbody = document.getElementById("reviewsTbody");
  const empty = document.getElementById("reviewsEmpty");
  if(data.length === 0){ tbody.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${fmtDate(r.created_at)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${starRow(r.rating)}</td>
      <td style="white-space:normal; max-width:280px;">${escapeHtml(r.message)}</td>
      <td><span class="pill ${r.approved ? "active" : "inactive"}">${r.approved ? "Shown" : "Hidden"}</span></td>
      <td>
        <div class="row-actions">
          <button data-toggle-review="${r.id}" data-approved="${r.approved}">${r.approved ? "Hide" : "Show"}</button>
          <button data-delete-review="${r.id}" class="danger">Delete</button>
        </div>
      </td>
    </tr>`).join("");
}

document.getElementById("reviewsTbody").addEventListener("click", async e => {
  const toggleBtn = e.target.closest("[data-toggle-review]");
  if(toggleBtn){
    const approved = toggleBtn.dataset.approved === "true";
    await supabaseClient.from("reviews").update({ approved: !approved }).eq("id", toggleBtn.dataset.toggleReview);
    loadReviews();
    return;
  }
  const delBtn = e.target.closest("[data-delete-review]");
  if(delBtn){
    if(!confirm("Delete this review?")) return;
    await supabaseClient.from("reviews").delete().eq("id", delBtn.dataset.deleteReview);
    showToast("Review deleted");
    loadReviews();
  }
});

/* ============================================================
   NEWSLETTER
============================================================ */
let newsletterCache = [];
async function loadNewsletter(){
  const { data, error } = await supabaseClient.from("newsletter_signups").select("*").order("created_at", { ascending:false });
  if(error){ showToast("Couldn't load subscribers", true); return; }
  newsletterCache = data || [];

  const tbody = document.getElementById("newsletterTbody");
  const empty = document.getElementById("newsletterEmpty");
  if(newsletterCache.length === 0){ tbody.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";
  tbody.innerHTML = newsletterCache.map(n => `<tr><td>${fmtDate(n.created_at)}</td><td>${escapeHtml(n.email)}</td></tr>`).join("");
}

document.getElementById("copyEmailsBtn").addEventListener("click", async () => {
  if(newsletterCache.length === 0){ showToast("No subscribers yet", true); return; }
  const emails = newsletterCache.map(n => n.email).join("\n");
  try{
    await navigator.clipboard.writeText(emails);
    showToast(`Copied ${newsletterCache.length} email${newsletterCache.length===1?"":"s"}`);
  } catch(e){
    showToast("Couldn't copy — select and copy manually", true);
  }
});

/* ---------------- INIT ---------------- */
checkSession();
