/* app.js — updated for robust profile nav and safer rendering guards
   - only renders profile UI when profile elements exist on the current page
   - profile nav always points to profile.html
   - avoids showing profile panels on pages that don't have those panels
   - preserves all other features (auth, complaints, admin, map, etc.)
*/

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from((r||document).querySelectorAll(s));
const uid = () => 'id_' + Math.random().toString(36).slice(2,9);
const nowISO = () => new Date().toISOString();
const toast = (msg, ok=false) => {
  let box = document.getElementById('toastBox');
  if(!box){
    box = document.createElement('div');
    box.id = 'toastBox';
    box.className = 'message-box';
    document.body.appendChild(box);
  }
  box.textContent = msg;
  box.className = 'message-box ' + (ok ? 'success' : '');
  box.style.display = 'block';
  setTimeout(()=> box.style.display='none', 2200);
};

// storage keys
const USERS_KEY = 'scs_users_v4';
const COMPLAINTS_KEY = 'scs_complaints_v4';
const AUTH_KEY = 'scs_auth_v4';
const COMMENTS_KEY = 'scs_comments_v4';

// seed demo data (only if missing)
function seed(){
  if(!localStorage.getItem(USERS_KEY)){
    const admin = { id:'u_admin', username:'admin', password:'admin', email:'admin@example.com', mobile:'+91-0000000000', role:'ADMIN', createdAt: nowISO(), bio:'Administrator', settings:{notifyEmail:true,notifyInApp:true}, notifications:[] };
    const raj = { id:'u_raj', username:'raj', password:'1234512345', email:'raj@example.com', mobile:'+91-9999988888', role:'USER', createdAt: nowISO(), bio:'Student', settings:{notifyEmail:true,notifyInApp:true}, notifications:[] };
    localStorage.setItem(USERS_KEY, JSON.stringify([admin, raj]));
  }
  if(!localStorage.getItem(COMPLAINTS_KEY)){
    const now = nowISO();
    const demo = [{ id:uid(), title:'Demo pothole', description:'Demo pothole near gate', category:'pothole', locationText:'Gate 2', lat:28.7045, lng:77.1030, status:'Reported', upvotes:0, createdAt:now, createdBy:'raj', photos:[], comments:[], history:[{status:'Reported',by:'raj',at:now}] }];
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(demo));
  }
  if(!localStorage.getItem(COMMENTS_KEY)){
    localStorage.setItem(COMMENTS_KEY, JSON.stringify([]));
  }
}
seed();

// storage helpers
const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
const saveUsers = u => localStorage.setItem(USERS_KEY, JSON.stringify(u));
const getComplaints = () => JSON.parse(localStorage.getItem(COMPLAINTS_KEY) || '[]');
const saveComplaints = c => localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(c));
const setAuth = a => { if(a) localStorage.setItem(AUTH_KEY, JSON.stringify(a)); else localStorage.removeItem(AUTH_KEY); };
const getAuth = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; } };
const getComments = () => JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
const saveComments = c => localStorage.setItem(COMMENTS_KEY, JSON.stringify(c));

// ---------- Navigation & routing ----------
function updateNav(){
  const a = getAuth();
  // include nav-profile in toggling
  $$('.nav-login, .nav-register, .nav-home, .nav-complaints, .nav-admin, .nav-profile, .nav-logout').forEach(el => el.classList.add('hidden'));
  const ui = $('#userInfo');

  if(!a){
    $$('.nav-login, .nav-register').forEach(el => el.classList.remove('hidden'));
    if(ui) ui.classList.add('hidden');
    return;
  }

  if(ui){
    ui.textContent = a.username;
    ui.classList.remove('hidden');
  }

  if(a.role === 'ADMIN'){
    $$('.nav-admin, .nav-complaints, .nav-logout').forEach(el => el.classList.remove('hidden'));
    $$('.nav-home, .nav-profile').forEach(el => el.classList.add('hidden'));
  } else {
    $$('.nav-home, .nav-complaints, .nav-logout, .nav-profile').forEach(el => el.classList.remove('hidden'));
    $$('.nav-admin').forEach(el => el.classList.add('hidden'));
  }
}

// replace nodes + bind to avoid double handlers
function wireNavRouting(){
  function replaceAndBind(selector, handler){
    const els = $$(selector);
    els.forEach(orig => {
      const clone = orig.cloneNode(true);
      orig.parentNode.replaceChild(clone, orig);
      clone.addEventListener('click', handler);
    });
  }

  replaceAndBind('.nav-home', (e) => {
    e.preventDefault();
    const a = getAuth();
    if(a && a.role === 'ADMIN') window.location.href = 'admin.html';
    else window.location.href = 'home.html';
  });

  replaceAndBind('.nav-admin', (e) => { e.preventDefault(); window.location.href = 'admin.html'; });
  replaceAndBind('.nav-complaints', (e) => { e.preventDefault(); window.location.href = 'complaints.html'; });
  replaceAndBind('.nav-login', (e) => { e.preventDefault(); window.location.href = 'index.html'; });
  replaceAndBind('.nav-register', (e) => { e.preventDefault(); window.location.href = 'register.html'; });

  // profile always navigates to profile.html
  replaceAndBind('.nav-profile', (e) => { e.preventDefault(); window.location.href = 'profile.html'; });

  replaceAndBind('.nav-logout', (e) => {
    e.preventDefault();
    setAuth(null);
    updateNav();
    toast('Logged out');
    setTimeout(()=> window.location.href = 'index.html', 300);
  });
}

