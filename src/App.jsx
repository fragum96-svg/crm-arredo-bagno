import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Building2,
  CalendarDays,
  FileText,
  LogOut,
  Menu as MenuIcon,
  LayoutDashboard,
  ShieldCheck,
  Printer,
  Map as MapIcon,
  Upload,
  TrendingUp,
  Wallet,
  ClipboardList,
  Briefcase,
  Users2,
} from "lucide-react";

// ============================================================
// CONFIGURAZIONE SUPABASE
// ============================================================
const SUPABASE_URL = "https://hifwdbjkerlfjbgwhpxc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZndkYmprZXJsZmpiZ3docHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTEzMTYsImV4cCI6MjA5OTU2NzMxNn0.wAPiUA4YU9ofHJgDrtFBHAFLzEuOAnAwMdX4Elk3Bsc";

const COLORS = {
  primary: "#0b7bc4",
  primaryDark: "#075985",
  bg: "#f7fafc",
  card: "#ffffff",
  border: "#e2edf5",
  text: "#233242",
  muted: "#7c8b98",
  danger: "#c0392b",
  success: "#1a7a3c",
};

const MESI_BREVI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const GIORNI_SETTIMANA = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const CLASSIFICAZIONI = ["Architetto", "Contractor", "Showroom", "Rivenditore termoidraulica", "Professionista", "Impresa", "Privato"];
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
  const authHeaders = (token) => ({
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${token || key}`,
  });
  return {
    auth: {
      async signInWithPassword({ email, password }) {
        const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        return { data, error: null };
      },
      async signUp({ email, password }) {
        const res = await fetch(`${url}/auth/v1/signup`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        return { data, error: null };
      },
    },
  };
}

async function geocodificaIndirizzo(indirizzo) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(indirizzo)}`
    );
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
    await fetch(`${SUPABASE_URL}/rest/v1/attivita_cliente`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ cliente_id: clienteId, tipo, descrizione }),
    });
  } catch (e) {}
}

async function caricaFileStorage(session, bucket, path, file) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: file,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Errore nel caricamento del file");
  }
  return path;
}

