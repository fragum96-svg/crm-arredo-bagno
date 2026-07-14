import { useState, useEffect } from "react";
import {
  Users,
  Building2,
  CalendarDays,
  FileText,
  LogOut,
  Menu as MenuIcon,
  LayoutDashboard,
  ShieldCheck,
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
// PANNELLO ADMIN — creazione utenti (solo per ruolo admin)
// ============================================================
function AdminPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      setMsg({ type: "error", text: "Errore di connessione: " + (err.message || err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 420,
        padding: 24,
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        boxShadow: "0 4px 16px rgba(20,40,60,0.05)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ fontSize: 16, color: COLORS.primary, marginBottom: 4 }}>
        Crea nuovo utente
      </h2>
      <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>
        Genera le credenziali da consegnare al collaboratore. Nessuna
        registrazione pubblica è possibile.
      </p>
      <div>
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
      </div>
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

// ============================================================
// AZIENDE MANDANTI — elenco, aggiunta, modifica, eliminazione
// ============================================================
function AziendeMandanti({ session }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

function ClientiAnagrafica({ session }) {
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
    competitor: "",
    note: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtroClassificazione, setFiltroClassificazione] = useState("");

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
    setForm((f) => ({
      ...f,
      aziende_collaborate: f.aziende_collaborate.includes(nome)
        ? f.aziende_collaborate.filter((n) => n !== nome)
        : [...f.aziende_collaborate, nome],
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
      const body = {
        ragione_sociale: form.ragione_sociale,
        indirizzo: form.indirizzo || null,
        telefono: form.telefono || null,
        email: form.email || null,
        classificazione: form.classificazione || null,
        aziende_collaborate: form.aziende_collaborate,
        competitor: form.competitor
          ? form.competitor.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        note: form.note || null,
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
            maxWidth: 360,
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
              maxHeight: 120,
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
              <label
                key={a.id}
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
                      {c.ragione_sociale}
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
// CALENDARIO VISITE — per cliente, con conteggio e storico
// ============================================================
function CalendarioVisite({ session }) {
  const [clienti, setClienti] = useState([]);
  const [visite, setVisite] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clienteSelezionato, setClienteSelezionato] = useState("");
  const emptyForm = {
    data_visita: new Date().toISOString().slice(0, 10),
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
        fetch(`${SUPABASE_URL}/rest/v1/visite?select=*&order=data_visita.desc`, {
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

  const visiteFiltrate = clienteSelezionato
    ? visite.filter((v) => v.cliente_id === clienteSelezionato)
    : visite;

  const conteggioPerCliente = (id) => visite.filter((v) => v.cliente_id === id).length;

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>
        Calendario visite
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
            Registra nuova visita
          </h3>

          <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>
            Cliente *
          </label>
          <select
            value={clienteSelezionato}
            onChange={(e) => setClienteSelezionato(e.target.value)}
            style={inputStyle}
          >
            <option value="">-- seleziona cliente --</option>
            {clienti.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ragione_sociale} ({conteggioPerCliente(c.id)} visite)
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12, color: "#333", display: "block", marginBottom: 4 }}>
            Data visita *
          </label>
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

          {error && (
            <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10 }}>
              {error}
            </div>
          )}

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
            {saving ? "Salvataggio..." : "Salva visita"}
          </button>
        </div>

        <div style={{ flex: "2 1 400px" }}>
          <div style={{ marginBottom: 12 }}>
            <select
              value={clienteSelezionato}
              onChange={(e) => setClienteSelezionato(e.target.value)}
              style={{ ...inputStyle, maxWidth: 260, marginBottom: 0 }}
            >
              <option value="">Tutti i clienti</option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ragione_sociale}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
          ) : visiteFiltrate.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessuna visita registrata.</p>
          ) : (
            <div>
              {visiteFiltrate.map((v) => (
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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 13 }}>
                        {nomeCliente(v.cliente_id)}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                        {new Date(v.data_visita).toLocaleDateString("it-IT")}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(v.id)}
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
                  </div>
                  {v.argomenti_trattati && (
                    <div style={{ fontSize: 12, marginTop: 8 }}>
                      <strong>Argomenti:</strong> {v.argomenti_trattati}
                    </div>
                  )}
                  {v.cataloghi_lasciati && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <strong>Cataloghi lasciati:</strong> {v.cataloghi_lasciati}
                    </div>
                  )}
                  {v.note && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <strong>Note:</strong> {v.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
  };
}

function calcolaRigaNetto(riga) {
  const totaleListino = (Number(riga.quantita) || 0) * (Number(riga.prezzo_unitario) || 0);
  const dopoSconto1 = totaleListino * (1 - (Number(riga.sconto1) || 0) / 100);
  const dopoSconto2 = dopoSconto1 * (1 - (Number(riga.sconto2) || 0) / 100);
  return { totaleListino, netto: dopoSconto2 };
}

function PreventiviOfferte({ session }) {
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
    imballo_percentuale: 0,
    imballo_escluso: false,
    trasporto_valore: 0,
    trasporto_escluso: true,
    iva_percentuale: 22,
    iva_esclusa: true,
  };
  const [header, setHeader] = useState(emptyHeader);
  const [righe, setRighe] = useState([nuovaRiga()]);

  const headers = () => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
  });

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

  const totaleNetto = righe.reduce((sum, r) => sum + calcolaRigaNetto(r).netto, 0);
  const valoreImballo = header.imballo_escluso
    ? 0
    : totaleNetto * ((Number(header.imballo_percentuale) || 0) / 100);
  const subtotaleDopoImballo = totaleNetto + valoreImballo;
  const valoreTrasporto = header.trasporto_escluso ? 0 : Number(header.trasporto_valore) || 0;
  const subtotaleDopoTrasporto = subtotaleDopoImballo + valoreTrasporto;
  const valoreIva = header.iva_esclusa
    ? 0
    : subtotaleDopoTrasporto * ((Number(header.iva_percentuale) || 0) / 100);
  const totaleFinale = subtotaleDopoTrasporto + valoreIva;

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
        imballo_percentuale: Number(header.imballo_percentuale) || 0,
        imballo_escluso: header.imballo_escluso,
        trasporto_valore: Number(header.trasporto_valore) || 0,
        trasporto_escluso: header.trasporto_escluso,
        iva_percentuale: Number(header.iva_percentuale) || 0,
        iva_esclusa: header.iva_esclusa,
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
      imballo_percentuale: p.imballo_percentuale || 0,
      imballo_escluso: p.imballo_escluso ?? false,
      trasporto_valore: p.trasporto_valore || 0,
      trasporto_escluso: p.trasporto_escluso ?? true,
      iva_percentuale: p.iva_percentuale ?? 22,
      iva_esclusa: p.iva_esclusa ?? true,
    });
    setRighe(p.righe && p.righe.length ? p.righe : [nuovaRiga()]);
  };

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

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
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

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ padding: 6 }}>Art.</th>
              <th style={{ padding: 6 }}>Descrizione</th>
              <th style={{ padding: 6 }}>Finitura</th>
              <th style={{ padding: 6 }}>Qtà</th>
              <th style={{ padding: 6 }}>Prezzo un.</th>
              <th style={{ padding: 6 }}>Sc.1 %</th>
              <th style={{ padding: 6 }}>Sc.2 %</th>
              <th style={{ padding: 6 }}>Netto</th>
              <th style={{ padding: 6 }}></th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => {
              const { netto } = calcolaRigaNetto(r);
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                  <td style={{ padding: 4 }}>
                    <input
                      value={r.articolo}
                      onChange={(e) => aggiornaRiga(r.id, "articolo", e.target.value)}
                      style={{ ...inputStyle, width: 70 }}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <input
                      value={r.descrizione}
                      onChange={(e) => aggiornaRiga(r.id, "descrizione", e.target.value)}
                      style={{ ...inputStyle, width: 160 }}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <input
                      value={r.finitura}
                      onChange={(e) => aggiornaRiga(r.id, "finitura", e.target.value)}
                      style={{ ...inputStyle, width: 80 }}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <input
                      type="number"
                      value={r.quantita}
                      onChange={(e) => aggiornaRiga(r.id, "quantita", e.target.value)}
                      style={{ ...inputStyle, width: 50 }}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <input
                      type="number"
                      value={r.prezzo_unitario}
                      onChange={(e) => aggiornaRiga(r.id, "prezzo_unitario", e.target.value)}
                      style={{ ...inputStyle, width: 70 }}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <input
                      type="number"
                      value={r.sconto1}
                      onChange={(e) => aggiornaRiga(r.id, "sconto1", e.target.value)}
                      style={{ ...inputStyle, width: 55 }}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <input
                      type="number"
                      value={r.sconto2}
                      onChange={(e) => aggiornaRiga(r.id, "sconto2", e.target.value)}
                      style={{ ...inputStyle, width: 55 }}
                    />
                  </td>
                  <td style={{ padding: 4, fontWeight: 600 }}>
                    {netto.toFixed(2)} €
                  </td>
                  <td style={{ padding: 4 }}>
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
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

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
          }}
        >
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={header.imballo_escluso}
                onChange={(e) => setHeader({ ...header, imballo_escluso: e.target.checked })}
              />
              Imballo escluso / non mostrare
            </label>
            {!header.imballo_escluso && (
              <div>
                <label style={{ marginRight: 6 }}>Imballo %</label>
                <input
                  type="number"
                  value={header.imballo_percentuale}
                  onChange={(e) => setHeader({ ...header, imballo_percentuale: e.target.value })}
                  style={{ ...inputStyle, width: 70 }}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12, marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={header.trasporto_escluso}
                onChange={(e) => setHeader({ ...header, trasporto_escluso: e.target.checked })}
              />
              Trasporto escluso / non mostrare
            </label>
            {!header.trasporto_escluso && (
              <div>
                <label style={{ marginRight: 6 }}>Trasporto €</label>
                <input
                  type="number"
                  value={header.trasporto_valore}
                  onChange={(e) => setHeader({ ...header, trasporto_valore: e.target.value })}
                  style={{ ...inputStyle, width: 80 }}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12, marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={header.iva_esclusa}
                onChange={(e) => setHeader({ ...header, iva_esclusa: e.target.checked })}
              />
              IVA esclusa / non mostrare
            </label>
            {!header.iva_esclusa && (
              <div>
                <label style={{ marginRight: 6 }}>IVA %</label>
                <input
                  type="number"
                  value={header.iva_percentuale}
                  onChange={(e) => setHeader({ ...header, iva_percentuale: e.target.value })}
                  style={{ ...inputStyle, width: 70 }}
                />
              </div>
            )}
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
            <div style={{ color: COLORS.muted }}>Totale netto: {totaleNetto.toFixed(2)} €</div>
            {!header.imballo_escluso && (
              <div style={{ color: COLORS.muted }}>Imballo: {valoreImballo.toFixed(2)} €</div>
            )}
            {!header.trasporto_escluso && (
              <div style={{ color: COLORS.muted }}>Trasporto: {valoreTrasporto.toFixed(2)} €</div>
            )}
            {!header.iva_esclusa && (
              <div style={{ color: COLORS.muted }}>IVA: {valoreIva.toFixed(2)} €</div>
            )}
            <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 16, marginTop: 4 }}>
              Totale: {totaleFinale.toFixed(2)} €
            </div>
            {(header.imballo_escluso || header.trasporto_escluso || header.iva_esclusa) && (
              <div style={{ fontSize: 11, color: "#9aa7b2", marginTop: 4 }}>
                {[
                  header.iva_esclusa && "IVA",
                  header.trasporto_escluso && "trasporto",
                  header.imballo_escluso && "imballo",
                ]
                  .filter(Boolean)
                  .join(", ")}{" "}
                esclusi
              </div>
            )}
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
              <th style={{ padding: "8px 6px" }}>RIF</th>
              <th style={{ padding: "8px 6px" }}>Data</th>
              <th style={{ padding: "8px 6px" }}>Cliente</th>
              <th style={{ padding: "8px 6px" }}>Azienda</th>
              <th style={{ padding: "8px 6px" }}></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                <td style={{ padding: "8px 6px" }}>{p.rif || "-"}</td>
                <td style={{ padding: "8px 6px" }}>
                  {p.data ? new Date(p.data).toLocaleDateString("it-IT") : "-"}
                </td>
                <td style={{ padding: "8px 6px" }}>{nomeCliente(p.cliente_id)}</td>
                <td style={{ padding: "8px 6px" }}>{nomeAzienda(p.azienda_id)}</td>
                <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
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
            ))}
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
          <nav
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
                  onClick={() => setPage(item.key)}
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
          {page === "admin" && role === "admin" && <AdminPanel />}
          {page === "aziende" && <AziendeMandanti session={session} />}
          {page === "clienti" && <ClientiAnagrafica session={session} />}
          {page === "visite" && <CalendarioVisite session={session} />}
          {page === "preventivi" && <PreventiviOfferte session={session} />}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE RADICE
// ============================================================
export default function App() {
  const [session, setSession] = useState(null);

  if (!session) {
    return <LoginScreen onLogin={(data) => setSession(data)} />;
  }

  return <AppShell session={session} onLogout={() => setSession(null)} />;
}