// ---------- AUTH ----------
const registerForm = $('#registerForm');
if(registerForm){
  registerForm.addEventListener('submit', e=>{
    e.preventDefault();
    const username = $('#regUsername').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value.trim();
    if(!username || !email || !password){ toast('Fill all fields'); return; }
    const users = getUsers();
    if(users.find(u=>u.username.toLowerCase()===username.toLowerCase())){ toast('Username exists'); return; }
    const role = username.toLowerCase()==='admin' ? 'ADMIN' : 'USER';
    const u = { id: uid(), username, email, password, mobile:'', role, createdAt: nowISO(), bio: '', settings:{notifyEmail:true,notifyInApp:true}, notifications:[] };
    users.push(u); saveUsers(users);
    setAuth({ id:u.id, username:u.username, role:u.role });
    toast('Registered', true);
    setTimeout(()=> window.location.href = role==='ADMIN' ? 'admin.html' : 'home.html', 600);
  });
}

const loginForm = $('#loginForm');
if(loginForm){
  loginForm.addEventListener('submit', e=>{
    e.preventDefault();
    const username = $('#username').value.trim();
    const password = $('#password').value.trim();
    const users = getUsers();
    const u = users.find(x=>x.username===username && x.password===password);
    if(!u){ toast('Invalid credentials'); return; }
    setAuth({ id:u.id, username:u.username, role:u.role });
    toast('Welcome ' + u.username, true);
    setTimeout(()=> window.location.href = u.role==='ADMIN' ? 'admin.html' : 'home.html', 600);
  });
}

// global logout wiring
$$('#logoutBtn').forEach(btn=>btn.addEventListener('click', ()=>{ setAuth(null); updateNav(); toast('Logged out'); setTimeout(()=> window.location.href='index.html',300); }));
document.addEventListener('click', (e) => { if(e.target && e.target.id === 'signOutBtn'){ setAuth(null); updateNav(); toast('Signed out'); setTimeout(()=>window.location.href='index.html', 300); } });

// ---------- Profile rendering & actions ----------
function renderProfileSidebar(){
  // Only run if the page actually contains profile fields (defensive)
  // This prevents profile UI from being rendered on pages that don't have those elements.
  if(!document.getElementById('profileTitle') && !document.getElementById('profileName') && !document.getElementById('updName')) return;

  const a = getAuth();
  if(!a) return;
  const users = getUsers();
  const me = users.find(u => u.username === a.username) || null;
  if(!me) return;
  const initial = (me.username || 'U').substring(0,1).toUpperCase();

  if($('#profileAvatar')) $('#profileAvatar').textContent = initial;
  if($('#profileName')) $('#profileName').textContent = me.username;
  if($('#profileEmail')) $('#profileEmail').textContent = me.email || '';
  if($('#profileMobile')) $('#profileMobile').textContent = me.mobile ? me.mobile : '+91 -';
  if($('#profileJoined')) $('#profileJoined').textContent = 'Joined: ' + (new Date(me.createdAt).toLocaleDateString());
  if($('#profileTitle')) $('#profileTitle').textContent = me.username;
  if($('#profileEmailText')) $('#profileEmailText').textContent = me.email || '';
  if($('#profileMobileText')) $('#profileMobileText').textContent = me.mobile ? ('Mobile: ' + me.mobile) : 'Mobile: --';
  if($('#profileJoinedText')) $('#profileJoinedText').textContent = 'Joined: ' + (new Date(me.createdAt).toLocaleString());
  if($('#profileBio')) $('#profileBio').textContent = me.bio || 'No additional info.';
  if($('#profileLargeAvatar')) $('#profileLargeAvatar').textContent = initial;
  if($('#updName')) $('#updName').value = me.username || '';
  if($('#updEmail')) $('#updEmail').value = me.email || '';
  if($('#updMobile')) $('#updMobile').value = me.mobile || '';
  if($('#updBio')) $('#updBio').value = me.bio || '';
  if($('#notifyEmail')) $('#notifyEmail').checked = me.settings?.notifyEmail !== false;
  if($('#notifyInApp')) $('#notifyInApp').checked = me.settings?.notifyInApp !== false;
}

function showPanel(id){
  // Only run if panels exist on the page
  const panels = $$('.panel');
  if(!panels || !panels.length) return;
  panels.forEach(p => p.classList.add('hidden'));
  const el = $('#' + id);
  if(el) el.classList.remove('hidden');
}