function urlPubblicoStorage(bucket, path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthGrid(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = startOfWeek(firstOfMonth);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function getWeekDays(date) {
  const start = startOfWeek(date);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function nuovaRiga() {
  return {
    id: Math.random().toString(36).slice(2),
    articolo: "",
    descrizione: "",
    finitura: "",
    quantita: 1,
    prezzo_unitario: 0,
    sconto1: 0,
    sconto2: 0,
    prezzo_netto_manuale: "",
  };
}

function calcolaRigaNetto(riga) {
  const totaleListino = (Number(riga.quantita) || 0) * (Number(riga.prezzo_unitario) || 0);
  if (riga.prezzo_netto_manuale !== undefined && riga.prezzo_netto_manuale !== "" && riga.prezzo_netto_manuale !== null) {
    return { totaleListino, netto: Number(riga.prezzo_netto_manuale) || 0 };
  }
  const dopoSconto1 = totaleListino * (1 - (Number(riga.sconto1) || 0) / 100);
  const dopoSconto2 = dopoSconto1 * (1 - (Number(riga.sconto2) || 0) / 100);
  return { totaleListino, netto: dopoSconto2 };
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
  return ordini
    .filter((ordine) => ordine.azienda_id === aziendaId)
    .map((ordine) => ({ cliente_id: ordine.cliente_id, importo: Number(ordine.importo) || 0, data: ordine.data_ordine }));
}

function generaStampaHTML(preventivo, clienti, aziende) {
  const cliente = clienti.find((c) => c.id === preventivo.cliente_id);
  const azienda = aziende.find((a) => a.id === preventivo.azienda_id);
  const righeArr = preventivo.righe || [];
  const tot = calcolaTotaliPreventivo(preventivo, righeArr);
  const soloNetto = preventivo.modalita_prezzi_pdf === "solo_netto";

  const intestazioneColonne = soloNetto
    ? `<th>Articolo</th><th>Descrizione</th><th>Finitura</th><th>Qtà</th><th>Prezzo netto un.</th><th>Prezzo netto totale</th>`
    : `<th>Articolo</th><th>Descrizione</th><th>Finitura</th><th>Qtà</th><th>Prezzo listino un.</th><th>Sc.1</th><th>Sc.2</th><th>Prezzo netto un.</th><th>Prezzo netto totale</th>`;

  const righeHtml = righeArr
    .map((riga) => {
      const { netto } = calcolaRigaNetto(riga);
      const qta = Number(riga.quantita) || 0;
      const nettoUnitario = qta > 0 ? netto / qta : netto;
      if (soloNetto) {
        return `<tr><td>${riga.articolo || ""}</td><td>${riga.descrizione || ""}</td><td>${riga.finitura || ""}</td><td>${riga.quantita || ""}</td><td>${formattaNumero(nettoUnitario)}</td><td>${formattaNumero(netto)}</td></tr>`;
      }
      return `<tr><td>${riga.articolo || ""}</td><td>${riga.descrizione || ""}</td><td>${riga.finitura || ""}</td><td>${riga.quantita || ""}</td><td>${formattaNumero(riga.prezzo_unitario)}</td><td>${riga.sconto1 || 0}%</td><td>${riga.sconto2 || 0}%</td><td>${formattaNumero(nettoUnitario)}</td><td>${formattaNumero(netto)}</td></tr>`;
    })
    .join("");

  const rigaVoce = (label, modalita, valore, valoreGrezzo) => {
    if (modalita === "nascosto") return "";
    if (modalita === "escluso") return `<div>${label}: escluso</div>`;
    if (modalita === "euro" && valoreGrezzo !== undefined && valoreGrezzo !== "" && isNaN(parseFloat(String(valoreGrezzo).replace(",", ".")))) {
      return `<div>${label}: ${valoreGrezzo}</div>`;
    }
    return `<div>${label}: ${formattaNumero(valore)}</div>`;
  };

  return `<!doctype html><html><head><meta charset="utf-8"><title>Preventivo ${preventivo.rif || ""}</title>
  <style>
    body{font-family:Arial, sans-serif; padding:40px; color:#1a1a1a;}
    h1{color:#1a1a1a; font-size:22px; margin-bottom:2px; font-weight:700;}
    p{font-size:13px; margin:2px 0; color:#1a1a1a;}
    table{width:100%; border-collapse:collapse; margin-top:20px;}
    th,td{border-bottom:1px solid #ddd; padding:8px; text-align:left; font-size:12px; color:#1a1a1a;}
    th{color:#555; font-weight:600;}
    .totali{margin-top:20px; text-align:right; font-size:13px;}
    .totali strong{font-size:16px; color:#1a1a1a; border-top:2px solid #1a1a1a; padding-top:6px; display:inline-block;}
  </style></head>
  <body>
    <h1>${azienda ? azienda.nome : ""}</h1>
    <p>Data: ${preventivo.data ? new Date(preventivo.data).toLocaleDateString("it-IT") : ""}</p>
    <p>Spettabile: ${cliente ? cliente.ragione_sociale : (preventivo.cliente_manuale || "")}${preventivo.rif ? ` — Rif. ${preventivo.rif}` : ""}</p>
    <table>
      <thead><tr>${intestazioneColonne}</tr></thead>
      <tbody>${righeHtml}</tbody>
    </table>
    <div class="totali">
      ${rigaVoce("Imballo", preventivo.imballo_modalita, tot.valoreImballo, preventivo.imballo_valore)}
      ${rigaVoce("Trasporto", preventivo.trasporto_modalita, tot.valoreTrasporto, preventivo.trasporto_valore)}
      ${rigaVoce("IVA", preventivo.iva_modalita, tot.valoreIva, preventivo.iva_valore)}
      <div><strong>Totale: ${formattaNumero(tot.totaleFinale)}</strong></div>
    </div>
    ${preventivo.modalita_pagamento ? `<p style="margin-top:20px;"><strong>Modalità di pagamento:</strong> ${preventivo.modalita_pagamento}</p>` : ""}
    ${preventivo.note ? `<p style="margin-top:10px;"><strong>Note:</strong> ${preventivo.note}</p>` : ""}
  </body></html>`;
}

function stampaPreventivo(preventivo, clienti, aziende) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(generaStampaHTML(preventivo, clienti, aziende));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

// ============================================================
// SCHERMATA DI LOGIN
// ============================================================
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = !SUPABASE_URL.includes("TUO-PROGETTO");

  const submit = async () => {
    setError("");
    if (!configured) {
      setError("Configurazione Supabase mancante.");
      return;
    }
    setLoading(true);
    try {
      const client = makeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.error_description || error.msg || "Email o password non corrette.");
        return;
      }
      onLogin(data);
    } catch (err) {
      setError("Errore di connessione a Supabase: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${COLORS.bg} 0%, #e8f3fa 100%)`, fontFamily: "Arial, sans-serif" }}>
      <div style={{ width: 360, padding: 36, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 12px 40px rgba(11,123,196,0.12)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <ShieldCheck size={22} color="#fff" />
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>CRM Arredo Bagno</h1>
        <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 24 }}>Accedi con le credenziali che ti sono state fornite</p>
        <label style={{ fontSize: 13, color: "#333", display: "block", marginBottom: 6 }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 16, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
        <label style={{ fontSize: 13, color: "#333", display: "block", marginBottom: 6 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 16, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
        {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "12px 0", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
        <p style={{ fontSize: 11, color: "#9aa7b2", marginTop: 18, textAlign: "center" }}>Le credenziali vengono create dall'amministratore.</p>
      </div>
    </div>
  );
}

// ============================================================
// PANNELLO ADMIN
// ============================================================
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
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=email,role,created_at&order=created_at.desc`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (e) {} finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const tempClient = makeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await tempClient.auth.signUp({ email, password });
      if (error) {
        setMsg({ type: "error", text: error.error_description || error.msg || "Errore nella creazione dell'utente." });
        return;
      }
      setMsg({ type: "success", text: `Utente creato: ${email}.` });
      setEmail("");
      setPassword("");
      loadUsers();
    } catch (err) {
      setMsg({ type: "error", text: "Errore di connessione: " + (err.message || err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>Pannello Admin</h2>
      <div style={{ maxWidth: 420, padding: 24, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, color: COLORS.primary, marginBottom: 4 }}>Crea nuovo utente</h3>
        <input type="email" placeholder="Email utente" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        <input type="text" placeholder="Password provvisoria" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginBottom: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        <button onClick={createUser} disabled={loading} style={{ padding: "10px 18px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Creazione..." : "Crea utente"}
        </button>
        {msg && <div style={{ marginTop: 12, fontSize: 12, color: msg.type === "error" ? COLORS.danger : COLORS.success }}>{msg.text}</div>}
      </div>
      <div style={{ maxWidth: 500, padding: 24, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14 }}>
        <h3 style={{ fontSize: 15, color: COLORS.primary, marginBottom: 4 }}>Utenti creati</h3>
        {loadingUsers ? (
          <p style={{ fontSize: 12, color: COLORS.muted }}>Caricamento...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}><th style={{ padding: "6px 4px" }}>Email</th><th style={{ padding: "6px 4px" }}>Ruolo</th></tr></thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f5f9" }}>
                  <td style={{ padding: "6px 4px" }}>{u.email}</td>
                  <td style={{ padding: "6px 4px" }}>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ session, goTo }) {
  const [counts, setCounts] = useState({ clienti: 0, aziende: 0, visiteMese: 0, preventivi: 0 });
  const [portafoglio, setPortafoglio] = useState(0);
  const [loading, setLoading] = useState(true);

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const inizioMese = new Date();
        inizioMese.setDate(1);
        const inizioMeseStr = inizioMese.toISOString().slice(0, 10);
        const [rClienti, rAziende, rVisite, rPreventivi] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/visite?select=id&data_visita=gte.${inizioMeseStr}`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/preventivi?select=id,stato,fatturato,righe,imballo_modalita,imballo_percentuale,imballo_valore,trasporto_modalita,trasporto_percentuale,trasporto_valore,iva_modalita,iva_percentuale,iva_valore`, { headers: headers() }),
        ]);
        const [dClienti, dAziende, dVisite, dPreventivi] = await Promise.all([rClienti.json(), rAziende.json(), rVisite.json(), rPreventivi.json()]);
        setCounts({
          clienti: Array.isArray(dClienti) ? dClienti.length : 0,
          aziende: Array.isArray(dAziende) ? dAziende.length : 0,
          visiteMese: Array.isArray(dVisite) ? dVisite.length : 0,
          preventivi: Array.isArray(dPreventivi) ? dPreventivi.length : 0,
        });
        const accettatiNonFatturati = (Array.isArray(dPreventivi) ? dPreventivi : []).filter((pv) => pv.stato === "accettato" && !pv.fatturato);
        setPortafoglio(accettatiNonFatturati.reduce((s, pv) => s + calcolaTotaliPreventivo(pv, pv.righe || []).totaleFinale, 0));
      } catch (e) {} finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const cards = [
    { key: "clienti", label: "Clienti", value: counts.clienti, icon: Users, color: "#0b7bc4" },
    { key: "aziende", label: "Aziende mandanti", value: counts.aziende, icon: Building2, color: "#0e9488" },
    { key: "visite", label: "Visite questo mese", value: counts.visiteMese, icon: CalendarDays, color: "#c77d0b" },
    { key: "preventivi", label: "Preventivi totali", value: counts.preventivi, icon: FileText, color: "#7c4dbd" },
  ];

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Dashboard</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>Riepilogo generale della tua attività</p>

      <div className="dashboard-card" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, borderRadius: 14, padding: 20, marginBottom: 20, maxWidth: 320, cursor: "pointer" }} onClick={() => goTo("preventivi")}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>Portafoglio ordini (accettati, non fatturati)</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>{loading ? "…" : formattaEuro(portafoglio)}</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => goTo("visite")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <CalendarDays size={16} /> Vai al Calendario
        </button>
        <button onClick={() => goTo("preventivi")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "#fff", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <FileText size={16} /> Nuovo Preventivo
        </button>
        <button onClick={() => goTo("statistiche")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "#fff", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <TrendingUp size={16} /> Statistiche
        </button>
        <button onClick={() => goTo("fatturato")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "#fff", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Wallet size={16} /> Fatturato
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="dashboard-card" onClick={() => goTo(c.key)} style={{ flex: "1 1 200px", minWidth: 180, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, cursor: "pointer", boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Icon size={20} color={c.color} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.text }}>{loading ? "…" : c.value}</div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{c.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// AZIENDE MANDANTI
// ============================================================
function AziendeMandanti({ session }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadMsg, setUploadMsg] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const emptyForm = { nome: "", sconto1: "", sconto2: "", imballo_percentuale: "", trasporto: "", resi: "", note: "", colore: "#0b7bc4" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=*&order=nome.asc`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel caricamento");
      setList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const trovaColonna = (rigaOggetto, candidati) => {
    const chiavi = Object.keys(rigaOggetto);
    for (const cand of candidati) {
      const trovata = chiavi.find((k) => k.toLowerCase().trim().includes(cand));
      if (trovata) return rigaOggetto[trovata];
    }
    return "";
  };

  const caricaListino = async (aziendaId, file) => {
    setUploadingId(aziendaId);
    setUploadMsg(null);
    try {
      let righeFile = [];
      const nomeFile = file.name.toLowerCase();
      if (nomeFile.endsWith(".csv")) {
        const testo = await file.text();
        const parsed = Papa.parse(testo, { header: true, skipEmptyLines: true, dynamicTyping: true });
        righeFile = parsed.data;
      } else if (nomeFile.endsWith(".xlsx") || nomeFile.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const primoFoglio = wb.Sheets[wb.SheetNames[0]];
        righeFile = XLSX.utils.sheet_to_json(primoFoglio, { defval: "" });
      } else {
        setUploadMsg({ type: "error", text: "Formato non supportato: usa file .xlsx, .xls o .csv." });
        setUploadingId(null);
        return;
      }
      const voci = righeFile
        .map((rigaFile) => ({
          azienda_id: aziendaId,
          codice_articolo: String(trovaColonna(rigaFile, ["codice", "articolo", "cod."])).trim(),
          descrizione: String(trovaColonna(rigaFile, ["descrizione", "desc"])).trim(),
          prezzo_unitario: Number(String(trovaColonna(rigaFile, ["prezzo", "listino", "importo"])).replace(",", ".").replace(/[^\d.-]/g, "")) || 0,
        }))
        .filter((v) => v.codice_articolo);
      if (voci.length === 0) {
        setUploadMsg({ type: "error", text: "Nessuna riga valida trovata." });
        setUploadingId(null);
        return;
      }
      await fetch(`${SUPABASE_URL}/rest/v1/listini?azienda_id=eq.${aziendaId}`, { method: "DELETE", headers: headers() });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/listini`, {
        method: "POST",
        headers: { ...headers(), Prefer: "return=representation" },
        body: JSON.stringify(voci),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio del listino");
      setUploadMsg({ type: "success", text: `Listino caricato: ${voci.length} articoli.` });
    } catch (err) {
      setUploadMsg({ type: "error", text: err.message || "Errore nel caricamento del file." });
    } finally {
      setUploadingId(null);
    }
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const save = async () => {
    if (!form.nome.trim()) { setError("Il nome azienda è obbligatorio."); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        nome: form.nome,
        sconto1: form.sconto1 !== "" ? Number(form.sconto1) : null,
        sconto2: form.sconto2 !== "" ? Number(form.sconto2) : null,
        imballo_percentuale: form.imballo_percentuale !== "" ? Number(form.imballo_percentuale) : null,
        trasporto: form.trasporto || null,
        resi: form.resi || null,
        note: form.note || null,
        colore: form.colore || "#0b7bc4",
      };
      let res;
      if (editingId) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?id=eq.${editingId}`, { method: "PATCH", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      } else {
        res = await fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti`, { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio");
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (azienda) => {
    setEditingId(azienda.id);
    setForm({
      nome: azienda.nome || "",
      sconto1: azienda.sconto1 ?? "",
      sconto2: azienda.sconto2 ?? "",
      imballo_percentuale: azienda.imballo_percentuale ?? "",
      trasporto: azienda.trasporto || "",
      resi: azienda.resi || "",
      note: azienda.note || "",
      colore: azienda.colore || "#0b7bc4",
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Eliminare questa azienda?")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?id=eq.${id}`, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>Aziende mandanti</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, boxShadow: "0 4px 14px rgba(20,40,60,0.05)", padding: 20, maxWidth: 340 }}>
          <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>{editingId ? "Modifica azienda" : "Nuova azienda"}</h3>
          <input placeholder="Nome azienda *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
          <input placeholder="Sconto 1 (%)" value={form.sconto1} onChange={(e) => setForm({ ...form, sconto1: e.target.value })} style={inputStyle} />
          <input placeholder="Sconto 2 (%)" value={form.sconto2} onChange={(e) => setForm({ ...form, sconto2: e.target.value })} style={inputStyle} />
          <input placeholder="Imballo (%)" value={form.imballo_percentuale} onChange={(e) => setForm({ ...form, imballo_percentuale: e.target.value })} style={inputStyle} />
          <input placeholder="Trasporto (policy)" value={form.trasporto} onChange={(e) => setForm({ ...form, trasporto: e.target.value })} style={inputStyle} />
          <input placeholder="Resi (policy)" value={form.resi} onChange={(e) => setForm({ ...form, resi: e.target.value })} style={inputStyle} />
          <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
          <label style={{ fontSize: 12, color: "#333", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            Colore identificativo
            <input type="color" value={form.colore} onChange={(e) => setForm({ ...form, colore: e.target.value })} style={{ width: 40, height: 28, border: "none", padding: 0, cursor: "pointer" }} />
          </label>
          {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Aggiungi azienda"}
            </button>
            {editingId && (
              <button onClick={resetForm} style={{ padding: "9px 16px", background: "#fff", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annulla</button>
            )}
          </div>
        </div>
        <div style={{ flex: "2 1 400px" }}>
          {uploadMsg && <div style={{ fontSize: 12, marginBottom: 10, color: uploadMsg.type === "error" ? COLORS.danger : COLORS.success }}>{uploadMsg.text}</div>}
          {loading ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
          ) : list.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessuna azienda ancora inserita.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} className="tabella-responsive">
              <thead>
                <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
                  <th style={{ padding: "8px 6px" }}>Nome</th>
                  <th style={{ padding: "8px 6px" }}>Sc. 1</th>
                  <th style={{ padding: "8px 6px" }}>Sc. 2</th>
                  <th style={{ padding: "8px 6px" }}>Imballo</th>
                  <th style={{ padding: "8px 6px" }}>Trasporto</th>
                  <th style={{ padding: "8px 6px" }}>Listino</th>
                  <th style={{ padding: "8px 6px" }}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((azienda) => (
                  <tr key={azienda.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }} data-label="Nome">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: azienda.colore || COLORS.primary, display: "inline-block" }} />
                        {azienda.nome}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px" }} data-label="Sc. 1">{azienda.sconto1 != null ? `${azienda.sconto1}%` : "-"}</td>
                    <td style={{ padding: "8px 6px" }} data-label="Sc. 2">{azienda.sconto2 != null ? `${azienda.sconto2}%` : "-"}</td>
                    <td style={{ padding: "8px 6px" }} data-label="Imballo">{azienda.imballo_percentuale != null ? `${azienda.imballo_percentuale}%` : "-"}</td>
                    <td style={{ padding: "8px 6px" }} data-label="Trasporto">{azienda.trasporto || "-"}</td>
                    <td style={{ padding: "8px 6px" }} data-label="Listino">
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.primary, cursor: "pointer" }}>
                        <Upload size={12} />
                        {uploadingId === azienda.id ? "Caricamento..." : "Carica"}
                        <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => {
                          const file = e.target.files && e.target.files[0];
                          if (file) caricaListino(azienda.id, file);
                          e.target.value = "";
                        }} />
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
          <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 10 }}>
            Il file deve avere colonne riconoscibili come Codice/Articolo, Descrizione, Prezzo/Listino. Caricare un nuovo file sostituisce il listino precedente di quell'azienda.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCHEDA CLIENTE
// ============================================================
function SchedaCliente({ clienteId, session, aziendeOptions, onBack, onApriPreventivo, onApriGruppo }) {
  const [cliente, setCliente] = useState(null);
  const [gruppo, setGruppo] = useState(null);
  const [visite, setVisite] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [documenti, setDocumenti] = useState([]);
  const [ordini, setOrdini] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nota, setNota] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [formOrdine, setFormOrdine] = useState({ azienda_id: "", importo: "", data_ordine: new Date().toISOString().slice(0, 10), note: "" });
  const [fileOrdine, setFileOrdine] = useState(null);
  const [savingOrdine, setSavingOrdine] = useState(false);

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rCliente, rVisite, rPreventivi, rDocumenti, rOrdini, rAttivita] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/clienti?id=eq.${clienteId}&select=*`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/visite?cliente_id=eq.${clienteId}&select=*&order=data_visita.desc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/preventivi?cliente_id=eq.${clienteId}&select=*&order=data.desc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/documenti_cliente?cliente_id=eq.${clienteId}&select=*&order=created_at.desc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati?cliente_id=eq.${clienteId}&select=*&order=data_ordine.desc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/attivita_cliente?cliente_id=eq.${clienteId}&select=*&order=data.desc`, { headers: headers() }),
      ]);
      const [dCliente, dVisite, dPreventivi, dDocumenti, dOrdini, dAttivita] = await Promise.all([rCliente.json(), rVisite.json(), rPreventivi.json(), rDocumenti.json(), rOrdini.json(), rAttivita.json()]);
      setCliente(dCliente && dCliente[0]);
      if (dCliente && dCliente[0] && dCliente[0].gruppo_id) {
        try {
          const rGruppo = await fetch(`${SUPABASE_URL}/rest/v1/gruppi_acquisto?id=eq.${dCliente[0].gruppo_id}&select=*`, { headers: headers() });
          const dGruppo = await rGruppo.json();
          setGruppo(dGruppo && dGruppo[0]);
        } catch (e) {
          setGruppo(null);
        }
      } else {
        setGruppo(null);
      }
      setVisite(Array.isArray(dVisite) ? dVisite : []);
      setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
      setDocumenti(Array.isArray(dDocumenti) ? dDocumenti : []);
      setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
      setAttivita(Array.isArray(dAttivita) ? dAttivita : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clienteId]);

  const aggiungiNota = async () => {
    if (!nota.trim()) return;
    await registraAttivita(session, clienteId, "nota", nota.trim());
    setNota("");
    load();
  };

  const caricaDocumento = async (file) => {
    setUploadingDoc(true);
    setError("");
    try {
      const path = `${clienteId}/${Date.now()}_${file.name}`;
      await caricaFileStorage(session, "documenti-clienti", path, file);
      await fetch(`${SUPABASE_URL}/rest/v1/documenti_cliente`, {
        method: "POST",
        headers: { ...headers(), Prefer: "return=representation" },
        body: JSON.stringify({ cliente_id: clienteId, nome_file: file.name, tipo_documento: "documento", storage_path: path }),
      });
      await registraAttivita(session, clienteId, "documento", `Caricato documento: ${file.name}`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const salvaOrdine = async () => {
    if (!formOrdine.azienda_id || !formOrdine.importo) { setError("Seleziona azienda e importo."); return; }
    setSavingOrdine(true);
    setError("");
    try {
      let path = null;
      if (fileOrdine) {
        path = `${clienteId}/ordini/${Date.now()}_${fileOrdine.name}`;
        await caricaFileStorage(session, "documenti-clienti", path, fileOrdine);
      }
      await fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati`, {
        method: "POST",
        headers: { ...headers(), Prefer: "return=representation" },
        body: JSON.stringify({ cliente_id: clienteId, azienda_id: formOrdine.azienda_id, importo: Number(formOrdine.importo) || 0, data_ordine: formOrdine.data_ordine, note: formOrdine.note || null, storage_path: path }),
      });
      await registraAttivita(session, clienteId, "ordine", `Registrato ordine confermato di ${formattaEuro(formOrdine.importo)}`);
      setFormOrdine({ azienda_id: "", importo: "", data_ordine: new Date().toISOString().slice(0, 10), note: "" });
      setFileOrdine(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingOrdine(false);
    }
  };

  const rimuoviOrdine = async (id) => {
    if (!window.confirm("Eliminare questo ordine confermato?")) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati?id=eq.${id}`, { method: "DELETE", headers: headers() });
      await registraAttivita(session, clienteId, "ordine", "Ordine confermato eliminato");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const nomeAzienda = (id) => aziendeOptions.find((a) => a.id === id)?.nome || "—";
  const inputStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
  const sezione = (titolo, contenuto) => (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 6px 20px rgba(20,40,60,0.06)", padding: 22, marginBottom: 20, transition: "box-shadow 0.2s ease" }}>
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

      {sezione("Dati anagrafici", (
        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8 }}>
          <div><strong>Indirizzo:</strong> {cliente.indirizzo || "-"}</div>
          <div><strong>Telefono:</strong> {cliente.telefono || "-"}</div>
          <div><strong>Email:</strong> {cliente.email || "-"}</div>
          <div><strong>Aziende collaborate:</strong> {(cliente.aziende_collaborate || []).join(", ") || "-"}</div>
          {gruppo && (
            <div style={{ marginTop: 8 }}>
              <strong>Gruppo d'acquisto:</strong>{" "}
              <span onClick={() => onApriGruppo && onApriGruppo(gruppo.id)} style={{ color: COLORS.primary, cursor: onApriGruppo ? "pointer" : "default" }}>
                {gruppo.nome}
              </span>
            </div>
          )}
          {cliente.condizioni_per_azienda && Object.keys(cliente.condizioni_per_azienda).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong>Condizioni commerciali:</strong>
              <ul style={{ margin: "4px 0 0 18px" }}>
                {Object.entries(cliente.condizioni_per_azienda).map(([nomeAz, cond]) => (
                  <li key={nomeAz} style={{ fontSize: 12 }}>{nomeAz}: {cond}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: 8 }}><strong>Competitor:</strong> {(cliente.competitor || []).join(", ") || "-"}</div>
          <div style={{ marginTop: 8 }}><strong>Note generali:</strong> {cliente.note || "-"}</div>
        </div>
      ))}

      {sezione("Storico visite", (
        visite.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted }}>Nessuna visita registrata.</p> : (
          visite.map((v) => (
            <div key={v.id} style={{ fontSize: 12, padding: "8px 0", borderBottom: "1px solid #f0f5f9" }}>
              <strong>{new Date(v.data_visita).toLocaleDateString("it-IT")}</strong>{v.argomenti_trattati ? ` — ${v.argomenti_trattati}` : ""}
            </div>
          ))
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
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
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
              <button onClick={salvaOrdine} disabled={savingOrdine} style={{ padding: "8px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {savingOrdine ? "Salvataggio..." : "Registra ordine"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {sezione("Documenti", (
        <div>
          {documenti.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Nessun documento caricato.</p> : (
            documenti.map((d) => (
              <div key={d.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #f0f5f9" }}>
                <a href={urlPubblicoStorage("documenti-clienti", d.storage_path)} target="_blank" rel="noreferrer" style={{ color: COLORS.primary }}>{d.nome_file}</a>
                <span style={{ color: COLORS.muted, marginLeft: 8 }}>{new Date(d.created_at).toLocaleDateString("it-IT")}</span>
              </div>
            ))
          )}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.primary, cursor: "pointer", marginTop: 10 }}>
            <Upload size={13} /> {uploadingDoc ? "Caricamento..." : "Carica documento"}
            <input type="file" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (file) caricaDocumento(file);
              e.target.value = "";
            }} />
          </label>
        </div>
      ))}

      {sezione("Cronologia attività", (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input placeholder="Aggiungi una nota rapida..." value={nota} onChange={(e) => setNota(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
            <button onClick={aggiungiNota} style={{ padding: "8px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Aggiungi</button>
          </div>
          {attivita.length === 0 ? <p style={{ fontSize: 12, color: COLORS.muted }}>Nessuna attività registrata.</p> : (
            attivita.map((att) => (
              <div key={att.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #f0f5f9" }}>
                <span style={{ color: COLORS.muted }}>{new Date(att.data).toLocaleDateString("it-IT")}</span> — {att.descrizione}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// ANAGRAFICA CLIENTI
// ============================================================
function ClientiAnagrafica({ session, apriPreventivo, apriGruppo }) {
  const [list, setList] = useState([]);
  const [aziendeOptions, setAziendeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const emptyForm = { ragione_sociale: "", indirizzo: "", telefono: "", email: "", classificazione: "", aziende_collaborate: [], condizioni_per_azienda: {}, competitor: "", note: "" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtroClassificazione, setFiltroClassificazione] = useState("");
  const [clienteApertoId, setClienteApertoId] = useState(null);

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [resClienti, resAziende] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/clienti?select=*&order=ragione_sociale.asc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc`, { headers: headers() }),
      ]);
      const dataClienti = await resClienti.json();
      const dataAziende = await resAziende.json();
      if (!resClienti.ok) throw new Error(dataClienti.message || "Errore nel caricamento clienti");
      setList(dataClienti);
      if (resAziende.ok) setAziendeOptions(dataAziende);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const toggleAzienda = (nome) => {
    setForm((f) => {
      const giaSelezionata = f.aziende_collaborate.includes(nome);
      const nuoveAziende = giaSelezionata ? f.aziende_collaborate.filter((n) => n !== nome) : [...f.aziende_collaborate, nome];
      const nuoveCondizioni = { ...f.condizioni_per_azienda };
      if (giaSelezionata) delete nuoveCondizioni[nome];
      return { ...f, aziende_collaborate: nuoveAziende, condizioni_per_azienda: nuoveCondizioni };
    });
  };

  const aggiornaCondizione = (nome, testo) => {
    setForm((f) => ({ ...f, condizioni_per_azienda: { ...f.condizioni_per_azienda, [nome]: testo } }));
  };

  const save = async () => {
    if (!form.ragione_sociale.trim()) { setError("La ragione sociale è obbligatoria."); return; }
    setSaving(true);
    setError("");
    try {
      let coords = null;
      if (form.indirizzo && form.indirizzo.trim()) coords = await geocodificaIndirizzo(form.indirizzo);
      const body = {
        ragione_sociale: form.ragione_sociale,
        indirizzo: form.indirizzo || null,
        telefono: form.telefono || null,
        email: form.email || null,
        classificazione: form.classificazione || null,
        aziende_collaborate: form.aziende_collaborate,
        condizioni_per_azienda: form.condizioni_per_azienda,
        competitor: form.competitor ? form.competitor.split(",").map((s) => s.trim()).filter(Boolean) : [],
        note: form.note || null,
        ...(coords ? { latitudine: coords.lat, longitudine: coords.lon } : {}),
      };
      let res;
      if (editingId) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/clienti?id=eq.${editingId}`, { method: "PATCH", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      } else {
        res = await fetch(`${SUPABASE_URL}/rest/v1/clienti`, { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio");
      const idSalvato = editingId || (data && data[0] && data[0].id);
      if (idSalvato) await registraAttivita(session, idSalvato, "modifica", editingId ? "Scheda anagrafica aggiornata" : "Cliente creato");
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (cliente) => {
    setEditingId(cliente.id);
    setForm({
      ragione_sociale: cliente.ragione_sociale || "",
      indirizzo: cliente.indirizzo || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      classificazione: cliente.classificazione || "",
      aziende_collaborate: cliente.aziende_collaborate || [],
      condizioni_per_azienda: cliente.condizioni_per_azienda || {},
      competitor: (cliente.competitor || []).join(", "),
      note: cliente.note || "",
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Eliminare questo cliente?")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/clienti?id=eq.${id}`, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
  const filteredList = filtroClassificazione ? list.filter((c) => c.classificazione === filtroClassificazione) : list;

  if (clienteApertoId) {
    return (
      <SchedaCliente
        clienteId={clienteApertoId}
        session={session}
        aziendeOptions={aziendeOptions}
        onApriPreventivo={apriPreventivo}
        onApriGruppo={apriGruppo}
        onBack={() => { setClienteApertoId(null); load(); }}
      />
    );
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>Anagrafica clienti</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, boxShadow: "0 4px 14px rgba(20,40,60,0.05)", padding: 20, maxWidth: 380 }}>
          <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>{editingId ? "Modifica cliente" : "Nuovo cliente"}</h3>
          <input placeholder="Ragione sociale *" value={form.ragione_sociale} onChange={(e) => setForm({ ...form, ragione_sociale: e.target.value })} style={inputStyle} />
          <input placeholder="Indirizzo" value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} style={inputStyle} />
          <input placeholder="Telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={inputStyle} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
          <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>Classificazione</label>
          <select value={form.classificazione} onChange={(e) => setForm({ ...form, classificazione: e.target.value })} style={inputStyle}>
            <option value="">-- seleziona --</option>
            {CLASSIFICAZIONI.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>Aziende mandanti con cui collabora</label>
          <div style={{ marginBottom: 10, maxHeight: 220, overflowY: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 8 }}>
            {aziendeOptions.length === 0 && <span style={{ fontSize: 12, color: "#9aa7b2" }}>Nessuna azienda mandante inserita ancora</span>}
            {aziendeOptions.map((a) => (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4 }}>
                  <input type="checkbox" checked={form.aziende_collaborate.includes(a.nome)} onChange={() => toggleAzienda(a.nome)} />
                  {a.nome}
                </label>
                {form.aziende_collaborate.includes(a.nome) && (
                  <input placeholder={`Condizioni commerciali con ${a.nome}`} value={form.condizioni_per_azienda[a.nome] || ""} onChange={(e) => aggiornaCondizione(a.nome, e.target.value)} style={{ ...inputStyle, marginBottom: 0, marginLeft: 22, width: "calc(100% - 22px)", fontSize: 11 }} />
                )}
              </div>
            ))}
          </div>
          <input placeholder="Competitor (separati da virgola)" value={form.competitor} onChange={(e) => setForm({ ...form, competitor: e.target.value })} style={inputStyle} />
          <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
          {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Aggiungi cliente"}
            </button>
            {editingId && <button onClick={resetForm} style={{ padding: "9px 16px", background: "#fff", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annulla</button>}
          </div>
        </div>
        <div style={{ flex: "2 1 420px" }}>
          <div style={{ marginBottom: 12 }}>
            <select value={filtroClassificazione} onChange={(e) => setFiltroClassificazione(e.target.value)} style={{ ...inputStyle, maxWidth: 240, marginBottom: 0 }}>
              <option value="">Tutte le classificazioni</option>
              {CLASSIFICAZIONI.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {loading ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
          ) : filteredList.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun cliente trovato.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} className="tabella-responsive">
              <thead>
                <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
                  <th style={{ padding: "8px 6px" }}>Ragione sociale</th>
                  <th style={{ padding: "8px 6px" }}>Classificazione</th>
                  <th style={{ padding: "8px 6px" }}>Telefono</th>
                  <th style={{ padding: "8px 6px" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }} data-label="Cliente">
                      <span onClick={() => setClienteApertoId(c.id)} style={{ cursor: "pointer", color: COLORS.primary }}>{c.ragione_sociale}</span>
                    </td>
                    <td style={{ padding: "8px 6px" }} data-label="Classificazione">{c.classificazione || "-"}</td>
                    <td style={{ padding: "8px 6px" }} data-label="Telefono">{c.telefono || "-"}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }} data-label="">
                      <button onClick={() => edit(c)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 12, marginRight: 10 }}>Modifica</button>
                      <button onClick={() => remove(c.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>Elimina</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CALENDARIO VISITE
// ============================================================
function CalendarioVisite({ session }) {
  const [clienti, setClienti] = useState([]);
  const [visite, setVisite] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("mese");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [giornoSelezionato, setGiornoSelezionato] = useState(toISODate(new Date()));
  const [mostraForm, setMostraForm] = useState(false);
  const [clienteSelezionato, setClienteSelezionato] = useState("");
  const emptyForm = { data_visita: toISODate(new Date()), argomenti_trattati: "", cataloghi_lasciati: "", note: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [resClienti, resVisite] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale&order=ragione_sociale.asc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/visite?select=*&order=data_visita.asc`, { headers: headers() }),
      ]);
      const dataClienti = await resClienti.json();
      const dataVisite = await resVisite.json();
      if (!resClienti.ok) throw new Error(dataClienti.message || "Errore nel caricamento clienti");
      if (!resVisite.ok) throw new Error(dataVisite.message || "Errore nel caricamento visite");
      setClienti(dataClienti);
      setVisite(dataVisite);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!clienteSelezionato) { setError("Seleziona un cliente."); return; }
    if (!form.data_visita) { setError("La data della visita è obbligatoria."); return; }
    setSaving(true);
    setError("");
    try {
      const body = { cliente_id: clienteSelezionato, data_visita: form.data_visita, argomenti_trattati: form.argomenti_trattati || null, cataloghi_lasciati: form.cataloghi_lasciati || null, note: form.note || null };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/visite`, { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio");
      setForm(emptyForm);
      setMostraForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Eliminare questa visita?")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/visite?id=eq.${id}`, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "—";
  const nomeClientePreventivo = (p) => (p.cliente_id ? nomeCliente(p.cliente_id) : (p.cliente_manuale || "—"));
  const visitePerGiorno = (isoDate) => visite.filter((v) => v.data_visita === isoDate);

  const cambiaPeriodo = (direzione) => {
    const d = new Date(currentDate);
    if (viewMode === "mese") d.setMonth(d.getMonth() + direzione);
    else if (viewMode === "settimana") d.setDate(d.getDate() + direzione * 7);
    else d.setDate(d.getDate() + direzione);
    setCurrentDate(d);
    if (viewMode === "giorno") setGiornoSelezionato(toISODate(d));
  };

  const vaiAOggi = () => {
    const oggi = new Date();
    setCurrentDate(oggi);
    setGiornoSelezionato(toISODate(oggi));
  };

  const etichettaPeriodo = () => {
    if (viewMode === "mese") return `${MESI[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (viewMode === "settimana") {
      const days = getWeekDays(currentDate);
      return `${days[0].getDate()} ${MESI[days[0].getMonth()].slice(0, 3)} - ${days[6].getDate()} ${MESI[days[6].getMonth()].slice(0, 3)} ${days[6].getFullYear()}`;
    }
    return `${currentDate.getDate()} ${MESI[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const oggiISO = toISODate(new Date());

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ color: COLORS.text, fontSize: 20 }}>Calendario visite</h2>
        <button onClick={() => setMostraForm((v) => !v)} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {mostraForm ? "Chiudi" : "+ Nuova visita"}
        </button>
      </div>
      {mostraForm && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, boxShadow: "0 4px 14px rgba(20,40,60,0.05)", padding: 20, marginBottom: 20, maxWidth: 420 }}>
          <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>Registra / pianifica visita</h3>
          <select value={clienteSelezionato} onChange={(e) => setClienteSelezionato(e.target.value)} style={inputStyle}>
            <option value="">-- seleziona cliente --</option>
            {clienti.map((c) => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
          </select>
          <input type="date" value={form.data_visita} onChange={(e) => setForm({ ...form, data_visita: e.target.value })} style={inputStyle} />
          <textarea placeholder="Argomenti trattati" value={form.argomenti_trattati} onChange={(e) => setForm({ ...form, argomenti_trattati: e.target.value })} style={{ ...inputStyle, minHeight: 50 }} />
          <textarea placeholder="Cataloghi / listini lasciati" value={form.cataloghi_lasciati} onChange={(e) => setForm({ ...form, cataloghi_lasciati: e.target.value })} style={{ ...inputStyle, minHeight: 40 }} />
          <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...inputStyle, minHeight: 40 }} />
          {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <button onClick={save} disabled={saving} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => cambiaPeriodo(-1)} style={{ ...inputStyle, width: 36, cursor: "pointer", textAlign: "center" }}>‹</button>
          <span style={{ fontWeight: 700, color: COLORS.text, fontSize: 15, minWidth: 160, textAlign: "center" }}>{etichettaPeriodo()}</span>
          <button onClick={() => cambiaPeriodo(1)} style={{ ...inputStyle, width: 36, cursor: "pointer", textAlign: "center" }}>›</button>
          <button onClick={vaiAOggi} style={{ ...inputStyle, width: "auto", padding: "6px 12px", cursor: "pointer", color: COLORS.primary }}>Oggi</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["mese", "settimana", "giorno"].map((m) => (
            <button key={m} onClick={() => setViewMode(m)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: viewMode === m ? COLORS.primary : "#fff", color: viewMode === m ? "#fff" : COLORS.text, fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>{m}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
      ) : (
        <>
          {viewMode === "mese" && (
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {GIORNI_SETTIMANA.map((g) => <div key={g} style={{ padding: "8px 4px", fontSize: 11, color: COLORS.muted, textAlign: "center", borderBottom: `1px solid ${COLORS.border}` }}>{g}</div>)}
                {getMonthGrid(currentDate).map((d, i) => {
                  const iso = toISODate(d);
                  const eventi = visitePerGiorno(iso);
                  const fuoriMese = d.getMonth() !== currentDate.getMonth();
                  const isOggi = iso === oggiISO;
                  return (
                    <div key={i} onClick={() => { setGiornoSelezionato(iso); setViewMode("giorno"); setCurrentDate(d); }} style={{ minHeight: 78, padding: 6, borderRight: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}`, opacity: fuoriMese ? 0.4 : 1, cursor: "pointer", background: isOggi ? "#eaf5fc" : "transparent" }}>
                      <div style={{ fontSize: 11, color: COLORS.text, fontWeight: isOggi ? 700 : 400, marginBottom: 4 }}>{d.getDate()}</div>
                      {eventi.slice(0, 2).map((v) => (
                        <div key={v.id} style={{ fontSize: 10, background: "#0b7bc418", color: COLORS.primary, borderRadius: 4, padding: "2px 4px", marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{nomeCliente(v.cliente_id)}</div>
                      ))}
                      {eventi.length > 2 && <div style={{ fontSize: 10, color: COLORS.muted }}>+{eventi.length - 2} altre</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {viewMode === "settimana" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {getWeekDays(currentDate).map((d) => {
                const iso = toISODate(d);
                const eventi = visitePerGiorno(iso);
                const isOggi = iso === oggiISO;
                return (
                  <div key={iso} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 8, minHeight: 140, boxShadow: isOggi ? "0 0 0 2px #0b7bc4 inset" : "none" }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>{GIORNI_SETTIMANA[(d.getDay() + 6) % 7]} {d.getDate()}</div>
                    {eventi.map((v) => <div key={v.id} style={{ fontSize: 11, background: "#0b7bc418", color: COLORS.primary, borderRadius: 6, padding: "4px 6px", marginBottom: 4 }}>{nomeCliente(v.cliente_id)}</div>)}
                  </div>
                );
              })}
            </div>
          )}
          {viewMode === "giorno" && (
            <div>
              {visitePerGiorno(giornoSelezionato).length === 0 ? (
                <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessuna visita in questa data.</p>
              ) : (
                visitePerGiorno(giornoSelezionato).map((v) => (
                  <div key={v.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, marginBottom: 10, boxShadow: "0 2px 8px rgba(20,40,60,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 13 }}>{nomeCliente(v.cliente_id)}</div>
                      <button onClick={() => remove(v.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>Elimina</button>
                    </div>
                    {v.argomenti_trattati && <div style={{ fontSize: 12, marginTop: 8 }}><strong>Argomenti:</strong> {v.argomenti_trattati}</div>}
                    {v.cataloghi_lasciati && <div style={{ fontSize: 12, marginTop: 4 }}><strong>Cataloghi lasciati:</strong> {v.cataloghi_lasciati}</div>}
                    {v.note && <div style={{ fontSize: 12, marginTop: 4 }}><strong>Note:</strong> {v.note}</div>}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// SELETTORE VOCE (Imballo/Trasporto/IVA)
// ============================================================
function SelettoreVoce({ label, modalita, percentuale, valoreEuro, onChange, inputStyle, permettiTesto }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <label style={{ fontSize: 12, minWidth: 80 }}>{label}</label>
      <select value={modalita} onChange={(e) => onChange({ modalita: e.target.value })} style={{ ...inputStyle, width: 130 }}>
        <option value="escluso">Escluso</option>
        <option value="percentuale">In %</option>
        <option value="euro">In €</option>
        <option value="nascosto">Non mostrare</option>
      </select>
      {modalita === "percentuale" && <input type="number" value={percentuale} onChange={(e) => onChange({ percentuale: e.target.value })} style={{ ...inputStyle, width: 70 }} placeholder="%" />}
      {modalita === "euro" && (
        <input type={permettiTesto ? "text" : "number"} value={valoreEuro} onChange={(e) => onChange({ valoreEuro: e.target.value })} style={{ ...inputStyle, width: permettiTesto ? 160 : 80 }} placeholder={permettiTesto ? "es. 50€ o a carico cliente" : "€"} />
      )}
    </div>
  );
}

// ============================================================
// PREVENTIVI / OFFERTE
// ============================================================
function PreventiviOfferte({ session, preventivoIniziale, onPreventivoAperto }) {
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [suggerimenti, setSuggerimenti] = useState({});

  const emptyHeader = {
    cliente_id: "", azienda_id: "", rif: "", data: new Date().toISOString().slice(0, 10),
    imballo_modalita: "escluso", imballo_percentuale: 0, imballo_valore: 0,
    trasporto_modalita: "escluso", trasporto_percentuale: 0, trasporto_valore: 0,
    iva_modalita: "escluso", iva_percentuale: 22, iva_valore: 0,
    modalita_pagamento: "", modalita_prezzi_pdf: "dettagliato", stato: "bozza", note: "", cliente_manuale: "",
  };
  const [header, setHeader] = useState(emptyHeader);
  const [righe, setRighe] = useState([nuovaRiga()]);

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [resClienti, resAziende, resPreventivi] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale&order=ragione_sociale.asc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/preventivi?select=*&order=data.desc`, { headers: headers() }),
      ]);
      const dataClienti = await resClienti.json();
      const dataAziende = await resAziende.json();
      const dataPreventivi = await resPreventivi.json();
      if (resClienti.ok) setClienti(dataClienti);
      if (resAziende.ok) setAziende(dataAziende);
      if (!resPreventivi.ok) throw new Error(dataPreventivi.message || "Errore nel caricamento");
      setLista(dataPreventivi);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setHeader(emptyHeader); setRighe([nuovaRiga()]); setEditingId(null); };
  const aggiungiRiga = () => setRighe((r) => [...r, nuovaRiga()]);
  const rimuoviRiga = (id) => setRighe((r) => r.filter((x) => x.id !== id));
  const aggiornaRiga = (id, campo, valore) => setRighe((r) => r.map((x) => (x.id === id ? { ...x, [campo]: valore } : x)));

  const cercaSuggerimenti = async (rigaId, testo) => {
    if (!header.azienda_id || !testo || testo.length < 2) { setSuggerimenti((s) => ({ ...s, [rigaId]: [] })); return; }
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/listini?azienda_id=eq.${header.azienda_id}&codice_articolo=ilike.*${encodeURIComponent(testo)}*&select=*&limit=6`, { headers: headers() });
      const data = await res.json();
      if (res.ok) setSuggerimenti((s) => ({ ...s, [rigaId]: data }));
    } catch (e) {}
  };

  const selezionaSuggerimento = (rigaId, voce) => {
    setRighe((r) => r.map((x) => (x.id === rigaId ? { ...x, articolo: voce.codice_articolo, descrizione: voce.descrizione, prezzo_unitario: voce.prezzo_unitario } : x)));
    setSuggerimenti((s) => ({ ...s, [rigaId]: [] }));
  };

  const tot = calcolaTotaliPreventivo(header, righe);

  const salva = async () => {
    if (!header.azienda_id || (!header.cliente_id && !header.cliente_manuale.trim())) { setError("Seleziona un'azienda e un cliente (dall'elenco o scritto manualmente)."); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        cliente_id: header.cliente_id || null, cliente_manuale: header.cliente_id ? null : (header.cliente_manuale || null),
        azienda_id: header.azienda_id, rif: header.rif || null, data: header.data,
        righe: righe,
        imballo_modalita: header.imballo_modalita, imballo_percentuale: Number(header.imballo_percentuale) || 0, imballo_valore: Number(header.imballo_valore) || 0,
        trasporto_modalita: header.trasporto_modalita, trasporto_percentuale: Number(header.trasporto_percentuale) || 0, trasporto_valore: Number(header.trasporto_valore) || 0,
        iva_modalita: header.iva_modalita, iva_percentuale: Number(header.iva_percentuale) || 0, iva_valore: Number(header.iva_valore) || 0,
        modalita_pagamento: header.modalita_pagamento || null, modalita_prezzi_pdf: header.modalita_prezzi_pdf || "dettagliato",
        stato: header.stato || "bozza", note: header.note || null,
      };
      let res;
      if (editingId) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/preventivi?id=eq.${editingId}`, { method: "PATCH", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      } else {
        res = await fetch(`${SUPABASE_URL}/rest/v1/preventivi`, { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio");
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const modifica = (p) => {
    setEditingId(p.id);
    setHeader({
      cliente_id: p.cliente_id || "", azienda_id: p.azienda_id || "", rif: p.rif || "", data: p.data || new Date().toISOString().slice(0, 10),
      imballo_modalita: p.imballo_modalita || "escluso", imballo_percentuale: p.imballo_percentuale || 0, imballo_valore: p.imballo_valore || 0,
      trasporto_modalita: p.trasporto_modalita || "escluso", trasporto_percentuale: p.trasporto_percentuale || 0, trasporto_valore: p.trasporto_valore || 0,
      iva_modalita: p.iva_modalita || "escluso", iva_percentuale: p.iva_percentuale ?? 22, iva_valore: p.iva_valore || 0,
      modalita_pagamento: p.modalita_pagamento || "", modalita_prezzi_pdf: p.modalita_prezzi_pdf || "dettagliato",
      stato: p.stato || "bozza", note: p.note || "", cliente_manuale: p.cliente_manuale || "",
    });
    setRighe(p.righe && p.righe.length ? p.righe : [nuovaRiga()]);
  };

  useEffect(() => {
    if (!preventivoIniziale) return;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/preventivi?id=eq.${preventivoIniziale}&select=*`, { headers: headers() });
        const data = await res.json();
        if (res.ok && data && data[0]) modifica(data[0]);
      } catch (e) {}
      if (onPreventivoAperto) onPreventivoAperto();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preventivoIniziale]);

  const elimina = async (id) => {
    if (!window.confirm("Eliminare questo preventivo?")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/preventivi?id=eq.${id}`, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const segnaComeFatturato = async (p) => {
    if (!window.confirm("Creare un ordine confermato da questo preventivo?")) return;
    try {
      const totCalc = calcolaTotaliPreventivo(p, p.righe || []);
      await fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati`, {
        method: "POST",
        headers: { ...headers(), Prefer: "return=representation" },
        body: JSON.stringify({ cliente_id: p.cliente_id, azienda_id: p.azienda_id, importo: totCalc.totaleFinale, data_ordine: new Date().toISOString().slice(0, 10), note: p.rif ? `Da preventivo ${p.rif}` : "Da preventivo" }),
      });
      await fetch(`${SUPABASE_URL}/rest/v1/preventivi?id=eq.${p.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ fatturato: true }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "—";
  const nomeAzienda = (id) => aziende.find((a) => a.id === id)?.nome || "—";
  const inputStyle = { padding: "6px 8px", border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12, boxSizing: "border-box" };
  const fieldStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
  const nomeClientePreventivo = (p) => (p.cliente_id ? nomeCliente(p.cliente_id) : (p.cliente_manuale || "—"));

  const rigaTotali = (label, modalita, valore) => {
    if (modalita === "nascosto") return null;
    return <div style={{ color: COLORS.muted }}>{label}: {modalita === "escluso" ? "escluso" : formattaEuro(valore)}</div>;
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>Preventivi / Offerte</h2>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, boxShadow: "0 4px 14px rgba(20,40,60,0.05)", padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>{editingId ? "Modifica preventivo" : "Nuovo preventivo"}</h3>
        <div className="form-header-preventivo" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <select value={header.azienda_id} onChange={(e) => setHeader({ ...header, azienda_id: e.target.value })} style={{ ...fieldStyle, maxWidth: 220 }}>
            <option value="">-- Azienda --</option>
            {aziende.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <select value={header.cliente_id} onChange={(e) => setHeader({ ...header, cliente_id: e.target.value })} style={{ ...fieldStyle, maxWidth: 220 }}>
            <option value="">-- Cliente (Spettabile) --</option>
            {clienti.map((c) => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
          </select>
          {!header.cliente_id && (
            <input placeholder="...oppure scrivi il nome cliente manualmente" value={header.cliente_manuale} onChange={(e) => setHeader({ ...header, cliente_manuale: e.target.value })} style={{ ...fieldStyle, maxWidth: 260 }} />
          )}
          <input type="date" value={header.data} onChange={(e) => setHeader({ ...header, data: e.target.value })} style={{ ...fieldStyle, maxWidth: 160 }} />
          <input placeholder="RIF" value={header.rif} onChange={(e) => setHeader({ ...header, rif: e.target.value })} style={{ ...fieldStyle, maxWidth: 160 }} />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 12 }} className="tabella-righe-preventivo">
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ padding: 6 }}>Art.</th><th style={{ padding: 6 }}>Descrizione</th><th style={{ padding: 6 }}>Finitura</th><th style={{ padding: 6 }}>Qtà</th>
              <th style={{ padding: 6 }}>Prezzo un.</th><th style={{ padding: 6 }}>Sc.1 %</th><th style={{ padding: 6 }}>Sc.2 %</th><th style={{ padding: 6 }}>Netto manuale</th>
              <th style={{ padding: 6 }}>Netto</th><th style={{ padding: 6 }}></th>
            </tr>
          </thead>
          <tbody>
            {righe.map((riga) => {
              const { netto } = calcolaRigaNetto(riga);
              return (
                <tr key={riga.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                  <td style={{ padding: 4, position: "relative" }} data-label="Articolo">
                    <input value={riga.articolo} onChange={(e) => { aggiornaRiga(riga.id, "articolo", e.target.value); cercaSuggerimenti(riga.id, e.target.value); }} style={{ ...inputStyle, width: 70 }} autoComplete="off" />
                    {suggerimenti[riga.id] && suggerimenti[riga.id].length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 10, background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, boxShadow: "0 4px 14px rgba(20,40,60,0.12)", minWidth: 220, maxHeight: 160, overflowY: "auto" }}>
                        {suggerimenti[riga.id].map((voce) => (
                          <div key={voce.id} onClick={() => selezionaSuggerimento(riga.id, voce)} style={{ padding: "6px 10px", fontSize: 11, cursor: "pointer", borderBottom: `1px solid ${COLORS.border}` }}>
                            <strong>{voce.codice_articolo}</strong> — {voce.descrizione} ({formattaEuro(voce.prezzo_unitario)})
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 4 }} data-label="Descrizione"><input value={riga.descrizione} onChange={(e) => aggiornaRiga(riga.id, "descrizione", e.target.value)} style={{ ...inputStyle, width: 150 }} /></td>
                  <td style={{ padding: 4 }} data-label="Finitura"><input value={riga.finitura} onChange={(e) => aggiornaRiga(riga.id, "finitura", e.target.value)} style={{ ...inputStyle, width: 70 }} /></td>
                  <td style={{ padding: 4 }} data-label="Qtà"><input type="number" value={riga.quantita} onChange={(e) => aggiornaRiga(riga.id, "quantita", e.target.value)} style={{ ...inputStyle, width: 45 }} /></td>
                  <td style={{ padding: 4 }} data-label="Prezzo un."><input type="number" value={riga.prezzo_unitario} onChange={(e) => aggiornaRiga(riga.id, "prezzo_unitario", e.target.value)} style={{ ...inputStyle, width: 65 }} /></td>
                  <td style={{ padding: 4 }} data-label="Sc.1 %"><input type="number" value={riga.sconto1} onChange={(e) => aggiornaRiga(riga.id, "sconto1", e.target.value)} style={{ ...inputStyle, width: 50 }} /></td>
                  <td style={{ padding: 4 }} data-label="Sc.2 %"><input type="number" value={riga.sconto2} onChange={(e) => aggiornaRiga(riga.id, "sconto2", e.target.value)} style={{ ...inputStyle, width: 50 }} /></td>
                  <td style={{ padding: 4 }} data-label="Netto manuale"><input type="number" placeholder="opz." value={riga.prezzo_netto_manuale} onChange={(e) => aggiornaRiga(riga.id, "prezzo_netto_manuale", e.target.value)} style={{ ...inputStyle, width: 65 }} /></td>
                  <td style={{ padding: 4, fontWeight: 600 }} data-label="Netto">{formattaEuro(netto)}</td>
                  <td style={{ padding: 4 }} data-label=""><button onClick={() => rimuoviRiga(riga.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 14 }}>✕ Rimuovi riga</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: COLORS.muted, marginTop: -6, marginBottom: 16 }}>Compila "Netto manuale" per fissare direttamente il prezzo netto di una riga.</p>
        <button onClick={aggiungiRiga} style={{ padding: "6px 12px", background: "#fff", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12, cursor: "pointer", marginBottom: 20 }}>+ Aggiungi riga</button>

        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <SelettoreVoce label="Imballo" modalita={header.imballo_modalita} percentuale={header.imballo_percentuale} valoreEuro={header.imballo_valore} inputStyle={inputStyle} onChange={(patch) => setHeader({ ...header, imballo_modalita: patch.modalita ?? header.imballo_modalita, imballo_percentuale: patch.percentuale ?? header.imballo_percentuale, imballo_valore: patch.valoreEuro ?? header.imballo_valore })} />
          <SelettoreVoce label="Trasporto" modalita={header.trasporto_modalita} percentuale={header.trasporto_percentuale} valoreEuro={header.trasporto_valore} inputStyle={inputStyle} permettiTesto
            onChange={(patch) => setHeader({ ...header, trasporto_modalita: patch.modalita ?? header.trasporto_modalita, trasporto_percentuale: patch.percentuale ?? header.trasporto_percentuale, trasporto_valore: patch.valoreEuro ?? header.trasporto_valore })} />
          <SelettoreVoce label="IVA" modalita={header.iva_modalita} percentuale={header.iva_percentuale} valoreEuro={header.iva_valore} inputStyle={inputStyle} onChange={(patch) => setHeader({ ...header, iva_modalita: patch.modalita ?? header.iva_modalita, iva_percentuale: patch.percentuale ?? header.iva_percentuale, iva_valore: patch.valoreEuro ?? header.iva_valore })} />
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>Modalità di pagamento</label>
            <input placeholder="Es. 30% all'ordine, saldo alla consegna" value={header.modalita_pagamento} onChange={(e) => setHeader({ ...header, modalita_pagamento: e.target.value })} style={{ ...fieldStyle, marginBottom: 0, maxWidth: 400 }} />
          </div>
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>Prezzi mostrati nel PDF</label>
            <select value={header.modalita_prezzi_pdf} onChange={(e) => setHeader({ ...header, modalita_prezzi_pdf: e.target.value })} style={{ ...inputStyle, maxWidth: 300 }}>
              <option value="dettagliato">Completo (listino + sconti + netto)</option>
              <option value="solo_netto">Solo prezzi netti (unitario e totale)</option>
            </select>
          </div>
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>Stato preventivo</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATI_PREVENTIVO.map((s) => (
                <button key={s.valore} onClick={() => setHeader({ ...header, stato: s.valore })} style={{ padding: "6px 12px", borderRadius: 20, border: header.stato === s.valore ? `2px solid ${s.colore}` : "1px solid #e2edf5", background: header.stato === s.valore ? `${s.colore}18` : "#fff", color: s.colore, fontSize: 12, fontWeight: header.stato === s.valore ? 700 : 500, cursor: "pointer" }}>● {s.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>Note</label>
            <textarea placeholder="Annotazioni aggiuntive sul preventivo" value={header.note} onChange={(e) => setHeader({ ...header, note: e.target.value })} style={{ ...fieldStyle, marginBottom: 0, maxWidth: 500, minHeight: 60 }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 13, marginBottom: 16 }}>
          <div style={{ textAlign: "right", minWidth: 220 }}>
            <div style={{ color: COLORS.muted }}>Totale netto: {formattaEuro(tot.totaleNetto)}</div>
            {rigaTotali("Imballo", header.imballo_modalita, tot.valoreImballo, header.imballo_valore)}
            {rigaTotali("Trasporto", header.trasporto_modalita, tot.valoreTrasporto, header.trasporto_valore)}
            {rigaTotali("IVA", header.iva_modalita, tot.valoreIva, header.iva_valore)}
            <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 16, marginTop: 4 }}>Totale: {formattaEuro(tot.totaleFinale)}</div>
          </div>
        </div>

        {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={salva} disabled={saving} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Salva preventivo"}
          </button>
          {editingId && <button onClick={resetForm} style={{ padding: "9px 16px", background: "#fff", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annulla</button>}
        </div>
      </div>

      <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>Preventivi salvati</h3>
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
      ) : lista.length === 0 ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun preventivo salvato.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} className="tabella-responsive">
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ padding: "8px 6px" }}>Stato</th><th style={{ padding: "8px 6px" }}>RIF</th><th style={{ padding: "8px 6px" }}>Data</th>
              <th style={{ padding: "8px 6px" }}>Cliente</th><th style={{ padding: "8px 6px" }}>Azienda</th><th style={{ padding: "8px 6px" }}></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((preventivoSalvato) => {
              const infoStato = STATI_PREVENTIVO.find((s) => s.valore === preventivoSalvato.stato) || STATI_PREVENTIVO[0];
              return (
                <tr key={preventivoSalvato.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                  <td style={{ padding: "8px 6px" }} data-label="Stato"><span style={{ color: infoStato.colore, fontSize: 12, fontWeight: 700 }}>● {infoStato.label}</span></td>
                  <td style={{ padding: "8px 6px" }} data-label="RIF">{preventivoSalvato.rif || "-"}</td>
                  <td style={{ padding: "8px 6px" }} data-label="Data">{preventivoSalvato.data ? new Date(preventivoSalvato.data).toLocaleDateString("it-IT") : "-"}</td>
                  <td style={{ padding: "8px 6px" }} data-label="Cliente">{nomeClientePreventivo(preventivoSalvato)}</td>
                  <td style={{ padding: "8px 6px" }} data-label="Azienda">{nomeAzienda(preventivoSalvato.azienda_id)}</td>
                  <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }} data-label="">
                    {preventivoSalvato.stato === "accettato" && (
                      preventivoSalvato.fatturato ? (
                        <span style={{ color: COLORS.success, fontSize: 12, marginRight: 10 }}>✓ Fatturato</span>
                      ) : (
                        <button onClick={() => segnaComeFatturato(preventivoSalvato)} style={{ background: "none", border: "none", color: COLORS.success, cursor: "pointer", fontSize: 12, marginRight: 10 }}>Segna come fatturato</button>
                      )
                    )}
                    <button onClick={() => stampaPreventivo(preventivoSalvato, clienti, aziende)} style={{ background: "none", border: "none", color: COLORS.success, cursor: "pointer", fontSize: 12, marginRight: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Printer size={13} /> PDF
                    </button>
                    <button onClick={() => modifica(preventivoSalvato)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 12, marginRight: 10 }}>Modifica</button>
                    <button onClick={() => elimina(preventivoSalvato.id)} style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>Elimina</button>
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

// ============================================================
// MAPPA CLIENTI
// ============================================================
function MappaClienti({ session }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale,indirizzo,classificazione,latitudine,longitudine`, { headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Errore nel caricamento");
        setClienti(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
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
    const markers = [];
    conCoordinate.forEach((c) => {
      const m = L.marker([c.latitudine, c.longitudine]).addTo(mapInstance.current).bindPopup(`<strong>${c.ragione_sociale}</strong><br/>${c.classificazione || ""}<br/>${c.indirizzo || ""}`);
      markers.push(m);
    });
    if (conCoordinate.length > 0) {
      const gruppo = L.featureGroup(markers);
      mapInstance.current.fitBounds(gruppo.getBounds().pad(0.2));
    }
    return () => { markers.forEach((m) => mapInstance.current && mapInstance.current.removeLayer(m)); };
  }, [clienti]);

  const senzaCoordinate = clienti.filter((c) => c.indirizzo && (!c.latitudine || !c.longitudine));

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Mappa clienti</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Le coordinate si calcolano automaticamente quando salvi l'indirizzo in anagrafica.</p>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
      {loading && <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>}
      <div ref={mapRef} style={{ width: "100%", height: 480, borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden", position: "relative", zIndex: 0 }} />
      {senzaCoordinate.length > 0 && <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 10 }}>{senzaCoordinate.length} cliente/i senza coordinate ancora calcolate.</p>}
    </div>
  );
}

// ============================================================
// STATISTICHE
// ============================================================
function Statistiche({ session }) {
  const [ordini, setOrdini] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aziendaSelezionata, setAziendaSelezionata] = useState("");

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [rOrdini, rPreventivi, rClienti, rAziende] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati?select=*`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/preventivi?select=id,cliente_id,azienda_id,data,stato,righe,imballo_modalita,imballo_percentuale,imballo_valore,trasporto_modalita,trasporto_percentuale,trasporto_valore,iva_modalita,iva_percentuale,iva_valore`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome`, { headers: headers() }),
        ]);
        const [dOrdini, dPreventivi, dClienti, dAziende] = await Promise.all([rOrdini.json(), rPreventivi.json(), rClienti.json(), rAziende.json()]);
        setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
        setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
        setClienti(Array.isArray(dClienti) ? dClienti : []);
        const listaAziende = Array.isArray(dAziende) ? dAziende : [];
        setAziende(listaAziende);
        setAziendaSelezionata((prev) => prev || (listaAziende[0] ? listaAziende[0].id : ""));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "Sconosciuto";
  const ricavi = aziendaSelezionata ? combinaRicaviPerAzienda(ordini, preventivi, aziendaSelezionata) : [];

  const fatturatoPerCliente = {};
  ricavi.forEach((r) => { const key = nomeCliente(r.cliente_id); fatturatoPerCliente[key] = (fatturatoPerCliente[key] || 0) + r.importo; });
  const classificaClienti = Object.entries(fatturatoPerCliente).map(([nome, totale]) => ({ nome, totale })).sort((a, b) => b.totale - a.totale);

  const conteggioStati = { bozza: 0, inviato: 0, accettato: 0, rifiutato: 0 };
  preventivi.filter((pv) => pv.azienda_id === aziendaSelezionata).forEach((pv) => { if (conteggioStati[pv.stato] !== undefined) conteggioStati[pv.stato]++; });
  const datiStati = STATI_PREVENTIVO.map((s) => ({ name: s.label, value: conteggioStati[s.valore], color: s.colore }));
  const fatturatoTotale = ricavi.reduce((s, r) => s + r.importo, 0);
  const inputStyle = { padding: "8px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13 };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Statistiche</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Basate sugli ordini confermati e sui preventivi accettati, per singola azienda mandante</p>
      <select value={aziendaSelezionata} onChange={(e) => setAziendaSelezionata(e.target.value)} style={{ ...inputStyle, marginBottom: 20, maxWidth: 260 }}>
        {aziende.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
      ) : !aziendaSelezionata ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Aggiungi prima un'azienda mandante.</p>
      ) : (
        <>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 20, maxWidth: 300, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
            <div style={{ fontSize: 12, color: COLORS.muted }}>Fatturato totale</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>{formattaEuro(fatturatoTotale)}</div>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ flex: "1 1 320px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
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
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
            <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Fatturato per cliente</h3>
            {classificaClienti.length === 0 ? (
              <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun dato ancora per questa azienda.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}><th style={{ padding: "6px 4px" }}>Cliente</th><th style={{ padding: "6px 4px" }}>Fatturato</th></tr></thead>
                <tbody>
                  {classificaClienti.map((c) => (
                    <tr key={c.nome} style={{ borderBottom: "1px solid #f0f5f9" }}>
                      <td style={{ padding: "6px 4px" }}>{c.nome}</td>
                      <td style={{ padding: "6px 4px", fontWeight: 600 }}>{formattaEuro(c.totale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// FATTURATO
// ============================================================
function Fatturato({ session }) {
  const [ordini, setOrdini] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear());
  const [aziendaSelezionata, setAziendaSelezionata] = useState("");

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [rOrdini, rPreventivi, rClienti, rAziende] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati?select=*`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/preventivi?select=id,cliente_id,azienda_id,data,stato,righe,imballo_modalita,imballo_percentuale,imballo_valore,trasporto_modalita,trasporto_percentuale,trasporto_valore,iva_modalita,iva_percentuale,iva_valore`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome`, { headers: headers() }),
        ]);
        const [dOrdini, dPreventivi, dClienti, dAziende] = await Promise.all([rOrdini.json(), rPreventivi.json(), rClienti.json(), rAziende.json()]);
        setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
        setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
        setClienti(Array.isArray(dClienti) ? dClienti : []);
        const listaAziende = Array.isArray(dAziende) ? dAziende : [];
        setAziende(listaAziende);
        setAziendaSelezionata((prev) => prev || (listaAziende[0] ? listaAziende[0].id : ""));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "Sconosciuto";
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

  const cardStyle = { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" };
  const selectStyle = { padding: "8px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13 };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Fatturato</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Andamento del fatturato nel tempo, per singola azienda mandante</p>
      <select value={aziendaSelezionata} onChange={(e) => setAziendaSelezionata(e.target.value)} style={{ ...selectStyle, marginBottom: 20, maxWidth: 260 }}>
        {aziende.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
      ) : !aziendaSelezionata ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Aggiungi prima un'azienda mandante.</p>
      ) : (
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
            {topClienti.length === 0 ? (
              <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun dato ancora per questa azienda.</p>
            ) : (
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

// ============================================================
// REGISTRO ORDINI
// ============================================================
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

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rOrdini, rPreventivi, rClienti, rAziende] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati?select=*`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/preventivi?select=*`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome`, { headers: headers() }),
      ]);
      const [dOrdini, dPreventivi, dClienti, dAziende] = await Promise.all([rOrdini.json(), rPreventivi.json(), rClienti.json(), rAziende.json()]);
      setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
      setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
      setClienti(Array.isArray(dClienti) ? dClienti : []);
      setAziende(Array.isArray(dAziende) ? dAziende : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "Sconosciuto";
  const nomeAzienda = (id) => aziende.find((a) => a.id === id)?.nome || "Sconosciuta";

  const righeOrdini = ordini.map((o) => ({
    id: `ordine-${o.id}`, idOriginale: o.id, tipoOriginale: "ordine", tipo: "Ordine confermato",
    cliente_id: o.cliente_id, azienda_id: o.azienda_id, data: o.data_ordine,
    statoLabel: "Confermato", statoColore: COLORS.success, importo: Number(o.importo) || 0,
  }));

  const righePreventivi = preventivi.map((pv) => {
    const infoStato = STATI_PREVENTIVO.find((s) => s.valore === pv.stato) || STATI_PREVENTIVO[0];
    return {
      id: `preventivo-${pv.id}`, idOriginale: pv.id, tipoOriginale: "preventivo", tipo: "Preventivo" + (pv.rif ? ` (${pv.rif})` : ""),
      cliente_id: pv.cliente_id, cliente_manuale: pv.cliente_manuale, azienda_id: pv.azienda_id, data: pv.data,
      statoLabel: infoStato.label, statoColore: infoStato.colore, importo: calcolaTotaliPreventivo(pv, pv.righe || []).totaleFinale,
    };
  });

  const modificaOrdine = (idOrdine) => {
    const o = ordini.find((x) => x.id === idOrdine);
    if (!o) return;
    setOrdineInModifica(idOrdine);
    setFormOrdine({ azienda_id: o.azienda_id || "", importo: o.importo ?? "", data_ordine: o.data_ordine || "", note: o.note || "" });
  };

  const salvaModificaOrdine = async () => {
    setSalvandoOrdine(true);
    setError("");
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati?id=eq.${ordineInModifica}`, {
        method: "PATCH", headers: { ...headers(), Prefer: "return=representation" },
        body: JSON.stringify({ azienda_id: formOrdine.azienda_id, importo: Number(formOrdine.importo) || 0, data_ordine: formOrdine.data_ordine, note: formOrdine.note || null }),
      });
      setOrdineInModifica(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSalvandoOrdine(false);
    }
  };

  const eliminaOrdine = async (idOrdine) => {
    if (!window.confirm("Eliminare questo ordine confermato?")) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati?id=eq.${idOrdine}`, { method: "DELETE", headers: headers() });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const tutteLeRighe = [...righeOrdini, ...righePreventivi]
    .filter((r) => !filtroCliente || r.cliente_id === filtroCliente)
    .filter((r) => !filtroAzienda || r.azienda_id === filtroAzienda)
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  const selectStyle = { padding: "8px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13 };

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
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 20, maxWidth: 500, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
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
            <button onClick={() => setOrdineInModifica(null)} style={{ padding: "8px 16px", background: "#fff", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Annulla</button>
          </div>
        </div>
      )}
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
      ) : tutteLeRighe.length === 0 ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun ordine o preventivo trovato.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} className="tabella-responsive">
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ padding: "8px 6px" }}>Tipo</th><th style={{ padding: "8px 6px" }}>Cliente</th><th style={{ padding: "8px 6px" }}>Azienda</th>
              <th style={{ padding: "8px 6px" }}>Data</th><th style={{ padding: "8px 6px" }}>Stato</th><th style={{ padding: "8px 6px" }}>Importo</th><th style={{ padding: "8px 6px" }}></th>
            </tr>
          </thead>
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

// ============================================================
// PORTAFOGLIO ORDINI
// ============================================================
function PortafoglioOrdini({ session }) {
  const [preventivi, setPreventivi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rPreventivi, rClienti, rAziende] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/preventivi?stato=eq.accettato&fatturato=eq.false&select=*`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome`, { headers: headers() }),
      ]);
      const [dPreventivi, dClienti, dAziende] = await Promise.all([rPreventivi.json(), rClienti.json(), rAziende.json()]);
      setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
      setClienti(Array.isArray(dClienti) ? dClienti : []);
      setAziende(Array.isArray(dAziende) ? dAziende : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "Sconosciuto";
  const nomeAzienda = (id) => aziende.find((a) => a.id === id)?.nome || "Sconosciuta";

  const segnaComeFatturato = async (pv) => {
    if (!window.confirm("Creare un ordine confermato da questo preventivo?")) return;
    try {
      const tot = calcolaTotaliPreventivo(pv, pv.righe || []);
      await fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati`, {
        method: "POST", headers: { ...headers(), Prefer: "return=representation" },
        body: JSON.stringify({ cliente_id: pv.cliente_id, azienda_id: pv.azienda_id, importo: tot.totaleFinale, data_ordine: new Date().toISOString().slice(0, 10), note: pv.rif ? `Da preventivo ${pv.rif}` : "Da preventivo" }),
      });
      await fetch(`${SUPABASE_URL}/rest/v1/preventivi?id=eq.${pv.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ fatturato: true }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const totale = preventivi.reduce((s, pv) => s + calcolaTotaliPreventivo(pv, pv.righe || []).totaleFinale, 0);

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Portafoglio ordini</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>Preventivi accettati, in attesa di diventare fatturato</p>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 20, maxWidth: 300, boxShadow: "0 4px 14px rgba(20,40,60,0.05)" }}>
        <div style={{ fontSize: 12, color: COLORS.muted }}>Totale in portafoglio</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.text }}>{formattaEuro(totale)}</div>
      </div>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
      ) : preventivi.length === 0 ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun preventivo accettato in attesa di fatturazione.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} className="tabella-responsive">
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ padding: "8px 6px" }}>RIF</th><th style={{ padding: "8px 6px" }}>Data</th><th style={{ padding: "8px 6px" }}>Cliente</th>
              <th style={{ padding: "8px 6px" }}>Azienda</th><th style={{ padding: "8px 6px" }}>Importo</th><th style={{ padding: "8px 6px" }}></th>
            </tr>
          </thead>
          <tbody>
            {preventivi.map((pv) => (
              <tr key={pv.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                <td style={{ padding: "8px 6px" }} data-label="RIF">{pv.rif || "-"}</td>
                <td style={{ padding: "8px 6px" }} data-label="Data">{pv.data ? new Date(pv.data).toLocaleDateString("it-IT") : "-"}</td>
                <td style={{ padding: "8px 6px" }} data-label="Cliente">{pv.cliente_id ? nomeCliente(pv.cliente_id) : (pv.cliente_manuale || "—")}</td>
                <td style={{ padding: "8px 6px" }} data-label="Azienda">{nomeAzienda(pv.azienda_id)}</td>
                <td style={{ padding: "8px 6px", fontWeight: 600 }} data-label="Importo">{formattaEuro(calcolaTotaliPreventivo(pv, pv.righe || []).totaleFinale)}</td>
                <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }} data-label="">
                  <button onClick={() => segnaComeFatturato(pv)} style={{ background: "none", border: "none", color: COLORS.success, cursor: "pointer", fontSize: 12 }}>Segna come fatturato</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ============================================================
// GRUPPI D'ACQUISTO
// ============================================================
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

  const headers = () => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rGruppi, rClienti, rAziende] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/gruppi_acquisto?select=*&order=nome.asc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale,gruppo_id&order=ragione_sociale.asc`, { headers: headers() }),
        fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc`, { headers: headers() }),
      ]);
      const [dGruppi, dClienti, dAziende] = await Promise.all([rGruppi.json(), rClienti.json(), rAziende.json()]);
      setLista(Array.isArray(dGruppi) ? dGruppi : []);
      setClienti(Array.isArray(dClienti) ? dClienti : []);
      setAziende(Array.isArray(dAziende) ? dAziende : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
    if (g) {
      apriModifica(g);
      if (onGruppoAperto) onGruppoAperto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruppoIniziale, lista]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setAziendeSelezionate([]); };

  const toggleAzienda = (nomeAz) => {
    setAziendeSelezionate((prev) => {
      const attiva = prev.includes(nomeAz);
      const nuove = attiva ? prev.filter((n) => n !== nomeAz) : [...prev, nomeAz];
      setForm((f) => {
        const cond = { ...f.condizioni_per_azienda };
        if (attiva) delete cond[nomeAz];
        return { ...f, condizioni_per_azienda: cond };
      });
      return nuove;
    });
  };

  const aggiornaCondizione = (nomeAz, testo) => {
    setForm((f) => ({ ...f, condizioni_per_azienda: { ...f.condizioni_per_azienda, [nomeAz]: testo } }));
  };

  const salva = async () => {
    if (!form.nome.trim()) { setError("Il nome del gruppo è obbligatorio."); return; }
    setSaving(true);
    setError("");
    try {
      const body = { nome: form.nome, note: form.note || null, condizioni_per_azienda: form.condizioni_per_azienda };
      let res;
      if (editingId) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/gruppi_acquisto?id=eq.${editingId}`, { method: "PATCH", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      } else {
        res = await fetch(`${SUPABASE_URL}/rest/v1/gruppi_acquisto`, { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify(body) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio");
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const elimina = async (id) => {
    if (!window.confirm("Eliminare questo gruppo d'acquisto? I clienti resteranno ma perderanno il collegamento al gruppo.")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gruppi_acquisto?id=eq.${id}`, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleClienteNelGruppo = async (clienteId, gruppoId, attualmenteDentro) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/clienti?id=eq.${clienteId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ gruppo_id: attualmenteDentro ? null : gruppoId }),
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", marginBottom: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>Gruppi d'acquisto</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, boxShadow: "0 4px 14px rgba(20,40,60,0.05)", padding: 20, maxWidth: 420 }}>
          <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>{editingId ? "Modifica gruppo" : "Nuovo gruppo"}</h3>
          <input placeholder="Nome gruppo *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
          <textarea placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ ...inputStyle, minHeight: 50 }} />

          <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>Condizioni commerciali riservate per azienda mandante</label>
          <div style={{ marginBottom: 12, maxHeight: 220, overflowY: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 8 }}>
            {aziende.length === 0 && <span style={{ fontSize: 12, color: "#9aa7b2" }}>Nessuna azienda mandante inserita ancora</span>}
            {aziende.map((a) => (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4 }}>
                  <input type="checkbox" checked={aziendeSelezionate.includes(a.nome)} onChange={() => toggleAzienda(a.nome)} />
                  {a.nome}
                </label>
                {aziendeSelezionate.includes(a.nome) && (
                  <input placeholder={`Condizioni riservate con ${a.nome}`} value={form.condizioni_per_azienda[a.nome] || ""} onChange={(e) => aggiornaCondizione(a.nome, e.target.value)} style={{ ...inputStyle, marginBottom: 0, marginLeft: 22, width: "calc(100% - 22px)", fontSize: 11 }} />
                )}
              </div>
            ))}
          </div>

          {editingId && (
            <>
              <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>Clienti che fanno parte di questo gruppo</label>
              <div style={{ marginBottom: 12, maxHeight: 180, overflowY: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 8 }}>
                {clienti.length === 0 && <span style={{ fontSize: 12, color: "#9aa7b2" }}>Nessun cliente ancora inserito</span>}
                {clienti.map((c) => {
                  const dentro = c.gruppo_id === editingId;
                  const inAltroGruppo = c.gruppo_id && c.gruppo_id !== editingId;
                  return (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4, opacity: inAltroGruppo ? 0.5 : 1 }}>
                      <input type="checkbox" checked={dentro} disabled={inAltroGruppo} onChange={() => toggleClienteNelGruppo(c.id, editingId, dentro)} />
                      {c.ragione_sociale} {inAltroGruppo && <span style={{ fontSize: 10 }}>(in un altro gruppo)</span>}
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={salva} disabled={saving} style={{ padding: "9px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Crea gruppo"}
            </button>
            {editingId && <button onClick={resetForm} style={{ padding: "9px 16px", background: "#fff", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Annulla</button>}
          </div>
        </div>

        <div style={{ flex: "2 1 400px" }}>
          {loading ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
          ) : lista.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun gruppo d'acquisto ancora creato.</p>
          ) : (
            lista.map((g) => {
              const membri = clienti.filter((c) => c.gruppo_id === g.id);
              return (
                <div key={g.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(20,40,60,0.04)" }}>
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
function AppShell({ session, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [role, setRole] = useState("user");
  const [preventivoAprireId, setPreventivoAprireId] = useState(null);
  const [gruppoAprireId, setGruppoAprireId] = useState(null);

  const apriPreventivoCliente = (id) => {
    setPreventivoAprireId(id);
    setPage("preventivi");
  };

  const apriGruppoCliente = (id) => {
    setGruppoAprireId(id);
    setPage("gruppi");
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=role`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data && data[0]) setRole(data[0].role);
      } catch (e) {}
    })();
  }, [session]);

  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "clienti", label: "Clienti", icon: Users },
    { key: "aziende", label: "Aziende mandanti", icon: Building2 },
    { key: "visite", label: "Visite", icon: CalendarDays },
    { key: "preventivi", label: "Preventivi", icon: FileText },
    { key: "portafoglio", label: "Portafoglio ordini", icon: Briefcase },
    { key: "gruppi", label: "Gruppi d'acquisto", icon: Users2 },
    { key: "ordini", label: "Registro ordini", icon: ClipboardList },
    { key: "mappa", label: "Mappa", icon: MapIcon },
    { key: "statistiche", label: "Statistiche", icon: TrendingUp },
    { key: "fatturato", label: "Fatturato", icon: Wallet },
    ...(role === "admin" ? [{ key: "admin", label: "Pannello Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${COLORS.bg} 0%, #eef5fa 100%)`, fontFamily: "Arial, sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", padding: "14px 22px", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, boxShadow: "0 2px 12px rgba(11,123,196,0.2)", position: "sticky", top: 0, zIndex: 1000 }}>
        <button onClick={() => setMenuOpen((v) => !v)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", marginRight: 14 }}>
          <MenuIcon size={18} />
        </button>
        <span style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>CRM Arredo Bagno</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span className="email-utente" style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{session.user.email}</span>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut size={14} /> Esci
          </button>
        </div>
      </header>
      <div style={{ display: "flex" }}>
        {menuOpen && <div className="app-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
        {menuOpen && (
          <nav className="app-sidebar" style={{ width: 210, background: COLORS.card, borderRight: `1px solid ${COLORS.border}`, minHeight: "calc(100vh - 61px)", padding: "14px 10px" }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = page === item.key;
              return (
                <div key={item.key} className="nav-item" onClick={() => { setPage(item.key); if (window.innerWidth < 768) setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 4, borderRadius: 10, fontSize: 14, color: active ? COLORS.primary : COLORS.text, background: active ? "#eaf5fc" : "transparent", cursor: "pointer", fontWeight: active ? 600 : 400, borderLeft: active ? `3px solid ${COLORS.primary}` : "3px solid transparent" }}>
                  <Icon size={17} />
                  {item.label}
                </div>
              );
            })}
          </nav>
        )}
        <main key={page} className="page-content" style={{ flex: 1, padding: 28 }}>
          {page === "dashboard" && <Dashboard session={session} goTo={setPage} />}
          {page === "admin" && role === "admin" && <AdminPanel session={session} />}
          {page === "aziende" && <AziendeMandanti session={session} />}
          {page === "clienti" && <ClientiAnagrafica session={session} apriPreventivo={apriPreventivoCliente} apriGruppo={apriGruppoCliente} />}
          {page === "visite" && <CalendarioVisite session={session} />}
          {page === "preventivi" && (
            <PreventiviOfferte session={session} preventivoIniziale={preventivoAprireId} onPreventivoAperto={() => setPreventivoAprireId(null)} />
          )}
          {page === "mappa" && <MappaClienti session={session} />}
          {page === "statistiche" && <Statistiche session={session} />}
          {page === "fatturato" && <Fatturato session={session} />}
          {page === "ordini" && <RegistroOrdini session={session} apriPreventivo={apriPreventivoCliente} />}
          {page === "portafoglio" && <PortafoglioOrdini session={session} />}
          {page === "gruppi" && (
            <GruppiAcquisto session={session} gruppoIniziale={gruppoAprireId} onGruppoAperto={() => setGruppoAprireId(null)} />
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// STILE GLOBALE RESPONSIVE
// ============================================================
function StileGlobaleResponsive() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      button { transition: all 0.18s ease; }
      button:hover:not(:disabled) { filter: brightness(0.96); transform: translateY(-1px); }
      button:active:not(:disabled) { transform: translateY(0) scale(0.98); }
      input, select, textarea { transition: border-color 0.18s ease, box-shadow 0.18s ease; }
      input:focus, select:focus, textarea:focus { outline: none; border-color: #0b7bc4 !important; box-shadow: 0 0 0 3px rgba(11,123,196,0.12); }
      .dashboard-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
      .dashboard-card:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(11,123,196,0.14) !important; }
      .nav-item { transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; }
      .nav-item:hover { background: #f2f8fc !important; }
      table tbody tr { transition: background 0.15s ease; }
      table tbody tr:hover { background: #f7fbfe; }
      @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .page-content { animation: fadeSlideIn 0.25s ease; }
      .app-sidebar-backdrop { display: none; }
      @media (max-width: 768px) {
        main * { min-width: 0; }
        body { overflow-x: hidden; }
        .app-sidebar {
          position: fixed !important;
          top: 61px;
          left: 0;
          height: calc(100vh - 61px) !important;
          z-index: 40;
          box-shadow: 4px 0 16px rgba(0,0,0,0.15);
        }
        .app-sidebar-backdrop {
          display: block !important;
          position: fixed;
          top: 61px; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.35);
          z-index: 35;
        }
        table { display: block; overflow-x: auto; white-space: nowrap; }
        .tabella-righe-preventivo, .tabella-responsive { white-space: normal; }
        .tabella-righe-preventivo thead, .tabella-responsive thead { display: none; }
        .tabella-righe-preventivo, .tabella-righe-preventivo tbody, .tabella-righe-preventivo tr, .tabella-righe-preventivo td,
        .tabella-responsive, .tabella-responsive tbody, .tabella-responsive tr, .tabella-responsive td {
          display: block;
          width: 100%;
        }
        .tabella-righe-preventivo tr, .tabella-responsive tr {
          border: 1px solid #e2edf5;
          border-radius: 8px;
          margin-bottom: 8px;
          padding: 6px;
        }
        .tabella-righe-preventivo td, .tabella-responsive td {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          padding: 4px 2px;
          border: none;
          font-size: 12.5px;
          text-align: left;
        }
        .tabella-righe-preventivo td::before, .tabella-responsive td::before {
          content: attr(data-label);
          font-size: 11px;
          color: #7c8b98;
          flex-shrink: 0;
          min-width: 78px;
        }
        .tabella-righe-preventivo td input, .tabella-righe-preventivo td select {
          width: auto;
          flex: none;
          max-width: 130px;
        }
        .form-header-preventivo select, .form-header-preventivo input {
          max-width: none !important;
          width: 100% !important;
        }
        input, select, textarea { font-size: 16px !important; }
        main { padding: 10px !important; }
        .email-utente { display: none; }
        header { padding: 10px 12px !important; }
        h2 { font-size: 17px !important; margin-bottom: 8px !important; }
        h3 { font-size: 13px !important; }
      }
    `}</style>
  );
}

// ============================================================
// COMPONENTE RADICE
// ============================================================
export default function App() {
  const [session, setSession] = useState(null);
  return (
    <>
      <StileGlobaleResponsive />
      {!session ? (
        <LoginScreen onLogin={(data) => setSession(data)} />
      ) : (
        <AppShell session={session} onLogout={() => setSession(null)} />
      )}
    </>
  );
}
