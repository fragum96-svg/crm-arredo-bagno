import { useState, useEffect } from "react";

// ============================================================
// CONFIGURAZIONE SUPABASE
// ============================================================
const SUPABASE_URL = "https://hifwdbjkerlfjbgwhpxc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZndkYmprZXJsZmpiZ3docHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTEzMTYsImV4cCI6MjA5OTU2NzMxNn0.wAPiUA4YU9ofHJgDrtFBHAFLzEuOAnAwMdX4Elk3Bsc";

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
        background: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: 340,
          padding: 32,
          border: "1px solid #e0eef7",
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0,120,200,0.08)",
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0b7bc4",
            marginBottom: 4,
          }}
        >
          CRM Arredo Bagno
        </h1>
        <p style={{ fontSize: 13, color: "#6b7b8a", marginBottom: 24 }}>
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
            border: "1px solid #d5e4ef",
            borderRadius: 8,
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
            border: "1px solid #d5e4ef",
            borderRadius: 8,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{ color: "#c0392b", fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "11px 0",
            background: "#0b7bc4",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
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
        border: "1px solid #e0eef7",
        borderRadius: 12,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ fontSize: 16, color: "#0b7bc4", marginBottom: 4 }}>
        Crea nuovo utente
      </h2>
      <p style={{ fontSize: 12, color: "#6b7b8a", marginBottom: 16 }}>
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
            border: "1px solid #d5e4ef",
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
            border: "1px solid #d5e4ef",
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
            background: "#0b7bc4",
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
            color: msg.type === "error" ? "#c0392b" : "#1a7a3c",
          }}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHELL PRINCIPALE APP (dietro login)
// ============================================================
function AppShell({ session, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState("clienti");
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
    { key: "clienti", label: "Clienti" },
    { key: "aziende", label: "Aziende mandanti" },
    { key: "visite", label: "Visite" },
    { key: "preventivi", label: "Preventivi" },
    ...(role === "admin" ? [{ key: "admin", label: "Pannello Admin" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "Arial, sans-serif" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 20px",
          borderBottom: "1px solid #e0eef7",
        }}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            fontSize: 22,
            color: "#0b7bc4",
            cursor: "pointer",
            marginRight: 12,
          }}
        >
          ☰
        </button>
        <span style={{ fontWeight: 700, color: "#0b7bc4" }}>CRM Arredo Bagno</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#6b7b8a" }}>{session.user.email}</span>
          <button
            onClick={onLogout}
            style={{
              background: "none",
              border: "1px solid #d5e4ef",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              color: "#0b7bc4",
              cursor: "pointer",
            }}
          >
            Esci
          </button>
        </div>
      </header>

      <div style={{ display: "flex" }}>
        {menuOpen && (
          <nav
            style={{
              width: 200,
              borderRight: "1px solid #e0eef7",
              minHeight: "calc(100vh - 53px)",
              padding: "12px 0",
            }}
          >
            {menuItems.map((item) => (
              <div
                key={item.key}
                onClick={() => {
                  setPage(item.key);
                  setMenuOpen(false);
                }}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  color: page === item.key ? "#0b7bc4" : "#333",
                  background: page === item.key ? "#eaf5fc" : "transparent",
                  cursor: "pointer",
                  fontWeight: page === item.key ? 600 : 400,
                }}
              >
                {item.label}
              </div>
            ))}
          </nav>
        )}

        <main style={{ flex: 1, padding: 24 }}>
          {page === "admin" && role === "admin" && <AdminPanel />}
          {page !== "admin" && (
            <div style={{ color: "#6b7b8a", fontSize: 14 }}>
              <h2 style={{ color: "#0b7bc4", fontSize: 18, marginBottom: 8 }}>
                {menuItems.find((m) => m.key === page)?.label}
              </h2>
              <p>
                Sezione da completare con le funzionalità specifiche (anagrafica
                clienti, listini, preventivi PDF, mappa, ecc.) — ora che il
                login è attivo, possiamo costruire ogni sezione una alla volta.
              </p>
            </div>
          )}
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