// update profile (profile.html)
const updForm = $('#updateProfileForm');
if(updForm){
  updForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const auth = getAuth();
    if(!auth){ toast('Not authenticated'); return; }
    const users = getUsers();
    const meIndex = users.findIndex(u => u.username === auth.username);
    if(meIndex === -1){ toast('User not found'); return; }
    const newName = $('#updName').value.trim();
    const newEmail = $('#updEmail').value.trim();
    const newMobile = $('#updMobile') ? $('#updMobile').value.trim() : '';
    const newBio = $('#updBio').value.trim();
    if(!newName || !newEmail){ toast('Name and email required'); return; }
    if(newName !== users[meIndex].username && users.find(u=>u.username===newName)){ toast('Username already taken'); return; }
    users[meIndex].username = newName;
    users[meIndex].email = newEmail;
    users[meIndex].mobile = newMobile;
    users[meIndex].bio = newBio;
    const notifyEmail = $('#notifyEmail') ? !!$('#notifyEmail').checked : true;
    const notifyInApp = $('#notifyInApp') ? !!$('#notifyInApp').checked : true;
    users[meIndex].settings = users[meIndex].settings || {};
    users[meIndex].settings.notifyEmail = notifyEmail;
    users[meIndex].settings.notifyInApp = notifyInApp;
    saveUsers(users);
    setAuth({ id: users[meIndex].id, username: newName, role: users[meIndex].role });
    toast('Profile updated', true);
    renderProfileSidebar();
    // showPanel only if panels exist
    if(document.getElementById('profileView')) showPanel('profileView');
    updateNav();
  });
  $('#updCancel')?.addEventListener('click', (e) => { e.preventDefault(); if(document.getElementById('profileView')) showPanel('profileView'); });
}

// change password (profile.html)
const chgForm = $('#changePasswordForm');
if(chgForm){
  chgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const auth = getAuth();
    if(!auth){ toast('Not authenticated'); return; }
    const users = getUsers();
    const meIndex = users.findIndex(u => u.username === auth.username);
    if(meIndex === -1){ toast('User not found'); return; }
    const cur = $('#curPass').value;
    const np = $('#newPass').value;
    const cp = $('#confirmPass').value;
    if(users[meIndex].password !== cur){ toast('Current password incorrect'); return; }
    if(np.length < 6){ toast('New password must be at least 6 chars'); return; }
    if(np !== cp){ toast('Passwords do not match'); return; }
    users[meIndex].password = np;
    saveUsers(users);
    toast('Password changed', true);
    chgForm.reset();
    if(document.getElementById('profileView')) showPanel('profileView');
  });
  $('#chgCancel')?.addEventListener('click', (e) => { e.preventDefault(); if(document.getElementById('profileView')) showPanel('profileView'); });
}

// ---------- utilities ----------
function escapeHtml(s){ if(s==null) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// ---------- complaints rendering ----------
function complaintCardHtml(c){
  let photosHtml = '';
  (c.photos||[]).forEach(url => photosHtml += `<div class="thumb-wrap"><img src="${url}" alt="photo" class="thumb" /></div>`);
  return `<div class="complaint-main">
    <p class="title">${escapeHtml(c.title)} <span class="badge">${escapeHtml(c.category)}</span></p>
    <p class="desc">${escapeHtml(c.description)}</p>
    <p class="meta">${c.locationText?escapeHtml(c.locationText):''} • ${new Date(c.createdAt).toLocaleString()}</p>
  </div>
  ${photosHtml ? `<div style="display:flex;gap:8px;align-items:center">${photosHtml}</div>` : ''}
  <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
    <button class="upvote-btn" data-id="${c.id}">▲ <span class="upvote-count">${c.upvotes||0}</span></button>
    <a href="complaint-detail.html?id=${encodeURIComponent(c.id)}" class="button muted">View</a>
  </div>`;
}

function renderComplaintList(){
  const list = $('#complaintList'); if(!list) return;
  const items = getComplaints();
  list.innerHTML = '';
  if(!items.length){ list.innerHTML = '<div class="card muted small">No complaints yet.</div>'; return; }
  items.forEach(c=>{
    const d = document.createElement('div'); d.className='complaint-card'; d.dataset.id = c.id;
    d.innerHTML = complaintCardHtml(c);
    list.appendChild(d);
  });

  $$('.upvote-btn').forEach(b=> b.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    const arr = getComplaints();
    const idx = arr.findIndex(x => x.id === id);
    if(idx >= 0){ arr[idx].upvotes = (arr[idx].upvotes || 0) + 1; saveComplaints(arr); renderComplaintList(); renderAdminDashboard(); toast('Upvoted!', true); }
  }));
}

function renderMyComplaints(){
  const ctn = $('#myComplaintsList'); if(!ctn) return;
  ctn.innerHTML = '';
  const a = getAuth(); if(!a){ ctn.innerHTML = '<div class="card muted small">Not logged in</div>'; return; }
  const items = getComplaints().filter(x=>x.createdBy===a.username);
  if(!items.length){ ctn.innerHTML = '<div class="card muted small">No submissions yet.</div>'; return; }
  items.forEach(c=>{
    const d = document.createElement('div'); d.className = 'complaint-card';
    d.innerHTML = complaintCardHtml(c);
    ctn.appendChild(d);
  });
}

// ---------- admin dashboard ----------
let ADMIN_FILTER = { type: 'ALL', value: null };

