<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>CRM Arredo Bagno</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
:root{
  --blue:#2D7DD2;
  --blue-dark:#1F5FA8;
  --blue-light:#EAF4FD;
  --blue-lighter:#F5FAFE;
  --ink:#1B2733;
  --grey:#6B7A87;
  --border:#E1E8EE;
  --white:#FFFFFF;
  --danger:#D64545;
  --ok:#2E9E5B;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;height:100%;}
body{
  font-family:Arial, Helvetica, sans-serif;
  background:var(--white);
  color:var(--ink);
  font-size:14px;
}
button, input, select, textarea{font-family:Arial, Helvetica, sans-serif;font-size:14px;}

/* Topbar */
#topbar{
  height:56px;
  background:var(--white);
  border-bottom:1px solid var(--border);
  display:flex;
  align-items:center;
  gap:14px;
  padding:0 16px;
  position:sticky;
  top:0;
  z-index:50;
}
#hamburger{
  width:40px;height:40px;border:1px solid var(--border);border-radius:8px;
  background:var(--white);cursor:pointer;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:4px;
}
#hamburger span{width:18px;height:2px;background:var(--blue);border-radius:2px;}
#brand{font-weight:bold;color:var(--blue-dark);font-size:17px;letter-spacing:.2px;}
#brand small{display:block;font-weight:normal;color:var(--grey);font-size:11px;}

/* Dropdown nav menu */
#navDropdown{
  position:fixed;top:56px;left:0;
  background:var(--white);
  border-right:1px solid var(--border);
  border-bottom:1px solid var(--border);
  box-shadow:2px 6px 18px rgba(30,60,90,0.08);
  width:270px;
  max-height:calc(100vh - 56px);
  overflow-y:auto;
  transform:translateX(-110%);
  transition:transform .18s ease;
  z-index:49;
  padding:8px;
}
#navDropdown.open{transform:translateX(0);}
.nav-item{
  display:flex;align-items:center;gap:10px;
  padding:11px 14px;border-radius:8px;cursor:pointer;color:var(--ink);
}
.nav-item:hover{background:var(--blue-lighter);}
.nav-item.active{background:var(--blue-light);color:var(--blue-dark);font-weight:bold;}
.nav-icon{width:20px;text-align:center;color:var(--blue);}
#navOverlay{
  position:fixed;inset:0;background:rgba(20,40,60,0.15);z-index:48;
  display:none;
}
#navOverlay.open{display:block;}

/* Layout */
#app{padding:22px 26px;max-width:1180px;margin:0 auto;}
h1.page-title{font-size:20px;color:var(--blue-dark);margin:0 0 4px 0;}
p.page-sub{color:var(--grey);margin:0 0 20px 0;}

.card{
  background:var(--white);border:1px solid var(--border);border-radius:12px;
  padding:18px;margin-bottom:16px;
}
.card h3{margin:0 0 12px 0;font-size:15px;color:var(--blue-dark);}
.row{display:flex;gap:12px;flex-wrap:wrap;}
.col{flex:1;min-width:180px;}
label{display:block;font-size:12px;color:var(--grey);margin-bottom:4px;font-weight:bold;}
input[type=text], input[type=date], input[type=number], input[type=email], input[type=tel], select, textarea{
  width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;
  background:var(--white);color:var(--ink);margin-bottom:12px;
}
textarea{resize:vertical;min-height:60px;}
input:focus, select:focus, textarea:focus{outline:2px solid var(--blue);border-color:var(--blue);}

.btn{
  background:var(--blue);color:white;border:none;border-radius:8px;
  padding:9px 16px;cursor:pointer;font-weight:bold;
}
.btn:hover{background:var(--blue-dark);}
.btn.secondary{background:var(--white);color:var(--blue-dark);border:1px solid var(--blue);}
.btn.secondary:hover{background:var(--blue-lighter);}
.btn.danger{background:var(--white);color:var(--danger);border:1px solid var(--danger);}
.btn.danger:hover{background:#FDECEC;}
.btn.small{padding:5px 10px;font-size:12px;}

table{width:100%;border-collapse:collapse;font-size:13px;}
th{background:var(--blue-light);color:var(--blue-dark);text-align:left;padding:8px;border-bottom:2px solid var(--blue);}
td{padding:7px 8px;border-bottom:1px solid var(--border);}
tr:hover td{background:var(--blue-lighter);}

.pill{
  display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:bold;
  background:var(--blue-light);color:var(--blue-dark);
}
.list-item{
  display:flex;justify-content:space-between;align-items:center;
  padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;cursor:pointer;
}
.list-item:hover{border-color:var(--blue);background:var(--blue-lighter);}
.tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);margin-bottom:16px;flex-wrap:wrap;}
.tab{padding:8px 14px;cursor:pointer;border-radius:8px 8px 0 0;color:var(--grey);font-weight:bold;}
.tab.active{color:var(--blue-dark);background:var(--blue-light);}
.empty-state{text-align:center;padding:40px 20px;color:var(--grey);}
.empty-state .big{font-size:32px;margin-bottom:8px;}
.toast{
  position:fixed;bottom:20px;right:20px;background:var(--ink);color:white;
  padding:12px 18px;border-radius:8px;font-size:13px;z-index:200;opacity:0;
  transition:opacity .25s ease;pointer-events:none;
}
.toast.show{opacity:1;}
.grid-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;}
.stat-card{background:var(--blue-light);border-radius:12px;padding:16px;}
.stat-card .num{font-size:24px;font-weight:bold;color:var(--blue-dark);}
.stat-card .lbl{font-size:12px;color:var(--grey);}
.quote-line-row{border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;background:var(--blue-lighter);}
.close-x{cursor:pointer;color:var(--grey);font-size:18px;line-height:1;}
.close-x:hover{color:var(--danger);}
#map{height:480px;border-radius:12px;border:1px solid var(--border);}
.chk-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.chk-row input{width:auto;margin:0;}
.section-divider{border:none;border-top:1px solid var(--border);margin:16px 0;}
.small-note{font-size:11px;color:var(--grey);}
@media(max-width:640px){
  #app{padding:14px;}
  #navDropdown{width:88vw;}
}
</style>
</head>
<body>

<div id="topbar">
  <div id="hamburger" onclick="toggleNav()"><span></span><span></span><span></span></div>
  <div id="brand">CRM Arredo Bagno<small>Gestione agente plurimandatario</small></div>
</div>

<div id="navOverlay" onclick="closeNav()"></div>
<div id="navDropdown"></div>

<div id="app"></div>

<div class="toast" id="toast"></div>

<div id="confirmOverlay" style="display:none;position:fixed;inset:0;background:rgba(20,40,60,0.45);z-index:310;align-items:center;justify-content:center;padding:20px;">
  <div style="background:#fff;border-radius:12px;width:100%;max-width:420px;padding:22px;">
    <p id="confirmMessage" style="margin:0 0 18px 0;color:#1B2733;font-size:14px;"></p>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn secondary" onclick="cancelConfirm()">Annulla</button>
      <button class="btn danger" id="confirmOkBtn" onclick="acceptConfirm()">Conferma</button>
    </div>
  </div>
</div>

<div id="pdfPreviewOverlay" style="display:none;position:fixed;inset:0;background:rgba(20,40,60,0.45);z-index:300;align-items:center;justify-content:center;padding:20px;">
  <div style="background:#fff;border-radius:12px;width:100%;max-width:900px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #E1E8EE;">
      <strong id="pdfPreviewTitle" style="color:#1F5FA8;">Anteprima PDF</strong>
      <div style="display:flex;gap:8px;align-items:center;">
        <a id="pdfOpenTabLink" href="#" target="_blank" rel="noopener" class="btn secondary small" style="text-decoration:none;">Apri in nuova scheda</a>
        <a id="pdfDownloadLink" href="#" class="btn small" style="text-decoration:none;">Scarica PDF</a>
        <span class="close-x" onclick="closePdfPreview()" title="Chiudi">&times;</span>
      </div>
    </div>
    <iframe id="pdfPreviewFrame" style="flex:1;border:none;width:100%;min-height:70vh;"></iframe>
  </div>
</div>

<script>
/* ===================== STATO & STORAGE ===================== */
const state = { companies: [], clients: [], groups: [], quotes: [] };
let currentPage = 'dashboard';
let currentParams = {};
let calendarCursor = new Date();

/* ===================== CONFERMA PERSONALIZZATA ===================== */
/* Il confirm() nativo del browser viene bloccato in questo ambiente,
   quindi usiamo un modale interno per le azioni distruttive. */
let _pendingConfirmAction = null;
function showConfirm(message, onConfirm){
  _pendingConfirmAction = onConfirm;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmOverlay').style.display = 'flex';
}
function acceptConfirm(){
  const action = _pendingConfirmAction;
  document.getElementById('confirmOverlay').style.display = 'none';
  _pendingConfirmAction = null;
  if(typeof action === 'function') action();
}
function cancelConfirm(){
  document.getElementById('confirmOverlay').style.display = 'none';
  _pendingConfirmAction = null;
}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

async function loadKey(key, fallback){
  try{
    const r = await window.storage.get(key, false);
    return r ? JSON.parse(r.value) : fallback;
  }catch(e){ return fallback; }
}
async function saveKey(key, value){
  try{ await window.storage.set(key, JSON.stringify(value), false); }
  catch(e){ console.error('storage error', key, e); toast('Errore di salvataggio dati'); }
}
async function saveCompanies(){ await saveKey('companies-list', state.companies); }
async function saveClients(){ await saveKey('clients-list', state.clients); }
async function saveGroups(){ await saveKey('groups-list', state.groups); }
async function saveQuotes(){ await saveKey('quotes-list', state.quotes); }

async function loadAll(){
  state.companies = await loadKey('companies-list', []);
  state.clients   = await loadKey('clients-list', []);
  state.groups    = await loadKey('groups-list', []);
  state.quotes    = await loadKey('quotes-list', []);
}

