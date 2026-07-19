import { useState, useEffect } from "react";

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

// Dati finti al posto di Supabase
const DATI_FINTI = [
  { id: "1", nome: "Quadro Design", sconto1: 10, sconto2: 5, imballo_percentuale: 3, trasporto: "franco destino sopra 500€" },
  { id: "2", nome: "Galassia", sconto1: 15, sconto2: null, imballo_percentuale: null, trasporto: null },
];

function AziendeMandantiTest() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadMsg, setUploadMsg] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [form, setForm] = useState({ nome: "", sconto1: "", sconto2: "", imballo_percentuale: "", trasporto: "", resi: "", note: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setList(DATI_FINTI);
      setLoading(false);
    }, 300);
  }, []);

  const inputStyle = {
    width: "100%", padding: "8px 10px", marginBottom: 10,
    border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 20 }}>
      <h2 style={{ color: COLORS.text, fontSize: 20, marginBottom: 16 }}>Aziende mandanti (TEST)</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 400px" }}>
          {uploadMsg && <div style={{ fontSize: 12, marginBottom: 10 }}>{uploadMsg.text}</div>}
          {loading ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Caricamento...</p>
          ) : list.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Nessuna azienda ancora inserita.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
                {list.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f0f5f9" }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{a.nome}</td>
                    <td style={{ padding: "8px 6px" }}>{a.sconto1 != null ? `${a.sconto1}%` : "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{a.sconto2 != null ? `${a.sconto2}%` : "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{a.imballo_percentuale != null ? `${a.imballo_percentuale}%` : "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{a.trasporto || "-"}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.primary, cursor: "pointer" }}>
                        {uploadingId === a.id ? "Caricamento..." : "Carica"}
                      </label>
                    </td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                      <button onClick={() => setEditingId(a.id)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 12, marginRight: 10 }}>Modifica</button>
                      <button style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }}>Elimina</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div style={{ marginTop: 20, padding: 12, background: "#e8f8ee", borderRadius: 8, fontSize: 13 }}>
        ✅ Se vedi questo messaggio senza errori sopra, il componente base funziona correttamente con questi dati di esempio.
      </div>
    </div>
  );
}

export default AziendeMandantiTest;