function renderAdminDashboard() {
  const complaints = getComplaints();
  const users = getUsers();

  const total = complaints.length;
  const byStatus = complaints.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});
  const byCategory = complaints.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {});
  const totalUsers = users.length;

  const grid = document.getElementById('dashboardGrid');
  if(!grid) return;

  const cards = [
    { id:'all', label:'Total Reports', value: total, hint:'All reports', icon:'📄', action: () => applyAdminFilter({type:'ALL'}) },
    { id:'reported', label:'Reported', value: byStatus['Reported'] || 0, hint:'New reports', icon:'🚩', action: () => applyAdminFilter({type:'STATUS', value:'Reported'}) },
    { id:'inprogress', label:'In Progress', value: byStatus['In Progress'] || 0, hint:'Being handled', icon:'🔧', action: () => applyAdminFilter({type:'STATUS', value:'In Progress'}) },
    { id:'resolved', label:'Resolved', value: byStatus['Resolved'] || 0, hint:'Resolved', icon:'✅', action: () => applyAdminFilter({type:'STATUS', value:'Resolved'}) },
    { id:'pothole', label:'Potholes', value: byCategory['pothole'] || 0, hint:'Pothole reports', icon:'🕳️', action: () => applyAdminFilter({type:'CATEGORY', value:'pothole'}) },
    { id:'users', label:'Registered Users', value: totalUsers, hint:'Total users', icon:'👥', action: () => applyAdminFilter({type:'USERS'}) }
  ];

  grid.innerHTML = '';
  cards.forEach(card => {
    const el = document.createElement('div');
    el.className = 'stat-card';
    el.innerHTML = `
      <div class="stat-left">
        <div class="stat-label">${escapeHtml(card.label)}</div>
        <div class="stat-value">${escapeHtml(String(card.value))}</div>
        <div class="muted small">${escapeHtml(card.hint)}</div>
      </div>
      <div class="stat-icon">${card.icon || ''}</div>
    `;
    el.addEventListener('click', card.action);
    grid.appendChild(el);
  });
}

function applyAdminFilter(filter) {
  ADMIN_FILTER = filter || {type:'ALL', value:null};
  renderAdmin();
  const adminList = document.getElementById('adminList');
  if(adminList) adminList.scrollIntoView({behavior:'smooth', block:'start'});
}

function renderAdmin(){
  const node = document.getElementById('adminList');
  if(!node) return;
  let items = getComplaints() || [];

  if(ADMIN_FILTER && ADMIN_FILTER.type){
    if(ADMIN_FILTER.type === 'STATUS' && ADMIN_FILTER.value) {
      items = items.filter(x => x.status === ADMIN_FILTER.value);
    } else if(ADMIN_FILTER.type === 'CATEGORY' && ADMIN_FILTER.value) {
      items = items.filter(x => x.category === ADMIN_FILTER.value);
    } else if(ADMIN_FILTER.type === 'USERS') {
      items = [];
    }
  }

  node.innerHTML = '';
  if(!items.length){
    node.innerHTML = `<div class="card muted small">No reports matching this filter.</div>`;
    return;
  }

  items.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'complaint-card';
    const viewUrl = `complaint-detail.html?id=${encodeURIComponent(c.id)}`;
    el.innerHTML = `
      <div class="complaint-main">
        <p class="title"><a href="${viewUrl}" style="color:inherit; text-decoration:none; font-weight:700">${escapeHtml(c.title)}</a> <span class="badge">${escapeHtml(c.category)}</span></p>
        <p class="desc">${escapeHtml(c.description)}</p>
        <p class="meta">By: ${escapeHtml(c.createdBy)} • ${new Date(c.createdAt).toLocaleString()}</p>
      </div>
      ${c.photos && c.photos.length ? `<div><img src="${c.photos[0]}" class="thumb" alt="photo"/></div>` : ''}
      <div class="actions admin-controls">
        <a href="${viewUrl}" class="button muted" style="text-decoration:none; padding:8px 12px; display:inline-block;">View</a>
        <select data-id="${c.id}" class="status-select">
          <option${c.status==='Reported'?' selected':''}>Reported</option>
          <option${c.status==='In Progress'?' selected':''}>In Progress</option>
          <option${c.status==='Resolved'?' selected':''}>Resolved</option>
        </select>
        <button class="delete-btn" data-id="${c.id}">Delete</button>
      </div>
    `;
    node.appendChild(el);
  });

  $$('.status-select').forEach(s=> s.addEventListener('change', (e) => {
    const id = e.target.dataset.id, val = e.target.value;
    const arr = getComplaints();
    const idx = arr.findIndex(x => x.id === id);
    if(idx >= 0){
      arr[idx].status = val;
      arr[idx].history = arr[idx].history || [];
      arr[idx].history.push({ status: val, by: getAuth()?getAuth().username:'admin', at: nowISO() });
      saveComplaints(arr);
      const users = getUsers();
      const reporter = users.find(u=>u.username===arr[idx].createdBy);
      if(reporter && reporter.settings && reporter.settings.notifyInApp){
        reporter.notifications = reporter.notifications || [];
        reporter.notifications.push({ title: `Report "${arr[idx].title}" marked ${val}`, at: nowISO(), read:false, complaintId: arr[idx].id });
        saveUsers(users);
      }
      renderAdmin(); renderAdminDashboard(); renderComplaintList(); renderMyComplaints();
      toast('Status updated', true);
    }
  }));

  $$('.delete-btn').forEach(b => b.addEventListener('click', (e) => {
    if(!confirm('Delete this report?')) return;
    const id = e.target.dataset.id;
    let arr = getComplaints();
    arr = arr.filter(x => x.id !== id);
    saveComplaints(arr);
    renderAdmin(); renderAdminDashboard(); renderComplaintList(); renderMyComplaints();
    toast('Deleted', true);
  }));
}

