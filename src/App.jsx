import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Users, Building2, CalendarDays, FileText, LogOut, Menu as MenuIcon, LayoutDashboard, ShieldCheck,
  Printer, Map as MapIcon, Upload, TrendingUp, Wallet, ClipboardList, Briefcase, Users2, ChevronDown, ChevronRight, Search, Bell, Plus, Clock3, Target, ArrowUpRight, StickyNote, Settings, BarChart3, CheckSquare, Check,
} from "lucide-react";


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;


const COLORS = {
  primary: "#3577ec", primaryDark: "#205ed3", bg: "#f6f8fc", card: "#ffffff",
  border: "#e6eaf1", text: "#17233b", muted: "#78859a", danger: "#c0392b", success: "#1a7a3c",
};

const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const GIORNI_SETTIMANA = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const CLASSIFICAZIONI = ["Architetto","Contractor","Showroom","Rivenditore termoidraulica","Professionista","Impresa","Privato"];
const STATI_PREVENTIVO = [
  { valore: "bozza", label: "Bozza", colore: "#9aa7b2" },
  { valore: "inviato", label: "Inviato", colore: "#d4a017" },
  { valore: "accettato", label: "Accettato", colore: "#1a7a3c" },
  { valore: "rifiutato", label: "Rifiutato", colore: "#c0392b" },
];

function formattaEuro(n) {
  return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function formattaNumero(n) {
  return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function makeSupabaseClient(url, key) {
  const authHeaders = (token) => ({ "Content-Type": "application/json", apikey: key, Authorization: "Bearer " + (token || key) });
  return {
    auth: {
      async signInWithPassword({ email, password }) {
        const res = await crmFetch(url + "/auth/v1/token?grant_type=password", { method: "POST", headers: authHeaders(), body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        return { data, error: null };
      },
      async signUp({ email, password }) {
        const res = await crmFetch(url + "/auth/v1/signup", { method: "POST", headers: authHeaders(), body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        return { data, error: null };
      },
    },
  };
}

// Fase Sicurezza: tutte le scritture REST sulle tabelle commerciali ereditano
// l'agenzia del proprietario autenticato. Non si usano mai ID hardcoded.
const CRM_AGENCY_TABLES = new Set([
  'appuntamenti','attivita_cliente','aziende_mandanti','clienti',
  'crm_attivita','crm_campionature','crm_followup_preventivi',
  'crm_liquidazioni_provvigioni','crm_provvigioni_ordini','crm_relazioni_mandanti',
  'documenti_cliente','opportunita_commerciali','ordini','ordini_confermati',
  'preventivi','visite',
  'fatturato_commerciale','gruppi_acquisto','listini','note_crm',
  'portafoglio_ordini','sedi_cliente'
]);
const crmAgencyCache = new Map();
async function crmAgencyId(token) {
  if (!token) throw new Error('Sessione non disponibile: impossibile associare l’agenzia.');
  if (!crmAgencyCache.has(token)) {
    const pending = (async () => {
      const r = await fetch(SUPABASE_URL + '/rest/v1/crm_agenzie?select=id&limit=2', {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
      });
      if (!r.ok) throw new Error('Impossibile verificare l’agenzia dell’utente (' + r.status + ').');
      const rows = await r.json();
      if (rows.length !== 1) throw new Error('È necessaria una sola agenzia di proprietà per questo account.');
      return rows[0].id;
    })();
    crmAgencyCache.set(token, pending);
    pending.catch(() => crmAgencyCache.delete(token));
  }
  return crmAgencyCache.get(token);
}
async function crmFetch(url, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  if (method !== 'POST' || !options.body || typeof url !== 'string' ||
      !url.startsWith(SUPABASE_URL + '/rest/v1/')) return fetch(url, options);
  const table = url.slice((SUPABASE_URL + '/rest/v1/').length).split(/[?/#]/)[0];
  if (!CRM_AGENCY_TABLES.has(table)) return fetch(url, options);
  const auth = options.headers?.Authorization || options.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let body;
  try { body = JSON.parse(options.body); } catch { return fetch(url, options); }
  if (!body || typeof body !== 'object') return fetch(url, options);
  const agencyId = await crmAgencyId(token);
  const addAgency = row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
    if (row.agenzia_id && row.agenzia_id !== agencyId)
      throw new Error('L’agenzia del record non corrisponde all’utente autenticato.');
    return { ...row, agenzia_id: agencyId };
  };
  body = Array.isArray(body) ? body.map(addAgency) : addAgency(body);
  return fetch(url, { ...options, body: JSON.stringify(body) });
}

async function geocodificaIndirizzo(indirizzo) {
  try {
    const res = await crmFetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(indirizzo));
    const data = await res.json();
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (e) {}
  return null;
}

function caricaLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
    script.onload = () => resolve(window.L);
    document.body.appendChild(script);
  });
}

async function registraAttivita(session, clienteId, tipo, descrizione) {
  try {
    await crmFetch(SUPABASE_URL + "/rest/v1/attivita_cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ cliente_id: clienteId, tipo, descrizione }),
    });
  } catch (e) {}
}

async function caricaFileStorage(session, bucket, path, file) {
  const res = await crmFetch(SUPABASE_URL + "/storage/v1/object/" + bucket + "/" + path, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token },
    body: file,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error("Storage HTTP " + res.status + ": " + (data.message || data.error || "Errore nel caricamento del file") + (res.status === 400 && String(data.message || "").toLowerCase().includes("bucket not found") ? ". Il bucket documenti-clienti non esiste in questo progetto Supabase: va creato in Storage." : ""));
  }
  return path;
}
// Le immagini dei preventivi sono nel bucket privato: usare URL firmati, mai URL pubblici.
function percorsoImmaginePrivata(value) {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("storage:")) return value.slice(8);
  const prefix = SUPABASE_URL + "/storage/v1/object/public/documenti-clienti/";
  if (value.startsWith(prefix)) return decodeURIComponent(value.slice(prefix.length).split("?")[0]);
  return null;
}
async function urlImmagineAutorizzata(session, value) {
  const path = percorsoImmaginePrivata(value);
  if (!path) return value;
  if (!session?.access_token) throw new Error("Sessione scaduta: accedi nuovamente al CRM");
  const res = await crmFetch(SUPABASE_URL + "/storage/v1/object/sign/documenti-clienti/" + path.split("/").map(encodeURIComponent).join("/"), {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.signedURL) throw new Error("Impossibile leggere l'immagine privata: " + (json.message || res.status));
  const signed = json.signedURL;
  return signed.startsWith("http") ? signed : SUPABASE_URL + (signed.startsWith("/storage/v1/") ? signed : "/storage/v1" + (signed.startsWith("/") ? signed : "/" + signed));
}
function ImmaginePreventivo({ session, value, style }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let attivo = true;
    setUrl("");
    if (value) urlImmagineAutorizzata(session, value).then(u => { if (attivo) setUrl(u); }).catch(err => console.warn("Immagine preventivo", err));
    return () => { attivo = false; };
  }, [value, session?.access_token]);
  return url ? <img src={url} alt="Articolo" style={style} /> : <span title="Immagine in caricamento" style={{ display: "inline-block", width: style?.width || 32, height: style?.height || 32, background: "#f1f5f9", borderRadius: 4 }} />;
}
function urlPubblicoStorage(bucket, path) {
  return SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + path;
}

function toISODate(d) { return d.toISOString().slice(0, 10); }
function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getMonthGrid(date) {
  const start = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
  const days = [];
  for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  return days;
}
function getWeekDays(date) {
  const start = startOfWeek(date);
  const days = [];
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  return days;
}

function nuovaRiga() {
  return {
    id: Math.random().toString(36).slice(2), articolo: "", descrizione: "", finitura: "",
    quantita: 1, unita_misura: "PZ", prezzo_unitario: 0, sconto1: "", sconto2: "", sconto3: "",
    prezzo_netto_manuale: "", immagine_url: "",
  };
}
const UNITA_MISURA_PREVENTIVO = ["PZ", "MQ", "ML", "NR", "KG", "ALTRO"];
function SelettoreUnitaPreventivo({ value, onChange, style }) {
  const corrente = String(value || "").toUpperCase();
  const standard = UNITA_MISURA_PREVENTIVO.includes(corrente) && corrente !== "ALTRO";
  const [personalizzato, setPersonalizzato] = useState(false);
  const altro = personalizzato || (!!corrente && !standard);
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <select aria-label="Unità di misura" value={altro ? "ALTRO" : (corrente || "PZ")} onChange={e => { if (e.target.value === "ALTRO") { setPersonalizzato(true); onChange(""); } else { setPersonalizzato(false); onChange(e.target.value); } }} style={style}>
      {UNITA_MISURA_PREVENTIVO.map(u => <option key={u} value={u}>{u}</option>)}
    </select>
    {altro && <input aria-label="Unità personalizzata" placeholder="Unità personalizzata" value={value || ""} onChange={e => onChange(e.target.value)} style={style} />}
  </div>;
}
function calcolaRigaNetto(riga) {
  const qta = Number(riga.quantita) || 0;
  const totaleListino = qta * (Number(riga.prezzo_unitario) || 0);
  if (riga.prezzo_netto_manuale !== undefined && riga.prezzo_netto_manuale !== "" && riga.prezzo_netto_manuale !== null) {
    const nettoUnitarioManuale = Number(riga.prezzo_netto_manuale) || 0;
    return { totaleListino, netto: nettoUnitarioManuale * qta };
  }
  const dopoSconto1 = totaleListino * (1 - (Number(riga.sconto1) || 0) / 100);
  const dopoSconto2 = dopoSconto1 * (1 - (Number(riga.sconto2) || 0) / 100);
  const dopoSconto3 = dopoSconto2 * (1 - (Number(riga.sconto3) || 0) / 100);
  return { totaleListino, netto: dopoSconto3 };
}
function calcolaValoreVoce(modalita, percentuale, valoreEuro, base) {
  if (modalita === "nascosto" || modalita === "escluso") return 0;
  if (modalita === "percentuale") return base * ((Number(percentuale) || 0) / 100);
  if (modalita === "euro") return Number(valoreEuro) || 0;
  return 0;
}
function calcolaTotaliPreventivo(t, righeArr) {
  const totaleNetto = righeArr.reduce((sum, riga) => sum + calcolaRigaNetto(riga).netto, 0);
  const valoreImballo = calcolaValoreVoce(t.imballo_modalita, t.imballo_percentuale, t.imballo_valore, totaleNetto);
  const sub1 = totaleNetto + valoreImballo;
  const valoreTrasporto = calcolaValoreVoce(t.trasporto_modalita, t.trasporto_percentuale, t.trasporto_valore, sub1);
  const sub2 = sub1 + valoreTrasporto;
  const valoreIva = calcolaValoreVoce(t.iva_modalita, t.iva_percentuale, t.iva_valore, sub2);
  const totaleFinale = sub2 + valoreIva;
  return { totaleNetto, valoreImballo, valoreTrasporto, valoreIva, totaleFinale };
}
function combinaRicaviPerAzienda(ordini, preventivi, aziendaId) {
  return ordini.filter((o) => o.azienda_id === aziendaId).map((o) => ({ cliente_id: o.cliente_id, importo: Number(o.importo) || 0, data: o.data_ordine }));
}

function generaStampaHTML(preventivo, clienti, aziende) {
  const cliente = clienti.find((c) => c.id === preventivo.cliente_id);
  const azienda = aziende.find((a) => a.id === preventivo.azienda_id);
  const righeArr = preventivo.righe || [];
  const tot = calcolaTotaliPreventivo(preventivo, righeArr);
  const soloNetto = preventivo.modalita_prezzi_pdf === "solo_netto";

  const intestazioneColonne = soloNetto
    ? "<th>Img</th><th>Articolo</th><th>Descrizione</th><th>Finitura</th><th>Qtà</th><th>U.M.</th><th>Prezzo netto un.</th><th>Prezzo netto totale</th>"
    : "<th>Img</th><th>Articolo</th><th>Descrizione</th><th>Finitura</th><th>Qtà</th><th>U.M.</th><th>Prezzo listino un.</th><th>Sc.1</th><th>Sc.2</th><th>Sc.3</th><th>Prezzo netto un.</th><th>Prezzo netto totale</th>";

  const righeHtml = righeArr.map((riga) => {
    const { netto } = calcolaRigaNetto(riga);
    const qta = Number(riga.quantita) || 0;
    const nettoUnitario = qta > 0 ? netto / qta : netto;
    const cellaImg = "<td>" + (riga.immagine_url ? '<img src="' + riga.immagine_url + '" style="max-width:60px;max-height:60px;width:auto;height:auto;object-fit:contain;border-radius:4px;" />' : "") + "</td>";
    if (soloNetto) {
      return "<tr>" + cellaImg + "<td>" + (riga.articolo || "") + "</td><td>" + (riga.descrizione || "") + "</td><td>" + (riga.finitura || "") + "</td><td>" + (riga.quantita || "") + "</td><td>" + (riga.unita_misura || "") + "</td><td>" + formattaNumero(nettoUnitario) + "</td><td>" + formattaNumero(netto) + "</td></tr>";
    }
    return "<tr>" + cellaImg + "<td>" + (riga.articolo || "") + "</td><td>" + (riga.descrizione || "") + "</td><td>" + (riga.finitura || "") + "</td><td>" + (riga.quantita || "") + "</td><td>" + (riga.unita_misura || "") + "</td><td>" + formattaNumero(riga.prezzo_unitario) + "</td><td>" + (riga.sconto1 || 0) + "%</td><td>" + (riga.sconto2 || 0) + "%</td><td>" + (riga.sconto3 || 0) + "%</td><td>" + formattaNumero(nettoUnitario) + "</td><td>" + formattaNumero(netto) + "</td></tr>";
  }).join("");

  function rigaVoce(label, modalita, valore, valoreGrezzo, percentuale) {
    if (modalita === "nascosto") return "";
    if (modalita === "escluso") return "<div>" + label + ": escluso</div>";
    if (modalita === "percentuale") return "<div>" + label + ": " + formattaNumero(Number(percentuale) || 0).replace(/,00$/, "") + "%</div>";
    if (modalita === "euro" && valoreGrezzo !== undefined && valoreGrezzo !== "" && isNaN(parseFloat(String(valoreGrezzo).replace(",", ".")))) {
      return "<div>" + label + ": " + valoreGrezzo + "</div>";
    }
    return "<div>" + label + ": " + formattaNumero(valore) + "</div>";
  }

  const nomeClienteStampa = cliente ? cliente.ragione_sociale : (preventivo.cliente_manuale || "");

  return '<!doctype html><html><head><meta charset="utf-8"><title>Preventivo ' + (preventivo.rif || "") + '</title>' +
    '<style>body{font-family:Arial, sans-serif; padding:40px; color:#1a1a1a;} h1{color:#1a1a1a; font-size:22px; margin-bottom:10px; font-weight:700;} p{font-size:13px; margin:6px 0; color:#1a1a1a;} table{width:100%; border-collapse:collapse; margin-top:20px;} th,td{border-bottom:1px solid #ddd; padding:8px; text-align:left; font-size:12px; color:#1a1a1a;} th{color:#555; font-weight:600;} .totali{margin-top:20px; text-align:right; font-size:13px;} .totali strong{font-size:16px; color:#1a1a1a; border-top:2px solid #1a1a1a; padding-top:6px; display:inline-block;}</style>' +
    "</head><body>" +
    "<h1>" + (azienda ? azienda.nome : "") + "</h1>" +
    '<p style="margin-top:14px;">Data: ' + (preventivo.data ? new Date(preventivo.data).toLocaleDateString("it-IT") : "") + "</p>" +
    '<p style="margin-top:10px;">Spett.le: ' + nomeClienteStampa + (preventivo.rif ? " — Rif. " + preventivo.rif : "") + "</p>" +
    "<table><thead><tr>" + intestazioneColonne + "</tr></thead><tbody>" + righeHtml + "</tbody></table>" +
    '<div class="totali">' +
    rigaVoce("Imballo", preventivo.imballo_modalita, tot.valoreImballo, preventivo.imballo_valore, preventivo.imballo_percentuale) +
    rigaVoce("Trasporto", preventivo.trasporto_modalita, tot.valoreTrasporto, preventivo.trasporto_valore, preventivo.trasporto_percentuale) +
    rigaVoce("IVA", preventivo.iva_modalita, tot.valoreIva, preventivo.iva_valore, preventivo.iva_percentuale) +
    "<div><strong>Totale: " + formattaNumero(tot.totaleFinale) + "</strong></div></div>" +
    (preventivo.modalita_pagamento ? '<p style="margin-top:20px;"><strong>Modalità di pagamento:</strong> ' + preventivo.modalita_pagamento + "</p>" : "") +
    (preventivo.note ? '<p style="margin-top:10px;"><strong>Note:</strong> ' + preventivo.note + "</p>" : "") +
    "</body></html>";
}

const CONTATTI_AGENTE = { email: "francesco.gomiero96@gmail.com", telefono: "+39 3342428133" };
// PDF A4 vettoriale: testo e tabelle multipagina, senza screenshot HTML.
// Librerie PDF incluse nel bundle Vite: nessuna dipendenza da CDN durante l'esportazione.
function caricaLibreriePdf() { return Promise.resolve(jsPDF); }
function testoPdf(value) {
  return String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
}
function dataPdf(value) {
  if (!value) return "";
  const iso = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : testoPdf(value);
}
async function immaginePdf(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await new Promise((resolve, reject) => {
      if (img.complete) return img.naturalWidth ? resolve() : reject(new Error("Immagine non valida"));
      img.onload = resolve;
      img.onerror = reject;
      setTimeout(() => reject(new Error("Timeout immagine")), 6000);
    });
    const canvas = document.createElement("canvas");
    const max = 420;
    const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/jpeg", 0.82), width: canvas.width, height: canvas.height };
  } catch { return null; } // URL esterni senza CORS: il PDF rimane utilizzabile.
}
async function stampaPreventivo(preventivo, clienti, aziende, session, onAnteprima = null) {
  const nomeFile = "Preventivo_" + String(preventivo.rif || preventivo.id || "CRM").replace(/[^a-z0-9_-]/gi, "_") + ".pdf";
  try {
    const JsPDF = await caricaLibreriePdf();
    const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 13;
    const cliente = clienti.find(c => c.id === preventivo.cliente_id);
    const azienda = aziende.find(a => a.id === preventivo.azienda_id);
    const righe = Array.isArray(preventivo.righe) ? preventivo.righe : [];
    const tot = calcolaTotaliPreventivo(preventivo, righe);
    const soloNetto = preventivo.modalita_prezzi_pdf === "solo_netto";
    const immagini = await Promise.all(righe.map(async r => {
      if (!r.immagine_url) return null;
      try { return await immaginePdf(await urlImmagineAutorizzata(session, r.immagine_url)); }
      catch (err) { console.warn("Immagine non disponibile nel PDF", err); return null; }
    }));
    const haImmagini = righe.some((r, i) => Boolean(r.immagine_url && immagini[i]));
    // Palette neutra dedicata al PDF; non modifica i colori del CRM.
    const navy = [65, 69, 74];
    const muted = [111, 115, 121];
    const drawHeader = () => {
      doc.setTextColor(...navy);
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text(testoPdf(azienda?.nome || "PREVENTIVO"), margin, 16);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...muted);
      doc.text("Agente Francesco Gomiero" + (CONTATTI_AGENTE.email ? "  |  " + CONTATTI_AGENTE.email : "") + (CONTATTI_AGENTE.telefono ? "  |  " + CONTATTI_AGENTE.telefono : ""), margin, 22);
      doc.setDrawColor(205, 207, 210); doc.line(margin, 26, pageW - margin, 26);
      doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...navy);
      doc.text("PREVENTIVO", margin, 35);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...muted);
      doc.text("Data: " + dataPdf(preventivo.data), margin, 41);
      const colRif = pageW / 2;
      doc.setFontSize(8.5); doc.setTextColor(...muted);
      doc.text("Spett.le", margin, 48);
      doc.text("RIFERIMENTO", colRif, 48);
      doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      const clienteNome = testoPdf(cliente?.ragione_sociale || preventivo.cliente_manuale || "—");
      doc.text(doc.splitTextToSize(clienteNome, colRif - margin - 8).slice(0, 2), margin, 54);
      doc.text(doc.splitTextToSize(testoPdf(preventivo.rif || "—"), pageW - colRif - margin).slice(0, 2), colRif, 54);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...muted);
      doc.text("Pagamento: " + testoPdf(preventivo.modalita_pagamento || "Da concordare"), margin, 62);
      doc.setDrawColor(218, 220, 223); doc.line(margin, 66, pageW - margin, 66);
    };
    const head = [[...(haImmagini ? ["Img"] : []), "Articolo", "Descrizione", "Finitura", "UM", "Qtà", ...(soloNetto ? [] : ["Listino €", "Sconto"]), "Netto un. €", "Totale €"]];
    const body = righe.map((r, i) => {
      const qta = Number(r.quantita) || 0;
      const { netto } = calcolaRigaNetto(r);
      const sconti = [r.sconto1, r.sconto2, r.sconto3].map(v => Number(v) || 0).filter(Boolean).map(v => formattaNumero(v).replace(/,00$/, "") + "%").join(" + ") || "—";
      return [ ...(haImmagini ? [""] : []), testoPdf(r.articolo), testoPdf(r.descrizione), testoPdf(r.finitura), testoPdf(r.unita_misura), testoPdf(r.quantita), ...(soloNetto ? [] : [formattaNumero(r.prezzo_unitario), sconti]), formattaNumero(qta ? netto / qta : netto), formattaNumero(netto) ];
    });
    const widths = haImmagini
      ? (soloNetto ? [20, 31, 91, 42, 12, 13, 28, 31] : [20, 29, 67, 35, 11, 12, 26, 27, 25, 19])
      : (soloNetto ? [34, 104, 47, 14, 14, 30, 28] : [31, 83, 38, 12, 13, 27, 27, 25, 15]);
    const columnStyles = Object.fromEntries(widths.map((cellWidth, i) => [i, { cellWidth }]));
    // Lascia spazio per il riepilogo nella pagina finale; autoTable ripete le intestazioni.
    autoTable(doc, {
      head, body, startY: 71, margin: { left: margin, right: margin, top: 71, bottom: 20 },
      theme: "grid", showHead: "everyPage", rowPageBreak: "avoid",
      styles: { font: "helvetica", fontSize: 8, textColor: navy, lineColor: [224, 229, 235], lineWidth: 0.16, cellPadding: 2.4, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [247, 247, 247] }, columnStyles,
      didParseCell: data => {
        if (haImmagini && data.section === "body" && data.column.index === 0 && immagini[data.row.index]) {
          data.cell.styles.minCellHeight = 22;
        }
      },
      didDrawCell: data => {
        if (!haImmagini || data.section !== "body" || data.column.index !== 0) return;
        const pic = immagini[data.row.index]; if (!pic) return;
        const maxW = data.cell.width - 4, maxH = data.cell.height - 4;
        const scale = Math.min(maxW / pic.width, maxH / pic.height);
        const w = pic.width * scale, h = pic.height * scale;
        doc.addImage(pic.data, "JPEG", data.cell.x + (data.cell.width - w) / 2, data.cell.y + (data.cell.height - h) / 2, w, h);
      },
      didDrawPage: () => drawHeader(),
    });
    let y = (doc.lastAutoTable?.finalY || 71) + 10;
    const summary = [
      ["Totale netto merce", formattaNumero(tot.totaleNetto) + " €"],
    ];
    function voce(label, modalita, valore, grezzo, percentuale) {
      if (modalita === "nascosto") return;
      if (modalita === "escluso") summary.push([label, "Escluso"]);
      else if (modalita === "percentuale") summary.push([label, formattaNumero(Number(percentuale) || 0).replace(/,00$/, "") + "%"]);
      else if (modalita === "euro" && grezzo !== undefined && grezzo !== "" && isNaN(parseFloat(String(grezzo).replace(",", ".")))) summary.push([label, testoPdf(grezzo)]);
      else summary.push([label, formattaNumero(valore) + " €"]);
    }
    voce("Imballo", preventivo.imballo_modalita, tot.valoreImballo, preventivo.imballo_valore, preventivo.imballo_percentuale);
    voce("Trasporto", preventivo.trasporto_modalita, tot.valoreTrasporto, preventivo.trasporto_valore, preventivo.trasporto_percentuale);
    voce("IVA", preventivo.iva_modalita, tot.valoreIva, preventivo.iva_valore, preventivo.iva_percentuale);
    summary.push(["TOTALE PREVENTIVO", formattaNumero(tot.totaleFinale) + " €"]);
    const noteLines = [
      ...(preventivo.modalita_pagamento ? ["Pagamento: " + testoPdf(preventivo.modalita_pagamento)] : []),
      ...(preventivo.note ? ["Note: " + testoPdf(preventivo.note)] : []),
    ];
    const noteHeight = noteLines.reduce((h, t) => h + doc.splitTextToSize(t, pageW - 2 * margin).length * 4.2 + 3, 0);
    const summaryHeight = summary.length * 7 + 9;
    if (y + summaryHeight + noteHeight > pageH - 16) { doc.addPage(); drawHeader(); y = 72; }
    const x = pageW - margin - 106;
    summary.forEach(([label, value], i) => {
      const last = i === summary.length - 1;
      if (last) { doc.setFillColor(...navy); doc.rect(x - 3, y - 4, 109, 9, "F"); doc.setTextColor(255); }
      else { doc.setTextColor(...navy); }
      doc.setFont("helvetica", last ? "bold" : "normal"); doc.setFontSize(last ? 10 : 8.5);
      doc.text(label, x, y + 1);
      doc.text(value, pageW - margin - 2, y + 1, { align: "right" });
      y += 8;
    });
    y += 7;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...navy); doc.setFontSize(8.5);
    noteLines.forEach(t => {
      const lines = doc.splitTextToSize(t, pageW - 2 * margin);
      if (y + lines.length * 4.2 > pageH - 14) { doc.addPage(); drawHeader(); y = 72; }
      doc.text(lines, margin, y); y += lines.length * 4.2 + 3;
    });
    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p); doc.setTextColor(...muted); doc.setFontSize(8);
      doc.text(`Pagina ${p} di ${pages}`, pageW - margin, pageH - 7, { align: "right" });
    }
    const blob = doc.output("blob");
    if (!blob || blob.size < 1200) throw new Error("PDF generato non valido");
    if (onAnteprima) { onAnteprima({ url: URL.createObjectURL(blob), nomeFile }); return; }
    const file = new File([blob], nomeFile, { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: nomeFile }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = nomeFile;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    console.error("Errore generazione preventivo PDF", err);
    alert("Esportazione PDF non riuscita: " + (err.message || err));
  }
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("TUO-PROGETTO"));

  const submit = async () => {
    setError("");
    if (!configured) { setError("Configurazione Supabase mancante."); return; }
    setLoading(true);
    try {
      const client = makeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) {
        setError(result.error.error_description || result.error.msg || "Email o password non corrette.");
        return;
      }
      onLogin(result.data);
    } catch (err) {
      setError("Errore di connessione a Supabase: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const cerchio1 = { position: "absolute", top: -80, left: -80, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, " + COLORS.primary + "22, transparent 70%)" };
  const cerchio2 = { position: "absolute", bottom: -100, right: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, " + COLORS.primaryDark + "20, transparent 70%)" };
  const cerchio3 = { position: "absolute", top: "30%", right: "10%", width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, " + COLORS.primary + "15, transparent 70%)" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, " + COLORS.bg + " 0%, #e8f3fa 100%)", fontFamily: "Arial, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={cerchio1} />
      <div style={cerchio2} />
      <div style={cerchio3} />
      <div style={{ width: 360, padding: 36, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 16, boxShadow: "0 12px 40px rgba(11,123,196,0.12)", position: "relative", zIndex: 1 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, " + COLORS.primary + ", " + COLORS.primaryDark + ")", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <ShieldCheck size={22} color="#fff" />
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>CRM Arredo Bagno</h1>
        <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 24 }}>Accedi con le credenziali che ti sono state fornite</p>
        <label style={{ fontSize: 13, color: "#333", display: "block", marginBottom: 6 }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 16, border: "1px solid " + COLORS.border, borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
        <label style={{ fontSize: 13, color: "#333", display: "block", marginBottom: 6 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 16, border: "1px solid " + COLORS.border, borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
        {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "12px 0", background: "linear-gradient(135deg, " + COLORS.primary + ", " + COLORS.primaryDark + ")", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
        <p style={{ fontSize: 11, color: "#9aa7b2", marginTop: 18, textAlign: "center" }}>Le credenziali vengono create dall'amministratore.</p>
      </div>
    </div>
  );
}

function AdminPanel({ session }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await crmFetch(SUPABASE_URL + "/rest/v1/profiles?select=email,role,created_at&order=created_at.desc", {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token },
      });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (e) {} finally { setLoadingUsers(false); }
  };
  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    setMsg(null); setLoading(true);
    try {
      const tempClient = makeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const result = await tempClient.auth.signUp({ email, password });
      if (result.error) {
        setMsg({ type: "error", text: result.error.error_description || result.error.msg || "Errore nella creazione dell'utente." });
        return;
      }
      setMsg({ type: "success", text: "Utente creato: " + email });
      setEmail(""); setPassword(""); loadUsers();
    } catch (err) {
      setMsg({ type: "error", text: "Errore di connessione: " + (err.message || err) });
    } finally { setLoading(false); }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>Pannello Admin</h2>
      <div style={{ maxWidth: 420, padding: 24, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, color: COLORS.primary, marginBottom: 4 }}>Crea nuovo utente</h3>
        <input type="email" placeholder="Email utente" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 10, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        <input type="text" placeholder="Password provvisoria" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 10, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        <button onClick={createUser} disabled={loading} style={{ padding: "10px 18px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Creazione..." : "Crea utente"}
        </button>
        {msg && <div style={{ marginTop: 12, fontSize: 12, color: msg.type === "error" ? COLORS.danger : COLORS.success }}>{msg.text}</div>}
      </div>
      <div style={{ maxWidth: 500, padding: 24, background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14 }}>
        <h3 style={{ fontSize: 15, color: COLORS.primary, marginBottom: 4 }}>Utenti creati</h3>
        {loadingUsers ? <p style={{ fontSize: 12, color: COLORS.muted }}>Caricamento...</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ textAlign: "left", borderBottom: "2px solid " + COLORS.border }}><th style={{ padding: "6px 4px" }}>Email</th><th style={{ padding: "6px 4px" }}>Ruolo</th></tr></thead>
            <tbody>{users.map((u, i) => (<tr key={i} style={{ borderBottom: "1px solid #f0f5f9" }}><td style={{ padding: "6px 4px" }}>{u.email}</td><td style={{ padding: "6px 4px" }}>{u.role}</td></tr>))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Dashboard({ session, goTo }) {
  const [data, setData] = useState({ clienti: [], aziende: [], appuntamenti: [], preventivi: [], ordini: [], note: [], fatturatoManuale: [], portafoglioManuale: [], attivita: [] });
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const percorsi = ["clienti?select=id,ragione_sociale", "aziende_mandanti?select=id,nome,colore", "appuntamenti?select=id,titolo,inizio,fine,tipo,stato,cliente_id,azienda_id&order=inizio.asc", "preventivi?select=*", "ordini_confermati?select=*", "note_crm?select=id,titolo,contenuto,created_at&order=created_at.desc&limit=3", "fatturato_commerciale?select=azienda_id,cliente_id,anno,periodicita,periodo,importo", "portafoglio_ordini?select=azienda_id,cliente_id,data_rilevazione,importo", "crm_attivita?select=*&order=scadenza.asc.nullslast,created_at.desc"];
        const risposte = await Promise.all(percorsi.map(x => crmFetch(SUPABASE_URL + "/rest/v1/" + x, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token } })));
        const valori = await Promise.all(risposte.map(r => r.json()));
        const obbligatori = [0,1,2,3];
        for (const i of obbligatori) if (!risposte[i].ok) throw new Error(valori[i]?.message || "Impossibile caricare la dashboard");
        if (attivo) setData({ clienti: valori[0], aziende: valori[1], appuntamenti: valori[2], preventivi: valori[3], ordini: risposte[4].ok ? valori[4] : [], note: risposte[5].ok ? valori[5] : [], fatturatoManuale: risposte[6].ok ? valori[6] : [], portafoglioManuale: risposte[7].ok ? valori[7] : [], attivita: risposte[8].ok && Array.isArray(valori[8]) ? valori[8] : [] });
      } catch (e) { if (attivo) setErrore(e.message); }
      finally { if (attivo) setLoading(false); }
    })();
    return () => { attivo = false; };
  }, [session]);
  const [azioneAttivita, setAzioneAttivita] = useState(null);
  const [erroreAttivita, setErroreAttivita] = useState("");
  const completaDaDashboard = async (attivita) => {
    if (azioneAttivita) return;
    setAzioneAttivita(attivita.id); setErroreAttivita("");
    try {
      const r = await crmFetch(SUPABASE_URL + "/rest/v1/crm_attivita?id=eq." + encodeURIComponent(attivita.id), {
        method: "PATCH", headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ stato: "completata" })
      });
      if (!r.ok) { const info = await r.json().catch(() => ({})); throw new Error(info.message || "Impossibile completare l'attività"); }
      setData(prev => ({ ...prev, attivita: prev.attivita.map(a => a.id === attivita.id ? { ...a, stato: "completata" } : a) }));
    } catch (e) { setErroreAttivita(e.message); }
    finally { setAzioneAttivita(null); }
  };
  const oggi = new Date();
  const anno = oggi.getFullYear();
  const giorno = d => { const x = new Date(d); return x.getFullYear() === oggi.getFullYear() && x.getMonth() === oggi.getMonth() && x.getDate() === oggi.getDate(); };
  const visiteMese = data.appuntamenti.filter(x => x.tipo === "visita" && x.stato !== "annullato" && new Date(x.inizio).getMonth() === oggi.getMonth() && new Date(x.inizio).getFullYear() === anno).length;
  const agenda = data.appuntamenti.filter(x => giorno(x.inizio) && x.stato !== "annullato").sort((a,b) => new Date(a.inizio)-new Date(b.inizio));
  const opportunita = data.preventivi.filter(x => x.stato === "inviato" || x.stato === "bozza");
  const portafoglio = data.preventivi.filter(x => x.stato === "accettato" && !x.fatturato);
  const importo = x => { try { return calcolaTotaliPreventivo(x, x.righe || []).totaleFinale || 0; } catch { return 0; } };
  const totalePipeline = portafoglio.reduce((a,x) => a+importo(x),0);
  const pipeline = data.aziende.map(a => ({ ...a, valore: portafoglio.filter(x => x.azienda_id === a.id).reduce((t,x) => t+importo(x),0) })).sort((a,b)=>b.valore-a.valore);
  // Il fatturato manuale è la fonte della dashboard: non sommare ordini e preventivi.
  // Un trimestre non viene distribuito artificialmente tra i mesi.
  const fatturatiAnno = data.fatturatoManuale.filter(f => Number(f.anno) === anno);
  const fatturatoYTD = fatturatiAnno.reduce((tot, f) => tot + Number(f.importo || 0), 0);
  const trimestri = ["T1", "T2", "T3", "T4"].map((periodo, i) => ({
    periodo,
    valore: fatturatiAnno.filter(f => f.periodicita === "trimestrale"
      ? Number(f.periodo) === i + 1
      : Math.floor((Number(f.periodo) - 1) / 3) === i
    ).reduce((tot, f) => tot + Number(f.importo || 0), 0)
  }));
  // Portafoglio = ultima fotografia per cliente e mandante, mai somma delle rilevazioni storiche.
  const oggiISO = [anno, String(oggi.getMonth()+1).padStart(2,"0"), String(oggi.getDate()).padStart(2,"0")].join("-");
  const ultimeRilevazioni = new Map();
  data.portafoglioManuale.filter(p => p.data_rilevazione <= oggiISO).forEach(p => {
    const key = p.azienda_id + ":" + p.cliente_id;
    const precedente = ultimeRilevazioni.get(key);
    if (!precedente || p.data_rilevazione > precedente.data_rilevazione) ultimeRilevazioni.set(key, p);
  });
  const portafoglioAttuale = [...ultimeRilevazioni.values()].reduce((tot,p) => tot + Number(p.importo || 0), 0);
  const fatturatoMandanti = data.aziende.map(a => ({
    ...a,
    valore: fatturatiAnno.filter(f => f.azienda_id === a.id).reduce((tot,f) => tot + Number(f.importo || 0), 0)
  })).sort((a,b)=>b.valore-a.valore);
  const euro = n => (Number(n)||0).toLocaleString("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  const panel = { background:"#fff",border:"1px solid #e6eaf1",borderRadius:14,padding:18,minWidth:0,boxShadow:"0 2px 8px rgba(20,38,70,.025)" };
  const attivitaAperte = data.attivita.filter(a => a.stato !== "completata");
  const dataLocale = d => { const x = new Date(d); return [x.getFullYear(), String(x.getMonth()+1).padStart(2,"0"), String(x.getDate()).padStart(2,"0")].join("-"); };
  const dataOggi = dataLocale(oggi);
  const attivitaScadute = attivitaAperte.filter(a => a.scadenza && dataLocale(a.scadenza) < dataOggi);
  const attivitaOggi = attivitaAperte.filter(a => a.scadenza && dataLocale(a.scadenza) === dataOggi);
  const attivitaFuture = attivitaAperte.filter(a => a.scadenza && dataLocale(a.scadenza) > dataOggi).sort((a,b)=>new Date(a.scadenza)-new Date(b.scadenza));
  const attivitaPrioritarie = attivitaAperte.filter(a => a.priorita === "alta");
  const listaDashboard = [...attivitaScadute, ...attivitaOggi, ...attivitaFuture].slice(0,6);
  const etichettaAttivita = a => data.clienti.find(c => c.id === a.cliente_id)?.ragione_sociale || data.aziende.find(m => m.id === a.azienda_id)?.nome || "";
  const metriche = [
    { nome:"Fatturato YTD",valore:euro(fatturatoYTD),icona:TrendingUp,pagina:"controllo",colore:"#3679f5",nota:"Registrazioni anno " + anno },
    { nome:"Portafoglio ordini",valore:euro(portafoglioAttuale),icona:Wallet,pagina:"controllo",colore:"#4b70f5",nota:"Ultima rilevazione per cliente" },
    { nome:"Opportunità",valore:opportunita.length,icona:Target,pagina:"preventivi",colore:"#5b79eb",nota:"Preventivi aperti" },
    { nome:"Visite mese",valore:visiteMese,icona:CalendarDays,pagina:"visite",colore:"#3985ec",nota:"Da agenda commerciale" },
  ];
  return <div className="matrice-dashboard">
    <div className="matrice-welcome"><div><h1>Ciao Francesco <span aria-hidden="true">👋</span></h1><p>Oggi è {oggi.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}. Ecco il riepilogo della tua attività.</p></div><div className="crm-dashboard-quick"><button className="matrice-add" onClick={()=>goTo("clienti")}><Users size={16}/> Clienti</button><button className="matrice-add" onClick={()=>goTo("architetti")}><Users2 size={16}/> Architetti</button><button className="matrice-add" onClick={()=>goTo("visite")}><Plus size={16}/> Apri agenda</button></div></div>
    {errore && <p style={{color:"#c0392b"}}>{errore}</p>}
    <div className="crm-today-priority">
      <section style={panel}><div className="matrice-section-head"><h3>Agenda di oggi</h3><button onClick={()=>goTo("visite")}><Plus size={15}/> Vedi agenda</button></div>{agenda.length===0?<p className="matrice-empty">Nessun appuntamento previsto oggi.</p>:agenda.slice(0,5).map(x=><div className="matrice-event" key={x.id}><span className="matrice-event-time">{new Date(x.inizio).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</span><span className="matrice-event-mark"/><span className="matrice-event-name">{x.titolo}</span></div>)}</section>
    <section className="crm-task-dashboard" style={{...panel, marginBottom:18}}>
      <div className="matrice-section-head"><h3><CheckSquare size={18} style={{verticalAlign:"middle",marginRight:8,color:"#1267e9"}}/>Attività e follow-up</h3><button onClick={()=>goTo("attivita")}>Apri attività <ArrowUpRight size={14}/></button></div>
      <div className="crm-task-summary">
        {[["Oggi",attivitaOggi.length,"#eaf3ff","#145fbc"],["Scadute",attivitaScadute.length,"#fff0ee","#bc4537"],["Prossime",attivitaFuture.length,"#f1f5fa","#405a73"],["Priorità alta",attivitaPrioritarie.length,"#fff6e6","#94610b"]].map(([titolo,numero,sfondo,colore])=><button type="button" key={titolo} onClick={()=>goTo("attivita")} className="crm-task-count" style={{background:sfondo,color:colore}}><span>{titolo}</span><strong>{loading?"…":numero}</strong></button>)}
      </div>
      {erroreAttivita && <p style={{color:"#b83232",fontSize:12}}>{erroreAttivita}</p>}
      {listaDashboard.length === 0 ? <p className="matrice-empty">Nessuna attività con scadenza da completare. <button type="button" onClick={()=>goTo("attivita")} style={{border:0,background:"none",color:"#1267e9",cursor:"pointer",fontWeight:650}}>Crea un'attività</button></p> : <div className="crm-task-list">{listaDashboard.map(a => <div key={a.id} className="crm-task-row"><button type="button" className="crm-task-check" disabled={!!azioneAttivita} onClick={()=>completaDaDashboard(a)} title="Segna come completata" aria-label={"Completa " + a.titolo}><Check size={15}/></button><div className="crm-task-info"><strong>{a.titolo}</strong><small>{etichettaAttivita(a)}{etichettaAttivita(a) ? " · " : ""}{a.scadenza ? new Date(a.scadenza).toLocaleString("it-IT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "Senza scadenza"}</small></div><span className="crm-task-priority" style={{color:a.priorita==="alta"?"#b56b0d":"#718094"}}>{a.priorita==="alta"?"Alta":a.priorita==="media"?"Media":"Bassa"}</span></div>)}</div>}
    </section>
    </div>
    <div className="crm-dashboard-finance-label"><h2>Analisi commerciale</h2><span>Fatturato, andamento e opportunità</span></div>
    <div className="matrice-metrics">{metriche.map(m=>{const I=m.icona;return <button key={m.nome} className="matrice-metric" onClick={()=>goTo(m.pagina)}><span className="matrice-metric-icon"><I size={19}/></span><span><small>{m.nome}</small><strong>{loading?"…":m.valore}</strong><em>{m.nota}</em></span></button>})}</div>
    <div className="matrice-two">
      <section style={panel}><div className="matrice-section-head"><h3>Fatturato per mandante</h3><button onClick={()=>goTo("controllo")}>Dettagli <ArrowUpRight size={13}/></button></div><div className="matrice-total">Totale: <strong>{loading?"…":euro(fatturatoYTD)}</strong></div>{fatturatoMandanti.length===0?<p className="matrice-empty">Nessuna azienda mandante presente.</p>:fatturatoMandanti.map((a,i)=><div className="matrice-pipeline-row" key={a.id}><span className="matrice-dot" style={{background:a.colore||["#3478ed","#6c63db","#22a98b","#e4a34e"][i%4]}}/><span className="matrice-pipeline-name" title={a.nome}>{a.nome}</span><div className="matrice-track"><div style={{width:(fatturatoYTD>0?100*a.valore/fatturatoYTD:0)+"%",background:a.colore||"#3d79ed"}}/></div><strong>{euro(a.valore)}</strong><span className="matrice-percent">{fatturatoYTD?Math.round(a.valore/fatturatoYTD*100):0}%</span></div>)}</section>
      <section style={panel}><div className="matrice-section-head"><h3>Andamento fatturato</h3><button onClick={()=>goTo("controllo")}>Dettagli <ArrowUpRight size={13}/></button></div><p className="matrice-chart-sub">Anno {anno} · Registrazioni manuali aggregate per trimestre</p><div style={{height:215,width:"100%"}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={trimestri} margin={{top:12,right:5,left:-16,bottom:0}}><defs><linearGradient id="matriceTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4686f6" stopOpacity={0.22}/><stop offset="100%" stopColor="#4686f6" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#eef1f7" vertical={false}/><XAxis dataKey="periodo" tick={{fontSize:10,fill:"#8792a5"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:"#8792a5"}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?Math.round(v/1000)+"k":v}/><Tooltip formatter={v=>euro(v)}/><Area type="monotone" dataKey="valore" stroke="#367bf3" strokeWidth={2.5} fill="url(#matriceTrend)"/></AreaChart></ResponsiveContainer></div></section>
    </div>
    <div className="matrice-two matrice-bottom">
      <section style={panel}><div className="matrice-section-head"><h3>Opportunità in trattativa</h3><button onClick={()=>goTo("preventivi")}>Tutte <ArrowUpRight size={13}/></button></div>{opportunita.length===0?<p className="matrice-empty">Nessun preventivo aperto al momento.</p>:opportunita.slice(0,4).map((x,i)=><div className="matrice-opportunity" key={x.id}><span className="matrice-opportunity-mark" style={{background:i%2?"#a58de8":"#3982ee"}}/><div><strong>{data.clienti.find(c=>c.id===x.cliente_id)?.ragione_sociale||"Preventivo"}</strong><small>{x.stato==="inviato"?"Preventivo inviato":"Bozza"}</small></div><b>{euro(importo(x))}</b></div>)}</section>
    </div>
    <section className="crm-recent-notes" style={{...panel,marginTop:2}}><div className="matrice-section-head"><h3><StickyNote size={17} style={{verticalAlign:"middle",marginRight:8,color:"#e5a528"}}/>Note recenti</h3><button onClick={()=>goTo("note")}><Plus size={15}/> Nuova nota</button></div>{data.note.length===0?<p className="matrice-empty">Nessuna nota salvata. Crea la prima dalla sezione Note.</p>:data.note.map(n=><button className="crm-note-preview" key={n.id} onClick={()=>goTo("note")}><FileText size={15}/><span><strong>{n.titolo}</strong><small>{n.contenuto||""}</small></span><time>{new Date(n.created_at).toLocaleDateString("it-IT")}</time></button>)}</section>
  </div>;
}

function AziendeMandanti({ session }) {
  const [list, setList] = useState([]);
  const [vistaMandanti, setVistaMandanti] = useState(() => typeof window !== "undefined" && window.innerWidth <= 700 ? "schede" : "elenco");
  const [ricercaMandanti, setRicercaMandanti] = useState("");
  const [mostraFormMandanti, setMostraFormMandanti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadMsg, setUploadMsg] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const emptyForm = { nome: "", sconto1: "", sconto2: "", imballo_percentuale: "", trasporto: "", resi: "", note: "", colore: "#0b7bc4" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?select=*&order=nome.asc", { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel caricamento");
      setList(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const trovaColonna = (rigaOggetto, candidati) => {
    const chiavi = Object.keys(rigaOggetto);
    for (const cand of candidati) { const trovata = chiavi.find((k) => k.toLowerCase().trim().includes(cand)); if (trovata) return rigaOggetto[trovata]; }
    return "";
  };

  const caricaListino = async (aziendaId, file) => {
    setUploadingId(aziendaId); setUploadMsg(null);
    try {
      let righeFile = [];
      const nomeFile = file.name.toLowerCase();
      if (nomeFile.endsWith(".csv")) {
        const testo = await file.text();
        righeFile = Papa.parse(testo, { header: true, skipEmptyLines: true, dynamicTyping: true }).data;
      } else if (nomeFile.endsWith(".xlsx") || nomeFile.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        righeFile = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      } else {
        setUploadMsg({ type: "error", text: "Formato non supportato: usa .xlsx, .xls o .csv." });
        setUploadingId(null); return;
      }
      const voci = righeFile.map((r) => ({
        azienda_id: aziendaId,
        codice_articolo: String(trovaColonna(r, ["codice", "articolo", "cod."])).trim(),
        descrizione: String(trovaColonna(r, ["descrizione", "desc"])).trim(),
        prezzo_unitario: Number(String(trovaColonna(r, ["prezzo", "listino", "importo"])).replace(",", ".").replace(/[^\d.-]/g, "")) || 0,
      })).filter((v) => v.codice_articolo);
      if (voci.length === 0) { setUploadMsg({ type: "error", text: "Nessuna riga valida trovata." }); setUploadingId(null); return; }
      await crmFetch(SUPABASE_URL + "/rest/v1/listini?azienda_id=eq." + aziendaId, { method: "DELETE", headers: headers() });
      const res = await crmFetch(SUPABASE_URL + "/rest/v1/listini", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(voci) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio del listino");
      setUploadMsg({ type: "success", text: "Listino caricato: " + voci.length + " articoli." });
    } catch (err) {
      setUploadMsg({ type: "error", text: err.message || "Errore nel caricamento del file." });
    } finally { setUploadingId(null); }
  };

  const resetForm = () => { setMostraFormMandanti(false); setForm(emptyForm); setEditingId(null); };
  const save = async () => {
    if (!form.nome.trim()) { setError("Il nome azienda è obbligatorio."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        nome: form.nome,
        sconto1: form.sconto1 !== "" ? Number(form.sconto1) : null,
        sconto2: form.sconto2 !== "" ? Number(form.sconto2) : null,
        imballo_percentuale: form.imballo_percentuale !== "" ? Number(form.imballo_percentuale) : null,
        trasporto: form.trasporto || null, resi: form.resi || null, note: form.note || null,
        colore: form.colore || "#0b7bc4",
      };
      const res = editingId
        ? await crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?id=eq." + editingId, { method: "PATCH", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) })
        : await crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio");
      resetForm(); load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const edit = (azienda) => {
    setMostraFormMandanti(true); setEditingId(azienda.id);
    setForm({
      nome: azienda.nome || "", sconto1: azienda.sconto1 ?? "", sconto2: azienda.sconto2 ?? "",
      imballo_percentuale: azienda.imballo_percentuale ?? "", trasporto: azienda.trasporto || "",
      resi: azienda.resi || "", note: azienda.note || "", colore: azienda.colore || "#0b7bc4",
    });
  };
  const remove = async (id) => {
    if (!window.confirm("Eliminare questa azienda?")) return;
    try {
      const res = await crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?id=eq." + id, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) { setError(err.message); }
  };

  const aziendeFiltrate = list.filter(a => [a.nome, a.trasporto, a.resi, a.note].some(v => String(v || "").toLowerCase().includes(ricercaMandanti.trim().toLowerCase())));

  const inputStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };

  return (
    <div className="crm-mandanti-premium crm-ref-page">
      <div className="crm-ref-heading"><h2>Aziende mandanti</h2><button className="crm-ref-primary" type="button" onClick={() => { if (mostraFormMandanti) resetForm(); else { resetForm(); setMostraFormMandanti(true); } }}>{mostraFormMandanti ? "Chiudi" : "+ Nuova azienda"}</button></div>
      <div className="crm-ref-layout">
        {mostraFormMandanti && <div className="crm-ref-form" style={{ flex: "1 1 280px", background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, boxShadow: "0 4px 14px rgba(20,40,60,0.05)", padding: 20, maxWidth: 340 }}>
          <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>{editingId ? "Modifica azienda" : "Nuova azienda"}</h3>
          <input placeholder="Nome azienda *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
          <input placeholder="Sconto 1 (%)" value={form.sconto1} onChange={(e) => setForm({ ...form, sconto1: e.target.value })} style={inputStyle} />
          <input placeholder="Sconto 2 (%)" value={form.sconto2} onChange={(e) => setForm({ ...form, sconto2: e.target.value })} style={inputStyle} />
          <input placeholder="Imballo (%)" value={form.imballo_percentuale} onChange={(e) => setForm({ ...form, imballo_percentuale: e.target.value })} style={inputStyle} />
          <input placeholder="Trasporto (policy)" value={form.trasporto} onChange={(e) => setForm({ ...form, trasporto: e.target.value })} style={inputStyle} />
          <input placeholder="Resi (policy)" value={form.resi} onChange={(e) => setForm({ ...form, resi: e.target.value })} style={inputStyle} />
          <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
          <label style={{ fontSize: 12, color: "#333", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>Colore identificativo
            <input type="color" value={form.colore} onChange={(e) => setForm({ ...form, colore: e.target.value })} style={{ width: 40, height: 28, border: "none", padding: 0, cursor: "pointer" }} />
          </label>
          {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Aggiungi azienda"}</button>
            {editingId && <button onClick={resetForm} style={{ padding: "9px 16px", background: "#fff", color: COLORS.primary, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annulla</button>}
          </div>
        </div>
        }
        <div className="crm-ref-list-area" style={{ flex: "2 1 400px" }}>
          {uploadMsg && <div style={{ fontSize: 12, marginBottom: 10, color: uploadMsg.type === "error" ? COLORS.danger : COLORS.success }}>{uploadMsg.text}</div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <input aria-label="Cerca aziende mandanti" placeholder="Cerca azienda, trasporto, note..." value={ricercaMandanti} onChange={e => setRicercaMandanti(e.target.value)} style={{ ...inputStyle, flex: "1 1 200px", marginBottom: 0, maxWidth: 390, background: "#fff" }} />
            <div style={{ display: "inline-flex", padding: 4, background: "#edf3f8", borderRadius: 11, gap: 3 }}>
              {[["elenco", "Elenco"], ["schede", "Schede"]].map(([id, label]) => <button key={id} type="button" aria-pressed={vistaMandanti === id} onClick={() => setVistaMandanti(id)} style={{ border: 0, borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer", background: vistaMandanti === id ? "#fff" : "transparent", color: vistaMandanti === id ? "#145b92" : "#63788d", fontWeight: 650, boxShadow: vistaMandanti === id ? "0 1px 5px #19344a18" : "none" }}>{label}</button>)}
            </div>
          </div>
          {loading ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p> : aziendeFiltrate.length === 0 ? <p style={{ color: COLORS.muted, fontSize: 13 }}>{list.length ? "Nessuna azienda corrisponde alla ricerca." : "Nessuna azienda ancora inserita."}</p> : vistaMandanti === "schede" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 14 }}>
              {aziendeFiltrate.map(azienda => (
                <div key={azienda.id} style={{ background: "#fff", border: "1px solid #dce7ef", borderRadius: 16, padding: 17, boxShadow: "0 4px 14px #19344a0a", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 12, background: (azienda.colore || "#0b7bc4") + "18", display: "grid", placeItems: "center", flexShrink: 0 }}><Building2 size={19} color={azienda.colore || "#0b7bc4"} /></span>
                    <strong style={{ fontSize: 15, color: "#18354e", overflowWrap: "anywhere" }}>{azienda.nome}</strong>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, fontSize: 12, color: "#52697c" }}>
                    <span>Sconto 1<br /><strong style={{ color: "#18354e" }}>{azienda.sconto1 != null ? azienda.sconto1 + "%" : "—"}</strong></span>
                    <span>Sconto 2<br /><strong style={{ color: "#18354e" }}>{azienda.sconto2 != null ? azienda.sconto2 + "%" : "—"}</strong></span>
                    <span>Imballo<br /><strong style={{ color: "#18354e" }}>{azienda.imballo_percentuale != null ? azienda.imballo_percentuale + "%" : "—"}</strong></span>
                    <span>Trasporto<br /><strong style={{ color: "#18354e", overflowWrap: "anywhere" }}>{azienda.trasporto || "—"}</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 16, paddingTop: 12, borderTop: "1px solid #e8eff4" }}>
                    <button type="button" onClick={() => edit(azienda)} style={{ border: 0, background: "#eaf3fb", color: "#145b92", padding: "8px 11px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Modifica</button>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#145b92", fontSize: 12, cursor: "pointer" }}><Upload size={13} />{uploadingId === azienda.id ? "Caricamento..." : "Carica listino"}<input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) caricaListino(azienda.id, file); e.target.value = ""; }} /></label>
                    <button type="button" onClick={() => remove(azienda.id)} style={{ border: 0, background: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12, marginLeft: "auto" }}>Elimina</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} className="tabella-responsive">
              <thead><tr style={{ textAlign: "left", borderBottom: "2px solid " + COLORS.border }}>
                <th style={{ padding: "8px 6px" }}>Nome</th><th style={{ padding: "8px 6px" }}>Sc. 1</th><th style={{ padding: "8px 6px" }}>Sc. 2</th>
                <th style={{ padding: "8px 6px" }}>Imballo</th><th style={{ padding: "8px 6px" }}>Trasporto</th><th style={{ padding: "8px 6px" }}>Listino</th><th style={{ padding: "8px 6px" }}></th>
              </tr></thead>
              <tbody>
                {aziendeFiltrate.map((azienda) => (
                  <tr key={azienda.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }} data-label="Nome">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: azienda.colore || COLORS.primary, display: "inline-block" }} />
                        {azienda.nome}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px" }} data-label="Sc. 1">{azienda.sconto1 != null ? azienda.sconto1 + "%" : "-"}</td>
                    <td style={{ padding: "8px 6px" }} data-label="Sc. 2">{azienda.sconto2 != null ? azienda.sconto2 + "%" : "-"}</td>
                    <td style={{ padding: "8px 6px" }} data-label="Imballo">{azienda.imballo_percentuale != null ? azienda.imballo_percentuale + "%" : "-"}</td>
                    <td style={{ padding: "8px 6px" }} data-label="Trasporto">{azienda.trasporto || "-"}</td>
                    <td style={{ padding: "8px 6px" }} data-label="Listino">
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.primary, cursor: "pointer" }}>
                        <Upload size={12} /> {uploadingId === azienda.id ? "Caricamento..." : "Carica"}
                        <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { const file = e.target.files && e.target.files[0]; if (file) caricaListino(azienda.id, file); e.target.value = ""; }} />
                      </label>
                    </td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }} data-label="">
                      <button onClick={() => edit(azienda)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 12, marginRight: 10 }}>Modifica</button>
                      <button onClick={() => remove(azienda.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>Elimina</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 10 }}>Il file deve avere colonne riconoscibili come Codice/Articolo, Descrizione, Prezzo/Listino. Caricare un nuovo file sostituisce il listino precedente.</p>
        </div>
      </div>
    </div>
  );
}

function SchedaCliente({ clienteId, session, aziendeOptions, onBack, onApriPreventivo, onApriGruppo }) {
  const [cliente, setCliente] = useState(null);
  const [gruppo, setGruppo] = useState(null);
  const [sedi, setSedi] = useState([]);
  const [nuovaSede, setNuovaSede] = useState({ nome_sede: "", indirizzo: "" });
  const [salvandoSede, setSalvandoSede] = useState(false);
  const [visite, setVisite] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [documenti, setDocumenti] = useState([]);
  const [ordini, setOrdini] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [fatturatoCliente,setFatturatoCliente]=useState([]);
  const [portafoglioCliente,setPortafoglioCliente]=useState([]);
  const [opportunitaCliente,setOpportunitaCliente]=useState([]);
  const [annoEconomico,setAnnoEconomico]=useState(new Date().getFullYear());
  const [erroreEconomico,setErroreEconomico]=useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nota, setNota] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [formOrdine, setFormOrdine] = useState({ azienda_id: "", importo: "", data_ordine: new Date().toISOString().slice(0, 10), note: "" });
  const [fileOrdine, setFileOrdine] = useState(null);
  const [savingOrdine, setSavingOrdine] = useState(false);
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const results = await Promise.all([
        crmFetch(SUPABASE_URL + "/rest/v1/clienti?id=eq." + clienteId + "&select=*", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/visite?cliente_id=eq." + clienteId + "&select=*&order=data_visita.desc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/preventivi?cliente_id=eq." + clienteId + "&select=*&order=data.desc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/documenti_cliente?cliente_id=eq." + clienteId + "&select=*&order=created_at.desc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati?cliente_id=eq." + clienteId + "&select=*&order=data_ordine.desc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/attivita_cliente?cliente_id=eq." + clienteId + "&select=*&order=data.desc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/sedi_cliente?cliente_id=eq." + clienteId + "&select=*&order=created_at.asc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/fatturato_commerciale?cliente_id=eq." + clienteId + "&select=*&order=anno.desc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/portafoglio_ordini?cliente_id=eq." + clienteId + "&select=*&order=data_rilevazione.desc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/opportunita_commerciali?cliente_id=eq." + clienteId + "&select=*&order=created_at.desc", { headers: headers() }),
      ]);
      const [dCliente, dVisite, dPreventivi, dDocumenti, dOrdini, dAttivita, dSedi, dFatturato, dPortafoglio, dOpportunita] = await Promise.all(results.map((r) => r.json()));
      const erroriExtra=results.slice(7).map((r,i)=>!r.ok?(["Fatturato","Portafoglio","Opportunità"][i]+": "+([dFatturato,dPortafoglio,dOpportunita][i]?.message||r.status)):null).filter(Boolean);
      setErroreEconomico(erroriExtra.join(" · "));
      setFatturatoCliente(Array.isArray(dFatturato)?dFatturato:[]);
      setPortafoglioCliente(Array.isArray(dPortafoglio)?dPortafoglio:[]);
      setOpportunitaCliente(Array.isArray(dOpportunita)?dOpportunita:[]);
      setCliente(dCliente && dCliente[0]);
      setVisite(Array.isArray(dVisite) ? dVisite : []);
      setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
      setDocumenti(Array.isArray(dDocumenti) ? dDocumenti : []);
      setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
      setAttivita(Array.isArray(dAttivita) ? dAttivita : []);
      setSedi(Array.isArray(dSedi) ? dSedi : []);
      if (dCliente && dCliente[0] && dCliente[0].gruppo_id) {
        try {
          const rGruppo = await crmFetch(SUPABASE_URL + "/rest/v1/gruppi_acquisto?id=eq." + dCliente[0].gruppo_id + "&select=*", { headers: headers() });
          const dGruppo = await rGruppo.json();
          setGruppo(dGruppo && dGruppo[0]);
        } catch (e) { setGruppo(null); }
      } else { setGruppo(null); }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [clienteId]);

  const aggiungiNota = async () => {
    if (!nota.trim()) return;
    await registraAttivita(session, clienteId, "nota", nota.trim());
    setNota(""); load();
  };
  const caricaDocumento = async (file) => {
    setUploadingDoc(true); setError("");
    try {
      const path = clienteId + "/" + Date.now() + "_" + file.name;
      await caricaFileStorage(session, "documenti-clienti", path, file);
      await crmFetch(SUPABASE_URL + "/rest/v1/documenti_cliente", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ cliente_id: clienteId, nome_file: file.name, tipo_documento: "documento", storage_path: path }) });
      await registraAttivita(session, clienteId, "documento", "Caricato documento: " + file.name);
      load();
    } catch (err) { setError(err.message); } finally { setUploadingDoc(false); }
  };
  const salvaOrdine = async () => {
    if (!formOrdine.azienda_id || !formOrdine.importo) { setError("Seleziona azienda e importo."); return; }
    setSavingOrdine(true); setError("");
    try {
      let path = null;
      if (fileOrdine) { path = clienteId + "/ordini/" + Date.now() + "_" + fileOrdine.name; await caricaFileStorage(session, "documenti-clienti", path, fileOrdine); }
      await crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ cliente_id: clienteId, azienda_id: formOrdine.azienda_id, importo: Number(formOrdine.importo) || 0, data_ordine: formOrdine.data_ordine, note: formOrdine.note || null, storage_path: path }) });
      await registraAttivita(session, clienteId, "ordine", "Registrato ordine confermato di " + formattaEuro(formOrdine.importo));
      setFormOrdine({ azienda_id: "", importo: "", data_ordine: new Date().toISOString().slice(0, 10), note: "" });
      setFileOrdine(null); load();
    } catch (err) { setError(err.message); } finally { setSavingOrdine(false); }
  };
  const rimuoviOrdine = async (id) => {
    if (!window.confirm("Eliminare questo ordine confermato?")) return;
    try {
      await crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati?id=eq." + id, { method: "DELETE", headers: headers() });
      await registraAttivita(session, clienteId, "ordine", "Ordine confermato eliminato");
      load();
    } catch (err) { setError(err.message); }
  };
  const salvaSede = async () => {
    if (!nuovaSede.indirizzo.trim()) { setError("L'indirizzo della sede è obbligatorio."); return; }
    setSalvandoSede(true); setError("");
    try {
      const coords = await geocodificaIndirizzo(nuovaSede.indirizzo);
      await crmFetch(SUPABASE_URL + "/rest/v1/sedi_cliente", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ cliente_id: clienteId, nome_sede: nuovaSede.nome_sede || null, indirizzo: nuovaSede.indirizzo, latitudine: coords ? coords.lat : null, longitudine: coords ? coords.lon : null }) });
      await registraAttivita(session, clienteId, "sede", "Aggiunta sede: " + (nuovaSede.nome_sede || nuovaSede.indirizzo));
      setNuovaSede({ nome_sede: "", indirizzo: "" }); load();
    } catch (err) { setError(err.message); } finally { setSalvandoSede(false); }
  };
  const rimuoviSede = async (id) => {
    if (!window.confirm("Eliminare questa sede?")) return;
    try { await crmFetch(SUPABASE_URL + "/rest/v1/sedi_cliente?id=eq." + id, { method: "DELETE", headers: headers() }); load(); } catch (err) { setError(err.message); }
  };

  const fatturatoAnno=fatturatoCliente.filter(f=>Number(f.anno)===Number(annoEconomico));
  const totaleFatturato=fatturatoAnno.reduce((t,f)=>t+Number(f.importo||0),0);
  const ultimeFotografie=new Map();
  const oggiRilevazione=new Date().toISOString().slice(0,10);
  portafoglioCliente.filter(p=>p.data_rilevazione<=oggiRilevazione).forEach(p=>{
    const prev=ultimeFotografie.get(p.azienda_id);
    if(!prev||p.data_rilevazione>prev.data_rilevazione)ultimeFotografie.set(p.azienda_id,p);
  });
  const portafoglioAttuale=[...ultimeFotografie.values()].reduce((t,p)=>t+Number(p.importo||0),0);
  const opportunitaAperte=opportunitaCliente.filter(o=>!["confermata","persa"].includes(o.fase));
  const valoreOpportunita=opportunitaAperte.reduce((t,o)=>t+Number(o.valore_stimato||0),0);
  const righeEconomiche=aziendeOptions.filter(a=>fatturatoAnno.some(f=>f.azienda_id===a.id)||ultimeFotografie.has(a.id)||opportunitaCliente.some(o=>o.azienda_id===a.id));
  const fasiNomi={primo_contatto:"Primo contatto",trattativa:"Trattativa",offerta_inviata:"Offerta inviata",confermata:"Confermata",persa:"Persa",sospesa:"Sospesa"};
  const kpiStyle={background:"#f6f9ff",border:"1px solid #e1e9f5",borderRadius:12,padding:16,minWidth:150,flex:1};
  const nomeAzienda = (id) => { const a = aziendeOptions.find((x) => x.id === id); return a ? a.nome : "—"; };
  const inputStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
  const sezione = (titolo, contenuto) => (
    <div style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 16, boxShadow: "0 6px 20px rgba(20,40,60,0.06)", padding: 22, marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, color: COLORS.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 4, height: 16, borderRadius: 2, background: COLORS.primary, display: "inline-block" }} />
        {titolo}
      </h3>
      {contenuto}
    </div>
  );

  if (loading) return <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento scheda cliente...</p>;
  if (!cliente) return <p style={{ color: COLORS.danger, fontSize: 13 }}>Cliente non trovato.</p>;

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 13, marginBottom: 14 }}>‹ Torna all'elenco clienti</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: cliente.colore || COLORS.primary }} />
        <h2 style={{ color: COLORS.text, fontSize: 22 }}>{cliente.ragione_sociale}</h2>
        {cliente.classificazione && <span style={{ fontSize: 12, color: COLORS.muted, background: COLORS.bg, padding: "3px 10px", borderRadius: 12 }}>{cliente.classificazione}</span>}
      </div>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}

      {sezione("Panoramica commerciale", (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <span style={{fontSize:12,color:COLORS.muted}}>Fatturato registrato, portafoglio rilevato e opportunità commerciali</span>
            <label style={{fontSize:12,color:COLORS.muted}}>Anno fatturato {" "}<select value={annoEconomico} onChange={e=>setAnnoEconomico(Number(e.target.value))} style={{border:"1px solid #dce5f1",borderRadius:8,padding:7}}>{Array.from(new Set([new Date().getFullYear(),...fatturatoCliente.map(f=>Number(f.anno))])).sort((a,b)=>b-a).map(y=><option key={y} value={y}>{y}</option>)}</select></label>
          </div>
          {erroreEconomico&&<p style={{color:COLORS.danger,fontSize:12}}>Dati economici parziali: {erroreEconomico}</p>}
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:18}}>
            <div style={kpiStyle}><div style={{fontSize:11,color:COLORS.muted}}>Fatturato {annoEconomico}</div><strong style={{fontSize:21}}>{formattaEuro(totaleFatturato)}</strong></div>
            <div style={kpiStyle}><div style={{fontSize:11,color:COLORS.muted}}>Portafoglio ultimo rilevamento</div><strong style={{fontSize:21}}>{formattaEuro(portafoglioAttuale)}</strong></div>
            <div style={kpiStyle}><div style={{fontSize:11,color:COLORS.muted}}>Trattative aperte ({opportunitaAperte.length})</div><strong style={{fontSize:21}}>{formattaEuro(valoreOpportunita)}</strong></div>
          </div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,textAlign:"left"}}><thead><tr style={{color:COLORS.muted,borderBottom:"1px solid #dce5f1"}}><th style={{padding:9}}>Mandante</th><th style={{padding:9}}>Fatturato {annoEconomico}</th><th style={{padding:9}}>Portafoglio</th><th style={{padding:9}}>Opportunità aperte</th></tr></thead><tbody>{righeEconomiche.map(a=><tr key={a.id} style={{borderBottom:"1px solid #edf1f6"}}><td style={{padding:9,fontWeight:600}}>{a.nome}</td><td style={{padding:9}}>{formattaEuro(fatturatoAnno.filter(f=>f.azienda_id===a.id).reduce((t,f)=>t+Number(f.importo||0),0))}</td><td style={{padding:9}}>{formattaEuro(ultimeFotografie.get(a.id)?.importo||0)}</td><td style={{padding:9}}>{formattaEuro(opportunitaAperte.filter(o=>o.azienda_id===a.id).reduce((t,o)=>t+Number(o.valore_stimato||0),0))}</td></tr>)}{righeEconomiche.length===0&&<tr><td colSpan={4} style={{padding:12,color:COLORS.muted}}>Nessun dato commerciale registrato per questo cliente.</td></tr>}</tbody></table></div>
          <p style={{fontSize:11,color:COLORS.muted,marginTop:12}}>Gli importi sono separati: non vengono sommati tra loro. Il portafoglio mostra l'ultima rilevazione disponibile per ciascuna mandante, non la somma dello storico.</p>
        </div>
      ))}
      {sezione("Opportunità commerciali", (
        opportunitaCliente.length===0?<p style={{fontSize:12,color:COLORS.muted}}>Nessuna opportunità collegata a questo cliente.</p>:<div>{opportunitaCliente.map(o=><div key={o.id} style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"11px 0",borderBottom:"1px solid #edf1f6",fontSize:12}}><div><strong>{o.titolo}</strong><div style={{color:COLORS.muted,marginTop:4}}>{nomeAzienda(o.azienda_id)} · {fasiNomi[o.fase]||o.fase}{o.prossima_azione?" · "+o.prossima_azione:""}</div></div><strong>{formattaEuro(o.valore_stimato)}</strong></div>)}</div>
      ))}

      {sezione("Dati anagrafici", (
        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8 }}>
          <div><strong>Indirizzo:</strong> {cliente.indirizzo || "-"}</div>
          <div><strong>Telefono:</strong> {cliente.telefono || "-"}</div>
          <div><strong>Email:</strong> {cliente.email || "-"}</div>
          <div><strong>Aziende collaborate:</strong> {(cliente.aziende_collaborate || []).join(", ") || "-"}</div>
          {gruppo && (
            <div style={{ marginTop: 8 }}><strong>Gruppo d'acquisto:</strong>{" "}
              <span onClick={() => onApriGruppo && onApriGruppo(gruppo.id)} style={{ color: COLORS.primary, cursor: onApriGruppo ? "pointer" : "default" }}>{gruppo.nome}</span>
            </div>
          )}
          {cliente.condizioni_per_azienda && Object.keys(cliente.condizioni_per_azienda).length > 0 && (
            <div style={{ marginTop: 8 }}><strong>Condizioni commerciali:</strong>
              <ul style={{ margin: "4px 0 0 18px" }}>{Object.entries(cliente.condizioni_per_azienda).map(([nomeAz, cond]) => (<li key={nomeAz} style={{ fontSize: 12 }}>{nomeAz}: {cond}</li>))}</ul>
            </div>
          )}
          <div style={{ marginTop: 8 }}><strong>Competitor:</strong> {(cliente.competitor || []).join(", ") || "-"}</div>
          <div style={{ marginTop: 8 }}><strong>Note generali:</strong> {cliente.note || "-"}</div>
        </div>
      ))}

      {sezione("Sedi / Filiali", (
        <div>
          {sedi.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Nessuna sede aggiuntiva inserita.</p> : (
            sedi.map((s) => (
              <div key={s.id} style={{ fontSize: 12, padding: "8px 0", borderBottom: "1px solid #f0f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>{s.nome_sede || "Sede"}</strong> — {s.indirizzo}</span>
                <button onClick={() => rimuoviSede(s.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 11 }}>Elimina</button>
              </div>
            ))
          )}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + COLORS.border, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="Nome sede (es. Filiale Nord)" value={nuovaSede.nome_sede} onChange={(e) => setNuovaSede({ ...nuovaSede, nome_sede: e.target.value })} style={{ ...inputStyle, width: 180, marginBottom: 0 }} />
            <input placeholder="Indirizzo *" value={nuovaSede.indirizzo} onChange={(e) => setNuovaSede({ ...nuovaSede, indirizzo: e.target.value })} style={{ ...inputStyle, width: 220, marginBottom: 0 }} />
            <button onClick={salvaSede} disabled={salvandoSede} style={{ padding: "8px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{salvandoSede ? "Salvataggio..." : "Aggiungi sede"}</button>
          </div>
        </div>
      ))}

      {sezione("Storico visite", (
        visite.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted }}>Nessuna visita registrata.</p> : (
          visite.map((v) => (<div key={v.id} style={{ fontSize: 12, padding: "8px 0", borderBottom: "1px solid #f0f5f9" }}><strong>{new Date(v.data_visita).toLocaleDateString("it-IT")}</strong>{v.argomenti_trattati ? " — " + v.argomenti_trattati : ""}</div>))
        )
      ))}

      {sezione("Preventivi collegati", (
        preventivi.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun preventivo per questo cliente.</p> : (
          preventivi.map((pv) => {
            const tot = calcolaTotaliPreventivo(pv, pv.righe || []);
            const infoStato = STATI_PREVENTIVO.find((s) => s.valore === pv.stato) || STATI_PREVENTIVO[0];
            return (
              <div key={pv.id} onClick={() => onApriPreventivo && onApriPreventivo(pv.id)} style={{ fontSize: 12, padding: "8px 0", borderBottom: "1px solid #f0f5f9", display: "flex", justifyContent: "space-between", cursor: onApriPreventivo ? "pointer" : "default" }}>
                <span><span style={{ color: infoStato.colore, fontWeight: 700 }}>● {infoStato.label}</span> — {nomeAzienda(pv.azienda_id)} — {pv.rif || "senza rif."} — {new Date(pv.data).toLocaleDateString("it-IT")}</span>
                <strong>{formattaEuro(tot.totaleFinale)}</strong>
              </div>
            );
          })
        )
      ))}

      {sezione("Ordini confermati", (
        <div>
          {ordini.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Nessun ordine confermato ancora.</p> : (
            ordini.map((o) => (
              <div key={o.id} style={{ fontSize: 12, padding: "8px 0", borderBottom: "1px solid #f0f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{nomeAzienda(o.azienda_id)} — {new Date(o.data_ordine).toLocaleDateString("it-IT")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong>{formattaEuro(o.importo)}</strong>
                  {o.storage_path && <a href={urlPubblicoStorage("documenti-clienti", o.storage_path)} target="_blank" rel="noreferrer" style={{ color: COLORS.primary, fontSize: 11 }}>PDF</a>}
                  <button onClick={() => rimuoviOrdine(o.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 11 }}>Elimina</button>
                </span>
              </div>
            ))
          )}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + COLORS.border }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={formOrdine.azienda_id} onChange={(e) => setFormOrdine({ ...formOrdine, azienda_id: e.target.value })} style={{ ...inputStyle, width: 160, marginBottom: 0 }}>
                <option value="">-- Azienda --</option>
                {aziendeOptions.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
              <input type="number" placeholder="Importo €" value={formOrdine.importo} onChange={(e) => setFormOrdine({ ...formOrdine, importo: e.target.value })} style={{ ...inputStyle, width: 110, marginBottom: 0 }} />
              <input type="date" value={formOrdine.data_ordine} onChange={(e) => setFormOrdine({ ...formOrdine, data_ordine: e.target.value })} style={{ ...inputStyle, width: 140, marginBottom: 0 }} />
              <label style={{ ...inputStyle, width: "auto", marginBottom: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: COLORS.primary }}>
                <Upload size={13} /> {fileOrdine ? fileOrdine.name.slice(0, 16) : "PDF ordine"}
                <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => setFileOrdine((e.target.files && e.target.files[0]) || null)} />
              </label>
              <button onClick={salvaOrdine} disabled={savingOrdine} style={{ padding: "8px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{savingOrdine ? "Salvataggio..." : "Registra ordine"}</button>
            </div>
          </div>
        </div>
      ))}

      {sezione("Documenti", (
        <div>
          {documenti.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Nessun documento caricato.</p> : (
            documenti.map((d) => (<div key={d.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #f0f5f9" }}><a href={urlPubblicoStorage("documenti-clienti", d.storage_path)} target="_blank" rel="noreferrer" style={{ color: COLORS.primary }}>{d.nome_file}</a><span style={{ color: COLORS.muted, marginLeft: 8 }}>{new Date(d.created_at).toLocaleDateString("it-IT")}</span></div>))
          )}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.primary, cursor: "pointer", marginTop: 10 }}>
            <Upload size={13} /> {uploadingDoc ? "Caricamento..." : "Carica documento"}
            <input type="file" style={{ display: "none" }} onChange={(e) => { const file = e.target.files && e.target.files[0]; if (file) caricaDocumento(file); e.target.value = ""; }} />
          </label>
        </div>
      ))}

      <CampionatureSchedaCliente preventivi={preventivi}/>
      {sezione("Cronologia attività", (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input placeholder="Aggiungi una nota rapida..." value={nota} onChange={(e) => setNota(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
            <button onClick={aggiungiNota} style={{ padding: "8px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Aggiungi</button>
          </div>
          {attivita.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted }}>Nessuna attività registrata.</p> : (
            attivita.map((att) => (<div key={att.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #f0f5f9" }}><span style={{ color: COLORS.muted }}>{new Date(att.data).toLocaleDateString("it-IT")}</span> — {att.descrizione}</div>))
          )}
        </div>
      ))}
    </div>
  );
}

const CLASSIFICAZIONI_ELENCO = CLASSIFICAZIONI;


// Elementi visivi delle anagrafiche: nessun dato dimostrativo, solo dati reali Supabase.
const CRM_AVATAR_PALETTE = [ ["#dbeafe", "#155eef"], ["#f3d8ff", "#8a39c4"], ["#d5f7df", "#147d40"], ["#ffebc0", "#a05b00"], ["#ffe0e0", "#a62f35"], ["#e1e6f0", "#35435f"] ];
function crmAvatarStyle(value) {
  const n = [...String(value || "")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const [bg, fg] = CRM_AVATAR_PALETTE[n % CRM_AVATAR_PALETTE.length];
  return { background: bg, color: fg };
}
function crmInitials(value) {
  return String(value || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();
}
function crmLocalita(indirizzo) {
  const parti = String(indirizzo || "").split(",").map(s => s.trim()).filter(Boolean);
  return parti.length ? parti[parti.length - 1] : "Località non indicata";
}
function crmFavoriteButton(id, favorites, setFavorites) {
  const active = favorites.includes(id);
  return <button type="button" className={"crm-ref-star" + (active ? " is-favorite" : "")} aria-label={active ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"} aria-pressed={active} onClick={e => { e.stopPropagation(); setFavorites(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]); }}>{active ? "★" : "☆"}</button>;
}
function ClientiAnagrafica({ session, apriPreventivo, apriGruppo, soloArchitetti = false }) {
  const [list, setList] = useState([]);
  const [aziendeOptions, setAziendeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const emptyForm = { ragione_sociale: "", indirizzo: "", telefono: "", email: "", classificazione: soloArchitetti ? "Architetto" : "", aziende_collaborate: [], condizioni_per_azienda: {}, competitor: "", note: "" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtroClassificazione, setFiltroClassificazione] = useState("");
  const [ricercaAnagrafica, setRicercaAnagrafica] = useState("");
  const [filtroStatoUI, setFiltroStatoUI] = useState("tutti");
  const [mostraFormAnagrafica, setMostraFormAnagrafica] = useState(false);
  const [preferitiAnagrafica, setPreferitiAnagrafica] = useState(() => { try { return JSON.parse(localStorage.getItem("crm-preferiti-anagrafiche") || "[]"); } catch { return []; } });
  useEffect(() => { try { localStorage.setItem("crm-preferiti-anagrafiche", JSON.stringify(preferitiAnagrafica)); } catch {} }, [preferitiAnagrafica]);

  const [vistaAnagrafica, setVistaAnagrafica] = useState(() => typeof window !== "undefined" && window.innerWidth <= 700 ? "schede" : "elenco");
  const [clienteApertoId, setClienteApertoId] = useState(null);
  const [sediForm, setSediForm] = useState([]);
  const [sediEsistenti, setSediEsistenti] = useState([]);
  const [nuovaSedeForm, setNuovaSedeForm] = useState({ nome_sede: "", indirizzo: "" });
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const results = await Promise.all([
        crmFetch(SUPABASE_URL + "/rest/v1/clienti?select=*&order=ragione_sociale.asc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc", { headers: headers() }),
      ]);
      const dataClienti = await results[0].json();
      const dataAziende = await results[1].json();
      if (!results[0].ok) throw new Error(dataClienti.message || "Errore nel caricamento clienti");
      setList(dataClienti);
      if (results[1].ok) setAziendeOptions(dataAziende);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setMostraFormAnagrafica(false); setForm(emptyForm); setEditingId(null); setSediForm([]); setSediEsistenti([]); setNuovaSedeForm({ nome_sede: "", indirizzo: "" }); };

  const aggiungiSedeAlForm = () => {
    if (!nuovaSedeForm.indirizzo.trim()) return;
    setSediForm((s) => [...s, nuovaSedeForm]);
    setNuovaSedeForm({ nome_sede: "", indirizzo: "" });
  };
  const rimuoviSedeDalForm = (idx) => setSediForm((s) => s.filter((_, i) => i !== idx));
  const aggiungiSedeSubito = async () => {
    if (!nuovaSedeForm.indirizzo.trim() || !editingId) return;
    try {
      const coords = await geocodificaIndirizzo(nuovaSedeForm.indirizzo);
      await crmFetch(SUPABASE_URL + "/rest/v1/sedi_cliente", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ cliente_id: editingId, nome_sede: nuovaSedeForm.nome_sede || null, indirizzo: nuovaSedeForm.indirizzo, latitudine: coords ? coords.lat : null, longitudine: coords ? coords.lon : null }) });
      setNuovaSedeForm({ nome_sede: "", indirizzo: "" });
      const res = await crmFetch(SUPABASE_URL + "/rest/v1/sedi_cliente?cliente_id=eq." + editingId + "&select=*", { headers: headers() });
      const data = await res.json();
      if (res.ok) setSediEsistenti(data);
    } catch (err) { setError(err.message); }
  };
  const rimuoviSedeEsistente = async (id) => {
    try { await crmFetch(SUPABASE_URL + "/rest/v1/sedi_cliente?id=eq." + id, { method: "DELETE", headers: headers() }); setSediEsistenti((s) => s.filter((x) => x.id !== id)); } catch (err) { setError(err.message); }
  };

  const toggleAzienda = (nome) => {
    setForm((f) => {
      const giaSelezionata = f.aziende_collaborate.includes(nome);
      const nuoveAziende = giaSelezionata ? f.aziende_collaborate.filter((n) => n !== nome) : [...f.aziende_collaborate, nome];
      const nuoveCondizioni = { ...f.condizioni_per_azienda };
      if (giaSelezionata) delete nuoveCondizioni[nome];
      return { ...f, aziende_collaborate: nuoveAziende, condizioni_per_azienda: nuoveCondizioni };
    });
  };
  const aggiornaCondizione = (nome, testo) => setForm((f) => ({ ...f, condizioni_per_azienda: { ...f.condizioni_per_azienda, [nome]: testo } }));

  const save = async () => {
    if (!form.ragione_sociale.trim()) { setError("La ragione sociale è obbligatoria."); return; }
    setSaving(true); setError("");
    try {
      let coords = null;
      if (form.indirizzo && form.indirizzo.trim()) coords = await geocodificaIndirizzo(form.indirizzo);
      const body = {
        ragione_sociale: form.ragione_sociale, indirizzo: form.indirizzo || null, telefono: form.telefono || null,
        email: form.email || null, classificazione: form.classificazione || null,
        aziende_collaborate: form.aziende_collaborate, condizioni_per_azienda: form.condizioni_per_azienda,
        competitor: form.competitor ? form.competitor.split(",").map((s) => s.trim()).filter(Boolean) : [],
        note: form.note || null,
        ...(coords ? { latitudine: coords.lat, longitudine: coords.lon } : {}),
      };
      const res = editingId
        ? await crmFetch(SUPABASE_URL + "/rest/v1/clienti?id=eq." + editingId, { method: "PATCH", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) })
        : await crmFetch(SUPABASE_URL + "/rest/v1/clienti", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio");
      const idSalvato = editingId || (data && data[0] && data[0].id);
      if (idSalvato) await registraAttivita(session, idSalvato, "modifica", editingId ? "Scheda anagrafica aggiornata" : "Cliente creato");
      if (!editingId && idSalvato && sediForm.length > 0) {
        for (const sede of sediForm) {
          try {
            const coordsSede = await geocodificaIndirizzo(sede.indirizzo);
            await crmFetch(SUPABASE_URL + "/rest/v1/sedi_cliente", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ cliente_id: idSalvato, nome_sede: sede.nome_sede || null, indirizzo: sede.indirizzo, latitudine: coordsSede ? coordsSede.lat : null, longitudine: coordsSede ? coordsSede.lon : null }) });
          } catch (e) {}
        }
      }
      resetForm(); load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const edit = async (cliente) => {
    setMostraFormAnagrafica(true); setEditingId(cliente.id);
    setForm({
      ragione_sociale: cliente.ragione_sociale || "", indirizzo: cliente.indirizzo || "", telefono: cliente.telefono || "",
      email: cliente.email || "", classificazione: cliente.classificazione || "",
      aziende_collaborate: cliente.aziende_collaborate || [], condizioni_per_azienda: cliente.condizioni_per_azienda || {},
      competitor: (cliente.competitor || []).join(", "), note: cliente.note || "",
    });
    try {
      const res = await crmFetch(SUPABASE_URL + "/rest/v1/sedi_cliente?cliente_id=eq." + cliente.id + "&select=*", { headers: headers() });
      const data = await res.json();
      if (res.ok) setSediEsistenti(data);
    } catch (e) {}
  };

  const remove = async (id) => {
    if (!window.confirm("Eliminare questo cliente?")) return;
    try {
      const res = await crmFetch(SUPABASE_URL + "/rest/v1/clienti?id=eq." + id, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) { setError(err.message); }
  };

  const inputStyle = { width: "100%", padding: "12px 13px", marginBottom: 12, border: "1px solid #dce7f1", borderRadius: 11, fontSize: 14, boxSizing: "border-box", background: "#fbfdff", color: "#18354e" };
  const elencoSezione = list.filter(c => soloArchitetti ? c.classificazione === "Architetto" : c.classificazione !== "Architetto");
  const filteredList = elencoSezione.filter(c => (!filtroClassificazione || c.classificazione === filtroClassificazione) && (filtroStatoUI !== "preferiti" || preferitiAnagrafica.includes(c.id)) && (!ricercaAnagrafica.trim() || [c.ragione_sociale, c.indirizzo, c.telefono, c.email, c.classificazione].some(v => String(v || "").toLocaleLowerCase("it").includes(ricercaAnagrafica.trim().toLocaleLowerCase("it")))));

  if (clienteApertoId) {
    return (
      <SchedaCliente clienteId={clienteApertoId} session={session} aziendeOptions={aziendeOptions} onApriPreventivo={apriPreventivo} onApriGruppo={apriGruppo}
        onBack={() => { setClienteApertoId(null); load(); }} />
    );
  }

  return (
    <div className="crm-anagrafiche-premium crm-ref-page">
      <div className="crm-ref-heading"><h2>{soloArchitetti ? "Architetti" : "Clienti"}</h2><button className="crm-ref-primary" type="button" onClick={() => { if (mostraFormAnagrafica) resetForm(); else { resetForm(); setMostraFormAnagrafica(true); } }}>{mostraFormAnagrafica ? "Chiudi" : soloArchitetti ? "+ Nuovo architetto" : "+ Nuovo cliente"}</button></div>
      <div className="crm-ref-layout">
        {mostraFormAnagrafica && (
        <div className="crm-ref-form" style={{ flex: "1 1 300px", background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, boxShadow: "0 4px 14px rgba(20,40,60,0.05)", padding: 22, maxWidth: 440 }}>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:1.2,color:"#2475b6",fontWeight:750,marginBottom:7}}>Anagrafica · {soloArchitetti ? "Architetti" : "Clienti"}</div>
          <h3 style={{ fontSize: 21, color: "#17354d", margin:"0 0 6px",letterSpacing:"-.5px" }}>{editingId ? "Modifica anagrafica" : soloArchitetti ? "Nuovo architetto" : "Nuovo cliente"}</h3>
          <p style={{fontSize:12,color:"#75899b",margin:"0 0 22px"}}>Inserisci i dati principali, poi completa le informazioni commerciali.</p>
          <div className="crm-form-section-heading">01 · Dati principali</div>
          <label className="crm-form-label">{soloArchitetti ? "Studio / nominativo *" : "Ragione sociale *"}</label>
          <input placeholder="Ragione sociale *" value={form.ragione_sociale} onChange={(e) => setForm({ ...form, ragione_sociale: e.target.value })} style={inputStyle} />
          <label className="crm-form-label">Indirizzo principale</label>
          <input placeholder="Indirizzo" value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} style={inputStyle} />
          <div className="crm-form-section-heading">02 · Contatti</div>
          <label className="crm-form-label">Telefono</label>
          <input placeholder="Telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={inputStyle} />
          <label className="crm-form-label">Email</label>
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
          <div className="crm-form-section-heading">03 · Profilo commerciale</div>
          <label className="crm-form-label">Classificazione</label>
          <select value={form.classificazione} onChange={(e) => setForm({ ...form, classificazione: e.target.value })} style={inputStyle}>
            <option value="">-- seleziona --</option>
            {(soloArchitetti ? ["Architetto"] : CLASSIFICAZIONI_ELENCO.filter(c => c !== "Architetto")).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>Aziende mandanti con cui collabora</label>
          <div style={{ marginBottom: 10, maxHeight: 220, overflowY: "auto", border: "1px solid " + COLORS.border, borderRadius: 8, padding: 8 }}>
            {aziendeOptions.length === 0 && <span style={{ fontSize: 12, color: "#9aa7b2" }}>Nessuna azienda mandante inserita ancora</span>}
            {aziendeOptions.map((a) => (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4 }}>
                  <input type="checkbox" checked={form.aziende_collaborate.includes(a.nome)} onChange={() => toggleAzienda(a.nome)} /> {a.nome}
                </label>
                {form.aziende_collaborate.includes(a.nome) && (
                  <input placeholder={"Condizioni commerciali con " + a.nome} value={form.condizioni_per_azienda[a.nome] || ""} onChange={(e) => aggiornaCondizione(a.nome, e.target.value)} style={{ ...inputStyle, marginBottom: 0, marginLeft: 22, width: "calc(100% - 22px)", fontSize: 11 }} />
                )}
              </div>
            ))}
          </div>
          <input placeholder="Competitor (separati da virgola)" value={form.competitor} onChange={(e) => setForm({ ...form, competitor: e.target.value })} style={inputStyle} />
          <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />

          <div className="crm-form-section-heading">04 · Sedi aggiuntive</div>
          <label className="crm-form-label">Sedi / Filiali aggiuntive</label>
          <div style={{ marginBottom: 10, border: "1px solid " + COLORS.border, borderRadius: 8, padding: 8 }}>
            {editingId ? (
              sediEsistenti.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 4 }}>
                  <span><strong>{s.nome_sede || "Sede"}</strong> — {s.indirizzo}</span>
                  <button onClick={() => rimuoviSedeEsistente(s.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 11 }}>Elimina</button>
                </div>
              ))
            ) : (
              sediForm.map((s, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 4 }}>
                  <span><strong>{s.nome_sede || "Sede"}</strong> — {s.indirizzo}</span>
                  <button onClick={() => rimuoviSedeDalForm(idx)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 11 }}>Rimuovi</button>
                </div>
              ))
            )}
            {sediEsistenti.length === 0 && sediForm.length === 0 && <span style={{ fontSize: 11, color: "#9aa7b2" }}>Nessuna sede aggiuntiva.</span>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <input placeholder="Nome sede (opz.)" value={nuovaSedeForm.nome_sede} onChange={(e) => setNuovaSedeForm({ ...nuovaSedeForm, nome_sede: e.target.value })} style={{ ...inputStyle, marginBottom: 0, width: 110, fontSize: 11 }} />
              <input placeholder="Indirizzo" value={nuovaSedeForm.indirizzo} onChange={(e) => setNuovaSedeForm({ ...nuovaSedeForm, indirizzo: e.target.value })} style={{ ...inputStyle, marginBottom: 0, width: 140, fontSize: 11 }} />
              <button onClick={editingId ? aggiungiSedeSubito : aggiungiSedeAlForm} style={{ padding: "6px 10px", background: "#fff", color: COLORS.primary, border: "1px solid " + COLORS.border, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>+ Aggiungi</button>
            </div>
          </div>

          {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Salvataggio..." : editingId ? "Salva modifiche" : soloArchitetti ? "Crea architetto" : "Crea cliente"}</button>
            {editingId && <button onClick={resetForm} style={{ padding: "9px 16px", background: "#fff", color: COLORS.primary, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annulla</button>}
          </div>
        </div>
        )}
        <div className="crm-ref-list-area">
          <div className="crm-ref-tools"><div className="crm-ref-search"><Search size={17}/><input aria-label="Cerca anagrafica" placeholder={soloArchitetti ? "Cerca architetto..." : "Cerca cliente..."} value={ricercaAnagrafica} onChange={e => setRicercaAnagrafica(e.target.value)}/></div>
            {!soloArchitetti && <select aria-label="Filtra tipologia" value={filtroClassificazione} onChange={e => setFiltroClassificazione(e.target.value)}><option value="">Filtri · Tutte le tipologie</option>{CLASSIFICAZIONI_ELENCO.filter(c => c !== "Architetto").map(c => <option key={c} value={c}>{c}</option>)}</select>}
          </div>
          <div className="crm-ref-tabs"><button className={filtroStatoUI === "tutti" ? "active" : ""} onClick={() => setFiltroStatoUI("tutti")}>Tutti ({elencoSezione.length})</button><button className={filtroStatoUI === "preferiti" ? "active" : ""} onClick={() => setFiltroStatoUI("preferiti")}>★ Preferiti ({elencoSezione.filter(c => preferitiAnagrafica.includes(c.id)).length})</button></div>
          {loading ? <p className="crm-ref-empty">Caricamento...</p> : filteredList.length === 0 ? <p className="crm-ref-empty">Nessun risultato.</p> : <>
            <div className="crm-ref-desktop"><table><thead><tr><th>{soloArchitetti ? "Architetto" : "Cliente"}</th><th>Tipologia</th><th>Località</th><th>Contatto</th><th>Preferiti</th><th>Azioni</th></tr></thead><tbody>
              {filteredList.map(c => <tr key={c.id}><td><button className="crm-ref-name" onClick={() => setClienteApertoId(c.id)}><span className="crm-ref-avatar" style={crmAvatarStyle(c.ragione_sociale)}>{crmInitials(c.ragione_sociale)}</span><strong>{c.ragione_sociale}</strong></button></td><td>{c.classificazione || "—"}</td><td>{crmLocalita(c.indirizzo)}</td><td>{c.telefono || c.email || "—"}</td><td>{crmFavoriteButton(c.id, preferitiAnagrafica, setPreferitiAnagrafica)}</td><td><button className="crm-ref-action" onClick={() => edit(c)}>Modifica</button><button className="crm-ref-delete" onClick={() => remove(c.id)}>Elimina</button></td></tr>)}
            </tbody></table></div>
            <div className="crm-ref-mobile">{filteredList.map(c => <div className="crm-ref-mobile-row" key={c.id}><button className="crm-ref-mobile-open" onClick={() => setClienteApertoId(c.id)}><span className="crm-ref-avatar" style={crmAvatarStyle(c.ragione_sociale)}>{crmInitials(c.ragione_sociale)}</span><span className="crm-ref-mobile-copy"><strong>{c.ragione_sociale}</strong><small>{c.classificazione || (soloArchitetti ? "Architetto" : "Cliente")} · {crmLocalita(c.indirizzo)}</small></span></button>{crmFavoriteButton(c.id, preferitiAnagrafica, setPreferitiAnagrafica)}<button className="crm-ref-chevron" aria-label="Apri scheda" onClick={() => setClienteApertoId(c.id)}><ChevronRight size={19}/></button></div>)}</div>
          </>}
        </div>
      </div>
    </div>
  );
}

function CalendarioVisite({ session }) {
  const oggi = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const nuovo = (data = oggi()) => ({ titolo: "", tipo: "visita", data, oraInizio: "09:00", oraFine: "10:00", stato: "programmato", cliente_id: "", sede_id: "", azienda_id: "", luogo: "", descrizione: "", note: "", promemoria_minuti: 30, fineManuale: false });
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [sedi, setSedi] = useState([]);
  const [appuntamenti, setAppuntamenti] = useState([]);
  const [attivitaAgenda, setAttivitaAgenda] = useState([]);
  const [mostraAttivitaAgenda, setMostraAttivitaAgenda] = useState(true);
  const [mostraCompletateAgenda, setMostraCompletateAgenda] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState(() => typeof window !== "undefined" && window.innerWidth <= 700 ? "giorno" : "settimana");
  const [mobileAgenda, setMobileAgenda] = useState(() => typeof window !== "undefined" && window.innerWidth <= 700);
  useEffect(() => { const sync = () => setMobileAgenda(window.innerWidth <= 700); window.addEventListener("resize", sync); return () => window.removeEventListener("resize", sync); }, []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mostraForm, setMostraForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(nuovo());
  const [saving, setSaving] = useState(false);
  const aggiungiMinuti = (ora, minuti) => {
    if (!/^\d{2}:\d{2}$/.test(ora)) return ora;
    const [h,m] = ora.split(":").map(Number);
    const totale = (h * 60 + m + minuti) % 1440;
    return `${String(Math.floor(totale/60)).padStart(2,"0")}:${String(totale%60).padStart(2,"0")}`;
  };
  const cambiaInizio = oraInizio => setForm(f => ({ ...f, oraInizio, oraFine: f.fineManuale ? f.oraFine : aggiungiMinuti(oraInizio, 60) }));

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });
  const isoLocale = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const load = async () => {
    setLoading(true); setError("");
    try {
      const urls = ["clienti?select=id,ragione_sociale&order=ragione_sociale.asc", "aziende_mandanti?select=id,nome,colore&order=nome.asc", "sedi_cliente?select=id,cliente_id,nome_sede,indirizzo", "appuntamenti?select=*&order=inizio.asc", "crm_attivita?select=*&order=scadenza.asc.nullslast"];
      const results = await Promise.all(urls.map(u => crmFetch(SUPABASE_URL + "/rest/v1/" + u, { headers: headers() })));
      const values = await Promise.all(results.map(r => r.json()));
      results.forEach((r,i) => { if (!r.ok) throw new Error(values[i].message || "Errore nel caricamento dell'agenda"); });
      setClienti(values[0]); setAziende(values[1]); setSedi(values[2]); setAppuntamenti(values[3]); setAttivitaAgenda(Array.isArray(values[4]) ? values[4] : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("appuntamento");
    if (!target || !appuntamenti.length) return;
    const trovato = appuntamenti.find(e => e.id === target);
    if (trovato) { apriModifica(trovato); window.history.replaceState({}, "", window.location.pathname); }
  }, [appuntamenti]);
  const apriNuovo = (data = isoLocale(currentDate)) => { setEditingId(null); setForm(nuovo(data)); setMostraForm(true); setError(""); };
  const apriModifica = (e) => {
    const inizio = new Date(e.inizio), fine = new Date(e.fine);
    setEditingId(e.id);
    setForm({ titolo: e.titolo || "", tipo: e.tipo || "visita", data: isoLocale(inizio), oraInizio: `${String(inizio.getHours()).padStart(2,"0")}:${String(inizio.getMinutes()).padStart(2,"0")}`, oraFine: `${String(fine.getHours()).padStart(2,"0")}:${String(fine.getMinutes()).padStart(2,"0")}`, stato: e.stato || "programmato", cliente_id: e.cliente_id || "", sede_id: e.sede_id || "", azienda_id: e.azienda_id || "", luogo: e.luogo || "", descrizione: e.descrizione || "", note: e.note || "", promemoria_minuti: e.promemoria_minuti ?? 30, fineManuale: true });
    setMostraForm(true); setError("");
  };
  const save = async () => {
    if (!form.titolo.trim()) { setError("Inserisci il titolo dell'appuntamento."); return; }
    const inizio = new Date(`${form.data}T${form.oraInizio}:00`), fine = new Date(`${form.data}T${form.oraFine}:00`);
    if (!Number.isFinite(inizio.getTime()) || !Number.isFinite(fine.getTime()) || fine <= inizio) { setError("Controlla data e orari: la fine deve essere successiva all'inizio."); return; }
    setSaving(true); setError("");
    try {
      const body = { titolo: form.titolo.trim(), tipo: form.tipo, inizio: inizio.toISOString(), fine: fine.toISOString(), stato: form.stato, cliente_id: form.cliente_id || null, sede_id: form.sede_id || null, azienda_id: form.azienda_id || null, luogo: form.luogo || null, descrizione: form.descrizione || null, note: form.note || null, promemoria_minuti: Number(form.promemoria_minuti), ...(!editingId ? {user_id:session.user.id} : {}) };
      const endpoint = SUPABASE_URL + "/rest/v1/appuntamenti" + (editingId ? "?id=eq." + editingId : "");
      const res = await crmFetch(endpoint, { method: editingId ? "PATCH" : "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || "Errore nel salvataggio"); }
      setMostraForm(false); setEditingId(null); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (!window.confirm("Eliminare questo appuntamento?")) return;
    try { const res = await crmFetch(SUPABASE_URL + "/rest/v1/appuntamenti?id=eq." + id, { method: "DELETE", headers: headers() }); if (!res.ok) throw new Error("Eliminazione non riuscita"); setMostraForm(false); await load(); } catch (e) { setError(e.message); }
  };
  const cambiaPeriodo = (n) => { const d = new Date(currentDate); if (viewMode === "mese") d.setMonth(d.getMonth()+n); else d.setDate(d.getDate() + n*(viewMode === "settimana" ? 7 : 1)); setCurrentDate(d); };
  const eventiGiorno = (d) => appuntamenti.filter(e => isoLocale(new Date(e.inizio)) === isoLocale(d)).sort((a,b) => new Date(a.inizio)-new Date(b.inizio));
  const attivitaDelGiorno = d => attivitaAgenda.filter(a => a.scadenza && isoLocale(new Date(a.scadenza)) === isoLocale(d) && (mostraCompletateAgenda || a.stato !== "completata"));
  const attivitaSenzaData = attivitaAgenda.filter(a => !a.scadenza && (mostraCompletateAgenda || a.stato !== "completata"));
  const schedaAttivita = a => <div key={"task-"+a.id} title={a.note || "Attività commerciale"} style={{background:a.stato==="completata"?"#f7f5e9":"#fff3bc",border:"1px solid #efd87c",borderLeft:"4px solid #e5ab24",borderRadius:8,padding:"7px 9px",marginBottom:5,color:"#75531b",fontSize:12,overflowWrap:"anywhere",opacity:a.stato==="completata"?.65:1}}><strong>{a.stato==="completata"?"✓ ":""}{a.titolo}</strong>{a.scadenza && new Date(a.scadenza).getHours()+new Date(a.scadenza).getMinutes()>0 && <div style={{fontSize:10,marginTop:3}}>{new Date(a.scadenza).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</div>}</div>;
  const nomeCliente = id => clienti.find(c => c.id === id)?.ragione_sociale || "";
  const coloreEvento = e => aziende.find(a => a.id === e.azienda_id)?.colore || "#0b7bc4";
  const ora = value => new Date(value).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const inputStyle = { width: "100%", minWidth: 0, maxWidth: "100%", display: "block", padding: "10px 12px", border: "1px solid " + COLORS.border, borderRadius: 9, fontSize: 16, background: "#fff", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" };
  const campo = (label, element) => <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: COLORS.text }}>{label}{element}</label>;
  const eventCard = e => <button key={e.id} onClick={() => apriModifica(e)} title="Apri e modifica appuntamento" style={{ display: "block", width: "100%", textAlign: "left", background: coloreEvento(e)+"16", border: "1px solid "+coloreEvento(e)+"45", borderLeft: "4px solid "+coloreEvento(e), borderRadius: 7, padding: "7px 8px", marginBottom: 5, cursor: "pointer", color: COLORS.text }}><span style={{ fontSize: 11, fontWeight: 700 }}>{ora(e.inizio)}–{ora(e.fine)}</span><div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{e.titolo}</div>{e.cliente_id && <div style={{ fontSize: 10, color: COLORS.muted }}>{nomeCliente(e.cliente_id)}</div>}{e.stato !== "programmato" && <div style={{ fontSize: 10, color: COLORS.muted, textTransform: "capitalize" }}>{e.stato}</div>}</button>;
  const giorni = viewMode === "mese" ? getMonthGrid(currentDate) : viewMode === "settimana" ? getWeekDays(currentDate) : [currentDate];
  const titoloPeriodo = viewMode === "mese" ? `${MESI[currentDate.getMonth()]} ${currentDate.getFullYear()}` : viewMode === "giorno" ? currentDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : `${giorni[0].toLocaleDateString("it-IT", {day:"numeric",month:"short"})} – ${giorni[6].toLocaleDateString("it-IT", {day:"numeric",month:"short",year:"numeric"})}`;
  return <div className="agenda-responsive" style={{ fontFamily: "Arial, sans-serif", color: COLORS.text, minWidth:0, width:"100%" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}><div><h2 style={{ fontSize: 23, margin: 0 }}>Agenda commerciale</h2><p style={{ color: COLORS.muted, fontSize: 12, marginTop: 6 }}>Visite, riunioni, telefonate e attività in un unico calendario</p></div><button onClick={() => apriNuovo()} style={{ background: COLORS.primary, color: "white", border: 0, borderRadius: 10, padding: "11px 17px", fontWeight: 700, cursor: "pointer" }}>+ Nuovo appuntamento</button></div>
    <div style={{display:"flex",alignItems:"center",gap:13,flexWrap:"wrap",marginBottom:15,fontSize:12,color:"#60758b"}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:11,height:11,background:"#dbeafe",borderRadius:3}}/> Appuntamenti</span><label style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer"}}><input type="checkbox" checked={mostraAttivitaAgenda} onChange={e=>setMostraAttivitaAgenda(e.target.checked)}/><span style={{width:11,height:11,background:"#f7d970",borderRadius:3}}/> Attività</label><label style={{display:"inline-flex",alignItems:"center",gap:5,cursor:"pointer"}}><input type="checkbox" checked={mostraCompletateAgenda} onChange={e=>setMostraCompletateAgenda(e.target.checked)}/> Mostra completate</label></div>
    {mostraAttivitaAgenda && attivitaSenzaData.length>0 && <section style={{background:"#fff",border:"1px solid #e2eaf2",borderRadius:13,padding:13,marginBottom:16}}><strong style={{fontSize:13,color:"#18354e"}}>Attività senza scadenza ({attivitaSenzaData.length})</strong><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,210px),1fr))",gap:7,marginTop:10}}>{attivitaSenzaData.map(schedaAttivita)}</div></section>}
    {error && <div style={{ color: COLORS.danger, marginBottom: 12, fontSize: 13 }}>{error}</div>}
    {mostraForm && <div style={{ background: "white", border: "1px solid " + COLORS.border, borderRadius: 14, padding: mobileAgenda ? 14 : 20, marginBottom: 20, maxWidth: 760, minWidth: 0, boxSizing: "border-box", boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}><h3 style={{ marginTop: 0 }}>{editingId ? "Modifica appuntamento" : "Nuovo appuntamento"}</h3><div style={{ display: "grid", gridTemplateColumns: mobileAgenda ? "minmax(0,1fr)" : "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
      {campo("Titolo *", <input style={inputStyle} value={form.titolo} onChange={e=>setForm({...form,titolo:e.target.value})} placeholder="Es. Visita showroom" />)}
      {campo("Tipologia", <select style={inputStyle} value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>{[["visita","Visita cliente"],["architetto","Appuntamento architetto"],["telefonata","Telefonata"],["riunione","Riunione"],["promemoria","Promemoria"],["attivita","Attività"],["altro","Altro"]].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select>)}
      {campo("Data", <input type="date" style={inputStyle} value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/>)}
      {campo("Ora inizio", <input type="time" style={inputStyle} value={form.oraInizio} onChange={e=>cambiaInizio(e.target.value)}/>)}
      {campo("Ora fine", <input type="time" style={inputStyle} value={form.oraFine} onChange={e=>setForm(f=>({...f,oraFine:e.target.value,fineManuale:true}))}/>)}
      {campo("Promemoria", <select style={inputStyle} value={String(form.promemoria_minuti)} onChange={e=>setForm(f=>({...f,promemoria_minuti:Number(e.target.value)}))}>
        <option value="0">All'ora dell'appuntamento</option>
        <option value="5">5 minuti prima</option><option value="15">15 minuti prima</option>
        <option value="30">30 minuti prima</option><option value="60">1 ora prima</option>
        <option value="120">2 ore prima</option><option value="1440">1 giorno prima</option>
        <option value="2880">2 giorni prima</option>
        {!([0,5,15,30,60,120,1440,2880].includes(Number(form.promemoria_minuti))) && <option value={form.promemoria_minuti}>Personalizzato: {form.promemoria_minuti} minuti</option>}
      </select>)}
      {campo("Promemoria personalizzato (minuti prima)", <input type="number" min="0" max="10080" step="1" style={inputStyle} value={form.promemoria_minuti} onChange={e=>setForm(f=>({...f,promemoria_minuti:e.target.value}))}/>)}
      {campo("Stato", <select style={inputStyle} value={form.stato} onChange={e=>setForm({...form,stato:e.target.value})}>{["programmato","completato","annullato","rinviato"].map(v=><option key={v} value={v}>{v}</option>)}</select>)}
      {campo("Cliente (facoltativo)", <select style={inputStyle} value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value,sede_id:""})}><option value="">Nessun cliente</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}</select>)}
      {campo("Sede / filiale", <select style={inputStyle} value={form.sede_id} disabled={!form.cliente_id} onChange={e=>setForm({...form,sede_id:e.target.value})}><option value="">Nessuna sede</option>{sedi.filter(s=>s.cliente_id===form.cliente_id).map(s=><option key={s.id} value={s.id}>{s.nome_sede || s.indirizzo}</option>)}</select>)}
      {campo("Azienda mandante", <select style={inputStyle} value={form.azienda_id} onChange={e=>setForm({...form,azienda_id:e.target.value})}><option value="">Nessuna azienda</option>{aziende.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select>)}
      {campo("Luogo", <input style={inputStyle} value={form.luogo} onChange={e=>setForm({...form,luogo:e.target.value})} placeholder="Indirizzo o videocall"/>)}
      {campo("Descrizione", <textarea style={inputStyle} rows={2} value={form.descrizione} onChange={e=>setForm({...form,descrizione:e.target.value})}/>)}
      {campo("Note", <textarea style={inputStyle} rows={2} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>)}
    </div><div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}><button disabled={saving} onClick={save} style={{ background: COLORS.primary, color: "white", border: 0, borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>{saving ? "Salvataggio..." : "Salva appuntamento"}</button><button onClick={()=>{setMostraForm(false);setError("");}} style={{ border: "1px solid "+COLORS.border, background: "white", borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}>Annulla</button>{editingId && <button onClick={()=>remove(editingId)} style={{ marginLeft: "auto", color: COLORS.danger, border: "1px solid "+COLORS.border, background: "white", borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}>Elimina</button>}</div></div>}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><button onClick={()=>cambiaPeriodo(-1)} style={{...inputStyle,width:36,cursor:"pointer"}}>‹</button><button onClick={()=>cambiaPeriodo(1)} style={{...inputStyle,width:36,cursor:"pointer"}}>›</button><button onClick={()=>setCurrentDate(new Date())} style={{...inputStyle,width:"auto",cursor:"pointer"}}>Oggi</button><strong style={{ marginLeft: 8, fontSize: 15, textTransform: "capitalize" }}>{titoloPeriodo}</strong></div><div style={{ display: "flex", gap: 5 }}>{["mese","settimana","giorno"].map(v=><button key={v} onClick={()=>setViewMode(v)} style={{ border:"1px solid "+COLORS.border, borderRadius:8, padding:"8px 12px", cursor:"pointer", background:viewMode===v?COLORS.primary:"white", color:viewMode===v?"white":COLORS.text, textTransform:"capitalize" }}>{v}</button>)}</div></div>
    {mobileAgenda && !loading ? <div className="agenda-hybrid">
      <div className="agenda-hybrid-week">
        {getWeekDays(currentDate).map(d=>{
          const iso=isoLocale(d), selected=iso===isoLocale(currentDate), events=eventiGiorno(d);
          return <button key={iso} type="button" className={"agenda-hybrid-date"+(selected?" selected":"")} onClick={()=>setCurrentDate(new Date(d))}>
            <span>{d.toLocaleDateString("it-IT",{weekday:"short"}).replace(".","")}</span><strong>{d.getDate()}</strong>
            <i className="agenda-hybrid-dots">{events.slice(0,3).map((e,j)=><b key={j} style={{background:selected?"#fff":coloreEvento(e)}}/>)}</i>
          </button>;
        })}
      </div>
      {mostraAttivitaAgenda && attivitaDelGiorno(currentDate).length>0 && <div style={{background:"#fff",border:"1px solid #e3ebf3",borderRadius:13,padding:12,marginBottom:13}}><strong style={{fontSize:12,color:"#7c5b1c"}}>Attività del giorno</strong><div style={{marginTop:8}}>{attivitaDelGiorno(currentDate).map(schedaAttivita)}</div></div>}
      {viewMode==="mese" ? <div className="agenda-hybrid-month">
        <div className="agenda-hybrid-month-title">{MESI[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
        <div className="agenda-hybrid-month-grid">
          {GIORNI_SETTIMANA.map(g=><span key={g} className="agenda-hybrid-month-label">{g}</span>)}
          {getMonthGrid(currentDate).map(d=><button key={isoLocale(d)} className={isoLocale(d)===isoLocale(currentDate)?"selected":""} style={{opacity:d.getMonth()===currentDate.getMonth()?1:.4}} onClick={()=>{setCurrentDate(new Date(d));setViewMode("giorno")}}>{d.getDate()}{(eventiGiorno(d).length>0 || (mostraAttivitaAgenda && attivitaDelGiorno(d).length>0))&&<i style={{background:eventiGiorno(d).length>0?"#3480f2":"#e5ab24"}}/>}</button>)}
        </div>
      </div> : null}
      {viewMode === "settimana" ? <div className="agenda-week-scroll" aria-label="Calendario settimanale scorrevole">
        <div className="agenda-week-grid">
          <div className="agenda-week-corner">Ora</div>
          {getWeekDays(currentDate).map(d=><button type="button" key={isoLocale(d)} className={"agenda-week-day"+(isoLocale(d)===isoLocale(currentDate)?" selected":"")} onClick={()=>{setCurrentDate(new Date(d));setViewMode("giorno");}}><span>{d.toLocaleDateString("it-IT",{weekday:"short"}).replace(".","")}</span><strong>{d.getDate()}</strong></button>)}
          <div className="agenda-week-task-label">Attività</div>
          {getWeekDays(currentDate).map(d => <div key={"att-"+isoLocale(d)} className="agenda-week-task-column">
            {mostraAttivitaAgenda && attivitaDelGiorno(d).map(a => <div key={a.id} className="agenda-week-task" title={a.note || a.titolo}><strong>{a.stato === "completata" ? "✓ " : ""}{a.titolo}</strong>{a.scadenza && (new Date(a.scadenza).getHours() + new Date(a.scadenza).getMinutes() > 0) && <small>{new Date(a.scadenza).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</small>}</div>)}
          </div>)}
          <div className="agenda-week-hour-column">{Array.from({length:13},(_,i)=>i+7).map(h=><div key={h} className="agenda-week-hour">{String(h).padStart(2,"0")}:00</div>)}</div>
          {getWeekDays(currentDate).map(d=>{
            const iso=isoLocale(d);
            return <div key={iso} className="agenda-week-day-column">
              {Array.from({length:13},(_,i)=>i+7).map(h=><button type="button" key={h} className="agenda-week-background-slot" onClick={()=>{apriNuovo(iso);setForm({...nuovo(iso),oraInizio:String(h).padStart(2,"0")+":00",oraFine:String(h+1).padStart(2,"0")+":00"});}} aria-label={`Nuovo appuntamento ${iso} ore ${h}`}/>)}
              {eventiGiorno(d).filter(e=>{
                const ini=new Date(e.inizio), fin=new Date(e.fine);
                return ini.getHours()*60+ini.getMinutes()<20*60 && fin.getHours()*60+fin.getMinutes()>7*60;
              }).map(e=>{
                const ini=new Date(e.inizio),fin=new Date(e.fine);
                const start=Math.max(0,(ini.getHours()*60+ini.getMinutes()-420)/60*74);
                const durata=Math.max(26,Math.min(962-start,(fin.getTime()-ini.getTime())/3600000*74));
                return <button key={e.id} type="button" className="agenda-week-event agenda-week-positioned" onClick={()=>apriModifica(e)} style={{top:start,height:durata,borderLeftColor:coloreEvento(e),background:coloreEvento(e)+"25"}}><small>{ora(e.inizio)}–{ora(e.fine)}</small><strong>{e.titolo}</strong></button>;
              })}
            </div>;
          })}
        </div>
        <div className="agenda-week-hint">Scorri lateralmente per vedere tutta la settimana · Tocca un giorno per aprirlo</div>
      </div> : <>
      <div className="agenda-hybrid-heading"><div><strong>{currentDate.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</strong><small>{eventiGiorno(currentDate).length} appuntamenti</small></div><button onClick={()=>apriNuovo(isoLocale(currentDate))}>+ Aggiungi</button></div>
      <div className="agenda-hybrid-timeline">
        {Array.from({length:13},(_,i)=>i+7).map(h=>{
          const items=eventiGiorno(currentDate).filter(e=>new Date(e.inizio).getHours()===h);
          return <div className="agenda-hybrid-hour" key={h}>
            <span className="agenda-hybrid-time">{String(h).padStart(2,"0")}:00</span>
            <div className="agenda-hybrid-slot" onClick={()=>{const iso=isoLocale(currentDate);apriNuovo(iso);setForm({...nuovo(iso),oraInizio:String(h).padStart(2,"0")+":00",oraFine:String(Math.min(h+1,23)).padStart(2,"0")+":00"});}}>
              {items.map(e=><button key={e.id} type="button" className="agenda-hybrid-event" onClick={ev=>{ev.stopPropagation();apriModifica(e);}} style={{borderLeftColor:coloreEvento(e),background:coloreEvento(e)+"15"}}>
                <small>{ora(e.inizio)} – {ora(e.fine)}</small><strong>{e.titolo}</strong>
                {e.cliente_id&&<span>{nomeCliente(e.cliente_id)}</span>}
              </button>)}
            </div>
          </div>;
        })}
        {eventiGiorno(currentDate).filter(e=>new Date(e.inizio).getHours()<7||new Date(e.inizio).getHours()>19).length>0&&
          <div className="agenda-hybrid-extra"><strong>Altri orari</strong>{eventiGiorno(currentDate).filter(e=>new Date(e.inizio).getHours()<7||new Date(e.inizio).getHours()>19).map(e=><button key={e.id} onClick={()=>apriModifica(e)}>{ora(e.inizio)} · {e.titolo}</button>)}</div>}
      </div>
      </>}
    </div> : loading ? <p>Caricamento appuntamenti...</p> : <div style={{ display: "grid", gridTemplateColumns: viewMode==="giorno"?"1fr":"repeat(7,minmax(0,1fr))", border:"1px solid "+COLORS.border, borderRadius:12, overflowX:"auto", background:"white" }}>
      {viewMode!=="giorno" && GIORNI_SETTIMANA.map(g=><div key={g} style={{ textAlign:"center", padding:10, fontSize:11, color:COLORS.muted, borderBottom:"1px solid "+COLORS.border }}>{g}</div>)}
      {giorni.map(d=>{ const eventi=eventiGiorno(d), iso=isoLocale(d), isToday=iso===oggi(); return <div key={iso} style={{ minWidth:viewMode==="giorno"?"auto":95, minHeight:viewMode==="mese"?110:260, borderRight:"1px solid "+COLORS.border, borderBottom:"1px solid "+COLORS.border, padding:7, background:isToday?"#f0f8ff":"white", opacity:viewMode==="mese"&&d.getMonth()!==currentDate.getMonth()?.6:1 }}><button onClick={()=>{setCurrentDate(new Date(d));setViewMode("giorno")}} style={{ background:"none",border:0,cursor:"pointer",fontSize:12,fontWeight:isToday?800:600,color:COLORS.text,marginBottom:8 }}>{viewMode==="giorno"?d.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"}):d.getDate()}</button>{mostraAttivitaAgenda && attivitaDelGiorno(d).map(schedaAttivita)}{eventi.map(eventCard)}<button onClick={()=>apriNuovo(iso)} style={{ display:"block",background:"transparent",border:"1px dashed "+COLORS.border,color:COLORS.muted,borderRadius:6,fontSize:11,padding:"5px",cursor:"pointer",width:"100%",marginTop:5 }}>+ Aggiungi</button></div>})}
    </div>}
    <style>{`@media(max-width:700px){
      .agenda-week-scroll{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;background:#fff;border:1px solid #dce5f1;border-radius:14px}
      .agenda-week-grid{display:grid;grid-template-columns:46px repeat(7,145px);grid-template-rows:54px minmax(56px,auto) 962px;min-width:max-content;align-items:stretch}
      .agenda-week-corner{position:sticky;left:0;z-index:3;background:#fff;color:#7b8ba3;font-size:10px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #dce5f1}
      .agenda-week-day{border:0;border-bottom:1px solid #dce5f1;border-left:1px solid #e9edf4;background:#fff;padding:10px 0;display:flex;align-items:center;justify-content:center;gap:6px;color:#53647e}
      .agenda-week-day strong{font-size:16px}.agenda-week-day span{font-size:11px;text-transform:capitalize}.agenda-week-day.selected{background:#eaf2ff;color:#174b94}
      .agenda-week-hour{background:#fff;height:74px;box-sizing:border-box;border-bottom:1px solid #edf0f5;color:#7b8ba3;font-size:10px;padding:8px 3px;text-align:center}
      .agenda-week-day{grid-row:1}
      .agenda-week-task-label{grid-column:1;grid-row:2;position:sticky;left:0;z-index:2;background:#fffaf0;border-bottom:1px solid #f2dfb4;color:#896722;font-size:9px;display:flex;align-items:center;justify-content:center}
      .agenda-week-task-column{grid-row:2;background:#fffdf7;border-left:1px solid #f1e7cf;border-bottom:1px solid #f1e7cf;padding:4px;min-height:56px;box-sizing:border-box}
      .agenda-week-task{background:#fff2bf;border-left:3px solid #e3a927;border-radius:5px;padding:5px 4px;margin-bottom:4px;color:#74541c;font-size:10px;overflow-wrap:anywhere}
      .agenda-week-task strong{display:block;font-size:10px}.agenda-week-task small{display:block;font-size:9px;margin-top:2px}
      .agenda-week-hour-column{grid-column:1;grid-row:3;position:sticky;left:0;z-index:2;background:white}
      .agenda-week-day-column{position:relative;grid-row:3;height:962px;border-left:1px solid #e9edf4}
      .agenda-week-background-slot{display:block;width:100%;height:74px;border:0;border-top:1px solid #edf0f5;background:transparent;cursor:pointer}
      .agenda-week-positioned{position:absolute;left:3px;width:calc(100% - 6px);z-index:1;box-sizing:border-box;overflow:hidden}
      .agenda-week-cell{min-height:74px;border-bottom:1px solid #edf0f5;border-left:1px solid #edf0f5;padding:4px;display:flex;flex-direction:column;gap:3px}
      .agenda-week-event{width:100%;min-width:0;text-align:left;border:0;border-left:4px solid #277bd6;border-radius:6px;padding:5px;display:grid;gap:3px;color:#172b49;overflow:hidden}
      .agenda-week-event small{font-size:10px}.agenda-week-event strong{font-size:11px;line-height:1.2;overflow-wrap:anywhere}
      .agenda-week-hint{position:sticky;left:0;width:calc(100vw - 70px);padding:10px 8px;color:#6e7d93;font-size:10px;background:#fff}
      .agenda-hybrid{width:100%;min-width:0}
      .agenda-hybrid-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;background:#fff;padding:8px 5px;border:1px solid #dce5f1;border-radius:14px;margin-bottom:16px}
      .agenda-hybrid-date{min-width:0;border:0;background:transparent;border-radius:11px;padding:9px 0;display:flex;flex-direction:column;align-items:center;gap:5px;color:#53647e;cursor:pointer}
      .agenda-hybrid-date span{font-size:11px;text-transform:capitalize}.agenda-hybrid-date strong{font-size:16px}
      .agenda-hybrid-date.selected{background:#173b72;color:#fff}
      .agenda-hybrid-dots{display:flex;gap:3px;height:5px}.agenda-hybrid-dots b{width:4px;height:4px;border-radius:50%;display:block}
      .agenda-hybrid-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 12px}
      .agenda-hybrid-heading>div{display:grid;gap:3px}.agenda-hybrid-heading strong{font-size:16px;text-transform:capitalize}.agenda-hybrid-heading small{font-size:11px;color:#7a8aa2}
      .agenda-hybrid-heading button{border:0;background:#e6efff;color:#1e63c9;border-radius:9px;padding:9px 12px;font-size:12px;font-weight:700}
      .agenda-hybrid-timeline{background:#fff;border:1px solid #dce5f1;border-radius:14px;padding:8px 10px 12px;overflow:hidden}
      .agenda-hybrid-hour{display:grid;grid-template-columns:49px minmax(0,1fr);min-height:62px}
      .agenda-hybrid-time{font-size:11px;color:#75859c;padding-top:0;text-align:right;padding-right:9px;transform:translateY(-5px)}
      .agenda-hybrid-slot{border-top:1px solid #e9edf4;border-left:1px solid #e9edf4;min-width:0;padding:5px;cursor:pointer;display:grid;gap:5px;align-content:start}
      .agenda-hybrid-event{border:0;border-left:4px solid #347be8;border-radius:8px;min-width:0;width:100%;display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:9px 10px;gap:3px;color:#172b49;overflow-wrap:anywhere}
      .agenda-hybrid-event small{font-size:11px;font-weight:700}.agenda-hybrid-event strong{font-size:13px}.agenda-hybrid-event span{font-size:11px;color:#52647d}
      .agenda-hybrid-extra{display:grid;gap:6px;padding:10px}.agenda-hybrid-extra button{border:0;background:#edf3ff;padding:10px;text-align:left;border-radius:8px}
      .agenda-hybrid-month{background:#fff;border:1px solid #dce5f1;border-radius:14px;padding:12px;margin-bottom:15px}
      .agenda-hybrid-month-title{font-weight:700;text-align:center;margin-bottom:10px}
      .agenda-hybrid-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center}
      .agenda-hybrid-month-label{font-size:11px;color:#7d8aa0;padding:8px 0}
      .agenda-hybrid-month-grid button{border:0;background:transparent;border-radius:9px;min-height:43px;font-size:13px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px}
      .agenda-hybrid-month-grid button.selected{background:#173b72;color:#fff}
      .agenda-hybrid-month-grid button i{width:4px;height:4px;background:#3480f2;border-radius:50%}
      .agenda-responsive input[type=date],.agenda-responsive input[type=time]{min-width:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}
    }`}</style>
    <style>{`@media(max-width:700px){.agenda-responsive{max-width:100%;overflow:hidden}.agenda-responsive input[type="date"],.agenda-responsive input[type="time"]{width:100%!important;min-width:0!important;max-width:100%!important;display:block!important;box-sizing:border-box!important;-webkit-appearance:none;appearance:none}.agenda-responsive label{min-width:0!important;max-width:100%!important}.agenda-mobile-list{display:grid;gap:10px}.agenda-mobile-day{background:white;border:1px solid #dce5f1;border-radius:13px;padding:12px;min-width:0}.agenda-mobile-day-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:9px}.agenda-mobile-day-head button{border:0;background:transparent;color:#182a47;font-size:13px;font-weight:700;text-align:left;text-transform:capitalize}.agenda-mobile-day-head button:last-child{color:#2e72dd;white-space:nowrap;font-size:12px}.agenda-mobile-event{display:flex;flex-direction:column;align-items:flex-start;text-align:left;width:100%;min-width:0;gap:5px;border:1px solid #dce5f1;border-left:4px solid #3b82f6;border-radius:9px;padding:11px 12px;margin:7px 0;overflow-wrap:anywhere;color:#17233b}.agenda-mobile-event strong{font-size:12px}.agenda-mobile-event span{font-size:14px;font-weight:650}.agenda-mobile-event small{font-size:12px;color:#687b95}.agenda-mobile-empty{font-size:12px;color:#8a98ad;margin:8px 0 3px}.agenda-responsive input,.agenda-responsive textarea{font-size:16px!important}.agenda-responsive select{font-size:16px!important}}`}</style>
    <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 12 }}>Gli appuntamenti sono salvati nella nuova tabella “appuntamenti”. Lo storico della tabella “visite” resta invariato. Le notifiche dipendono dalla configurazione push del progetto.</p>
  </div>;
}

function SelettoreVoce({ label, modalita, percentuale, valoreEuro, onChange, inputStyle, permettiTesto, isMobile }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <label style={{ fontSize: 12, minWidth: 80 }}>{label}</label>
      <select value={modalita} onChange={(e) => onChange({ modalita: e.target.value })} style={{ ...inputStyle, width: isMobile ? "100%" : 130 }}>
        <option value="escluso">Escluso</option><option value="percentuale">In %</option><option value="euro">In €</option><option value="nascosto">Non mostrare</option>
      </select>
      {modalita === "percentuale" && <input type="number" value={percentuale} onChange={(e) => onChange({ percentuale: e.target.value })} style={{ ...inputStyle, width: isMobile ? "100%" : 70 }} placeholder="%" />}
      {modalita === "euro" && (<input type={permettiTesto ? "text" : "number"} value={valoreEuro} onChange={(e) => onChange({ valoreEuro: e.target.value })} style={{ ...inputStyle, width: isMobile ? "100%" : (permettiTesto ? 160 : 80) }} placeholder={permettiTesto ? "es. 50€ o a carico cliente" : "€"} />)}
    </div>
  );
}

function PreventiviOfferte({ session, preventivoIniziale, onPreventivoAperto, vaiAllaPipeline, creaOpportunitaDaPreventivo }) {
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipoProposta,setFiltroTipoProposta]=useState("tutti");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [suggerimenti, setSuggerimenti] = useState({});
  const [caricandoImmagine, setCaricandoImmagine] = useState(null);
  const [anteprimaPdf, setAnteprimaPdf] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const emptyHeader = {
    cliente_id: "", cliente_manuale: "", azienda_id: "", rif: "", data: new Date().toISOString().slice(0, 10),
    imballo_modalita: "escluso", imballo_percentuale: 0, imballo_valore: 0,
    trasporto_modalita: "escluso", trasporto_percentuale: 0, trasporto_valore: 0,
    iva_modalita: "escluso", iva_percentuale: 22, iva_valore: 0,
    modalita_pagamento: "", modalita_prezzi_pdf: "dettagliato", stato: "bozza", note: "", tipo_proposta: "commerciale", approvazione_proposta: "in_attesa",
  };
  const [header, setHeader] = useState(emptyHeader);
  const [righe, setRighe] = useState([nuovaRiga()]);
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const results = await Promise.all([
        crmFetch(SUPABASE_URL + "/rest/v1/clienti?select=id,ragione_sociale&order=ragione_sociale.asc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/preventivi?select=*&order=created_at.desc", { headers: headers() }),
      ]);
      const dataClienti = await results[0].json();
      const dataAziende = await results[1].json();
      const dataPreventivi = await results[2].json();
      if (results[0].ok) setClienti(dataClienti);
      if (results[1].ok) setAziende(dataAziende);
      if (!results[2].ok) throw new Error(dataPreventivi.message || "Errore nel caricamento");
      setLista([...dataPreventivi].sort((a,b) => new Date(b.created_at || b.data || 0) - new Date(a.created_at || a.data || 0)));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setHeader(emptyHeader); setRighe([nuovaRiga()]); setEditingId(null); };
  const aggiungiRiga = () => setRighe((r) => [...r, nuovaRiga()]);
  const rimuoviRiga = (id) => setRighe((r) => r.filter((x) => x.id !== id));
  const aggiornaRiga = (id, campo, valore) => setRighe((r) => r.map((x) => (x.id === id ? { ...x, [campo]: valore } : x)));

  const cercaSuggerimenti = async (rigaId, testo) => {
    if (!header.azienda_id || !testo || testo.length < 2) { setSuggerimenti((s) => ({ ...s, [rigaId]: [] })); return; }
    try {
      const res = await crmFetch(SUPABASE_URL + "/rest/v1/listini?azienda_id=eq." + header.azienda_id + "&codice_articolo=ilike.*" + encodeURIComponent(testo) + "*&select=*&limit=6", { headers: headers() });
      const data = await res.json();
      if (res.ok) setSuggerimenti((s) => ({ ...s, [rigaId]: data }));
    } catch (e) {}
  };
  const selezionaSuggerimento = (rigaId, voce) => {
    setRighe((r) => r.map((x) => (x.id === rigaId ? { ...x, articolo: voce.codice_articolo, descrizione: voce.descrizione, prezzo_unitario: voce.prezzo_unitario } : x)));
    setSuggerimenti((s) => ({ ...s, [rigaId]: [] }));
  };
  const caricaImmagineRiga = async (rigaId, file) => {
    setCaricandoImmagine(rigaId);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Seleziona un file immagine.");
      if (file.size > 8 * 1024 * 1024) throw new Error("Immagine troppo grande: massimo 8 MB.");
      const estensione = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = "preventivi/" + Date.now() + "_" + Math.random().toString(36).slice(2, 10) + "." + estensione;
      await caricaFileStorage(session, "documenti-clienti", path, file);
      aggiornaRiga(rigaId, "immagine_url", "storage:" + path);
    } catch (err) { setError("Errore nel caricamento immagine: " + err.message); } finally { setCaricandoImmagine(null); }
  };

  const tot = calcolaTotaliPreventivo(header, righe);

  const salva = async () => {
    if (!header.azienda_id || (!header.cliente_id && !header.cliente_manuale.trim())) { setError("Seleziona un'azienda e un cliente (dall'elenco o scritto manualmente)."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        cliente_id: header.cliente_id || null, cliente_manuale: header.cliente_id ? null : (header.cliente_manuale || null),
        azienda_id: header.azienda_id, rif: header.rif || null, data: header.data, righe: righe,
        imballo_modalita: header.imballo_modalita, imballo_percentuale: Number(header.imballo_percentuale) || 0, imballo_valore: Number(header.imballo_valore) || 0,
        trasporto_modalita: header.trasporto_modalita, trasporto_percentuale: Number(header.trasporto_percentuale) || 0, trasporto_valore: Number(header.trasporto_valore) || 0,
        iva_modalita: header.iva_modalita, iva_percentuale: Number(header.iva_percentuale) || 0, iva_valore: Number(header.iva_valore) || 0,
        modalita_pagamento: header.modalita_pagamento || null, modalita_prezzi_pdf: header.modalita_prezzi_pdf || "dettagliato",
        stato: header.stato || "bozza", note: header.note || null, tipo_proposta: header.tipo_proposta === "esposizione" ? "campionatura" : (header.tipo_proposta || "commerciale"), approvazione_proposta: header.approvazione_proposta || "in_attesa",
      };
      // Non richiedere il record di ritorno: la tabella preventivi potrebbe non avere una policy SELECT.
      const res = editingId
        ? await crmFetch(SUPABASE_URL + "/rest/v1/preventivi?id=eq." + editingId, { method: "PATCH", headers: { ...headers(), Prefer: "return=minimal" }, body: JSON.stringify(body) })
        : await crmFetch(SUPABASE_URL + "/rest/v1/preventivi", { method: "POST", headers: { ...headers(), Prefer: "return=minimal" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const errore = await res.json().catch(() => null);
        throw new Error(errore?.message || "Errore nel salvataggio (HTTP " + res.status + ")");
      }
      resetForm(); load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const modifica = (p) => {
    setEditingId(p.id);
    setHeader({
      cliente_id: p.cliente_id || "", cliente_manuale: p.cliente_manuale || "", azienda_id: p.azienda_id || "", rif: p.rif || "", data: p.data || new Date().toISOString().slice(0, 10),
      imballo_modalita: p.imballo_modalita || "escluso", imballo_percentuale: p.imballo_percentuale || 0, imballo_valore: p.imballo_valore || 0,
      trasporto_modalita: p.trasporto_modalita || "escluso", trasporto_percentuale: p.trasporto_percentuale || 0, trasporto_valore: p.trasporto_valore || 0,
      iva_modalita: p.iva_modalita || "escluso", iva_percentuale: p.iva_percentuale ?? 22, iva_valore: p.iva_valore || 0,
      modalita_pagamento: p.modalita_pagamento || "", modalita_prezzi_pdf: p.modalita_prezzi_pdf || "dettagliato",
      stato: p.stato || "bozza", note: p.note || "", tipo_proposta: p.tipo_proposta === "esposizione" ? "campionatura" : (p.tipo_proposta || "commerciale"), approvazione_proposta: p.approvazione_proposta || "in_attesa",
    });
    setRighe(p.righe && p.righe.length ? p.righe : [nuovaRiga()]);
  };

  useEffect(() => {
    if (!preventivoIniziale) return;
    (async () => {
      try {
        const res = await crmFetch(SUPABASE_URL + "/rest/v1/preventivi?id=eq." + preventivoIniziale + "&select=*", { headers: headers() });
        const data = await res.json();
        if (res.ok && data && data[0]) modifica(data[0]);
      } catch (e) {}
      if (onPreventivoAperto) onPreventivoAperto();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preventivoIniziale]);

  const elimina = async (id) => {
    if (!window.confirm("Eliminare questo preventivo?")) return;
    try { const res = await crmFetch(SUPABASE_URL + "/rest/v1/preventivi?id=eq." + id, { method: "DELETE", headers: headers() }); if (!res.ok) throw new Error("Errore nell'eliminazione"); load(); } catch (err) { setError(err.message); }
  };

  const segnaComeFatturato = async (p) => {
    if (!window.confirm("Creare un ordine confermato da questo preventivo?")) return;
    try {
      const totCalc = calcolaTotaliPreventivo(p, p.righe || []);
      await crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ cliente_id: p.cliente_id, azienda_id: p.azienda_id, importo: totCalc.totaleFinale, data_ordine: new Date().toISOString().slice(0, 10), note: p.rif ? "Da preventivo " + p.rif : "Da preventivo" }) });
      await crmFetch(SUPABASE_URL + "/rest/v1/preventivi?id=eq." + p.id, { method: "PATCH", headers: headers(), body: JSON.stringify({ fatturato: true }) });
      load();
    } catch (err) { setError(err.message); }
  };

  const nomeCliente = (id) => { const c = clienti.find((x) => x.id === id); return c ? c.ragione_sociale : "—"; };
  const nomeClientePreventivo = (p) => (p.cliente_id ? nomeCliente(p.cliente_id) : (p.cliente_manuale || "—"));
  const nomeAzienda = (id) => { const a = aziende.find((x) => x.id === id); return a ? a.nome : "—"; };
  const inputStyle = { padding: "6px 8px", border: "1px solid " + COLORS.border, borderRadius: 6, fontSize: 12, boxSizing: "border-box" };
  const fieldStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
  const rigaTotali = (label, modalita, valore, valoreGrezzo) => {
    if (modalita === "nascosto") return null;
    if (modalita === "euro" && valoreGrezzo !== undefined && valoreGrezzo !== "" && isNaN(parseFloat(String(valoreGrezzo).replace(",", ".")))) {
      return <div style={{ color: COLORS.muted }}>{label}: {valoreGrezzo}</div>;
    }
    return <div style={{ color: COLORS.muted }}>{label}: {modalita === "escluso" ? "escluso" : formattaEuro(valore)}</div>;
  };

  const campoMobile = { width: "100%", padding: "10px", marginBottom: 8, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
  const rigaLabel = { fontSize: 11, color: COLORS.muted, marginBottom: 3, display: "block" };

  return (
    <div className="crm-preventivi-premium" style={{ fontFamily: "inherit", overflowX: "hidden", width: "100%" }}> 
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><FileText size={20} color={COLORS.primary} /> Preventivi / Offerte</h2>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",background:"#f4f8ff",border:"1px solid #dce9f8",borderRadius:12,padding:"10px 13px",marginBottom:16}}><span style={{fontSize:12,color:"#526c84"}}>Le trattative commerciali sono gestite nella Pipeline. Il collegamento permanente al preventivo richiederà una verifica del database.</span><button type="button" onClick={vaiAllaPipeline} style={{background:"#fff",border:"1px solid #bdd5f0",borderRadius:9,padding:"8px 12px",color:"#1a66b1",fontSize:12,fontWeight:700,cursor:"pointer"}}>Apri Pipeline →</button></div>
      <div style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, boxShadow: "0 4px 14px rgba(20,40,60,0.05)", padding: 20, marginBottom: 24, overflowX: "hidden" }}>
        <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>{editingId ? "Modifica preventivo" : "Nuovo preventivo"}</h3>

        <div className="form-header-preventivo" style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <select value={header.azienda_id} onChange={(e) => setHeader({ ...header, azienda_id: e.target.value })} style={{ ...fieldStyle, maxWidth: isMobile ? "100%" : 220 }}>
            <option value="">-- Azienda --</option>
            {aziende.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <select value={header.cliente_id} onChange={(e) => setHeader({ ...header, cliente_id: e.target.value })} style={{ ...fieldStyle, maxWidth: isMobile ? "100%" : 220 }}>
            <option value="">-- Cliente (Spettabile) --</option>
            {clienti.map((c) => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
          </select>
          {!header.cliente_id && (
            <input placeholder="...oppure scrivi il nome cliente manualmente" value={header.cliente_manuale} onChange={(e) => setHeader({ ...header, cliente_manuale: e.target.value })} style={{ ...fieldStyle, maxWidth: isMobile ? "100%" : 260 }} />
          )}
          <input type="date" value={header.data} onChange={(e) => setHeader({ ...header, data: e.target.value })} style={{ ...fieldStyle, width: isMobile ? "auto" : "100%", maxWidth: isMobile ? 115 : 160, fontSize: isMobile ? 12 : 13, padding: isMobile ? "8px 4px" : "8px 10px" }} />
          <input placeholder="RIF" value={header.rif} onChange={(e) => setHeader({ ...header, rif: e.target.value })} style={{ ...fieldStyle, maxWidth: isMobile ? "100%" : 160 }} />
        </div>

        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",background:"#f5f8fc",padding:12,borderRadius:10,marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:650}}>Tipologia proposta <select style={fieldStyle} value={header.tipo_proposta} onChange={e=>setHeader({...header,tipo_proposta:e.target.value})}><option value="commerciale">Preventivo commerciale</option><option value="campionatura">Campionatura</option></select></label>
          {header.tipo_proposta!=="commerciale"&&<label style={{fontSize:12,fontWeight:650}}>Approvazione <select style={fieldStyle} value={header.approvazione_proposta} onChange={e=>setHeader({...header,approvazione_proposta:e.target.value})}><option value="in_attesa">In attesa di approvazione</option><option value="approvata">Approvata</option><option value="non_approvata">Non approvata</option></select></label>}
          {header.tipo_proposta!=="commerciale"&&<span style={{fontSize:11,color:"#64748b"}}>Articoli, sconti e omaggi si compilano normalmente nelle righe del preventivo.</span>}
        </div>
        {isMobile ? (
          <div style={{ marginBottom: 12 }}>
            {righe.map((riga, idx) => {
              const { netto } = calcolaRigaNetto(riga);
              return (
                <div key={riga.id} style={{ border: "1px solid " + COLORS.border, borderRadius: 12, padding: 12, marginBottom: 10, background: COLORS.bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary }}>Articolo {idx + 1}</span>
                    <button onClick={() => rimuoviRiga(riga.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>✕ Rimuovi</button>
                  </div>
                  <label style={rigaLabel}>Articolo</label>
                  <div style={{ position: "relative" }}>
                    <input value={riga.articolo} onChange={(e) => { aggiornaRiga(riga.id, "articolo", e.target.value); cercaSuggerimenti(riga.id, e.target.value); }} onBlur={() => setTimeout(() => setSuggerimenti((s) => ({ ...s, [riga.id]: [] })), 150)} style={campoMobile} autoComplete="off" />
                    {suggerimenti[riga.id] && suggerimenti[riga.id].length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#fff", border: "1px solid " + COLORS.border, borderRadius: 8, boxShadow: "0 4px 14px rgba(20,40,60,0.12)", maxHeight: 160, overflowY: "auto" }}>
                        {suggerimenti[riga.id].map((voce) => (<div key={voce.id} onMouseDown={() => selezionaSuggerimento(riga.id, voce)} style={{ padding: "8px 10px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid " + COLORS.border }}><strong>{voce.codice_articolo}</strong> — {voce.descrizione} ({formattaEuro(voce.prezzo_unitario)})</div>))}
                      </div>
                    )}
                  </div>
                  <label style={rigaLabel}>Descrizione</label>
                  <input value={riga.descrizione} onChange={(e) => aggiornaRiga(riga.id, "descrizione", e.target.value)} style={campoMobile} />
                  <label style={rigaLabel}>Finitura</label>
                  <input value={riga.finitura} onChange={(e) => aggiornaRiga(riga.id, "finitura", e.target.value)} style={campoMobile} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}><label style={rigaLabel}>Qtà</label><input type="number" value={riga.quantita} onChange={(e) => aggiornaRiga(riga.id, "quantita", e.target.value)} style={campoMobile} /></div>
                    <div style={{ flex: 1 }}><label style={rigaLabel}>U.M. (MQ/ML)</label><SelettoreUnitaPreventivo value={riga.unita_misura} onChange={v => aggiornaRiga(riga.id, "unita_misura", v)} style={campoMobile} /></div>
                    <div style={{ flex: 1 }}><label style={rigaLabel}>Prezzo un.</label><input type="number" value={riga.prezzo_unitario} onChange={(e) => aggiornaRiga(riga.id, "prezzo_unitario", e.target.value)} style={campoMobile} /></div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}><label style={rigaLabel}>Sc.1 %</label><input type="number" value={riga.sconto1 === 0 || riga.sconto1 == null ? "" : riga.sconto1} onChange={(e) => aggiornaRiga(riga.id, "sconto1", e.target.value)} style={campoMobile} /></div>
                    <div style={{ flex: 1 }}><label style={rigaLabel}>Sc.2 %</label><input type="number" value={riga.sconto2 === 0 || riga.sconto2 == null ? "" : riga.sconto2} onChange={(e) => aggiornaRiga(riga.id, "sconto2", e.target.value)} style={campoMobile} /></div>
                    <div style={{ flex: 1 }}><label style={rigaLabel}>Sc.3 %</label><input type="number" value={riga.sconto3 === 0 || riga.sconto3 == null ? "" : riga.sconto3} onChange={(e) => aggiornaRiga(riga.id, "sconto3", e.target.value)} style={campoMobile} /></div>
                  </div>
                  <label style={rigaLabel}>Netto unitario manuale (opzionale)</label>
                  <input type="number" placeholder="prezzo netto per singolo pezzo" value={riga.prezzo_netto_manuale} onChange={(e) => aggiornaRiga(riga.id, "prezzo_netto_manuale", e.target.value)} style={campoMobile} />
                  <label style={rigaLabel}>Immagine articolo (opzionale)</label>
                  {riga.immagine_url ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <ImmaginePreventivo session={session} value={riga.immagine_url} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid " + COLORS.border }} />
                      <button onClick={() => aggiornaRiga(riga.id, "immagine_url", "")} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>Rimuovi</button>
                    </div>
                  ) : (
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.primary, cursor: "pointer", marginBottom: 8 }}>
                      <Upload size={13} /> {caricandoImmagine === riga.id ? "Caricamento..." : "Carica immagine"}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const file = e.target.files && e.target.files[0]; if (file) caricaImmagineRiga(riga.id, file); e.target.value = ""; }} />
                    </label>
                  )}
                  <div style={{ textAlign: "right", fontWeight: 700, color: COLORS.text, fontSize: 15, marginTop: 4 }}>Netto: {formattaEuro(netto)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 12 }} className="tabella-righe-preventivo">
            <thead><tr style={{ textAlign: "left", borderBottom: "2px solid " + COLORS.border }}>
              <th style={{ padding: 6 }}>Art.</th><th style={{ padding: 6 }}>Descrizione</th><th style={{ padding: 6 }}>Finitura</th><th style={{ padding: 6 }}>Qtà</th><th style={{ padding: 6 }}>U.M.</th>
              <th style={{ padding: 6 }}>Prezzo un.</th><th style={{ padding: 6 }}>Sc.1 %</th><th style={{ padding: 6 }}>Sc.2 %</th><th style={{ padding: 6 }}>Sc.3 %</th><th style={{ padding: 6 }}>Netto un. manuale</th><th style={{ padding: 6 }}>Immagine</th>
              <th style={{ padding: 6 }}>Netto</th><th style={{ padding: 6 }}></th>
            </tr></thead>
            <tbody>
              {righe.map((riga) => {
                const { netto } = calcolaRigaNetto(riga);
                return (
                  <tr key={riga.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                    <td style={{ padding: 4, position: "relative" }} data-label="Articolo">
                      <input value={riga.articolo} onChange={(e) => { aggiornaRiga(riga.id, "articolo", e.target.value); cercaSuggerimenti(riga.id, e.target.value); }} onBlur={() => setTimeout(() => setSuggerimenti((s) => ({ ...s, [riga.id]: [] })), 150)} style={{ ...inputStyle, width: 70 }} autoComplete="off" />
                      {suggerimenti[riga.id] && suggerimenti[riga.id].length > 0 && (
                        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 10, background: "#fff", border: "1px solid " + COLORS.border, borderRadius: 8, boxShadow: "0 4px 14px rgba(20,40,60,0.12)", minWidth: 220, maxHeight: 160, overflowY: "auto" }}>
                          {suggerimenti[riga.id].map((voce) => (<div key={voce.id} onMouseDown={() => selezionaSuggerimento(riga.id, voce)} style={{ padding: "6px 10px", fontSize: 11, cursor: "pointer", borderBottom: "1px solid " + COLORS.border }}><strong>{voce.codice_articolo}</strong> — {voce.descrizione} ({formattaEuro(voce.prezzo_unitario)})</div>))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 4 }} data-label="Descrizione"><input value={riga.descrizione} onChange={(e) => aggiornaRiga(riga.id, "descrizione", e.target.value)} style={{ ...inputStyle, width: 150 }} /></td>
                    <td style={{ padding: 4 }} data-label="Finitura"><input value={riga.finitura} onChange={(e) => aggiornaRiga(riga.id, "finitura", e.target.value)} style={{ ...inputStyle, width: 70 }} /></td>
                    <td style={{ padding: 4 }} data-label="Qtà"><input type="number" value={riga.quantita} onChange={(e) => aggiornaRiga(riga.id, "quantita", e.target.value)} style={{ ...inputStyle, width: 45 }} /></td>
                    <td style={{ padding: 4 }} data-label="U.M."><SelettoreUnitaPreventivo value={riga.unita_misura} onChange={v => aggiornaRiga(riga.id, "unita_misura", v)} style={{ ...inputStyle, width: 65 }} /></td>
                    <td style={{ padding: 4 }} data-label="Prezzo un."><input type="number" value={riga.prezzo_unitario} onChange={(e) => aggiornaRiga(riga.id, "prezzo_unitario", e.target.value)} style={{ ...inputStyle, width: 65 }} /></td>
                    <td style={{ padding: 4 }} data-label="Sc.1 %"><input type="number" value={riga.sconto1 === 0 || riga.sconto1 == null ? "" : riga.sconto1} onChange={(e) => aggiornaRiga(riga.id, "sconto1", e.target.value)} style={{ ...inputStyle, width: 50 }} /></td>
                    <td style={{ padding: 4 }} data-label="Sc.2 %"><input type="number" value={riga.sconto2 === 0 || riga.sconto2 == null ? "" : riga.sconto2} onChange={(e) => aggiornaRiga(riga.id, "sconto2", e.target.value)} style={{ ...inputStyle, width: 50 }} /></td>
                    <td style={{ padding: 4 }} data-label="Sc.3 %"><input type="number" value={riga.sconto3 === 0 || riga.sconto3 == null ? "" : riga.sconto3} onChange={(e) => aggiornaRiga(riga.id, "sconto3", e.target.value)} style={{ ...inputStyle, width: 50 }} /></td>
                    <td style={{ padding: 4 }} data-label="Netto un. manuale"><input type="number" placeholder="opz." value={riga.prezzo_netto_manuale} onChange={(e) => aggiornaRiga(riga.id, "prezzo_netto_manuale", e.target.value)} style={{ ...inputStyle, width: 65 }} /></td>
                    <td style={{ padding: 4 }} data-label="Immagine">
                      {riga.immagine_url ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <ImmaginePreventivo session={session} value={riga.immagine_url} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
                          <button onClick={() => aggiornaRiga(riga.id, "immagine_url", "")} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 10 }}>✕</button>
                        </div>
                      ) : (
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: COLORS.primary, cursor: "pointer" }}>
                          <Upload size={11} /> {caricandoImmagine === riga.id ? "..." : "Carica"}
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const file = e.target.files && e.target.files[0]; if (file) caricaImmagineRiga(riga.id, file); e.target.value = ""; }} />
                        </label>
                      )}
                    </td>
                    <td style={{ padding: 4, fontWeight: 600 }} data-label="Netto">{formattaEuro(netto)}</td>
                    <td style={{ padding: 4 }} data-label=""><button onClick={() => rimuoviRiga(riga.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 14 }}>✕ Rimuovi riga</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p style={{ fontSize: 11, color: COLORS.muted, marginTop: -6, marginBottom: 16 }}>Compila "Netto manuale" per fissare direttamente il prezzo netto di una riga.</p>
        <button onClick={aggiungiRiga} style={{ padding: "6px 12px", background: "#fff", color: COLORS.primary, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 12, cursor: "pointer", marginBottom: 20 }}>+ Aggiungi riga</button>

        <div style={{ background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <SelettoreVoce label="Imballo" modalita={header.imballo_modalita} percentuale={header.imballo_percentuale} valoreEuro={header.imballo_valore} inputStyle={inputStyle} isMobile={isMobile}
            onChange={(patch) => setHeader({ ...header, imballo_modalita: patch.modalita ?? header.imballo_modalita, imballo_percentuale: patch.percentuale ?? header.imballo_percentuale, imballo_valore: patch.valoreEuro ?? header.imballo_valore })} />
          <SelettoreVoce label="Trasporto" modalita={header.trasporto_modalita} percentuale={header.trasporto_percentuale} valoreEuro={header.trasporto_valore} inputStyle={inputStyle} permettiTesto isMobile={isMobile}
            onChange={(patch) => setHeader({ ...header, trasporto_modalita: patch.modalita ?? header.trasporto_modalita, trasporto_percentuale: patch.percentuale ?? header.trasporto_percentuale, trasporto_valore: patch.valoreEuro ?? header.trasporto_valore })} />
          <SelettoreVoce label="IVA" modalita={header.iva_modalita} percentuale={header.iva_percentuale} valoreEuro={header.iva_valore} inputStyle={inputStyle} isMobile={isMobile}
            onChange={(patch) => setHeader({ ...header, iva_modalita: patch.modalita ?? header.iva_modalita, iva_percentuale: patch.percentuale ?? header.iva_percentuale, iva_valore: patch.valoreEuro ?? header.iva_valore })} />
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>Modalità di pagamento</label>
            <input placeholder="Es. 30% all'ordine, saldo alla consegna" value={header.modalita_pagamento} onChange={(e) => setHeader({ ...header, modalita_pagamento: e.target.value })} style={{ ...fieldStyle, marginBottom: 0, maxWidth: isMobile ? "100%" : 400 }} />
          </div>
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>Prezzi mostrati nel PDF</label>
            <select value={header.modalita_prezzi_pdf} onChange={(e) => setHeader({ ...header, modalita_prezzi_pdf: e.target.value })} style={{ ...inputStyle, maxWidth: isMobile ? "100%" : 300, width: isMobile ? "100%" : "auto" }}>
              <option value="dettagliato">Completo (listino + sconti + netto)</option>
              <option value="solo_netto">Solo prezzi netti (unitario e totale)</option>
            </select>
          </div>
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>Stato preventivo</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATI_PREVENTIVO.map((s) => (<button key={s.valore} onClick={() => setHeader({ ...header, stato: s.valore })} style={{ padding: "6px 12px", borderRadius: 20, border: header.stato === s.valore ? "2px solid " + s.colore : "1px solid #e2edf5", background: header.stato === s.valore ? s.colore + "18" : "#fff", color: s.colore, fontSize: 12, fontWeight: header.stato === s.valore ? 700 : 500, cursor: "pointer" }}>● {s.label}</button>))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>Note</label>
            <textarea placeholder="Annotazioni aggiuntive sul preventivo" value={header.note} onChange={(e) => setHeader({ ...header, note: e.target.value })} style={{ ...fieldStyle, marginBottom: 0, maxWidth: isMobile ? "100%" : 500, minHeight: 60 }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-end", fontSize: 13, marginBottom: 16 }}>
          <div style={{ textAlign: isMobile ? "left" : "right", minWidth: isMobile ? "auto" : 220, width: isMobile ? "100%" : "auto" }}>
            <div style={{ color: COLORS.muted }}>Totale netto: {formattaEuro(tot.totaleNetto)}</div>
            {rigaTotali("Imballo", header.imballo_modalita, tot.valoreImballo, header.imballo_valore)}
            {rigaTotali("Trasporto", header.trasporto_modalita, tot.valoreTrasporto, header.trasporto_valore)}
            {rigaTotali("IVA", header.iva_modalita, tot.valoreIva, header.iva_valore)}
            <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 16, marginTop: 4 }}>Totale: {formattaEuro(tot.totaleFinale)}</div>
          </div>
        </div>

        {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={salva} disabled={saving} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Salva preventivo"}</button>
          {editingId && <button onClick={resetForm} style={{ padding: "9px 16px", background: "#fff", color: COLORS.primary, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annulla</button>}
        </div>
      </div>

      {anteprimaPdf && <div role="dialog" aria-label="Anteprima preventivo PDF" style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(14,27,45,.76)", display: "flex", flexDirection: "column", padding: 12 }}>
        <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", background: "white", borderRadius: "10px 10px 0 0", padding: 12 }}>
          <strong>Anteprima PDF</strong>
          <div style={{ display: "flex", gap: 10 }}>
            <a href={anteprimaPdf.url} download={anteprimaPdf.nomeFile} style={{ color: COLORS.primary }}>Scarica</a>
            <button onClick={() => { URL.revokeObjectURL(anteprimaPdf.url); setAnteprimaPdf(null); }} style={{ padding: "6px 10px" }}>Chiudi ✕</button>
          </div>
        </div>
        <iframe title="Anteprima PDF preventivo" src={anteprimaPdf.url} style={{ flex: 1, width: "100%", border: 0, background: "white" }} />
        <div style={{ color: "white", fontSize: 11, padding: 6 }}>Se iOS non mostra il PDF nell'anteprima, premi Scarica.</div>
      </div>}
      <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>Preventivi salvati e registro campionature / esposizioni</h3>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{[{id:"tutti",label:"Tutti"},{id:"commerciale",label:"Commerciali"},{id:"campionatura",label:"Campionature"}].map(x=><button key={x.id} type="button" onClick={()=>setFiltroTipoProposta(x.id)} style={{border:"1px solid #c8d9ef",background:filtroTipoProposta===x.id?"#344a43":"white",color:filtroTipoProposta===x.id?"white":"#344a43",padding:"7px 11px",borderRadius:9,cursor:"pointer"}}>{x.label}</button>)}</div>
      {loading ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p> : lista.length === 0 ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun preventivo salvato.</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} className="tabella-responsive">
          <thead><tr style={{ textAlign: "left", borderBottom: "2px solid " + COLORS.border }}>
            <th style={{ padding: "8px 6px" }}>Stato</th><th style={{ padding: "8px 6px" }}>Tipo / approvazione</th><th style={{ padding: "8px 6px" }}>RIF</th><th style={{ padding: "8px 6px" }}>Data</th><th style={{ padding: "8px 6px" }}>Cliente</th><th style={{ padding: "8px 6px" }}>Azienda</th><th style={{ padding: "8px 6px" }}></th>
          </tr></thead>
          <tbody>
            {lista.filter(p=>filtroTipoProposta==="tutti"||(filtroTipoProposta==="campionatura"?["campionatura","esposizione"].includes(p.tipo_proposta):(p.tipo_proposta||"commerciale")===filtroTipoProposta)).map((preventivoSalvato) => {
              const infoStato = STATI_PREVENTIVO.find((s) => s.valore === preventivoSalvato.stato) || STATI_PREVENTIVO[0];
              return (
                <tr key={preventivoSalvato.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                  <td style={{ padding: "8px 6px" }} data-label="Stato"><span style={{ color: infoStato.colore, fontSize: 12, fontWeight: 700 }}>● {infoStato.label}</span></td>
                  <td style={{ padding: "8px 6px" }} data-label="Tipo">{["campionatura","esposizione"].includes(preventivoSalvato.tipo_proposta)?"Campionatura":"Commerciale"}{preventivoSalvato.tipo_proposta&&preventivoSalvato.tipo_proposta!=="commerciale"?" · "+(preventivoSalvato.approvazione_proposta==="approvata"?"Approvata":preventivoSalvato.approvazione_proposta==="non_approvata"?"Non approvata":"In attesa"):""}</td><td style={{ padding: "8px 6px" }} data-label="RIF">{preventivoSalvato.rif || "-"}</td>
                  <td style={{ padding: "8px 6px" }} data-label="Data">{preventivoSalvato.data ? new Date(preventivoSalvato.data).toLocaleDateString("it-IT") : "-"}</td>
                  <td style={{ padding: "8px 6px" }} data-label="Cliente">{nomeClientePreventivo(preventivoSalvato)}</td>
                  <td style={{ padding: "8px 6px" }} data-label="Azienda">{nomeAzienda(preventivoSalvato.azienda_id)}</td>
                  <td style={{ padding: "8px 6px" }} data-label="">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {preventivoSalvato.stato === "accettato" && (
                        preventivoSalvato.fatturato ? <span style={{ color: COLORS.success, fontSize: 12 }}>✓ Fatturato</span> : <button onClick={() => segnaComeFatturato(preventivoSalvato)} style={{ background: "none", border: "none", color: COLORS.success, cursor: "pointer", fontSize: 12 }}>Segna come fatturato</button>
                      )}
                      <button onClick={() => stampaPreventivo(preventivoSalvato, clienti, aziende, session)} style={{ background: "none", border: "none", color: COLORS.success, cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><Printer size={13} /> PDF</button>
                      <button onClick={() => stampaPreventivo(preventivoSalvato, clienti, aziende, session, setAnteprimaPdf)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 12 }}>Anteprima PDF</button>
                      {preventivoSalvato.cliente_id && <button type="button" onClick={() => creaOpportunitaDaPreventivo(preventivoSalvato)} title="Prepara una trattativa con i dati del preventivo, senza modificare il preventivo" style={{ background: "#eaf3ff", border: "1px solid #c8def7", borderRadius: 8, padding: "5px 8px", color: "#175fa6", cursor: "pointer", fontSize: 12, fontWeight: 650 }}>+ Opportunità</button>}
                      <button onClick={() => modifica(preventivoSalvato)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 12 }}>Modifica</button>
                      <button onClick={() => elimina(preventivoSalvato.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>Elimina</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MappaClienti({ session }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [clienti, setClienti] = useState([]);
  const [sedi, setSedi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        const results = await Promise.all([
          crmFetch(SUPABASE_URL + "/rest/v1/clienti?select=id,ragione_sociale,indirizzo,classificazione,latitudine,longitudine", { headers: headers() }),
          crmFetch(SUPABASE_URL + "/rest/v1/sedi_cliente?select=*", { headers: headers() }),
        ]);
        const data = await results[0].json();
        const dataSedi = await results[1].json();
        if (!results[0].ok) throw new Error(data.message || "Errore nel caricamento");
        setClienti(data); setSedi(Array.isArray(dataSedi) ? dataSedi : []);
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    })();
  }, [session]);

  useEffect(() => {
    (async () => {
      const L = await caricaLeaflet();
      if (!mapRef.current || mapInstance.current) return;
      const map = L.map(mapRef.current).setView([42.5, 12.5], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      mapInstance.current = map;
    })();
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L;
    const conCoordinate = clienti.filter((c) => c.latitudine && c.longitudine);
    const sediConCoordinate = sedi.filter((s) => s.latitudine && s.longitudine);
    const markers = [];
    conCoordinate.forEach((c) => { markers.push(L.marker([c.latitudine, c.longitudine]).addTo(mapInstance.current).bindPopup("<strong>" + c.ragione_sociale + "</strong><br/>" + (c.classificazione || "") + "<br/>" + (c.indirizzo || ""))); });
    sediConCoordinate.forEach((s) => {
      const clienteDellaSede = clienti.find((c) => c.id === s.cliente_id);
      markers.push(L.marker([s.latitudine, s.longitudine], { opacity: 0.85 }).addTo(mapInstance.current).bindPopup("<strong>" + (clienteDellaSede ? clienteDellaSede.ragione_sociale : "") + "</strong><br/>" + (s.nome_sede || "Sede") + "<br/>" + s.indirizzo));
    });
    if (conCoordinate.length > 0 || sediConCoordinate.length > 0) {
      mapInstance.current.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
    }
    return () => { markers.forEach((m) => mapInstance.current && mapInstance.current.removeLayer(m)); };
  }, [clienti, sedi]);

  const senzaCoordinate = clienti.filter((c) => c.indirizzo && (!c.latitudine || !c.longitudine));

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Mappa clienti</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Le coordinate si calcolano automaticamente quando salvi l'indirizzo in anagrafica.</p>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
      {loading && <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>}
      <div ref={mapRef} style={{ width: "100%", height: 480, borderRadius: 14, border: "1px solid " + COLORS.border, overflow: "hidden", position: "relative", zIndex: 0 }} />
      {senzaCoordinate.length > 0 && <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 10 }}>{senzaCoordinate.length} cliente/i senza coordinate ancora calcolate.</p>}
    </div>
  );
}

function Statistiche({ session }) {
  const [ordini, setOrdini] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aziendaSelezionata, setAziendaSelezionata] = useState("");
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        const results = await Promise.all([
          crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati?select=*", { headers: headers() }),
          crmFetch(SUPABASE_URL + "/rest/v1/preventivi?select=id,cliente_id,azienda_id,data,stato,righe,imballo_modalita,imballo_percentuale,imballo_valore,trasporto_modalita,trasporto_percentuale,trasporto_valore,iva_modalita,iva_percentuale,iva_valore", { headers: headers() }),
          crmFetch(SUPABASE_URL + "/rest/v1/clienti?select=id,ragione_sociale", { headers: headers() }),
          crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?select=id,nome", { headers: headers() }),
        ]);
        const [dOrdini, dPreventivi, dClienti, dAziende] = await Promise.all(results.map((r) => r.json()));
        setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
        setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
        setClienti(Array.isArray(dClienti) ? dClienti : []);
        const listaAziende = Array.isArray(dAziende) ? dAziende : [];
        setAziende(listaAziende);
        setAziendaSelezionata((prev) => prev || (listaAziende[0] ? listaAziende[0].id : ""));
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    })();
  }, [session]);

  const nomeCliente = (id) => { const c = clienti.find((x) => x.id === id); return c ? c.ragione_sociale : "Sconosciuto"; };
  const ricavi = aziendaSelezionata ? combinaRicaviPerAzienda(ordini, preventivi, aziendaSelezionata) : [];
  const fatturatoPerCliente = {};
  ricavi.forEach((r) => { const key = nomeCliente(r.cliente_id); fatturatoPerCliente[key] = (fatturatoPerCliente[key] || 0) + r.importo; });
  const classificaClienti = Object.entries(fatturatoPerCliente).map(([nome, totale]) => ({ nome, totale })).sort((a, b) => b.totale - a.totale);
  const conteggioStati = { bozza: 0, inviato: 0, accettato: 0, rifiutato: 0 };
  preventivi.filter((pv) => pv.azienda_id === aziendaSelezionata).forEach((pv) => { if (conteggioStati[pv.stato] !== undefined) conteggioStati[pv.stato]++; });
  const datiStati = STATI_PREVENTIVO.map((s) => ({ name: s.label, value: conteggioStati[s.valore], color: s.colore }));
  const fatturatoTotale = ricavi.reduce((s, r) => s + r.importo, 0);
  const inputStyle = { padding: "8px 12px", border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13 };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Statistiche</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Basate sugli ordini confermati e sui preventivi accettati, per singola azienda mandante</p>
      <select value={aziendaSelezionata} onChange={(e) => setAziendaSelezionata(e.target.value)} style={{ ...inputStyle, marginBottom: 20, maxWidth: 260 }}>
        {aziende.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}
      {loading ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p> : !aziendaSelezionata ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Aggiungi prima un'azienda mandante.</p> : (
        <>
          <div style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, padding: 20, marginBottom: 20, maxWidth: 300, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
            <div style={{ fontSize: 12, color: COLORS.muted }}>Fatturato totale</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>{formattaEuro(fatturatoTotale)}</div>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ flex: "1 1 320px", background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, padding: 20, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
              <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Preventivi per stato</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={datiStati} dataKey="value" nameKey="name" outerRadius={80} label>
                    {datiStati.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, padding: 20, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
            <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Fatturato per cliente</h3>
            {classificaClienti.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun dato ancora per questa azienda.</p> : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ textAlign: "left", borderBottom: "2px solid " + COLORS.border }}><th style={{ padding: "6px 4px" }}>Cliente</th><th style={{ padding: "6px 4px" }}>Fatturato</th></tr></thead>
                <tbody>{classificaClienti.map((c) => (<tr key={c.nome} style={{ borderBottom: "1px solid #f0f5f9" }}><td style={{ padding: "6px 4px" }}>{c.nome}</td><td style={{ padding: "6px 4px", fontWeight: 600 }}>{formattaEuro(c.totale)}</td></tr>))}</tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Fatturato({ session }) {
  const [ordini, setOrdini] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear());
  const [aziendaSelezionata, setAziendaSelezionata] = useState("");
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        const results = await Promise.all([
          crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati?select=*", { headers: headers() }),
          crmFetch(SUPABASE_URL + "/rest/v1/preventivi?select=id,cliente_id,azienda_id,data,stato,righe,imballo_modalita,imballo_percentuale,imballo_valore,trasporto_modalita,trasporto_percentuale,trasporto_valore,iva_modalita,iva_percentuale,iva_valore", { headers: headers() }),
          crmFetch(SUPABASE_URL + "/rest/v1/clienti?select=id,ragione_sociale", { headers: headers() }),
          crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?select=id,nome", { headers: headers() }),
        ]);
        const [dOrdini, dPreventivi, dClienti, dAziende] = await Promise.all(results.map((r) => r.json()));
        setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
        setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
        setClienti(Array.isArray(dClienti) ? dClienti : []);
        const listaAziende = Array.isArray(dAziende) ? dAziende : [];
        setAziende(listaAziende);
        setAziendaSelezionata((prev) => prev || (listaAziende[0] ? listaAziende[0].id : ""));
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    })();
  }, [session]);

  const nomeCliente = (id) => { const c = clienti.find((x) => x.id === id); return c ? c.ragione_sociale : "Sconosciuto"; };
  const ricavi = aziendaSelezionata ? combinaRicaviPerAzienda(ordini, preventivi, aziendaSelezionata) : [];
  const fatturatoTotale = ricavi.reduce((s, r) => s + r.importo, 0);
  const perAnno = {};
  ricavi.forEach((r) => { const anno = new Date(r.data).getFullYear(); perAnno[anno] = (perAnno[anno] || 0) + r.importo; });
  const datiAnnuali = Object.entries(perAnno).map(([anno, totale]) => ({ anno, totale })).sort((a, b) => a.anno - b.anno);
  const anniDisponibili = Object.keys(perAnno).map(Number).sort((a, b) => b - a);
  const perMese = Array(12).fill(0);
  ricavi.forEach((r) => { const d = new Date(r.data); if (d.getFullYear() === annoSelezionato) perMese[d.getMonth()] += r.importo; });
  const datiMensili = MESI_BREVI.map((m, i) => ({ mese: m, totale: perMese[i] }));
  const perCliente = {};
  ricavi.forEach((r) => { const key = nomeCliente(r.cliente_id); perCliente[key] = (perCliente[key] || 0) + r.importo; });
  const topClienti = Object.entries(perCliente).map(([nome, totale]) => ({ nome, totale })).sort((a, b) => b.totale - a.totale).slice(0, 8);
  const cardStyle = { background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, padding: 20, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" };
  const selectStyle = { padding: "8px 12px", border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13 };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Fatturato</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Andamento del fatturato nel tempo, per singola azienda mandante</p>
      <select value={aziendaSelezionata} onChange={(e) => setAziendaSelezionata(e.target.value)} style={{ ...selectStyle, marginBottom: 20, maxWidth: 260 }}>
        {aziende.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}
      {loading ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p> : !aziendaSelezionata ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Aggiungi prima un'azienda mandante.</p> : (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ ...cardStyle, maxWidth: 260 }}>
              <div style={{ fontSize: 12, color: COLORS.muted }}>Fatturato totale</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.text }}>{formattaEuro(fatturatoTotale)}</div>
            </div>
            {datiAnnuali.slice(-3).map((a) => (
              <div key={a.anno} style={{ ...cardStyle, maxWidth: 200 }}>
                <div style={{ fontSize: 12, color: COLORS.muted }}>Anno {a.anno}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>{formattaEuro(a.totale)}</div>
              </div>
            ))}
          </div>
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, color: COLORS.text }}>Riepilogo mensile</h3>
              <select value={annoSelezionato} onChange={(e) => setAnnoSelezionato(Number(e.target.value))} style={{ ...selectStyle, padding: "6px 10px" }}>
                {(anniDisponibili.length ? anniDisponibili : [new Date().getFullYear()]).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={datiMensili}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef3f7" />
                <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formattaEuro(v)} />
                <Bar dataKey="totale" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ ...cardStyle }}>
            <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Andamento clienti (top 8)</h3>
            {topClienti.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun dato ancora per questa azienda.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topClienti} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3f7" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v) => formattaEuro(v)} />
                  <Bar dataKey="totale" fill={COLORS.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RegistroOrdini({ session, apriPreventivo }) {
  const [ordini, setOrdini] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroAzienda, setFiltroAzienda] = useState("");
  const [ordineInModifica, setOrdineInModifica] = useState(null);
  const [formOrdine, setFormOrdine] = useState({ azienda_id: "", importo: "", data_ordine: "", note: "" });
  const [salvandoOrdine, setSalvandoOrdine] = useState(false);
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  async function load() {
    setLoading(true); setError("");
    try {
      const results = await Promise.all([
        crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati?select=*", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/preventivi?select=*", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/clienti?select=id,ragione_sociale", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?select=id,nome", { headers: headers() }),
      ]);
      const [dOrdini, dPreventivi, dClienti, dAziende] = await Promise.all(results.map((r) => r.json()));
      setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
      setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
      setClienti(Array.isArray(dClienti) ? dClienti : []);
      setAziende(Array.isArray(dAziende) ? dAziende : []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [session]);

  const nomeCliente = (id) => { const c = clienti.find((x) => x.id === id); return c ? c.ragione_sociale : "Sconosciuto"; };
  const nomeAzienda = (id) => { const a = aziende.find((x) => x.id === id); return a ? a.nome : "Sconosciuta"; };

  const righeOrdini = ordini.map((o) => ({ id: "ordine-" + o.id, idOriginale: o.id, tipoOriginale: "ordine", tipo: "Ordine confermato", cliente_id: o.cliente_id, azienda_id: o.azienda_id, data: o.data_ordine, statoLabel: "Confermato", statoColore: COLORS.success, importo: Number(o.importo) || 0 }));
  const righePreventivi = preventivi.map((pv) => {
    const infoStato = STATI_PREVENTIVO.find((s) => s.valore === pv.stato) || STATI_PREVENTIVO[0];
    return { id: "preventivo-" + pv.id, idOriginale: pv.id, tipoOriginale: "preventivo", tipo: "Preventivo" + (pv.rif ? " (" + pv.rif + ")" : ""), cliente_id: pv.cliente_id, cliente_manuale: pv.cliente_manuale, azienda_id: pv.azienda_id, data: pv.data, statoLabel: infoStato.label, statoColore: infoStato.colore, importo: calcolaTotaliPreventivo(pv, pv.righe || []).totaleFinale };
  });

  const modificaOrdine = (idOrdine) => {
    const o = ordini.find((x) => x.id === idOrdine);
    if (!o) return;
    setOrdineInModifica(idOrdine);
    setFormOrdine({ azienda_id: o.azienda_id || "", importo: o.importo ?? "", data_ordine: o.data_ordine || "", note: o.note || "" });
  };
  const salvaModificaOrdine = async () => {
    setSalvandoOrdine(true); setError("");
    try {
      await crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati?id=eq." + ordineInModifica, { method: "PATCH", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ azienda_id: formOrdine.azienda_id, importo: Number(formOrdine.importo) || 0, data_ordine: formOrdine.data_ordine, note: formOrdine.note || null }) });
      setOrdineInModifica(null); load();
    } catch (err) { setError(err.message); } finally { setSalvandoOrdine(false); }
  };
  const eliminaOrdine = async (idOrdine) => {
    if (!window.confirm("Eliminare questo ordine confermato?")) return;
    try { await crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati?id=eq." + idOrdine, { method: "DELETE", headers: headers() }); load(); } catch (err) { setError(err.message); }
  };

  const tutteLeRighe = [...righeOrdini, ...righePreventivi]
    .filter((r) => !filtroCliente || r.cliente_id === filtroCliente)
    .filter((r) => !filtroAzienda || r.azienda_id === filtroAzienda)
    .sort((a, b) => new Date(b.data) - new Date(a.data));
  const selectStyle = { padding: "8px 12px", border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13 };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Registro ordini</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Ordini confermati e preventivi, tutti insieme</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} style={{ ...selectStyle, maxWidth: 220 }}>
          <option value="">Tutti i clienti</option>
          {clienti.map((c) => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
        </select>
        <select value={filtroAzienda} onChange={(e) => setFiltroAzienda(e.target.value)} style={{ ...selectStyle, maxWidth: 220 }}>
          <option value="">Tutte le aziende</option>
          {aziende.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}
      {ordineInModifica && (
        <div style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, padding: 20, marginBottom: 20, maxWidth: 500, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
          <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Modifica ordine confermato</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <select value={formOrdine.azienda_id} onChange={(e) => setFormOrdine({ ...formOrdine, azienda_id: e.target.value })} style={{ ...selectStyle, width: 160 }}>
              <option value="">-- Azienda --</option>
              {aziende.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <input type="number" placeholder="Importo €" value={formOrdine.importo} onChange={(e) => setFormOrdine({ ...formOrdine, importo: e.target.value })} style={{ ...selectStyle, width: 110 }} />
            <input type="date" value={formOrdine.data_ordine} onChange={(e) => setFormOrdine({ ...formOrdine, data_ordine: e.target.value })} style={{ ...selectStyle, width: 140 }} />
            <input placeholder="Note" value={formOrdine.note} onChange={(e) => setFormOrdine({ ...formOrdine, note: e.target.value })} style={{ ...selectStyle, width: 160 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={salvaModificaOrdine} disabled={salvandoOrdine} style={{ padding: "8px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{salvandoOrdine ? "Salvataggio..." : "Salva modifiche"}</button>
            <button onClick={() => setOrdineInModifica(null)} style={{ padding: "8px 16px", background: "#fff", color: COLORS.primary, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Annulla</button>
          </div>
        </div>
      )}
      {loading ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p> : tutteLeRighe.length === 0 ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun ordine o preventivo trovato.</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} className="tabella-responsive">
          <thead><tr style={{ textAlign: "left", borderBottom: "2px solid " + COLORS.border }}>
            <th style={{ padding: "8px 6px" }}>Tipo</th><th style={{ padding: "8px 6px" }}>Cliente</th><th style={{ padding: "8px 6px" }}>Azienda</th><th style={{ padding: "8px 6px" }}>Data</th><th style={{ padding: "8px 6px" }}>Stato</th><th style={{ padding: "8px 6px" }}>Importo</th><th style={{ padding: "8px 6px" }}></th>
          </tr></thead>
          <tbody>
            {tutteLeRighe.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                <td style={{ padding: "8px 6px" }} data-label="Tipo">{r.tipo}</td>
                <td style={{ padding: "8px 6px" }} data-label="Cliente">{r.cliente_id ? nomeCliente(r.cliente_id) : (r.cliente_manuale || "—")}</td>
                <td style={{ padding: "8px 6px" }} data-label="Azienda">{nomeAzienda(r.azienda_id)}</td>
                <td style={{ padding: "8px 6px" }} data-label="Data">{r.data ? new Date(r.data).toLocaleDateString("it-IT") : "-"}</td>
                <td style={{ padding: "8px 6px" }} data-label="Stato"><span style={{ color: r.statoColore, fontWeight: 700 }}>● {r.statoLabel}</span></td>
                <td style={{ padding: "8px 6px", fontWeight: 600 }} data-label="Importo">{formattaEuro(r.importo)}</td>
                <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }} data-label="">
                  {r.tipoOriginale === "preventivo" ? (
                    <button onClick={() => apriPreventivo && apriPreventivo(r.idOriginale)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 12 }}>Apri / Modifica stato</button>
                  ) : (
                    <>
                      <button onClick={() => modificaOrdine(r.idOriginale)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 12, marginRight: 10 }}>Modifica</button>
                      <button onClick={() => eliminaOrdine(r.idOriginale)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>Elimina</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PortafoglioOrdini({ session }) {
  const [preventivi, setPreventivi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const results = await Promise.all([
        crmFetch(SUPABASE_URL + "/rest/v1/preventivi?stato=eq.accettato&fatturato=eq.false&select=*", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/clienti?select=id,ragione_sociale", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?select=id,nome", { headers: headers() }),
      ]);
      const [dPreventivi, dClienti, dAziende] = await Promise.all(results.map((r) => r.json()));
      setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
      setClienti(Array.isArray(dClienti) ? dClienti : []);
      setAziende(Array.isArray(dAziende) ? dAziende : []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [session]);

  const nomeCliente = (id) => { const c = clienti.find((x) => x.id === id); return c ? c.ragione_sociale : "Sconosciuto"; };
  const nomeAzienda = (id) => { const a = aziende.find((x) => x.id === id); return a ? a.nome : "Sconosciuta"; };

  const segnaComeFatturato = async (pv) => {
    if (!window.confirm("Creare un ordine confermato da questo preventivo?")) return;
    try {
      const tot = calcolaTotaliPreventivo(pv, pv.righe || []);
      await crmFetch(SUPABASE_URL + "/rest/v1/ordini_confermati", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ cliente_id: pv.cliente_id, azienda_id: pv.azienda_id, importo: tot.totaleFinale, data_ordine: new Date().toISOString().slice(0, 10), note: pv.rif ? "Da preventivo " + pv.rif : "Da preventivo" }) });
      await crmFetch(SUPABASE_URL + "/rest/v1/preventivi?id=eq." + pv.id, { method: "PATCH", headers: headers(), body: JSON.stringify({ fatturato: true }) });
      load();
    } catch (err) { setError(err.message); }
  };

  const totale = preventivi.reduce((s, pv) => s + calcolaTotaliPreventivo(pv, pv.righe || []).totaleFinale, 0);

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Portafoglio ordini</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Preventivi accettati, in attesa di diventare fatturato</p>
      <div style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, padding: 20, marginBottom: 20, maxWidth: 300, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
        <div style={{ fontSize: 12, color: COLORS.muted }}>Totale in portafoglio</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.text }}>{formattaEuro(totale)}</div>
      </div>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}
      {loading ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p> : preventivi.length === 0 ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun preventivo accettato in attesa di fatturazione.</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} className="tabella-responsive">
          <thead><tr style={{ textAlign: "left", borderBottom: "2px solid " + COLORS.border }}>
            <th style={{ padding: "8px 6px" }}>RIF</th><th style={{ padding: "8px 6px" }}>Data</th><th style={{ padding: "8px 6px" }}>Cliente</th><th style={{ padding: "8px 6px" }}>Azienda</th><th style={{ padding: "8px 6px" }}>Importo</th><th style={{ padding: "8px 6px" }}></th>
          </tr></thead>
          <tbody>
            {preventivi.map((pv) => (
              <tr key={pv.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                <td style={{ padding: "8px 6px" }} data-label="RIF">{pv.rif || "-"}</td>
                <td style={{ padding: "8px 6px" }} data-label="Data">{pv.data ? new Date(pv.data).toLocaleDateString("it-IT") : "-"}</td>
                <td style={{ padding: "8px 6px" }} data-label="Cliente">{pv.cliente_id ? nomeCliente(pv.cliente_id) : (pv.cliente_manuale || "—")}</td>
                <td style={{ padding: "8px 6px" }} data-label="Azienda">{nomeAzienda(pv.azienda_id)}</td>
                <td style={{ padding: "8px 6px", fontWeight: 600 }} data-label="Importo">{formattaEuro(calcolaTotaliPreventivo(pv, pv.righe || []).totaleFinale)}</td>
                <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }} data-label=""><button onClick={() => segnaComeFatturato(pv)} style={{ background: "none", border: "none", color: COLORS.success, cursor: "pointer", fontSize: 12 }}>Segna come fatturato</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function GruppiAcquisto({ session, gruppoIniziale, onGruppoAperto }) {
  const [lista, setLista] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = { nome: "", note: "", condizioni_per_azienda: {} };
  const [form, setForm] = useState(emptyForm);
  const [aziendeSelezionate, setAziendeSelezionate] = useState([]);
  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const results = await Promise.all([
        crmFetch(SUPABASE_URL + "/rest/v1/gruppi_acquisto?select=*&order=nome.asc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/clienti?select=id,ragione_sociale,gruppo_id&order=ragione_sociale.asc", { headers: headers() }),
        crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc", { headers: headers() }),
      ]);
      const [dGruppi, dClienti, dAziende] = await Promise.all(results.map((r) => r.json()));
      setLista(Array.isArray(dGruppi) ? dGruppi : []);
      setClienti(Array.isArray(dClienti) ? dClienti : []);
      setAziende(Array.isArray(dAziende) ? dAziende : []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [session]);

  const apriModifica = (gruppo) => {
    setEditingId(gruppo.id);
    setForm({ nome: gruppo.nome || "", note: gruppo.note || "", condizioni_per_azienda: gruppo.condizioni_per_azienda || {} });
    setAziendeSelezionate(Object.keys(gruppo.condizioni_per_azienda || {}));
  };
  useEffect(() => {
    if (!gruppoIniziale) return;
    const g = lista.find((x) => x.id === gruppoIniziale);
    if (g) { apriModifica(g); if (onGruppoAperto) onGruppoAperto(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoIniziale, lista]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setAziendeSelezionate([]); };
  const toggleAzienda = (nomeAz) => {
    setAziendeSelezionate((prev) => {
      const attiva = prev.includes(nomeAz);
      const nuove = attiva ? prev.filter((n) => n !== nomeAz) : [...prev, nomeAz];
      setForm((f) => { const cond = { ...f.condizioni_per_azienda }; if (attiva) delete cond[nomeAz]; return { ...f, condizioni_per_azienda: cond }; });
      return nuove;
    });
  };
  const aggiornaCondizione = (nomeAz, testo) => setForm((f) => ({ ...f, condizioni_per_azienda: { ...f.condizioni_per_azienda, [nomeAz]: testo } }));

  const salva = async () => {
    if (!form.nome.trim()) { setError("Il nome del gruppo è obbligatorio."); return; }
    setSaving(true); setError("");
    try {
      const body = { nome: form.nome, note: form.note || null, condizioni_per_azienda: form.condizioni_per_azienda };
      const res = editingId
        ? await crmFetch(SUPABASE_URL + "/rest/v1/gruppi_acquisto?id=eq." + editingId, { method: "PATCH", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) })
        : await crmFetch(SUPABASE_URL + "/rest/v1/gruppi_acquisto", { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio");
      resetForm(); load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const elimina = async (id) => {
    if (!window.confirm("Eliminare questo gruppo d'acquisto? I clienti resteranno ma perderanno il collegamento al gruppo.")) return;
    try { const res = await crmFetch(SUPABASE_URL + "/rest/v1/gruppi_acquisto?id=eq." + id, { method: "DELETE", headers: headers() }); if (!res.ok) throw new Error("Errore nell'eliminazione"); load(); } catch (err) { setError(err.message); }
  };
  const toggleClienteNelGruppo = async (clienteId, gruppoId, attualmenteDentro) => {
    try { await crmFetch(SUPABASE_URL + "/rest/v1/clienti?id=eq." + clienteId, { method: "PATCH", headers: headers(), body: JSON.stringify({ gruppo_id: attualmenteDentro ? null : gruppoId }) }); load(); } catch (err) { setError(err.message); }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>Gruppi d'acquisto</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 14, boxShadow: "0 4px 14px rgba(20,40,60,0.05)", padding: 20, maxWidth: 420 }}>
          <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>{editingId ? "Modifica gruppo" : "Nuovo gruppo"}</h3>
          <input placeholder="Nome gruppo *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
          <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...inputStyle, minHeight: 50 }} />
          <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>Condizioni commerciali riservate per azienda mandante</label>
          <div style={{ marginBottom: 12, maxHeight: 220, overflowY: "auto", border: "1px solid " + COLORS.border, borderRadius: 8, padding: 8 }}>
            {aziende.length === 0 && <span style={{ fontSize: 12, color: "#9aa7b2" }}>Nessuna azienda mandante inserita ancora</span>}
            {aziende.map((a) => (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4 }}>
                  <input type="checkbox" checked={aziendeSelezionate.includes(a.nome)} onChange={() => toggleAzienda(a.nome)} /> {a.nome}
                </label>
                {aziendeSelezionate.includes(a.nome) && (
                  <input placeholder={"Condizioni riservate con " + a.nome} value={form.condizioni_per_azienda[a.nome] || ""} onChange={(e) => aggiornaCondizione(a.nome, e.target.value)} style={{ ...inputStyle, marginBottom: 0, marginLeft: 22, width: "calc(100% - 22px)", fontSize: 11 }} />
                )}
              </div>
            ))}
          </div>
          {editingId && (
            <>
              <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>Clienti che fanno parte di questo gruppo</label>
              <div style={{ marginBottom: 12, maxHeight: 180, overflowY: "auto", border: "1px solid " + COLORS.border, borderRadius: 8, padding: 8 }}>
                {clienti.length === 0 && <span style={{ fontSize: 12, color: "#9aa7b2" }}>Nessun cliente ancora inserito</span>}
                {clienti.map((c) => {
                  const dentro = c.gruppo_id === editingId;
                  const inAltroGruppo = c.gruppo_id && c.gruppo_id !== editingId;
                  return (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4, opacity: inAltroGruppo ? 0.5 : 1 }}>
                      <input type="checkbox" checked={dentro} disabled={inAltroGruppo} onChange={() => toggleClienteNelGruppo(c.id, editingId, dentro)} /> {c.ragione_sociale} {inAltroGruppo && <span style={{ fontSize: 10 }}>(in un altro gruppo)</span>}
                    </label>
                  );
                })}
              </div>
            </>
          )}
          {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={salva} disabled={saving} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Crea gruppo"}</button>
            {editingId && <button onClick={resetForm} style={{ padding: "9px 16px", background: "#fff", color: COLORS.primary, border: "1px solid " + COLORS.border, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annulla</button>}
          </div>
        </div>
        <div style={{ flex: "2 1 400px" }}>
          {loading ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p> : lista.length === 0 ? <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun gruppo d'acquisto ancora creato.</p> : (
            lista.map((g) => {
              const membri = clienti.filter((c) => c.gruppo_id === g.id);
              return (
                <div key={g.id} style={{ background: COLORS.card, border: "1px solid " + COLORS.border, borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(20,40,60,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14 }}>{g.nome}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{membri.length} cliente/i nel gruppo</div>
                    </div>
                    <div>
                      <button onClick={() => apriModifica(g)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 12, marginRight: 10 }}>Modifica</button>
                      <button onClick={() => elimina(g.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>Elimina</button>
                    </div>
                  </div>
                  {membri.length > 0 && <div style={{ fontSize: 12, marginTop: 8 }}>{membri.map((c) => c.ragione_sociale).join(", ")}</div>}
                  {g.note && <div style={{ fontSize: 12, marginTop: 6, color: COLORS.muted }}>{g.note}</div>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function StoricoVisiteCRM({ session }) {
  const [visite,setVisite]=useState([]);
  const [clienti,setClienti]=useState([]);
  const [errore,setErrore]=useState("");
  useEffect(()=>{let active=true;(async()=>{try{const h={apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+session.access_token};const [rv,rc]=await Promise.all([crmFetch(SUPABASE_URL+"/rest/v1/visite?select=*&order=data_visita.desc",{headers:h}),crmFetch(SUPABASE_URL+"/rest/v1/clienti?select=id,ragione_sociale",{headers:h})]);const [v,c]=await Promise.all([rv.json(),rc.json()]);if(!rv.ok||!rc.ok)throw new Error(v?.message||c?.message||"Errore nel caricamento");if(active){setVisite(v);setClienti(c)}}catch(e){if(active)setErrore(e.message)}})();return()=>{active=false}},[session]);
  return <div><div className="matrice-welcome"><div><h1>Storico visite</h1><p>Registro delle visite commerciali salvate in precedenza.</p></div></div>{errore&&<p style={{color:"#b42318"}}>{errore}</p>}<div style={{background:"#fff",padding:20,borderRadius:14,border:"1px solid #dce5f3"}}>{visite.length===0?<p className="matrice-empty">Nessuna visita storica registrata.</p>:visite.map(v=><article key={v.id} style={{padding:"15px 4px",borderBottom:"1px solid #edf1f7"}}><strong>{clienti.find(c=>c.id===v.cliente_id)?.ragione_sociale||"Cliente non specificato"}</strong><span style={{marginLeft:12,fontSize:12,color:"#66758d"}}>{v.data_visita?new Date(v.data_visita+"T12:00:00").toLocaleDateString("it-IT"):""}</span>{v.argomenti_trattati&&<p style={{fontSize:12,margin:"8px 0"}}>Argomenti: {v.argomenti_trattati}</p>}{v.cataloghi_lasciati&&<p style={{fontSize:12,margin:"8px 0"}}>Cataloghi: {v.cataloghi_lasciati}</p>}{v.note&&<p style={{fontSize:12,margin:"8px 0"}}>Note: {v.note}</p>}</article>)}</div></div>;
}

function NoteCRM({ session }) {
  const [note, setNote] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [form, setForm] = useState({ titolo:"", contenuto:"", cliente_id:"" });
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const headers = () => ({ "Content-Type":"application/json", apikey:SUPABASE_ANON_KEY, Authorization:"Bearer "+session.access_token });
  const fetchJson = async (url, options={}) => { const res=await crmFetch(SUPABASE_URL+"/rest/v1/"+url,{...options,headers:headers()}); const raw=await res.text(); const json=raw?JSON.parse(raw):null; if(!res.ok)throw new Error(json?.message||"Errore di connessione");return json; };
  const load = async () => { try { setError(""); const [n,c]=await Promise.all([fetchJson("note_crm?select=*&order=updated_at.desc"),fetchJson("clienti?select=id,ragione_sociale&order=ragione_sociale.asc")]);setNote(n||[]);setClienti(c||[]); }catch(e){setError(e.message+". Verifica di aver creato la tabella note_crm in Supabase sviluppo.");} };
  useEffect(()=>{load();},[]);
  const reset = () => {setEditing(null);setForm({titolo:"",contenuto:"",cliente_id:""});};
  const save = async e => {e.preventDefault();if(!form.titolo.trim())return;setBusy(true);setError("");try{const payload={titolo:form.titolo.trim(),contenuto:form.contenuto,cliente_id:form.cliente_id||null,updated_at:new Date().toISOString()};await fetchJson("note_crm"+(editing?"?id=eq."+editing:""),{method:editing?"PATCH":"POST",body:JSON.stringify(payload)});reset();await load();}catch(e){setError(e.message);}finally{setBusy(false);} };
  const remove = async id => {if(!window.confirm("Eliminare definitivamente questa nota?"))return;try{await fetchJson("note_crm?id=eq."+id,{method:"DELETE"});if(editing===id)reset();await load();}catch(e){setError(e.message);} };
  const edit = n => {setEditing(n.id);setForm({titolo:n.titolo||"",contenuto:n.contenuto||"",cliente_id:n.cliente_id||""});window.scrollTo({top:0,behavior:"smooth"});};
  const input = {width:"100%",padding:"11px 12px",border:"1px solid #dbe3f0",borderRadius:10,fontSize:13,background:"#fff",color:"#17233b"};
  const filtered=note.filter(n=>(n.titolo+" "+(n.contenuto||"")).toLowerCase().includes(search.toLowerCase()));
  return <div className="crm-notes-page"><div className="matrice-welcome"><div><h1>Le tue note</h1><p>Appunti commerciali, idee, promemoria e informazioni sui clienti.</p></div></div>
    {error&&<p style={{color:"#b42318",background:"#fff1f0",padding:12,borderRadius:9}}>{error}</p>}
    <div className="crm-notes-layout"><form className="crm-notes-editor" onSubmit={save}><h3>{editing?"Modifica nota":"Nuova nota"}</h3><label>Titolo<input required style={input} value={form.titolo} onChange={e=>setForm({...form,titolo:e.target.value})} placeholder="Es. Incontro studio di architettura"/></label><label>Cliente collegato (facoltativo)<select style={input} value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}><option value="">Nessun cliente</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}</select></label><label>Contenuto<textarea style={{...input,minHeight:190,resize:"vertical"}} value={form.contenuto} onChange={e=>setForm({...form,contenuto:e.target.value})} placeholder="Scrivi qui i tuoi appunti..."/></label><div style={{display:"flex",gap:8}}><button className="crm-primary-btn" disabled={busy} type="submit">{busy?"Salvataggio...":editing?"Salva modifiche":"Salva nota"}</button>{editing&&<button type="button" className="crm-secondary-btn" onClick={reset}>Annulla</button>}</div></form>
    <div className="crm-notes-list"><div className="crm-notes-list-head"><h3>Note salvate ({filtered.length})</h3><input style={{...input,maxWidth:250}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca nelle note..."/></div>{filtered.length===0?<p className="matrice-empty">Nessuna nota da mostrare.</p>:filtered.map(n=><article key={n.id} className="crm-note-card"><div className="crm-note-card-top"><div><h4>{n.titolo}</h4><small>{new Date(n.updated_at||n.created_at).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"})}{n.cliente_id?" · "+(clienti.find(c=>c.id===n.cliente_id)?.ragione_sociale||"Cliente"):""}</small></div><div><button onClick={()=>edit(n)}>Modifica</button><button onClick={()=>remove(n.id)} className="crm-danger-btn">Elimina</button></div></div><p>{n.contenuto||"Nessun contenuto"}</p></article>)}</div></div>
  </div>;
}

function ControlloCommerciale({ session }) {
  const annoCorrente = new Date().getFullYear();
  const [anno, setAnno] = useState(annoCorrente);
  const [aziendaId, setAziendaId] = useState("");
  const [aziende, setAziende] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [fatturati, setFatturati] = useState([]);
  const [portafogli, setPortafogli] = useState([]);
  const [tab, setTab] = useState("fatturato");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(null);
  const oggi = new Date();
  const dataOggi = [oggi.getFullYear(),String(oggi.getMonth()+1).padStart(2,"0"),String(oggi.getDate()).padStart(2,"0")].join("-");
  const vuoto = {cliente_id:"", periodicita:"mensile",periodo:String(oggi.getMonth()+1),anno:String(annoCorrente),importo:"",data_rilevazione:dataOggi,note:""};
  const [form,setForm] = useState(vuoto);
  const headers = () => ({ "Content-Type":"application/json", apikey:SUPABASE_ANON_KEY, Authorization:"Bearer "+session.access_token });
  const request = async (path, options={}) => {
    const response = await crmFetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{...headers(),...(options.headers||{})}});
    const raw = await response.text();
    let result = null;
    try {result=raw?JSON.parse(raw):null;} catch {result=raw;}
    if(!response.ok) throw new Error(result?.message || result?.details || "Errore durante la comunicazione con Supabase");
    return result;
  };
  const load = async () => {
    setLoading(true);setError("");
    try {
      const [a,c,f,p]=await Promise.all([
        request("aziende_mandanti?select=id,nome,colore&order=nome.asc"),
        request("clienti?select=id,ragione_sociale,aziende_collaborate&order=ragione_sociale.asc"),
        request("fatturato_commerciale?select=*&order=anno.desc,periodo.desc"),
        request("portafoglio_ordini?select=*&order=data_rilevazione.desc")
      ]);
      setAziende(a||[]);setClienti(c||[]);setFatturati(f||[]);setPortafogli(p||[]);
      setAziendaId(old => (a||[]).some(x=>x.id===old)?old:((a||[])[0]?.id||""));
    } catch(e){setError(e.message);} finally {setLoading(false);}
  };
  useEffect(()=>{load();},[session.access_token]);
  const azienda=aziende.find(a=>a.id===aziendaId);
  const clientiAmmessi=clienti.filter(c=>Array.isArray(c.aziende_collaborate)&&c.aziende_collaborate.includes(azienda?.nome));
  const nomeCliente=id=>clienti.find(c=>c.id===id)?.ragione_sociale||"Cliente non trovato";
  const euro=n=>Number(n||0).toLocaleString("it-IT",{style:"currency",currency:"EUR"});
  const fAnno=fatturati.filter(f=>f.azienda_id===aziendaId&&f.anno===Number(anno));
  const fTotale=fAnno.reduce((sum,f)=>sum+Number(f.importo||0),0);
  const ultime=new Map();
  portafogli.filter(p=>p.azienda_id===aziendaId&&p.data_rilevazione<=dataOggi).forEach(p=>{
    const prev=ultime.get(p.cliente_id);
    if(!prev||p.data_rilevazione>prev.data_rilevazione) ultime.set(p.cliente_id,p);
  });
  const pTotale=Array.from(ultime.values()).reduce((sum,p)=>sum+Number(p.importo||0),0);
  const righe=tab==="fatturato"?fAnno:[...portafogli.filter(p=>p.azienda_id===aziendaId)].sort((a,b)=>b.data_rilevazione.localeCompare(a.data_rilevazione));
  const nuovo=(tipo=tab)=>{setTab(tipo);setEditing(null);setError("");setSuccess("");setForm({...vuoto,anno:String(anno)});};
  const modifica=(r,tipo)=>{setTab(tipo);setEditing(r.id);setForm({cliente_id:r.cliente_id,periodicita:r.periodicita||"mensile",periodo:String(r.periodo||1),anno:String(r.anno||anno),importo:String(r.importo),data_rilevazione:r.data_rilevazione||dataOggi,note:r.note||""});setError("");setSuccess("");};
  const salva=async()=>{
    setError("");setSuccess("");
    if(!aziendaId||!form.cliente_id){setError("Seleziona un'azienda e un cliente.");return;}
    if(!clientiAmmessi.some(c=>c.id===form.cliente_id)){setError("Il cliente non risulta associato alla mandante.");return;}
    if(form.importo.trim()===""||!Number.isFinite(Number(form.importo))||Number(form.importo)<0){setError("Inserisci un importo valido, anche zero.");return;}
    if(tab==="fatturato"&&(!Number.isInteger(Number(form.anno))||Number(form.anno)<2000||Number(form.anno)>2100)){setError("Anno non valido.");return;}
    if(tab==="portafoglio"&&(!form.data_rilevazione||form.data_rilevazione>dataOggi)){setError("Inserisci una data di rilevazione valida, non futura.");return;}
    const table=tab==="fatturato"?"fatturato_commerciale":"portafoglio_ordini";
    const body=tab==="fatturato"?{cliente_id:form.cliente_id,azienda_id:aziendaId,anno:Number(form.anno),periodicita:form.periodicita,periodo:Number(form.periodo),importo:Number(form.importo),note:form.note||null}:{cliente_id:form.cliente_id,azienda_id:aziendaId,data_rilevazione:form.data_rilevazione,importo:Number(form.importo),note:form.note||null};
    setSaving(true);
    try {await request(table+(editing?"?id=eq."+editing:""),{method:editing?"PATCH":"POST",body:JSON.stringify(body)});await load();setEditing(null);setForm({...vuoto,anno:String(anno)});setSuccess("Registrazione salvata correttamente.");}
    catch(e){setError(e.message.includes("registrazione_unica")||e.message.includes("rilevazione_unica")?"Esiste già una registrazione per questo cliente e periodo/data.":e.message);}
    finally {setSaving(false);}
  };
  const elimina=async(r,tipo)=>{
    if(!window.confirm("Eliminare definitivamente questa registrazione?"))return;
    setError("");setSuccess("");
    try {await request((tipo==="fatturato"?"fatturato_commerciale":"portafoglio_ordini")+"?id=eq."+r.id,{method:"DELETE"});await load();if(editing===r.id)nuovo(tipo);setSuccess("Registrazione eliminata.");}catch(e){setError(e.message);}
  };
  const box={background:"#fff",border:"1px solid #e5eaf3",borderRadius:14,padding:18};
  const input={width:"100%",padding:"10px 11px",border:"1px solid #dbe3ee",borderRadius:9,background:"#fff",color:"#26344d",fontSize:13};
  const label={display:"block",fontSize:12,fontWeight:650,color:"#58677e",marginBottom:5};
  const btn={border:0,borderRadius:9,padding:"10px 15px",background:"#3479ee",color:"#fff",fontWeight:700,cursor:"pointer"};
  return <div style={{display:"grid",gap:16}}>
    <div><h2 style={{margin:"0 0 5px",fontSize:23,color:"#15243c"}}>Controllo Commerciale</h2><p style={{margin:0,color:"#8490a3",fontSize:12}}>Fatturato e portafoglio ordini registrati manualmente · IVA esclusa</p></div>
    <div style={{...box,display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
      <div style={{flex:"1 1 220px"}}><label style={label}>Azienda mandante</label><select style={input} value={aziendaId} onChange={e=>{setAziendaId(e.target.value);setEditing(null);setForm({...vuoto,anno:String(anno)});}}><option value="">Seleziona azienda</option>{aziende.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
      <div style={{width:125}}><label style={label}>Anno fatturato</label><select style={input} value={anno} onChange={e=>{setAnno(Number(e.target.value));setEditing(null);setForm({...vuoto,anno:e.target.value});}}>{Array.from({length:8},(_,i)=>annoCorrente+1-i).map(y=><option key={y} value={y}>{y}</option>)}</select></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:12}}>
      {[{titolo:"Fatturato nell'anno",valore:fTotale,sub:"Somma dei periodi registrati"},{titolo:"Portafoglio attuale",valore:pTotale,sub:"Ultima rilevazione per cliente"},{titolo:"Volume commerciale",valore:fTotale+pTotale,sub:"Fatturato + portafoglio attuale"},{titolo:"Clienti associati",valore:clientiAmmessi.length,sub:"Abilitati per la mandante",numero:true}].map(x=><div key={x.titolo} style={box}><div style={{color:"#7b879a",fontSize:12}}>{x.titolo}</div><strong style={{display:"block",fontSize:23,margin:"9px 0",color:"#1c2d4b"}}>{x.numero?x.valore:euro(x.valore)}</strong><span style={{fontSize:11,color:"#96a0af"}}>{x.sub}</span></div>)}
    </div>
    {loading?<div style={box}>Caricamento dati…</div>:<>
      {aziende.length===0&&<div style={box}>Inserisci prima un'azienda mandante nella sezione Mandanti.</div>}
      {azienda&&clientiAmmessi.length===0&&<div style={{...box,color:"#8a641b",background:"#fffaf0"}}>Nessun cliente associato a {azienda.nome}. Crea un cliente di prova e seleziona questa mandante nella sua scheda.</div>}
      <div style={{...box,display:"grid",gap:13}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[{id:"fatturato",label:"Fatturato"},{id:"portafoglio",label:"Portafoglio ordini"}].map(t=><button key={t.id} onClick={()=>nuovo(t.id)} style={{...btn,background:tab===t.id?"#3479ee":"#eef3fb",color:tab===t.id?"#fff":"#40526e"}}>{t.label}</button>)}</div>
        <h3 style={{margin:0,fontSize:15}}>{editing?"Modifica registrazione":"Nuova registrazione"} · {tab==="fatturato"?"Fatturato":"Portafoglio ordini"}</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>
          <div><label style={label}>Cliente *</label><select style={input} value={form.cliente_id} onChange={e=>setForm(f=>({...f,cliente_id:e.target.value}))}><option value="">Seleziona cliente</option>{clientiAmmessi.map(c=><option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}</select></div>
          {tab==="fatturato"?<>
            <div><label style={label}>Periodicità</label><select style={input} value={form.periodicita} onChange={e=>setForm(f=>({...f,periodicita:e.target.value,periodo:"1"}))}><option value="mensile">Mensile</option><option value="trimestrale">Trimestrale</option></select></div>
            <div><label style={label}>Anno</label><input style={input} type="number" min="2000" max="2100" value={form.anno} onChange={e=>setForm(f=>({...f,anno:e.target.value}))}/></div>
            <div><label style={label}>{form.periodicita==="mensile"?"Mese":"Trimestre"}</label><select style={input} value={form.periodo} onChange={e=>setForm(f=>({...f,periodo:e.target.value}))}>{(form.periodicita==="mensile"?MESI:["1° trimestre","2° trimestre","3° trimestre","4° trimestre"]).map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
          </>:<div><label style={label}>Data rilevazione *</label><input style={input} type="date" max={dataOggi} value={form.data_rilevazione} onChange={e=>setForm(f=>({...f,data_rilevazione:e.target.value}))}/></div>}
          <div><label style={label}>Importo netto (€) *</label><input style={input} type="number" min="0" step="0.01" placeholder="0,00" value={form.importo} onChange={e=>setForm(f=>({...f,importo:e.target.value}))}/></div>
        </div>
        <div><label style={label}>Note (facoltative)</label><textarea style={{...input,minHeight:60}} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Dettagli della rilevazione"/></div>
        {error&&<div style={{color:"#b42318",fontSize:12}}>{error}</div>}{success&&<div style={{color:"#147d52",fontSize:12}}>{success}</div>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={btn} onClick={salva} disabled={saving||!aziendaId||clientiAmmessi.length===0}>{saving?"Salvataggio…":editing?"Salva modifiche":"Registra importo"}</button>{editing&&<button style={{...btn,background:"#edf1f7",color:"#475569"}} onClick={()=>nuovo(tab)}>Annulla modifica</button>}</div>
        <p style={{fontSize:11,color:"#8995a8",margin:0}}>{tab==="fatturato"?"Non è possibile inserire un trimestre se esistono già mesi dello stesso trimestre (e viceversa).":"Il portafoglio è una fotografia: i valori di date diverse non vengono sommati tra loro."}</p>
      </div>
      <div style={box}>
        <h3 style={{margin:"0 0 13px",fontSize:15}}>Storico {tab==="fatturato"?"fatturato · "+anno:"portafoglio"}</h3>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:580}}><thead><tr style={{background:"#f5f7fb",textAlign:"left"}}><th style={{padding:10}}>Cliente</th><th style={{padding:10}}>Periodo / data</th><th style={{padding:10,textAlign:"right"}}>Importo</th><th style={{padding:10}}>Note</th><th style={{padding:10}}>Azioni</th></tr></thead><tbody>{righe.map(r=><tr key={r.id} style={{borderBottom:"1px solid #eef1f6"}}><td style={{padding:10}}>{nomeCliente(r.cliente_id)}</td><td style={{padding:10}}>{tab==="fatturato"?(r.periodicita==="mensile"?MESI[r.periodo-1]:"T"+r.periodo)+" "+r.anno:r.data_rilevazione.split("-").reverse().join("/")}</td><td style={{padding:10,textAlign:"right",fontWeight:700}}>{euro(r.importo)}</td><td style={{padding:10,color:"#78869b"}}>{r.note||"—"}</td><td style={{padding:10,whiteSpace:"nowrap"}}><button onClick={()=>modifica(r,tab)} style={{border:0,background:"transparent",color:"#2c70e2",cursor:"pointer",marginRight:8}}>Modifica</button><button onClick={()=>elimina(r,tab)} style={{border:0,background:"transparent",color:"#bd3e3e",cursor:"pointer"}}>Elimina</button></td></tr>)}</tbody></table>{righe.length===0&&<p style={{fontSize:12,color:"#8895a8"}}>Nessuna registrazione per questa selezione.</p>}</div>
      </div>
    </>}
  </div>;
}


const FASI_PIPELINE = [
  {id:"primo_contatto",nome:"Primo contatto",colore:"#94a3b8",prob:20},
  {id:"trattativa",nome:"Trattativa",colore:"#3b82f6",prob:45},
  {id:"offerta_inviata",nome:"Offerta inviata",colore:"#8b5cf6",prob:70},
  {id:"confermata",nome:"Confermata",colore:"#16a34a",prob:100},
  {id:"persa",nome:"Persa",colore:"#ef4444",prob:0},
  {id:"sospesa",nome:"Sospesa",colore:"#d97706",prob:10}
];
function PipelineCommerciale({session, preventivoDaConvertire, onPreventivoRicevuto}) {
  const vuoto={titolo:"",cliente_id:"",azienda_id:"",fase:"primo_contatto",valore_stimato:"",probabilita:"20",data_chiusura_prevista:"",prossima_azione:"",data_prossima_azione:"",descrizione:"",note:""};
  const [aziende,setAziende]=useState([]);
  const [clienti,setClienti]=useState([]);
  const [opportunita,setOpportunita]=useState([]);
  const [aziendaFiltro,setAziendaFiltro]=useState("");
  const [form,setForm]=useState(vuoto);
  const [editing,setEditing]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [followupTarget,setFollowupTarget]=useState(null);
  const [followupForm,setFollowupForm]=useState({data:"",azione:"",note:""});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [filtroAzioni,setFiltroAzioni]=useState("tutte");
  const headers=()=>({"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+session.access_token});
  async function request(path,opts={}) {
    const r=await crmFetch(SUPABASE_URL+"/rest/v1/"+path,{...opts,headers:{...headers(),...(opts.headers||{})}});
    const raw=await r.text();
    let data=null;try{data=raw?JSON.parse(raw):null;}catch{data=raw;}
    if(!r.ok)throw new Error(data?.message||String(data)||"Errore Supabase");
    return data;
  }
  async function load() {
    setLoading(true);
    try {
      const [a,c,o]=await Promise.all([
        request("aziende_mandanti?select=id,nome,colore&order=nome.asc"),
        request("clienti?select=id,ragione_sociale,aziende_collaborate&order=ragione_sociale.asc"),
        request("opportunita_commerciali?select=*&order=created_at.desc")
      ]);
      setAziende(a||[]);setClienti(c||[]);setOpportunita(o||[]);setError("");
    }catch(e){setError(e.message);}finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);
  useEffect(() => {
    if (!preventivoDaConvertire) return;
    const p = preventivoDaConvertire;
    const valore = calcolaTotaliPreventivo(p, p.righe || []).totaleNetto;
    setEditing(null);
    setForm({
      ...vuoto,
      titolo: "Preventivo " + (p.rif || (p.data || "senza riferimento")),
      azienda_id: p.azienda_id || "",
      cliente_id: p.cliente_id || "",
      fase: p.stato === "accettato" ? "confermata" : "offerta_inviata",
      probabilita: p.stato === "accettato" ? "100" : "70",
      valore_stimato: String(Number(valore) || 0),
      descrizione: "Trattativa avviata dal preventivo " + (p.rif || "senza riferimento") + ". Verificare eventuali altre offerte relative allo stesso progetto.",
      note: "Riferimento preventivo: " + (p.rif || p.id) + ". Il collegamento è descrittivo, non una relazione permanente nel database."
    });
    setShowForm(true);
    setError("");
    onPreventivoRicevuto?.();
  }, [preventivoDaConvertire]);
  const euro=n=>(Number(n)||0).toLocaleString("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0});
  const idAzienda=a=>a.id;
  const clienteAbilitato=(c,id)=>{
    if(!id)return true;
    const assoc=c.aziende_collaborate;
    if(Array.isArray(assoc))return assoc.some(v=>String(typeof v==="object"?(v.id||v.azienda_id||v.nome):v)===id || aziende.some(a=>a.id===id&&String(typeof v==="object"?(v.nome||v.nome_azienda):v)===a.nome));
    if(typeof assoc==="string")return assoc.split(/[,;|]/).map(v=>v.trim()).some(v=>v===id||aziende.some(a=>a.id===id&&a.nome===v));
    return false;
  };
  const clientiDisponibili=clienti.filter(c=>clienteAbilitato(c,form.azienda_id));
  const visibiliBase=opportunita.filter(o=>(!aziendaFiltro||o.azienda_id===aziendaFiltro)&&((o.titolo||"")+" "+(clienti.find(c=>c.id===o.cliente_id)?.ragione_sociale||"")).toLowerCase().includes(search.toLowerCase()));
  const oggiPipeline=new Date().toLocaleDateString("sv-SE");
  const statoFollowup=o=>{
    if(["confermata","persa"].includes(o.fase)||!o.data_prossima_azione)return null;
    const giorno=String(o.data_prossima_azione).slice(0,10);
    return giorno<oggiPipeline?"scaduta":giorno===oggiPipeline?"oggi":"futura";
  };
  const senzaAzione=o=>!["confermata","persa"].includes(o.fase)&&(!o.data_prossima_azione||!String(o.prossima_azione||"").trim());
  const visibili=visibiliBase.filter(o=>filtroAzioni==="tutte"|| (filtroAzioni==="senza"?senzaAzione(o):statoFollowup(o)===filtroAzioni));
  const visibiliOrdinate=[...visibili].sort((a,b)=>{
    const da=a.data_prossima_azione?String(a.data_prossima_azione).slice(0,10):"9999-12-31";
    const db=b.data_prossima_azione?String(b.data_prossima_azione).slice(0,10):"9999-12-31";
    return da.localeCompare(db);
  });
  const aperte=visibili.filter(o=>!["confermata","persa"].includes(o.fase));
  const scadute=aperte.filter(o=>statoFollowup(o)==="scaduta").length;
  const daFareOggi=aperte.filter(o=>statoFollowup(o)==="oggi").length;
  const senzaProssimaAzione=aperte.filter(senzaAzione).length;
  const totale=aperte.reduce((n,o)=>n+Number(o.valore_stimato||0),0);
  const ponderato=aperte.reduce((n,o)=>n+Number(o.valore_stimato||0)*Number(o.probabilita||0)/100,0);
  const input={width:"100%",padding:"10px 12px",border:"1px solid #dce5f1",borderRadius:9,background:"#fff",color:"#17233b"};
  const label={fontSize:12,fontWeight:650,color:"#465570",display:"grid",gap:6};
  function apriNuova(fase="primo_contatto"){
    setEditing(null);setForm({...vuoto,fase,probabilita:String(FASI_PIPELINE.find(f=>f.id===fase)?.prob??20),azienda_id:aziendaFiltro||""});setShowForm(true);setError("");
  }
  function modifica(o){
    setEditing(o.id);setForm(Object.fromEntries(Object.keys(vuoto).map(k=>[k,o[k]??""])));setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});
  }
  async function salva(e){
    e.preventDefault();
    if(!form.titolo.trim()||!form.azienda_id){setError("Inserisci titolo e mandante.");return;}
    if(form.cliente_id&&!clientiDisponibili.some(c=>c.id===form.cliente_id)){setError("Il cliente non risulta associato alla mandante.");return;}
    setSaving(true);setError("");
    try {
      const payload={...form,titolo:form.titolo.trim(),cliente_id:form.cliente_id||null,
        valore_stimato:Number(form.valore_stimato||0),probabilita:Number(form.probabilita||0),
        data_chiusura_prevista:form.data_chiusura_prevista||null,data_prossima_azione:form.data_prossima_azione||null,
        updated_at:new Date().toISOString()};
      await request("opportunita_commerciali"+(editing?"?id=eq."+editing:""),{method:editing?"PATCH":"POST",body:JSON.stringify(payload)});
      setShowForm(false);setEditing(null);await load();
    }catch(err){setError(err.message);}finally{setSaving(false);}
  }
  function pianificaFollowup(o){
    setFollowupTarget(o);
    setFollowupForm({data:o.data_prossima_azione||"",azione:o.prossima_azione||"Richiamare il cliente",note:""});
    setError("");
  }
  async function salvaFollowup(e){
    e.preventDefault();
    if(!followupTarget||!followupForm.data||!followupForm.azione.trim())return;
    setSaving(true);setError("");
    try{
      const o=followupTarget;
      await request("opportunita_commerciali?id=eq."+o.id,{method:"PATCH",body:JSON.stringify({data_prossima_azione:followupForm.data,prossima_azione:followupForm.azione.trim(),updated_at:new Date().toISOString()})});
      const descrizione="Follow-up pipeline: "+o.titolo+" — "+followupForm.azione.trim();
      // L'agenda utilizza crm_attivita; crea un promemoria collegato all'opportunità.
      // Il riferimento univoco nelle note consente di aggiornarlo ai ricontatti successivi.
      const marker="[pipeline:"+o.id+"]";
      const tasks=await request("crm_attivita?select=id,note&user_id=eq."+session.user.id+"&limit=1000");
      const existing=(tasks||[]).find(t=>String(t.note||"").includes(marker));
      const payload={titolo:descrizione,tipo:"richiamare",scadenza:new Date(followupForm.data+"T09:00:00").toISOString(),priorita:"media",stato:"da_fare",cliente_id:o.cliente_id||null,azienda_id:o.azienda_id||null,user_id:session.user.id,note:marker+(followupForm.note?"\n"+followupForm.note:"")};
      await request("crm_attivita"+(existing?"?id=eq."+existing.id:""),{method:existing?"PATCH":"POST",body:JSON.stringify(payload)});
      setFollowupTarget(null);await load();
    }catch(err){setError("Follow-up non completato: "+err.message+". Controlla anche l'agenda prima di riprovare.");}finally{setSaving(false);}
  }
  async function cambiaFase(o,fase){
    if(o.fase===fase)return;
    try{await request("opportunita_commerciali?id=eq."+o.id,{method:"PATCH",body:JSON.stringify({fase,probabilita:FASI_PIPELINE.find(f=>f.id===fase)?.prob??o.probabilita,updated_at:new Date().toISOString()})});await load();}
    catch(e){setError(e.message);}
  }
  async function elimina(o){
    if(!window.confirm("Eliminare definitivamente la trattativa «"+o.titolo+"»?"))return;
    try{await request("opportunita_commerciali?id=eq."+o.id,{method:"DELETE"});await load();}
    catch(e){setError(e.message);}
  }
  return <div className="crm-pipeline">
    <div className="matrice-welcome"><div><h1>Pipeline commerciale</h1><p>Trattative per mandante, dal primo contatto alla conferma.</p></div><button className="crm-primary-btn" onClick={()=>apriNuova()}><Plus size={15}/> Nuova opportunità</button></div>
    {error&&<div style={{background:"#fff0f0",color:"#a52121",padding:12,borderRadius:9,marginBottom:14}}>{error}</div>}
    <div className="crm-pipeline-filters"><label style={label}>Azienda mandante<select style={input} value={aziendaFiltro} onChange={e=>setAziendaFiltro(e.target.value)}><option value="">Tutte le mandanti</option>{aziende.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></label><label style={label}>Cerca opportunità<input style={input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Titolo o cliente"/></label><label style={label}>Priorità follow-up<select style={input} value={filtroAzioni} onChange={e=>setFiltroAzioni(e.target.value)}><option value="tutte">Tutte le opportunità</option><option value="scaduta">Scaduti</option><option value="oggi">Da contattare oggi</option><option value="futura">Programmato</option><option value="senza">Senza prossima azione completa</option></select></label></div>
    <div className="crm-pipeline-stats"><div><small>Opportunità aperte</small><strong>{aperte.length}</strong></div><div><small>Valore trattative aperte</small><strong>{euro(totale)}</strong></div><div><small>Valore ponderato</small><strong>{euro(ponderato)}</strong></div><div><small>Follow-up scaduti</small><strong style={{color:scadute?"#b42318":"#17233b"}}>{scadute}</strong></div><div><small>Da contattare oggi</small><strong style={{color:daFareOggi?"#a65d0a":"#17233b"}}>{daFareOggi}</strong></div><div><small>Senza prossima azione completa</small><strong style={{color:senzaProssimaAzione?"#a65d0a":"#17233b"}}>{senzaProssimaAzione}</strong></div></div>
    {followupTarget&&<div role="dialog" aria-modal="true" aria-label="Pianifica follow-up" style={{position:"fixed",inset:0,zIndex:9999,background:"#102238aa",display:"grid",placeItems:"center",padding:16}}><form onSubmit={salvaFollowup} style={{background:"white",borderRadius:16,padding:22,width:"min(460px,100%)",display:"grid",gap:14,boxShadow:"0 16px 50px #0003"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{margin:0}}>Pianifica follow-up</h3><button type="button" onClick={()=>setFollowupTarget(null)}>Chiudi</button></div><small>{followupTarget.titolo}</small><label style={label}>Data ricontatto<input type="date" required style={input} value={followupForm.data} onChange={e=>setFollowupForm({...followupForm,data:e.target.value})}/></label><label style={label}>Prossima azione<input required style={input} value={followupForm.azione} onChange={e=>setFollowupForm({...followupForm,azione:e.target.value})}/></label><label style={label}>Note facoltative<textarea rows={3} style={input} value={followupForm.note} onChange={e=>setFollowupForm({...followupForm,note:e.target.value})}/></label><button type="submit" disabled={saving} className="crm-primary-btn">{saving?"Salvataggio...":"Salva follow-up e agenda"}</button></form></div>}
    {showForm&&<form className="crm-pipeline-form" onSubmit={salva}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3>{editing?"Modifica opportunità":"Nuova opportunità"}</h3><button type="button" className="crm-secondary-btn" onClick={()=>setShowForm(false)}>Chiudi</button></div>
      <div className="crm-pipeline-fields">
        <label style={label}>Titolo *<input required style={input} value={form.titolo} onChange={e=>setForm({...form,titolo:e.target.value})} placeholder="Es. Fornitura rubinetteria villa"/></label>
        <label style={label}>Mandante *<select required style={input} value={form.azienda_id} onChange={e=>setForm({...form,azienda_id:e.target.value,cliente_id:""})}><option value="">Seleziona mandante</option>{aziende.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></label>
        <label style={label}>Cliente associato<select style={input} value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}><option value="">Nessun cliente</option>{clientiDisponibili.map(c=><option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}</select></label>
        <label style={label}>Fase<select style={input} value={form.fase} onChange={e=>{const fase=e.target.value;setForm({...form,fase,probabilita:String(FASI_PIPELINE.find(f=>f.id===fase)?.prob??20)});}}>{FASI_PIPELINE.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
        <label style={label}>Valore stimato netto (€)<input type="number" min="0" step="0.01" style={input} value={form.valore_stimato} onChange={e=>setForm({...form,valore_stimato:e.target.value})}/></label>
        <label style={label}>Probabilità (%)<input type="number" min="0" max="100" style={input} value={form.probabilita} onChange={e=>setForm({...form,probabilita:e.target.value})}/></label>
        <label style={label}>Chiusura prevista<input type="date" style={input} value={form.data_chiusura_prevista} onChange={e=>setForm({...form,data_chiusura_prevista:e.target.value})}/></label>
        <label style={label}>Data prossima azione<input type="date" style={input} value={form.data_prossima_azione} onChange={e=>setForm({...form,data_prossima_azione:e.target.value})}/></label>
        <label style={label}>Prossima azione<input style={input} value={form.prossima_azione} onChange={e=>setForm({...form,prossima_azione:e.target.value})} placeholder="Es. Richiamare showroom"/></label>
        <label style={label}>Descrizione<input style={input} value={form.descrizione} onChange={e=>setForm({...form,descrizione:e.target.value})}/></label>
        <label style={{...label,gridColumn:"1 / -1"}}>Note<textarea rows={3} style={input} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
      </div><button className="crm-primary-btn" disabled={saving} type="submit">{saving?"Salvataggio...":"Salva opportunità"}</button></form>}
    {loading?<p className="matrice-empty">Caricamento pipeline...</p>:aziende.length===0?<p className="matrice-empty">Crea prima un'azienda mandante nella sezione Mandanti.</p>:
      <div className="crm-pipeline-board">{FASI_PIPELINE.map(f=><section className="crm-pipeline-column" key={f.id}>
        <div className="crm-pipeline-column-head" style={{borderTop:"4px solid "+f.colore}}><strong>{f.nome}</strong><span>{visibili.filter(o=>o.fase===f.id).length}</span><small>{euro(visibili.filter(o=>o.fase===f.id).reduce((n,o)=>n+Number(o.valore_stimato||0),0))}</small></div>
        {visibiliOrdinate.filter(o=>o.fase===f.id).map(o=><article className="crm-pipeline-card" key={o.id} style={{borderLeft:statoFollowup(o)==="scaduta"?"4px solid #d92d20":statoFollowup(o)==="oggi"?"4px solid #e9a23b":undefined}}>
          <strong>{o.titolo}</strong><small>{aziende.find(a=>idAzienda(a)===o.azienda_id)?.nome||"Mandante"}</small>
          <small>{clienti.find(c=>c.id===o.cliente_id)?.ragione_sociale||"Nessun cliente collegato"}</small>
          <b>{euro(o.valore_stimato)}</b>
          {o.data_prossima_azione&&<small style={{color:statoFollowup(o)==="scaduta"?"#b42318":statoFollowup(o)==="oggi"?"#a65d0a":"#52749c",fontWeight:statoFollowup(o)==="scaduta"||statoFollowup(o)==="oggi"?700:400}}>{statoFollowup(o)==="scaduta"?"● SCADUTA · ":statoFollowup(o)==="oggi"?"● OGGI · ":"Prossima azione: "}{String(o.data_prossima_azione).slice(0,10).split("-").reverse().join("/")}</small>}
          {o.prossima_azione&&<small>{o.prossima_azione}</small>}
          {senzaAzione(o)&&<small style={{color:"#a65d0a",fontWeight:700}}>● Da pianificare</small>}
          {!["confermata","persa"].includes(o.fase)&&<button type="button" onClick={()=>pianificaFollowup(o)} style={{border:"1px solid #c8d9ef",background:"#f4f8ff",color:"#2369d5",borderRadius:7,padding:"7px 9px",fontSize:11,cursor:"pointer"}}>Pianifica follow-up</button>}
          <label style={{...label,fontSize:10}}>Sposta in<select style={{...input,padding:"6px 8px",fontSize:11}} value={o.fase} onChange={e=>cambiaFase(o,e.target.value)}>{FASI_PIPELINE.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
          <div className="crm-pipeline-card-actions"><button onClick={()=>modifica(o)}>Modifica</button><button onClick={()=>elimina(o)}>Elimina</button></div>
        </article>)}
        <button className="crm-pipeline-add" onClick={()=>apriNuova(f.id)}><Plus size={13}/> Aggiungi</button>
      </section>)}</div>}
    <p style={{fontSize:11,color:"#8290a5",marginTop:15}}>La pipeline rappresenta opportunità commerciali: non aggiorna automaticamente fatturato o portafoglio ordini.</p>
    <style>{`.crm-pipeline-filters{display:flex;gap:15px;flex-wrap:wrap;margin-bottom:15px}.crm-pipeline-filters label{min-width:220px;flex:1}.crm-pipeline-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}.crm-pipeline-stats>div{background:#fff;border:1px solid #dce5f1;border-radius:12px;padding:16px}.crm-pipeline-stats small{display:block;color:#71819b;font-size:11px}.crm-pipeline-stats strong{font-size:21px;color:#17233b}.crm-pipeline-form{background:#fff;border:1px solid #dce5f1;border-radius:13px;padding:20px;margin-bottom:20px}.crm-pipeline-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:15px 0}.crm-pipeline-board{display:grid;grid-template-columns:repeat(6,minmax(205px,1fr));gap:12px;overflow-x:auto;padding-bottom:16px}.crm-pipeline-column{min-width:205px;background:#e9eef7;border-radius:12px;padding:8px;align-self:start}.crm-pipeline-column-head{background:#fff;border-radius:9px;padding:12px;display:grid;gap:4px;margin-bottom:10px}.crm-pipeline-column-head strong{font-size:12px}.crm-pipeline-column-head span{font-size:11px;color:#71819b}.crm-pipeline-column-head small{font-size:12px;font-weight:700}.crm-pipeline-card{background:#fff;border:1px solid #dce5f1;border-radius:10px;padding:12px;margin-bottom:9px;display:grid;gap:7px;box-shadow:0 3px 10px #17233b0b}.crm-pipeline-card>strong{font-size:12px}.crm-pipeline-card>small{font-size:10px;color:#71819b}.crm-pipeline-card>b{font-size:15px}.crm-pipeline-card-actions{display:flex;gap:10px}.crm-pipeline-card-actions button,.crm-pipeline-add{border:0;background:transparent;color:#2369d5;cursor:pointer;font-size:11px}.crm-pipeline-add{display:flex;gap:5px;align-items:center;padding:9px}.crm-pipeline-card-actions button:last-child{color:#ba3a3a}@media(max-width:700px){.crm-pipeline-stats{grid-template-columns:1fr}.crm-pipeline-fields{grid-template-columns:1fr}.crm-pipeline-board{grid-template-columns:repeat(6,215px)}}`}</style>
  </div>;
}


// Notifiche Web Push: funziona sulle PWA installate nella schermata Home di iPhone.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function chiaveVapidInByte(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(decoded, carattere => carattere.charCodeAt(0));
}

function chiavePushInBase64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function AttivaNotificheCRM({ session }) {
  const [stato, setStato] = useState("");
  const [occupato, setOccupato] = useState(false);
  const [attivo, setAttivo] = useState(false);
  const [mostraGestione, setMostraGestione] = useState(false);
  const [verificaTerminata, setVerificaTerminata] = useState(false);

  useEffect(() => {
    let valido = true;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then(reg => reg.pushManager?.getSubscription())
        .then(sub => { if (valido) { setAttivo(Boolean(sub) && Notification.permission === "granted"); setVerificaTerminata(true); } })
        .catch(() => { if (valido) setVerificaTerminata(true); });
    } else { setVerificaTerminata(true); }
    return () => { valido = false; };
  }, []);

  const attiva = async () => {
    setStato("");
    setOccupato(true);
    try {
      if (!VAPID_PUBLIC_KEY) throw new Error("Manca la chiave pubblica VAPID nella configurazione Vercel di sviluppo.");
      if (!session?.user?.id || !session?.access_token) throw new Error("Sessione non valida: esci e accedi nuovamente.");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
        throw new Error("Questo dispositivo non supporta le notifiche Web Push. Su iPhone apri la web app dalla schermata Home.");
      const permesso = await Notification.requestPermission();
      if (permesso !== "granted") throw new Error("Permesso notifiche non concesso. Controlla le impostazioni dell'iPhone.");
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chiaveVapidInByte(VAPID_PUBLIC_KEY)
        });
      }
      const p256dh = sub.getKey("p256dh");
      const auth = sub.getKey("auth");
      if (!p256dh || !auth) throw new Error("Il dispositivo non ha restituito le chiavi push.");
      const risposta = await crmFetch(SUPABASE_URL + "/rest/v1/push_subscriptions?on_conflict=endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + session.access_token,
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          user_id: session.user.id,
          endpoint: sub.endpoint,
          p256dh: chiavePushInBase64Url(p256dh),
          auth_key: chiavePushInBase64Url(auth),
          updated_at: new Date().toISOString()
        })
      });
      if (!risposta.ok) {
        const errore = await risposta.json().catch(() => ({}));
        throw new Error(errore.message || errore.details || "Impossibile salvare il dispositivo su Supabase.");
      }
      setAttivo(true);
      setMostraGestione(false);
      setStato("iPhone registrato correttamente. L'invio automatico dei promemoria sarà attivo dopo la configurazione del servizio di invio.");
    } catch (errore) {
      setStato("Attenzione: " + (errore.message || String(errore)));
    } finally {
      setOccupato(false);
    }
  };

  if (!verificaTerminata) return null;
  if (attivo && !mostraGestione && !stato.startsWith("Attenzione")) return (
    <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:8,marginBottom:10}}>
      <span style={{fontSize:11,color:"#648397"}}>Notifiche attive</span>
      <button type="button" onClick={()=>setMostraGestione(true)} style={{fontSize:11,border:"none",background:"transparent",color:"#196bb4",cursor:"pointer",padding:5}}>Gestisci</button>
    </div>
  );
  return (
    <div style={{ padding: "12px 14px", marginBottom: 14, background: "#fff", border: "1px solid #dce5f1", borderRadius: 12 }}>
      <div style={{ fontWeight: 700, color: "#17233b", marginBottom: 7 }}>Notifiche iPhone</div>
      <div style={{ fontSize: 12, color: "#65748b", marginBottom: 10 }}>Registra o aggiorna questo dispositivo per ricevere i promemoria degli appuntamenti.</div>
      <button type="button" onClick={attiva} disabled={occupato}
        style={{ background: "#2369d5", color: "#fff", border: 0, borderRadius: 9, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
        {occupato ? "Attivazione..." : attivo ? "Aggiorna registrazione" : "Attiva notifiche"}
      </button>
      {attivo && <button type="button" onClick={()=>{setMostraGestione(false);setStato("");}} style={{marginLeft:10,border:0,background:"none",color:"#60778d",cursor:"pointer"}}>Chiudi</button>}
      {stato && <div role="status" style={{ fontSize: 12, marginTop: 10, color: stato.startsWith("Attenzione") ? "#b33a3a" : "#176b40" }}>{stato}</div>}
    </div>
  );
}

function AttivitaCRM({ session }) {
  const vuoto = () => ({ titolo: "", tipo: "richiamare", scadenza: "", priorita: "media", stato: "da_fare", cliente_id: "", azienda_id: "", note: "" });
  const [attivita, setAttivita] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [form, setForm] = useState(vuoto);
  const [editingId, setEditingId] = useState(null);
  const [filtro, setFiltro] = useState("aperte");
  const [ricerca, setRicerca] = useState("");
  const [messaggioAttivita, setMessaggioAttivita] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usaOraAttivita, setUsaOraAttivita] = useState(false);
  const [errore, setErrore] = useState("");
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" };
  const endpoint = SUPABASE_URL + "/rest/v1/crm_attivita";
  const carica = async () => {
    setLoading(true); setErrore("");
    try {
      const [ra, rc, rm] = await Promise.all([
        crmFetch(endpoint + "?select=*&order=scadenza.asc.nullslast,created_at.desc", { headers }),
        crmFetch(SUPABASE_URL + "/rest/v1/clienti?select=id,ragione_sociale,classificazione&order=ragione_sociale.asc", { headers }),
        crmFetch(SUPABASE_URL + "/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc", { headers }),
      ]);
      if (!ra.ok) throw new Error("Impossibile leggere le attività. Verifica di aver eseguito lo script SQL della nuova sezione.");
      const [a, c, m] = await Promise.all([ra.json(), rc.ok ? rc.json() : [], rm.ok ? rm.json() : []]);
      setAttivita(Array.isArray(a) ? a : []);
      setClienti(Array.isArray(c) ? c : []);
      setAziende(Array.isArray(m) ? m : []);
    } catch (e) { setErrore(e.message || "Errore di caricamento"); }
    finally { setLoading(false); }
  };
  useEffect(() => { carica(); }, [session.access_token]);
  const reset = () => { setUsaOraAttivita(false); setForm(vuoto()); setEditingId(null); setErrore(""); };
  const salva = async e => {
    e.preventDefault(); if (!form.titolo.trim() || saving) return;
    setSaving(true); setErrore("");
    try {
      const payload = { titolo: form.titolo.trim(), tipo: form.tipo, scadenza: form.scadenza ? new Date(form.scadenza.length === 10 ? form.scadenza + "T00:00" : form.scadenza).toISOString() : null, priorita: form.priorita, stato: form.stato, cliente_id: form.cliente_id || null, azienda_id: form.azienda_id || null, note: form.note.trim(), user_id: session.user.id };
      const res = await crmFetch(endpoint + (editingId ? "?id=eq." + encodeURIComponent(editingId) : ""), { method: editingId ? "PATCH" : "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(payload) });
      if (!res.ok) { const info = await res.json().catch(() => ({})); throw new Error(info.message || "Salvataggio non riuscito"); }
      reset(); await carica();
    } catch (e) { setErrore(e.message || "Errore di salvataggio"); }
    finally { setSaving(false); }
  };
  const modifica = a => {
    const d = a.scadenza ? new Date(a.scadenza) : null;
    const locale = d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16) : "";
    setEditingId(a.id);
    setUsaOraAttivita(Boolean(locale && !locale.endsWith("T00:00")));
    setForm({ titolo: a.titolo || "", tipo: a.tipo || "richiamare", scadenza: locale && locale.endsWith("T00:00") ? locale.slice(0,10) : locale, priorita: a.priorita || "media", stato: a.stato || "da_fare", cliente_id: a.cliente_id || "", azienda_id: a.azienda_id || "", note: a.note || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const completa = async a => {
    setErrore("");
    const stato = a.stato === "completata" ? "da_fare" : "completata";
    try {
      const res = await crmFetch(endpoint + "?id=eq." + encodeURIComponent(a.id), { method: "PATCH", headers, body: JSON.stringify({ stato }) });
      if (!res.ok) throw new Error("Impossibile aggiornare lo stato");
      setAttivita(prev => prev.map(x => x.id === a.id ? { ...x, stato } : x));
      setMessaggioAttivita(stato === "completata" ? "Attività completata. Puoi recuperarla dal filtro Completate." : "Attività ripristinata tra quelle da fare.");
    } catch (e) { setErrore(e.message); }
  };
  const elimina = async a => {
    if (!window.confirm("Eliminare definitivamente questa attività?")) return;
    try {
      const res = await crmFetch(endpoint + "?id=eq." + encodeURIComponent(a.id), { method: "DELETE", headers });
      if (!res.ok) throw new Error("Impossibile eliminare l'attività");
      setAttivita(prev => prev.filter(x => x.id !== a.id));
      if (editingId === a.id) reset();
    } catch (e) { setErrore(e.message); }
  };
  const adesso = Date.now();
  const aperte = attivita.filter(a => a.stato !== "completata");
  const scadute = aperte.filter(a => a.scadenza && new Date(a.scadenza).getTime() < adesso);
  const filtrate = attivita.filter(a => {
    if (filtro === "aperte" && a.stato === "completata") return false;
    if (filtro === "completate" && a.stato !== "completata") return false;
    if (filtro === "scadute" && !(a.stato !== "completata" && a.scadenza && new Date(a.scadenza).getTime() < adesso)) return false;
    const nomeCliente = clienti.find(c => c.id === a.cliente_id)?.ragione_sociale || "";
    return (a.titolo + " " + a.note + " " + nomeCliente).toLowerCase().includes(ricerca.toLowerCase());
  });
  const campo = { width: "100%", padding: "11px 12px", border: "1px solid #dce5f0", borderRadius: 10, background: "white", color: "#18354e", fontSize: 14, boxSizing: "border-box" };
  const etichette = { richiamare: "Richiamare", preventivo: "Preventivo", architetto: "Architetto", campionatura: "Campionatura", visita: "Visita da organizzare", altro: "Altro" };
  return <div style={{ maxWidth: 1180, margin: "0 auto", color: "#18354e" }}>
    <div style={{ marginBottom: 20 }}><h2 style={{ margin: "0 0 5px", fontSize: 26 }}>Attività e follow-up</h2><p style={{ margin: 0, color: "#71839a", fontSize: 14 }}>Organizza le prossime azioni commerciali e tieni sotto controllo le scadenze.</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
      {[["Da fare", aperte.length], ["Scadute", scadute.length], ["Completate", attivita.length - aperte.length]].map(([nome, n]) => <div key={nome} style={{ background: "#fff", border: "1px solid #e3ebf3", borderRadius: 15, padding: 16 }}><div style={{ color: "#70839a", fontSize: 12 }}>{nome}</div><strong style={{ fontSize: 28 }}>{n}</strong></div>)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,350px),1fr))", gap: 18, alignItems: "start" }}>
      <form onSubmit={salva} style={{ background: "#fff", border: "1px solid #e3ebf3", borderRadius: 16, padding: 18, display: "grid", gap: 12 }}>
        <strong style={{ fontSize: 17 }}>{editingId ? "Modifica attività" : "Nuova attività"}</strong>
        <label style={{ fontSize: 12 }}>Titolo *<input required maxLength={180} value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} placeholder="Es. Richiamare showroom per preventivo" style={{ ...campo, marginTop: 5 }} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 12 }}>Tipologia<select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={{ ...campo, marginTop: 5 }}>{Object.entries(etichette).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
          <label style={{ fontSize: 12 }}>Priorità<select value={form.priorita} onChange={e => setForm(f => ({ ...f, priorita: e.target.value }))} style={{ ...campo, marginTop: 5 }}><option value="bassa">Bassa</option><option value="media">Media</option><option value="alta">Alta</option></select></label>
        </div>
        <label style={{ fontSize: 12 }}>Data (facoltativa)<input type="date" value={form.scadenza ? form.scadenza.slice(0,10) : ""} onChange={e => setForm(f => ({ ...f, scadenza: e.target.value ? e.target.value + (usaOraAttivita ? "T09:00" : "") : "" }))} style={{ ...campo, marginTop: 5 }} /></label>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#60758b"}}><input type="checkbox" checked={usaOraAttivita} onChange={e=>{setUsaOraAttivita(e.target.checked);setForm(f=>({...f,scadenza:f.scadenza?(e.target.checked?f.scadenza.slice(0,10)+"T09:00":f.scadenza.slice(0,10)):""}));}}/> Aggiungi un orario (facoltativo)</label>
        {usaOraAttivita && <label style={{fontSize:12}}>Ora<input type="time" value={form.scadenza.includes("T") ? form.scadenza.slice(11,16) : "09:00"} disabled={!form.scadenza} onChange={e=>setForm(f=>({...f,scadenza:f.scadenza.slice(0,10)+"T"+e.target.value}))} style={{...campo,marginTop:5}}/></label>}
        <label style={{ fontSize: 12 }}>Cliente o architetto<select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))} style={{ ...campo, marginTop: 5 }}><option value="">Nessun collegamento</option>{clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale}{c.classificazione === "Architetto" ? " · Architetto" : ""}</option>)}</select></label>
        <label style={{ fontSize: 12 }}>Azienda mandante<select value={form.azienda_id} onChange={e => setForm(f => ({ ...f, azienda_id: e.target.value }))} style={{ ...campo, marginTop: 5 }}><option value="">Nessuna</option>{aziende.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></label>
        <label style={{ fontSize: 12 }}>Stato<select value={form.stato} onChange={e => setForm(f => ({ ...f, stato: e.target.value }))} style={{ ...campo, marginTop: 5 }}><option value="da_fare">Da fare</option><option value="in_corso">In corso</option><option value="completata">Completata</option></select></label>
        <label style={{ fontSize: 12 }}>Note<textarea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ ...campo, marginTop: 5, resize: "vertical" }} /></label>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><button type="submit" disabled={saving} style={{ border: 0, background: "#276be3", color: "white", borderRadius: 10, padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}>{saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Aggiungi attività"}</button>{editingId && <button type="button" onClick={reset} style={{ border: "1px solid #dce5f0", background: "white", borderRadius: 10, padding: "11px 14px" }}>Annulla</button>}</div>
      </form>
      <section style={{ background: "#fff", border: "1px solid #e3ebf3", borderRadius: 16, padding: 18, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 14 }}><input aria-label="Cerca attività" placeholder="Cerca attività..." value={ricerca} onChange={e => setRicerca(e.target.value)} style={{ ...campo, flex: "1 1 160px", width: "auto" }} /><select aria-label="Filtra attività" value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...campo, width: "auto", flex: "0 1 140px" }}><option value="aperte">Aperte</option><option value="scadute">Scadute</option><option value="completate">Completate</option><option value="tutte">Tutte</option></select></div>
        {messaggioAttivita && <div role="status" style={{padding:10,borderRadius:9,background:"#edf7f2",color:"#236e4e",fontSize:12,marginBottom:10}}>{messaggioAttivita} <button type="button" onClick={()=>{setFiltro("completate");setMessaggioAttivita("");}} style={{border:0,background:"none",color:"#1764aa",cursor:"pointer",fontWeight:700}}>Mostra completate</button></div>}
        {errore && <div role="alert" style={{ color: "#a42a2a", background: "#fff0f0", borderRadius: 9, padding: 12, marginBottom: 12, fontSize: 13 }}>{errore}</div>}
        {loading ? <p>Caricamento...</p> : filtrate.length === 0 ? <p style={{ color: "#78859a", fontSize: 14 }}>Nessuna attività da mostrare.</p> : <div style={{ display: "grid", gap: 10 }}>{filtrate.map(a => {
          const scaduta = a.stato !== "completata" && a.scadenza && new Date(a.scadenza).getTime() < adesso;
          const cliente = clienti.find(c => c.id === a.cliente_id);
          return <article key={a.id} style={{ border: "1px solid #e3ebf3", borderRadius: 12, padding: 13, background: a.stato === "completata" ? "#f8fafc" : "#fff" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}><input type="checkbox" checked={a.stato === "completata"} onChange={() => completa(a)} aria-label={a.stato === "completata" ? "Ripristina attività" : "Completa attività"} style={{ width: 18, height: 18, marginTop: 2, accentColor: "#276be3" }} /><div style={{ flex: 1, minWidth: 0 }}><strong style={{ fontSize: 14, textDecoration: a.stato === "completata" ? "line-through" : "none", overflowWrap: "anywhere" }}>{a.titolo}</strong><div style={{ color: "#72849a", fontSize: 12, marginTop: 4 }}>{etichette[a.tipo] || a.tipo} · Priorità {a.priorita}{a.stato === "in_corso" ? " · In corso" : ""}</div>{cliente && <div style={{ color: "#276be3", fontSize: 12, marginTop: 4 }}>{cliente.ragione_sociale}</div>}{a.scadenza && <div style={{ color: scaduta ? "#b83b3b" : "#62778c", fontSize: 12, marginTop: 5 }}>{scaduta ? "Scaduta · " : "Scadenza · "}{new Date(a.scadenza).toLocaleString("it-IT", { dateStyle: "short", ...(new Date(a.scadenza).getHours()===0 && new Date(a.scadenza).getMinutes()===0 ? {} : {timeStyle:"short"}) })}</div>}{a.note && <div style={{ fontSize: 12, color: "#66798b", marginTop: 7, overflowWrap: "anywhere" }}>{a.note}</div>}</div></div>
            <div style={{ display: "flex", gap: 12, marginTop: 11, paddingLeft: 28 }}><button type="button" onClick={() => modifica(a)} style={{ border: 0, background: "none", color: "#276be3", cursor: "pointer", padding: 0, fontSize: 12 }}>Modifica</button>{a.stato === "completata" && <button type="button" onClick={() => completa(a)} style={{border:0,background:"#eaf4ff",color:"#155f9e",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:12,fontWeight:700}}>Ripristina</button>}<button type="button" onClick={() => elimina(a)} style={{ border: 0, background: "none", color: "#b83b3b", cursor: "pointer", padding: 0, fontSize: 12 }}>Elimina</button></div>
          </article>;
        })}</div>}
      </section>
    </div>
  </div>;
}

function PannelloAgendaCRM({ session, goTo }) {
  return <div style={{maxWidth:1000,margin:"0 auto"}}>
    <div style={{marginBottom:22}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:1.1,color:"#1870c9",textTransform:"uppercase",marginBottom:6}}>Organizzazione</div>
      <h1 style={{fontSize:"clamp(24px, 3vw, 32px)",fontWeight:750,color:"#172e45",margin:"0 0 8px"}}>Agenda e attività</h1>
      <p style={{fontSize:14,color:"#64788c",margin:0}}>Appuntamenti, telefonate e follow-up in un unico punto di accesso.</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 240px), 1fr))",gap:15}}>
      {[
        {key:"visite",titolo:"Calendario",descrizione:"Appuntamenti, visite e impegni programmati.",Icon:CalendarDays},
        {key:"attivita",titolo:"Attività e follow-up",descrizione:"Richiami, preventivi da inviare e cose da fare.",Icon:ClipboardList},
        {key:"storico_visite",titolo:"Storico visite",descrizione:"Consulta gli incontri e le visite precedenti.",Icon:ClipboardList},
      ].map(item => <button key={item.key} type="button" onClick={()=>goTo(item.key)} style={{textAlign:"left",background:"#fff",border:"1px solid #dce7f1",borderRadius:18,padding:22,cursor:"pointer",boxShadow:"0 5px 20px #173b5c0b",display:"flex",flexDirection:"column",gap:13,minHeight:172}}>
        <span style={{width:43,height:43,borderRadius:13,background:"#eaf3ff",color:"#0969c7",display:"grid",placeItems:"center"}}><item.Icon size={22}/></span>
        <span style={{fontSize:17,fontWeight:750,color:"#172e45"}}>{item.titolo}</span>
        <span style={{fontSize:13,lineHeight:1.5,color:"#60778d"}}>{item.descrizione}</span>
        <span style={{fontSize:12,color:"#0869ce",fontWeight:700,marginTop:"auto"}}>Apri →</span>
      </button>)}
    </div>
  </div>;
}

function StileNavigazionePremiumCRM() { return <style>{`
  .matrice-nav-group{margin:3px 9px 5px!important}
  .matrice-nav-group-title{border-radius:11px!important;min-height:42px!important;font-weight:700!important;letter-spacing:.05px!important}
  .matrice-subnav{padding:3px 0 7px 9px!important}
  .matrice-subnav button{border-radius:10px!important;min-height:39px!important;margin:2px 0!important;gap:10px!important}
  .matrice-subnav button.active{font-weight:750!important}
  .matrice-topbar-label{font-weight:750!important;letter-spacing:-.2px!important}
  @media(max-width:768px){
    .matrice-nav-group{margin:4px 8px 7px!important}
    .matrice-subnav button{min-height:46px!important}
    .matrice-nav-group-title{min-height:48px!important}
  }
`}</style>; }

function StileModuliPremiumCRM() { return <style>{`
  .crm-anagrafiche-premium .crm-form-section-heading{font-size:12px;font-weight:800;color:#1d6097;letter-spacing:.35px;margin:21px 0 13px;padding-bottom:9px;border-bottom:1px solid #e5edf5}
  .crm-anagrafiche-premium .crm-form-label{font-size:12px;font-weight:650;color:#526b82;display:block;margin:0 0 6px}
  .crm-anagrafiche-premium input:focus,.crm-anagrafiche-premium select:focus,.crm-anagrafiche-premium textarea:focus{outline:2px solid #b5d7f7;outline-offset:1px}
  @media(max-width:768px){.crm-anagrafiche-premium>div{gap:14px!important}.crm-anagrafiche-premium>div>div:first-child{max-width:none!important;flex-basis:100%!important}}
`}</style>; }


// Centro operativo: letture in sola consultazione, nessuna nuova tabella o policy richiesta.
function CentroOperativoCRM({ session, goTo }) {
  const [dati, setDati] = useState({ aziende: [], clienti: [], opportunita: [], attivita: [], fatturato: [] });
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");
  const [avvisi, setAvvisi] = useState([]);
  const [filtroMandante, setFiltroMandante] = useState("");
  const [soloUrgenti, setSoloUrgenti] = useState(false);
  const carica = async () => {
    setCaricamento(true); setErrore("");
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token };
    const percorsi = {
      aziende: "aziende_mandanti?select=id,nome,colore&order=nome.asc",
      clienti: "clienti?select=id,ragione_sociale",
      opportunita: "opportunita_commerciali?select=*",
      attivita: "crm_attivita?select=*",
      fatturato: "fatturato_commerciale?select=azienda_id,anno,importo"
    };
    const esito = await Promise.all(Object.entries(percorsi).map(async ([nome, percorso]) => {
      try {
        const r = await crmFetch(SUPABASE_URL + "/rest/v1/" + percorso, { headers });
        const payload = await r.json().catch(() => null);
        if (!r.ok || !Array.isArray(payload)) throw new Error(payload?.message || "Lettura non autorizzata");
        return { nome, payload };
      } catch (e) { return { nome, payload: [], errore: e.message }; }
    }));
    const prossimo = {}; const errori = [];
    esito.forEach(x => { prossimo[x.nome] = x.payload; if (x.errore) errori.push(x.nome + ": " + x.errore); });
    setDati(prossimo); setAvvisi(errori); setCaricamento(false);
  };
  useEffect(() => { carica(); }, [session.access_token]);
  const oggi = new Date().toLocaleDateString("sv-SE");
  const anno = new Date().getFullYear();
  const mandanti = dati.aziende || [];
  const opportunita = (dati.opportunita || []).filter(o => !filtroMandante || o.azienda_id === filtroMandante);
  const aperte = opportunita.filter(o => !["confermata", "persa"].includes(o.fase));
  const azioni = (dati.attivita || []).filter(a => a.stato !== "completata" && (!filtroMandante || a.azienda_id === filtroMandante));
  const giorno = v => v ? String(v).slice(0, 10) : "";
  const urgenti = azioni.filter(a => giorno(a.scadenza) && giorno(a.scadenza) <= oggi);
  const senzaAzione = aperte.filter(o => !o.data_prossima_azione || !String(o.prossima_azione || "").trim());
  const scadute = aperte.filter(o => giorno(o.data_prossima_azione) && giorno(o.data_prossima_azione) < oggi);
  const valore = aperte.reduce((t, o) => t + (Number(o.valore_stimato) || 0), 0);
  const ponderato = aperte.reduce((t, o) => t + (Number(o.valore_stimato) || 0) * (Number(o.probabilita) || 0) / 100, 0);
  const fatturato = (dati.fatturato || []).filter(f => Number(f.anno) === anno && (!filtroMandante || f.azienda_id === filtroMandante)).reduce((t,f) => t + (Number(f.importo) || 0), 0);
  const nomeCliente = id => dati.clienti.find(c => c.id === id)?.ragione_sociale || "Cliente non indicato";
  const nomeMandante = id => mandanti.find(a => a.id === id)?.nome || "Senza mandante";
  const elenco = [
    ...aperte.filter(o => !soloUrgenti || senzaAzione.includes(o) || scadute.includes(o)).map(o => ({
      id: "o" + o.id, tipo: "opportunita", titolo: o.titolo || "Opportunità", cliente: nomeCliente(o.cliente_id), mandante: nomeMandante(o.azienda_id),
      data: giorno(o.data_prossima_azione), stato: senzaAzione.includes(o) ? "Da pianificare" : giorno(o.data_prossima_azione) && giorno(o.data_prossima_azione) < oggi ? "Scaduta" : giorno(o.data_prossima_azione) === oggi ? "Oggi" : "Programmata", pagina: "pipeline"
    })),
    ...azioni.filter(a => !soloUrgenti || urgenti.includes(a)).map(a => ({
      id: "a" + a.id, tipo: "attivita", titolo: a.titolo || "Attività", cliente: nomeCliente(a.cliente_id), mandante: nomeMandante(a.azienda_id),
      data: giorno(a.scadenza), stato: !a.scadenza ? "Da pianificare" : giorno(a.scadenza) < oggi ? "Scaduta" : giorno(a.scadenza) === oggi ? "Oggi" : "Programmata", pagina: "attivita"
    }))
  ].sort((a,b) => (a.data || "9999-12-31").localeCompare(b.data || "9999-12-31"));
  const riquadro = { background: "#fff", border: "1px solid #e4eaf3", borderRadius: 16, padding: 18, minWidth: 0 };
  return <div style={{ display: "grid", gap: 18, maxWidth: 1200, margin: "0 auto" }}>
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div><h1 style={{ margin: 0, fontSize: 26, color: "#17233b" }}>Centro operativo</h1><p style={{ color: "#78859a", margin: "6px 0 0" }}>Trattative, attività e risultati commerciali in un unico punto</p></div>
      <button onClick={carica} disabled={caricamento} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #d7e1ef", background: "white", cursor: "pointer" }}>{caricamento ? "Caricamento…" : "Aggiorna dati"}</button>
    </div>
    {avvisi.length > 0 && <div role="alert" style={{ ...riquadro, borderColor: "#e9bf74", color: "#825a14" }}>Alcuni dati non sono disponibili: {avvisi.join(" · ")}. I totali relativi potrebbero essere incompleti.</div>}
    {errore && <p role="alert">{errore}</p>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#58677e" }}>Mandante
        <select value={filtroMandante} onChange={e => setFiltroMandante(e.target.value)} style={{ padding: "10px 12px", border: "1px solid #dce5f1", borderRadius: 9, minWidth: 210, background: "white" }}>
          <option value="">Tutti i mandanti</option>{mandanti.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center", alignSelf: "end", paddingBottom: 10, color: "#40516a" }}><input type="checkbox" checked={soloUrgenti} onChange={e => setSoloUrgenti(e.target.checked)}/> Solo elementi da gestire</label>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
      {[
        ["Trattative aperte", aperte.length, "pipeline"],
        ["Valore trattative", formattaEuro(valore), "pipeline"],
        ["Valore ponderato", formattaEuro(ponderato), "pipeline"],
        ["Follow-up scaduti", scadute.length, "pipeline"],
        ["Senza prossima azione", senzaAzione.length, "pipeline"],
        ["Attività urgenti", urgenti.length, "attivita"],
        ["Fatturato registrato " + anno, formattaEuro(fatturato), "controllo"]
      ].map(([titolo, numero, pagina]) => <button key={titolo} onClick={() => goTo(pagina)} style={{ ...riquadro, textAlign: "left", cursor: "pointer", color: "#17233b" }}><div style={{ color: "#78859a", fontSize: 12, marginBottom: 8 }}>{titolo}</div><strong style={{ fontSize: 23 }}>{numero}</strong></button>)}
    </div>
    <div style={riquadro}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12 }}><h2 style={{ margin: 0, fontSize: 18 }}>Lista operativa</h2><span style={{ fontSize: 12, color: "#78859a" }}>{elenco.length} elementi</span></div>
      {caricamento ? <p>Caricamento dati…</p> : elenco.length === 0 ? <p style={{ color: "#78859a" }}>Nessun elemento per i filtri selezionati.</p> : <div style={{ display: "grid", gap: 8 }}>
        {elenco.slice(0, 80).map(item => <button key={item.id} onClick={() => goTo(item.pagina)} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", textAlign: "left", gap: 8, padding: 13, background: "#f9fbff", border: "1px solid #e7edf6", borderRadius: 10, cursor: "pointer" }}>
          <span style={{ display: "grid", gap: 3, minWidth: 180, flex: 1 }}><strong style={{ color: "#17233b" }}>{item.titolo}</strong><span style={{ fontSize: 12, color: "#748299" }}>{item.cliente} · {item.mandante} · {item.tipo === "attivita" ? "Attività" : "Opportunità"}</span></span>
          <span style={{ fontSize: 12, color: ["Scaduta", "Da pianificare"].includes(item.stato) ? "#b44335" : "#446b9b" }}>{item.stato}{item.data ? " · " + item.data.split("-").reverse().join("/") : ""}</span>
        </button>)}
      </div>}
      {elenco.length > 80 && <p style={{ color: "#78859a", fontSize: 12 }}>Mostrati i primi 80 elementi. Usa le sezioni dedicate per l'elenco completo.</p>}
    </div>
    <p style={{ color: "#78859a", fontSize: 12 }}>Il fatturato deriva dai valori registrati in Controllo Commerciale. Le trattative sono stime e non vengono sommate al fatturato.</p>
  </div>;
}


function RicercaGlobaleCRM({session, chiudi, naviga}) {
  const [query,setQuery]=useState("");
  const [risultati,setRisultati]=useState([]);
  const [errore,setErrore]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let alive=true;
    const fonti=[
      ["clienti?select=id,ragione_sociale,classificazione", "Cliente", "clienti", x=>x.ragione_sociale],
      ["aziende_mandanti?select=id,nome", "Mandante", "aziende", x=>x.nome],
      ["opportunita_commerciali?select=*", "Opportunità", "pipeline", x=>x.titolo||x.nome||x.descrizione||"Opportunità"],
      ["preventivi?select=id,rif,cliente_manuale", "Preventivo", "preventivi", x=>x.rif||x.cliente_manuale||"Preventivo"],
      ["note_crm?select=id,titolo,contenuto", "Nota", "note", x=>x.titolo],
    ];
    Promise.all(fonti.map(async ([path,tipo,pagina,label])=>{
      const r=await crmFetch(SUPABASE_URL+"/rest/v1/"+path,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+session.access_token}});
      if(!r.ok)throw Error(tipo+": accesso non disponibile");
      const data=await r.json();return (Array.isArray(data)?data:[]).map(x=>({id:x.id,tipo,pagina,nome:String(label(x)||""),dettaglio:tipo==="Cliente"?x.classificazione||"":""}));
    })).then(parts=>{if(alive){setRisultati(parts.flat());setLoading(false);}}).catch(e=>{if(alive){setErrore(e.message);setLoading(false);}});
    return ()=>{alive=false};
  },[session.access_token]);
  const normalizza=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const matches=risultati.filter(x=>normalizza(x.nome+" "+x.tipo+" "+x.dettaglio).includes(normalizza(query))).slice(0,45);
  return <div className="crm-modal-backdrop" onClick={chiudi}><section className="crm-global-panel" role="dialog" aria-modal="true" aria-label="Ricerca globale" onClick={e=>e.stopPropagation()}><div className="crm-global-head"><Search size={20}/><input autoFocus placeholder="Cerca clienti, architetti, mandanti, preventivi..." value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={chiudi} aria-label="Chiudi ricerca">×</button></div><div className="crm-global-results">{loading?<p>Caricamento dati...</p>:errore?<p style={{color:"#b42318"}}>{errore}</p>:matches.length===0?<p>Nessun risultato.</p>:matches.map(x=><button key={x.tipo+x.id} onClick={()=>{naviga(x.tipo==="Cliente"&&x.dettaglio==="Architetto"?"architetti":x.pagina);chiudi();}}><span><strong>{x.nome}</strong><small>{x.dettaglio}</small></span><em>{x.tipo}</em></button>)}</div><small className="crm-global-hint">Seleziona un risultato per aprire la relativa sezione.</small></section></div>;
}
function ClientiDaRiattivareCRM({session,naviga}) {
  const [giorni,setGiorni]=useState(30);
  const [clienti,setClienti]=useState([]);
  const [visite,setVisite]=useState([]);
  const [contatti,setContatti]=useState([]);
  const [promemoria,setPromemoria]=useState([]);
  const [errore,setErrore]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let alive=true;
    const headers={apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+session.access_token};
    Promise.all(["clienti?select=id,ragione_sociale,classificazione", "visite?select=cliente_id,data_visita", "attivita_cliente?select=cliente_id,data,tipo,descrizione", "crm_attivita?select=cliente_id,scadenza,stato"].map(async path=>{
      const r=await crmFetch(SUPABASE_URL+"/rest/v1/"+path,{headers});const d=await r.json();if(!r.ok)throw Error(d.message||"Impossibile caricare i contatti");return d;
    })).then(([c,v,a,p])=>{if(alive){setClienti(c);setVisite(v);setContatti(a);setPromemoria(p);setLoading(false);}}).catch(e=>{if(alive){setErrore(e.message);setLoading(false);}});
    return ()=>{alive=false};
  },[session.access_token]);
  const now=Date.now();
  const contattiReali=contatti.filter(a=>/^(visita|telefonata|chiamata|incontro|contatto|email|mail|whatsapp)$/i.test(String(a.tipo||"").trim()));
  const elenco=clienti.filter(c=>c.classificazione!=="Architetto").map(c=>{
    const date=[...visite.filter(v=>v.cliente_id===c.id).map(v=>v.data_visita),...contattiReali.filter(a=>a.cliente_id===c.id).map(a=>a.data)].filter(Boolean).map(x=>new Date(x).getTime()).filter(t=>Number.isFinite(t)&&t<=now);
    const ultima=date.length?Math.max(...date):null;
    const pianificato=promemoria.some(p=>p.cliente_id===c.id&&p.stato!=="completata"&&p.scadenza&&new Date(p.scadenza).getTime()>=now);
    return {...c,ultima,trascorsi:ultima?Math.floor((now-ultima)/86400000):null,pianificato};
  }).filter(c=>c.trascorsi===null||c.trascorsi>=giorni).sort((a,b)=>(b.trascorsi??999999)-(a.trascorsi??999999));
  return <section className="crm-reactivation"><div className="matrice-section-head"><h3><Clock3 size={17}/> Clienti da riattivare</h3><button onClick={()=>naviga("clienti")}>Apri clienti</button></div><div className="crm-reactivation-filters">{[30,60,90].map(n=><button key={n} className={giorni===n?"active":""} onClick={()=>setGiorni(n)}>{n} giorni</button>)}</div>{loading?<p>Caricamento...</p>:errore?<p style={{color:"#b42318"}}>{errore}</p>:<><p className="crm-reactivation-sub">{elenco.length} clienti senza contatti registrati negli ultimi {giorni} giorni. Le anagrafiche senza storico sono indicate separatamente.</p>{elenco.slice(0,8).map(c=><div className="crm-reactivation-row" key={c.id}><span><strong>{c.ragione_sociale}</strong><small>{c.trascorsi===null?"Nessun contatto registrato":"Ultimo contatto "+new Date(c.ultima).toLocaleDateString("it-IT")+" · "+c.trascorsi+" giorni fa"}{c.pianificato?" · Contatto già pianificato":""}</small></span><button onClick={()=>naviga("clienti")}>Apri</button></div>)}{elenco.length>8&&<small>Mostrati i primi 8 clienti. Puoi cambiare soglia con i filtri.</small>}{elenco.length===0&&<p>Nessun cliente da riattivare per questa soglia.</p>}</>}</section>;
}
function AzioniRapideCRM({session,chiudi,naviga}) {
  const [azione,setAzione]=useState("");
  const [titolo,setTitolo]=useState("");
  const [note,setNote]=useState("");
  const [data,setData]=useState("");
  const [clienteId,setClienteId]=useState("");
  const [tipoContatto,setTipoContatto]=useState("visita");
  const [mandantiIds,setMandantiIds]=useState([]);
  const [prossimoContatto,setProssimoContatto]=useState(false);
  const [prossimaData,setProssimaData]=useState("");
  const [prossimaNota,setProssimaNota]=useState("");
  const [clienti,setClienti]=useState([]);
  const [mandanti,setMandanti]=useState([]);
  const [busy,setBusy]=useState(false);
  const [errore,setErrore]=useState("");
  const headers={apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"};
  useEffect(()=>{
    let mounted=true;
    Promise.all([
      crmFetch(SUPABASE_URL+"/rest/v1/clienti?select=id,ragione_sociale,classificazione&order=ragione_sociale.asc",{headers}).then(async r=>{if(!r.ok)throw Error("Clienti non disponibili");return r.json()}),
      crmFetch(SUPABASE_URL+"/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc",{headers}).then(async r=>{if(!r.ok)throw Error("Mandanti non disponibili");return r.json()})
    ]).then(([c,m])=>{if(mounted){setClienti(Array.isArray(c)?c:[]);setMandanti(Array.isArray(m)?m:[])}}).catch(e=>{if(mounted)setErrore(e.message)});
    return ()=>{mounted=false};
  },[session.access_token]);
  const links=[{key:"contatto",label:"Registra contatto",icon:Users},{key:"visite",label:"Appuntamento",icon:CalendarDays},{key:"attivita",label:"Attività / follow-up",icon:CheckSquare},{key:"note",label:"Nota",icon:StickyNote},{key:"clienti",label:"Cliente",icon:Users},{key:"pipeline",label:"Opportunità",icon:Target}];
  const salva=async e=>{
    e.preventDefault();if(busy)return;
    if(azione==="contatto"&&!clienteId){setErrore("Seleziona un cliente o architetto.");return;}
    if(azione!=="contatto"&&!titolo.trim())return;
    if(azione==="contatto"&&prossimoContatto&&!prossimaData){setErrore("Indica la data del prossimo contatto oppure disattiva il promemoria.");return;}
    setBusy(true);setErrore("");
    try{
      const inserisci=async (tabella,payload)=>{
        const r=await crmFetch(SUPABASE_URL+"/rest/v1/"+tabella,{method:"POST",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify(payload)});
        if(!r.ok){const x=await r.json().catch(()=>({}));throw Error(x.message||"Errore nel salvataggio su "+tabella)};
      };
      if(azione==="contatto"){
        const nomi=mandanti.filter(m=>mandantiIds.includes(String(m.id))).map(m=>m.nome);
        const dettagli=[note.trim(),nomi.length?"Mandanti trattati: "+nomi.join(", "):""].filter(Boolean).join("\n");
        // Compatibilità con il database esistente: la selezione multipla è descrittiva,
        // non una relazione strutturata. La tabella di associazione verrà creata nella fase SQL.
        await inserisci("attivita_cliente",{cliente_id:clienteId,tipo:tipoContatto,descrizione:dettagli||"Contatto effettuato"});
        if(prossimoContatto){
          try{
            await inserisci("crm_attivita",{titolo:"Ricontattare "+(clienti.find(c=>String(c.id)===String(clienteId))?.ragione_sociale||"cliente"),tipo:"richiamare",scadenza:new Date(prossimaData+"T09:00").toISOString(),priorita:"media",stato:"da_fare",cliente_id:clienteId,azienda_id:mandantiIds.length===1?mandantiIds[0]:null,note:[prossimaNota.trim(),nomi.length?"Mandanti: "+nomi.join(", "):""].filter(Boolean).join("\n"),user_id:session.user.id});
          }catch(err){setErrore("Contatto registrato, ma promemoria non creato: "+err.message);return;}
        }
        chiudi();naviga("clienti");return;
      }
      const isTask=azione==="attivita";
      const payload=isTask?{titolo:titolo.trim(),tipo:"richiamare",scadenza:data?new Date(data+"T00:00").toISOString():null,priorita:"media",stato:"da_fare",note,user_id:session.user.id}:{titolo:titolo.trim(),contenuto:note,updated_at:new Date().toISOString()};
      await inserisci(isTask?"crm_attivita":"note_crm",payload);
      chiudi();naviga(isTask?"attivita":"note");
    }catch(e){setErrore(e.message||"Errore di salvataggio")}finally{setBusy(false)}
  };
  return <div className="crm-modal-backdrop" onClick={chiudi}><section className="crm-quick-panel" role="dialog" aria-modal="true" aria-label="Aggiungi rapidamente" onClick={e=>e.stopPropagation()}>
    <div className="crm-quick-heading"><strong>Nuova operazione</strong><button onClick={chiudi} aria-label="Chiudi">×</button></div>
    {!azione?<div className="crm-quick-grid">{links.map(l=><button key={l.key} onClick={()=>{if(["note","attivita","contatto"].includes(l.key))setAzione(l.key);else{chiudi();naviga(l.key)}}}><l.icon size={20}/>{l.label}</button>)}</div>:
    <form onSubmit={salva}>
      <h3>{azione==="contatto"?"Registra contatto effettuato":azione==="note"?"Nuova nota":"Nuova attività"}</h3>
      {azione==="contatto"?<>
        <label>Cliente o architetto *<select required value={clienteId} onChange={e=>setClienteId(e.target.value)}><option value="">Seleziona...</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.ragione_sociale}{c.classificazione==="Architetto"?" · Architetto":""}</option>)}</select></label>
        <label>Tipo di contatto<select value={tipoContatto} onChange={e=>setTipoContatto(e.target.value)}>{[["visita","Visita"],["telefonata","Telefonata"],["whatsapp","WhatsApp"],["email","Email"],["incontro","Incontro"],["altro","Altro"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <fieldset style={{border:"1px solid #d9e4f2",borderRadius:10,padding:10}}><legend style={{fontSize:13}}>Mandanti trattati (facoltativi, selezione multipla)</legend><div style={{display:"flex",flexWrap:"wrap",gap:9}}>{mandanti.map(m=><label key={m.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><input type="checkbox" style={{width:"auto"}} checked={mandantiIds.includes(String(m.id))} onChange={e=>setMandantiIds(old=>e.target.checked?[...old,String(m.id)]:old.filter(x=>x!==String(m.id)))}/>{m.nome}</label>)}</div></fieldset>
        <textarea placeholder="Note sul contatto (facoltative)" value={note} onChange={e=>setNote(e.target.value)}/>
        <label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" style={{width:"auto"}} checked={prossimoContatto} onChange={e=>setProssimoContatto(e.target.checked)}/> Programmare il prossimo contatto?</label>
        {prossimoContatto&&<><label>Data prossimo contatto *<input type="date" required min={new Date().toLocaleDateString("en-CA")} value={prossimaData} onChange={e=>setProssimaData(e.target.value)}/></label><input placeholder="Cosa fare al prossimo contatto?" value={prossimaNota} onChange={e=>setProssimaNota(e.target.value)}/></>}
        <small style={{color:"#71849a"}}>Il contatto viene salvato nello storico esistente. I mandanti multipli sono indicati nelle note fino all'aggiornamento del database.</small>
      </>:<><input required placeholder="Titolo" value={titolo} onChange={e=>setTitolo(e.target.value)}/>{azione==="attivita"&&<label>Scadenza (facoltativa)<input type="date" value={data} onChange={e=>setData(e.target.value)}/></label>}<textarea placeholder="Dettagli (facoltativi)" value={note} onChange={e=>setNote(e.target.value)}/></>}
      {errore&&<p role="alert" style={{color:"#b42318"}}>{errore}</p>}
      <div className="crm-quick-actions"><button type="button" onClick={()=>{setAzione("");setErrore("")}}>Indietro</button><button disabled={busy} type="submit">{busy?"Salvataggio...":"Salva"}</button></div>
    </form>}
  </section></div>;
}
function StileCRMv12(){return <style>{`
.crm-modal-backdrop{position:fixed;inset:0;z-index:2500;background:#1425408a;display:flex;justify-content:center;align-items:flex-start;padding:10vh 15px 20px}
.crm-global-panel,.crm-quick-panel{width:min(580px,100%);max-height:80vh;overflow:auto;background:white;border:1px solid #c8d7ec;border-radius:18px;box-shadow:0 18px 55px #10284640;padding:16px;color:#1d3351}
.crm-global-head{display:flex;align-items:center;gap:10px}.crm-global-head input{flex:1;min-width:0;padding:12px;border:1px solid #d9e4f2;border-radius:10px}.crm-global-head button,.crm-quick-heading button{background:transparent;border:0;font-size:26px;color:#62738a;cursor:pointer}
.crm-global-results{max-height:50vh;overflow:auto;margin-top:13px}.crm-global-results>button{display:flex;justify-content:space-between;gap:10px;width:100%;text-align:left;background:white;border:0;border-bottom:1px solid #e9eef6;padding:12px;cursor:pointer}.crm-global-results>button:hover{background:#f2f7ff}.crm-global-results strong,.crm-global-results small,.crm-reactivation-row strong,.crm-reactivation-row small{display:block}.crm-global-results small,.crm-reactivation-row small,.crm-global-hint{font-size:11px;color:#71849a}.crm-global-results em{font-style:normal;font-size:11px;color:#286bd4}
.crm-quick-heading{display:flex;justify-content:space-between;align-items:center;font-size:18px}.crm-quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}.crm-quick-grid button{background:#f5f9ff;border:1px solid #d9e6f6;border-radius:12px;padding:16px 8px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#255fbb;font-weight:650;cursor:pointer}.crm-quick-panel form{display:flex;flex-direction:column;gap:12px}.crm-quick-panel input,.crm-quick-panel select,.crm-quick-panel textarea{width:100%;box-sizing:border-box;border:1px solid #d9e4f2;border-radius:10px;padding:12px;font-size:16px}.crm-quick-panel textarea{min-height:100px}.crm-quick-actions{display:flex;justify-content:flex-end;gap:10px}.crm-quick-actions button{border:1px solid #cbd9ec;border-radius:9px;padding:10px 15px;background:#fff}.crm-quick-actions button[type=submit]{background:#2e74e8;color:white;border-color:#2e74e8}
.crm-reactivation{background:white;border:1px solid #cbd7e8;box-shadow:0 6px 18px #1c355b17;border-radius:16px;padding:17px;margin:16px 0}.crm-reactivation .matrice-section-head h3{display:flex;align-items:center;gap:8px}.crm-reactivation-filters{display:flex;gap:8px;margin:10px 0}.crm-reactivation-filters button{padding:8px 13px;border:1px solid #d4e0f0;background:#f7faff;border-radius:9px;color:#45607f}.crm-reactivation-filters button.active{background:#2d70dc;color:white}.crm-reactivation-sub{font-size:12px;color:#71849a}.crm-reactivation-row{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #edf1f7;padding:11px 0}.crm-reactivation-row button{background:#eaf2ff;border:0;border-radius:8px;padding:8px 11px;color:#2769d2}
.crm-mobile-fab{display:none}
@media(max-width:768px){.crm-mobile-fab{display:flex;position:fixed;right:16px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:1100;width:54px;height:54px;align-items:center;justify-content:center;border:0;border-radius:17px;background:#2c73e9;color:white;box-shadow:0 7px 22px #174da96b}.crm-modal-backdrop{padding-top:7vh}.crm-quick-panel,.crm-global-panel{max-height:83vh}.crm-reactivation{padding:13px}}
`}</style>}

// Fase F: registro persistente, isolato dalle funzioni demo esistenti.
function RegistroCommercialeSupabase({session}) {
  const [tab,setTab]=useState('relazioni');
  const [agenzia,setAgenzia]=useState('');
  const [clienti,setClienti]=useState([]);
  const [mandanti,setMandanti]=useState([]);
  const [preventivi,setPreventivi]=useState([]);
  const [records,setRecords]=useState([]);
  const [errore,setErrore]=useState('');
  const [messaggio,setMessaggio]=useState('');
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({cliente_id:'',azienda_id:'',stato:'potenziale',preventivo_id:'',scadenza:'',descrizione:'',quantita:'1',tipo:'campione',note:''});
  const tabelle={relazioni:'crm_relazioni_mandanti',followup:'crm_followup_preventivi',campioni:'crm_campionature'};
  const headers=()=>({apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'});
  const richiesta=async (path,method='GET',payload)=>{
    const response=await crmFetch(SUPABASE_URL+'/rest/v1/'+path,{method,headers:{...headers(),...(method!=='GET'?{Prefer:'return=representation'}:{})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
    const raw=await response.text();let data;try{data=raw?JSON.parse(raw):[]}catch{data=raw}
    if(!response.ok)throw new Error((data&&data.message)||('Errore '+response.status));
    return data;
  };
  const carica=async (sezione=tab)=>{
    setErrore('');
    try{
      const [a,c,m,p]=await Promise.all([
        richiesta('crm_agenzie?select=id,nome&proprietario_id=eq.'+encodeURIComponent(session.user.id)),
        richiesta('clienti?select=id,ragione_sociale&order=ragione_sociale.asc'),
        richiesta('aziende_mandanti?select=id,nome&order=nome.asc'),
        richiesta('preventivi?select=id,rif,data,cliente_id&order=data.desc')
      ]);
      if(!a.length)throw new Error('Nessuna agenzia associata al tuo account.');
      setAgenzia(a[0].id);setClienti(c);setMandanti(m);setPreventivi(p);
      const r=await richiesta(tabelle[sezione]+'?select=*&agenzia_id=eq.'+a[0].id+'&order=created_at.desc');setRecords(r);
    }catch(e){setErrore(e.message)}
  };
  useEffect(()=>{carica(tab)},[tab,session.access_token]);
  const salva=async()=>{
    if(!agenzia)return;
    setBusy(true);setErrore('');setMessaggio('');
    try{
      let dati={agenzia_id:agenzia};
      if(tab==='relazioni'){
        if(!form.cliente_id||!form.azienda_id)throw new Error('Seleziona cliente e mandante.');
        dati={...dati,cliente_id:form.cliente_id,azienda_id:form.azienda_id,stato:form.stato,note:form.note||null};
      }else if(tab==='followup'){
        if(!form.preventivo_id||!form.scadenza)throw new Error('Seleziona preventivo e scadenza.');
        dati={...dati,preventivo_id:form.preventivo_id,scadenza:new Date(form.scadenza+'T12:00:00').toISOString(),stato:'da_fare',note:form.note||null};
      }else{
        if(!form.cliente_id||!form.descrizione.trim())throw new Error('Seleziona cliente e descrizione.');
        dati={...dati,cliente_id:form.cliente_id,azienda_id:form.azienda_id||null,descrizione:form.descrizione.trim(),tipo:form.tipo,quantita:Number(form.quantita),stato:'da_consegnare',note:form.note||null};
        if(!(dati.quantita>0))throw new Error('Quantità non valida.');
      }
      const esistente=tab==='followup'?records.find(r=>r.preventivo_id===form.preventivo_id&&r.stato==='da_fare'):null;
      const creati=esistente
        ? await richiesta('crm_followup_preventivi?id=eq.'+esistente.id,'PATCH',dati)
        : await richiesta(tabelle[tab],'POST',dati);
      if(tab==='followup'&&(creati?.[0]?.id||esistente?.id)){
        const f=creati?.[0]||esistente,p=preventivi.find(x=>x.id===form.preventivo_id);
        try{
          const taskEsistenti=await richiesta('crm_attivita?select=id,note&user_id=eq.'+session.user.id);
          const task=taskEsistenti.find(t=>String(t.note||'').includes('[preventivo-followup:'+f.id+']'));
          await richiesta('crm_attivita'+(task?'?id=eq.'+task.id:''),task?'PATCH':'POST',{agenzia_id:agenzia,user_id:session.user.id,titolo:'Follow-up preventivo '+(p?.rif||f.id.slice(0,8)),tipo:'richiamare',scadenza:dati.scadenza,priorita:'media',stato:'da_fare',cliente_id:p?.cliente_id||null,note:'[preventivo-followup:'+f.id+']'+(form.note?'\n'+form.note:'')});
        }catch(e){setErrore('Follow-up salvato, ma promemoria agenda non creato: '+e.message)}
      }
      setMessaggio('Salvato su Supabase.');setForm({cliente_id:'',azienda_id:'',stato:'potenziale',preventivo_id:'',scadenza:'',descrizione:'',quantita:'1',tipo:'campione',note:''});
      await carica(tab);
    }catch(e){setErrore(e.message)}finally{setBusy(false)}
  };
  const aggiorna=async (r,changes)=>{setBusy(true);setErrore('');try{await richiesta(tabelle[tab]+'?id=eq.'+r.id+'&agenzia_id=eq.'+agenzia,'PATCH',changes);await carica(tab)}catch(e){setErrore(e.message)}finally{setBusy(false)}};
  const nomi=(items,id,key)=>items.find(x=>x.id===id)?.[key]||'—';
  const inp={padding:10,border:'1px solid #cbd5cf',borderRadius:8,minWidth:0,width:'100%',background:'white'};
  const btn={padding:'10px 14px',background:'#344a43',color:'white',border:0,borderRadius:8,cursor:'pointer'};
  const campo=(titolo,elemento)=><label style={{display:'grid',gap:5,fontSize:13,color:'#46564e'}}>{titolo}{elemento}</label>;
  const sel=(key,items,placeholder)=> <select style={inp} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}><option value=''>{placeholder}</option>{items.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>;
  return <section style={{padding:20,background:'white',border:'1px solid #dce4de',borderRadius:16,maxWidth:1050,margin:'0 auto'}}>
    <h2 style={{marginTop:0}}>Registri commerciali · Supabase</h2>
    <p style={{fontSize:13,color:'#586b60'}}>Queste tre sezioni salvano dati reali. Le altre funzioni del Laboratorio restano dimostrative finché non saranno integrate.</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:18}}>{[['relazioni','Mandanti per cliente'],['followup','Follow-up preventivi']].map(([k,n])=><button key={k} style={{...btn,background:tab===k?'#344a43':'#e8eeea',color:tab===k?'white':'#344a43'}} onClick={()=>{setTab(k);setMessaggio('')}}>{n}</button>)}</div>
    {errore&&<p role='alert' style={{color:'#a12a22'}}>{errore}</p>}{messaggio&&<p style={{color:'#197044'}}>{messaggio}</p>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:14}}>
      {tab==='relazioni'&&<>{campo('Cliente',sel('cliente_id',clienti.map(x=>({id:x.id,label:x.ragione_sociale})),'Seleziona cliente'))}{campo('Mandante',sel('azienda_id',mandanti.map(x=>({id:x.id,label:x.nome})),'Seleziona mandante'))}{campo('Stato',<select style={inp} value={form.stato} onChange={e=>setForm(f=>({...f,stato:e.target.value}))}>{['potenziale','in_trattativa','attivo','non_interessato'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select>)}</>}
      {tab==='followup'&&<>{campo('Preventivo',sel('preventivo_id',preventivi.map(x=>({id:x.id,label:(x.rif||x.id.slice(0,8))+' · '+nomi(clienti,x.cliente_id,'ragione_sociale')})),'Seleziona preventivo'))}{campo('Data prossimo contatto',<input type='date' style={inp} value={form.scadenza} onChange={e=>setForm(f=>({...f,scadenza:e.target.value}))}/>)}</>}
      {tab==='campioni'&&<>{campo('Cliente',sel('cliente_id',clienti.map(x=>({id:x.id,label:x.ragione_sociale})),'Seleziona cliente'))}{campo('Mandante facoltativo',sel('azienda_id',mandanti.map(x=>({id:x.id,label:x.nome})),'Nessun mandante'))}{campo('Descrizione',<input style={inp} value={form.descrizione} onChange={e=>setForm(f=>({...f,descrizione:e.target.value}))}/>)}{campo('Quantità',<input type='number' min='0.01' step='any' style={inp} value={form.quantita} onChange={e=>setForm(f=>({...f,quantita:e.target.value}))}/>)}{campo('Tipo',<select style={inp} value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}><option value='campione'>Campione</option><option value='esposizione'>Esposizione</option></select>)}</>}
      {campo('Note',<input style={inp} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>)}
    </div>
    <button disabled={busy||!agenzia} style={{...btn,opacity:busy?0.6:1}} onClick={salva}>{busy?'Attendere...':'Salva su Supabase'}</button>
    <h3 style={{marginTop:24}}>Registrazioni salvate ({records.length})</h3>
    {records.length===0&&<p style={{color:'#68776e'}}>Nessun elemento presente.</p>}
    {records.map(r=><div key={r.id} style={{display:'flex',gap:12,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',borderTop:'1px solid #e5ebe6',padding:'12px 0'}}>
      <div><strong>{tab==='followup'?'Preventivo '+(preventivi.find(x=>x.id===r.preventivo_id)?.rif||r.preventivo_id?.slice(0,8)):nomi(clienti,r.cliente_id,'ragione_sociale')}</strong><div style={{fontSize:13,color:'#596a60'}}>{tab==='relazioni'?nomi(mandanti,r.azienda_id,'nome'):tab==='campioni'?r.descrizione+' · '+r.quantita+' pz':new Date(r.scadenza).toLocaleDateString('it-IT')}</div>{r.note&&<div style={{fontSize:12}}>{r.note}</div>}</div>
      <select disabled={busy} style={{...inp,width:'auto'}} value={r.stato} onChange={e=>aggiorna(r,{stato:e.target.value})}>{(tab==='relazioni'?['potenziale','in_trattativa','attivo','non_interessato']:tab==='followup'?['da_fare','completato','annullato']:['da_consegnare','consegnato','in_esposizione','da_recuperare','recuperato']).map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select>
    </div>)}
  </section>;
}



// Fase unica: pannello operativo persistente, dati reali Supabase.
function CRMOperativitaUnificata({session}) {
  const [tab,setTab]=useState('campionature');
  const [agenzia,setAgenzia]=useState('');
  const [clienti,setClienti]=useState([]),[mandanti,setMandanti]=useState([]);
  const [campioni,setCampioni]=useState([]),[visite,setVisite]=useState([]),[followup,setFollowup]=useState([]),[tasks,setTasks]=useState([]);
  const [errore,setErrore]=useState(''),[messaggio,setMessaggio]=useState(''),[busy,setBusy]=useState(false);
  const [visita,setVisita]=useState({cliente_id:'',azienda_id:'',titolo:'Visita commerciale',data:'',ora:'09:00',luogo:'',note:''});
  const [fileRighe,setFileRighe]=useState([]),[colonne,setColonne]=useState([]),[mappa,setMappa]=useState({nome:'',email:'',telefono:'',indirizzo:'',classificazione:''});
  const [selezione,setSelezione]=useState([]),[esitoImport,setEsitoImport]=useState(null);
  const [ricerca,setRicerca]=useState('');
  const h=()=>({apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'});
  const api=async(path,method='GET',payload)=>{
    const res=await crmFetch(SUPABASE_URL+'/rest/v1/'+path,{method,headers:{...h(),...(method!=='GET'?{Prefer:'return=representation'}:{})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
    const raw=await res.text();let data;try{data=raw?JSON.parse(raw):[]}catch{data=raw}
    if(!res.ok)throw Error(data?.message||('Errore HTTP '+res.status));return data;
  };
  const carica=async()=>{
    try {
      const [a,c,m,p,v,f,t]=await Promise.all([
        api('crm_agenzie?select=id&proprietario_id=eq.'+session.user.id),
        api('clienti?select=id,ragione_sociale,email,telefono,indirizzo,agenzia_id&order=ragione_sociale.asc'),
        api('aziende_mandanti?select=id,nome&order=nome.asc'),
        api('preventivi?select=id,rif,data,cliente_id,azienda_id,tipo_proposta,approvazione_proposta,righe&tipo_proposta=in.(campionatura,esposizione)&order=data.desc'),
        api('appuntamenti?select=id,titolo,inizio,stato,cliente_id,azienda_id,luogo,note&tipo=eq.visita&order=inizio.asc'),
        api('crm_followup_preventivi?select=*&order=scadenza.asc'),
        api('crm_attivita?select=id,note,scadenza,stato,titolo&user_id=eq.'+session.user.id)
      ]);
      setAgenzia(a[0]?.id||'');setClienti(c);setMandanti(m);setCampioni(p);setVisite(v);setFollowup(f);setTasks(t);setErrore('');
    } catch(e){setErrore(e.message)}
  };
  useEffect(()=>{carica()},[session.access_token]);
  const nome=(id)=>clienti.find(c=>c.id===id)?.ragione_sociale||'Cliente non associato';
  const azienda=(id)=>mandanti.find(m=>m.id===id)?.nome||'—';
  const inp={width:'100%',boxSizing:'border-box',padding:'10px 11px',border:'1px solid #cbd8d0',borderRadius:9,background:'white',fontSize:13};
  const btn={background:'#344a43',color:'white',padding:'10px 15px',border:0,borderRadius:9,cursor:'pointer'};
  const field=(title,child)=><label style={{display:'grid',gap:5,fontSize:12,color:'#40544a'}}>{title}{child}</label>;
  const cambiaCampione=async(p,stato)=>{
    setBusy(true);setErrore('');try{await api('preventivi?id=eq.'+p.id,'PATCH',{approvazione_proposta:stato});await carica();setMessaggio('Stato campionatura aggiornato.')}catch(e){setErrore(e.message)}finally{setBusy(false)}
  };
  const salvaVisita=async()=>{
    setBusy(true);setErrore('');setMessaggio('');try{
      if(!agenzia||!visita.cliente_id||!visita.data)throw Error('Seleziona cliente e data.');
      const start=new Date(visita.data+'T'+visita.ora+':00');if(Number.isNaN(start.getTime()))throw Error('Data e ora non valide.');
      const end=new Date(start.getTime()+60*60*1000);
      await api('appuntamenti','POST',{agenzia_id:agenzia,user_id:session.user.id,titolo:visita.titolo||'Visita commerciale',tipo:'visita',inizio:start.toISOString(),fine:end.toISOString(),stato:'programmato',cliente_id:visita.cliente_id,azienda_id:visita.azienda_id||null,luogo:visita.luogo||null,note:visita.note||null});
      setVisita({cliente_id:'',azienda_id:'',titolo:'Visita commerciale',data:'',ora:'09:00',luogo:'',note:''});await carica();setMessaggio('Visita salvata nell’agenda Supabase.');
    }catch(e){setErrore(e.message)}finally{setBusy(false)}
  };
  const normalizza=x=>String(x??'').trim().toLocaleLowerCase('it').replace(/\s+/g,' ');
  const importaFile=async(file)=>{
    setErrore('');setEsitoImport(null);if(!file)return;
    try{
      const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:'array'});const sheet=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false}).slice(0,1000);
      if(!rows.length)throw Error('Nessuna riga da importare.');
      const keys=Object.keys(rows[0]);setFileRighe(rows);setColonne(keys);setSelezione(rows.map((_,i)=>i));
      const find=(names)=>keys.find(k=>names.some(n=>normalizza(k).includes(n)))||'';
      setMappa({nome:find(['ragione sociale','cliente','nominativo','studio','nome']),email:find(['email','e-mail']),telefono:find(['telefono','cellulare','phone']),indirizzo:find(['indirizzo','address','comune']),classificazione:find(['classificazione','tipologia','categoria'])});
    }catch(e){setErrore('File non leggibile: '+e.message)}
  };
  const anteprima=fileRighe.map((r,i)=>({i,nome:String(r[mappa.nome]||'').trim(),email:String(r[mappa.email]||'').trim(),telefono:String(r[mappa.telefono]||'').trim(),indirizzo:String(r[mappa.indirizzo]||'').trim(),classificazione:String(r[mappa.classificazione]||'').trim()}));
  const esistenti=new Set(clienti.map(c=>normalizza(c.ragione_sociale)));
  const selezionati=new Set(selezione);
  const visti=new Set();
  const valutati=anteprima.map(r=>{const key=normalizza(r.nome);const duplicato=!!key&&(esistenti.has(key)||visti.has(key));if(key)visti.add(key);return {...r,duplicato,pronto:!!key&&!duplicato&&selezionati.has(r.i)}});
  const pronti=valutati.filter(r=>r.pronto);
  const salvaImport=async()=>{
    if(!agenzia||!pronti.length)return;
    if(!window.confirm('Importare '+pronti.length+' nuove anagrafiche in Supabase? Le righe duplicate verranno escluse.'))return;
    setBusy(true);setErrore('');setMessaggio('');let ok=0;let failed=[];
    for(const r of pronti){
      try{await api('clienti','POST',{agenzia_id:agenzia,ragione_sociale:r.nome,email:r.email||null,telefono:r.telefono||null,indirizzo:r.indirizzo||null,classificazione:r.classificazione||null});ok++}
      catch(e){failed.push(r.nome+': '+e.message)}
    }
    setEsitoImport({ok,failed});setBusy(false);await carica();
    if(ok)setMessaggio(ok+' clienti importati.');if(failed.length)setErrore(failed.length+' righe non importate: '+failed.slice(0,3).join(' | '));
    setSelezione([]);
  };
  const completaFollowup=async(f)=>{
    setBusy(true);setErrore('');try{
      await api('crm_followup_preventivi?id=eq.'+f.id,'PATCH',{stato:'completato'});
      const marker='[preventivo-followup:'+f.id+']';
      const t=tasks.find(x=>String(x.note||'').includes(marker));
      if(t)await api('crm_attivita?id=eq.'+t.id,'PATCH',{stato:'completata'});
      await carica();setMessaggio('Follow-up completato.');
    }catch(e){setErrore(e.message)}finally{setBusy(false)}
  };
  return <section style={{background:'#fff',border:'1px solid #dce6de',borderRadius:16,padding:20,margin:'16px auto',maxWidth:1100}}>
    <h2 style={{margin:'0 0 5px'}}>Centro operativo · Supabase</h2>
    <p style={{color:'#65756b',fontSize:13}}>Campionature dai preventivi, visite in agenda, follow-up e importazione anagrafiche con anteprima.</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:16}}>{[['campionature','Campionature'],['followup','Follow-up preventivi'],['visite','Pianifica visite'],['import','Importa Excel / CSV']].map(([k,label])=><button key={k} onClick={()=>{setTab(k);setMessaggio('')}} style={{...btn,background:tab===k?'#344a43':'#edf3ee',color:tab===k?'white':'#344a43'}}>{label}</button>)}</div>
    {errore&&<p role='alert' style={{color:'#a32722',whiteSpace:'pre-wrap'}}>{errore}</p>}{messaggio&&<p style={{color:'#187044'}}>{messaggio}</p>}
    {tab==='campionature'&&<><p style={{fontSize:13}}>Le campionature sono preventivi con tipologia «Campionatura». Non serve creare una seconda scheda. L'approvazione è modificabile qui o nei preventivi.</p><input style={{...inp,maxWidth:330}} placeholder='Cerca cliente o riferimento...' value={ricerca} onChange={e=>setRicerca(e.target.value)}/>{campioni.filter(p=>normalizza(nome(p.cliente_id)+' '+(p.rif||'')).includes(normalizza(ricerca))).map(p=><div key={p.id} style={{borderBottom:'1px solid #e2e9e4',padding:'13px 0',display:'flex',gap:12,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}><div><strong>{nome(p.cliente_id)}</strong><div style={{fontSize:12,color:'#65756b'}}>{p.rif||'Senza riferimento'} · {azienda(p.azienda_id)} · {p.data||'—'} · {Array.isArray(p.righe)?p.righe.length:0} righe</div></div><select aria-label='Approvazione campionatura' disabled={busy} style={{...inp,width:195}} value={p.approvazione_proposta||'in_attesa'} onChange={e=>cambiaCampione(p,e.target.value)}><option value='in_attesa'>In attesa</option><option value='approvata'>Approvata</option><option value='non_approvata'>Non approvata</option></select></div>)}{!campioni.length&&<p>Nessuna campionatura. Creane una nella sezione Preventivi.</p>}</>}
    {tab==='followup'&&<>{followup.map(f=><div key={f.id} style={{borderBottom:'1px solid #e2e9e4',padding:'12px 0',display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><strong>{new Date(f.scadenza).toLocaleDateString('it-IT')}</strong> · {f.stato}<div style={{fontSize:12,color:'#65756b'}}>{f.note||'Follow-up preventivo'} · {f.preventivo_id?.slice(0,8)}</div></div>{f.stato==='da_fare'&&<button style={btn} disabled={busy} onClick={()=>completaFollowup(f)}>Segna completato</button>}</div>)}{!followup.length&&<p>Nessun follow-up preventivo registrato.</p>}</>}
    {tab==='visite'&&<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,marginBottom:12}}>
      {field('Cliente *',<select style={inp} value={visita.cliente_id} onChange={e=>setVisita(v=>({...v,cliente_id:e.target.value}))}><option value=''>Seleziona...</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}</select>)}
      {field('Mandante',<select style={inp} value={visita.azienda_id} onChange={e=>setVisita(v=>({...v,azienda_id:e.target.value}))}><option value=''>Nessuno</option>{mandanti.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select>)}
      {field('Data *',<input type='date' style={inp} value={visita.data} onChange={e=>setVisita(v=>({...v,data:e.target.value}))}/>)}
      {field('Ora',<input type='time' style={inp} value={visita.ora} onChange={e=>setVisita(v=>({...v,ora:e.target.value}))}/>)}
      {field('Titolo',<input style={inp} value={visita.titolo} onChange={e=>setVisita(v=>({...v,titolo:e.target.value}))}/>)}
      {field('Luogo',<input style={inp} value={visita.luogo} onChange={e=>setVisita(v=>({...v,luogo:e.target.value}))}/>)}
      {field('Note',<input style={inp} value={visita.note} onChange={e=>setVisita(v=>({...v,note:e.target.value}))}/>)}
      </div><button disabled={busy} style={btn} onClick={salvaVisita}>Salva visita in agenda</button><h3>Visite programmate</h3>{visite.map(v=><div key={v.id} style={{borderBottom:'1px solid #e2e9e4',padding:9,fontSize:13}}><strong>{new Date(v.inizio).toLocaleString('it-IT')}</strong> · {nome(v.cliente_id)} · {v.titolo} · {v.stato}</div>)}{!visite.length&&<p>Nessuna visita programmata.</p>}</>}
    {tab==='import'&&<><p style={{fontSize:13}}>Carica un file, associa le colonne e controlla l'anteprima. Il CRM esclude i nomi già presenti e i duplicati nel file. Nessun salvataggio finché non confermi.</p><input type='file' accept='.xlsx,.xls,.csv' onChange={e=>importaFile(e.target.files?.[0])}/>{fileRighe.length>0&&<><p><strong>{fileRighe.length}</strong> righe lette · <strong>{pronti.length}</strong> nuove anagrafiche selezionate · <strong>{valutati.filter(r=>r.duplicato).length}</strong> duplicati per ragione sociale</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:9}}>{[['nome','Ragione sociale *'],['email','Email'],['telefono','Telefono'],['indirizzo','Indirizzo / Comune'],['classificazione','Classificazione']].map(([k,label])=>field(label,<select style={inp} value={mappa[k]} onChange={e=>setMappa(old=>({...old,[k]:e.target.value}))}><option value=''>Non importare</option>{colonne.map(c=><option key={c} value={c}>{c}</option>)}</select>))}</div><div style={{overflowX:'auto',maxHeight:350,marginTop:15}}><table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr>{['Includi','Nome','Email','Telefono','Esito'].map(k=><th key={k} style={{textAlign:'left',padding:8,background:'#eef3ef'}}>{k}</th>)}</tr></thead><tbody>{valutati.slice(0,100).map(r=><tr key={r.i} style={{borderBottom:'1px solid #e3e9e4'}}><td style={{padding:7}}><input type='checkbox' disabled={r.duplicato||!r.nome} checked={selezionati.has(r.i)&&!r.duplicato} onChange={e=>setSelezione(a=>e.target.checked?[...a,r.i]:a.filter(i=>i!==r.i))}/></td><td>{r.nome}</td><td>{r.email}</td><td>{r.telefono}</td><td>{r.duplicato?'Duplicato':!r.nome?'Nome mancante':'Nuovo'}</td></tr>)}</tbody></table></div><p style={{fontSize:12,color:'#64716b'}}>Anteprima: prime 100 righe. Il controllo duplicati confronta il nome normalizzato, non partita IVA o altri identificativi; controlla attentamente prima di importare.</p><button style={btn} disabled={busy||!mappa.nome||!pronti.length} onClick={salvaImport}>{busy?'Importazione...':'Importa '+pronti.length+' clienti in Supabase'}</button>{esitoImport&&<p>{esitoImport.ok} importati; {esitoImport.failed.length} errori.</p>}</>}</>}
  </section>;
}

// Nella scheda cliente mostra automaticamente i preventivi marcati Campionatura.
function CampionatureSchedaCliente({preventivi}) {
  const campioni=(preventivi||[]).filter(p=>['campionatura','esposizione'].includes(p.tipo_proposta));
  return <section style={{background:'#fff',border:'1px solid #dce6de',borderRadius:13,padding:16,margin:'16px 0'}}><h3 style={{margin:'0 0 10px'}}>Campionature ({campioni.length})</h3>{!campioni.length&&<p style={{fontSize:13,color:'#64716b'}}>Nessuna campionatura associata. Crea un preventivo di tipo Campionatura.</p>}{campioni.map(p=><div key={p.id} style={{padding:'9px 0',borderBottom:'1px solid #e8eee9',fontSize:13}}><strong>{p.rif||'Preventivo senza riferimento'}</strong> · {p.data||'—'} · {p.approvazione_proposta==='approvata'?'Approvata':p.approvazione_proposta==='non_approvata'?'Non approvata':'In attesa'} · {Array.isArray(p.righe)?p.righe.length:0} articoli</div>)}</section>;
}

// Fase I: provvigioni e liquidazioni persistenti, separate dal simulatore demo.
function RegistroProvvigioniSupabase({session}) {
  const [agenzia,setAgenzia]=useState('');
  const [clienti,setClienti]=useState([]),[mandanti,setMandanti]=useState([]);
  const [ordini,setOrdini]=useState([]),[confermati,setConfermati]=useState([]);
  const [provvigioni,setProvvigioni]=useState([]),[liquidazioni,setLiquidazioni]=useState([]);
  const [form,setForm]=useState({cliente_id:'',azienda_id:'',origine:'manuale',ordine_id:'',imponibile:'',modalita:'percentuale',percentuale:'',importo_manuale:'',data_ordine:'',note:''});
  const [pagamenti,setPagamenti]=useState({});
  const [busy,setBusy]=useState(false),[errore,setErrore]=useState(''),[successo,setSuccesso]=useState('');
  const headers=()=>({apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'});
  const api=async (path,method='GET',payload)=>{
    const r=await crmFetch(SUPABASE_URL+'/rest/v1/'+path,{method,headers:{...headers(),...(method!=='GET'?{Prefer:'return=representation'}:{})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
    const raw=await r.text();let x;try{x=raw?JSON.parse(raw):[]}catch{x=raw}
    if(!r.ok)throw Error(x?.message||('Errore Supabase '+r.status));return x;
  };
  const carica=async()=>{
    try {
      const [a,c,m,o,oc]=await Promise.all([
        api('crm_agenzie?select=id&proprietario_id=eq.'+encodeURIComponent(session.user.id)),
        api('clienti?select=id,ragione_sociale&order=ragione_sociale.asc'),
        api('aziende_mandanti?select=id,nome&order=nome.asc'),
        api('ordini?select=id,cliente_id,azienda_id,numero_ordine,importo_totale,data_ordine&order=created_at.desc'),
        api('ordini_confermati?select=id,cliente_id,azienda_id,importo,data_ordine&order=created_at.desc')
      ]);
      if(!a.length)throw Error('Agenzia non trovata.');
      const id=a[0].id;setAgenzia(id);setClienti(c);setMandanti(m);setOrdini(o);setConfermati(oc);
      const [p,l]=await Promise.all([api('crm_provvigioni_ordini?select=*&agenzia_id=eq.'+id+'&order=created_at.desc'),api('crm_liquidazioni_provvigioni?select=*&agenzia_id=eq.'+id+'&order=created_at.desc')]);
      setProvvigioni(p);setLiquidazioni(l);setErrore('');
    }catch(e){setErrore(e.message)}
  };
  useEffect(()=>{carica()},[session.access_token]);
  const eur=n=>Number(n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
  const nome=(arr,id,key)=>arr.find(x=>x.id===id)?.[key]||'—';
  const inputStyle={width:'100%',padding:10,border:'1px solid #d2ddd5',borderRadius:9,background:'#fff',boxSizing:'border-box'};
  const buttonStyle={padding:'10px 15px',background:'#344a43',color:'#fff',border:0,borderRadius:9,cursor:'pointer'};
  const label=(name,child)=><label style={{display:'grid',gap:5,fontSize:13,color:'#344a43'}}>{name}{child}</label>;
  const scegliOrdine=(origine,id)=>{
    const o=(origine==='ordini'?ordini:confermati).find(x=>x.id===id);
    setForm(f=>({...f,origine,ordine_id:id,cliente_id:o?.cliente_id||f.cliente_id,azienda_id:o?.azienda_id||f.azienda_id,imponibile:o?String(origine==='ordini'?o.importo_totale:o.importo):f.imponibile,data_ordine:o?.data_ordine||f.data_ordine}));
  };
  const calcola=()=>form.modalita==='manuale'?Number(form.importo_manuale):Number(form.imponibile)*Number(form.percentuale)/100;
  const salva=async()=>{
    setErrore('');setSuccesso('');setBusy(true);
    try{
      const imponibile=Number(form.imponibile),maturato=calcola();
      if(!form.cliente_id||!form.azienda_id)throw Error('Seleziona cliente e mandante.');
      if(form.imponibile===''||!Number.isFinite(imponibile)||imponibile<0)throw Error('Inserisci un imponibile valido.');
      if(form.modalita==='percentuale'&&(form.percentuale===''||!Number.isFinite(Number(form.percentuale))||Number(form.percentuale)<0||Number(form.percentuale)>100))throw Error('Percentuale non valida (0–100).');
      if(form.modalita==='manuale'&&(form.importo_manuale===''||!Number.isFinite(maturato)||maturato<0))throw Error('Importo manuale non valido.');
      if(form.origine!=='manuale'&&!form.ordine_id)throw Error('Seleziona un ordine.');
      const payload={agenzia_id:agenzia,cliente_id:form.cliente_id,azienda_id:form.azienda_id,ordine_id:form.origine==='ordini'?form.ordine_id:null,ordine_confermato_id:form.origine==='confermati'?form.ordine_id:null,data_ordine:form.data_ordine||null,imponibile,percentuale:form.modalita==='percentuale'?Number(form.percentuale):null,importo_manuale:form.modalita==='manuale'?maturato:null,importo_maturato:Math.round((maturato+Number.EPSILON)*100)/100,stato:'da_liquidare',note:form.note||null};
      await api('crm_provvigioni_ordini','POST',payload);
      setSuccesso('Provvigione salvata su Supabase.');setForm({cliente_id:'',azienda_id:'',origine:'manuale',ordine_id:'',imponibile:'',modalita:'percentuale',percentuale:'',importo_manuale:'',data_ordine:'',note:''});await carica();
    }catch(e){setErrore(e.message)}finally{setBusy(false)}
  };
  const liquida=async p=>{
    setErrore('');setSuccesso('');setBusy(true);
    try{
      const importo=Number(pagamenti[p.id]);const gia=liquidazioni.filter(l=>l.provvigione_id===p.id).reduce((a,l)=>a+Number(l.importo),0);
      const residuo=Math.round((Number(p.importo_maturato)-gia)*100)/100;
      if(!Number.isFinite(importo)||importo<=0||importo>residuo+0.001)throw Error('Importo non valido o superiore al residuo.');
      await api('crm_liquidazioni_provvigioni','POST',{agenzia_id:agenzia,provvigione_id:p.id,importo,data_liquidazione:new Date().toISOString().slice(0,10)});
      // Lo stato riepilogativo viene aggiornato solo dopo la liquidazione.
      const nuovoResiduo=Math.round((residuo-importo)*100)/100;
      try{await api('crm_provvigioni_ordini?id=eq.'+p.id+'&agenzia_id=eq.'+agenzia,'PATCH',{stato:nuovoResiduo<=0?'liquidata':'parziale'});}catch(e){setErrore('Liquidazione registrata, ma stato non aggiornato: '+e.message)}
      setPagamenti(v=>({...v,[p.id]:''}));setSuccesso('Liquidazione registrata.');await carica();
    }catch(e){setErrore(e.message)}finally{setBusy(false)}
  };
  const totale=provvigioni.reduce((a,p)=>a+Number(p.importo_maturato),0);
  const pagato=liquidazioni.reduce((a,l)=>a+Number(l.importo),0);
  return <section style={{margin:'20px auto',maxWidth:1050,padding:20,background:'#fff',border:'1px solid #dce4de',borderRadius:16}}>
    <h2 style={{marginTop:0}}>Provvigioni · Supabase</h2>
    <p style={{fontSize:13,color:'#617067'}}>Registra una provvigione per ordine o manualmente. La percentuale è indipendente dallo sconto del cliente. Le liquidazioni sono registrate separatamente.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:18}}>{[['Maturato',totale],['Liquidato',pagato],['Da liquidare',totale-pagato]].map(([k,v])=><div key={k} style={{background:'#f2f6f3',padding:13,borderRadius:10}}><small>{k}</small><div style={{fontSize:20,fontWeight:750}}>{eur(v)}</div></div>)}</div>
    {errore&&<p role='alert' style={{color:'#a12a22'}}>{errore}</p>}{successo&&<p style={{color:'#197044'}}>{successo}</p>}
    <h3>Nuova provvigione</h3>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}>
      {label('Origine',<select style={inputStyle} value={form.origine} onChange={e=>setForm(f=>({...f,origine:e.target.value,ordine_id:''}))}><option value='manuale'>Registrazione manuale</option><option value='ordini'>Ordine</option><option value='confermati'>Ordine confermato</option></select>)}
      {form.origine!=='manuale'&&label('Ordine',<select style={inputStyle} value={form.ordine_id} onChange={e=>scegliOrdine(form.origine,e.target.value)}><option value=''>Seleziona...</option>{(form.origine==='ordini'?ordini:confermati).map(o=><option key={o.id} value={o.id}>{o.numero_ordine||o.id.slice(0,8)} · {eur(form.origine==='ordini'?o.importo_totale:o.importo)}</option>)}</select>)}
      {label('Cliente',<select style={inputStyle} value={form.cliente_id} onChange={e=>setForm(f=>({...f,cliente_id:e.target.value}))}><option value=''>Seleziona...</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}</select>)}
      {label('Mandante',<select style={inputStyle} value={form.azienda_id} onChange={e=>setForm(f=>({...f,azienda_id:e.target.value}))}><option value=''>Seleziona...</option>{mandanti.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select>)}
      {label('Data ordine',<input style={inputStyle} type='date' value={form.data_ordine} onChange={e=>setForm(f=>({...f,data_ordine:e.target.value}))}/>)}
      {label('Imponibile netto (€)',<input style={inputStyle} type='number' min='0' step='0.01' value={form.imponibile} onChange={e=>setForm(f=>({...f,imponibile:e.target.value}))}/>)}
      {label('Tipo provvigione',<select style={inputStyle} value={form.modalita} onChange={e=>setForm(f=>({...f,modalita:e.target.value}))}><option value='percentuale'>Percentuale</option><option value='manuale'>Importo manuale</option></select>)}
      {form.modalita==='percentuale'?label('Percentuale (%)',<input style={inputStyle} type='number' min='0' max='100' step='0.01' value={form.percentuale} onChange={e=>setForm(f=>({...f,percentuale:e.target.value}))}/>):label('Importo provvigione (€)',<input style={inputStyle} type='number' min='0' step='0.01' value={form.importo_manuale} onChange={e=>setForm(f=>({...f,importo_manuale:e.target.value}))}/>)}
      {label('Note',<input style={inputStyle} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>)}
    </div>
    <p style={{fontWeight:700}}>Provvigione prevista: {Number.isFinite(calcola())?eur(calcola()):'—'}</p>
    <button style={buttonStyle} disabled={busy||!agenzia} onClick={salva}>{busy?'Attendere...':'Salva provvigione'}</button>
    <h3 style={{marginTop:25}}>Provvigioni registrate ({provvigioni.length})</h3>
    {!provvigioni.length&&<p style={{color:'#617067'}}>Nessuna provvigione ancora registrata.</p>}
    {provvigioni.map(p=>{const liquidato=liquidazioni.filter(l=>l.provvigione_id===p.id).reduce((a,l)=>a+Number(l.importo),0);const residuo=Math.max(0,Math.round((Number(p.importo_maturato)-liquidato)*100)/100);return <div key={p.id} style={{padding:'14px 0',borderTop:'1px solid #e2e9e3'}}>
      <strong>{nome(clienti,p.cliente_id,'ragione_sociale')}</strong> · {nome(mandanti,p.azienda_id,'nome')}
      <div style={{fontSize:13,color:'#617067'}}>Imponibile {eur(p.imponibile)} · {p.percentuale!==null?p.percentuale+'%':'Importo manuale'} · Maturato {eur(p.importo_maturato)} · Liquidato {eur(liquidato)} · <strong>Residuo {eur(residuo)}</strong></div>
      {p.note&&<div style={{fontSize:12}}>{p.note}</div>}
      {residuo>0&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:8,flexWrap:'wrap'}}><input aria-label='Importo da liquidare' placeholder='Importo liquidato €' type='number' min='0.01' max={residuo} step='0.01' style={{...inputStyle,maxWidth:175}} value={pagamenti[p.id]||''} onChange={e=>setPagamenti(v=>({...v,[p.id]:e.target.value}))}/><button disabled={busy} style={buttonStyle} onClick={()=>liquida(p)}>Registra liquidazione</button></div>}
    </div>})}
  </section>;
}

// Laboratorio Fase 2: prototipo isolato, nessuna scrittura su Supabase.
function LaboratorioCommercialeCRM() {
  const [tab, setTab] = useState("mandanti");
  const [cliente, setCliente] = useState("Showroom dimostrativo");
  const [marchi, setMarchi] = useState({"QuadroDesign":"Gia cliente","CP Parquet":"In trattativa","Galassia":"Da proporre"});
  const [followup, setFollowup] = useState([{id:1,cliente:"Studio architettura (esempio)",oggetto:"Offerta rubinetteria",stato:"Inviato",data:"",nota:""}]);
  const [campioni, setCampioni] = useState([{id:1,cliente:"Showroom dimostrativo",mandante:"CP Parquet",descrizione:"Pannello rovere - esempio",quantita:1,stato:"Consegnato"}]);
  const [nuovo, setNuovo] = useState({cliente:"",mandante:"",descrizione:"",quantita:1,stato:"Da consegnare"});
  const [nomeMarchio, setNomeMarchio] = useState("");
  // Fase 4: pianificazione visite e importazione Excel, solo in memoria.
  const [visiteDemo,setVisiteDemo] = useState([]);
  const [visitaDemo,setVisitaDemo] = useState({cliente:"",comune:"",indirizzo:"",data:"",ora:"",priorita:"Media",nota:""});
  const [filtroVisite,setFiltroVisite] = useState("");
  const [excelDemo,setExcelDemo] = useState({nome:"",righe:[],colonne:[],errore:""});
  const [mappaColonne,setMappaColonne] = useState({nome:"",email:"",telefono:"",comune:""});
  const [righeSelezionate,setRigheSelezionate] = useState([]);
  const leggiExcelDemo = async (file) => {
    if(!file)return;
    if(!/\.(xlsx|xls|csv)$/i.test(file.name)){setExcelDemo({nome:file.name,righe:[],colonne:[],errore:"Formato non supportato: scegli .xlsx, .xls o .csv"});return;}
    try {
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:"array",raw:false});
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:"",raw:false}).slice(0,500);
      const cols=Array.from(new Set(rows.flatMap(r=>Object.keys(r))));
      const trova=(parole)=>cols.find(c=>parole.some(x=>c.toLowerCase().includes(x)))||"";
      setExcelDemo({nome:file.name,righe:rows,colonne:cols,errore:""});
      setMappaColonne({nome:trova(["ragione sociale","cliente","studio","nominativo","nome"]),email:trova(["email","e-mail"]),telefono:trova(["telefono","cellulare","cell"]),comune:trova(["comune","città","citta","località"])});
      setRigheSelezionate(rows.map((_,i)=>i));
    } catch(e){setExcelDemo({nome:file.name,righe:[],colonne:[],errore:"Impossibile leggere il file: "+String(e?.message||e)});}
  };
  // Fase 5: registrazione rapida mobile e promemoria simulati (solo stato React).
  const [contattiRapidiDemo,setContattiRapidiDemo]=useState([]);
  const [contattoRapidoDemo,setContattoRapidoDemo]=useState({cliente:"",tipo:"Visita",note:"",mandanti:[],effettuato:true,prossimo:"",azione:""});
  const [filtroCampioniDemo,setFiltroCampioniDemo]=useState("Tutti");
  const [statoFiltroFollowupDemo,setStatoFiltroFollowupDemo]=useState("Tutti");
  const scaricaCsvDemo = () => {
    if(!excelDemo.righe.length||!mappaColonne.nome)return;
    const escapeCsv=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
    const lines=[["nome","email","telefono","comune"].join(";")];
    excelDemo.righe.forEach((r,i)=>{if(righeSelezionate.includes(i))lines.push(["nome","email","telefono","comune"].map(k=>escapeCsv(r[mappaColonne[k]]||"")).join(";"));});
    const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="anteprima_anagrafiche_demo.csv";a.click();URL.revokeObjectURL(url);
  };
  // Simulatore provvigioni: dati esclusivamente locali, senza scritture remote.
  const [ordiniDemo, setOrdiniDemo] = useState([]);
  const [ordineDemo, setOrdineDemo] = useState({cliente:"",mandante:"",riferimento:"",netto:"",sconto:"",tipoProvvigione:"percentuale",percentuale:"",importo:"",stato:"Maturata"});
  const numeroDemo = v => { const n=Number(String(v??"").trim().replace(/\s/g,"").replace(",",".")); return Number.isFinite(n)?n:0; };
  const euroDemo = n => (Number(n)||0).toLocaleString("it-IT",{style:"currency",currency:"EUR"});
  const calcolaDemo = o => o.tipoProvvigione==="importo" ? numeroDemo(o.importo) : Math.round(numeroDemo(o.netto)*numeroDemo(o.percentuale))/100;

  const input={padding:"10px 11px",border:"1px solid #dce3e8",borderRadius:9,width:"100%",background:"#fff",fontSize:14};
  const panel={background:"white",border:"1px solid #e0e5e7",borderRadius:15,padding:18,marginTop:15};
  const btn={border:"1px solid #cddbd4",background:"#f4f8f5",color:"#344a43",padding:"9px 13px",borderRadius:9,cursor:"pointer",fontWeight:650};
  const label={display:"block",fontSize:12,color:"#64716b",marginBottom:5,fontWeight:650};
  const marchiDisponibili=["QuadroDesign","CP Parquet","Galassia","Rexa","AISI Design"];
  return <div style={{maxWidth:1000,margin:"0 auto",color:"#26352f"}}>
    <h2 style={{marginBottom:5}}>Laboratorio commerciale</h2>
    <p style={{color:"#64716b",marginTop:0,fontSize:13}}>Anteprima interattiva delle prossime funzioni. I dati sono dimostrativi e restano solo in questa schermata: non vengono salvati nel CRM o su Supabase.</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[["mandanti","Mandanti per cliente"],["followup","Follow-up preventivi"],["campioni","Campionature"],["provvigioni","Provvigioni (demo)"],["visite","Pianificazione visite"],["excel","Importazione Excel"],["rapido","Inserimento rapido iPhone"]].map(([id,t])=><button key={id} style={{...btn,background:tab===id?"#344a43":"#fff",color:tab===id?"#fff":"#344a43"}} onClick={()=>setTab(id)}>{t}</button>)}</div>
    {tab==="mandanti"&&<section style={panel}>
      <h3 style={{marginTop:0}}>Marchi trattati dal cliente</h3>
      <label style={label}>Cliente / architetto (esempio)</label><input style={input} value={cliente} onChange={e=>setCliente(e.target.value)}/>
      <p style={{fontSize:12,color:"#66756d"}}>Ogni mandante può avere uno stato indipendente. Le modifiche qui sotto non alterano le anagrafiche reali.</p>
      {Object.entries(marchi).map(([nome,stato])=><div key={nome} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #eef0ef",flexWrap:"wrap"}}><strong style={{flex:"1 1 150px"}}>{nome}</strong><select style={{...input,flex:"1 1 170px",width:"auto"}} value={stato} onChange={e=>setMarchi(m=>({...m,[nome]:e.target.value}))}>{["Gia cliente","In trattativa","Da proporre","Non interessato"].map(x=><option key={x}>{x}</option>)}</select><button style={btn} onClick={()=>setMarchi(m=>{const n={...m};delete n[nome];return n;})}>Rimuovi</button></div>)}
      <div style={{display:"flex",gap:8,marginTop:15,flexWrap:"wrap"}}><select style={{...input,flex:"1 1 190px"}} value={nomeMarchio} onChange={e=>setNomeMarchio(e.target.value)}><option value="">Seleziona un mandante</option>{marchiDisponibili.filter(x=>!Object.hasOwn(marchi,x)).map(x=><option key={x}>{x}</option>)}</select><button style={btn} disabled={!nomeMarchio} onClick={()=>{setMarchi(m=>({...m,[nomeMarchio]:"Da proporre"}));setNomeMarchio("");}}>+ Associa mandante</button></div>
    </section>}
    {tab==="followup"&&<section style={panel}>
      <h3 style={{marginTop:0}}>Follow-up dei preventivi</h3><p style={{fontSize:12,color:"#66756d"}}>Prototipo del registro: nella versione definitiva ogni riga sarà collegata al preventivo salvato.</p>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12}}><label style={label}>Filtra stato</label><select style={{...input,width:"auto"}} value={statoFiltroFollowupDemo} onChange={e=>setStatoFiltroFollowupDemo(e.target.value)}>{["Tutti","Bozza","Inviato","Da ricontattare","In trattativa","Accettato","Perso"].map(x=><option key={x}>{x}</option>)}</select></div>
      {followup.filter(f=>statoFiltroFollowupDemo==="Tutti"||f.stato===statoFiltroFollowupDemo).map(f=><div key={f.id} style={{padding:"12px 0",borderBottom:"1px solid #eef0ef",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>
        <div><label style={label}>Cliente</label><input style={input} value={f.cliente} onChange={e=>setFollowup(a=>a.map(x=>x.id===f.id?{...x,cliente:e.target.value}:x))}/></div>
        <div><label style={label}>Oggetto</label><input style={input} value={f.oggetto} onChange={e=>setFollowup(a=>a.map(x=>x.id===f.id?{...x,oggetto:e.target.value}:x))}/></div>
        <div><label style={label}>Stato</label><select style={input} value={f.stato} onChange={e=>setFollowup(a=>a.map(x=>x.id===f.id?{...x,stato:e.target.value}:x))}>{["Bozza","Inviato","Da ricontattare","In trattativa","Accettato","Perso"].map(x=><option key={x}>{x}</option>)}</select></div>
        <div><label style={label}>Prossimo contatto</label><input style={input} type="date" value={f.data} onChange={e=>setFollowup(a=>a.map(x=>x.id===f.id?{...x,data:e.target.value}:x))}/></div>
        <div style={{gridColumn:"1/-1"}}><label style={label}>Nota</label><input style={input} value={f.nota} onChange={e=>setFollowup(a=>a.map(x=>x.id===f.id?{...x,nota:e.target.value}:x))}/></div>
      </div>)}
      <button style={{...btn,marginTop:15}} onClick={()=>setFollowup(a=>[...a,{id:Date.now(),cliente:"",oggetto:"",stato:"Bozza",data:"",nota:""}])}>+ Aggiungi follow-up dimostrativo</button>
    </section>}
    {tab==="campioni"&&<section style={panel}>
      <h3 style={{marginTop:0}}>Registro campionature ed esposizioni</h3>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12}}><label style={label}>Filtra materiali</label><select style={{...input,width:"auto"}} value={filtroCampioniDemo} onChange={e=>setFiltroCampioniDemo(e.target.value)}>{["Tutti","Da consegnare","Consegnato","In esposizione","Da recuperare","Recuperato"].map(x=><option key={x}>{x}</option>)}</select></div>
      {campioni.filter(c=>filtroCampioniDemo==="Tutti"||c.stato===filtroCampioniDemo).map(c=><div key={c.id} style={{padding:"12px 0",borderBottom:"1px solid #eef0ef",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}><div style={{flex:"1 1 220px"}}><strong>{c.descrizione}</strong><div style={{fontSize:12,color:"#66756d"}}>{c.cliente} · {c.mandante} · Q.tà {c.quantita}</div></div><select style={{...input,width:"auto"}} value={c.stato} onChange={e=>setCampioni(a=>a.map(x=>x.id===c.id?{...x,stato:e.target.value}:x))}>{["Da consegnare","Consegnato","In esposizione","Da recuperare","Recuperato"].map(x=><option key={x}>{x}</option>)}</select><button style={btn} onClick={()=>setCampioni(a=>a.filter(x=>x.id!==c.id))}>Rimuovi</button></div>)}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginTop:16}}>
        {[['cliente','Cliente'],['mandante','Mandante'],['descrizione','Descrizione']].map(([k,t])=><div key={k}><label style={label}>{t}</label><input style={input} value={nuovo[k]} onChange={e=>setNuovo(n=>({...n,[k]:e.target.value}))}/></div>)}
        <div><label style={label}>Quantità</label><input style={input} type="number" min="1" value={nuovo.quantita} onChange={e=>setNuovo(n=>({...n,quantita:e.target.value}))}/></div>
      </div><button style={{...btn,marginTop:14}} disabled={!nuovo.cliente.trim()||!nuovo.descrizione.trim()} onClick={()=>{setCampioni(a=>[...a,{...nuovo,id:Date.now()}]);setNuovo({cliente:"",mandante:"",descrizione:"",quantita:1,stato:"Da consegnare"});}}>+ Registra campione dimostrativo</button>
    </section>}
    {tab==="provvigioni"&&<section style={panel}>
      <h3 style={{marginTop:0}}>Simulatore provvigioni sugli ordini confermati</h3>
      <p style={{fontSize:12,color:"#66756d"}}>Prototipo locale: nessun ordine o compenso viene salvato su Supabase. La provvigione non dipende automaticamente dallo sconto cliente: scegli tu percentuale o importo per ogni ordine. L'imponibile va inserito al netto degli sconti e al netto dell'IVA.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
        {[["cliente","Cliente / architetto"],["riferimento","Riferimento ordine"],["netto","Imponibile provvigionale (€)"],["sconto","Sconti cliente (descrizione)"]].map(([k,t])=><div key={k}><label style={label}>{t}</label><input style={input} type={k==="netto"?"number":"text"} min={k==="netto"?"0":undefined} step={k==="netto"?"0.01":undefined} value={ordineDemo[k]} onChange={e=>setOrdineDemo(o=>({...o,[k]:e.target.value}))}/></div>)}
        <div><label style={label}>Mandante</label><select style={input} value={ordineDemo.mandante} onChange={e=>setOrdineDemo(o=>({...o,mandante:e.target.value}))}><option value="">Seleziona mandante</option>{marchiDisponibili.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
        <div><label style={label}>Modalità provvigione</label><select style={input} value={ordineDemo.tipoProvvigione} onChange={e=>setOrdineDemo(o=>({...o,tipoProvvigione:e.target.value}))}><option value="percentuale">Percentuale scelta manualmente</option><option value="importo">Importo fisso scelto manualmente</option></select></div>
        <div><label style={label}>{ordineDemo.tipoProvvigione==="percentuale"?"Provvigione (%)":"Provvigione (€)"}</label><input style={input} type="number" min="0" step="0.01" value={ordineDemo.tipoProvvigione==="percentuale"?ordineDemo.percentuale:ordineDemo.importo} placeholder="Inserisci valore" onChange={e=>setOrdineDemo(o=>({...o,[o.tipoProvvigione==="percentuale"?"percentuale":"importo"]:e.target.value}))}/></div>
        <div><label style={label}>Stato provvigione</label><select style={input} value={ordineDemo.stato} onChange={e=>setOrdineDemo(o=>({...o,stato:e.target.value}))}><option>Maturata</option><option>Da liquidare</option><option>Liquidata</option></select></div>
      </div>
      <div style={{marginTop:15,padding:15,background:"#f4f8f5",borderRadius:11,border:"1px solid #dce9df"}}><span style={{color:"#64716b"}}>Provvigione calcolata</span><div style={{fontSize:25,fontWeight:750,color:"#344a43"}}>{euroDemo(calcolaDemo(ordineDemo))}</div><div style={{fontSize:12,color:"#64716b"}}>Il valore rimane associato all'ordine dimostrativo anche se modifichi la percentuale di un altro ordine.</div></div>
      <button style={{...btn,marginTop:12}} disabled={!ordineDemo.cliente.trim()||!ordineDemo.mandante||!ordineDemo.riferimento.trim()||!(numeroDemo(ordineDemo.netto)>0)||!(ordineDemo.tipoProvvigione==="percentuale"?ordineDemo.percentuale!==""&&numeroDemo(ordineDemo.percentuale)>=0:ordineDemo.importo!==""&&numeroDemo(ordineDemo.importo)>=0)} onClick={()=>{setOrdiniDemo(a=>[{...ordineDemo,id:Date.now(),provvigione:calcolaDemo(ordineDemo)},...a]);setOrdineDemo({cliente:"",mandante:"",riferimento:"",netto:"",sconto:"",tipoProvvigione:"percentuale",percentuale:"",importo:"",stato:"Maturata"});}}>+ Registra ordine dimostrativo</button>
      {ordiniDemo.length>0&&<div style={{marginTop:18}}><h4>Ordini dimostrativi</h4>{ordiniDemo.map(o=><div key={o.id} style={{padding:"12px 0",borderTop:"1px solid #e6eae8",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><strong>{o.cliente}</strong> · {o.mandante}<div style={{fontSize:12,color:"#64716b"}}>Ordine {o.riferimento} · Netto {euroDemo(numeroDemo(o.netto))} · Sconto {o.sconto||"non specificato"} · {o.tipoProvvigione==="percentuale"?`${o.percentuale}%`:"Importo manuale"} · {o.stato}</div></div><div style={{fontWeight:750}}>{euroDemo(o.provvigione)}</div><button style={btn} onClick={()=>setOrdiniDemo(a=>a.filter(x=>x.id!==o.id))}>Rimuovi</button></div>)}<div style={{textAlign:"right",fontWeight:750,marginTop:12}}>Totale provvigioni demo: {euroDemo(ordiniDemo.reduce((a,o)=>a+o.provvigione,0))}</div></div>}
    </section>}
    {tab==="visite"&&<section style={panel}>
      <h3 style={{marginTop:0}}>Pianificazione visite commerciali (demo)</h3>
      <p style={{fontSize:12,color:"#66756d"}}>Organizza gli appuntamenti per comune, data e priorità. Nessuna visita viene registrata nell'agenda reale. I percorsi stradali non sono calcolati.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
        {[["cliente","Cliente / studio"],["comune","Comune / zona"],["indirizzo","Indirizzo"],["data","Data"],["ora","Ora"],["nota","Obiettivo visita"]].map(([k,t])=><div key={k}><label style={label}>{t}</label><input style={input} type={k==="data"?"date":k==="ora"?"time":"text"} value={visitaDemo[k]} onChange={e=>setVisitaDemo(v=>({...v,[k]:e.target.value}))}/></div>)}
        <div><label style={label}>Priorità</label><select style={input} value={visitaDemo.priorita} onChange={e=>setVisitaDemo(v=>({...v,priorita:e.target.value}))}>{["Alta","Media","Bassa"].map(x=><option key={x}>{x}</option>)}</select></div>
      </div>
      <button style={{...btn,marginTop:12}} disabled={!visitaDemo.cliente.trim()||!visitaDemo.data} onClick={()=>{setVisiteDemo(a=>[...a,{...visitaDemo,id:Date.now()}]);setVisitaDemo({cliente:"",comune:"",indirizzo:"",data:"",ora:"",priorita:"Media",nota:""});}}>+ Aggiungi visita dimostrativa</button>
      <div style={{marginTop:18}}><label style={label}>Filtra per comune, cliente o priorità</label><input style={input} placeholder="Es. Roma, Viterbo, Alta..." value={filtroVisite} onChange={e=>setFiltroVisite(e.target.value)}/></div>
      {visiteDemo.filter(v=>[v.cliente,v.comune,v.priorita].join(" ").toLowerCase().includes(filtroVisite.toLowerCase())).sort((a,b)=>(a.data+" "+a.ora).localeCompare(b.data+" "+b.ora)).map(v=><div key={v.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",padding:"12px 0",borderBottom:"1px solid #e6eae8"}}><div><strong>{v.cliente}</strong><div style={{fontSize:12,color:"#64716b"}}>{v.data} {v.ora} · {v.comune||"Zona non indicata"} · Priorità {v.priorita}</div><div style={{fontSize:12}}>{v.indirizzo} {v.nota&&" · "+v.nota}</div></div><button style={btn} onClick={()=>setVisiteDemo(a=>a.filter(x=>x.id!==v.id))}>Rimuovi</button></div>)}
      {visiteDemo.length===0&&<p style={{fontSize:13,color:"#64716b"}}>Aggiungi una visita di prova per visualizzare il programma.</p>}
    </section>}
    {tab==="excel"&&<section style={panel}>
      <h3 style={{marginTop:0}}>Anteprima importazione anagrafiche Excel (demo)</h3>
      <p style={{fontSize:12,color:"#66756d"}}>Il file viene letto soltanto nel browser. Nessun dato viene importato nel CRM o inviato a Supabase. Anteprima limitata alle prime 500 righe del primo foglio.</p>
      <label style={label}>Scegli un file .xlsx, .xls oppure .csv</label>
      <input style={input} type="file" accept=".xlsx,.xls,.csv" onChange={e=>leggiExcelDemo(e.target.files?.[0])}/>
      {excelDemo.errore&&<p style={{color:"#a23a30"}}>{excelDemo.errore}</p>}
      {excelDemo.righe.length>0&&<div style={{marginTop:14}}>
        <strong>{excelDemo.nome} — {excelDemo.righe.length} righe lette</strong>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginTop:12}}>
          {[["nome","Cliente / ragione sociale"],["email","Email"],["telefono","Telefono"],["comune","Comune"]].map(([k,t])=><div key={k}><label style={label}>{t}</label><select style={input} value={mappaColonne[k]} onChange={e=>setMappaColonne(m=>({...m,[k]:e.target.value}))}><option value="">Non associare</option>{excelDemo.colonne.map(c=><option key={c} value={c}>{c}</option>)}</select></div>)}
        </div>
        <p style={{fontSize:12,color:"#64716b"}}>Controllo preliminare: {excelDemo.righe.filter(r=>mappaColonne.nome&&String(r[mappaColonne.nome]||"").trim()).length} righe con nome; {excelDemo.righe.length-new Set(excelDemo.righe.map(r=>String(r[mappaColonne.nome]||"").trim().toLowerCase())).size} possibili nomi duplicati nel file (da verificare).</p>
        <div style={{overflowX:"auto",maxHeight:360,marginTop:10}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Includi","Nome","Email","Telefono","Comune"].map(t=><th key={t} style={{textAlign:"left",padding:9,background:"#344a43",color:"white",position:"sticky",top:0}}>{t}</th>)}</tr></thead><tbody>{excelDemo.righe.slice(0,30).map((r,i)=><tr key={i} style={{background:i%2?"#f6f8f6":"white"}}><td style={{padding:8}}><input type="checkbox" checked={righeSelezionate.includes(i)} onChange={e=>setRigheSelezionate(a=>e.target.checked?[...a,i]:a.filter(x=>x!==i))}/></td>{["nome","email","telefono","comune"].map(k=><td key={k} style={{padding:8,borderBottom:"1px solid #e8eeea"}}>{String(r[mappaColonne[k]]||"").slice(0,90)}</td>)}</tr>)}</tbody></table></div>
        <p style={{fontSize:12,color:"#64716b"}}>Mostrate al massimo 30 righe. {righeSelezionate.length} righe selezionate su {excelDemo.righe.length}. Il confronto con le anagrafiche esistenti sarà disponibile soltanto nella fase di integrazione, dopo aver definito i criteri anti-duplicato.</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={btn} disabled={!mappaColonne.nome||!righeSelezionate.length} onClick={scaricaCsvDemo}>Esporta CSV di anteprima</button><button style={{...btn,opacity:0.55,cursor:"not-allowed"}} disabled>Importa nel CRM — non disponibile in modalità demo</button></div>
      </div>}
    </section>}
    {tab==="rapido"&&<section style={panel}>
      <h3 style={{marginTop:0}}>Registrazione rapida da iPhone (demo)</h3>
      <p style={{fontSize:12,color:"#66756d"}}>Interfaccia compatta per simulare una visita, chiamata, email o WhatsApp. Mandanti facoltativi e multipli. Il promemoria è facoltativo. Nessun salvataggio remoto.</p>
      <div style={{maxWidth:480,margin:"0 auto",display:"grid",gap:12}}>
        <div><label style={label}>Cliente o architetto *</label><input style={input} value={contattoRapidoDemo.cliente} onChange={e=>setContattoRapidoDemo(v=>({...v,cliente:e.target.value}))} placeholder="Nome cliente / studio"/></div>
        <div><label style={label}>Tipo di contatto</label><select style={input} value={contattoRapidoDemo.tipo} onChange={e=>setContattoRapidoDemo(v=>({...v,tipo:e.target.value}))}>{["Visita","Telefonata","WhatsApp","Email","Altro"].map(x=><option key={x}>{x}</option>)}</select></div>
        <div><label style={label}>Mandanti (facoltativi, selezione multipla)</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{marchiDisponibili.map(m=><label key={m} style={{border:"1px solid #dce3e8",borderRadius:9,padding:"8px 10px",fontSize:13,background:contattoRapidoDemo.mandanti.includes(m)?"#e6f0ea":"#fff"}}><input type="checkbox" checked={contattoRapidoDemo.mandanti.includes(m)} onChange={e=>setContattoRapidoDemo(v=>({...v,mandanti:e.target.checked?[...v.mandanti,m]:v.mandanti.filter(x=>x!==m)}))}/> {m}</label>)}</div></div>
        <div><label style={label}>Note</label><textarea style={{...input,minHeight:72}} value={contattoRapidoDemo.note} onChange={e=>setContattoRapidoDemo(v=>({...v,note:e.target.value}))} placeholder="Cosa è emerso dal contatto?"/></div>
        <label style={{fontSize:13}}><input type="checkbox" checked={contattoRapidoDemo.effettuato} onChange={e=>setContattoRapidoDemo(v=>({...v,effettuato:e.target.checked}))}/> Contatto già effettuato (aggiorna ultimo contatto solo nella futura versione collegata)</label>
        <div style={{padding:12,border:"1px solid #dce3e8",borderRadius:10}}><strong style={{fontSize:13}}>Vuoi programmare il prossimo contatto?</strong><div style={{display:"grid",gridTemplateColumns:"1fr",gap:8,marginTop:10}}><input type="date" style={input} value={contattoRapidoDemo.prossimo} onChange={e=>setContattoRapidoDemo(v=>({...v,prossimo:e.target.value}))}/><input style={input} placeholder="Prossima azione (facoltativa)" value={contattoRapidoDemo.azione} onChange={e=>setContattoRapidoDemo(v=>({...v,azione:e.target.value}))}/></div></div>
        <button style={{...btn,background:"#344a43",color:"#fff",minHeight:46}} disabled={!contattoRapidoDemo.cliente.trim()} onClick={()=>{setContattiRapidiDemo(a=>[{...contattoRapidoDemo,id:Date.now(),registrato:new Date().toLocaleString("it-IT")},...a]);setContattoRapidoDemo({cliente:"",tipo:"Visita",note:"",mandanti:[],effettuato:true,prossimo:"",azione:""});}}>Registra attività di prova</button>
      </div>
      {contattiRapidiDemo.length>0&&<div style={{marginTop:20}}><h4>Storico di prova</h4>{contattiRapidiDemo.map(c=><div key={c.id} style={{borderTop:"1px solid #e6eae8",padding:"12px 0",fontSize:13}}><strong>{c.tipo} · {c.cliente}</strong><div style={{color:"#64716b",fontSize:12}}>{c.registrato} · {c.effettuato?"Effettuato":"Pianificato"} · {c.mandanti.length?c.mandanti.join(", "):"Nessun mandante"}</div>{c.note&&<div>{c.note}</div>}{c.prossimo&&<div>Prossimo contatto: {c.prossimo} {c.azione}</div>}</div>)}</div>}
    </section>}
    <p style={{fontSize:12,color:"#64716b",marginTop:15}}>Modalità laboratorio: ricaricando la pagina, i dati di prova vengono azzerati. Nessuna modifica al database.</p>
  </div>;
}


// Fase 2: report commerciale aggregato. Le fonti restano separate:
// fatturato_commerciale = consuntivo, opportunita_commerciali = pipeline,
// crm_provvigioni_ordini / crm_liquidazioni_provvigioni = compensi.
function ReportDirezionaleCRM({session, goTo}) {
  const [righe,setRighe]=useState({aziende:[],clienti:[],fatturato:[],opportunita:[],provvigioni:[],liquidazioni:[],attivita:[]});
  const [anno,setAnno]=useState(new Date().getFullYear());
  const [mandante,setMandante]=useState('');
  const [loading,setLoading]=useState(true);
  const [errore,setErrore]=useState('');
  const carica=async()=>{
    setLoading(true);setErrore('');
    const h={apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+session.access_token};
    const paths={aziende:'aziende_mandanti?select=id,nome&order=nome.asc',clienti:'clienti?select=id,ragione_sociale',fatturato:'fatturato_commerciale?select=azienda_id,cliente_id,anno,importo',opportunita:'opportunita_commerciali?select=id,titolo,cliente_id,azienda_id,fase,valore_stimato,probabilita,data_prossima_azione',provvigioni:'crm_provvigioni_ordini?select=id,azienda_id,cliente_id,importo_maturato,data_ordine',liquidazioni:'crm_liquidazioni_provvigioni?select=provvigione_id,importo',attivita:'crm_attivita?select=id,azienda_id,cliente_id,titolo,scadenza,stato'};
    try{
      const entries=await Promise.all(Object.entries(paths).map(async([key,path])=>{
        const r=await crmFetch(SUPABASE_URL+'/rest/v1/'+path,{headers:h});
        const d=await r.json().catch(()=>null);
        if(!r.ok||!Array.isArray(d))throw Error(key+': '+(d?.message||'lettura non riuscita'));
        return [key,d];
      }));
      setRighe(Object.fromEntries(entries));
    }catch(e){setErrore(e.message)}finally{setLoading(false)}
  };
  useEffect(()=>{carica()},[session.access_token]);
  const filtrati=(arr)=>arr.filter(x=>!mandante||x.azienda_id===mandante);
  const f=filtrati(righe.fatturato).filter(x=>Number(x.anno)===Number(anno));
  const totaleFatturato=f.reduce((a,x)=>a+Number(x.importo||0),0);
  const opportunita=filtrati(righe.opportunita).filter(x=>!['vinta','persa','chiusa','annullata'].includes(String(x.fase||'').toLowerCase()));
  const valorePipeline=opportunita.reduce((a,x)=>a+Number(x.valore_stimato||0),0);
  const ponderata=opportunita.reduce((a,x)=>a+Number(x.valore_stimato||0)*Number(x.probabilita||0)/100,0);
  const provvigioni=filtrati(righe.provvigioni).filter(x=>!x.data_ordine||String(x.data_ordine).slice(0,4)===String(anno));
  const maturato=provvigioni.reduce((a,x)=>a+Number(x.importo_maturato||0),0);
  const ids=new Set(provvigioni.map(x=>x.id));
  const liquidato=righe.liquidazioni.filter(x=>ids.has(x.provvigione_id)).reduce((a,x)=>a+Number(x.importo||0),0);
  const oggi=new Date().toISOString().slice(0,10);
  const attivita=filtrati(righe.attivita).filter(x=>x.stato!=='completata'&&x.scadenza&&String(x.scadenza).slice(0,10)<=oggi);
  const nome=(id)=>righe.aziende.find(x=>x.id===id)?.nome||'Non assegnata';
  const euro=n=>Number(n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
  const card={padding:18,borderRadius:15,background:'#fff',border:'1px solid #dce4f0',boxShadow:'0 4px 12px rgba(25,48,90,.035)'};
  const mandanti=righe.aziende.map(a=>({...a,fatturato:f.filter(x=>x.azienda_id===a.id).reduce((n,x)=>n+Number(x.importo||0),0),pipeline:opportunita.filter(x=>x.azienda_id===a.id).reduce((n,x)=>n+Number(x.valore_stimato||0),0)})).sort((a,b)=>b.fatturato-a.fatturato);
  return <section style={{maxWidth:1250,margin:'0 auto',padding:'20px 10px 35px',color:'#1d3150'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:18}}><div><h2 style={{margin:'0 0 5px'}}>Report direzionale</h2><p style={{margin:0,color:'#6a7a90',fontSize:13}}>Consuntivo, trattative, provvigioni e attività: dati reali, senza sommare preventivi al fatturato.</p></div><button onClick={carica} style={{padding:'10px 14px',border:'1px solid #c9d7ea',borderRadius:9,background:'#fff',cursor:'pointer'}}>Aggiorna dati</button></div>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}><label>Anno <select value={anno} onChange={e=>setAnno(Number(e.target.value))} style={{marginLeft:7,padding:9,borderRadius:8,border:'1px solid #cbd7e7'}}>{Array.from({length:6},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>)}</select></label><label>Mandante <select value={mandante} onChange={e=>setMandante(e.target.value)} style={{marginLeft:7,padding:9,borderRadius:8,border:'1px solid #cbd7e7'}}><option value=''>Tutte le aziende</option>{righe.aziende.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></label></div>
    {loading&&<p>Caricamento report…</p>}{errore&&<p role='alert' style={{color:'#ad2929'}}>Impossibile completare il report: {errore}</p>}
    {!loading&&!errore&&<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:12,marginBottom:18}}>{[['Fatturato consuntivo',euro(totaleFatturato)],['Pipeline aperta',euro(valorePipeline)],['Pipeline ponderata',euro(ponderata)],['Provvigioni maturate',euro(maturato)],['Provvigioni da liquidare',euro(Math.max(0,maturato-liquidato))],['Attività scadute / oggi',String(attivita.length)]].map(([label,value])=><div key={label} style={card}><div style={{fontSize:12,color:'#687b94',marginBottom:7}}>{label}</div><strong style={{fontSize:21,overflowWrap:'anywhere'}}>{value}</strong></div>)}</div>
      <div style={card}><h3 style={{marginTop:0}}>Andamento per mandante</h3><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,textAlign:'left'}}><thead><tr>{['Azienda','Fatturato anno','Pipeline aperta'].map(x=><th key={x} style={{padding:11,borderBottom:'1px solid #e2e9f1'}}>{x}</th>)}</tr></thead><tbody>{mandanti.map(a=><tr key={a.id}><td style={{padding:11,borderBottom:'1px solid #edf1f6'}}>{a.nome}</td><td style={{padding:11,borderBottom:'1px solid #edf1f6'}}>{euro(a.fatturato)}</td><td style={{padding:11,borderBottom:'1px solid #edf1f6'}}>{euro(a.pipeline)}</td></tr>)}</tbody></table></div></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:15}}><button onClick={()=>goTo('pipeline')} style={{padding:'11px 15px',border:0,borderRadius:9,background:'#2568d6',color:'#fff',cursor:'pointer'}}>Apri pipeline</button><button onClick={()=>goTo('controllo')} style={{padding:'11px 15px',border:'1px solid #ccd7e7',borderRadius:9,background:'#fff',cursor:'pointer'}}>Controllo commerciale</button><button onClick={()=>goTo('attivita')} style={{padding:'11px 15px',border:'1px solid #ccd7e7',borderRadius:9,background:'#fff',cursor:'pointer'}}>Attività da gestire</button></div>
      <p style={{fontSize:12,color:'#75849a',marginTop:14}}>Nota: le provvigioni sono filtrate per anno dell'ordine; le liquidazioni mostrate sono quelle riferite a tali provvigioni, indipendentemente dalla data di pagamento. La pipeline è una stima, non fatturato acquisito.</p>
    </>}
  </section>;
}

function AppShell({ session, onLogout }) {
  const [ricercaGlobaleAperta,setRicercaGlobaleAperta]=useState(false);
  const [azioniRapideAperte,setAzioniRapideAperte]=useState(false);
  const [menuOpen, setMenuOpen] = useState(typeof window === "undefined" ? true : window.innerWidth > 768);
  const [page, setPage] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("appuntamento") ? "visite" : "dashboard");
  const [role, setRole] = useState("user");
  const [preventivoAprireId, setPreventivoAprireId] = useState(null);
  const [preventivoDaConvertire, setPreventivoDaConvertire] = useState(null);
  const [gruppoAprireId, setGruppoAprireId] = useState(null);
  const [aperti, setAperti] = useState({ clienti:true, architetti:true, mandanti:true, opportunita:true, agenda:true, report:true });
  const apriPreventivoCliente = id => { setPreventivoAprireId(id); setPage("preventivi"); };
  const apriGruppoCliente = id => { setGruppoAprireId(id); setPage("gruppi"); };
  useEffect(() => { (async () => { try { const r=await crmFetch(SUPABASE_URL+"/rest/v1/profiles?id=eq."+session.user.id+"&select=role",{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+session.access_token}}); const d=await r.json(); if(d&&d[0])setRole(d[0].role); } catch(e){} })(); },[session]);
  const sezioni = [
    {id:"clienti",nome:"Clienti",icon:Users,items:[{key:"clienti",label:"Anagrafica clienti",icon:Users},{key:"gruppi",label:"Gruppi d'acquisto",icon:Users2},{key:"mappa",label:"Mappa clienti",icon:MapIcon}]},
    {id:"architetti",nome:"Architetti",icon:Users2,items:[{key:"architetti",label:"Studi e architetti",icon:Users2}]},
    {id:"opportunita",nome:"Opportunità",icon:Target,items:[{key:"pipeline",label:"Pipeline commerciale",icon:Target},{key:"preventivi",label:"Preventivi e offerte",icon:FileText},{key:"portafoglio",label:"Portafoglio ordini",icon:Briefcase},{key:"ordini",label:"Registro ordini",icon:ClipboardList}]},
    {id:"agenda",nome:"Agenda",icon:CalendarDays,items:[{key:"agenda",label:"Pannello agenda",icon:CalendarDays},{key:"visite",label:"Calendario e appuntamenti",icon:CalendarDays},{key:"attivita",label:"Attività e follow-up",icon:ClipboardList},{key:"storico_visite",label:"Storico visite",icon:ClipboardList}]},
    {id:"report",nome:"Report",icon:BarChart3,items:[{key:"direzionale",label:"Report direzionale",icon:BarChart3},{key:"centro",label:"Centro operativo",icon:Target},{key:"controllo",label:"Controllo Commerciale",icon:Wallet},{key:"fatturato",label:"Fatturato (ordini CRM)",icon:Wallet},{key:"statistiche",label:"Statistiche",icon:TrendingUp}]},
    {id:"mandanti",nome:"Mandanti",icon:Building2,items:[{key:"aziende",label:"Aziende mandanti",icon:Building2}]},
    {id:"laboratorio",nome:"Laboratorio",icon:Settings,items:[{key:"laboratorio",label:"Registri commerciali",icon:Settings}]},
  ];  const scegli = key => { setPage(key); if(window.innerWidth<768)setMenuOpen(false); };
  const avatar=(session.user.email||"FG").split("@")[0].slice(0,2).toUpperCase();
  return <div className="matrice-shell"><StileRiferimentoFotoCRM/><style>{`
/* Contrasto e gerarchia della dashboard */
.matrice-shell{background:#eaf0f8!important}
.matrice-workspace{background:#eaf0f8!important}
.matrice-topbar{background:#fff!important;border-bottom:1px solid #cdd8e8!important}
.matrice-main{background:transparent!important}
.matrice-dashboard .matrice-metrics .matrice-metric{background:#fff!important;border:1px solid #cbd7e8!important;box-shadow:0 5px 15px rgba(28,53,91,.09)!important}
.matrice-dashboard .matrice-metrics .matrice-metric:first-child{background:#fff!important;border-color:#cbd7e8!important}
.matrice-dashboard .matrice-metrics .matrice-metric:first-child strong{color:#15243c!important}
.matrice-dashboard .matrice-metrics .matrice-metric:first-child small,.matrice-dashboard .matrice-metrics .matrice-metric:first-child em{color:#718099!important}
.matrice-dashboard .matrice-two>section,.matrice-dashboard .crm-recent-notes,.matrice-dashboard .crm-task-dashboard,.matrice-dashboard .crm-today-priority>section{background:#fff!important;border:1px solid #cbd7e8!important;box-shadow:0 6px 18px rgba(28,53,91,.09)!important;border-radius:16px!important}
.crm-today-priority{margin-bottom:16px}
.crm-today-priority>section{border-left:4px solid #2775e7!important}
.crm-today-priority .matrice-section-head h3{font-size:17px!important}
.crm-dashboard-finance-label{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:23px 0 13px;padding:0 2px}
.crm-dashboard-finance-label h2{font-size:17px!important;font-weight:750!important;margin:0!important;color:#1c3150!important}
.crm-dashboard-finance-label span{font-size:12px;color:#667b98}
.crm-task-dashboard{border-left:4px solid #e4aa40!important}
.matrice-dashboard .matrice-section-head{border-bottom:1px solid #e8edf5;padding-bottom:11px;margin-bottom:13px}
.matrice-dashboard .matrice-two>section{min-width:0}
@media(max-width:768px){.matrice-shell,.matrice-workspace{background:#eaf0f8!important}.crm-dashboard-finance-label{display:block}.crm-dashboard-finance-label span{display:block;margin-top:4px}.crm-today-priority>section{padding:15px!important}}
`}</style>
    <aside className={"matrice-sidebar"+(menuOpen?" is-open":"")}>
      <div className="matrice-brand"><div className="matrice-brand-icon"><BarChart3 size={29} strokeWidth={3}/></div><div><strong>CRM</strong></div><button className="matrice-close-menu" onClick={()=>setMenuOpen(false)}>×</button></div>
      <div className="matrice-nav-scroll"><button className={"matrice-nav-main"+(page==="dashboard"?" active":"")} onClick={()=>scegli("dashboard")}><LayoutDashboard size={17}/> Dashboard</button>
        {sezioni.map(g=>{const Icon=g.icon;return <div className="matrice-nav-group" key={g.id}><button className="matrice-nav-group-title" onClick={()=>setAperti(p=>({...p,[g.id]:!p[g.id]}))}><Icon size={17}/><span>{g.nome}</span>{aperti[g.id]?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</button>{aperti[g.id]&&<div className="matrice-subnav">{g.items.map(item=>{const I=item.icon;return <button key={item.key} onClick={()=>scegli(item.key)} className={page===item.key?"active":""}><I size={14}/><span>{item.label}</span></button>})}</div>}</div>})}
        <button className={"matrice-nav-main crm-notes-nav"+(page==="note"?" active":"")} onClick={()=>scegli("note")}><StickyNote size={17}/> Note</button>
        {role==="admin"&&<button className={"matrice-nav-main"+(page==="admin"?" active":"")} onClick={()=>scegli("admin")}><Settings size={17}/> Amministrazione</button>}
      </div><div className="matrice-sidebar-foot"><span className="matrice-status-dot"/> CRM sviluppo <small>Ambiente di test</small></div>
    </aside>
    {menuOpen&&<div className="matrice-backdrop" onClick={()=>setMenuOpen(false)}/>}
    <div className="matrice-workspace"><header className="matrice-topbar"><button className="matrice-menu-button" onClick={()=>setMenuOpen(v=>!v)} aria-label="Apri o chiudi menu"><MenuIcon size={19}/></button><span className="matrice-topbar-label">{page==="dashboard"?"Panoramica":sezioni.flatMap(x=>x.items).find(x=>x.key===page)?.label||"CRM"}</span><div className="matrice-topbar-actions"><button title="Ricerca globale" onClick={()=>setRicercaGlobaleAperta(true)}><Search size={18}/></button><button title="Apri pannello agenda" onClick={()=>scegli("agenda")}><Bell size={18}/></button><span className="matrice-avatar" title={session.user.email}>{avatar}</span><button className="matrice-logout" onClick={onLogout} title="Esci"><LogOut size={17}/></button></div></header>
      <main key={page} className="page-content matrice-main">
        {page==="dashboard"&&<AttivaNotificheCRM session={session}/>}
        {page==="dashboard"&&<Dashboard session={session} goTo={scegli}/>}
        {page==="dashboard"&&<ClientiDaRiattivareCRM session={session} naviga={scegli}/>}
        {page==="direzionale"&&<ReportDirezionaleCRM session={session} goTo={scegli}/>}
        {page==="centro"&&<CentroOperativoCRM session={session} goTo={scegli}/>} 
        {page==="admin"&&role==="admin"&&<AdminPanel session={session}/>}
        {page==="aziende"&&<AziendeMandanti session={session}/>}
        {page==="agenda"&&<PannelloAgendaCRM session={session} goTo={scegli}/>}
        {page==="attivita"&&<AttivitaCRM session={session}/>}
        {page==="clienti"&&<ClientiAnagrafica session={session} apriPreventivo={apriPreventivoCliente} apriGruppo={apriGruppoCliente}/>}
        {page==="architetti"&&<ClientiAnagrafica soloArchitetti session={session} apriPreventivo={apriPreventivoCliente} apriGruppo={apriGruppoCliente}/>}
        {page==="laboratorio"&&<><CRMOperativitaUnificata session={session}/><RegistroCommercialeSupabase session={session}/><RegistroProvvigioniSupabase session={session}/><details style={{marginTop:20}}><summary style={{cursor:"pointer",fontWeight:650}}>Apri il vecchio Laboratorio dimostrativo (NON salva su Supabase)</summary><LaboratorioCommercialeCRM/></details></>}
        {page==="visite"&&<CalendarioVisite session={session}/>} 
        {page==="storico_visite"&&<StoricoVisiteCRM session={session}/>}
        {page==="note"&&<NoteCRM session={session}/>}
        {page==="pipeline"&&<PipelineCommerciale session={session} preventivoDaConvertire={preventivoDaConvertire} onPreventivoRicevuto={()=>setPreventivoDaConvertire(null)}/>}
        {page==="preventivi"&&<PreventiviOfferte session={session} preventivoIniziale={preventivoAprireId} onPreventivoAperto={()=>setPreventivoAprireId(null)} vaiAllaPipeline={()=>scegli("pipeline")} creaOpportunitaDaPreventivo={p=>{setPreventivoDaConvertire(p);scegli("pipeline");}}/>}
        {page==="mappa"&&<MappaClienti session={session}/>}
        {page==="statistiche"&&<Statistiche session={session}/>}
        {page==="fatturato"&&<Fatturato session={session}/>}
        {page==="controllo"&&<ControlloCommerciale session={session}/>}
        {page==="ordini"&&<RegistroOrdini session={session} apriPreventivo={apriPreventivoCliente}/>}
        {page==="portafoglio"&&<PortafoglioOrdini session={session}/>}
        {page==="gruppi"&&<GruppiAcquisto session={session} gruppoIniziale={gruppoAprireId} onGruppoAperto={()=>setGruppoAprireId(null)}/>}
      </main></div>
    <StileCRMv12/>
    {ricercaGlobaleAperta&&<RicercaGlobaleCRM session={session} chiudi={()=>setRicercaGlobaleAperta(false)} naviga={scegli}/>}
    {azioniRapideAperte&&<AzioniRapideCRM session={session} chiudi={()=>setAzioniRapideAperte(false)} naviga={scegli}/>}
    <button className="crm-mobile-fab" aria-label="Aggiungi rapidamente" title="Aggiungi" onClick={()=>setAzioniRapideAperte(true)}><Plus size={27}/></button>
    <nav className="crm-mobile-bottom-nav" aria-label="Navigazione rapida">
      {[{key:"dashboard",label:"Home",Icon:LayoutDashboard},{key:"centro",label:"Operativo",Icon:Target},{key:"clienti",label:"Clienti",Icon:Users},{key:"agenda",label:"Agenda",Icon:CalendarDays},{key:"pipeline",label:"Pipeline",Icon:Target}].map(item=><button key={item.key} type="button" className={page===item.key?"active":""} onClick={()=>scegli(item.key)}><item.Icon size={20}/><span>{item.label}</span></button>)}
      <button type="button" className={menuOpen?"active":""} onClick={()=>setMenuOpen(true)}><MenuIcon size={20}/><span>Menu</span></button>
    </nav>
  </div>;
}

function StileMobileCRM() { return <style>{`
/* Ottimizzazione iPhone e piccoli schermi, senza modificare il desktop */
.crm-mobile-bottom-nav{display:none}
@media(max-width:768px){
  html,body,#root{max-width:100%;overflow-x:hidden}
  .matrice-shell{min-height:100dvh!important;overflow-x:hidden}
  .matrice-workspace{min-width:0!important;width:100%!important;max-width:100%!important;margin-left:0!important;padding-bottom:calc(76px + env(safe-area-inset-bottom))!important}
  .matrice-topbar{min-height:56px!important;padding:8px 14px!important;gap:8px!important}
  .matrice-topbar-label{font-size:14px!important;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .matrice-main,.page-content{padding:14px 12px 22px!important;max-width:100%!important;min-width:0!important;overflow-x:hidden}
  .matrice-sidebar{position:fixed!important;top:0!important;bottom:0!important;left:0!important;z-index:1200!important;width:min(86vw,310px)!important;max-width:310px!important;overflow-y:auto!important;transform:translateX(-105%);transition:transform .2s ease!important;box-shadow:8px 0 30px #0b1a3550}
  .matrice-sidebar.is-open{transform:translateX(0)!important}
  .matrice-backdrop{position:fixed!important;inset:0!important;z-index:1190!important;background:#07142680!important}
  .matrice-nav-main,.matrice-nav-group-title,.matrice-subnav button{min-height:45px!important;font-size:14px!important}
  .crm-mobile-bottom-nav{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:1100;height:calc(65px + env(safe-area-inset-bottom));padding:5px 5px calc(5px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #dce5f1;box-shadow:0 -5px 20px #132d5410;justify-content:space-around;align-items:stretch}
  .crm-mobile-bottom-nav button{flex:1;min-width:0;border:0;background:transparent;color:#71819b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:10px;font-weight:600;border-radius:10px;cursor:pointer;touch-action:manipulation}
  .crm-mobile-bottom-nav button.active{color:#205bc0;background:#eff5ff}
  .crm-mobile-bottom-nav button span{white-space:nowrap}
  .matrice-welcome{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:12px!important;margin-bottom:15px!important}
  .matrice-welcome h1{font-size:22px!important;line-height:1.2!important}
  .matrice-metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}
  .matrice-metric{min-width:0!important;padding:12px!important}
  .matrice-metric strong{font-size:19px!important}
  .matrice-two{grid-template-columns:1fr!important;gap:12px!important}
  .matrice-dashboard{min-width:0!important}
  .matrice-dashboard>*,.matrice-main>*,.matrice-main>div{max-width:100%;min-width:0}
  .crm-pipeline-board{overflow-x:auto!important;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;padding-bottom:18px!important}
  .crm-pipeline-column{scroll-snap-align:start}
  .crm-pipeline-card button,.crm-pipeline-add{min-height:36px!important}
  button,select,input,textarea{touch-action:manipulation}
  button{min-height:38px}
  input:not([type=checkbox]):not([type=radio]),textarea,select{font-size:16px!important;max-width:100%;min-height:42px}
  textarea{min-height:90px}
  .matrice-main table{font-size:12px}
  .matrice-main :is(table,.table-container,.table-responsive){max-width:100%}
  .matrice-main :is(.table-container,.table-responsive){overflow-x:auto;-webkit-overflow-scrolling:touch}
  .matrice-main :is(.modal,.modal-content,[role=dialog]){max-width:calc(100vw - 20px)!important;max-height:calc(100dvh - 100px)!important;overflow-y:auto}
  .matrice-main :is(.grid,.form-grid){min-width:0}
  .matrice-main :is(.grid,.form-grid)>*{min-width:0}
}
@media(max-width:380px){.matrice-metrics{grid-template-columns:1fr!important}.crm-mobile-bottom-nav button{font-size:9px}}
`}</style>; }

function StileGlobaleResponsive() {
  return (
    <style>{'\n.matrice-shell{background:linear-gradient(115deg,#eef2fa,#e3eaf7 72%,#f1f4fb)!important}\n.matrice-sidebar{background:linear-gradient(160deg,#101d34 0%,#172943 100%)!important;border-right:1px solid #253956!important;color:#eaf2ff!important;width:272px!important;flex-basis:272px!important}\n.matrice-brand{border-bottom:1px solid #30415d!important;color:#fff!important}\n.matrice-brand strong{font-size:28px!important;letter-spacing:.4px!important;color:#fff!important}\n.matrice-brand-icon{color:#dbeafe!important;background:transparent!important}\n.matrice-nav-main,.matrice-nav-group-title,.matrice-subnav button{color:#e1eaf8!important}\n.matrice-nav-main:hover,.matrice-nav-group-title:hover,.matrice-subnav button:hover{background:#273d5b!important}\n.matrice-nav-main.active,.matrice-subnav button.active{background:linear-gradient(90deg,#1462ce,#2479e7)!important;color:white!important}\n.matrice-subnav{border-left:1px solid #3c4f6b!important}\n.matrice-sidebar-foot{border-top:1px solid #344762!important;color:#b3c4df!important}\n.matrice-sidebar-foot small{color:#8fa5c4!important}\n.matrice-topbar{background:rgba(237,243,253,.88)!important;border-bottom:1px solid #dce5f3!important}\n.matrice-metric{box-shadow:0 7px 22px rgba(24,48,84,.07)!important}\n.matrice-metric:first-child{background:linear-gradient(125deg,#16263e,#354d6c)!important;border-color:#334b6c!important}\n.matrice-metric:first-child strong,.matrice-metric:first-child small,.matrice-metric:first-child em{color:#fff!important}\n.matrice-metric:first-child .matrice-metric-icon{background:#285ea2!important;color:#fff!important}\n.matrice-dashboard>div.matrice-two>section,.crm-recent-notes{box-shadow:0 8px 25px rgba(22,45,82,.065)!important;border-color:#dce5f3!important}\n.crm-notes-nav{margin-top:15px!important;border-top:1px solid #344762!important;padding-top:18px!important}\n.crm-recent-notes{margin-top:6px!important}\n.crm-note-preview{display:flex;align-items:center;gap:12px;width:100%;border:0;border-bottom:1px solid #e9edf4;background:transparent;padding:10px 5px;text-align:left;color:#293b56;cursor:pointer}\n.crm-note-preview span{flex:1;min-width:0}.crm-note-preview strong,.crm-note-preview small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.crm-note-preview strong{font-size:12px}.crm-note-preview small{font-size:11px;color:#8793a8}.crm-note-preview time{font-size:11px;color:#8290a5}\n.crm-notes-layout{display:grid;grid-template-columns:minmax(270px,370px) minmax(0,1fr);gap:20px;align-items:start}\n.crm-notes-editor,.crm-notes-list{background:#fff;border:1px solid #dce5f3;border-radius:15px;padding:22px;box-shadow:0 6px 22px rgba(24,48,84,.06)}\n.crm-notes-editor h3,.crm-notes-list h3{margin:0 0 19px;font-size:17px;color:#17233b}\n.crm-notes-editor label{display:block;font-size:12px;font-weight:650;color:#465570;margin-bottom:15px}.crm-notes-editor label input,.crm-notes-editor label select,.crm-notes-editor label textarea{display:block;margin-top:7px}\n.crm-primary-btn,.crm-secondary-btn{border-radius:9px;border:1px solid #2474e6;padding:10px 15px;cursor:pointer;font-weight:650}.crm-primary-btn{background:#2474e6;color:white}.crm-secondary-btn{background:white;color:#2474e6}\n.crm-notes-list-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.crm-notes-list-head h3{margin:0}\n.crm-note-card{border:1px solid #e4eaf4;border-radius:12px;padding:17px;margin-bottom:12px;background:#fbfcff}.crm-note-card-top{display:flex;justify-content:space-between;gap:12px}.crm-note-card h4{font-size:14px;margin:0 0 5px}.crm-note-card small{color:#8592a7;font-size:11px}.crm-note-card p{font-size:12px;line-height:1.7;white-space:pre-wrap;color:#4c5a70;margin:12px 0 0}.crm-note-card-top button{background:transparent;border:0;color:#2573dc;cursor:pointer;font-size:11px;padding:5px}.crm-note-card-top .crm-danger-btn{color:#b42318}\n@media(max-width:850px){.crm-notes-layout{grid-template-columns:1fr}.matrice-sidebar{width:272px!important}}\n'}{'\n.matrice-shell{display:flex;min-height:100vh;background:#f6f8fc;color:#17233b;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.matrice-shell button{font-family:inherit}.matrice-sidebar{width:244px;flex:0 0 244px;background:#fff;border-right:1px solid #e6eaf1;min-height:100vh;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;z-index:50}.matrice-brand{height:72px;display:flex;align-items:center;gap:9px;padding:0 18px;border-bottom:1px solid #eef0f5}.matrice-brand-icon{font-size:25px;color:#4a78d7}.matrice-brand strong{font-size:16px;letter-spacing:.035em;font-weight:800}.matrice-brand span{font-size:11px;color:#8a95a8;margin-left:5px;font-weight:700}.matrice-close-menu{display:none}.matrice-nav-scroll{padding:14px 10px;overflow-y:auto;flex:1}.matrice-nav-main,.matrice-nav-group-title,.matrice-subnav button{width:100%;display:flex;align-items:center;text-align:left;border:0;background:transparent;color:#34415a;cursor:pointer;border-radius:8px}.matrice-nav-main{padding:12px 12px;gap:11px;font-size:13px;font-weight:650}.matrice-nav-main.active,.matrice-subnav button.active{background:#e8f1ff;color:#2769df}.matrice-nav-group{margin-top:13px}.matrice-nav-group-title{padding:9px 11px;gap:10px;font-size:12.5px;font-weight:700}.matrice-nav-group-title span{flex:1}.matrice-subnav{margin:3px 0 0 24px;padding-left:8px;border-left:1px solid #e6ebf4}.matrice-subnav button{padding:8px 9px;gap:9px;font-size:12px;line-height:1.3;margin-bottom:2px}.matrice-nav-main:hover,.matrice-nav-group-title:hover,.matrice-subnav button:hover{background:#f2f6fd}.matrice-sidebar-foot{padding:14px 17px;border-top:1px solid #eef0f5;color:#586780;font-size:11px}.matrice-sidebar-foot small{display:block;margin:4px 0 0 16px;color:#9aa4b5}.matrice-status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#29b98d;margin-right:7px}.matrice-workspace{min-width:0;flex:1}.matrice-topbar{height:72px;background:#fff;border-bottom:1px solid #e6eaf1;display:flex;align-items:center;padding:0 28px;gap:12px;position:sticky;top:0;z-index:30}.matrice-topbar-label{font-size:13px;font-weight:650;color:#637089}.matrice-menu-button,.matrice-topbar-actions button{border:0;background:transparent;color:#41516e;cursor:pointer;padding:7px;display:flex;align-items:center}.matrice-menu-button{display:none}.matrice-topbar-actions{display:flex;align-items:center;gap:13px;margin-left:auto}.matrice-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1b3868;color:#fff;font-size:11px;font-weight:750}.matrice-main{padding:26px 30px;max-width:1600px;margin:auto}.matrice-welcome{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:23px}.matrice-welcome h1{font-size:24px;letter-spacing:-.6px;margin:0 0 5px;font-weight:760;color:#15243c}.matrice-welcome p{font-size:12px;color:#8390a3;margin:0}.matrice-add{display:flex;align-items:center;gap:6px;padding:9px 12px;border:1px solid #dce6f7;border-radius:9px;background:#fff;color:#2b70e6;font-size:12px;font-weight:650;cursor:pointer}.matrice-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}.matrice-metric{min-width:0;text-align:left;border:1px solid #e6eaf1;border-radius:13px;background:#fff;padding:17px;display:flex;gap:12px;align-items:flex-start;cursor:pointer;box-shadow:0 2px 8px rgba(20,38,70,.025)}.matrice-metric-icon{display:flex;align-items:center;justify-content:center;flex:0 0 37px;height:37px;background:#eaf2ff;color:#3e7bef;border-radius:9px}.matrice-metric span:last-child{min-width:0}.matrice-metric small,.matrice-metric em{display:block;font-size:11px;color:#8490a2;font-style:normal}.matrice-metric strong{display:block;color:#15243c;font-size:21px;line-height:1.6;white-space:nowrap;letter-spacing:-.5px}.matrice-metric em{font-size:10px}.matrice-two{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.matrice-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}.matrice-section-head h3{font-size:14px;font-weight:750;margin:0;color:#17233b}.matrice-section-head button{border:0;background:transparent;display:flex;align-items:center;gap:3px;font-size:11px;color:#3677e9;cursor:pointer}.matrice-total{font-size:11px;color:#8490a2;margin-bottom:16px}.matrice-total strong{color:#25334d;margin-left:5px}.matrice-pipeline-row{display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:11px}.matrice-dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%}.matrice-pipeline-name{width:105px;flex:0 0 105px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#44536c}.matrice-track{height:7px;border-radius:9px;background:#edf2fa;flex:1;min-width:15px;overflow:hidden}.matrice-track div{height:100%;border-radius:9px}.matrice-pipeline-row strong{width:75px;text-align:right;font-size:11px;white-space:nowrap}.matrice-percent{width:30px;text-align:right;color:#7e8ba0;font-size:10px}.matrice-chart-sub{font-size:11px;color:#8c98a9;margin:-6px 0 8px}.matrice-empty{color:#8b97a8;font-size:12px;padding:17px 0}.matrice-event{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f0f2f7;font-size:12px}.matrice-event-time{color:#65748c;min-width:42px}.matrice-event-mark{width:6px;height:20px;border-radius:4px;background:#4d8cf5}.matrice-event-name{font-weight:600;color:#34415a}.matrice-opportunity{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #f0f2f7}.matrice-opportunity-mark{height:8px;width:8px;border-radius:50%;flex-shrink:0}.matrice-opportunity div{min-width:0;flex:1}.matrice-opportunity strong,.matrice-opportunity small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.matrice-opportunity strong{font-size:12px;color:#33415a}.matrice-opportunity small{font-size:10px;color:#8995a8;margin-top:3px}.matrice-opportunity b{font-size:12px;white-space:nowrap}.matrice-backdrop{display:none}@media(max-width:1150px){.matrice-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.matrice-two{grid-template-columns:1fr}}@media(max-width:768px){.matrice-sidebar{position:fixed;left:0;top:0;transform:translateX(-100%);transition:transform .2s;box-shadow:4px 0 25px rgba(25,43,77,.12)}.matrice-sidebar.is-open{transform:translateX(0)}.matrice-close-menu{display:block;margin-left:auto;border:0;background:transparent;font-size:25px;color:#8793a7}.matrice-backdrop{display:block;position:fixed;inset:0;background:rgba(20,32,56,.32);z-index:45}.matrice-menu-button{display:flex}.matrice-topbar{height:60px;padding:0 14px}.matrice-main{padding:17px 13px!important}.matrice-welcome h1{font-size:20px}.matrice-welcome p{font-size:11px}.matrice-add{font-size:0}.matrice-add svg{width:17px}.matrice-metrics{gap:9px}.matrice-metric{padding:11px;gap:8px}.matrice-metric-icon{width:30px;height:30px;flex-basis:30px}.matrice-metric strong{font-size:16px}.matrice-metric small{font-size:10px}.matrice-metric em{font-size:9px}.matrice-pipeline-name{width:75px;flex-basis:75px}.matrice-pipeline-row strong{width:63px;font-size:10px}}\n' + "* { box-sizing: border-box; } body { transition: background 0.2s ease; } button { transition: all 0.18s ease; } button:hover:not(:disabled) { filter: brightness(0.96); transform: translateY(-1px); } button:active:not(:disabled) { transform: translateY(0) scale(0.98); } input, select, textarea { transition: border-color 0.18s ease, box-shadow 0.18s ease; } input:focus, select:focus, textarea:focus { outline: none; border-color: #0b7bc4 !important; box-shadow: 0 0 0 3px rgba(11,123,196,0.12); } .dashboard-card { transition: transform 0.2s ease, box-shadow 0.2s ease; } .dashboard-card:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(11,123,196,0.14) !important; } .nav-item { transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; } .nav-item:hover { background: #f2f8fc !important; } table tbody tr { transition: background 0.15s ease; } table tbody tr:hover { background: #f7fbfe; } @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } .page-content { animation: fadeSlideIn 0.25s ease; } .app-sidebar-backdrop { display: none; } @media (max-width: 768px) { main * { min-width: 0; } body { overflow-x: hidden; } .app-sidebar { position: fixed !important; top: 61px; left: 0; height: calc(100vh - 61px) !important; z-index: 40; box-shadow: 4px 0 16px rgba(0,0,0,0.15); } .app-sidebar-backdrop { display: block !important; position: fixed; top: 61px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.35); z-index: 35; } table { display: block; overflow-x: auto; white-space: nowrap; } .tabella-righe-preventivo, .tabella-responsive { white-space: normal; } .tabella-righe-preventivo thead, .tabella-responsive thead { display: none; } .tabella-righe-preventivo, .tabella-righe-preventivo tbody, .tabella-righe-preventivo tr, .tabella-righe-preventivo td, .tabella-responsive, .tabella-responsive tbody, .tabella-responsive tr, .tabella-responsive td { display: block; width: 100%; } .tabella-righe-preventivo tr, .tabella-responsive tr { border: 1px solid #e2edf5; border-radius: 6px; margin-bottom: 6px; padding: 4px; } .tabella-righe-preventivo td, .tabella-responsive td { display: flex; align-items: flex-start; justify-content: flex-start; flex-direction: column; gap: 1px; padding: 3px 4px; border: none; font-size: 11.5px; width: 100%; max-width: 100%; } .tabella-righe-preventivo td::before, .tabella-responsive td::before { content: attr(data-label); font-size: 9px; color: #7c8b98; } .tabella-righe-preventivo td input, .tabella-righe-preventivo td select { width: 100% !important; max-width: 100% !important; flex: none; } .form-header-preventivo select, .form-header-preventivo input { max-width: none !important; width: 100% !important; } input, select, textarea { font-size: 16px !important; } main:not(.matrice-main) { padding: 10px !important; } .email-utente { display: none; } header { padding: 10px 12px !important; } h2 { font-size: 17px !important; margin-bottom: 8px !important; } h3 { font-size: 13px !important; } }"}</style>
  );
}


function StileAnagraficheApple() { return <style>{`
/* Schede anagrafiche e mandanti: stile iOS, senza alterare il calendario */
.crm-anagrafiche-premium button:focus-visible, .crm-mandanti-premium button:focus-visible { outline: 3px solid #84bfff; outline-offset: 2px; }
.crm-anagrafiche-premium input:focus, .crm-anagrafiche-premium select:focus,
.crm-mandanti-premium input:focus, .crm-mandanti-premium select:focus { outline: none; border-color: #4b9ff0 !important; box-shadow: 0 0 0 3px #2384e819; }
.crm-anagrafiche-premium input, .crm-anagrafiche-premium select,
.crm-mandanti-premium input, .crm-mandanti-premium select { transition: border-color .16s ease, box-shadow .16s ease; }
.crm-anagrafiche-premium button, .crm-mandanti-premium button { transition: background-color .15s ease, box-shadow .15s ease; }
@media(max-width:700px) {
  .crm-anagrafiche-premium, .crm-mandanti-premium { min-width:0; }
  .crm-anagrafiche-premium input, .crm-anagrafiche-premium select,
  .crm-mandanti-premium input, .crm-mandanti-premium select { font-size:16px !important; }
  .crm-anagrafiche-premium button, .crm-mandanti-premium button { min-height:36px; }
}
`}</style>; }

function StilePremium2026() { return <style>{`

/* Preventivi: esclusivamente restyling visuale, senza alterare campi, ordine o logica. */
.crm-preventivi-premium{font-family:inherit!important;color:#23364c}
.crm-preventivi-premium h2{font-family:inherit!important;font-size:clamp(20px,2.5vw,25px)!important;font-weight:750!important;letter-spacing:-.45px!important;color:#1d344e!important}
.crm-preventivi-premium h3{font-family:inherit!important;font-size:15px!important;font-weight:730!important;letter-spacing:-.15px!important;color:#24405e!important}
.crm-preventivi-premium input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
.crm-preventivi-premium select,.crm-preventivi-premium textarea{font-family:inherit!important;border-radius:10px!important;border-color:#dbe5f0!important;background-color:#fff!important;color:#263b53!important;transition:border-color .15s ease,box-shadow .15s ease}
.crm-preventivi-premium input:focus,.crm-preventivi-premium select:focus,.crm-preventivi-premium textarea:focus{outline:2px solid #bcd9fc!important;outline-offset:1px;border-color:#4b91e7!important}
.crm-preventivi-premium button{font-family:inherit!important;letter-spacing:0!important;transition:filter .15s ease,box-shadow .15s ease}
.crm-preventivi-premium button:hover{filter:brightness(.97)}
.crm-preventivi-premium table{font-family:inherit!important}
.crm-preventivi-premium th{font-weight:700!important;color:#395574!important}
.crm-preventivi-premium td{color:#34495f}
@media(max-width:767px){.crm-preventivi-premium h2{font-size:21px!important}.crm-preventivi-premium input,.crm-preventivi-premium select,.crm-preventivi-premium textarea{max-width:100%;box-sizing:border-box}}

.crm-task-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:15px 0}
.crm-task-count{border:0;border-radius:12px;padding:13px 15px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:5px}
.crm-task-count span{font-size:12px;font-weight:650}.crm-task-count strong{font-size:25px;font-weight:750}
.crm-task-list{display:flex;flex-direction:column}.crm-task-row{display:flex;align-items:center;gap:12px;padding:12px 2px;border-top:1px solid #edf1f6}
.crm-task-check{border:1px solid #b7cbe1;background:white;color:#1267e9;border-radius:8px;min-width:29px;height:29px;display:grid;place-items:center;cursor:pointer}
.crm-task-check:disabled{opacity:.45;cursor:wait}.crm-task-info{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}.crm-task-info strong{font-size:13px;color:#203348;overflow-wrap:anywhere}.crm-task-info small{font-size:11px;color:#718094}.crm-task-priority{font-size:11px;font-weight:650}
@media(max-width:600px){.crm-task-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.crm-task-count{padding:11px}.crm-task-count strong{font-size:22px}}

/* CRM sviluppo — interfaccia chiara 2026, solo presentazione */
.matrice-shell{background:#f7f9fd!important;color:#17253b!important}
.matrice-sidebar{background:#fff!important;border-right:1px solid #e8edf5!important;color:#27364e!important;box-shadow:none!important}
.matrice-brand{border-bottom:1px solid #eef1f6!important;color:#1b3155!important}
.matrice-brand strong{color:#1c355e!important;font-size:21px!important;letter-spacing:-.7px!important}
.matrice-brand-icon{color:#3779e8!important;background:#eaf2ff!important;border-radius:12px!important;padding:7px!important;display:flex!important}
.matrice-nav-main,.matrice-nav-group-title,.matrice-subnav button{color:#465873!important;font-weight:600!important}
.matrice-nav-main:hover,.matrice-nav-group-title:hover,.matrice-subnav button:hover{background:#f2f6fc!important;color:#205bc5!important}
.matrice-nav-main.active,.matrice-subnav button.active{background:#eaf2ff!important;color:#2469d9!important;box-shadow:inset 3px 0 0 #3479ee!important}
.matrice-nav-group{margin-top:10px!important}
.matrice-nav-group-title{font-size:12px!important;color:#5a6b85!important}
.matrice-subnav{border-left:1px solid #e8edf5!important}
.matrice-sidebar-foot{background:#fbfcff!important;border-top:1px solid #e9eef6!important;color:#64748b!important}
.matrice-sidebar-foot small{color:#96a3b5!important}
.matrice-topbar{background:rgba(255,255,255,.97)!important;border-bottom:1px solid #e8edf5!important;backdrop-filter:blur(14px)}
.matrice-main{max-width:1550px!important}
.matrice-topbar-label{font-weight:750!important;color:#263e60!important}
.matrice-avatar{background:#e9f1ff!important;color:#2468d9!important;border:1px solid #d4e4ff!important}
.matrice-welcome{background:#fff;border:1px solid #e8edf5;border-radius:20px;padding:22px 24px;box-shadow:0 5px 20px rgba(28,58,104,.035);flex-wrap:wrap}
.matrice-welcome h1{font-size:26px!important;color:#1b2f4d!important}
.matrice-dashboard-quick,.crm-dashboard-quick{display:flex;gap:8px;flex-wrap:wrap}
.matrice-add{background:#f4f8ff!important;border:1px solid #e1ebfb!important;color:#2e70d9!important;border-radius:11px!important;padding:10px 13px!important;font-size:12px!important}
.matrice-metric{border:1px solid #e7edf6!important;border-radius:17px!important;background:#fff!important;box-shadow:0 5px 19px rgba(25,54,96,.045)!important;padding:19px!important}
.matrice-metric:first-child{background:#fff!important;border-color:#e7edf6!important}
.matrice-metric:first-child strong{color:#1b2f4d!important}.matrice-metric:first-child small,.matrice-metric:first-child em{color:#8490a2!important}
.matrice-metric-icon,.matrice-metric:first-child .matrice-metric-icon{background:#eaf2ff!important;color:#3579e8!important;border-radius:11px!important}
.matrice-metric strong{font-size:23px!important;color:#1b2f4d!important}
.matrice-dashboard .matrice-two>section,.matrice-dashboard .crm-recent-notes{border:1px solid #e7edf6!important;border-radius:17px!important;box-shadow:0 5px 19px rgba(25,54,96,.045)!important}
.matrice-section-head h3{color:#1e3352!important;font-size:14px!important}
.crm-notes-nav{border-top:1px solid #e9eef6!important}
@media(max-width:768px){
 .matrice-sidebar{background:#fff!important;box-shadow:8px 0 35px rgba(27,47,78,.15)!important}
 .matrice-welcome{padding:15px!important;border-radius:15px!important}
 .matrice-welcome h1{font-size:21px!important}
 .crm-dashboard-quick{width:100%;gap:6px}
 .crm-dashboard-quick .matrice-add{font-size:11px!important;flex:1;justify-content:center;padding:9px 5px!important}
 .crm-dashboard-quick .matrice-add svg{width:14px;height:14px}
 .matrice-metric{padding:12px!important;border-radius:13px!important}
 .matrice-metric strong{font-size:17px!important}
}
`}</style>; }

async function rinnovaSessione(refreshToken) {
  try {
    const res = await crmFetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// Sessione salvata soltanto sul dispositivo e sul dominio corrente (sviluppo).
const CRM_SESSION_KEY = "crm_arredo_bagno_session_v1";

function leggiSessioneSalvata() {
  try {
    const value = window.localStorage.getItem(CRM_SESSION_KEY);
    const sessione = value ? JSON.parse(value) : null;
    return sessione?.access_token && sessione?.refresh_token ? sessione : null;
  } catch {
    return null;
  }
}

function salvaSessione(sessione) {
  try {
    if (sessione?.access_token && sessione?.refresh_token) {
      window.localStorage.setItem(CRM_SESSION_KEY, JSON.stringify(sessione));
    } else {
      window.localStorage.removeItem(CRM_SESSION_KEY);
    }
  } catch (error) {
    console.warn("Impossibile memorizzare la sessione:", error);
  }
}

function scadenzaSessione(sessione) {
  if (sessione?.expires_at) return Number(sessione.expires_at) * 1000;
  return 0;
}


function StileRiferimentoFotoCRM() { return <style>{`
  :root { --crm-ref-blue:#0865ed; --crm-ref-border:#e6eaf0; --crm-ref-ink:#111827; }
  .matrice-shell {background:#f8f9fc!important;color:var(--crm-ref-ink)!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important}
  .matrice-sidebar {background:#fff!important;border-right:1px solid #e6eaf0!important;color:#182135!important;box-shadow:none!important}
  .matrice-brand {background:#fff!important;color:#101828!important;border-bottom:1px solid #e8ebf0!important}
  .matrice-brand strong {font-size:17px!important;color:#111827!important}
  .matrice-brand-icon {color:#0865ed!important}
  .matrice-nav-main,.matrice-nav-group-title,.matrice-subnav button {color:#202a3a!important}
  .matrice-nav-main:hover,.matrice-nav-group-title:hover,.matrice-subnav button:hover {background:#f1f5fb!important;color:#145bd5!important}
  .matrice-nav-main.active,.matrice-subnav button.active {background:#dbeafe!important;color:#075fe4!important;box-shadow:none!important}
  .matrice-sidebar-foot {border-color:#e8ebf0!important;color:#667085!important}
  .matrice-sidebar-foot small {color:#98a2b3!important}
  .matrice-topbar {background:#fff!important;border-bottom:1px solid #e8ebf0!important}
  .crm-ref-page {font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important;color:#172033}
  .crm-ref-heading {display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 18px}
  .crm-ref-heading h2 {font-size:23px!important;font-weight:800;letter-spacing:-.6px;margin:0!important;color:#121a2b!important}
  .crm-ref-primary {border:0;border-radius:7px;background:#0865ed;color:#fff;padding:11px 15px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;box-shadow:0 3px 9px #0865ed25}
  .crm-ref-layout {display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}
  .crm-ref-form {max-width:410px!important;flex:1 1 310px!important;box-shadow:0 5px 20px #1d2a4410!important}
  .crm-ref-list-area {flex:1 1 400px;min-width:0;background:#fff;border:1px solid var(--crm-ref-border);border-radius:13px;padding:18px;box-shadow:0 4px 15px #14233d0c}
  .crm-ref-tools {display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
  .crm-ref-search {border:1px solid #d9e0ea;border-radius:8px;display:flex;align-items:center;gap:9px;padding:0 11px;flex:1 1 230px;min-width:0;color:#64748b;background:#fff}
  .crm-ref-search input {border:0!important;outline:0!important;box-shadow:none!important;padding:11px 0;font-size:13px;flex:1;min-width:0;color:#101828;background:transparent}
  .crm-ref-tools select {border:1px solid #d9e0ea;background:#fff;border-radius:8px;padding:11px;font-size:12px;max-width:100%;color:#344054}
  .crm-ref-tabs {display:flex;gap:7px;align-items:center;border-bottom:1px solid #edf0f4;margin-bottom:8px;padding-bottom:10px}
  .crm-ref-tabs button {border:0;background:#f4f6f9;color:#3b4557;border-radius:7px;padding:9px 13px;font-size:12px;font-weight:700;cursor:pointer}
  .crm-ref-tabs button.active {background:#0865ed;color:white}
  .crm-ref-desktop table {display:table!important;width:100%;border-collapse:collapse;white-space:normal!important;font-size:12px}
  .crm-ref-desktop th {padding:13px 9px;text-align:left;background:#f7f8fa;font-size:11px;font-weight:750;color:#263144}
  .crm-ref-desktop td {padding:12px 9px;border-bottom:1px solid #edf0f4;color:#475467;vertical-align:middle}
  .crm-ref-name {display:flex;align-items:center;gap:10px;border:0;background:transparent;cursor:pointer;color:#111827;text-align:left;padding:0}
  .crm-ref-name strong {font-size:12px;color:#121b2d}
  .crm-ref-avatar {width:34px;height:34px;border-radius:50%;flex:0 0 34px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;letter-spacing:-.3px}
  .crm-ref-star {border:0;background:transparent;color:#53647e;font-size:24px;cursor:pointer;line-height:1;padding:5px}
  .crm-ref-star.is-favorite {color:#f2ad00}
  .crm-ref-action,.crm-ref-delete {border:0;background:transparent;cursor:pointer;color:#0865ed;font-size:11px;font-weight:650;padding:5px}
  .crm-ref-delete {color:#bf3b44}
  .crm-ref-mobile {display:none}
  .crm-ref-empty {text-align:center;color:#8b95a5;font-size:13px;padding:25px 10px}
  .crm-mandanti-premium .crm-ref-list-area > div:first-child {margin-bottom:15px!important}
  .crm-mandanti-premium .crm-ref-list-area input[aria-label="Cerca aziende mandanti"] {border:1px solid #d9e0ea!important;border-radius:8px!important;padding:11px 12px!important}
  @media(max-width:768px) {
    .crm-ref-heading h2 {font-size:19px!important}
    .crm-ref-primary {padding:10px 12px;font-size:11px}
    .crm-ref-list-area {padding:10px 11px;border-radius:12px;flex-basis:100%;box-shadow:none}
    .crm-ref-desktop {display:none!important}
    .crm-ref-mobile {display:block}
    .crm-ref-mobile-row {display:flex;align-items:center;gap:6px;min-height:67px;border-bottom:1px solid #edf0f4;padding:9px 0}
    .crm-ref-mobile-row:last-child {border-bottom:0}
    .crm-ref-mobile-open {flex:1;min-width:0;display:flex;align-items:center;gap:11px;background:none;border:0;text-align:left;padding:0;cursor:pointer}
    .crm-ref-mobile-copy {display:block;min-width:0;flex:1}
    .crm-ref-mobile-copy strong {display:block;font-size:13px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .crm-ref-mobile-copy small {display:block;font-size:11px;color:#667085;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .crm-ref-chevron {border:0;background:transparent;color:#53647e;padding:2px}
    .crm-ref-tabs {overflow-x:auto;white-space:nowrap}
    .crm-ref-form {max-width:100%!important;flex-basis:100%!important}
    .crm-ref-tools select {flex:1 1 100%}
    .crm-mandanti-premium .tabella-responsive {display:none!important}
    .crm-mandanti-premium .crm-ref-list-area > div:has(> div > strong) {box-shadow:none}
  }
`}</style>; }

export default function App() {
  const [session, setSession] = useState(() => leggiSessioneSalvata());
  const [verificaAccesso, setVerificaAccesso] = useState(true);
  const refreshInCorso = useRef(null);

  const aggiornaSessione = (nuova) => {
    setSession(nuova);
    salvaSessione(nuova);
  };

  const verificaERinnova = async (sessione) => {
    if (!sessione?.refresh_token) return null;
    // Evita richieste contemporanee: i refresh token Supabase ruotano.
    if (refreshInCorso.current) return refreshInCorso.current;
    const promessa = (async () => {
      const risposta = await rinnovaSessione(sessione.refresh_token);
      if (risposta?.access_token && risposta?.refresh_token) {
        const aggiornata = {
          ...sessione,
          ...risposta,
          expires_at: risposta.expires_at || Math.floor(Date.now() / 1000) + (risposta.expires_in || 3600),
        };
        aggiornaSessione(aggiornata);
        return aggiornata;
      }
      return null;
    })();
    refreshInCorso.current = promessa;
    try { return await promessa; }
    finally { refreshInCorso.current = null; }
  };

  // All'apertura prova a recuperare una sessione valida, anche dopo la chiusura della PWA.
  useEffect(() => {
    let attivo = true;
    (async () => {
      const salvata = leggiSessioneSalvata();
      if (salvata) {
        const scadenza = scadenzaSessione(salvata);
        if (!scadenza || scadenza <= Date.now() + 60000) {
          await verificaERinnova(salvata);
        }
      }
      if (attivo) setVerificaAccesso(false);
    })();
    return () => { attivo = false; };
  }, []);

  // Rinnova la sessione prima della scadenza, mentre il CRM rimane aperto.
  useEffect(() => {
    if (!session?.refresh_token) return;
    const scadenza = scadenzaSessione(session);
    const attesa = scadenza ? Math.max(1000, scadenza - Date.now() - 5 * 60 * 1000) : 30000;
    const timer = setTimeout(() => { verificaERinnova(session); }, attesa);
    return () => clearTimeout(timer);
  }, [session]);

  // Quando l'iPhone riporta l'app in primo piano, controlla se serve rinnovare.
  useEffect(() => {
    const tornaAttivo = () => {
      if (document.visibilityState !== "visible") return;
      const salvata = leggiSessioneSalvata();
      if (salvata && (!scadenzaSessione(salvata) || scadenzaSessione(salvata) < Date.now() + 60000)) {
        verificaERinnova(salvata);
      }
    };
    document.addEventListener("visibilitychange", tornaAttivo);
    return () => document.removeEventListener("visibilitychange", tornaAttivo);
  }, []);

  return (
    <>
      <style>{`
        input:not([type="checkbox"]):not([type="radio"]):not([type="color"]),
        textarea {
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif !important;
          font-size: 14px !important;
          font-weight: 450 !important;
          letter-spacing: 0.005em;
          line-height: 1.45;
        }
        input::placeholder, textarea::placeholder { color: #9aa7b9; font-weight: 400; }
        input:focus, textarea:focus { border-color: #4784e9 !important; box-shadow: 0 0 0 3px rgba(71,132,233,.12) !important; }
        @media(max-width:768px) {
          input:not([type="checkbox"]):not([type="radio"]):not([type="color"]),
          textarea { font-size: 16px !important; }
        }
      `}</style>
      <StileMobileCRM />
      <StilePremium2026 />
      <StileAnagraficheApple />
      <StileNavigazionePremiumCRM />
      <StileModuliPremiumCRM />
      <StileGlobaleResponsive />
      {verificaAccesso ? (
        <div style={{ padding: 36, textAlign: "center", color: "#17233b" }}>Ripristino accesso al CRM...</div>
      ) : !session ? (
        <LoginScreen onLogin={(data) => aggiornaSessione({ ...data, expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600) })} />
      ) : (
        <AppShell session={session} onLogout={() => aggiornaSessione(null)} />
      )}
    </>
  );
}
