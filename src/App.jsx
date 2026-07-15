import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, Calendar, FileText, TrendingUp, Plus, Search, 
  Trash2, Edit3, Check, X, ChevronRight, Upload, Download, File, 
  Filter, BarChart3, ArrowUpRight, DollarSign, Briefcase, Percent
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Inizializzazione client Supabase con le tue chiavi corrette
const supabaseUrl = "https://hifwdbjkerlfjbgwhpxc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZndkYmprZXJsZmpiZ3docHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTEzMTYsImV4cCI6MjA5OTU2NzMxNn0.wAPiUA4YU9ofHJgDrtFBHAFLzEuOAnAwMdX4Elk3Bsc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clienti, setClienti] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [preventivi, setPreventivi] = useState([]);
  const [ordini, setOrdini] = useState([]);
  
  // Stati per i Filtri e Ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAzienda, setFilterAzienda] = useState('');

  // Stati per la selezione (Dettaglio Cliente)
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('dati');

  // Stati per l'inserimento/modifica dei dati
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(null); // 'cliente', 'azienda', 'attivita', 'preventivo', 'ordine'

  // Form temporanei
  const [clienteForm, setClienteForm] = useState({ 
    nome: '', email: '', telefono: '', azienda_mandante_id: '', note: '', colore: '#0b7bc4' 
  });
  const [aziendaForm, setAziendaForm] = useState({ 
    nome: '', p_iva: '', indirizzo: '', note: '', colore: '#0e9488' 
  });
  const [attivitaForm, setAttivitaForm] = useState({
    cliente_id: '', tipo: 'Chiamata', data: new Date().toISOString().split('T')[0], note: ''
  });
  const [preventivoForm, setPreventivoForm] = useState({
    cliente_id: '', oggetto: '', importo: '', stato: 'Inviato', data_scadenza: ''
  });
  const [ordineForm, setOrdineForm] = useState({
    cliente_id: '', azienda_id: '', numero_ordine: '', importo_totale: '', data_ordine: new Date().toISOString().split('T')[0], note: ''
  });

  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Caricamento iniziale dei dati da Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: resClienti } = await supabase.from('clienti').select('*');
      const { data: resAziende } = await supabase.from('aziende_mandanti').select('*');
      const { data: resAttivita } = await supabase.from('attivita').select('*').order('data', { ascending: false });
      const { data: resPreventivi } = await supabase.from('preventivi').select('*');
      
      // Proviamo a leggere la tabella ordini. Se dà errore perché appena creata, restituiamo array vuoto
      const { data: resOrdini, error: ordiniErr } = await supabase.from('ordini').select('*');
      
      if (resClienti) setClienti(resClienti);
      if (resAziende) setAziende(resAziende);
      if (resAttivita) setAttivita(resAttivita);
      if (resPreventivi) setPreventivi(resPreventivi);
      if (!ordiniErr && resOrdini) setOrdini(resOrdini);
    } catch (error) {
      console.error("Errore nel caricamento dati:", error);
    }
  };

  // Funzioni di inserimento e aggiornamento dati
  const handleSaveCliente = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await supabase.from('clienti').update(clienteForm).eq('id', editingItem.id);
      } else {
        await supabase.from('clienti').insert([clienteForm]);
      }
      setShowModal(null);
      setEditingItem(null);
      setClienteForm({ nome: '', email: '', telefono: '', azienda_mandante_id: '', note: '', colore: '#0b7bc4' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAzienda = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await supabase.from('aziende_mandanti').update(aziendaForm).eq('id', editingItem.id);
      } else {
        await supabase.from('aziende_mandanti').insert([aziendaForm]);
      }
      setShowModal(null);
      setEditingItem(null);
      setAziendaForm({ nome: '', p_iva: '', indirizzo: '', note: '', colore: '#0e9488' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAttivita = async (e) => {
    e.preventDefault();
    try {
      await supabase.from('attivita').insert([attivitaForm]);
      setShowModal(null);
      setAttivitaForm({ cliente_id: '', tipo: 'Chiamata', data: new Date().toISOString().split('T')[0], note: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePreventivo = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await supabase.from('preventivi').update(preventivoForm).eq('id', editingItem.id);
      } else {
        await supabase.from('preventivi').insert([preventivoForm]);
      }
      setShowModal(null);
      setEditingItem(null);
      setPreventivoForm({ cliente_id: '', oggetto: '', importo: '', stato: 'Inviato', data_scadenza: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOrdine = async (e) => {
    e.preventDefault();
    try {
      await supabase.from('ordini').insert([ordineForm]);
      setShowModal(null);
      setOrdineForm({ cliente_id: '', azienda_id: '', numero_ordine: '', importo_totale: '', data_ordine: new Date().toISOString().split('T')[0], note: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Caricamento PDF e salvataggio nello storage pubblico di Supabase
  const handleFileUpload = async (e, type, relatedId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPdf(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `contratti/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documenti-clienti')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documenti-clienti')
        .getPublicUrl(filePath);

      if (type === 'ordine') {
        await supabase.from('ordini').update({ file_url: publicUrl }).eq('id', relatedId);
      }
      
      fetchData();
      alert("File PDF caricato con successo!");
    } catch (error) {
      console.error("Errore durante il caricamento del file:", error);
      alert("Errore nel caricamento del PDF. Controlla di aver creato il bucket 'documenti-clienti' come pubblico su Supabase.");
    } finally {
      setUploadingPdf(false);
    }
  };

  const deleteItem = async (table, id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo elemento?")) {
      await supabase.from(table).delete().eq('id', id);
      if (selectedCliente && selectedCliente.id === id && table === 'clienti') {
        setSelectedCliente(null);
      }
      fetchData();
    }
  };

  // Calcoli Finanziari
  const totaleFatturato = ordini.reduce((acc, curr) => acc + parseFloat(curr.importo_totale || 0), 0);
  const totalePreventiviInviati = preventivi.reduce((acc, curr) => acc + (curr.stato === 'Inviato' ? parseFloat(curr.importo || 0) : 0), 0);
  const totalePreventiviAccettati = preventivi.reduce((acc, curr) => acc + (curr.stato === 'Accettato' ? parseFloat(curr.importo || 0) : 0), 0);

  const filteredClienti = clienti.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAzienda = filterAzienda ? c.azienda_mandante_id === filterAzienda : true;
    return matchesSearch && matchesAzienda;
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* MENU LATERALE DI NAVIGAZIONE */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shadow-xl z-10">
        <div className="p-5">
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">CRM Agente</h1>
              <span className="text-xs text-slate-400">Multi-Mandatario v2.0</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setSelectedCliente(null); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => { setActiveTab('clienti'); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'clienti' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Users className="w-5 h-5" />
              <span>Clienti</span>
            </button>
            <button 
              onClick={() => { setActiveTab('aziende'); setSelectedCliente(null); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'aziende' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Building2 className="w-5 h-5" />
              <span>Aziende Mandanti</span>
            </button>
            <button 
              onClick={() => { setActiveTab('preventivi'); setSelectedCliente(null); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'preventivi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <FileText className="w-5 h-5" />
              <span>Preventivi</span>
            </button>
            <button 
              onClick={() => { setActiveTab('fatturato'); setSelectedCliente(null); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'fatturato' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Fatturato & Statistiche</span>
            </button>
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          Dispositivo Connesso a Supabase Cloud
        </div>
      </aside>

      {/* AREA CONTENUTO PRINCIPALE */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-10">
        
        {/* TAB 1: DASHBOARD PRINCIPALE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Pannello di Controllo</h2>
                <p className="text-slate-500">Panoramica generale dell'andamento commerciale</p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => { setEditingItem(null); setClienteForm({ nome: '', email: '', telefono: '', azienda_mandante_id: '', note: '', colore: '#0b7bc4' }); setShowModal('cliente'); }}
                  className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center space-x-2 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuovo Cliente</span>
                </button>
                <button 
                  onClick={() => { setEditingItem(null); setAziendaForm({ nome: '', p_iva: '', indirizzo: '', note: '', colore: '#0e9488' }); setShowModal('azienda'); }}
                  className="bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-950 transition flex items-center space-x-2 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuova Mandante</span>
                </button>
              </div>
            </header>

            {/* CARD METRICHE RAPIDE */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-sm font-medium">Fatturato Generato</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">€ {totaleFatturato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-sm font-medium">Preventivi in Trattativa</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">€ {totalePreventiviInviati.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-sm font-medium">Clienti Attivi</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{clienti.length}</h3>
                </div>
                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-sm font-medium">Aziende Mandanti</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{aziende.length}</h3>
                </div>
                <div className="bg-orange-50 text-orange-600 p-3 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* SEZIONE SCORCIATOIE RAPIDE IN DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Card Calendario / Ultime Attività */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span>Cronologia Attività e Appuntamenti</span>
                  </h4>
                  <button 
                    onClick={() => { setAttivitaForm({ cliente_id: '', tipo: 'Chiamata', data: new Date().toISOString().split('T')[0], note: '' }); setShowModal('attivita'); }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registra</span>
                  </button>
                </div>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {attivita.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4 text-center">Nessuna attività registrata recentemente.</p>
                  ) : (
                    attivita.slice(0, 5).map(act => {
                      const cli = clienti.find(c => c.id === act.cliente_id);
                      return (
                        <div key={act.id} className="flex justify-between items-start p-3 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-100">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${act.tipo === 'Visita' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{act.tipo}</span>
                              <span className="font-semibold text-sm text-slate-950">{cli ? cli.nome : 'Cliente sconosciuto'}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{act.note}</p>
                          </div>
                          <span className="text-xs font-medium text-slate-400">{new Date(act.data).toLocaleDateString('it-IT')}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Card Preventivi Recenti */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>Ultimi Preventivi Trattati</span>
                  </h4>
                  <button 
                    onClick={() => { setPreventivoForm({ cliente_id: '', oggetto: '', importo: '', stato: 'Inviato', data_scadenza: '' }); setShowModal('preventivo'); }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuovo</span>
                  </button>
                </div>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {preventivi.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4 text-center">Nessun preventivo in archivio.</p>
                  ) : (
                    preventivi.slice(0, 5).map(prev => {
                      const cli = clienti.find(c => c.id === prev.cliente_id);
                      return (
                        <div key={prev.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-100">
                          <div>
                            <span className="font-semibold text-sm text-slate-900 block">{prev.oggetto}</span>
                            <span className="text-xs text-slate-400">{cli ? cli.nome : 'Nessun cliente'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm text-slate-900 block">€ {parseFloat(prev.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1 ${prev.stato === 'Accettato' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{prev.stato}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ELENCO CLIENTI & SCHEDA DETTAGLIATA */}
        {activeTab === 'clienti' && !selectedCliente && (
          <div className="space-y-8">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Anagrafica Clienti</h2>
                <p className="text-slate-500">Gestisci i contatti commerciali e le attività associate</p>
              </div>
              <button 
                onClick={() => { setEditingItem(null); setClienteForm({ nome: '', email: '', telefono: '', azienda_mandante_id: '', note: '', colore: '#0b7bc4' }); setShowModal('cliente'); }}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center space-x-2 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Crea Nuovo Cliente</span>
              </button>
            </header>

            {/* FILTRI DI RICERCA */}
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cerca cliente per nome o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
              <div className="w-full md:w-64">
                <select
                  value={filterAzienda}
                  onChange={(e) => setFilterAzienda(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                >
                  <option value="">Filtra per Azienda Mandante</option>
                  {aziende.map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* GRIGLIA CLIENTI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClienti.map(c => {
                const az = aziende.find(a => a.id === c.azienda_mandante_id);
                return (
                  <div 
                    key={c.id} 
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: c.colore || '#0b7bc4' }} 
                          />
                          <h4 className="font-bold text-lg text-slate-900">{c.nome}</h4>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingItem(c); setClienteForm(c); setShowModal('cliente'); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteItem('clienti', c.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mb-1">{c.email}</p>
                      <p className="text-sm text-slate-500 mb-3">{c.telefono}</p>
                      {az && (
                        <span 
                          className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold"
                          style={{ backgroundColor: `${az.colore}20`, color: az.colore }}
                        >
                          Mandante: {az.nome}
                        </span>
                      )}
                    </div>
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={() => { setSelectedCliente(c); setActiveSubTab('dati'); }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center space-x-1"
                      >
                        <span>Apri Scheda Cliente</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCHEDA CLIENTE AVANZATA (QUANDO SELEZIONATO) */}
        {activeTab === 'clienti' && selectedCliente && (
          <div className="space-y-8">
            <button 
              onClick={() => setSelectedCliente(null)}
              className="text-slate-500 hover:text-slate-800 font-semibold flex items-center space-x-2"
            >
              <span>← Torna all'elenco clienti</span>
            </button>

            {/* INTESTAZIONE SCHEDA CLIENTE */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center space-x-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: selectedCliente.colore || '#0b7bc4' }}
                >
                  {selectedCliente.nome.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedCliente.nome}</h2>
                  <p className="text-slate-500">{selectedCliente.email} • {selectedCliente.telefono}</p>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-2">
                <button 
                  onClick={() => { setEditingItem(selectedCliente); setClienteForm(selectedCliente); setShowModal('cliente'); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition"
                >
                  Modifica Anagrafica
                </button>
              </div>
            </header>

            {/* SOTTO-TAB INTERNE ALLA SCHEDA CLIENTE */}
            <div className="border-b border-slate-200 flex space-x-8">
              <button 
                onClick={() => setActiveSubTab('dati')}
                className={`pb-4 text-sm font-semibold transition-all border-b-2 ${activeSubTab === 'dati' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Dati & Note
              </button>
              <button 
                onClick={() => setActiveSubTab('attivita')}
                className={`pb-4 text-sm font-semibold transition-all border-b-2 ${activeSubTab === 'attivita' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Visite & Attività
              </button>
              <button 
                onClick={() => setActiveSubTab('preventivi')}
                className={`pb-4 text-sm font-semibold transition-all border-b-2 ${activeSubTab === 'preventivi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Preventivi
              </button>
              <button 
                onClick={() => setActiveSubTab('ordini')}
                className={`pb-4 text-sm font-semibold transition-all border-b-2 ${activeSubTab === 'ordini' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Ordini & Contratti (PDF)
              </button>
            </div>

            {/* CONTENUTO DELLE SOTTO-TAB */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              {activeSubTab === 'dati' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-lg">Note e Informazioni Generali</h4>
                  <p className="text-slate-600 whitespace-pre-line">{selectedCliente.note || "Nessuna nota presente per questo cliente."}</p>
                </div>
              )}

              {activeSubTab === 'attivita' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg">Storico Appuntamenti e Contatti</h4>
                    <button 
                      onClick={() => { setAttivitaForm({ cliente_id: selectedCliente.id, tipo: 'Chiamata', data: new Date().toISOString().split('T')[0], note: '' }); setShowModal('attivita'); }}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                    >
                      Registra Nuova Attività
                    </button>
                  </div>
                  <div className="space-y-4">
                    {attivita.filter(act => act.cliente_id === selectedCliente.id).length === 0 ? (
                      <p className="text-slate-400 text-sm py-4">Nessuna visita o telefonata registrata.</p>
                    ) : (
                      attivita.filter(act => act.cliente_id === selectedCliente.id).map(act => (
                        <div key={act.id} className="flex justify-between items-start p-4 bg-slate-50 rounded-xl">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${act.tipo === 'Visita' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{act.tipo}</span>
                            <p className="text-sm text-slate-700 mt-2">{act.note}</p>
                          </div>
                          <span className="text-xs font-medium text-slate-400">{new Date(act.data).toLocaleDateString('it-IT')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'preventivi' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg">Preventivi Emessi</h4>
                    <button 
                      onClick={() => { setPreventivoForm({ cliente_id: selectedCliente.id, oggetto: '', importo: '', stato: 'Inviato', data_scadenza: '' }); setShowModal('preventivo'); }}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                    >
                      Nuovo Preventivo
                    </button>
                  </div>
                  <div className="space-y-4">
                    {preventivi.filter(prev => prev.cliente_id === selectedCliente.id).length === 0 ? (
                      <p className="text-slate-400 text-sm py-4">Nessun preventivo registrato.</p>
                    ) : (
                      preventivi.filter(prev => prev.cliente_id === selectedCliente.id).map(prev => (
                        <div key={prev.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                          <div>
                            <span className="font-bold text-sm block">{prev.oggetto}</span>
                            <span className="text-xs text-slate-400">Scadenza: {new Date(prev.data_scadenza).toLocaleDateString('it-IT')}</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-bold text-sm">€ {parseFloat(prev.importo).toLocaleString('it-IT')}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${prev.stato === 'Accettato' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{prev.stato}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'ordini' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg">Ordini e Caricamento Contratti (PDF)</h4>
                    <button 
                      onClick={() => { setOrdineForm({ cliente_id: selectedCliente.id, azienda_id: '', numero_ordine: '', importo_totale: '', data_ordine: new Date().toISOString().split('T')[0], note: '' }); setShowModal('ordine'); }}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                    >
                      Nuovo Ordine
                    </button>
                  </div>
                  <div className="space-y-4">
                    {ordini.filter(ord => ord.cliente_id === selectedCliente.id).length === 0 ? (
                      <p className="text-slate-400 text-sm py-4">Nessun ordine registrato.</p>
                    ) : (
                      ordini.filter(ord => ord.cliente_id === selectedCliente.id).map(ord => {
                        const az = aziende.find(a => a.id === ord.azienda_id);
                        return (
                          <div key={ord.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900">Ordine #{ord.numero_ordine}</span>
                                {az && <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: `${az.colore}20`, color: az.colore }}>{az.nome}</span>}
                              </div>
                              <p className="text-xs text-slate-400 mt-1">Data: {new Date(ord.data_ordine).toLocaleDateString('it-IT')}</p>
                              {ord.note && <p className="text-xs text-slate-500 mt-1 italic">Note: {ord.note}</p>}
                            </div>
                            <div className="mt-4 md:mt-0 flex items-center space-x-4">
                              <span className="font-bold text-slate-900">€ {parseFloat(ord.importo_totale).toLocaleString('it-IT')}</span>
                              {ord.file_url ? (
                                <a 
                                  href={ord.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Scarica PDF</span>
                                </a>
                              ) : (
                                <label className="flex items-center space-x-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg cursor-pointer">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{uploadingPdf ? 'In Caricamento...' : 'Carica PDF'}</span>
                                  <input 
                                    type="file" 
                                    accept="application/pdf" 
                                    className="hidden" 
                                    onChange={(e) => handleFileUpload(e, 'ordine', ord.id)} 
                                    disabled={uploadingPdf}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AZIENDE MANDANTI */}
        {activeTab === 'aziende' && (
          <div className="space-y-8">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Aziende Mandanti</h2>
                <p className="text-slate-500">Gestisci i mandati e le commissioni con ciascuna azienda</p>
              </div>
              <button 
                onClick={() => { setEditingItem(null); setAziendaForm({ nome: '', p_iva: '', indirizzo: '', note: '', colore: '#0e9488' }); setShowModal('azienda'); }}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center space-x-2 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Crea Nuova Mandante</span>
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aziende.map(a => {
                const numClienti = clienti.filter(c => c.azienda_mandante_id === a.id).length;
                const fatturatoAzienda = ordini.filter(o => o.azienda_id === a.id).reduce((acc, curr) => acc + parseFloat(curr.importo_totale || 0), 0);
                return (
                  <div key={a.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: a.colore || '#0e9488' }} />
                          <h4 className="font-bold text-lg text-slate-900">{a.nome}</h4>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => { setEditingItem(a); setAziendaForm(a); setShowModal('azienda'); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteItem('aziende_mandanti', a.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mb-1">P.IVA: {a.p_iva}</p>
                      <p className="text-sm text-slate-500 mb-4">{a.indirizzo}</p>
                      
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2">
                        <div>
                          <span className="text-xs text-slate-400 font-medium">Clienti collegati</span>
                          <span className="block font-bold text-slate-900">{numClienti}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 font-medium">Venduto Totale</span>
                          <span className="block font-bold text-emerald-600">€ {fatturatoAzienda.toLocaleString('it-IT')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: PREVENTIVI GENERALE */}
        {activeTab === 'preventivi' && (
          <div className="space-y-8">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Gestione Preventivi</h2>
                <p className="text-slate-500">Monitora e gestisci tutti i preventivi in corso di trattativa</p>
              </div>
              <button 
                onClick={() => { setPreventivoForm({ cliente_id: '', oggetto: '', importo: '', stato: 'Inviato', data_scadenza: '' }); setShowModal('preventivo'); }}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center space-x-2 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Crea Nuovo Preventivo</span>
              </button>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 font-bold text-sm text-slate-600">Oggetto</th>
                    <th className="p-4 font-bold text-sm text-slate-600">Cliente</th>
                    <th className="p-4 font-bold text-sm text-slate-600">Importo</th>
                    <th className="p-4 font-bold text-sm text-slate-600">Scadenza</th>
                    <th className="p-4 font-bold text-sm text-slate-600">Stato</th>
                    <th className="p-4 font-bold text-sm text-slate-600">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {preventivi.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 text-sm">Nessun preventivo presente in archivio.</td>
                    </tr>
                  ) : (
                    preventivi.map(p => {
                      const cli = clienti.find(c => c.id === p.cliente_id);
                      return (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="p-4 font-semibold text-slate-900">{p.oggetto}</td>
                          <td className="p-4 text-slate-600">{cli ? cli.nome : 'Cliente sconosciuto'}</td>
                          <td className="p-4 font-bold text-slate-900">€ {parseFloat(p.importo).toLocaleString('it-IT')}</td>
                          <td className="p-4 text-slate-500">{new Date(p.data_scadenza).toLocaleDateString('it-IT')}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${p.stato === 'Accettato' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{p.stato}</span>
                          </td>
                          <td className="p-4 flex space-x-2">
                            {p.stato !== 'Accettato' && (
                              <button 
                                onClick={async () => { await supabase.from('preventivi').update({ stato: 'Accettato' }).eq('id', p.id); fetchData(); }}
                                className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold"
                              >
                                Accetta
                              </button>
                            )}
                            <button onClick={() => deleteItem('preventivi', p.id)} className="text-red-500 hover:text-red-600 text-xs font-semibold">Elimina</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: SEZIONE FATTURATO & STATISTICHE */}
        {activeTab === 'fatturato' && (
          <div className="space-y-8">
            <header>
              <h2 className="text-3xl font-bold tracking-tight">Fatturato & Statistiche</h2>
              <p className="text-slate-500">Dettaglio analitico del fatturato e del venduto diviso per mandati</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-sm font-medium">Totale Transato</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">€ {totaleFatturato.toLocaleString('it-IT')}</h3>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-sm font-medium">Preventivi Accettati (Futuro Prossimo)</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">€ {totalePreventiviAccettati.toLocaleString('it-IT')}</h3>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                  <Check className="w-6 h-6" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-sm font-medium">Tasso di Conversione Preventivi</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {preventivi.length > 0 ? ((preventivi.filter(p => p.stato === 'Accettato').length / preventivi.length) * 100).toFixed(0) : 0}%
                  </h3>
                </div>
                <div className="bg-purple-50 text-purple-600 p-3 rounded-xl">
                  <Percent className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* TABELLA FATTURATO PER AZIENDE */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="font-bold text-lg mb-6">Vendite Complessive suddivise per Mandante</h4>
              <div className="space-y-4">
                {aziende.map(a => {
                  const vendite = ordini.filter(o => o.azienda_id === a.id).reduce((acc, curr) => acc + parseFloat(curr.importo_totale || 0), 0);
                  const percentuale = totaleFatturato > 0 ? (vendite / totaleFatturato) * 100 : 0;
                  return (
                    <div key={a.id} className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: a.colore || '#0e9488' }} />
                          <span className="font-bold text-slate-900">{a.nome}</span>
                        </div>
                        <span className="font-bold text-slate-900">€ {vendite.toLocaleString('it-IT')} ({percentuale.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${percentuale}%`, backgroundColor: a.colore || '#0e9488' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODALI DI INSERIMENTO / MODIFICA */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">
                {editingItem ? 'Modifica' : 'Inserisci'} {showModal.toUpperCase()}
              </h3>
              <button onClick={() => { setShowModal(null); setEditingItem(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </header>

            <form onSubmit={
              showModal === 'cliente' ? handleSaveCliente :
              showModal === 'azienda' ? handleSaveAzienda :
              showModal === 'attivita' ? handleSaveAttivita :
              showModal === 'preventivo' ? handleSavePreventivo :
              showModal === 'ordine' ? handleSaveOrdine : null
            } className="p-6 space-y-4">
              
              {/* Form Cliente */}
              {showModal === 'cliente' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome o Ragione Sociale *</label>
                    <input type="text" required value={clienteForm.nome} onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                    <input type="email" value={clienteForm.email} onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Telefono</label>
                    <input type="text" value={clienteForm.telefono} onChange={(e) => setClienteForm({ ...clienteForm, telefono: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Azienda Mandante Collegata *</label>
                    <select required value={clienteForm.azienda_mandante_id} onChange={(e) => setClienteForm({ ...clienteForm, azienda_mandante_id: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="">Seleziona un'azienda</option>
                      {aziende.map(a => (
                        <option key={a.id} value={a.id}>{a.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Scegli un colore identificativo</label>
                    <input type="color" value={clienteForm.colore} onChange={(e) => setClienteForm({ ...clienteForm, colore: e.target.value })} className="w-full h-10 p-1 border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Note e Informazioni aggiuntive</label>
                    <textarea rows="3" value={clienteForm.note} onChange={(e) => setClienteForm({ ...clienteForm, note: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </>
              )}

              {/* Form Azienda Mandante */}
              {showModal === 'azienda' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome Azienda *</label>
                    <input type="text" required value={aziendaForm.nome} onChange={(e) => setAziendaForm({ ...aziendaForm, nome: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Partita IVA</label>
                    <input type="text" value={aziendaForm.p_iva} onChange={(e) => setAziendaForm({ ...aziendaForm, p_iva: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Indirizzo Sede</label>
                    <input type="text" value={aziendaForm.indirizzo} onChange={(e) => setAziendaForm({ ...aziendaForm, indirizzo: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Colore Identificativo</label>
                    <input type="color" value={aziendaForm.colore} onChange={(e) => setAziendaForm({ ...aziendaForm, colore: e.target.value })} className="w-full h-10 p-1 border border-slate-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 font-medium">Note aggiuntive</label>
                    <textarea rows="3" value={aziendaForm.note} onChange={(e) => setAziendaForm({ ...aziendaForm, note: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </>
              )}

              {/* Form Attività */}
              {showModal === 'attivita' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Seleziona Cliente *</label>
                    <select required value={attivitaForm.cliente_id} onChange={(e) => setAttivitaForm({ ...attivitaForm, cliente_id: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="">Scegli un cliente</option>
                      {clienti.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tipo Attività</label>
                    <select value={attivitaForm.tipo} onChange={(e) => setAttivitaForm({ ...attivitaForm, tipo: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="Chiamata">Chiamata Telefonica</option>
                      <option value="Visita">Visita in Sede</option>
                      <option value="Incontro">Incontro Informativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Data *</label>
                    <input type="date" required value={attivitaForm.data} onChange={(e) => setAttivitaForm({ ...attivitaForm, data: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Resoconto e Note</label>
                    <textarea rows="3" value={attivitaForm.note} onChange={(e) => setAttivitaForm({ ...attivitaForm, note: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </>
              )}

              {/* Form Preventivo */}
              {showModal === 'preventivo' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Cliente Associato *</label>
                    <select required value={preventivoForm.cliente_id} onChange={(e) => setPreventivoForm({ ...preventivoForm, cliente_id: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="">Scegli un cliente</option>
                      {clienti.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Oggetto del Preventivo *</label>
                    <input type="text" required value={preventivoForm.oggetto} onChange={(e) => setPreventivoForm({ ...preventivoForm, oggetto: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Importo Complessivo (€) *</label>
                    <input type="number" step="0.01" required value={preventivoForm.importo} onChange={(e) => setPreventivoForm({ ...preventivoForm, importo: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Data Scadenza *</label>
                    <input type="date" required value={preventivoForm.data_scadenza} onChange={(e) => setPreventivoForm({ ...preventivoForm, data_scadenza: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </>
              )}

              {/* Form Ordine */}
              {showModal === 'ordine' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Cliente Associato *</label>
                    <select required value={ordineForm.cliente_id} onChange={(e) => setOrdineForm({ ...ordineForm, cliente_id: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="">Scegli un cliente</option>
                      {clienti.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Azienda Mandante di Riferimento *</label>
                    <select required value={ordineForm.azienda_id} onChange={(e) => setOrdineForm({ ...ordineForm, azienda_id: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="">Seleziona l'azienda venditrice</option>
                      {aziende.map(a => (
                        <option key={a.id} value={a.id}>{a.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Numero Contratto / Ordine *</label>
                    <input type="text" required value={ordineForm.numero_ordine} onChange={(e) => setOrdineForm({ ...ordineForm, numero_ordine: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Importo Totale (€) *</label>
                    <input type="number" step="0.01" required value={ordineForm.importo_totale} onChange={(e) => setOrdineForm({ ...ordineForm, importo_totale: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Data Firma Contratto *</label>
                    <input type="date" required value={ordineForm.data_ordine} onChange={(e) => setOrdineForm({ ...ordineForm, data_ordine: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Note e Specifiche</label>
                    <textarea rows="2" value={ordineForm.note} onChange={(e) => setOrdineForm({ ...ordineForm, note: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </>
              )}

              <footer className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => { setShowModal(null); setEditingItem(null); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 font-semibold">Annulla</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-semibold shadow">Salva Modifiche</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