// ---------- Leaflet & reverse geocode (only initializes when page has a map) ----------
let mapObj=null, markers=null, tempMarker=null, selected=null;

async function loadLeaflet(){
  if(typeof L !== 'undefined') return;
  return new Promise(res=>{
    const css = document.createElement('link'); css.rel='stylesheet'; css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=()=>res(); document.body.appendChild(s);
  });
}

async function setAddress(lat,lng){
  const input = $('#locationText'); if(!input) return;
  input.value = `Fetching address... (${lat.toFixed(5)},${lng.toFixed(5)})`;
  try{
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const r = await fetch(url);
    if(!r.ok){ input.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; return; }
    const j = await r.json();
    input.value = j.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const latF = $('#lat'), lngF = $('#lng');
    if(latF && lngF){ latF.value = lat; lngF.value = lng; }
  }catch(e){ input.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
}

async function initMapIfNeeded(){
  if(!document.getElementById('mapComplaints')) return;
  if(typeof L === 'undefined'){ await loadLeaflet(); }
  mapObj = L.map('mapComplaints').setView([28.7041,77.1025],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapObj);
  markers = L.layerGroup().addTo(mapObj);
  const pts=[];
  getComplaints().forEach(c=>{ if(c.lat && c.lng){ L.marker([c.lat,c.lng]).addTo(markers).bindPopup(`<strong>${escapeHtml(c.title)}</strong><br>${escapeHtml(c.locationText||'')}`); pts.push([c.lat,c.lng]); }});
  if(pts.length) try{ mapObj.fitBounds(pts, { padding:[40,40] }); }catch(e){}
  mapObj.on('click', async e=>{
    selected = { lat:e.latlng.lat, lng:e.latlng.lng };
    if(tempMarker) markers.removeLayer(tempMarker);
    tempMarker = L.marker([selected.lat, selected.lng], { draggable:true }).addTo(markers).bindPopup('Selected location. Drag to adjust').openPopup();
    tempMarker.on('dragend', async ev=>{ const p=ev.target.getLatLng(); selected = { lat:p.lat, lng:p.lng }; await setAddress(selected.lat, selected.lng); });
    await setAddress(selected.lat, selected.lng);
  });
}

// ---------- File helper ----------
function readFileAsDataURL(file){
  return new Promise((res, rej) => {
    if(!file){ res(null); return; }
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = () => rej(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

// ---------- Submit complaint ----------
const cForm = $('#complaintForm');
if(cForm){
  cForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const title = $('#title').value.trim(); const desc = $('#description').value.trim(); const cat = $('#category').value; const loc = $('#locationText').value.trim();
    if(!title || !desc){ toast('Fill title & description'); return; }
    const photoInput = $('#photo');
    const photos = [];
    if(photoInput && photoInput.files && photoInput.files.length){
      for(let i=0;i<photoInput.files.length;i++){
        try { const d = await readFileAsDataURL(photoInput.files[i]); if(d) photos.push(d); } catch(err){ console.warn('photo read failed', err); }
      }
    }
    let lat=null,lng=null;
    const latF = $('#lat'), lngF = $('#lng');
    if(latF && latF.value && lngF && lngF.value){ lat=parseFloat(latF.value); lng=parseFloat(lngF.value); }
    if((lat===null || lng===null) && selected){ lat=selected.lat; lng=selected.lng; }
    const anon = $('#anonReport') && $('#anonReport').checked;
    const auth = getAuth();
    const createdBy = anon ? 'anonymous' : (auth ? auth.username : 'anonymous');
    const obj = { id:uid(), title, description:desc, category:cat, locationText:loc||'', lat:lat||null, lng:lng||null, status:'Reported', upvotes:0, createdAt:nowISO(), createdBy, photos, comments:[], history:[{status:'Reported', by:createdBy, at:nowISO()}] };
    const arr = getComplaints(); arr.unshift(obj); saveComplaints(arr);
    toast('Submitted', true);
    cForm.reset(); selected=null; if(tempMarker && markers) { markers.removeLayer(tempMarker); tempMarker=null; }
    renderComplaintList(); renderMyComplaints(); renderAdminDashboard(); renderAdmin();
    if(mapObj && obj.lat && obj.lng){ L.marker([obj.lat,obj.lng]).addTo(markers).bindPopup(`<strong>${escapeHtml(obj.title)}</strong>`); }
  });
}

// ---------- Complaint detail (only if detail page present) ----------
function loadComplaintDetail(){
  // only run if detailCard exists
  if(!document.getElementById('detailCard')) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if(!id) return;
  const complaint = getComplaints().find(x => x.id === id);
  if(!complaint) return;
  $('#detailTitle').textContent = complaint.title;
  $('#detailDesc').textContent = complaint.description;
  $('#detailMeta').textContent = `By: ${complaint.createdBy} • ${new Date(complaint.createdAt).toLocaleString()}`;
  $('#detailAddress').textContent = complaint.locationText || 'No address provided';
  $('#detailCategory').textContent = complaint.category || '';
  $('#detailReporter').textContent = complaint.createdBy || '';
  $('#detailCoords').textContent = complaint.lat && complaint.lng ? `Lat: ${complaint.lat}, Lng: ${complaint.lng}` : '';

  const statusSelect = $('#detailStatus');
  if(statusSelect){
    statusSelect.innerHTML = '';
    ['Reported','In Progress','Resolved'].forEach(s => {
      const opt = document.createElement('option'); opt.value = s; opt.textContent = s;
      if(complaint.status === s) opt.selected = true;
      statusSelect.appendChild(opt);
    });
  }

  const photoWrap = $('#detailPhotoWrap'); if(photoWrap) photoWrap.innerHTML = '';
  if(photoWrap){
    if(complaint.photos && complaint.photos.length){
      complaint.photos.forEach(p=>{
        const img = document.createElement('img'); img.className = 'detail-photo'; img.src = p; img.alt = 'uploaded photo'; photoWrap.appendChild(img);
      });
    } else {
      photoWrap.innerHTML = '<div class="muted small">No photo uploaded.</div>';
    }
  }

  const tl = $('#detailTimeline'); if(tl){ tl.innerHTML = ''; (complaint.history||[]).slice().reverse().forEach(h => { const d = document.createElement('div'); d.textContent = `${h.status} — ${h.by} • ${new Date(h.at).toLocaleString()}`; tl.appendChild(d); }); }

  const cl = $('#commentsList'); if(cl){ cl.innerHTML = ''; (complaint.comments||[]).slice().reverse().forEach(cm=>{ const div=document.createElement('div'); div.className='comment'; div.innerHTML = `<strong>${escapeHtml(cm.by)}</strong> <span class="muted small">• ${new Date(cm.at).toLocaleString()}</span><div style="margin-top:6px">${escapeHtml(cm.text).replace(/@(\w+)/g,'<span class="mention">@$1</span>')}</div>`; cl.appendChild(div); }); }

  if(complaint.lat && complaint.lng && typeof L !== 'undefined'){
    const m = L.map('detailMap').setView([complaint.lat, complaint.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
    L.marker([complaint.lat, complaint.lng]).addTo(m).bindPopup(complaint.title).openPopup();
  } else {
    const dm = $('#detailMap');
    if(dm) dm.innerHTML = '<div class="muted small" style="padding:10px">No coordinates available for this complaint.</div>';
  }

  $('#detailSaveBtn')?.addEventListener('click', ()=>{
    const arr = getComplaints();
    const idx = arr.findIndex(x => x.id === id);
    if(idx === -1){ toast('Not found'); return; }
    const newStatus = $('#detailStatus').value;
    if(arr[idx].status !== newStatus){
      arr[idx].status = newStatus;
      arr[idx].history = arr[idx].history || [];
      arr[idx].history.push({ status: newStatus, by: getAuth()?getAuth().username:'admin', at: nowISO() });
      saveComplaints(arr);
      const users = getUsers();
      const reporter = users.find(u=>u.username===arr[idx].createdBy);
      if(reporter && reporter.settings && reporter.settings.notifyInApp){
        reporter.notifications = reporter.notifications || [];
        reporter.notifications.push({ title: `Your report "${arr[idx].title}" marked ${newStatus}`, at: nowISO(), read:false, complaintId: arr[idx].id });
        saveUsers(users);
      }
      toast('Status updated', true);
      loadComplaintDetail();
      renderAdmin(); renderAdminDashboard(); renderComplaintList();
    } else {
      toast('No changes', false);
    }
  });
  $('#detailDeleteBtn')?.addEventListener('click', ()=>{
    if(!confirm('Delete this complaint?')) return;
    let arr = getComplaints();
    arr = arr.filter(x => x.id !== id);
    saveComplaints(arr);
    toast('Deleted', true);
    window.location.href = 'admin.html';
  });

  $('#postCommentBtn')?.addEventListener('click', ()=>{
    const text = $('#newCommentText').value.trim();
    if(!text){ toast('Write something'); return; }
    const arr = getComplaints();
    const idx = arr.findIndex(x => x.id === id);
    if(idx === -1) return;
    const by = getAuth()?getAuth().username:'anonymous';
    const comment = { id: uid(), by, text, at: nowISO() };
    arr[idx].comments = arr[idx].comments || [];
    arr[idx].comments.push(comment);
    saveComplaints(arr);
    $('#newCommentText').value = '';
    loadComplaintDetail();
    toast('Comment added', true);
  });
}

// ---------- comments on pages that include the form ----------
$('#commentForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const text = $('#commentText').value.trim();
  if(!text){ toast('Enter comment'); return; }
  const auth = getAuth();
  if(!auth){ toast('Login to comment'); return; }
  const comments = getComments();
  comments.push({ id: uid(), text, user: auth.username, createdAt: nowISO() });
  saveComments(comments);
  $('#commentText').value = '';
  renderComments();
  toast('Comment posted', true);
});

function renderComments(){
  const list = $('#commentList'); if(!list) return;
  const comments = getComments();
  list.innerHTML = '';
  comments.slice().reverse().forEach(c=>{
    const el = document.createElement('div'); el.className='comment';
    let txt = escapeHtml(c.text);
    txt = txt.replace(/@(\w+)/g,'<span class="mention">@$1</span>');
    el.innerHTML = `<strong>${escapeHtml(c.user)}</strong> <span class="muted small">• ${new Date(c.createdAt).toLocaleString()}</span><div style="margin-top:6px">${txt}</div>`;
    list.appendChild(el);
  });
}

// ---------- leaderboard ----------
function renderLeaderboard(){
  const lb = $('#leaderboard'); if(!lb) return;
  const users = getUsers();
  const complaints = getComplaints();
  const stats = users.map(u=>({ username:u.username, reports: complaints.filter(c=>c.createdBy===u.username).length }));
  stats.sort((a,b)=>b.reports-a.reports);
  lb.innerHTML = '';
  stats.forEach((s,i)=>{
    const el = document.createElement('div');
    el.innerHTML = `${i+1}. <b>${escapeHtml(s.username)}</b> — ${s.reports} reports`;
    lb.appendChild(el);
  });
}

// ---------- CSV export ----------
function exportComplaintsCSV(){
  const arr = getComplaints();
  if(!arr.length){ toast('No complaints'); return; }
  const cols = ['id','title','category','status','createdBy','createdAt','lat','lng','locationText','upvotes'];
  const csv = [cols.join(',')].concat(arr.map(r => {
    return cols.map(c => {
      const v = (r[c] !== undefined && r[c] !== null) ? String(r[c]) : '';
      return `"${v.replace(/"/g,'""')}"`;
    }).join(',');
  })).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download='complaints.csv'; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Exported CSV', true);
}

// ---------- theme toggle ----------
$('#themeSwitch')?.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

// ---------- sidebar buttons (if present) ----------
function wireSidebarButtons(){
  $$('.side-link').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const t = btn.dataset.target;
      if(t && document.getElementById(t)) showPanel(t);
      renderProfileSidebar();
    });
  });
}

