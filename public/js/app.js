const API_BASE = '/api';

function money(n){ return 'Rs. ' + Number(n || 0).toLocaleString('en-IN'); }
function escapeHtml(str){ return String(str ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function getToken(){ return localStorage.getItem('authToken') || ''; }
function getCurrentUser(){ try{return JSON.parse(localStorage.getItem('currentUser') || 'null')}catch{return null} }
function setSession(token,user){ localStorage.setItem('authToken',token); localStorage.setItem('currentUser',JSON.stringify(user)); }
function isLoggedIn(){ return !!getToken() && !!getCurrentUser(); }
function isAdmin(){ return getCurrentUser()?.role === 'admin'; }
async function api(path, options={}){
  const headers = {'Content-Type':'application/json', ...(options.headers||{})};
  if(getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(API_BASE + path, {...options, headers});
  let data = {};
  try{ data = await res.json(); }catch{}
  if(!res.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

function getCart(){ try{return JSON.parse(localStorage.getItem('cart') || '[]')}catch{return []} }
function saveCart(cart){ localStorage.setItem('cart',JSON.stringify(cart)); updateCartBadge(); }
function updateCartBadge(){ const badge=document.getElementById('cart-count'); if(badge) badge.textContent=getCart().reduce((s,i)=>s+Number(i.quantity||0),0); }

async function addToCart(id){
  if(isAdmin()){ showToast('Admins cannot purchase products.'); return; }
  try{
    const p = await api('/products/'+encodeURIComponent(id));
    const cart=getCart(); const existing=cart.find(i=>String(i.productId)===String(p._id));
    if(existing) existing.quantity++; else cart.push({productId:p._id,quantity:1,name:p.name,price:p.price,image:p.image});
    saveCart(cart); showToast(`${p.name} added to cart`);
  }catch(e){ showToast(e.message); }
}
function logout(){ localStorage.removeItem('authToken'); localStorage.removeItem('currentUser'); localStorage.removeItem('cart'); window.location.href='index.html'; }
function showToast(message){ const t=document.createElement('div'); t.textContent=message; t.style.cssText='position:fixed;right:20px;bottom:20px;background:#222;color:#fff;padding:12px 18px;border-radius:5px;z-index:3000;box-shadow:0 3px 15px rgba(0,0,0,.25)'; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }

function renderHeader(){
  const user=getCurrentUser();
  const dashboardLink=document.getElementById('dashboard-link');
  const adminLink=document.getElementById('admin-link');
  const auth=document.getElementById('auth-area');
  if(dashboardLink) dashboardLink.style.display=user?'':'none';
  if(adminLink) adminLink.style.display=isAdmin()?'':'none';
  if(auth) auth.innerHTML=user ? `<span class="user-chip">Hi, ${escapeHtml(user.name.split(' ')[0])}</span><button class="nav-link-btn" onclick="logout()">Logout</button>` : `<a href="login.html">Login</a> <a href="signup.html" style="margin-left:8px">Sign Up</a>`;
  updateCartBadge();
}

async function renderProductGrid(containerId, limit=null){
  const container=document.getElementById(containerId); if(!container)return;
  try{
    const search=document.getElementById('product-search')?.value?.trim() || '';
    const cat=new URLSearchParams(location.search).get('category') || '';
    const qs=new URLSearchParams(); if(search)qs.set('search',search); if(cat)qs.set('category',cat);
    let products=await api('/products'+(qs.toString()?'?'+qs:'') ); if(limit)products=products.slice(0,limit);
    if(!products.length){container.innerHTML='<div class="empty" style="grid-column:1/-1">No products found.</div>';return;}
    container.innerHTML=products.map(p=>`<article class="product-card"><div class="product-img-wrap"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="product-img"><span class="discount-badge">-${p.discount||0}%</span></div><div class="product-info"><span class="product-category">${escapeHtml(p.category)}</span><h3 class="product-title">${escapeHtml(p.name)}</h3><div class="product-price">${money(p.price)} <span class="old-price">${p.discount?money(Math.round(p.price/(1-p.discount/100))):''}</span></div><small style="color:#777">Stock: ${p.stock}</small><div class="product-actions"><a href="product.html?id=${p._id}" class="btn btn-outline">View</a>${isAdmin()?'':`<button onclick="addToCart('${p._id}')" class="btn btn-primary" ${p.stock<1?'disabled':''}>${p.stock<1?'Out of Stock':'Add to Cart'}</button>`}</div></div></article>`).join('');
  }catch(e){ container.innerHTML=`<div class="empty" style="grid-column:1/-1">${escapeHtml(e.message)}</div>`; }
}
function searchProducts(){ renderProductGrid(location.pathname.endsWith('index.html')||location.pathname.endsWith('/')?'featured-products':'all-products', location.pathname.endsWith('index.html')||location.pathname.endsWith('/')?8:null); }
async function protectPage(){
  const page=location.pathname.split('/').pop();
  if(page==='admin.html' && !isAdmin()){ alert('Admin access only.'); location.href='login.html'; return false; }
  if((page==='dashboard.html'||page==='checkout.html') && !isLoggedIn()){ alert('Please log in first.'); location.href='login.html'; return false; }
  if((page==='cart.html'||page==='checkout.html') && isAdmin()){ alert('Administrators cannot purchase products.'); location.href='admin.html'; return false; }
  return true;
}

document.addEventListener('DOMContentLoaded',()=>{ protectPage(); renderHeader(); updateCartBadge(); });