/* ===================== HELPERS ===================== */
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 2400);
}
function euro(n){
  n = Number(n)||0;
  return n.toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
}
function fmtDate(d){
  if(!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('it-IT');
}
function companyName(id){ const c = state.companies.find(x=>x.id===id); return c ? c.name : '—'; }
function clientName(id){ const c = state.clients.find(x=>x.id===id); return c ? c.name : '—'; }
function escapeHtml(s){
  return (s==null?'':String(s)).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ===================== NAV ===================== */
const NAV_ITEMS = [
  {id:'dashboard', label:'Dashboard', icon:'&#127968;'},
  {id:'clienti', label:'Clienti', icon:'&#128100;'},
  {id:'aziende', label:'Aziende mandanti', icon:'&#127970;'},
  {id:'gruppi', label:'Gruppi di acquisto', icon:'&#128101;'},
  {id:'calendario', label:'Calendario visite', icon:'&#128197;'},
  {id:'preventivi', label:'Preventivi e offerte', icon:'&#128196;'},
  {id:'mappa', label:'Mappa clienti', icon:'&#128506;'},
  {id:'fatturato', label:'Fatturato', icon:'&#128176;'},
];

function toggleNav(){
  document.getElementById('navDropdown').classList.toggle('open');
  document.getElementById('navOverlay').classList.toggle('open');
}
function closeNav(){
  document.getElementById('navDropdown').classList.remove('open');
  document.getElementById('navOverlay').classList.remove('open');
}
function renderNav(){
  const el = document.getElementById('navDropdown');
  el.innerHTML = NAV_ITEMS.map(it => `
    <div class="nav-item ${currentPage===it.id?'active':''}" onclick="navigate('${it.id}')">
      <span class="nav-icon">${it.icon}</span><span>${it.label}</span>
    </div>
  `).join('');
}

function navigate(page, params){
  currentPage = page;
  currentParams = params || {};
  renderNav();
  renderPage();
  closeNav();
  window.scrollTo(0,0);
}

function renderPage(){
  const app = document.getElementById('app');
  switch(currentPage){
    case 'dashboard': app.innerHTML = renderDashboard(); break;
    case 'clienti': renderClientiPage(); break;
    case 'aziende': renderAziendePage(); break;
    case 'gruppi': renderGruppiPage(); break;
    case 'calendario': renderCalendarioPage(); break;
    case 'preventivi': renderPreventiviPage(); break;
    case 'mappa': renderMappaPage(); break;
    case 'fatturato': renderFatturatoPage(); break;
    default: app.innerHTML = '<p>Sezione non trovata.</p>';
  }
}

/* ===================== DASHBOARD ===================== */
function renderDashboard(){
  const totVisiteMese = state.clients.reduce((acc,c)=>{
    const now = new Date();
    return acc + (c.visits||[]).filter(v=>{
      const d = new Date(v.date);
      return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }).length;
  },0);
  const totFatturato = state.quotes.filter(q=>q.status==='accettato')
    .reduce((acc,q)=>acc+quoteNetTotal(q),0);
  const preventiviAperti = state.quotes.filter(q=>q.status!=='accettato').length;

  return `
    <h1 class="page-title">Dashboard</h1>
    <p class="page-sub">Panoramica generale della tua attività commerciale.</p>
    <div class="grid-cards">
      <div class="stat-card"><div class="num">${state.clients.length}</div><div class="lbl">Clienti totali</div></div>
      <div class="stat-card"><div class="num">${state.companies.length}</div><div class="lbl">Aziende mandanti</div></div>
      <div class="stat-card"><div class="num">${totVisiteMese}</div><div class="lbl">Visite questo mese</div></div>
      <div class="stat-card"><div class="num">${preventiviAperti}</div><div class="lbl">Preventivi/offerte aperti</div></div>
      <div class="stat-card"><div class="num">${euro(totFatturato)}</div><div class="lbl">Fatturato totale (ordini)</div></div>
    </div>
    <div class="card" style="margin-top:18px;">
      <h3>Accesso rapido</h3>
      <div class="row">
        <button class="btn" onclick="navigate('clienti',{action:'new'})">+ Nuovo cliente</button>
        <button class="btn secondary" onclick="navigate('preventivi',{action:'new'})">+ Nuovo preventivo/offerta</button>
        <button class="btn secondary" onclick="navigate('calendario')">Registra una visita</button>
        <button class="btn secondary" onclick="navigate('aziende',{action:'new'})">+ Nuova azienda mandante</button>
      </div>
    </div>
  `;
}

/* ===================== INIT ===================== */
async function init(){
  renderNav();
  document.getElementById('app').innerHTML = '<p class="page-sub">Caricamento dati…</p>';
  await loadAll();
  navigate('dashboard');
}
init();

/* ===================== AZIENDE MANDANTI ===================== */
function renderAziendePage(){
  const app = document.getElementById('app');
  if(currentParams.action==='new' || currentParams.editId){
    return renderAziendaForm();
  }
  if(currentParams.viewId){
    return renderAziendaDetail(currentParams.viewId);
  }
  app.innerHTML = `
    <h1 class="page-title">Aziende mandanti</h1>
    <p class="page-sub">Tutte le aziende che rappresenti, con condizioni commerciali e listini.</p>
    <div class="row" style="margin-bottom:16px;">
      <button class="btn" onclick="navigate('aziende',{action:'new'})">+ Nuova azienda mandante</button>
    </div>
    ${state.companies.length===0 ? emptyState('Nessuna azienda mandante inserita', 'Aggiungi la prima azienda per iniziare a gestire listini e condizioni.') : ''}
    <div>
      ${state.companies.map(c => `
        <div class="list-item" onclick="navigate('aziende',{viewId:'${c.id}'})">
          <div>
            <strong>${escapeHtml(c.name)}</strong><br>
            <span class="small-note">Sconto1: ${c.sconto1||0}% · Sconto2: ${c.sconto2||0}% · Imballo: ${c.imballo||0}% · Articoli a listino: ${(c.priceList||[]).length}</span>
          </div>
          <span class="pill">${(c.priceList||[]).length} articoli</span>
        </div>
      `).join('')}
    </div>
  `;
}

function emptyState(title, sub){
  return `<div class="card empty-state"><div class="big">&#128193;</div><strong>${title}</strong><p class="small-note">${sub}</p></div>`;
}

function renderAziendaForm(){
  const app = document.getElementById('app');
  const editing = currentParams.editId ? state.companies.find(c=>c.id===currentParams.editId) : null;
  const c = editing || {id:uid(), name:'', sconto1:0, sconto2:0, transport:'', resi:'', imballo:0, politiche:'', priceList:[]};
  app.innerHTML = `
    <h1 class="page-title">${editing?'Modifica azienda mandante':'Nuova azienda mandante'}</h1>
    <div class="card">
      <div class="row">
        <div class="col"><label>Nome azienda</label><input id="f-name" type="text" value="${escapeHtml(c.name)}" placeholder="Es. Quadro Design"></div>
      </div>
      <div class="row">
        <div class="col"><label>Sconto 1 (%)</label><input id="f-s1" type="number" step="0.01" value="${c.sconto1}"></div>
        <div class="col"><label>Sconto 2 (%)</label><input id="f-s2" type="number" step="0.01" value="${c.sconto2}"></div>
        <div class="col"><label>Imballo predefinito (%)</label><input id="f-imb" type="number" step="0.01" value="${c.imballo}"></div>
      </div>
      <div class="row">
        <div class="col"><label>Trasporti</label><input id="f-trasp" type="text" value="${escapeHtml(c.transport)}" placeholder="Es. franco destino sopra 1.500€"></div>
        <div class="col"><label>Resi</label><input id="f-resi" type="text" value="${escapeHtml(c.resi)}" placeholder="Es. resi accettati entro 30gg"></div>
      </div>
      <label>Politiche commerciali / condizioni dedicate</label>
      <textarea id="f-pol" placeholder="Note su condizioni dedicate, accordi particolari...">${escapeHtml(c.politiche)}</textarea>
      <div class="row">
        <button class="btn" onclick="saveAzienda('${c.id}')">Salva azienda</button>
        <button class="btn secondary" onclick="navigate('aziende')">Annulla</button>
      </div>
    </div>
  `;
}

function saveAzienda(id){
  const name = document.getElementById('f-name').value.trim();
  if(!name){ toast("Inserisci il nome dell'azienda"); return; }
  let c = state.companies.find(x=>x.id===id);
  const isNew = !c;
  if(!c){ c = {id, priceList:[]}; state.companies.push(c); }
  c.name = name;
  c.sconto1 = parseFloat(document.getElementById('f-s1').value)||0;
  c.sconto2 = parseFloat(document.getElementById('f-s2').value)||0;
  c.imballo = parseFloat(document.getElementById('f-imb').value)||0;
  c.transport = document.getElementById('f-trasp').value.trim();
  c.resi = document.getElementById('f-resi').value.trim();
  c.politiche = document.getElementById('f-pol').value.trim();
  if(!c.priceList) c.priceList = [];
  saveCompanies();
  toast(isNew?'Azienda creata':'Azienda aggiornata');
  navigate('aziende',{viewId:c.id});
}

function deleteAzienda(id){
  showConfirm('Eliminare questa azienda mandante? Questa azione non può essere annullata.', () => {
    state.companies = state.companies.filter(c=>c.id!==id);
    saveCompanies();
    toast('Azienda eliminata');
    navigate('aziende');
  });
}

function renderAziendaDetail(id){
  const app = document.getElementById('app');
  const c = state.companies.find(x=>x.id===id);
  if(!c){ navigate('aziende'); return; }
  app.innerHTML = `
    <h1 class="page-title">${escapeHtml(c.name)}</h1>
    <p class="page-sub">Condizioni commerciali e listino prezzi.</p>
    <div class="row">
      <button class="btn secondary" onclick="navigate('aziende',{editId:'${c.id}'})">Modifica dati</button>
      <button class="btn danger" onclick="deleteAzienda('${c.id}')">Elimina azienda</button>
      <button class="btn secondary" onclick="navigate('aziende')">&larr; Torna all'elenco</button>
    </div>
    <div class="card" style="margin-top:14px;">
      <h3>Condizioni commerciali</h3>
      <div class="grid-cards">
        <div class="stat-card"><div class="num">${c.sconto1||0}%</div><div class="lbl">Sconto 1</div></div>
        <div class="stat-card"><div class="num">${c.sconto2||0}%</div><div class="lbl">Sconto 2</div></div>
        <div class="stat-card"><div class="num">${c.imballo||0}%</div><div class="lbl">Imballo predefinito</div></div>
      </div>
      <p><strong>Trasporti:</strong> ${escapeHtml(c.transport)||'—'}</p>
      <p><strong>Resi:</strong> ${escapeHtml(c.resi)||'—'}</p>
      <p><strong>Note/politiche:</strong> ${escapeHtml(c.politiche)||'—'}</p>
    </div>
    <div class="card">
      <h3>Listino prezzi (${(c.priceList||[]).length} articoli)</h3>
      <div class="row">
        <div class="col">
          <label>Importa listino da Excel (.xlsx/.xls/.csv)</label>
          <input type="file" id="f-excel" accept=".xlsx,.xls,.csv" onchange="importListino('${c.id}', this)">
          <p class="small-note">Colonne riconosciute: codice/articolo, descrizione, finitura, prezzo. L'importazione sostituisce il listino attuale.</p>
        </div>
      </div>
      <details style="margin-bottom:14px;">
        <summary style="cursor:pointer;color:var(--blue-dark);font-weight:bold;">+ Aggiungi articolo manualmente</summary>
        <div class="row" style="margin-top:10px;">
          <div class="col"><label>Codice</label><input id="m-code" type="text"></div>
          <div class="col" style="flex:2;"><label>Descrizione</label><input id="m-desc" type="text"></div>
          <div class="col"><label>Finitura</label><input id="m-fin" type="text"></div>
          <div class="col"><label>Prezzo listino</label><input id="m-price" type="number" step="0.01"></div>
        </div>
        <button class="btn small" onclick="addManualArticle('${c.id}')">Aggiungi articolo</button>
      </details>
      ${(c.priceList||[]).length===0 ? '<p class="small-note">Nessun articolo caricato.</p>' : `
      <div style="max-height:400px;overflow:auto;">
      <table>
        <thead><tr><th>Codice</th><th>Descrizione</th><th>Finitura</th><th>Prezzo</th><th></th></tr></thead>
        <tbody>
          ${c.priceList.map((a,idx)=>`
            <tr>
              <td>${escapeHtml(a.code)}</td>
              <td>${escapeHtml(a.description)}</td>
              <td>${escapeHtml(a.finish||'')}</td>
              <td>${euro(a.price)}</td>
              <td><span class="close-x" onclick="removeArticle('${c.id}',${idx})" title="Rimuovi">&times;</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>`}
    </div>
  `;
}

function addManualArticle(companyId){
  const c = state.companies.find(x=>x.id===companyId);
  const code = document.getElementById('m-code').value.trim();
  const desc = document.getElementById('m-desc').value.trim();
  const fin = document.getElementById('m-fin').value.trim();
  const price = parseFloat(document.getElementById('m-price').value)||0;
  if(!code || !desc){ toast('Inserisci almeno codice e descrizione'); return; }
  c.priceList.push({code, description:desc, finish:fin, price});
  saveCompanies();
  toast('Articolo aggiunto');
  renderAziendaDetail(companyId);
}

function removeArticle(companyId, idx){
  const c = state.companies.find(x=>x.id===companyId);
  c.priceList.splice(idx,1);
  saveCompanies();
  renderAziendaDetail(companyId);
}

function importListino(companyId, input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, {type:'array'});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {defval:''});
      const findKey = (row, candidates) => {
        const keys = Object.keys(row);
        for(const k of keys){
          const lk = k.toLowerCase().trim();
          if(candidates.some(c=>lk.includes(c))) return k;
        }
        return null;
      };
      const priceList = rows.map(row=>{
        const kCode = findKey(row, ['codice','articolo','cod.','sku']);
        const kDesc = findKey(row, ['descrizione','desc']);
        const kFin = findKey(row, ['finitura','colore']);
        const kPrice = findKey(row, ['prezzo','listino','importo']);
        return {
          code: kCode ? String(row[kCode]).trim() : '',
          description: kDesc ? String(row[kDesc]).trim() : '',
          finish: kFin ? String(row[kFin]).trim() : '',
          price: kPrice ? parseFloat(String(row[kPrice]).replace(',','.'))||0 : 0
        };
      }).filter(a=>a.code || a.description);
      const c = state.companies.find(x=>x.id===companyId);
      c.priceList = priceList;
      saveCompanies();
      toast(`Listino importato: ${priceList.length} articoli`);
      renderAziendaDetail(companyId);
    }catch(err){
      console.error(err);
      toast('Errore durante la lettura del file. Verifica il formato.');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ===================== CLIENTI ===================== */
const CLASSIFICAZIONI = ['Architetto','Contractor','Showroom','Rivenditore di termoidraulica','Professionista','Impresa','Privato'];
let clientDetailTab = 'anagrafica';

function renderClientiPage(){
  const app = document.getElementById('app');
  if(currentParams.action==='new' || currentParams.editId){ return renderClienteForm(); }
  if(currentParams.viewId){ clientDetailTab = currentParams.tab || 'anagrafica'; return renderClienteDetail(currentParams.viewId); }

  const filterClass = currentParams.filterClass || '';
  const search = currentParams.search || '';
  let list = state.clients.slice();
  if(filterClass) list = list.filter(c=>c.classification===filterClass);
  if(search) list = list.filter(c=>(c.name||'').toLowerCase().includes(search.toLowerCase()));

  app.innerHTML = `
    <h1 class="page-title">Clienti</h1>
    <p class="page-sub">Anagrafica clienti, classificazione, visite e condizioni.</p>
    <div class="row" style="margin-bottom:14px;">
      <button class="btn" onclick="navigate('clienti',{action:'new'})">+ Nuovo cliente</button>
      <div class="col"><input type="text" placeholder="Cerca cliente per nome..." value="${escapeHtml(search)}" oninput="filterClienti(this.value,'${filterClass}')" style="margin-bottom:0;"></div>
      <div class="col">
        <select onchange="filterClienti('${search}', this.value)" style="margin-bottom:0;">
          <option value="">Tutte le classificazioni</option>
          ${CLASSIFICAZIONI.map(c=>`<option value="${c}" ${filterClass===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    ${list.length===0 ? emptyState('Nessun cliente trovato', 'Aggiungi un nuovo cliente oppure modifica i filtri di ricerca.') : ''}
    <div>
      ${list.map(c => `
        <div class="list-item" onclick="navigate('clienti',{viewId:'${c.id}'})">
          <div>
            <strong>${escapeHtml(c.name)}</strong> ${c.classification?`<span class="pill">${c.classification}</span>`:''}<br>
            <span class="small-note">${escapeHtml(c.address||'Indirizzo non inserito')} · Visite: ${(c.visits||[]).length}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
function filterClienti(search, filterClass){ navigate('clienti',{search, filterClass}); }

function renderClienteForm(){
  const app = document.getElementById('app');
  const editing = currentParams.editId ? state.clients.find(c=>c.id===currentParams.editId) : null;
  const c = editing || {id:uid(), name:'', address:'', phone:'', email:'', classification:'', groupId:'', companiesCollab:[], competitors:[], visits:[], notes:'', lat:null, lng:null};
  app.innerHTML = `
    <h1 class="page-title">${editing?'Modifica cliente':'Nuovo cliente'}</h1>
    <div class="card">
      <h3>Dati anagrafici</h3>
      <div class="row">
        <div class="col"><label>Nome / Ragione sociale</label><input id="f-name" type="text" value="${escapeHtml(c.name)}"></div>
        <div class="col"><label>Classificazione</label>
          <select id="f-class">
            <option value="">— Seleziona —</option>
            ${CLASSIFICAZIONI.map(cl=>`<option value="${cl}" ${c.classification===cl?'selected':''}>${cl}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="row">
        <div class="col"><label>Telefono</label><input id="f-phone" type="tel" value="${escapeHtml(c.phone)}"></div>
        <div class="col"><label>Email</label><input id="f-email" type="email" value="${escapeHtml(c.email)}"></div>
      </div>
      <label>Indirizzo completo</label>
      <input id="f-address" type="text" value="${escapeHtml(c.address)}" placeholder="Via, numero civico, città, provincia">
      <div class="row">
        <div class="col">
          <label>Appartiene a un gruppo?</label>
          <select id="f-group">
            <option value="">Nessun gruppo</option>
            ${state.groups.map(g=>`<option value="${g.id}" ${c.groupId===g.id?'selected':''}>${escapeHtml(g.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="row">
        <button class="btn" onclick="saveCliente('${c.id}')">Salva cliente</button>
        <button class="btn secondary" onclick="navigate('clienti')">Annulla</button>
      </div>
    </div>
  `;
}

function saveCliente(id){
  const name = document.getElementById('f-name').value.trim();
  if(!name){ toast('Inserisci il nome del cliente'); return; }
  let c = state.clients.find(x=>x.id===id);
  const isNew = !c;
  if(!c){ c = {id, companiesCollab:[], competitors:[], visits:[], revenueByCompany:{}}; state.clients.push(c); }
  c.name = name;
  c.classification = document.getElementById('f-class').value;
  c.phone = document.getElementById('f-phone').value.trim();
  c.email = document.getElementById('f-email').value.trim();
  c.address = document.getElementById('f-address').value.trim();
  c.groupId = document.getElementById('f-group').value;
  if(!c.companiesCollab) c.companiesCollab=[];
  if(!c.competitors) c.competitors=[];
  if(!c.visits) c.visits=[];
  if(!c.revenueByCompany) c.revenueByCompany={};
  saveClients();
  toast(isNew?'Cliente creato':'Cliente aggiornato');
  navigate('clienti',{viewId:c.id});
}

function deleteCliente(id){
  showConfirm('Eliminare questo cliente? Questa azione non può essere annullata.', () => {
    state.clients = state.clients.filter(c=>c.id!==id);
    saveClients();
    toast('Cliente eliminato');
    navigate('clienti');
  });
}

function setClientTab(tab, clientId){ navigate('clienti', {viewId:clientId, tab}); }

function renderClienteDetail(id){
  const app = document.getElementById('app');
  const c = state.clients.find(x=>x.id===id);
  if(!c){ navigate('clienti'); return; }
  const tab = clientDetailTab;
  const tabs = [
    {id:'anagrafica', label:'Anagrafica'},
    {id:'commerciale', label:'Aziende & Competitor'},
    {id:'visite', label:'Storico visite'},
    {id:'fatturato', label:'Fatturato'},
  ];
  app.innerHTML = `
    <h1 class="page-title">${escapeHtml(c.name)} ${c.classification?`<span class="pill">${c.classification}</span>`:''}</h1>
    <p class="page-sub">${escapeHtml(c.address||'Indirizzo non inserito')}</p>
    <div class="row">
      <button class="btn secondary" onclick="navigate('clienti',{editId:'${c.id}'})">Modifica anagrafica</button>
      <button class="btn danger" onclick="deleteCliente('${c.id}')">Elimina cliente</button>
      <button class="btn secondary" onclick="navigate('clienti')">&larr; Torna all'elenco</button>
    </div>
    <div class="tabs" style="margin-top:16px;">
      ${tabs.map(t=>`<div class="tab ${tab===t.id?'active':''}" onclick="setClientTab('${t.id}','${c.id}')">${t.label}</div>`).join('')}
    </div>
    <div id="tabContent"></div>
  `;
  const tc = document.getElementById('tabContent');
  if(tab==='anagrafica') tc.innerHTML = renderClienteAnagraficaTab(c);
  else if(tab==='commerciale') tc.innerHTML = renderClienteCommercialeTab(c);
  else if(tab==='visite') tc.innerHTML = renderClienteVisiteTab(c);
  else if(tab==='fatturato') tc.innerHTML = renderClienteFatturatoTab(c);
}

function renderClienteAnagraficaTab(c){
  return `
    <div class="card">
      <h3>Recapiti</h3>
      <p><strong>Telefono:</strong> ${escapeHtml(c.phone)||'—'}</p>
      <p><strong>Email:</strong> ${escapeHtml(c.email)||'—'}</p>
      <p><strong>Indirizzo:</strong> ${escapeHtml(c.address)||'—'}</p>
      <p><strong>Gruppo di acquisto:</strong> ${c.groupId? escapeHtml((state.groups.find(g=>g.id===c.groupId)||{}).name||'—') : 'Nessuno'}</p>
      <hr class="section-divider">
      <h3>Geolocalizzazione</h3>
      <p class="small-note">${c.lat && c.lng ? `Posizione registrata (${c.lat.toFixed(5)}, ${c.lng.toFixed(5)})` : 'Nessuna posizione registrata per la mappa clienti.'}</p>
      <button class="btn small secondary" onclick="geolocateClient('${c.id}')">Geolocalizza indirizzo</button>
      <hr class="section-divider">
      <h3>Note generali</h3>
      <textarea id="f-cnotes" onchange="updateClientNotes('${c.id}', this.value)">${escapeHtml(c.notes||'')}</textarea>
    </div>
  `;
}

function updateClientNotes(id, val){
  const c = state.clients.find(x=>x.id===id);
  c.notes = val;
  saveClients();
  toast('Note salvate');
}

async function geolocateClient(id){
  const c = state.clients.find(x=>x.id===id);
  if(!c.address){ toast('Inserisci prima un indirizzo completo in anagrafica'); return; }
  toast('Ricerca posizione in corso...');
  try{
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(c.address);
    const res = await fetch(url);
    const data = await res.json();
    if(data && data[0]){
      c.lat = parseFloat(data[0].lat);
      c.lng = parseFloat(data[0].lon);
      saveClients();
      toast('Posizione trovata e salvata');
      renderClienteDetail(id);
    }else{
      toast('Indirizzo non trovato. Prova a renderlo più preciso.');
    }
  }catch(e){
    toast('Servizio di geolocalizzazione non raggiungibile al momento');
  }
}

function renderClienteCommercialeTab(c){
  return `
    <div class="card">
      <h3>Aziende mandanti con cui collabora</h3>
      ${state.companies.length===0 ? '<p class="small-note">Nessuna azienda mandante inserita ancora.</p>' : state.companies.map(comp=>`
        <div class="chk-row">
          <input type="checkbox" id="comp-${comp.id}" ${((c.companiesCollab||[]).includes(comp.id))?'checked':''} onchange="toggleClientCompany('${c.id}','${comp.id}', this.checked)">
          <label style="margin:0;font-weight:normal;color:var(--ink);" for="comp-${comp.id}">${escapeHtml(comp.name)}</label>
        </div>
      `).join('')}
      <hr class="section-divider">
      <h3>Competitor con cui lavora</h3>
      <div id="competitorsList">
        ${(c.competitors||[]).map((comp,idx)=>`
          <span class="pill" style="margin:2px;">${escapeHtml(comp)} <span class="close-x" style="font-size:13px;" onclick="removeCompetitor('${c.id}',${idx})">&times;</span></span>
        `).join('')}
      </div>
      <div class="row" style="margin-top:10px;">
        <div class="col"><input id="newCompetitor" type="text" placeholder="Nome competitor"></div>
        <button class="btn small" onclick="addCompetitor('${c.id}')">Aggiungi</button>
      </div>
    </div>
  `;
}

function toggleClientCompany(clientId, companyId, checked){
  const c = state.clients.find(x=>x.id===clientId);
  if(!c.companiesCollab) c.companiesCollab=[];
  if(checked && !c.companiesCollab.includes(companyId)) c.companiesCollab.push(companyId);
  if(!checked) c.companiesCollab = c.companiesCollab.filter(id=>id!==companyId);
  saveClients();
}
function addCompetitor(clientId){
  const val = document.getElementById('newCompetitor').value.trim();
  if(!val) return;
  const c = state.clients.find(x=>x.id===clientId);
  if(!c.competitors) c.competitors=[];
  c.competitors.push(val);
  saveClients();
  renderClienteDetail(clientId);
}
function removeCompetitor(clientId, idx){
  const c = state.clients.find(x=>x.id===clientId);
  c.competitors.splice(idx,1);
  saveClients();
  renderClienteDetail(clientId);
}

function renderClienteVisiteTab(c){
  const visits = (c.visits||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  return `
    <div class="card">
      <h3>Registra una nuova visita</h3>
      <div class="row">
        <div class="col"><label>Data visita</label><input id="v-date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <label>Note (argomenti trattati, cataloghi/listini lasciati, attività da ricordare)</label>
      <textarea id="v-note" placeholder="Es. Presentato nuovo listino Quadro Design, cliente interessato a doccia walk-in..."></textarea>
      <button class="btn" onclick="addVisit('${c.id}')">Salva visita</button>
    </div>
    <div class="card">
      <h3>Storico visite (${visits.length} totali)</h3>
      ${visits.length===0 ? '<p class="small-note">Nessuna visita registrata.</p>' : visits.map(v=>`
        <div class="list-item" style="cursor:default;">
          <div>
            <strong>${fmtDate(v.date)}</strong><br>
            <span class="small-note">${escapeHtml(v.note||'')}</span>
          </div>
          <span class="close-x" onclick="removeVisit('${c.id}','${v.id}')" title="Elimina visita">&times;</span>
        </div>
      `).join('')}
    </div>
  `;
}

function addVisit(clientId){
  const date = document.getElementById('v-date').value;
  const note = document.getElementById('v-note').value.trim();
  if(!date){ toast('Seleziona una data'); return; }
  const c = state.clients.find(x=>x.id===clientId);
  if(!c.visits) c.visits=[];
  c.visits.push({id:uid(), date, note});
  saveClients();
  toast('Visita registrata');
  renderClienteDetail(clientId);
}
function removeVisit(clientId, visitId){
  const c = state.clients.find(x=>x.id===clientId);
  c.visits = c.visits.filter(v=>v.id!==visitId);
  saveClients();
  renderClienteDetail(clientId);
}

function renderClienteFatturatoTab(c){
  const rev = c.revenueByCompany||{};
  const companyIds = Object.keys(rev);
  const total = companyIds.reduce((a,id)=>a+rev[id],0);
  return `
    <div class="card">
      <h3>Fatturato per azienda rappresentata</h3>
      ${companyIds.length===0 ? '<p class="small-note">Nessun ordine confermato ancora per questo cliente.</p>' : `
      <table>
        <thead><tr><th>Azienda</th><th>Fatturato</th></tr></thead>
        <tbody>
          ${companyIds.map(cid=>`<tr><td>${escapeHtml(companyName(cid))}</td><td>${euro(rev[cid])}</td></tr>`).join('')}
        </tbody>
      </table>`}
      <h3 style="margin-top:14px;">Totale complessivo: ${euro(total)}</h3>
    </div>
  `;
}

/* ===================== GRUPPI DI ACQUISTO ===================== */
function renderGruppiPage(){
  const app = document.getElementById('app');
  if(currentParams.action==='new' || currentParams.editId){ return renderGruppoForm(); }
  if(currentParams.viewId){ return renderGruppoDetail(currentParams.viewId); }
  app.innerHTML = `
    <h1 class="page-title">Gruppi di acquisto</h1>
    <p class="page-sub">Gestisci i gruppi di acquisto, i clienti associati e gli allegati commerciali.</p>
    <div class="row" style="margin-bottom:16px;">
      <button class="btn" onclick="navigate('gruppi',{action:'new'})">+ Nuovo gruppo</button>
    </div>
    ${state.groups.length===0 ? emptyState('Nessun gruppo creato', 'Crea un gruppo per raggruppare i clienti che ne fanno parte.') : ''}
    <div>
      ${state.groups.map(g=>{
        const n = state.clients.filter(c=>c.groupId===g.id).length;
        return `
        <div class="list-item" onclick="navigate('gruppi',{viewId:'${g.id}'})">
          <div><strong>${escapeHtml(g.name)}</strong><br><span class="small-note">${n} clienti · ${(g.attachments||[]).length} allegati</span></div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function renderGruppoForm(){
  const app = document.getElementById('app');
  const editing = currentParams.editId ? state.groups.find(g=>g.id===currentParams.editId) : null;
  const g = editing || {id:uid(), name:'', attachments:[]};
  app.innerHTML = `
    <h1 class="page-title">${editing?'Modifica gruppo':'Nuovo gruppo di acquisto'}</h1>
    <div class="card">
      <label>Nome gruppo</label>
      <input id="f-gname" type="text" value="${escapeHtml(g.name)}" placeholder="Es. Gruppo Termoidraulica Nord">
      <div class="row">
        <button class="btn" onclick="saveGruppo('${g.id}')">Salva gruppo</button>
        <button class="btn secondary" onclick="navigate('gruppi')">Annulla</button>
      </div>
    </div>
  `;
}

function saveGruppo(id){
  const name = document.getElementById('f-gname').value.trim();
  if(!name){ toast('Inserisci il nome del gruppo'); return; }
  let g = state.groups.find(x=>x.id===id);
  const isNew = !g;
  if(!g){ g = {id, attachments:[]}; state.groups.push(g); }
  g.name = name;
  if(!g.attachments) g.attachments=[];
  saveGroups();
  toast(isNew?'Gruppo creato':'Gruppo aggiornato');
  navigate('gruppi',{viewId:g.id});
}

function deleteGruppo(id){
  showConfirm('Eliminare questo gruppo? I clienti associati resteranno ma perderanno il riferimento al gruppo.', () => {
    state.groups = state.groups.filter(g=>g.id!==id);
    state.clients.forEach(c=>{ if(c.groupId===id) c.groupId=''; });
    saveGroups(); saveClients();
    toast('Gruppo eliminato');
    navigate('gruppi');
  });
}

function renderGruppoDetail(id){
  const app = document.getElementById('app');
  const g = state.groups.find(x=>x.id===id);
  if(!g){ navigate('gruppi'); return; }
  const clientiGruppo = state.clients.filter(c=>c.groupId===g.id);
  app.innerHTML = `
    <h1 class="page-title">${escapeHtml(g.name)}</h1>
    <div class="row">
      <button class="btn secondary" onclick="navigate('gruppi',{editId:'${g.id}'})">Rinomina gruppo</button>
      <button class="btn danger" onclick="deleteGruppo('${g.id}')">Elimina gruppo</button>
      <button class="btn secondary" onclick="navigate('gruppi')">&larr; Torna all'elenco</button>
    </div>
    <div class="card" style="margin-top:14px;">
      <h3>Clienti del gruppo (${clientiGruppo.length})</h3>
      ${clientiGruppo.length===0 ? '<p class="small-note">Nessun cliente assegnato a questo gruppo. Assegna un cliente dalla sua scheda anagrafica.</p>' : clientiGruppo.map(c=>`
        <div class="list-item" onclick="navigate('clienti',{viewId:'${c.id}'})">
          <div><strong>${escapeHtml(c.name)}</strong><br><span class="small-note">${escapeHtml(c.address||'')}</span></div>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <h3>Allegati (PDF, Excel, immagini)</h3>
      <input type="file" id="f-attach" accept=".pdf,.xlsx,.xls,.csv,image/*" onchange="addAttachment('${g.id}', this)">
      <p class="small-note">Es. accordi commerciali, listini dedicati, condizioni particolari del gruppo. File di piccole dimensioni consigliati.</p>
      ${(g.attachments||[]).length===0 ? '' : `
      <div style="margin-top:10px;">
        ${g.attachments.map((a,idx)=>`
          <div class="list-item" style="cursor:default;">
            <div><strong>${escapeHtml(a.name)}</strong><br><span class="small-note">${escapeHtml(a.type)}</span></div>
            <div>
              <a href="${a.data}" download="${escapeHtml(a.name)}" class="btn small secondary" style="text-decoration:none;">Scarica</a>
              <span class="close-x" onclick="removeAttachment('${g.id}',${idx})" title="Rimuovi">&times;</span>
            </div>
          </div>
        `).join('')}
      </div>`}
    </div>
  `;
}

function addAttachment(groupId, input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 4*1024*1024){ toast('File troppo grande (max ~4MB)'); return; }
  const reader = new FileReader();
  reader.onload = function(e){
    const g = state.groups.find(x=>x.id===groupId);
    if(!g.attachments) g.attachments=[];
    g.attachments.push({name:file.name, type:file.type||'file', data:e.target.result});
    saveGroups();
    toast('Allegato aggiunto');
    renderGruppoDetail(groupId);
  };
  reader.readAsDataURL(file);
}
function removeAttachment(groupId, idx){
  const g = state.groups.find(x=>x.id===groupId);
  g.attachments.splice(idx,1);
  saveGroups();
  renderGruppoDetail(groupId);
}

/* ===================== CALENDARIO VISITE ===================== */
function renderCalendarioPage(){
  const app = document.getElementById('app');
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  const firstDay = new Date(y, m, 1);
  const startOffset = (firstDay.getDay()+6)%7; // lunedì=0
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const monthName = calendarCursor.toLocaleDateString('it-IT', {month:'long', year:'numeric'});

  // Mappa data -> visite
  const visitsByDay = {};
  state.clients.forEach(c=>{
    (c.visits||[]).forEach(v=>{
      const d = new Date(v.date);
      if(d.getFullYear()===y && d.getMonth()===m){
        const day = d.getDate();
        if(!visitsByDay[day]) visitsByDay[day]=[];
        visitsByDay[day].push({client:c, visit:v});
      }
    });
  });

  let cells = '';
  for(let i=0;i<startOffset;i++) cells += `<div style="min-height:80px;"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const vs = visitsByDay[d]||[];
    const isToday = (new Date()).toDateString()===new Date(y,m,d).toDateString();
    cells += `
      <div style="min-height:80px;border:1px solid var(--border);border-radius:8px;padding:6px;background:${isToday?'var(--blue-lighter)':'var(--white)'};cursor:pointer;" onclick="openDayVisit(${y},${m},${d})">
        <div style="font-weight:bold;color:${isToday?'var(--blue-dark)':'var(--ink)'};font-size:12px;">${d}</div>
        ${vs.slice(0,2).map(x=>`<div class="small-note" style="background:var(--blue-light);border-radius:4px;padding:2px 4px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(x.client.name)}</div>`).join('')}
        ${vs.length>2?`<div class="small-note">+${vs.length-2} altre</div>`:''}
      </div>
    `;
  }

  app.innerHTML = `
    <h1 class="page-title">Calendario visite</h1>
    <p class="page-sub">Clicca su un giorno per registrare una visita a un cliente.</p>
    <div class="row" style="align-items:center;margin-bottom:12px;">
      <button class="btn secondary small" onclick="changeMonth(-1)">&larr; Mese prec.</button>
      <strong style="text-transform:capitalize;">${monthName}</strong>
      <button class="btn secondary small" onclick="changeMonth(1)">Mese succ. &rarr;</button>
      <button class="btn secondary small" onclick="calendarCursor=new Date();renderCalendarioPage();">Oggi</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px;">
      ${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d=>`<div class="small-note" style="text-align:center;font-weight:bold;">${d}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">${cells}</div>
    <div id="dayVisitPanel"></div>
  `;
}
function changeMonth(delta){
  calendarCursor.setMonth(calendarCursor.getMonth()+delta);
  renderCalendarioPage();
}
function openDayVisit(y,m,d){
  const dateStr = new Date(y,m,d).toISOString().slice(0,10);
  const panel = document.getElementById('dayVisitPanel');
  panel.innerHTML = `
    <div class="card" style="margin-top:16px;">
      <h3>Registra visita del ${fmtDate(dateStr)}</h3>
      <div class="row">
        <div class="col">
          <label>Cliente</label>
          <select id="cv-client">
            <option value="">— Seleziona cliente —</option>
            ${state.clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <label>Note (argomenti trattati, cataloghi/listini lasciati...)</label>
      <textarea id="cv-note"></textarea>
      <button class="btn" onclick="saveCalendarVisit('${dateStr}')">Salva visita</button>
      <hr class="section-divider">
      <h3>Visite in questo giorno</h3>
      <div id="dayVisitsList">${renderDayVisitsList(dateStr)}</div>
    </div>
  `;
}
function renderDayVisitsList(dateStr){
  const items = [];
  state.clients.forEach(c=>{
    (c.visits||[]).forEach(v=>{
      if(v.date===dateStr) items.push({client:c, visit:v});
    });
  });
  if(items.length===0) return '<p class="small-note">Nessuna visita registrata per questo giorno.</p>';
  return items.map(x=>`
    <div class="list-item" style="cursor:default;">
      <div><strong>${escapeHtml(x.client.name)}</strong><br><span class="small-note">${escapeHtml(x.visit.note||'')}</span></div>
    </div>
  `).join('');
}
function saveCalendarVisit(dateStr){
  const clientId = document.getElementById('cv-client').value;
  const note = document.getElementById('cv-note').value.trim();
  if(!clientId){ toast('Seleziona un cliente'); return; }
  const c = state.clients.find(x=>x.id===clientId);
  if(!c.visits) c.visits=[];
  c.visits.push({id:uid(), date:dateStr, note});
  saveClients();
  toast('Visita registrata e salvata nella scheda cliente');
  renderCalendarioPage();
  openDayVisit(new Date(dateStr).getFullYear(), new Date(dateStr).getMonth(), new Date(dateStr).getDate());
}

/* ===================== PREVENTIVI E OFFERTE ===================== */
let currentQuoteLines = [];
let currentQuoteMeta = {};

function newLine(direct){
  return { id:uid(), art:'', description:'', finish:'', qty:1, unitPrice:0, discount1:0, discount2:0, directNet:0, isDirectNet: !!direct };
}

function renderPreventiviPage(){
  const app = document.getElementById('app');
  if(currentParams.action==='new'){ return renderPreventivoForm(null); }
  if(currentParams.editId){ return renderPreventivoForm(currentParams.editId); }
  if(currentParams.viewId){ return renderPreventivoView(currentParams.viewId); }

  const search = currentParams.search || '';
  let list = state.quotes.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(search) list = list.filter(q=>(q.rif||'').toLowerCase().includes(search.toLowerCase()) || clientName(q.clientId).toLowerCase().includes(search.toLowerCase()));

  app.innerHTML = `
    <h1 class="page-title">Preventivi e offerte</h1>
    <p class="page-sub">Richieste clienti e offerte showroom, con esportazione PDF professionale.</p>
    <div class="row" style="margin-bottom:14px;">
      <button class="btn" onclick="navigate('preventivi',{action:'new'})">+ Nuovo preventivo/offerta</button>
      <div class="col"><input type="text" placeholder="Cerca per RIF o cliente..." value="${escapeHtml(search)}" oninput="navigate('preventivi',{search:this.value})" style="margin-bottom:0;"></div>
    </div>
    ${list.length===0 ? emptyState('Nessun preventivo o offerta creata', 'Crea il primo preventivo o offerta per un cliente o per uno showroom.') : ''}
    <div>
      ${list.map(q=>`
        <div class="list-item" onclick="navigate('preventivi',{viewId:'${q.id}'})">
          <div>
            <strong>${q.type==='offerta'?'Offerta':'Preventivo'} ${q.rif?('— RIF: '+escapeHtml(q.rif)):''}</strong>
            <span class="pill" style="background:${q.status==='accettato'?'#E7F7ED':'var(--blue-light)'};color:${q.status==='accettato'?'var(--ok)':'var(--blue-dark)'};">${q.status==='accettato'?'Accettato / Ordine':'Aperto'}</span><br>
            <span class="small-note">${escapeHtml(companyName(q.companyId))} · ${escapeHtml(clientName(q.clientId))} · ${fmtDate(q.date)} · Netto: ${euro(quoteNetTotal(q))}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function quoteLineNetTotal(line){
  if(line.isDirectNet){
    return (parseFloat(line.directNet)||0) * (parseFloat(line.qty)||0);
  }
  const listinoTotal = (parseFloat(line.unitPrice)||0) * (parseFloat(line.qty)||0);
  const afterD1 = listinoTotal * (1-(parseFloat(line.discount1)||0)/100);
  const afterD2 = afterD1 * (1-(parseFloat(line.discount2)||0)/100);
  return afterD2;
}
function quoteNetTotal(q){
  return (q.lines||[]).reduce((acc,l)=>acc+quoteLineNetTotal(l),0);
}

const CHARGE_LABELS = { iva:'IVA', trasporto:'Trasporto', imballo:'Imballo' };
const CHARGE_ESCLUSO_TEXT = { iva:'Esclusa', trasporto:'Escluso', imballo:'Escluso' };

// Calcola una singola voce (iva/trasporto/imballo) in base alla modalità scelta.
// Ritorna null se la voce non deve comparire affatto (modalità "non specificato").
function computeCharge(key, q, netto){
  const mode = q[key+'Mode'] || 'none';
  const value = parseFloat(q[key+'Value']) || 0;
  if(mode === 'none') return null;
  if(mode === 'escluso') return { mode, display: CHARGE_ESCLUSO_TEXT[key], amount: 0, included:false };
  if(mode === 'importo') return { mode, display: euro(value), amount: value, included:true };
  if(mode === 'percentuale'){
    const amt = netto * value/100;
    return { mode, display: value + '% (' + euro(amt) + ')', amount: amt, included:true };
  }
  return null;
}
function quoteCharges(q){
  const netto = quoteNetTotal(q);
  const iva = computeCharge('iva', q, netto);
  const trasporto = computeCharge('trasporto', q, netto);
  const imballo = computeCharge('imballo', q, netto);
  const totale = netto + (iva&&iva.included?iva.amount:0) + (trasporto&&trasporto.included?trasporto.amount:0) + (imballo&&imballo.included?imballo.amount:0);
  return { netto, iva, trasporto, imballo, totale };
}

function chargeFieldHtml(key, q){
  const mode = q[key+'Mode'] || 'none';
  const value = q[key+'Value']||0;
  return `
    <div class="col">
      <label>${CHARGE_LABELS[key]}</label>
      <select id="q-${key}-mode" onchange="onChargeModeChange('${key}', this.value)">
        <option value="none" ${mode==='none'?'selected':''}>Non specificato (non comparirà sul PDF)</option>
        <option value="escluso" ${mode==='escluso'?'selected':''}>Escluso</option>
        <option value="importo" ${mode==='importo'?'selected':''}>Importo (€)</option>
        <option value="percentuale" ${mode==='percentuale'?'selected':''}>Percentuale (%)</option>
      </select>
      ${(mode==='importo'||mode==='percentuale') ? `<input type="number" step="0.01" id="q-${key}-value" value="${value}" placeholder="${mode==='importo'?'Importo in €':'Percentuale %'}" onchange="onChargeValueChange('${key}', this.value)">` : ''}
    </div>
  `;
}
function onChargeModeChange(key, mode){
  currentQuoteMeta[key+'Mode'] = mode;
  renderChargesSection();
  renderQuoteSummary();
}
function onChargeValueChange(key, value){
  currentQuoteMeta[key+'Value'] = parseFloat(value)||0;
  renderQuoteSummary();
}
function renderChargesSection(){
  const el = document.getElementById('chargesFields');
  if(!el) return;
  el.innerHTML = `
    <div class="row">
      ${chargeFieldHtml('iva', currentQuoteMeta)}
      ${chargeFieldHtml('trasporto', currentQuoteMeta)}
      ${chargeFieldHtml('imballo', currentQuoteMeta)}
    </div>
  `;
}

function renderPreventivoForm(editId){
  const app = document.getElementById('app');
  const editing = editId ? state.quotes.find(q=>q.id===editId) : null;
  if(editing){
    currentQuoteMeta = {
      id:editing.id, type:editing.type, companyId:editing.companyId, clientId:editing.clientId,
      rif:editing.rif, date:editing.date, status:editing.status,
      ivaMode: editing.ivaMode || 'escluso', ivaValue: editing.ivaValue || 0,
      trasportoMode: editing.trasportoMode || 'escluso', trasportoValue: editing.trasportoValue || 0,
      // retrocompatibilità: i preventivi creati in precedenza avevano solo "imballoPercent"
      imballoMode: editing.imballoMode || (editing.imballoPercent ? 'percentuale' : 'none'),
      imballoValue: editing.imballoValue!=null ? editing.imballoValue : (editing.imballoPercent || 0)
    };
    currentQuoteLines = JSON.parse(JSON.stringify(editing.lines||[]));
  }else{
    currentQuoteMeta = {
      id:uid(), type:'preventivo', companyId:'', clientId:'', rif:'', date:new Date().toISOString().slice(0,10), status:'aperto',
      ivaMode:'escluso', ivaValue:0, trasportoMode:'escluso', trasportoValue:0, imballoMode:'none', imballoValue:0
    };
    currentQuoteLines = [newLine(false)];
  }
  app.innerHTML = `
    <h1 class="page-title">${editing?'Modifica preventivo/offerta':'Nuovo preventivo/offerta'}</h1>
    <div class="card">
      <div class="row">
        <div class="col">
          <label>Tipo</label>
          <select id="q-type" onchange="currentQuoteMeta.type=this.value">
            <option value="preventivo" ${currentQuoteMeta.type==='preventivo'?'selected':''}>Preventivo (richiesta cliente)</option>
            <option value="offerta" ${currentQuoteMeta.type==='offerta'?'selected':''}>Offerta showroom</option>
          </select>
        </div>
        <div class="col">
          <label>Azienda (mandante)</label>
          <select id="q-company" onchange="onQuoteCompanyChange(this.value)">
            <option value="">— Seleziona azienda —</option>
            ${state.companies.map(c=>`<option value="${c.id}" ${currentQuoteMeta.companyId===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col">
          <label>Data</label>
          <input id="q-date" type="date" value="${currentQuoteMeta.date}" onchange="currentQuoteMeta.date=this.value">
        </div>
      </div>
      <div class="row">
        <div class="col">
          <label>Spettabile (cliente)</label>
          <select id="q-client" onchange="onQuoteClientChange(this.value)">
            <option value="">— Seleziona cliente —</option>
            ${state.clients.map(c=>`<option value="${c.id}" ${currentQuoteMeta.clientId===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col">
          <label>RIF (riferimento)</label>
          <input id="q-rif" type="text" value="${escapeHtml(currentQuoteMeta.rif)}" placeholder="Es. nome progetto / cantiere" onchange="currentQuoteMeta.rif=this.value">
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Righe preventivo</h3>
      <p class="small-note">Seleziona l'azienda sopra per abilitare l'autocompletamento articoli dal listino. Ogni riga ha due righe di sconto in cascata sul prezzo di listino.</p>
      <div id="linesContainer"></div>
      <div class="row">
        <button class="btn secondary small" onclick="addQuoteLine(false)">+ Riga con sconti da listino</button>
        <button class="btn secondary small" onclick="addQuoteLine(true)">+ Riga con prezzo netto diretto</button>
      </div>
    </div>

    <div class="card">
      <h3>IVA, trasporto e imballo</h3>
      <p class="small-note">Per ognuna scegli se indicare un importo fisso, una percentuale sul netto, se segnarla come esclusa, oppure non specificarla (in questo caso non comparirà affatto sul PDF).</p>
      <div id="chargesFields"></div>
      <div id="quoteSummary"></div>
    </div>

    <div class="row">
      <button class="btn" onclick="saveQuote()">Salva ${currentQuoteMeta.type==='offerta'?'offerta':'preventivo'}</button>
      <button class="btn secondary" onclick="navigate('preventivi')">Annulla</button>
    </div>
  `;
  renderQuoteLines();
  renderChargesSection();
}

function onQuoteCompanyChange(val){ currentQuoteMeta.companyId = val; renderQuoteLines(); }
function onQuoteClientChange(val){ currentQuoteMeta.clientId = val; }

function addQuoteLine(direct){
  currentQuoteLines.push(newLine(direct));
  renderQuoteLines();
}
function removeQuoteLine(lineId){
  currentQuoteLines = currentQuoteLines.filter(l=>l.id!==lineId);
  renderQuoteLines();
}

function renderQuoteLines(){
  const container = document.getElementById('linesContainer');
  const company = state.companies.find(c=>c.id===currentQuoteMeta.companyId);
  const priceList = company ? (company.priceList||[]) : [];
  const datalistId = 'articoli-datalist';

  container.innerHTML = `
    <datalist id="${datalistId}">
      ${priceList.map(a=>`<option value="${escapeHtml(a.code)}">`).join('')}
    </datalist>
    ${currentQuoteLines.map(line=>`
      <div class="quote-line-row" id="row-${line.id}">
        <div class="row" style="align-items:flex-end;">
          <div class="col" style="max-width:140px;">
            <label>Art. (codice)</label>
            <input type="text" list="${datalistId}" value="${escapeHtml(line.art)}" oninput="setLineArt('${line.id}', this.value)" onchange="onLineArtInput('${line.id}', this.value)">
          </div>
          <div class="col" style="flex:2;min-width:220px;">
            <label>Descrizione</label>
            <input type="text" id="desc-${line.id}" value="${escapeHtml(line.description)}" onchange="updateLineField('${line.id}','description',this.value)">
          </div>
          <div class="col" style="max-width:130px;">
            <label>Finitura</label>
            <input type="text" id="fin-${line.id}" value="${escapeHtml(line.finish)}" onchange="updateLineField('${line.id}','finish',this.value)">
          </div>
          <div class="col" style="max-width:90px;">
            <label>Quantità</label>
            <input type="number" min="0" step="1" id="qty-${line.id}" value="${line.qty}" onchange="updateLineField('${line.id}','qty',this.value)">
          </div>
          <div class="close-x" onclick="removeQuoteLine('${line.id}')" title="Rimuovi riga">&times;</div>
        </div>
        ${line.isDirectNet ? `
        <div class="row">
          <div class="col" style="max-width:180px;"><label>Prezzo netto unitario (diretto)</label><input type="number" step="0.01" id="net-${line.id}" value="${line.directNet}" onchange="updateLineField('${line.id}','directNet',this.value)"></div>
          <div class="col"><p class="small-note">Riga a prezzo netto diretto: nessun prezzo di listino né sconto applicati.</p></div>
        </div>
        ` : `
        <div class="row">
          <div class="col" style="max-width:140px;"><label>Prezzo listino unitario</label><input type="number" step="0.01" id="price-${line.id}" value="${line.unitPrice}" onchange="updateLineField('${line.id}','unitPrice',this.value)"></div>
          <div class="col" style="max-width:110px;"><label>Sconto 1 (%)</label><input type="number" step="0.01" value="${line.discount1}" onchange="updateLineField('${line.id}','discount1',this.value)"></div>
          <div class="col" style="max-width:110px;"><label>Sconto 2 (%)</label><input type="number" step="0.01" value="${line.discount2}" onchange="updateLineField('${line.id}','discount2',this.value)"></div>
          <div class="col"><label>Prezzo netto riga</label><input type="text" id="netcell-${line.id}" disabled value="${euro(quoteLineNetTotal(line))}"></div>
        </div>
        `}
      </div>
    `).join('')}
  `;
  renderQuoteSummary();
}

function setLineArt(lineId, code){
  const line = currentQuoteLines.find(l=>l.id===lineId);
  if(!line) return;
  line.art = code;
  // Autocompletamento "live" senza ricostruire il DOM, per non perdere il focus sul campo
  const company = state.companies.find(c=>c.id===currentQuoteMeta.companyId);
  if(company){
    const match = (company.priceList||[]).find(a=>a.code===code);
    if(match){
      line.description = match.description;
      line.finish = match.finish||'';
      const descEl = document.getElementById('desc-'+lineId);
      const finEl = document.getElementById('fin-'+lineId);
      if(descEl) descEl.value = match.description;
      if(finEl) finEl.value = match.finish||'';
      if(!line.isDirectNet){
        line.unitPrice = match.price;
        const priceEl = document.getElementById('price-'+lineId);
        if(priceEl) priceEl.value = match.price;
        const netEl = document.getElementById('netcell-'+lineId);
        if(netEl) netEl.value = euro(quoteLineNetTotal(line));
      }
      renderQuoteSummary();
    }
  }
}
function onLineArtInput(lineId, code){
  // Eseguito su blur/Invio: assicura che tutto sia coerente e aggiorna eventuale riepilogo
  const line = currentQuoteLines.find(l=>l.id===lineId);
  if(!line) return;
  line.art = code;
  const company = state.companies.find(c=>c.id===currentQuoteMeta.companyId);
  if(company){
    const match = (company.priceList||[]).find(a=>a.code===code);
    if(match){
      line.description = match.description;
      line.finish = match.finish||'';
      if(!line.isDirectNet) line.unitPrice = match.price;
    }
  }
  renderQuoteLines();
}
function updateLineField(lineId, field, value){
  const line = currentQuoteLines.find(l=>l.id===lineId);
  if(field==='description' || field==='finish'){ line[field]=value; }
  else{ line[field] = parseFloat(value)||0; }
  renderQuoteSummary();
  // Update net-price cell display without full rerender to keep focus
  const summaryOnly = document.getElementById('quoteSummary');
  if(summaryOnly) renderQuoteLinesLight();
}
function renderQuoteLinesLight(){
  // Refresh only computed net values without losing input focus: safe full rerender since blur already occurred (onchange)
  renderQuoteLines();
}

function renderQuoteSummary(){
  const el = document.getElementById('quoteSummary');
  if(!el) return;
  const tempQuote = Object.assign({}, currentQuoteMeta, {lines: currentQuoteLines});
  const ch = quoteCharges(tempQuote);
  const rows = [{ label:'Netto totale', value: euro(ch.netto) }];
  if(ch.iva) rows.push({ label:'IVA', value: ch.iva.display });
  if(ch.trasporto) rows.push({ label:'Trasporto', value: ch.trasporto.display });
  if(ch.imballo) rows.push({ label:'Imballo', value: ch.imballo.display });
  rows.push({ label:'Totale documento', value: euro(ch.totale) });
  el.innerHTML = `
    <div class="grid-cards" style="margin-top:12px;">
      ${rows.map(r=>`<div class="stat-card"><div class="num" style="font-size:16px;">${r.value}</div><div class="lbl">${r.label}</div></div>`).join('')}
    </div>
  `;
}

function saveQuote(){
  if(!currentQuoteMeta.companyId){ toast("Seleziona l'azienda"); return; }
  if(!currentQuoteMeta.clientId){ toast('Seleziona il cliente'); return; }
  const existingIdx = state.quotes.findIndex(q=>q.id===currentQuoteMeta.id);
  const quote = Object.assign({}, currentQuoteMeta, {lines: currentQuoteLines});
  if(existingIdx>=0) state.quotes[existingIdx] = quote;
  else state.quotes.push(quote);
  saveQuotes();
  toast('Preventivo salvato');
  navigate('preventivi',{viewId:quote.id});
}

function renderPreventivoView(id){
  const app = document.getElementById('app');
  const q = state.quotes.find(x=>x.id===id);
  if(!q){ navigate('preventivi'); return; }
  const ch = quoteCharges(q);
  const summaryCards = [
    `<div class="stat-card"><div class="num">${euro(ch.netto)}</div><div class="lbl">Netto totale</div></div>`,
    ch.iva ? `<div class="stat-card"><div class="num" style="font-size:16px;">${ch.iva.display}</div><div class="lbl">IVA</div></div>` : '',
    ch.trasporto ? `<div class="stat-card"><div class="num" style="font-size:16px;">${ch.trasporto.display}</div><div class="lbl">Trasporto</div></div>` : '',
    ch.imballo ? `<div class="stat-card"><div class="num" style="font-size:16px;">${ch.imballo.display}</div><div class="lbl">Imballo</div></div>` : '',
    `<div class="stat-card"><div class="num">${euro(ch.totale)}</div><div class="lbl">Totale documento</div></div>`
  ].join('');
  app.innerHTML = `
    <h1 class="page-title">${q.type==='offerta'?'Offerta':'Preventivo'} ${q.rif?('— RIF: '+escapeHtml(q.rif)):''}</h1>
    <p class="page-sub">${escapeHtml(companyName(q.companyId))} · Spettabile ${escapeHtml(clientName(q.clientId))} · ${fmtDate(q.date)}</p>
    <div class="row" style="margin-bottom:14px;">
      <button class="btn secondary" onclick="navigate('preventivi',{editId:'${q.id}'})">Modifica</button>
      <button class="btn secondary" onclick="exportQuotePDF('${q.id}')">Esporta PDF</button>
      ${q.status!=='accettato' ? `<button class="btn" onclick="acceptQuote('${q.id}')">Segna come accettato / Ordine</button>` : `<span class="pill" style="background:#E7F7ED;color:var(--ok);">Accettato / Ordine</span>`}
      <button class="btn danger" onclick="deleteQuote('${q.id}')">Elimina</button>
      <button class="btn secondary" onclick="navigate('preventivi')">&larr; Torna all'elenco</button>
    </div>
    <div class="card">
      <table>
        <thead><tr>
          <th>Art.</th><th>Descrizione</th><th>Finitura</th><th>Qtà</th>
          <th>Prezzo unit.</th><th>Prezzo tot.</th><th>Sc.1</th><th>Sc.2</th><th>Netto</th>
        </tr></thead>
        <tbody>
          ${(q.lines||[]).map(l=>`
            <tr>
              <td>${escapeHtml(l.art)}</td>
              <td>${escapeHtml(l.description)}</td>
              <td>${escapeHtml(l.finish||'')}</td>
              <td>${l.qty}</td>
              <td>${l.isDirectNet ? '—' : euro(l.unitPrice)}</td>
              <td>${l.isDirectNet ? '—' : euro((l.unitPrice||0)*(l.qty||0))}</td>
              <td>${l.isDirectNet ? '—' : (l.discount1||0)+'%'}</td>
              <td>${l.isDirectNet ? '—' : (l.discount2||0)+'%'}</td>
              <td>${euro(quoteLineNetTotal(l))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <hr class="section-divider">
      <div class="grid-cards">
        ${summaryCards}
      </div>
    </div>
  `;
}

function deleteQuote(id){
  showConfirm('Eliminare questo preventivo/offerta? Questa azione non può essere annullata.', () => {
    state.quotes = state.quotes.filter(q=>q.id!==id);
    saveQuotes();
    toast('Preventivo/offerta eliminato');
    navigate('preventivi');
  });
}

function acceptQuote(id){
  const q = state.quotes.find(x=>x.id===id);
  if(q.status==='accettato') return;
  q.status='accettato';
  saveQuotes();
  const c = state.clients.find(x=>x.id===q.clientId);
  if(c){
    if(!c.revenueByCompany) c.revenueByCompany={};
    const netto = quoteNetTotal(q);
    c.revenueByCompany[q.companyId] = (c.revenueByCompany[q.companyId]||0) + netto;
    saveClients();
  }
  toast('Preventivo trasformato in ordine: fatturato aggiornato');
  renderPreventivoView(id);
}

function showPdfPreview(blobUrl, filename, title){
  document.getElementById('pdfPreviewTitle').textContent = title || 'Anteprima PDF';
  document.getElementById('pdfPreviewFrame').src = blobUrl;
  const dl = document.getElementById('pdfDownloadLink');
  dl.href = blobUrl;
  dl.setAttribute('download', filename);
  const openTab = document.getElementById('pdfOpenTabLink');
  openTab.href = blobUrl;
  document.getElementById('pdfPreviewOverlay').style.display = 'flex';
}
function closePdfPreview(){
  document.getElementById('pdfPreviewOverlay').style.display = 'none';
  document.getElementById('pdfPreviewFrame').src = '';
}

function drawTableManually(doc, startY, head, rows, colWidths){
  const startX = 14;
  const rowH = 7;
  let y = startY;
  doc.setFillColor(45,125,210);
  doc.setTextColor(255,255,255);
  doc.setFontSize(8);
  doc.setFont('helvetica','bold');
  let x = startX;
  doc.rect(startX, y, colWidths.reduce((a,b)=>a+b,0), rowH, 'F');
  head.forEach((h,i)=>{ doc.text(String(h), x+2, y+5); x+=colWidths[i]; });
  y += rowH;
  doc.setTextColor(20,20,20);
  doc.setFont('helvetica','normal');
  rows.forEach(row=>{
    if(y > 275){ doc.addPage(); y = 20; }
    x = startX;
    doc.setDrawColor(225,232,238);
    doc.rect(startX, y, colWidths.reduce((a,b)=>a+b,0), rowH);
    row.forEach((cell,i)=>{
      const text = String(cell);
      doc.text(text.length>28?text.slice(0,26)+'…':text, x+2, y+5);
      x += colWidths[i];
    });
    y += rowH;
  });
  return y;
}

function exportQuotePDF(id){
  const q = state.quotes.find(x=>x.id===id);
  if(!q){ toast('Preventivo non trovato'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ toast('Libreria PDF non disponibile, riprova tra qualche secondo'); return; }
  try{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const company = companyName(q.companyId);
    const client = clientName(q.clientId);

    doc.setFont('helvetica','bold');
    doc.setFontSize(16);
    doc.text(company, 14, 18);
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    doc.text('Data: ' + fmtDate(q.date), 14, 26);
    doc.text('Spettabile: ' + client, 14, 32);
    if(q.rif) doc.text('RIF: ' + q.rif, 14, 38);
    doc.setFontSize(12);
    doc.text(q.type==='offerta' ? 'OFFERTA' : 'PREVENTIVO', 165, 18);

    const head = ['Articolo','Descrizione','Finitura','Qtà','Prezzo unitario','Prezzo totale','Sc.1','Sc.2','Prezzo netto'];
    const rows = (q.lines||[]).map(l=>[
      l.art||'', l.description||'', l.finish||'', String(l.qty||0),
      l.isDirectNet ? '—' : euro(l.unitPrice),
      l.isDirectNet ? '—' : euro((l.unitPrice||0)*(l.qty||0)),
      l.isDirectNet ? '—' : (l.discount1||0)+'%',
      l.isDirectNet ? '—' : (l.discount2||0)+'%',
      euro(quoteLineNetTotal(l))
    ]);

    let finalY;
    if(typeof doc.autoTable === 'function'){
      doc.autoTable({
        startY: 44,
        head: [head],
        body: rows,
        styles:{font:'helvetica', fontSize:8, cellPadding:3},
        headStyles:{fillColor:[45,125,210], textColor:255, fontSize:7.5},
        columnStyles:{
          3:{halign:'right'}, 4:{halign:'right'}, 5:{halign:'right'},
          6:{halign:'right'}, 7:{halign:'right'}, 8:{halign:'right'}
        },
        theme:'grid'
      });
      finalY = doc.lastAutoTable.finalY;
    } else {
      // Riserva: disegno manuale della tabella se il plugin non è disponibile
      const colWidths = [18,48,16,10,26,26,12,12,22];
      finalY = drawTableManually(doc, 44, head, rows, colWidths);
    }

    let y = finalY + 10;
    const ch = quoteCharges(q);
    doc.setFontSize(10);
    doc.setTextColor(20,20,20);
    doc.text('Netto totale: ' + euro(ch.netto), 140, y); y+=6;
    if(ch.iva){ doc.text('IVA: ' + ch.iva.display, 140, y); y+=6; }
    if(ch.trasporto){ doc.text('Trasporto: ' + ch.trasporto.display, 140, y); y+=6; }
    if(ch.imballo){ doc.text('Imballo: ' + ch.imballo.display, 140, y); y+=6; }
    doc.setFont('helvetica','bold');
    doc.text('Totale documento: ' + euro(ch.totale), 140, y); y+=10;
    doc.setFont('helvetica','normal');
    const filename = (q.type==='offerta'?'Offerta_':'Preventivo_') + (q.rif||q.id).replace(/[^a-z0-9_\-]/gi,'_') + '.pdf';
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    showPdfPreview(blobUrl, filename, (q.type==='offerta'?'Offerta':'Preventivo') + (q.rif?(' — RIF: '+q.rif):''));
    toast('PDF generato: usa "Scarica" o "Apri in nuova scheda"');
  }catch(err){
    console.error('Errore esportazione PDF', err);
    toast('Errore durante la creazione del PDF. Riprova.');
  }
}

/* ===================== MAPPA CLIENTI ===================== */
let leafletMap = null;
function renderMappaPage(){
  const app = document.getElementById('app');
  const withCoords = state.clients.filter(c=>c.lat && c.lng);
  app.innerHTML = `
    <h1 class="page-title">Mappa clienti</h1>
    <p class="page-sub">Posizione dei clienti geolocalizzati (${withCoords.length} su ${state.clients.length}).</p>
    ${withCoords.length===0 ? emptyState('Nessun cliente geolocalizzato', 'Vai sulla scheda di un cliente e usa "Geolocalizza indirizzo" nella tab Anagrafica.') : '<div id="map"></div>'}
  `;
  if(withCoords.length===0) return;
  setTimeout(()=>{
    if(leafletMap){ leafletMap.remove(); leafletMap=null; }
    leafletMap = L.map('map').setView([withCoords[0].lat, withCoords[0].lng], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);
    const bounds = [];
    withCoords.forEach(c=>{
      const marker = L.marker([c.lat, c.lng]).addTo(leafletMap);
      marker.bindPopup(`<strong>${escapeHtml(c.name)}</strong><br>${escapeHtml(c.address||'')}`);
      bounds.push([c.lat, c.lng]);
    });
    if(bounds.length>1) leafletMap.fitBounds(bounds, {padding:[30,30]});
  }, 50);
}

/* ===================== FATTURATO ===================== */
function renderFatturatoPage(){
  const app = document.getElementById('app');
  const byCompany = {};
  let totalAll = 0;
  state.clients.forEach(c=>{
    Object.entries(c.revenueByCompany||{}).forEach(([cid,val])=>{
      byCompany[cid] = (byCompany[cid]||0) + val;
      totalAll += val;
    });
  });
  const clientsWithRevenue = state.clients.filter(c=>c.revenueByCompany && Object.keys(c.revenueByCompany).length>0)
    .sort((a,b)=>{
      const ta = Object.values(a.revenueByCompany).reduce((x,y)=>x+y,0);
      const tb = Object.values(b.revenueByCompany).reduce((x,y)=>x+y,0);
      return tb-ta;
    });

  app.innerHTML = `
    <h1 class="page-title">Fatturato</h1>
    <p class="page-sub">Fatturato generato dai preventivi/offerte segnati come "Accettato / Ordine".</p>
    <div class="card">
      <h3>Totale per azienda mandante</h3>
      ${Object.keys(byCompany).length===0 ? '<p class="small-note">Nessun ordine confermato ancora.</p>' : `
      <table>
        <thead><tr><th>Azienda</th><th>Fatturato</th></tr></thead>
        <tbody>${Object.entries(byCompany).map(([cid,val])=>`<tr><td>${escapeHtml(companyName(cid))}</td><td>${euro(val)}</td></tr>`).join('')}</tbody>
      </table>`}
      <h3 style="margin-top:14px;">Totale complessivo: ${euro(totalAll)}</h3>
    </div>
    <div class="card">
      <h3>Fatturato per cliente</h3>
      ${clientsWithRevenue.length===0 ? '<p class="small-note">Nessun cliente con ordini confermati.</p>' : clientsWithRevenue.map(c=>{
        const tot = Object.values(c.revenueByCompany).reduce((x,y)=>x+y,0);
        return `
        <div class="list-item" onclick="navigate('clienti',{viewId:'${c.id}', tab:'fatturato'})">
          <div><strong>${escapeHtml(c.name)}</strong></div>
          <span class="pill">${euro(tot)}</span>
        </div>`;
      }).join('')}
    </div>
  `;
}

</script>
</body>
</html>