// ---------- Home helper: stats boxes ----------
function buildHomeStats(){
  if(!location.pathname.endsWith('home.html')) return;
  const wrap = document.getElementById('scsStats');
  if(!wrap) return;
  const counts = computeHomeCounts();
  wrap.innerHTML = '';
  const cards = [
    {label:'Reported', value: counts.Reported},
    {label:'Acknowledged', value: counts.Acknowledged},
    {label:'In Progress', value: counts['In Progress']},
    {label:'Resolved', value: counts.Resolved}
  ];
  cards.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'card center';
    el.style.padding = '14px';
    el.innerHTML = `<div style="font-weight:800;font-size:1.4rem">${c.value}</div><div class="muted small">${escapeHtml(c.label)}</div>`;
    wrap.appendChild(el);
  });
}

function computeHomeCounts(){
  const arr = getComplaints();
  const counts = { Reported:0, Acknowledged:0, 'In Progress':0, Resolved:0 };
  arr.forEach(c=>{
    if(c.status === 'Reported') counts.Reported++;
    if(c.status === 'In Progress') counts['In Progress']++;
    if(c.status === 'Resolved') counts.Resolved++;
    (c.history||[]).forEach(h=>{
      if(String(h.status).toLowerCase().includes('ack')) counts.Acknowledged++;
    });
  });
  return counts;
}

