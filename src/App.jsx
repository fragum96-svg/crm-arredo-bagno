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
      setError(
        "Configurazione Supabase mancante: inserisci URL e anon key nel codice prima di poter accedere."
      );
      return;
    }
    setLoading(true);
    try {
      const client = makeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(
          error.error_description || error.msg || "Email o password non corrette."
        );
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${COLORS.bg} 0%, #e8f3fa 100%)`,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: 360,
          padding: 36,
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          boxShadow: "0 12px 40px rgba(11,123,196,0.12)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <ShieldCheck size={22} color="#fff" />
        </div>
        <h1
          style={{
            fontSize: 21,
            fontWeight: 700,
            color: COLORS.text,
            marginBottom: 4,
          }}
        >
          CRM Arredo Bagno
        </h1>
        <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 24 }}>
          Accedi con le credenziali che ti sono state fornite
        </p>

        {!configured && (
          <div
            style={{
              background: "#fff4e5",
              color: "#9a5b00",
              fontSize: 12,
              padding: 10,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            Supabase non ancora configurato. Sostituisci SUPABASE_URL e
            SUPABASE_ANON_KEY nel codice.
          </div>
        )}

        <label style={{ fontSize: 13, color: "#333", display: "block", marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 16,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />

        <label style={{ fontSize: 13, color: "#333", display: "block", marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 16,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 0",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(11,123,196,0.25)",
          }}
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>

        <p style={{ fontSize: 11, color: "#9aa7b2", marginTop: 18, textAlign: "center" }}>
          Non hai un account? Le credenziali vengono create e distribuite
          dall'amministratore.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// PANNELLO ADMIN — creazione utenti + elenco utenti creati
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
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=email,role,created_at&order=created_at.desc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (e) {
      // silenzioso
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createUser = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const tempClient = makeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await tempClient.auth.signUp({ email, password });
      if (error) {
        setMsg({
          type: "error",
          text: error.error_description || error.msg || "Errore nella creazione dell'utente.",
        });
        return;
      }
      setMsg({
        type: "success",
        text: `Utente creato: ${email}. Comunicagli le credenziali.`,
      });
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

      <div
        style={{
          maxWidth: 420,
          padding: 24,
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          boxShadow: "0 4px 16px rgba(20,40,60,0.05)",
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 15, color: COLORS.primary, marginBottom: 4 }}>
          Crea nuovo utente
        </h3>
        <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>
          Genera le credenziali da consegnare al collaboratore. Nessuna
          registrazione pubblica è possibile.
        </p>
        <input
          type="email"
          placeholder="Email utente"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 10,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />
        <input
          type="text"
          placeholder="Password provvisoria"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 10,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={createUser}
          disabled={loading}
          style={{
            padding: "10px 18px",
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Creazione..." : "Crea utente"}
        </button>
        {msg && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: msg.type === "error" ? COLORS.danger : COLORS.success,
            }}
          >
            {msg.text}
          </div>
        )}
      </div>

      <div
        style={{
          maxWidth: 500,
          padding: 24,
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          boxShadow: "0 4px 16px rgba(20,40,60,0.05)",
        }}
      >
        <h3 style={{ fontSize: 15, color: COLORS.primary, marginBottom: 4 }}>
          Utenti creati
        </h3>
        <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>
          Per eliminare o disattivare un utente, vai su Supabase → Authentication
          → Users (per sicurezza questa operazione non è disponibile da qui).
        </p>
        {loadingUsers ? (
          <p style={{ fontSize: 12, color: COLORS.muted }}>Caricamento...</p>
        ) : users.length === 0 ? (
          <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun utente ancora.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
                <th style={{ padding: "6px 4px" }}>Email</th>
                <th style={{ padding: "6px 4px" }}>Ruolo</th>
                <th style={{ padding: "6px 4px" }}>Creato il</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f5f9" }}>
                  <td style={{ padding: "6px 4px" }}>{u.email}</td>
                  <td style={{ padding: "6px 4px" }}>{u.role}</td>
                  <td style={{ padding: "6px 4px" }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("it-IT") : "-"}
                  </td>
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
// DASHBOARD — riepilogo generale
// ============================================================
function Dashboard({ session, goTo }) {
  const [counts, setCounts] = useState({ clienti: 0, aziende: 0, visiteMese: 0, preventivi: 0 });
  const [loading, setLoading] = useState(true);

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

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
          fetch(`${SUPABASE_URL}/rest/v1/visite?select=id&data_visita=gte.${inizioMeseStr}`, {
            headers: headers(),
          }),
          fetch(`${SUPABASE_URL}/rest/v1/preventivi?select=id`, { headers: headers() }),
        ]);
        const [dClienti, dAziende, dVisite, dPreventivi] = await Promise.all([
          rClienti.json(),
          rAziende.json(),
          rVisite.json(),
          rPreventivi.json(),
        ]);
        setCounts({
          clienti: Array.isArray(dClienti) ? dClienti.length : 0,
          aziende: Array.isArray(dAziende) ? dAziende.length : 0,
          visiteMese: Array.isArray(dVisite) ? dVisite.length : 0,
          preventivi: Array.isArray(dPreventivi) ? dPreventivi.length : 0,
        });
      } catch (e) {
        // in caso di errore lasciamo i contatori a 0
      } finally {
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
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>
        Riepilogo generale della tua attività
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => goTo("visite")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(11,123,196,0.25)",
          }}
        >
          <CalendarDays size={16} /> Vai al Calendario
        </button>
        <button
          onClick={() => goTo("preventivi")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            background: "#fff",
            color: COLORS.primary,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <FileText size={16} /> Nuovo Preventivo
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              onClick={() => goTo(c.key)}
              style={{
                flex: "1 1 200px",
                minWidth: 180,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: 20,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
                transition: "transform 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: `${c.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Icon size={20} color={c.color} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.text }}>
                {loading ? "…" : c.value}
              </div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{c.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formattaEuro(n) {
  return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

async function geocodificaIndirizzo(indirizzo) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(indirizzo)}`
    );
    const data = await res.json();
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (e) {
    // silenzioso
  }
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

function MappaClienti({ session }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale,indirizzo,classificazione,latitudine,longitudine`,
          { headers: headers() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Errore nel caricamento");
        setClienti(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    (async () => {
      const L = await caricaLeaflet();
      if (!mapRef.current || mapInstance.current) return;
      const map = L.map(mapRef.current).setView([42.5, 12.5], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      mapInstance.current = map;
    })();
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L;
    const conCoordinate = clienti.filter((c) => c.latitudine && c.longitudine);
    const markers = [];
    conCoordinate.forEach((c) => {
      const m = L.marker([c.latitudine, c.longitudine])
        .addTo(mapInstance.current)
        .bindPopup(`<strong>${c.ragione_sociale}</strong><br/>${c.classificazione || ""}<br/>${c.indirizzo || ""}`);
      markers.push(m);
    });
    if (conCoordinate.length > 0) {
      const gruppo = L.featureGroup(markers);
      mapInstance.current.fitBounds(gruppo.getBounds().pad(0.2));
    }
    return () => {
      markers.forEach((m) => mapInstance.current && mapInstance.current.removeLayer(m));
    };
  }, [clienti]);

  const senzaCoordinate = clienti.filter((c) => c.indirizzo && (!c.latitudine || !c.longitudine));

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Mappa clienti</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
        Le coordinate si calcolano automaticamente quando salvi l'indirizzo in anagrafica.
      </p>
      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
      {loading && <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>}
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 480,
          borderRadius: 14,
          border: `1px solid ${COLORS.border}`,
          overflow: "hidden",
        }}
      />
      {senzaCoordinate.length > 0 && (
        <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 10 }}>
          {senzaCoordinate.length} cliente/i senza coordinate ancora calcolate: apri e risalva la
          loro scheda in Anagrafica clienti per posizionarli.
        </p>
      )}
    </div>
  );
}
function AziendeMandanti({ session }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadMsg, setUploadMsg] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const emptyForm = {
    nome: "",
    sconto1: "",
    sconto2: "",
    imballo_percentuale: "",
    trasporto: "",
    resi: "",
    note: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/aziende_mandanti?select=*&order=nome.asc`,
        { headers: headers() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel caricamento");
      setList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trovaColonna = (riga, candidati) => {
    const chiavi = Object.keys(riga);
    for (const c of candidati) {
      const trovata = chiavi.find((k) => k.toLowerCase().trim().includes(c));
      if (trovata) return riga[trovata];
    }
    return "";
  };

  const caricaListino = async (aziendaId, file) => {
    setUploadingId(aziendaId);
    setUploadMsg(null);
    try {
      let righe = [];
      const nomeFile = file.name.toLowerCase();

      if (nomeFile.endsWith(".csv")) {
        const testo = await file.text();
        const parsed = Papa.parse(testo, { header: true, skipEmptyLines: true, dynamicTyping: true });
        righe = parsed.data;
      } else if (nomeFile.endsWith(".xlsx") || nomeFile.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const primoFoglio = wb.Sheets[wb.SheetNames[0]];
        righe = XLSX.utils.sheet_to_json(primoFoglio, { defval: "" });
      } else {
        setUploadMsg({ type: "error", text: "Formato non supportato: usa file .xlsx, .xls o .csv." });
        setUploadingId(null);
        return;
      }

      const voci = righe
        .map((r) => ({
          azienda_id: aziendaId,
          codice_articolo: String(
            trovaColonna(r, ["codice", "articolo", "cod."])
          ).trim(),
          descrizione: String(trovaColonna(r, ["descrizione", "desc"])).trim(),
          prezzo_unitario:
            Number(
              String(trovaColonna(r, ["prezzo", "listino", "importo"]))
                .replace(",", ".")
                .replace(/[^\d.-]/g, "")
            ) || 0,
        }))
        .filter((v) => v.codice_articolo);

      if (voci.length === 0) {
        setUploadMsg({
          type: "error",
          text: "Nessuna riga valida trovata. Controlla che il file abbia colonne tipo Codice, Descrizione, Prezzo.",
        });
        setUploadingId(null);
        return;
      }

      await fetch(`${SUPABASE_URL}/rest/v1/listini?azienda_id=eq.${aziendaId}`, {
        method: "DELETE",
        headers: headers(),
      });

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

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const save = async () => {
    if (!form.nome.trim()) {
      setError("Il nome azienda è obbligatorio.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        nome: form.nome,
        sconto1: form.sconto1 !== "" ? Number(form.sconto1) : null,
        sconto2: form.sconto2 !== "" ? Number(form.sconto2) : null,
        imballo_percentuale:
          form.imballo_percentuale !== "" ? Number(form.imballo_percentuale) : null,
        trasporto: form.trasporto || null,
        resi: form.resi || null,
        note: form.note || null,
      };
      let res;
      if (editingId) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?id=eq.${editingId}`, {
          method: "PATCH",
          headers: { ...headers(), Prefer: "return=representation" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti`, {
          method: "POST",
          headers: { ...headers(), Prefer: "return=representation" },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore nel salvataggio");
      const idSalvato = editingId || (data && data[0] && data[0].id);
      if (idSalvato) {
        await registraAttivita(
          session,
          idSalvato,
          "modifica",
          editingId ? "Scheda anagrafica aggiornata" : "Cliente creato"
        );
      }
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
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Eliminare questa azienda?")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?id=eq.${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    marginBottom: 10,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    fontSize: 13,
    boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>
        Aziende mandanti
      </h2>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 280px",
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
            padding: 20,
            maxWidth: 340,
          }}
        >
          <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>
            {editingId ? "Modifica azienda" : "Nuova azienda"}
          </h3>
          <input
            placeholder="Nome azienda *"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Sconto 1 (%)"
            value={form.sconto1}
            onChange={(e) => setForm({ ...form, sconto1: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Sconto 2 (%)"
            value={form.sconto2}
            onChange={(e) => setForm({ ...form, sconto2: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Imballo (%)"
            value={form.imballo_percentuale}
            onChange={(e) => setForm({ ...form, imballo_percentuale: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Trasporto (policy)"
            value={form.trasporto}
            onChange={(e) => setForm({ ...form, trasporto: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Resi (policy)"
            value={form.resi}
            onChange={(e) => setForm({ ...form, resi: e.target.value })}
            style={inputStyle}
          />
          <textarea
            placeholder="Note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            style={{ ...inputStyle, minHeight: 60 }}
          />

          {error && (
            <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: "9px 16px",
                background: COLORS.primary,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Aggiungi azienda"}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                style={{
                  padding: "9px 16px",
                  background: "#fff",
                  color: COLORS.primary,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Annulla
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: "2 1 400px" }}>
          {uploadMsg && (
            <div
              style={{
                fontSize: 12,
                marginBottom: 10,
                color: uploadMsg.type === "error" ? COLORS.danger : COLORS.success,
              }}
            >
              {uploadMsg.text}
            </div>
          )}
          {loading ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
          ) : list.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>
              Nessuna azienda ancora inserita.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
                  <th style={{ padding: "8px 6px" }}>Nome</th>
                  <th style={{ padding: "8px 6px" }}>Sc. 1</th>
                  <th style={{ padding: "8px 6px" }}>Sc. 2</th>
                  <th style={{ padding: "8px 6px" }}>Imballo</th>
                  <th style={{ padding: "8px 6px" }}>Listino</th>
                  <th style={{ padding: "8px 6px" }}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{a.nome}</td>
                    <td style={{ padding: "8px 6px" }}>
                      {a.sconto1 != null ? `${a.sconto1}%` : "-"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {a.sconto2 != null ? `${a.sconto2}%` : "-"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {a.imballo_percentuale != null ? `${a.imballo_percentuale}%` : "-"}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          color: COLORS.primary,
                          cursor: "pointer",
                        }}
                      >
                        <Upload size={12} />
                        {uploadingId === a.id ? "Caricamento..." : "Carica"}
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) caricaListino(a.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => edit(a)}
                        style={{
                          background: "none",
                          border: "none",
                          color: COLORS.primary,
                          cursor: "pointer",
                          fontSize: 12,
                          marginRight: 10,
                        }}
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: COLORS.danger,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 10 }}>
            Il file deve avere colonne riconoscibili come Codice/Articolo, Descrizione, Prezzo/Listino.
            Caricare un nuovo file sostituisce il listino precedente di quell'azienda. Per i listini in
            PDF, convertili prima in Excel con un servizio online gratuito (es. "PDF to Excel") e poi
            caricali qui.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ANAGRAFICA CLIENTI — elenco, aggiunta, modifica, eliminazione
// ============================================================
const CLASSIFICAZIONI = [
  "Architetto",
  "Contractor",
  "Showroom",
  "Rivenditore termoidraulica",
  "Professionista",
  "Impresa",
  "Privato",
];

function ClientiAnagrafica({ session, apriPreventivo }) {
  const [list, setList] = useState([]);
  const [aziendeOptions, setAziendeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const emptyForm = {
    ragione_sociale: "",
    indirizzo: "",
    telefono: "",
    email: "",
    classificazione: "",
    aziende_collaborate: [],
    condizioni_per_azienda: {},
    competitor: "",
    note: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtroClassificazione, setFiltroClassificazione] = useState("");
  const [clienteApertoId, setClienteApertoId] = useState(null);

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [resClienti, resAziende] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/clienti?select=*&order=ragione_sociale.asc`, {
          headers: headers(),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc`, {
          headers: headers(),
        }),
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const toggleAzienda = (nome) => {
    setForm((f) => {
      const giaSelezionata = f.aziende_collaborate.includes(nome);
      const nuoveAziende = giaSelezionata
        ? f.aziende_collaborate.filter((n) => n !== nome)
        : [...f.aziende_collaborate, nome];
      const nuoveCondizioni = { ...f.condizioni_per_azienda };
      if (giaSelezionata) delete nuoveCondizioni[nome];
      return { ...f, aziende_collaborate: nuoveAziende, condizioni_per_azienda: nuoveCondizioni };
    });
  };

  const aggiornaCondizione = (nome, testo) => {
    setForm((f) => ({
      ...f,
      condizioni_per_azienda: { ...f.condizioni_per_azienda, [nome]: testo },
    }));
  };

  const save = async () => {
    if (!form.ragione_sociale.trim()) {
      setError("La ragione sociale è obbligatoria.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let coords = null;
      if (form.indirizzo && form.indirizzo.trim()) {
        coords = await geocodificaIndirizzo(form.indirizzo);
      }
      const body = {
        ragione_sociale: form.ragione_sociale,
        indirizzo: form.indirizzo || null,
        telefono: form.telefono || null,
        email: form.email || null,
        classificazione: form.classificazione || null,
        aziende_collaborate: form.aziende_collaborate,
        condizioni_per_azienda: form.condizioni_per_azienda,
        competitor: form.competitor
          ? form.competitor.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        note: form.note || null,
        ...(coords ? { latitudine: coords.lat, longitudine: coords.lon } : {}),
      };
      let res;
      if (editingId) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/clienti?id=eq.${editingId}`, {
          method: "PATCH",
          headers: { ...headers(), Prefer: "return=representation" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${SUPABASE_URL}/rest/v1/clienti`, {
          method: "POST",
          headers: { ...headers(), Prefer: "return=representation" },
          body: JSON.stringify(body),
        });
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
      const res = await fetch(`${SUPABASE_URL}/rest/v1/clienti?id=eq.${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    marginBottom: 10,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    fontSize: 13,
    boxSizing: "border-box",
  };

  const filteredList = filtroClassificazione
    ? list.filter((c) => c.classificazione === filtroClassificazione)
    : list;

  if (clienteApertoId) {
    return (
      <SchedaCliente
        clienteId={clienteApertoId}
        session={session}
        aziendeOptions={aziendeOptions}
        onApriPreventivo={apriPreventivo}
        onBack={() => {
          setClienteApertoId(null);
          load();
        }}
      />
    );
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>
        Anagrafica clienti
      </h2>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 300px",
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
            padding: 20,
            maxWidth: 380,
          }}
        >
          <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>
            {editingId ? "Modifica cliente" : "Nuovo cliente"}
          </h3>
          <input
            placeholder="Ragione sociale *"
            value={form.ragione_sociale}
            onChange={(e) => setForm({ ...form, ragione_sociale: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Indirizzo"
            value={form.indirizzo}
            onChange={(e) => setForm({ ...form, indirizzo: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Telefono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={inputStyle}
          />

          <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>
            Classificazione
          </label>
          <select
            value={form.classificazione}
            onChange={(e) => setForm({ ...form, classificazione: e.target.value })}
            style={inputStyle}
          >
            <option value="">-- seleziona --</option>
            {CLASSIFICAZIONI.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>
            Aziende mandanti con cui collabora
          </label>
          <div
            style={{
              marginBottom: 10,
              maxHeight: 220,
              overflowY: "auto",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: 8,
            }}
          >
            {aziendeOptions.length === 0 && (
              <span style={{ fontSize: 12, color: "#9aa7b2" }}>
                Nessuna azienda mandante inserita ancora
              </span>
            )}
            {aziendeOptions.map((a) => (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.aziende_collaborate.includes(a.nome)}
                    onChange={() => toggleAzienda(a.nome)}
                  />
                  {a.nome}
                </label>
                {form.aziende_collaborate.includes(a.nome) && (
                  <input
                    placeholder={`Condizioni commerciali con ${a.nome}`}
                    value={form.condizioni_per_azienda[a.nome] || ""}
                    onChange={(e) => aggiornaCondizione(a.nome, e.target.value)}
                    style={{
                      ...inputStyle,
                      marginBottom: 0,
                      marginLeft: 22,
                      width: "calc(100% - 22px)",
                      fontSize: 11,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <input
            placeholder="Competitor (separati da virgola)"
            value={form.competitor}
            onChange={(e) => setForm({ ...form, competitor: e.target.value })}
            style={inputStyle}
          />
          <textarea
            placeholder="Note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            style={{ ...inputStyle, minHeight: 60 }}
          />

          {error && (
            <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: "9px 16px",
                background: COLORS.primary,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Aggiungi cliente"}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                style={{
                  padding: "9px 16px",
                  background: "#fff",
                  color: COLORS.primary,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Annulla
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: "2 1 420px" }}>
          <div style={{ marginBottom: 12 }}>
            <select
              value={filtroClassificazione}
              onChange={(e) => setFiltroClassificazione(e.target.value)}
              style={{ ...inputStyle, maxWidth: 240, marginBottom: 0 }}
            >
              <option value="">Tutte le classificazioni</option>
              {CLASSIFICAZIONI.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
          ) : filteredList.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun cliente trovato.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>
                      <span
                        onClick={() => setClienteApertoId(c.id)}
                        style={{ cursor: "pointer", color: COLORS.primary }}
                      >
                        {c.ragione_sociale}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px" }}>{c.classificazione || "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{c.telefono || "-"}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => edit(c)}
                        style={{
                          background: "none",
                          border: "none",
                          color: COLORS.primary,
                          cursor: "pointer",
                          fontSize: 12,
                          marginRight: 10,
                        }}
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: COLORS.danger,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Elimina
                      </button>
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
// STATISTICHE
// ============================================================
function Statistiche({ session }) {
  const [ordini, setOrdini] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [rOrdini, rPreventivi, rClienti, rAziende] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati?select=*`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/preventivi?select=id,stato,righe,imballo_modalita,imballo_percentuale,imballo_valore,trasporto_modalita,trasporto_percentuale,trasporto_valore,iva_modalita,iva_percentuale,iva_valore`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome`, { headers: headers() }),
        ]);
        const [dOrdini, dPreventivi, dClienti, dAziende] = await Promise.all([
          rOrdini.json(), rPreventivi.json(), rClienti.json(), rAziende.json(),
        ]);
        setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
        setPreventivi(Array.isArray(dPreventivi) ? dPreventivi : []);
        setClienti(Array.isArray(dClienti) ? dClienti : []);
        setAziende(Array.isArray(dAziende) ? dAziende : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "Sconosciuto";
  const nomeAzienda = (id) => aziende.find((a) => a.id === id)?.nome || "Sconosciuta";

  const fatturatoPerCliente = {};
  ordini.forEach((o) => {
    const key = nomeCliente(o.cliente_id);
    fatturatoPerCliente[key] = (fatturatoPerCliente[key] || 0) + (Number(o.importo) || 0);
  });
  const classificaClienti = Object.entries(fatturatoPerCliente)
    .map(([nome, totale]) => ({ nome, totale }))
    .sort((a, b) => b.totale - a.totale);

  const fatturatoPerAzienda = {};
  ordini.forEach((o) => {
    const key = nomeAzienda(o.azienda_id);
    fatturatoPerAzienda[key] = (fatturatoPerAzienda[key] || 0) + (Number(o.importo) || 0);
  });
  const datiAziende = Object.entries(fatturatoPerAzienda)
    .map(([nome, totale]) => ({ nome, totale }))
    .sort((a, b) => b.totale - a.totale);

  const conteggioStati = { bozza: 0, inviato: 0, accettato: 0, rifiutato: 0 };
  preventivi.forEach((p) => {
    if (conteggioStati[p.stato] !== undefined) conteggioStati[p.stato]++;
  });
  const datiStati = STATI_PREVENTIVO.map((s) => ({
    name: s.label,
    value: conteggioStati[s.valore],
    color: s.colore,
  }));

  const fatturatoTotale = ordini.reduce((s, o) => s + (Number(o.importo) || 0), 0);

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Statistiche</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>
        Basate sugli ordini confermati e sui preventivi registrati
      </p>

      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
      ) : (
        <>
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 20,
              marginBottom: 20,
              maxWidth: 300,
              boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
            }}
          >
            <div style={{ fontSize: 12, color: COLORS.muted }}>Fatturato totale</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>{formattaEuro(fatturatoTotale)}</div>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
            <div
              style={{
                flex: "1 1 380px",
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: 20,
                boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
              }}
            >
              <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Fatturato per azienda mandante</h3>
              {datiAziende.length === 0 ? (
                <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun ordine ancora registrato.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={datiAziende}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef3f7" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formattaEuro(v)} />
                    <Bar dataKey="totale" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div
              style={{
                flex: "1 1 280px",
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: 20,
                boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
              }}
            >
              <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Preventivi per stato</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={datiStati} dataKey="value" nameKey="name" outerRadius={80} label>
                    {datiStati.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 20,
              boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
            }}
          >
            <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Fatturato per cliente</h3>
            {classificaClienti.length === 0 ? (
              <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun ordine ancora registrato.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
                    <th style={{ padding: "6px 4px" }}>Cliente</th>
                    <th style={{ padding: "6px 4px" }}>Fatturato</th>
                  </tr>
                </thead>
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
// FATTURATO — vista temporale (annuale/mensile) e per azienda/cliente
// ============================================================
const MESI_BREVI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function Fatturato({ session }) {
  const [ordini, setOrdini] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear());

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [rOrdini, rClienti, rAziende] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/ordini_confermati?select=*`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale`, { headers: headers() }),
          fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome`, { headers: headers() }),
        ]);
        const [dOrdini, dClienti, dAziende] = await Promise.all([rOrdini.json(), rClienti.json(), rAziende.json()]);
        setOrdini(Array.isArray(dOrdini) ? dOrdini : []);
        setClienti(Array.isArray(dClienti) ? dClienti : []);
        setAziende(Array.isArray(dAziende) ? dAziende : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "Sconosciuto";
  const nomeAzienda = (id) => aziende.find((a) => a.id === id)?.nome || "Sconosciuta";

  const fatturatoTotale = ordini.reduce((s, o) => s + (Number(o.importo) || 0), 0);

  const perAnno = {};
  ordini.forEach((o) => {
    const anno = new Date(o.data_ordine).getFullYear();
    perAnno[anno] = (perAnno[anno] || 0) + (Number(o.importo) || 0);
  });
  const datiAnnuali = Object.entries(perAnno)
    .map(([anno, totale]) => ({ anno, totale }))
    .sort((a, b) => a.anno - b.anno);
  const anniDisponibili = Object.keys(perAnno).map(Number).sort((a, b) => b - a);

  const perMese = Array(12).fill(0);
  ordini.forEach((o) => {
    const d = new Date(o.data_ordine);
    if (d.getFullYear() === annoSelezionato) perMese[d.getMonth()] += Number(o.importo) || 0;
  });
  const datiMensili = MESI_BREVI.map((m, i) => ({ mese: m, totale: perMese[i] }));

  const perAzienda = {};
  ordini.forEach((o) => {
    const key = nomeAzienda(o.azienda_id);
    perAzienda[key] = (perAzienda[key] || 0) + (Number(o.importo) || 0);
  });
  const datiAziende = Object.entries(perAzienda).map(([nome, totale]) => ({ nome, totale })).sort((a, b) => b.totale - a.totale);

  const perCliente = {};
  ordini.forEach((o) => {
    const key = nomeCliente(o.cliente_id);
    perCliente[key] = (perCliente[key] || 0) + (Number(o.importo) || 0);
  });
  const topClienti = Object.entries(perCliente).map(([nome, totale]) => ({ nome, totale })).sort((a, b) => b.totale - a.totale).slice(0, 8);

  const cardStyle = {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 4 }}>Fatturato</h2>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>
        Andamento del fatturato nel tempo, per azienda e per cliente
      </p>

      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
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
              <select
                value={annoSelezionato}
                onChange={(e) => setAnnoSelezionato(Number(e.target.value))}
                style={{ padding: "6px 10px", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12 }}
              >
                {(anniDisponibili.length ? anniDisponibili : [new Date().getFullYear()]).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
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

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div style={{ ...cardStyle, flex: "1 1 380px" }}>
              <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Suddivisione per azienda mandante</h3>
              {datiAziende.length === 0 ? (
                <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun dato ancora.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={datiAziende} dataKey="totale" nameKey="nome" outerRadius={80} label>
                      {datiAziende.map((_, i) => (
                        <Cell key={i} fill={["#0b7bc4", "#0e9488", "#c77d0b", "#7c4dbd", "#c0392b", "#1a7a3c"][i % 6]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formattaEuro(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ ...cardStyle, flex: "1 1 380px" }}>
              <h3 style={{ fontSize: 14, color: COLORS.text, marginBottom: 12 }}>Andamento clienti (top 8)</h3>
              {topClienti.length === 0 ? (
                <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun dato ancora.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
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
          </div>
        </>
      )}
    </div>
  );
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
  } catch (e) {
    // silenzioso
  }
}

function SchedaCliente({ clienteId, session, aziendeOptions, onBack, onApriPreventivo }) {
  const [cliente, setCliente] = useState(null);
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

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

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
      const [dCliente, dVisite, dPreventivi, dDocumenti, dOrdini, dAttivita] = await Promise.all([
        rCliente.json(), rVisite.json(), rPreventivi.json(), rDocumenti.json(), rOrdini.json(), rAttivita.json(),
      ]);
      setCliente(dCliente && dCliente[0]);
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

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
    if (!formOrdine.azienda_id || !formOrdine.importo) {
      setError("Seleziona azienda e importo per registrare l'ordine.");
      return;
    }
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
        body: JSON.stringify({
          cliente_id: clienteId,
          azienda_id: formOrdine.azienda_id,
          importo: Number(formOrdine.importo) || 0,
          data_ordine: formOrdine.data_ordine,
          note: formOrdine.note || null,
          storage_path: path,
        }),
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

  const nomeAzienda = (id) => aziendeOptions.find((a) => a.id === id)?.nome || "—";

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    marginBottom: 10,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    fontSize: 13,
    boxSizing: "border-box",
  };

  const sezione = (titolo, contenuto) => (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
        padding: 20,
        marginBottom: 20,
      }}
    >
      <h3 style={{ fontSize: 15, color: COLORS.text, marginBottom: 12 }}>{titolo}</h3>
      {contenuto}
    </div>
  );

  if (loading) return <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento scheda cliente...</p>;
  if (!cliente) return <p style={{ color: COLORS.danger, fontSize: 13 }}>Cliente non trovato.</p>;

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 13, marginBottom: 14 }}
      >
        ‹ Torna all'elenco clienti
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div
          style={{
            width: 10, height: 10, borderRadius: "50%",
            background: cliente.colore || COLORS.primary,
          }}
        />
        <h2 style={{ color: COLORS.text, fontSize: 22 }}>{cliente.ragione_sociale}</h2>
        {cliente.classificazione && (
          <span style={{ fontSize: 12, color: COLORS.muted, background: COLORS.bg, padding: "3px 10px", borderRadius: 12 }}>
            {cliente.classificazione}
          </span>
        )}
      </div>

      {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 14 }}>{error}</div>}

      {sezione(
        "Dati anagrafici",
        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8 }}>
          <div><strong>Indirizzo:</strong> {cliente.indirizzo || "-"}</div>
          <div><strong>Telefono:</strong> {cliente.telefono || "-"}</div>
          <div><strong>Email:</strong> {cliente.email || "-"}</div>
          <div><strong>Aziende collaborate:</strong> {(cliente.aziende_collaborate || []).join(", ") || "-"}</div>
          {cliente.condizioni_per_azienda && Object.keys(cliente.condizioni_per_azienda).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong>Condizioni commerciali:</strong>
              <ul style={{ margin: "4px 0 0 18px" }}>
                {Object.entries(cliente.condizioni_per_azienda).map(([az, cond]) => (
                  <li key={az} style={{ fontSize: 12 }}>{az}: {cond}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: 8 }}><strong>Competitor:</strong> {(cliente.competitor || []).join(", ") || "-"}</div>
          <div style={{ marginTop: 8 }}><strong>Note generali:</strong> {cliente.note || "-"}</div>
        </div>
      )}

      {sezione(
        "Storico visite",
        visite.length === 0 ? (
          <p style={{ fontSize: 12, color: COLORS.muted }}>Nessuna visita registrata.</p>
        ) : (
          visite.map((v) => (
            <div key={v.id} style={{ fontSize: 12, padding: "8px 0", borderBottom: "1px solid #f0f5f9" }}>
              <strong>{new Date(v.data_visita).toLocaleDateString("it-IT")}</strong>
              {v.argomenti_trattati ? ` — ${v.argomenti_trattati}` : ""}
            </div>
          ))
        )
      )}

      {sezione(
        "Preventivi collegati",
        preventivi.length === 0 ? (
          <p style={{ fontSize: 12, color: COLORS.muted }}>Nessun preventivo per questo cliente.</p>
        ) : (
          preventivi.map((p) => {
            const tot = calcolaTotaliPreventivo(p, p.righe || []);
            const infoStato = STATI_PREVENTIVO.find((s) => s.valore === p.stato) || STATI_PREVENTIVO[0];
            return (
              <div
                key={p.id}
                onClick={() => onApriPreventivo && onApriPreventivo(p.id)}
                style={{
                  fontSize: 12,
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                  cursor: onApriPreventivo ? "pointer" : "default",
                }}
              >
                <span>
                  <span style={{ color: infoStato.colore, fontWeight: 700 }}>● {infoStato.label}</span>
                  {" — "}{nomeAzienda(p.azienda_id)} — {p.rif || "senza rif."} — {new Date(p.data).toLocaleDateString("it-IT")}
                </span>
                <strong>{formattaEuro(tot.totaleFinale)}</strong>
              </div>
            );
          })
        )
      )}

      {sezione(
        "Ordini confermati",
        <div>
          {ordini.length === 0 ? (
            <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Nessun ordine confermato ancora.</p>
          ) : (
            ordini.map((o) => (
              <div key={o.id} style={{ fontSize: 12, padding: "8px 0", borderBottom: "1px solid #f0f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{nomeAzienda(o.azienda_id)} — {new Date(o.data_ordine).toLocaleDateString("it-IT")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong>{formattaEuro(o.importo)}</strong>
                  {o.storage_path && (
                    <a href={urlPubblicoStorage("documenti-clienti", o.storage_path)} target="_blank" rel="noreferrer" style={{ color: COLORS.primary, fontSize: 11 }}>
                      PDF
                    </a>
                  )}
                </span>
              </div>
            ))
          )}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={formOrdine.azienda_id}
                onChange={(e) => setFormOrdine({ ...formOrdine, azienda_id: e.target.value })}
                style={{ ...inputStyle, width: 160, marginBottom: 0 }}
              >
                <option value="">-- Azienda --</option>
                {aziendeOptions.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
              <input
                type="number"
                placeholder="Importo €"
                value={formOrdine.importo}
                onChange={(e) => setFormOrdine({ ...formOrdine, importo: e.target.value })}
                style={{ ...inputStyle, width: 110, marginBottom: 0 }}
              />
              <input
                type="date"
                value={formOrdine.data_ordine}
                onChange={(e) => setFormOrdine({ ...formOrdine, data_ordine: e.target.value })}
                style={{ ...inputStyle, width: 140, marginBottom: 0 }}
              />
              <label style={{ ...inputStyle, width: "auto", marginBottom: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: COLORS.primary }}>
                <Upload size={13} /> {fileOrdine ? fileOrdine.name.slice(0, 16) : "PDF ordine"}
                <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => setFileOrdine(e.target.files?.[0] || null)} />
              </label>
              <button
                onClick={salvaOrdine}
                disabled={savingOrdine}
                style={{ padding: "8px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                {savingOrdine ? "Salvataggio..." : "Registra ordine"}
              </button>
            </div>
          </div>
        </div>
      )}

      {sezione(
        "Documenti",
        <div>
          {documenti.length === 0 ? (
            <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Nessun documento caricato.</p>
          ) : (
            documenti.map((d) => (
              <div key={d.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #f0f5f9" }}>
                <a href={urlPubblicoStorage("documenti-clienti", d.storage_path)} target="_blank" rel="noreferrer" style={{ color: COLORS.primary }}>
                  {d.nome_file}
                </a>
                <span style={{ color: COLORS.muted, marginLeft: 8 }}>
                  {new Date(d.created_at).toLocaleDateString("it-IT")}
                </span>
              </div>
            ))
          )}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.primary, cursor: "pointer", marginTop: 10 }}>
            <Upload size={13} /> {uploadingDoc ? "Caricamento..." : "Carica documento"}
            <input
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) caricaDocumento(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {sezione(
        "Cronologia attività",
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              placeholder="Aggiungi una nota rapida..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            />
            <button
              onClick={aggiungiNota}
              style={{ padding: "8px 16px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Aggiungi
            </button>
          </div>
          {attivita.length === 0 ? (
            <p style={{ fontSize: 12, color: COLORS.muted }}>Nessuna attività registrata.</p>
          ) : (
            attivita.map((a) => (
              <div key={a.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid #f0f5f9" }}>
                <span style={{ color: COLORS.muted }}>{new Date(a.data).toLocaleDateString("it-IT")}</span> — {a.descrizione}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
const GIORNI_SETTIMANA = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = lunedì
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
  const emptyForm = {
    data_visita: toISODate(new Date()),
    argomenti_trattati: "",
    cataloghi_lasciati: "",
    note: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [resClienti, resVisite] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale&order=ragione_sociale.asc`, {
          headers: headers(),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/visite?select=*&order=data_visita.asc`, {
          headers: headers(),
        }),
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!clienteSelezionato) {
      setError("Seleziona un cliente.");
      return;
    }
    if (!form.data_visita) {
      setError("La data della visita è obbligatoria.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        cliente_id: clienteSelezionato,
        data_visita: form.data_visita,
        argomenti_trattati: form.argomenti_trattati || null,
        cataloghi_lasciati: form.cataloghi_lasciati || null,
        note: form.note || null,
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/visite`, {
        method: "POST",
        headers: { ...headers(), Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
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
      const res = await fetch(`${SUPABASE_URL}/rest/v1/visite?id=eq.${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    marginBottom: 10,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    fontSize: 13,
    boxSizing: "border-box",
  };

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "—";
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
        <button
          onClick={() => setMostraForm((v) => !v)}
          style={{
            padding: "9px 16px",
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {mostraForm ? "Chiudi" : "+ Nuova visita"}
        </button>
      </div>

      {mostraForm && (
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
            padding: 20,
            marginBottom: 20,
            maxWidth: 420,
          }}
        >
          <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>Registra / pianifica visita</h3>
          <select
            value={clienteSelezionato}
            onChange={(e) => setClienteSelezionato(e.target.value)}
            style={inputStyle}
          >
            <option value="">-- seleziona cliente --</option>
            {clienti.map((c) => (
              <option key={c.id} value={c.id}>{c.ragione_sociale}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.data_visita}
            onChange={(e) => setForm({ ...form, data_visita: e.target.value })}
            style={inputStyle}
          />
          <textarea
            placeholder="Argomenti trattati"
            value={form.argomenti_trattati}
            onChange={(e) => setForm({ ...form, argomenti_trattati: e.target.value })}
            style={{ ...inputStyle, minHeight: 50 }}
          />
          <textarea
            placeholder="Cataloghi / listini lasciati"
            value={form.cataloghi_lasciati}
            onChange={(e) => setForm({ ...form, cataloghi_lasciati: e.target.value })}
            style={{ ...inputStyle, minHeight: 40 }}
          />
          <textarea
            placeholder="Note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            style={{ ...inputStyle, minHeight: 40 }}
          />
          {error && <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "9px 16px",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => cambiaPeriodo(-1)} style={{ ...inputStyle, width: 36, cursor: "pointer", textAlign: "center" }}>‹</button>
          <span style={{ fontWeight: 700, color: COLORS.text, fontSize: 15, minWidth: 160, textAlign: "center" }}>
            {etichettaPeriodo()}
          </span>
          <button onClick={() => cambiaPeriodo(1)} style={{ ...inputStyle, width: 36, cursor: "pointer", textAlign: "center" }}>›</button>
          <button
            onClick={vaiAOggi}
            style={{ ...inputStyle, width: "auto", padding: "6px 12px", cursor: "pointer", color: COLORS.primary }}
          >
            Oggi
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["mese", "settimana", "giorno"].map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: viewMode === m ? COLORS.primary : "#fff",
                color: viewMode === m ? "#fff" : COLORS.text,
                fontSize: 12,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
      ) : (
        <>
          {viewMode === "mese" && (
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {GIORNI_SETTIMANA.map((g) => (
                  <div key={g} style={{ padding: "8px 4px", fontSize: 11, color: COLORS.muted, textAlign: "center", borderBottom: `1px solid ${COLORS.border}` }}>
                    {g}
                  </div>
                ))}
                {getMonthGrid(currentDate).map((d, i) => {
                  const iso = toISODate(d);
                  const eventi = visitePerGiorno(iso);
                  const fuoriMese = d.getMonth() !== currentDate.getMonth();
                  const isOggi = iso === oggiISO;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setGiornoSelezionato(iso);
                        setViewMode("giorno");
                        setCurrentDate(d);
                      }}
                      style={{
                        minHeight: 78,
                        padding: 6,
                        borderRight: `1px solid ${COLORS.border}`,
                        borderBottom: `1px solid ${COLORS.border}`,
                        opacity: fuoriMese ? 0.4 : 1,
                        cursor: "pointer",
                        background: isOggi ? "#eaf5fc" : "transparent",
                      }}
                    >
                      <div style={{ fontSize: 11, color: COLORS.text, fontWeight: isOggi ? 700 : 400, marginBottom: 4 }}>
                        {d.getDate()}
                      </div>
                      {eventi.slice(0, 2).map((v) => (
                        <div
                          key={v.id}
                          style={{
                            fontSize: 10,
                            background: "#0b7bc418",
                            color: COLORS.primary,
                            borderRadius: 4,
                            padding: "2px 4px",
                            marginBottom: 2,
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {nomeCliente(v.cliente_id)}
                        </div>
                      ))}
                      {eventi.length > 2 && (
                        <div style={{ fontSize: 10, color: COLORS.muted }}>+{eventi.length - 2} altre</div>
                      )}
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
                  <div
                    key={iso}
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      padding: 8,
                      minHeight: 140,
                      boxShadow: isOggi ? "0 0 0 2px #0b7bc4 inset" : "none",
                    }}
                  >
                    <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>
                      {GIORNI_SETTIMANA[(d.getDay() + 6) % 7]} {d.getDate()}
                    </div>
                    {eventi.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          fontSize: 11,
                          background: "#0b7bc418",
                          color: COLORS.primary,
                          borderRadius: 6,
                          padding: "4px 6px",
                          marginBottom: 4,
                        }}
                      >
                        {nomeCliente(v.cliente_id)}
                      </div>
                    ))}
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
                  <div
                    key={v.id}
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                      boxShadow: "0 2px 8px rgba(20,40,60,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 13 }}>
                        {nomeCliente(v.cliente_id)}
                      </div>
                      <button
                        onClick={() => remove(v.id)}
                        style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}
                      >
                        Elimina
                      </button>
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
// PREVENTIVI / OFFERTE
// ============================================================
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
  if (
    riga.prezzo_netto_manuale !== undefined &&
    riga.prezzo_netto_manuale !== "" &&
    riga.prezzo_netto_manuale !== null
  ) {
    return { totaleListino, netto: Number(riga.prezzo_netto_manuale) || 0 };
  }
  const dopoSconto1 = totaleListino * (1 - (Number(riga.sconto1) || 0) / 100);
  const dopoSconto2 = dopoSconto1 * (1 - (Number(riga.sconto2) || 0) / 100);
  return { totaleListino, netto: dopoSconto2 };
}

const STATI_PREVENTIVO = [
  { valore: "bozza", label: "Bozza", colore: "#9aa7b2" },
  { valore: "inviato", label: "Inviato", colore: "#d4a017" },
  { valore: "accettato", label: "Accettato", colore: "#1a7a3c" },
  { valore: "rifiutato", label: "Rifiutato", colore: "#c0392b" },
];

function SelettoreStato({ stato, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {STATI_PREVENTIVO.map((s) => (
        <button
          key={s.valore}
          onClick={() => onChange(s.valore)}
          style={{
            padding: "6px 12px",
            borderRadius: 20,
            border: stato === s.valore ? `2px solid ${s.colore}` : "1px solid #e2edf5",
            background: stato === s.valore ? `${s.colore}18` : "#fff",
            color: s.colore,
            fontSize: 12,
            fontWeight: stato === s.valore ? 700 : 500,
            cursor: "pointer",
          }}
        >
          ● {s.label}
        </button>
      ))}
    </div>
  );
}

// modalita possibili per imballo/trasporto/iva: "escluso" | "percentuale" | "euro" | "nascosto"
function calcolaValoreVoce(modalita, percentuale, valoreEuro, base) {
  if (modalita === "nascosto" || modalita === "escluso") return 0;
  if (modalita === "percentuale") return base * ((Number(percentuale) || 0) / 100);
  if (modalita === "euro") return Number(valoreEuro) || 0;
  return 0;
}

function calcolaTotaliPreventivo(t, righeArr) {
  const totaleNetto = righeArr.reduce((sum, r) => sum + calcolaRigaNetto(r).netto, 0);

  const valoreImballo = calcolaValoreVoce(
    t.imballo_modalita,
    t.imballo_percentuale,
    t.imballo_valore,
    totaleNetto
  );
  const sub1 = totaleNetto + valoreImballo;

  const valoreTrasporto = calcolaValoreVoce(
    t.trasporto_modalita,
    t.trasporto_percentuale,
    t.trasporto_valore,
    sub1
  );
  const sub2 = sub1 + valoreTrasporto;

  const valoreIva = calcolaValoreVoce(t.iva_modalita, t.iva_percentuale, t.iva_valore, sub2);
  const totaleFinale = sub2 + valoreIva;

  return { totaleNetto, valoreImballo, valoreTrasporto, valoreIva, totaleFinale };
}

function generaStampaHTML(p, clienti, aziende) {
  const cliente = clienti.find((c) => c.id === p.cliente_id);
  const azienda = aziende.find((a) => a.id === p.azienda_id);
  const righeArr = p.righe || [];
  const tot = calcolaTotaliPreventivo(p, righeArr);
  const soloNetto = p.modalita_prezzi_pdf === "solo_netto";

  const intestazioneColonne = soloNetto
    ? `<th>Articolo</th><th>Descrizione</th><th>Finitura</th><th>Qtà</th><th>Prezzo netto un.</th><th>Prezzo netto totale</th>`
    : `<th>Articolo</th><th>Descrizione</th><th>Finitura</th><th>Qtà</th><th>Prezzo listino un.</th><th>Sc.1</th><th>Sc.2</th><th>Prezzo netto un.</th><th>Prezzo netto totale</th>`;

  const righeHtml = righeArr
    .map((r) => {
      const { netto } = calcolaRigaNetto(r);
      const qta = Number(r.quantita) || 0;
      const nettoUnitario = qta > 0 ? netto / qta : netto;
      if (soloNetto) {
        return `<tr><td>${r.articolo || ""}</td><td>${r.descrizione || ""}</td><td>${
          r.finitura || ""
        }</td><td>${r.quantita || ""}</td><td>${formattaEuro(nettoUnitario)}</td><td>${formattaEuro(
          netto
        )}</td></tr>`;
      }
      return `<tr><td>${r.articolo || ""}</td><td>${r.descrizione || ""}</td><td>${
        r.finitura || ""
      }</td><td>${r.quantita || ""}</td><td>${formattaEuro(r.prezzo_unitario)}</td><td>${
        r.sconto1 || 0
      }%</td><td>${r.sconto2 || 0}%</td><td>${formattaEuro(nettoUnitario)}</td><td>${formattaEuro(
        netto
      )}</td></tr>`;
    })
    .join("");

  const rigaVoce = (label, modalita, valore) => {
    if (modalita === "nascosto") return "";
    if (modalita === "escluso") return `<div>${label}: escluso</div>`;
    return `<div>${label}: ${formattaEuro(valore)}</div>`;
  };

  const infoStato = STATI_PREVENTIVO.find((s) => s.valore === p.stato) || STATI_PREVENTIVO[0];

  return `<!doctype html><html><head><meta charset="utf-8"><title>Preventivo ${
    p.rif || ""
  }</title>
  <style>
    body{font-family:Arial, sans-serif; padding:40px; color:#1a1a1a;}
    h1{color:#1a1a1a; font-size:22px; margin-bottom:2px; font-weight:700; letter-spacing:0.3px;}
    p{font-size:13px; margin:2px 0; color:#1a1a1a;}
    table{width:100%; border-collapse:collapse; margin-top:20px;}
    th,td{border-bottom:1px solid #ddd; padding:8px; text-align:left; font-size:12px; color:#1a1a1a;}
    th{color:#555; font-weight:600;}
    .totali{margin-top:20px; text-align:right; font-size:13px;}
    .totali strong{font-size:16px; color:#1a1a1a; border-top:2px solid #1a1a1a; padding-top:6px; display:inline-block;}
  </style></head>
  <body>
    <h1>${azienda ? azienda.nome : ""}</h1>
    <p>Data: ${p.data ? new Date(p.data).toLocaleDateString("it-IT") : ""}</p>
    <p>Spettabile: ${cliente ? cliente.ragione_sociale : ""}${p.rif ? ` — Rif. ${p.rif}` : ""}</p>
    <table>
      <thead><tr>${intestazioneColonne}</tr></thead>
      <tbody>${righeHtml}</tbody>
    </table>
    <div class="totali">
      ${rigaVoce("Imballo", p.imballo_modalita, tot.valoreImballo)}
      ${rigaVoce("Trasporto", p.trasporto_modalita, tot.valoreTrasporto)}
      ${rigaVoce("IVA", p.iva_modalita, tot.valoreIva)}
      <div><strong>Totale: ${formattaEuro(tot.totaleFinale)}</strong></div>
    </div>
    ${p.modalita_pagamento ? `<p style="margin-top:20px;"><strong>Modalità di pagamento:</strong> ${p.modalita_pagamento}</p>` : ""}
    ${p.note ? `<p style="margin-top:10px;"><strong>Note:</strong> ${p.note}</p>` : ""}
  </body></html>`;
}

function stampaPreventivo(p, clienti, aziende) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(generaStampaHTML(p, clienti, aziende));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function SelettoreVoce({ label, modalita, percentuale, valoreEuro, onChange, inputStyle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <label style={{ fontSize: 12, minWidth: 80 }}>{label}</label>
      <select
        value={modalita}
        onChange={(e) => onChange({ modalita: e.target.value })}
        style={{ ...inputStyle, width: 130 }}
      >
        <option value="escluso">Escluso</option>
        <option value="percentuale">In %</option>
        <option value="euro">In €</option>
        <option value="nascosto">Non mostrare</option>
      </select>
      {modalita === "percentuale" && (
        <input
          type="number"
          value={percentuale}
          onChange={(e) => onChange({ percentuale: e.target.value })}
          style={{ ...inputStyle, width: 70 }}
          placeholder="%"
        />
      )}
      {modalita === "euro" && (
        <input
          type="number"
          value={valoreEuro}
          onChange={(e) => onChange({ valoreEuro: e.target.value })}
          style={{ ...inputStyle, width: 80 }}
          placeholder="€"
        />
      )}
    </div>
  );
}

function PreventiviOfferte({ session, preventivoIniziale, onPreventivoAperto }) {
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyHeader = {
    cliente_id: "",
    azienda_id: "",
    rif: "",
    data: new Date().toISOString().slice(0, 10),
    imballo_modalita: "percentuale",
    imballo_percentuale: 0,
    imballo_valore: 0,
    trasporto_modalita: "escluso",
    trasporto_percentuale: 0,
    trasporto_valore: 0,
    iva_modalita: "escluso",
    iva_percentuale: 22,
    iva_valore: 0,
    modalita_pagamento: "",
    modalita_prezzi_pdf: "dettagliato",
    stato: "bozza",
    note: "",
  };
  const [header, setHeader] = useState(emptyHeader);
  const [righe, setRighe] = useState([nuovaRiga()]);
  const [suggerimenti, setSuggerimenti] = useState({});

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

  const cercaSuggerimenti = async (rigaId, testo) => {
    if (!header.azienda_id || !testo || testo.length < 2) {
      setSuggerimenti((s) => ({ ...s, [rigaId]: [] }));
      return;
    }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/listini?azienda_id=eq.${header.azienda_id}&codice_articolo=ilike.*${encodeURIComponent(
          testo
        )}*&select=*&limit=6`,
        { headers: headers() }
      );
      const data = await res.json();
      if (res.ok) setSuggerimenti((s) => ({ ...s, [rigaId]: data }));
    } catch (e) {
      // silenzioso
    }
  };

  const selezionaSuggerimento = (rigaId, voce) => {
    setRighe((r) =>
      r.map((x) =>
        x.id === rigaId
          ? {
              ...x,
              articolo: voce.codice_articolo,
              descrizione: voce.descrizione,
              prezzo_unitario: voce.prezzo_unitario,
            }
          : x
      )
    );
    setSuggerimenti((s) => ({ ...s, [rigaId]: [] }));
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [resClienti, resAziende, resPreventivi] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,ragione_sociale&order=ragione_sociale.asc`, {
          headers: headers(),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/aziende_mandanti?select=id,nome&order=nome.asc`, {
          headers: headers(),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/preventivi?select=*&order=data.desc`, {
          headers: headers(),
        }),
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setHeader(emptyHeader);
    setRighe([nuovaRiga()]);
    setEditingId(null);
  };

  const aggiungiRiga = () => setRighe((r) => [...r, nuovaRiga()]);
  const rimuoviRiga = (id) => setRighe((r) => r.filter((x) => x.id !== id));
  const aggiornaRiga = (id, campo, valore) =>
    setRighe((r) => r.map((x) => (x.id === id ? { ...x, [campo]: valore } : x)));

  const tot = calcolaTotaliPreventivo(header, righe);

  const salva = async () => {
    if (!header.cliente_id || !header.azienda_id) {
      setError("Seleziona cliente e azienda.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        cliente_id: header.cliente_id,
        azienda_id: header.azienda_id,
        rif: header.rif || null,
        data: header.data,
        righe: righe,
        imballo_modalita: header.imballo_modalita,
        imballo_percentuale: Number(header.imballo_percentuale) || 0,
        imballo_valore: Number(header.imballo_valore) || 0,
        trasporto_modalita: header.trasporto_modalita,
        trasporto_percentuale: Number(header.trasporto_percentuale) || 0,
        trasporto_valore: Number(header.trasporto_valore) || 0,
        iva_modalita: header.iva_modalita,
        iva_percentuale: Number(header.iva_percentuale) || 0,
        iva_valore: Number(header.iva_valore) || 0,
        modalita_pagamento: header.modalita_pagamento || null,
        modalita_prezzi_pdf: header.modalita_prezzi_pdf || "dettagliato",
        stato: header.stato || "bozza",
        note: header.note || null,
      };
      let res;
      if (editingId) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/preventivi?id=eq.${editingId}`, {
          method: "PATCH",
          headers: { ...headers(), Prefer: "return=representation" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${SUPABASE_URL}/rest/v1/preventivi`, {
          method: "POST",
          headers: { ...headers(), Prefer: "return=representation" },
          body: JSON.stringify(body),
        });
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
      cliente_id: p.cliente_id || "",
      azienda_id: p.azienda_id || "",
      rif: p.rif || "",
      data: p.data || new Date().toISOString().slice(0, 10),
      imballo_modalita: p.imballo_modalita || "percentuale",
      imballo_percentuale: p.imballo_percentuale || 0,
      imballo_valore: p.imballo_valore || 0,
      trasporto_modalita: p.trasporto_modalita || "escluso",
      trasporto_percentuale: p.trasporto_percentuale || 0,
      trasporto_valore: p.trasporto_valore || 0,
      iva_modalita: p.iva_modalita || "escluso",
      iva_percentuale: p.iva_percentuale ?? 22,
      iva_valore: p.iva_valore || 0,
      modalita_pagamento: p.modalita_pagamento || "",
      modalita_prezzi_pdf: p.modalita_prezzi_pdf || "dettagliato",
      stato: p.stato || "bozza",
      note: p.note || "",
    });
    setRighe(p.righe && p.righe.length ? p.righe : [nuovaRiga()]);
  };

  useEffect(() => {
    if (!preventivoIniziale) return;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/preventivi?id=eq.${preventivoIniziale}&select=*`, {
          headers: headers(),
        });
        const data = await res.json();
        if (res.ok && data && data[0]) modifica(data[0]);
      } catch (e) {
        // silenzioso
      }
      if (onPreventivoAperto) onPreventivoAperto();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preventivoIniziale]);

  const elimina = async (id) => {
    if (!window.confirm("Eliminare questo preventivo?")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/preventivi?id=eq.${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.ragione_sociale || "—";
  const nomeAzienda = (id) => aziende.find((a) => a.id === id)?.nome || "—";

  const inputStyle = {
    padding: "6px 8px",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    fontSize: 12,
    boxSizing: "border-box",
  };
  const fieldStyle = {
    width: "100%",
    padding: "8px 10px",
    marginBottom: 10,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    fontSize: 13,
    boxSizing: "border-box",
  };

  const rigaTotali = (label, modalita, valore) => {
    if (modalita === "nascosto") return null;
    return (
      <div style={{ color: COLORS.muted }}>
        {label}: {modalita === "escluso" ? "escluso" : formattaEuro(valore)}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>
        Preventivi / Offerte
      </h2>

      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          boxShadow: "0 4px 14px rgba(20,40,60,0.05)",
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>
          {editingId ? "Modifica preventivo" : "Nuovo preventivo"}
        </h3>

        <div className="form-header-preventivo" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <select
            value={header.azienda_id}
            onChange={(e) => setHeader({ ...header, azienda_id: e.target.value })}
            style={{ ...fieldStyle, maxWidth: 220 }}
          >
            <option value="">-- Azienda --</option>
            {aziende.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <select
            value={header.cliente_id}
            onChange={(e) => setHeader({ ...header, cliente_id: e.target.value })}
            style={{ ...fieldStyle, maxWidth: 220 }}
          >
            <option value="">-- Cliente (Spettabile) --</option>
            {clienti.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ragione_sociale}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={header.data}
            onChange={(e) => setHeader({ ...header, data: e.target.value })}
            style={{ ...fieldStyle, maxWidth: 160 }}
          />
          <input
            placeholder="RIF"
            value={header.rif}
            onChange={(e) => setHeader({ ...header, rif: e.target.value })}
            style={{ ...fieldStyle, maxWidth: 160 }}
          />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 12 }} className="tabella-righe-preventivo">
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ padding: 6 }}>Art.</th>
              <th style={{ padding: 6 }}>Descrizione</th>
              <th style={{ padding: 6 }}>Finitura</th>
              <th style={{ padding: 6 }}>Qtà</th>
              <th style={{ padding: 6 }}>Prezzo un.</th>
              <th style={{ padding: 6 }}>Sc.1 %</th>
              <th style={{ padding: 6 }}>Sc.2 %</th>
              <th style={{ padding: 6 }}>Netto manuale</th>
              <th style={{ padding: 6 }}>Netto</th>
              <th style={{ padding: 6 }}></th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => {
              const { netto } = calcolaRigaNetto(r);
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                  <td style={{ padding: 4, position: "relative" }} data-label="Articolo">
                    <input
                      value={r.articolo}
                      onChange={(e) => {
                        aggiornaRiga(r.id, "articolo", e.target.value);
                        cercaSuggerimenti(r.id, e.target.value);
                      }}
                      style={{ ...inputStyle, width: 70 }}
                      autoComplete="off"
                    />
                    {suggerimenti[r.id] && suggerimenti[r.id].length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          zIndex: 10,
                          background: "#fff",
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 8,
                          boxShadow: "0 4px 14px rgba(20,40,60,0.12)",
                          minWidth: 220,
                          maxHeight: 160,
                          overflowY: "auto",
                        }}
                      >
                        {suggerimenti[r.id].map((voce) => (
                          <div
                            key={voce.id}
                            onClick={() => selezionaSuggerimento(r.id, voce)}
                            style={{
                              padding: "6px 10px",
                              fontSize: 11,
                              cursor: "pointer",
                              borderBottom: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <strong>{voce.codice_articolo}</strong> — {voce.descrizione} (
                            {formattaEuro(voce.prezzo_unitario)})
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 4 }} data-label="Descrizione">
                    <input
                      value={r.descrizione}
                      onChange={(e) => aggiornaRiga(r.id, "descrizione", e.target.value)}
                      style={{ ...inputStyle, width: 150 }}
                    />
                  </td>
                  <td style={{ padding: 4 }} data-label="Finitura">
                    <input
                      value={r.finitura}
                      onChange={(e) => aggiornaRiga(r.id, "finitura", e.target.value)}
                      style={{ ...inputStyle, width: 70 }}
                    />
                  </td>
                  <td style={{ padding: 4 }} data-label="Qtà">
                    <input
                      type="number"
                      value={r.quantita}
                      onChange={(e) => aggiornaRiga(r.id, "quantita", e.target.value)}
                      style={{ ...inputStyle, width: 45 }}
                    />
                  </td>
                  <td style={{ padding: 4 }} data-label="Prezzo un.">
                    <input
                      type="number"
                      value={r.prezzo_unitario}
                      onChange={(e) => aggiornaRiga(r.id, "prezzo_unitario", e.target.value)}
                      style={{ ...inputStyle, width: 65 }}
                    />
                  </td>
                  <td style={{ padding: 4 }} data-label="Sc.1 %">
                    <input
                      type="number"
                      value={r.sconto1}
                      onChange={(e) => aggiornaRiga(r.id, "sconto1", e.target.value)}
                      style={{ ...inputStyle, width: 50 }}
                    />
                  </td>
                  <td style={{ padding: 4 }} data-label="Sc.2 %">
                    <input
                      type="number"
                      value={r.sconto2}
                      onChange={(e) => aggiornaRiga(r.id, "sconto2", e.target.value)}
                      style={{ ...inputStyle, width: 50 }}
                    />
                  </td>
                  <td style={{ padding: 4 }} data-label="Netto manuale">
                    <input
                      type="number"
                      placeholder="opz."
                      value={r.prezzo_netto_manuale}
                      onChange={(e) => aggiornaRiga(r.id, "prezzo_netto_manuale", e.target.value)}
                      style={{ ...inputStyle, width: 65 }}
                    />
                  </td>
                  <td style={{ padding: 4, fontWeight: 600 }} data-label="Netto">
                    {formattaEuro(netto)}
                  </td>
                  <td style={{ padding: 4 }} data-label="">
                    <button
                      onClick={() => rimuoviRiga(r.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: COLORS.danger,
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      ✕ Rimuovi riga
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: COLORS.muted, marginTop: -6, marginBottom: 16 }}>
          Compila "Netto manuale" per fissare direttamente il prezzo netto di una riga,
          ignorando listino e sconti.
        </p>

        <button
          onClick={aggiungiRiga}
          style={{
            padding: "6px 12px",
            background: "#fff",
            color: COLORS.primary,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            fontSize: 12,
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          + Aggiungi riga
        </button>

        <div
          style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <SelettoreVoce
            label="Imballo"
            modalita={header.imballo_modalita}
            percentuale={header.imballo_percentuale}
            valoreEuro={header.imballo_valore}
            inputStyle={inputStyle}
            onChange={(patch) =>
              setHeader({
                ...header,
                imballo_modalita: patch.modalita ?? header.imballo_modalita,
                imballo_percentuale: patch.percentuale ?? header.imballo_percentuale,
                imballo_valore: patch.valoreEuro ?? header.imballo_valore,
              })
            }
          />
          <SelettoreVoce
            label="Trasporto"
            modalita={header.trasporto_modalita}
            percentuale={header.trasporto_percentuale}
            valoreEuro={header.trasporto_valore}
            inputStyle={inputStyle}
            onChange={(patch) =>
              setHeader({
                ...header,
                trasporto_modalita: patch.modalita ?? header.trasporto_modalita,
                trasporto_percentuale: patch.percentuale ?? header.trasporto_percentuale,
                trasporto_valore: patch.valoreEuro ?? header.trasporto_valore,
              })
            }
          />
          <SelettoreVoce
            label="IVA"
            modalita={header.iva_modalita}
            percentuale={header.iva_percentuale}
            valoreEuro={header.iva_valore}
            inputStyle={inputStyle}
            onChange={(patch) =>
              setHeader({
                ...header,
                iva_modalita: patch.modalita ?? header.iva_modalita,
                iva_percentuale: patch.percentuale ?? header.iva_percentuale,
                iva_valore: patch.valoreEuro ?? header.iva_valore,
              })
            }
          />

          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>
              Modalità di pagamento
            </label>
            <input
              placeholder="Es. 30% all'ordine, saldo alla consegna"
              value={header.modalita_pagamento}
              onChange={(e) => setHeader({ ...header, modalita_pagamento: e.target.value })}
              style={{ ...fieldStyle, marginBottom: 0, maxWidth: 400 }}
            />
          </div>

          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>
              Prezzi mostrati nel PDF
            </label>
            <select
              value={header.modalita_prezzi_pdf}
              onChange={(e) => setHeader({ ...header, modalita_prezzi_pdf: e.target.value })}
              style={{ ...inputStyle, maxWidth: 300 }}
            >
              <option value="dettagliato">Completo (listino + sconti + netto)</option>
              <option value="solo_netto">Solo prezzi netti (unitario e totale)</option>
            </select>
          </div>
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 6 }}>
              Stato preventivo
            </label>
            <SelettoreStato stato={header.stato} onChange={(v) => setHeader({ ...header, stato: v })} />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>
              Note
            </label>
            <textarea
              placeholder="Annotazioni aggiuntive sul preventivo"
              value={header.note}
              onChange={(e) => setHeader({ ...header, note: e.target.value })}
              style={{ ...fieldStyle, marginBottom: 0, maxWidth: 500, minHeight: 60 }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <div style={{ textAlign: "right", minWidth: 220 }}>
            <div style={{ color: COLORS.muted }}>Totale netto: {formattaEuro(tot.totaleNetto)}</div>
            {rigaTotali("Imballo", header.imballo_modalita, tot.valoreImballo)}
            {rigaTotali("Trasporto", header.trasporto_modalita, tot.valoreTrasporto)}
            {rigaTotali("IVA", header.iva_modalita, tot.valoreIva)}
            <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 16, marginTop: 4 }}>
              Totale: {formattaEuro(tot.totaleFinale)}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={salva}
            disabled={saving}
            style={{
              padding: "9px 16px",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {saving ? "Salvataggio..." : editingId ? "Salva modifiche" : "Salva preventivo"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              style={{
                padding: "9px 16px",
                background: "#fff",
                color: COLORS.primary,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Annulla
            </button>
          )}
        </div>
      </div>

      <h3 style={{ fontSize: 14, color: "#333", marginBottom: 12 }}>
        Preventivi salvati
      </h3>
      {loading ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
      ) : lista.length === 0 ? (
        <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessun preventivo salvato.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ padding: "8px 6px" }}>Stato</th>
              <th style={{ padding: "8px 6px" }}>RIF</th>
              <th style={{ padding: "8px 6px" }}>Data</th>
              <th style={{ padding: "8px 6px" }}>Cliente</th>
              <th style={{ padding: "8px 6px" }}>Azienda</th>
              <th style={{ padding: "8px 6px" }}></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const infoStato = STATI_PREVENTIVO.find((s) => s.valore === p.stato) || STATI_PREVENTIVO[0];
              return (
              <tr key={p.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                <td style={{ padding: "8px 6px" }}>
                  <span style={{ color: infoStato.colore, fontSize: 12, fontWeight: 700 }}>
                    ● {infoStato.label}
                  </span>
                </td>
                <td style={{ padding: "8px 6px" }}>{p.rif || "-"}</td>
                <td style={{ padding: "8px 6px" }}>
                  {p.data ? new Date(p.data).toLocaleDateString("it-IT") : "-"}
                </td>
                <td style={{ padding: "8px 6px" }}>{nomeCliente(p.cliente_id)}</td>
                <td style={{ padding: "8px 6px" }}>{nomeAzienda(p.azienda_id)}</td>
                <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                  <button
                    onClick={() => stampaPreventivo(p, clienti, aziende)}
                    style={{
                      background: "none",
                      border: "none",
                      color: COLORS.success,
                      cursor: "pointer",
                      fontSize: 12,
                      marginRight: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Printer size={13} /> PDF
                  </button>
                  <button
                    onClick={() => modifica(p)}
                    style={{
                      background: "none",
                      border: "none",
                      color: COLORS.primary,
                      cursor: "pointer",
                      fontSize: 12,
                      marginRight: 10,
                    }}
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => elimina(p.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: COLORS.danger,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Elimina
                  </button>
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
// SHELL PRINCIPALE APP (dietro login)
// ============================================================
function AppShell({ session, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [role, setRole] = useState("user");
  const [preventivoAprireId, setPreventivoAprireId] = useState(null);

  const apriPreventivoCliente = (id) => {
    setPreventivoAprireId(id);
    setPage("preventivi");
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=role`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );
        const data = await res.json();
        if (data && data[0]) setRole(data[0].role);
      } catch (e) {
        // silenzioso: resta 'user'
      }
    })();
  }, [session]);

  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "clienti", label: "Clienti", icon: Users },
    { key: "aziende", label: "Aziende mandanti", icon: Building2 },
    { key: "visite", label: "Visite", icon: CalendarDays },
    { key: "preventivi", label: "Preventivi", icon: FileText },
    { key: "mappa", label: "Mappa", icon: MapIcon },
    { key: "statistiche", label: "Statistiche", icon: TrendingUp },
    { key: "fatturato", label: "Fatturato", icon: Wallet },
    ...(role === "admin" ? [{ key: "admin", label: "Pannello Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "Arial, sans-serif" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 22px",
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
          boxShadow: "0 2px 12px rgba(11,123,196,0.2)",
        }}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 8,
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            marginRight: 14,
          }}
        >
          <MenuIcon size={18} />
        </button>
        <span style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>CRM Arredo Bagno</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
            {session.user.email}
          </span>
          <button
            onClick={onLogout}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 12,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <LogOut size={14} /> Esci
          </button>
        </div>
      </header>

      <div style={{ display: "flex" }}>
        {menuOpen && (
          <div
            className="app-sidebar-backdrop"
            onClick={() => setMenuOpen(false)}
          />
        )}
        {menuOpen && (
          <nav
            className="app-sidebar"
            style={{
              width: 210,
              background: COLORS.card,
              borderRight: `1px solid ${COLORS.border}`,
              minHeight: "calc(100vh - 61px)",
              padding: "14px 10px",
            }}
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = page === item.key;
              return (
                <div
                  key={item.key}
                  onClick={() => {
                    setPage(item.key);
                    if (window.innerWidth < 768) setMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    marginBottom: 4,
                    borderRadius: 10,
                    fontSize: 14,
                    color: active ? COLORS.primary : COLORS.text,
                    background: active ? "#eaf5fc" : "transparent",
                    cursor: "pointer",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <Icon size={17} />
                  {item.label}
                </div>
              );
            })}
          </nav>
        )}

        <main style={{ flex: 1, padding: 28 }}>
          {page === "dashboard" && <Dashboard session={session} goTo={setPage} />}
          {page === "admin" && role === "admin" && <AdminPanel session={session} />}
          {page === "aziende" && <AziendeMandanti session={session} />}
          {page === "clienti" && <ClientiAnagrafica session={session} apriPreventivo={apriPreventivoCliente} />}
          {page === "visite" && <CalendarioVisite session={session} />}
          {page === "preventivi" && (
            <PreventiviOfferte
              session={session}
              preventivoIniziale={preventivoAprireId}
              onPreventivoAperto={() => setPreventivoAprireId(null)}
            />
          )}
          {page === "mappa" && <MappaClienti session={session} />}
          {page === "statistiche" && <Statistiche session={session} />}
          {page === "fatturato" && <Fatturato session={session} />}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE RADICE
// ============================================================
function StileGlobaleResponsive() {
  return (
    <style>{`
      .app-sidebar-backdrop { display: none; }
      @media (max-width: 768px) {
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
          top: 61px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.35);
          z-index: 35;
        }
        table { display: block; overflow-x: auto; white-space: nowrap; }
        .tabella-righe-preventivo { white-space: normal; }
        .tabella-righe-preventivo thead { display: none; }
        .tabella-righe-preventivo, .tabella-righe-preventivo tbody, .tabella-righe-preventivo tr, .tabella-righe-preventivo td {
          display: block;
          width: 100%;
        }
        .tabella-righe-preventivo tr {
          border: 1px solid #e2edf5;
          border-radius: 10px;
          margin-bottom: 12px;
          padding: 8px;
        }
        .tabella-righe-preventivo td {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 4px;
          border: none;
        }
        .tabella-righe-preventivo td::before {
          content: attr(data-label);
          font-size: 11px;
          color: #7c8b98;
          flex-shrink: 0;
        }
        .tabella-righe-preventivo td input, .tabella-righe-preventivo td select {
          width: auto;
          flex: 1;
        }
        .form-header-preventivo select, .form-header-preventivo input {
          max-width: none !important;
          width: 100% !important;
        }
        input, select, textarea { font-size: 16px !important; }
        main { padding: 16px !important; }
      }
    `}</style>
  );
}

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