// ---------- bootstrap ----------
document.addEventListener('DOMContentLoaded', async ()=>{
  updateNav();
  wireNavRouting();

  // Only render profile UI if page contains profile elements.
  renderProfileSidebar();

  // If profile panels exist, ensure profile view is visible by default.
  if(document.getElementById('profileView')) showPanel('profileView');

  // Render lists & widgets only on pages that have the target element:
  if(document.getElementById('complaintList')) renderComplaintList();
  if(document.getElementById('myComplaintsList')) renderMyComplaints();
  if(document.getElementById('dashboardGrid')) renderAdminDashboard();
  if(document.getElementById('adminList')) renderAdmin();
  if(document.getElementById('commentList')) renderComments();
  if(document.getElementById('leaderboard')) renderLeaderboard();

  wireSidebarButtons();

  if(document.getElementById('mapComplaints')) {
    try { await initMapIfNeeded(); } catch(e){ console.warn('map init failed', e); }
  }

  if(document.getElementById('detailCard')) {
    if(typeof L === 'undefined') await loadLeaflet();
    loadComplaintDetail();
  }

  // Home-specific initialization (hero buttons, stats)
  if(location.pathname.endsWith('home.html')){
    buildHomeStats();
    $('#reportPrimaryBtn')?.addEventListener('click', ()=> { window.location.href = 'complaints.html'; });
    $('#viewMyReportsBtn')?.addEventListener('click', ()=> {
      const my = document.getElementById('myComplaintsList') || document.getElementById('complaintList');
      if(my) my.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }

  $$('#logoutBtn').forEach(b=>b.addEventListener('click', ()=>{ setAuth(null); updateNav(); toast('Logged out'); setTimeout(()=>window.location.href='index.html',300); }));
  const sbtn = $('#signOutBtn');
  if(sbtn) sbtn.addEventListener('click', ()=>{ setAuth(null); updateNav(); toast('Signed out'); setTimeout(()=>window.location.href='index.html',300); });
});
// Hero image upload
const heroInput = document.getElementById('heroImgUpload');
const heroPreview = document.getElementById('heroImgPreview');

heroInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;

  // Only allow PNG or JPEG
  if(!['image/png','image/jpeg'].includes(file.type)){
    alert('Only PNG or JPG images allowed!');
    heroInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    heroPreview.innerHTML = `<img src="${event.target.result}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
  }
  reader.readAsDataURL(file);
});






// App.js — full logic for all pages including admin-stats, charts, filters, EmailJS
document.addEventListener('DOMContentLoaded', () => {

  // Common elements
  const navLogin = document.querySelector('.nav-login');
  const navRegister = document.querySelector('.nav-register');
  const navHome = document.querySelector('.nav-home');
  const navComplaints = document.querySelector('.nav-complaints');
  const navAdmin = document.querySelector('.nav-admin');
  const navAdminStats = document.querySelector('.nav-admin-stats');
  const navProfile = document.querySelector('.nav-profile');
  const navLogout = document.querySelector('.nav-logout');

  const userInfoDiv = document.getElementById('userInfo');

  // Mock current user
  const currentUser = {
    username:'admin', email:'admin@scs.com', role:'admin'
  };

  if(currentUser){
    navLogin.classList.add('hidden');
    navRegister.classList.add('hidden');
    navHome.classList.remove('hidden');
    navComplaints.classList.remove('hidden');
    navProfile.classList.remove('hidden');
    navLogout.classList.remove('hidden');
    if(currentUser.role==='admin'){
      navAdmin.classList.remove('hidden');
      navAdminStats.classList.remove('hidden');
    }
    userInfoDiv.textContent = `Hello, ${currentUser.username}`;
    userInfoDiv.classList.remove('hidden');
  }

  // Logout
  navLogout.addEventListener('click', e=>{e.preventDefault();alert('Logged out!');});

  // ================= Admin Stats Page =================
  if(document.getElementById('adminStatsOverview')){
    const statsContainer = document.getElementById('adminStatsOverview');

    // Mock data
    const reports = [
      {id:1,user:'Alice',email:'alice@test.com',category:'pothole',status:'inprogress',description:'Road broken',amount:1},
      {id:2,user:'Bob',email:'bob@test.com',category:'streetlight',status:'resolved',description:'Light not working',amount:1},
      {id:3,user:'Charlie',email:'charlie@test.com',category:'water',status:'inprogress',description:'Leak in pipeline',amount:1},
      {id:4,user:'Alice',email:'alice@test.com',category:'pothole',status:'resolved',description:'Pothole filled',amount:1}
    ];

    // Show chart placeholders
    const chartDiv = document.createElement('div');
    chartDiv.className='chart-container';
    chartDiv.innerHTML=`<canvas id="pieChart"></canvas><canvas id="barChart" style="margin-top:20px"></canvas>`;
    statsContainer.appendChild(chartDiv);

    // Filter buttons
    const filterDiv = document.createElement('div');
    filterDiv.className='filter-buttons';
    ['all','pothole','streetlight','water'].forEach(cat=>{
      const btn=document.createElement('button'); btn.textContent=cat; btn.dataset.cat=cat;
      if(cat==='all') btn.classList.add('active');
      filterDiv.appendChild(btn);
    });
    statsContainer.appendChild(filterDiv);

    // Report list container
    const reportList = document.createElement('div'); reportList.id='reportList'; reportList.className='list';
    statsContainer.appendChild(reportList);

    // Function to render reports
    function renderReports(filter='all'){
      reportList.innerHTML='';
      reports.filter(r=>filter==='all'||r.category===filter).forEach(r=>{
        const div=document.createElement('div'); div.className='complaint-card';
        div.innerHTML=`<div class="complaint-main">
          <div class="title">${r.user} (${r.email})</div>
          <div class="desc">${r.description}</div>
          <div class="meta">Category: ${r.category} | Status: ${r.status}</div>
        </div>`;
        reportList.appendChild(div);
      });
    }

    renderReports();

    // Filter button click
    filterDiv.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click',()=>{
        filterDiv.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        renderReports(btn.dataset.cat);
      });
    });

    // Charts using Chart.js
    const ctxPie=document.getElementById('pieChart').getContext('2d');
    const ctxBar=document.getElementById('barChart').getContext('2d');
    const categoryCounts = reports.reduce((acc,r)=>{
      acc[r.category]=(acc[r.category]||0)+1; return acc;
    },{});
    const statusCounts = reports.reduce((acc,r)=>{
      acc[r.status]=(acc[r.status]||0)+1; return acc;
    },{});

    new Chart(ctxPie,{
      type:'pie',
      data:{labels:Object.keys(categoryCounts),datasets:[{data:Object.values(categoryCounts),backgroundColor:['#2563eb','#0ea5a2','#f59e0b']}]},
      options:{responsive:true}
    });

    new Chart(ctxBar,{
      type:'bar',
      data:{labels:Object.keys(statusCounts),datasets:[{label:'Reports',data:Object.values(statusCounts),backgroundColor:['#2563eb','#0ea5a2']}]},
      options:{responsive:true,scales:{y:{beginAtZero:true}}}
    });

    // EmailJS example
    const sendEmail = (report)=>{
      emailjs.send('YOUR_SERVICE_ID','YOUR_TEMPLATE_ID',{
        username: report.user,
        useremail: report.email,
        description: report.description,
        status: report.status
      }).then(()=>console.log('Email sent')).catch(err=>console.error(err));
    }
  }
});
