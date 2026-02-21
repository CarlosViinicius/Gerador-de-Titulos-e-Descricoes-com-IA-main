import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Download, Trash2, Sparkles, Wand2,
  History, LayoutDashboard, Settings, ChevronRight, Zap,
} from "lucide-react";
import logo from "./assets/icons/logo-copy.png";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

function stripMarkdown(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s*/g, "").replace(/__([^_]+)__/g, "$1").replace(/_([^_]+)_/g, "$1").trim();
}
function stripQuotes(text) {
  if (!text || typeof text !== "string") return text;
  const t = text.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1).trim();
  return t;
}
function parseResultadoApi(texto) {
  if (!texto || typeof texto !== "string") return null;
  const t = texto.trim();
  const tituloRegex = /(?:^|\n)\s*\*{0,2}\s*T[ií]tulo\s*:\s*\*{0,2}\s*["']?\s*([^"\n]+?)["']?\s*(?=\n|$)/i;
  const descRegex = /(?:^|\n)\s*\*{0,2}\s*Descri[cç][aã]o\s*:\s*\*{0,2}\s*["']?([\s\S]*)["']?\s*$/i;
  const tituloMatch = t.match(tituloRegex);
  const descMatch = t.match(descRegex);
  if (tituloMatch && descMatch) return { titulo: stripQuotes(stripMarkdown(tituloMatch[1].trim())), descricao: stripQuotes(stripMarkdown(descMatch[1].trim())) };
  const simple = t.match(/T[ií]tulo\s*:\s*([^\n]+)\s*\n\s*Descri[cç][aã]o\s*:\s*([\s\S]*)/i);
  if (simple) return { titulo: stripQuotes(stripMarkdown(simple[1].trim())), descricao: stripQuotes(stripMarkdown(simple[2].trim())) };
  return null;
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #060a08;
    --bg-2:      #091210;
    --bg-3:      #0d1a16;
    --surface:   #0b1612;
    --surface-2: #122019;
    --border:        rgba(16, 185, 129, 0.13);
    --border-bright: rgba(16, 185, 129, 0.38);
    --green:        #10b981;
    --green-bright: #34d399;
    --green-glow:   #059669;
    --green-pale:   rgba(16, 185, 129, 0.1);
    --green-pale2:  rgba(16, 185, 129, 0.04);
    --lime:     #a3e635;
    --lime-pale: rgba(163, 230, 53, 0.07);
    --text:   #e8faf3;
    --text-2: #84b8a0;
    --text-3: #3d7a5e;
    --glow-green: 0 0 28px rgba(16,185,129,0.5), 0 0 70px rgba(16,185,129,0.18);
    --glow-sm:    0 0 14px rgba(16,185,129,0.35);
    --glow-lime:  0 0 20px rgba(163,230,53,0.3);
  }

  body {
    font-family: 'Outfit', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── BACKGROUND ─────────────────────────────────── */
  .bg-fx { position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden; }

  .bg-orb { position:absolute;border-radius:50%;filter:blur(90px);opacity:0.16;animation:orb-drift 14s ease-in-out infinite alternate; }
  .bg-orb-1 { width:700px;height:700px;background:radial-gradient(circle,#059669,transparent 70%);top:-220px;left:-140px; }
  .bg-orb-2 { width:450px;height:450px;background:radial-gradient(circle,#065f46,transparent 70%);bottom:-120px;right:-120px;animation-delay:-5s; }
  .bg-orb-3 { width:350px;height:350px;background:radial-gradient(circle,#84cc16,transparent 70%);top:45%;left:58%;animation-delay:-9s;opacity:0.06; }

  @keyframes orb-drift { 100% { transform: translate(28px,18px) scale(1.07); } }

  /* animated scan line */
  .bg-scan {
    position:fixed;inset:0;pointer-events:none;z-index:0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(16,185,129,0.018) 3px,
      rgba(16,185,129,0.018) 4px
    );
  }

  /* grid dots */
  .bg-grid {
    position:fixed;inset:0;pointer-events:none;z-index:0;
    background-image:
      radial-gradient(circle, rgba(16,185,129,0.12) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  /* subtle vignette */
  .bg-vignette {
    position:fixed;inset:0;pointer-events:none;z-index:0;
    background: radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(6,10,8,0.7) 100%);
  }

  .page-content { position:relative;z-index:1; }

  /* ── HEADER ─────────────────────────────────────── */
  .header {
    position:sticky;top:0;z-index:100;
    background:rgba(6,10,8,0.75);
    backdrop-filter:blur(28px);
    border-bottom:1px solid var(--border);
  }
  .header-inner {
    max-width:1280px;margin:0 auto;padding:0 2.5rem;
    height:70px;display:flex;align-items:center;justify-content:space-between;
  }
  .logo-mark { display:flex;align-items:center;gap:13px;text-decoration:none; }
  .logo-icon {
    width:40px;height:40px;border-radius:11px;
    background:linear-gradient(135deg,#059669,#047857);
    display:flex;align-items:center;justify-content:center;
    color:#fff;box-shadow:var(--glow-sm);
    border:1px solid rgba(52,211,153,0.3);
  }
  .logo-text { font-family:'Outfit',sans-serif;font-size:1rem;font-weight:700;color:var(--text); }
  .logo-text span { color:var(--green-bright); }
  .logo-sub {
    font-family:'DM Mono',monospace;font-size:0.65rem;font-weight:400;
    color:var(--text-3);letter-spacing:0.1em;text-transform:uppercase;
    margin-top:1px;
  }

  .nav { display:flex;align-items:center;gap:0.5rem; }
  .nav a {
    font-size:0.8rem;font-weight:500;color:var(--text-3);
    text-decoration:none;display:flex;align-items:center;gap:5px;
    padding:7px 14px;border-radius:8px;border:1px solid transparent;
    transition:all 0.2s;letter-spacing:0.02em;
  }
  .nav a:hover { color:var(--green-bright);background:var(--green-pale2);border-color:var(--border); }

  /* ── HERO ───────────────────────────────────────── */
  .hero { text-align:center;padding:4.5rem 1rem 2.5rem; }
  .hero-badge {
    display:inline-flex;align-items:center;gap:8px;
    padding:5px 16px 5px 10px;
    background:var(--green-pale);border:1px solid var(--border-bright);
    border-radius:100px;
    font-family:'DM Mono',monospace;font-size:0.68rem;font-weight:500;
    color:var(--green-bright);letter-spacing:0.1em;text-transform:uppercase;
    margin-bottom:1.6rem;
  }
  .hero-badge-dot {
    width:7px;height:7px;background:var(--green-bright);border-radius:50%;
    box-shadow:0 0 8px var(--green-bright);
    animation:pulse-dot 2.2s ease-in-out infinite;
  }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.75)} }

  .hero-eyebrow {
    font-family:'DM Mono',monospace;font-size:0.72rem;color:var(--text-3);
    letter-spacing:0.15em;text-transform:uppercase;margin-bottom:0.9rem;
  }
  .hero-eyebrow span { color:var(--green);margin:0 6px; }

  .hero-title {
    font-family:'Outfit',sans-serif;
    font-size:clamp(2.6rem,5.5vw,4.4rem);
    font-weight:900;color:var(--text);
    line-height:1.0;letter-spacing:-0.04em;
    max-width:740px;margin:0 auto 1.2rem;
  }
  .hero-title .neon {
    background:linear-gradient(135deg,#6ee7b7,#10b981,#a3e635);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    filter:drop-shadow(0 0 24px rgba(16,185,129,0.6));
  }
  .hero-sub { color:var(--text-2);font-size:0.98rem;font-weight:300;max-width:400px;margin:0 auto;line-height:1.75; }

  /* ── GRID ───────────────────────────────────────── */
  .main-grid {
    max-width:1280px;margin:0 auto;padding:0 2.5rem 5rem;
    display:grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap:1.4rem;
    align-items: stretch;
  }
  @media(max-width:1024px){ .main-grid{ grid-template-columns:1fr; } }

  /* ── CARD ───────────────────────────────────────── */
  .card {
    background:var(--surface);
    border-radius:20px;border:1px solid var(--border);
    overflow:hidden;
    transition:border-color 0.3s,box-shadow 0.3s,transform 0.3s;
    display:flex;flex-direction:column;
    position:relative;
  }
  .card::before {
    content:'';position:absolute;inset:0;border-radius:20px;
    background:linear-gradient(135deg,rgba(16,185,129,0.04) 0%,transparent 60%);
    pointer-events:none;
  }
  .card:hover {
    border-color:var(--border-bright);
    box-shadow:0 0 0 1px var(--border),0 24px 64px rgba(0,0,0,0.45),0 0 40px rgba(16,185,129,0.09);
    transform:translateY(-4px);
  }
  .card-head {
    padding:1.35rem 1.6rem 1.15rem;
    border-bottom:1px solid var(--border);
    display:flex;align-items:center;gap:12px;
    background:rgba(13,26,22,0.8);
    flex-shrink:0;
  }
  .card-head-icon { width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
  .icon-green { background:var(--green-pale);color:var(--green-bright);border:1px solid var(--border-bright); }
  .icon-lime  { background:var(--lime-pale);color:var(--lime);border:1px solid rgba(163,230,53,0.22); }
  .icon-slate { background:rgba(255,255,255,0.04);color:var(--text-2);border:1px solid var(--border); }
  .card-head-badge {
    margin-left:auto;
    font-family:'DM Mono',monospace;font-size:0.6rem;
    color:var(--text-3);letter-spacing:0.1em;
    background:rgba(255,255,255,0.03);
    border:1px solid var(--border);border-radius:6px;
    padding:2px 8px;
  }
  .card-head-text h3 { font-family:'Outfit',sans-serif;font-size:0.95rem;font-weight:700;color:var(--text); }
  .card-head-text p { font-size:0.73rem;color:var(--text-3);margin-top:2px; }
  .card-body { padding:1.5rem;flex:1;display:flex;flex-direction:column; }

  /* ── FORM ───────────────────────────────────────── */
  .field { margin-bottom:1.15rem; }
  .field label {
    display:block;font-family:'DM Mono',monospace;
    font-size:0.65rem;font-weight:500;color:var(--text-3);
    letter-spacing:0.1em;text-transform:uppercase;margin-bottom:7px;
  }
  .field select, .field input, .field textarea {
    width:100%;padding:10px 14px;
    border:1px solid var(--border);border-radius:11px;
    background:var(--bg-3);
    font-family:'Outfit',sans-serif;font-size:0.88rem;color:var(--text);
    transition:all 0.22s;outline:none;-webkit-appearance:none;
  }
  .field select:focus, .field input:focus, .field textarea:focus {
    border-color:var(--green);background:var(--bg-2);
    box-shadow:0 0 0 3px rgba(16,185,129,0.13),var(--glow-sm);
  }
  .field select option { background:var(--bg-2);color:var(--text); }
  .field textarea { resize:none;line-height:1.65; }
  .field input::placeholder, .field textarea::placeholder { color:var(--text-3); }
  .select-wrap { position:relative; }
  .select-wrap::after {
    content:'';position:absolute;right:14px;top:50%;transform:translateY(-50%);
    border-left:4px solid transparent;border-right:4px solid transparent;
    border-top:5px solid var(--text-3);pointer-events:none;
  }

  /* ── BTN PRIMARY ─────────────────────────────────── */
  .btn-primary {
    width:100%;padding:13px;
    background:linear-gradient(135deg,#059669 0%,#047857 100%);
    color:#fff;border:none;border-radius:11px;
    font-family:'Outfit',sans-serif;font-size:0.9rem;font-weight:700;
    letter-spacing:0.03em;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:8px;
    transition:all 0.25s;margin-top:0.5rem;
    box-shadow:0 4px 22px rgba(5,150,105,0.4);
    position:relative;overflow:hidden;
  }
  .btn-primary::before {
    content:'';position:absolute;inset:0;
    background:linear-gradient(135deg,#10b981,#059669);
    opacity:0;transition:opacity 0.22s;
  }
  .btn-primary:hover::before { opacity:1; }
  .btn-primary:hover { box-shadow:var(--glow-green);transform:translateY(-1px); }
  .btn-primary:disabled { opacity:0.45;cursor:not-allowed;transform:none; }
  .btn-primary > * { position:relative;z-index:1; }

  .spinner { width:15px;height:15px;border:2px solid rgba(255,255,255,0.25);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* ── RESULT ─────────────────────────────────────── */
  .result-empty {
    flex:1;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;gap:1rem;
    border:1px dashed var(--border);border-radius:14px;
    background:var(--green-pale2);padding:2rem;
    min-height:300px;
  }
  .result-empty-icon {
    width:64px;height:64px;border-radius:16px;
    background:var(--green-pale);border:1px solid var(--border-bright);
    display:flex;align-items:center;justify-content:center;color:var(--green-bright);
    box-shadow:var(--glow-sm);
  }
  .result-empty p { color:var(--text-3);font-size:0.84rem;max-width:170px;line-height:1.65; }

  .result-content { flex:1;display:flex;flex-direction:column;gap:0; }

  /* neon title glow */
  .result-titulo {
    font-family:'Outfit',sans-serif;font-size:1.45rem;font-weight:900;
    color:var(--text);line-height:1.2;letter-spacing:-0.03em;
    text-align:center;margin-bottom:1rem;
    text-shadow:0 0 30px rgba(16,185,129,0.35);
  }
  .result-divider {
    width:40px;height:2px;
    background:linear-gradient(90deg,var(--green),var(--lime));
    border-radius:2px;margin:0 auto 1.1rem;
    box-shadow:0 0 10px var(--green);
  }
  .result-desc {
    flex:1;color:var(--text-2);font-size:0.88rem;line-height:1.8;
    overflow-y:auto;white-space:pre-wrap;margin-bottom:1.4rem;
    max-height:200px;padding-right:4px;
  }
  .result-desc::-webkit-scrollbar { width:3px; }
  .result-desc::-webkit-scrollbar-thumb { background:var(--green);border-radius:2px; }

  .result-actions { display:flex;gap:10px;margin-top:auto; }
  .btn-save {
    flex:1;padding:10px;
    background:linear-gradient(135deg,#059669,#047857);
    color:#fff;border:none;border-radius:10px;
    font-family:'Outfit',sans-serif;font-size:0.85rem;font-weight:700;
    cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;
    transition:all 0.2s;box-shadow:0 4px 16px rgba(5,150,105,0.35);
  }
  .btn-save:hover { box-shadow:var(--glow-green);transform:translateY(-1px); }
  .btn-export {
    flex:1;padding:10px;background:transparent;color:var(--text-2);
    border:1px solid var(--border);border-radius:10px;
    font-family:'Outfit',sans-serif;font-size:0.85rem;font-weight:600;
    cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;
    transition:all 0.2s;
  }
  .btn-export:hover { border-color:var(--lime);color:var(--lime);background:var(--lime-pale);box-shadow:var(--glow-lime); }

  /* ── HISTORY ─────────────────────────────────────── */
  .history-empty { text-align:center;padding:3rem 1rem;color:var(--text-3);font-size:0.83rem; }
  .history-list { list-style:none;max-height:400px;overflow-y:auto;flex:1; }
  .history-list::-webkit-scrollbar { width:3px; }
  .history-list::-webkit-scrollbar-thumb { background:var(--green);border-radius:2px; }
  .history-item {
    display:flex;align-items:center;justify-content:space-between;gap:8px;
    padding:11px 12px;border-radius:11px;border:1px solid transparent;
    cursor:pointer;transition:all 0.2s;margin-bottom:5px;
  }
  .history-item:hover { background:var(--green-pale2);border-color:var(--border); }
  .history-item-text { flex:1;min-width:0; }
  .history-item-titulo { font-size:0.84rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .history-item-sub { font-family:'DM Mono',monospace;font-size:0.65rem;color:var(--text-3);margin-top:2px;letter-spacing:0.05em; }
  .history-item-actions { display:flex;align-items:center;gap:2px;opacity:0;transition:opacity 0.2s;flex-shrink:0; }
  .history-item:hover .history-item-actions { opacity:1; }
  .btn-icon { width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;background:transparent;transition:all 0.15s; }
  .btn-icon-arrow { color:var(--green-bright); }
  .btn-icon-arrow:hover { background:var(--green-pale); }
  .btn-icon-del { color:#f87171; }
  .btn-icon-del:hover { background:rgba(248,113,113,0.1); }

  /* ── FOOTER ─────────────────────────────────────── */
  .footer { text-align:center;padding:2rem;border-top:1px solid var(--border);position:relative;z-index:1; }
  .footer p { font-size:0.78rem;color:var(--text-3); }
  .footer a { color:var(--green-bright);font-weight:600;text-decoration:none;transition:color 0.2s; }
  .footer a:hover { color:var(--lime); }

  /* ── TOAST ───────────────────────────────────────── */
  .toast {
    position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);
    background:linear-gradient(135deg,#059669,#047857);
    color:#fff;padding:10px 24px;border-radius:100px;
    font-size:0.82rem;font-weight:700;z-index:200;pointer-events:none;
    box-shadow:var(--glow-green);border:1px solid rgba(52,211,153,0.35);
    letter-spacing:0.04em;
  }

  /* ── COMING SOON ─────────────────────────────────── */
  .coming-soon {
    min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:2rem;background:var(--bg);position:relative;z-index:1;
  }
  .coming-soon-icon {
    width:80px;height:80px;
    background:linear-gradient(135deg,#059669,#047857);
    border-radius:20px;display:flex;align-items:center;justify-content:center;
    font-size:2rem;margin:0 auto 1.5rem;box-shadow:var(--glow-green);
  }
  .coming-soon h1 { font-family:'Outfit',sans-serif;font-size:2.2rem;font-weight:900;color:var(--text);margin-bottom:0.75rem; }
  .coming-soon p { color:var(--text-2);font-weight:300;max-width:320px;margin:0 auto 2rem;line-height:1.65; }

  /* ── SEPARATOR ───────────────────────────────────── */
  .hero-stat-row {
    display:flex;align-items:center;justify-content:center;gap:2.5rem;
    padding:0 1rem 2.5rem;
    max-width:600px;margin:0 auto;
  }
  .hero-stat { text-align:center; }
  .hero-stat-num {
    font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:900;
    background:linear-gradient(135deg,#34d399,#a3e635);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  }
  .hero-stat-label { font-size:0.72rem;color:var(--text-3);margin-top:2px; }
  .hero-stat-divider { width:1px;height:32px;background:var(--border); }
`;

function App() {
  return (
    <>
      <style>{styles}</style>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/dashboard" element={<ComingSoon />} />
          <Route path="/historico" element={<ComingSoon />} />
          <Route path="/configuracoes" element={<ComingSoon />} />
        </Routes>
      </Router>
    </>
  );
}

function MainPage() {
  const [userId] = useState(() => {
    let id = localStorage.getItem("user_session_id");
    if (!id) { id = "user_" + Math.random().toString(36).substring(2, 11); localStorage.setItem("user_session_id", id); }
    return id;
  });
  const [categoria, setCategoria] = useState("");
  const [outraCategoria, setOutraCategoria] = useState("");
  const [material, setMaterial] = useState("");
  const [tom, setTom] = useState("");
  const [beneficios, setBeneficios] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [gerando, setGerando] = useState(false);
  const [toast, setToast] = useState(false);

  const categorias = ["Camisa", "Calçado", "Bolsa", "Acessório", "Outros"];
  const tons = ["Informal", "Profissional", "Divertido", "Elegante"];

  useEffect(() => {
    fetch(`${API_BASE}/titles?user_id=${userId}`)
      .then(r => r.json()).then(d => setHistorico(d)).catch(() => {});
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGerando(true);
    const dados = { categoria: categoria === "Outros" ? outraCategoria : categoria, beneficios, material };
    try {
      const res = await fetch(`${API_BASE}/gerar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
      const json = await res.json();
      const parsed = parseResultadoApi(json.resultado);
      setItemSelecionado(parsed || { titulo: "Gerado com IA", descricao: stripMarkdown(json.resultado) });
    } catch {
      setItemSelecionado({ titulo: "Erro", descricao: "Erro ao gerar conteúdo." });
    } finally { setGerando(false); }
  };

  const salvar = async () => {
    if (!itemSelecionado) return;
    try {
      const res = await fetch(`${API_BASE}/titles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: itemSelecionado.titulo, descricao: itemSelecionado.descricao, user_id: userId }) });
      const saved = await res.json();
      setHistorico(prev => [saved, ...prev]);
      setToast(true); setTimeout(() => setToast(false), 2200);
    } catch {}
  };

  const exportar = () => {
    if (!itemSelecionado) return;
    const blob = new Blob([`Título: ${itemSelecionado.titulo}\n\nDescrição: ${itemSelecionado.descricao}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${itemSelecionado.titulo.replace(/\s+/g, "_")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const deletar = async (id) => {
    try { await fetch(`${API_BASE}/titles/${id}`, { method: "DELETE" }); setHistorico(prev => prev.filter(i => i.id !== id)); } catch {}
  };

  return (
    <div>
      <div className="bg-fx">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>
      <div className="bg-scan" />
      <div className="bg-grid" />
      <div className="bg-vignette" />

      <div className="page-content">
        <header className="header">
          <div className="header-inner">
            <Link to="/" className="logo-mark">
              <div className="logo-icon"><img src={logo} alt="Logo" width={120} height={120} /></div>
              <div>
                <div className="logo-text">Copy<span>Gen</span></div>
              </div>
            </Link>
            <nav className="nav">
              <Link to="/dashboard"><LayoutDashboard size={13} /> Dashboard</Link>
              <Link to="/historico"><History size={13} /> Histórico</Link>
              <Link to="/configuracoes"><Settings size={13} /> Config</Link>
            </nav>
          </div>
        </header>

        <motion.section className="hero"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="hero-badge">
            <span className="hero-badge-dot" /> Sistema ativo
          </div>
          <p className="hero-eyebrow">IA Generativa <span>·</span> E-commerce <span>·</span> Conversão</p>
          <h2 className="hero-title">
            Descrições que<br /><span className="neon">convertem</span> de verdade
          </h2>
          <p className="hero-sub">
            Gere títulos e descrições irresistíveis para seus produtos com inteligência artificial de ponta.
          </p>
        </motion.section>

        {/* Stats row */}
        <motion.div className="hero-stat-row"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.5 }}
        >
          <div className="hero-stat"><div className="hero-stat-num">2s</div><div className="hero-stat-label">Tempo de geração</div></div>
          <div className="hero-stat-divider" />
          <div className="hero-stat"><div className="hero-stat-num">GPT</div><div className="hero-stat-label">Motor de linguagem</div></div>
          <div className="hero-stat-divider" />
          <div className="hero-stat"><div className="hero-stat-num">∞</div><div className="hero-stat-label">Gerações ilimitadas</div></div>
        </motion.div>

        {/* ── THREE EQUAL CARDS ── */}
        <div className="main-grid">

          {/* Parâmetros */}
          <motion.div className="card"
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="card-head">
              <div className="card-head-icon icon-green"><Wand2 size={15} /></div>
              <div className="card-head-text"><h3>Parâmetros</h3><p>Configure o que deseja gerar</p></div>
              <span className="card-head-badge">STEP 01</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", flex:1 }}>
                <div className="field">
                  <label>Categoria</label>
                  <div className="select-wrap">
                    <select value={categoria} onChange={e => setCategoria(e.target.value)}>
                      <option value="">Selecione a categoria</option>
                      {categorias.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {categoria === "Outros" && (
                    <input type="text" placeholder="Digite a nova categoria" value={outraCategoria} onChange={e => setOutraCategoria(e.target.value)} style={{ marginTop: 8 }} />
                  )}
                </div>
                <div className="field">
                  <label>Material</label>
                  <input placeholder="Ex: algodão, couro, nylon…" value={material} onChange={e => setMaterial(e.target.value)} />
                </div>
                <div className="field">
                  <label>Tom de voz</label>
                  <div className="select-wrap">
                    <select value={tom} onChange={e => setTom(e.target.value)}>
                      <option value="">Selecione o tom</option>
                      {tons.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field" style={{ flex:1 }}>
                  <label>Benefícios do produto</label>
                  <textarea rows={4} placeholder="Ex: confortável, durável, respirável…" value={beneficios} onChange={e => setBeneficios(e.target.value)} style={{ height:"100%", minHeight:96 }} />
                </div>
                <button type="submit" className="btn-primary" disabled={gerando}>
                  {gerando ? <><div className="spinner" /> Gerando…</> : <><Sparkles size={14} /> Gerar com IA</>}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Resultado */}
          <motion.div className="card"
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="card-head">
              <div className="card-head-icon icon-lime"><Sparkles size={15} /></div>
              <div className="card-head-text"><h3>Resultado</h3><p>Título e descrição gerados</p></div>
              <span className="card-head-badge">STEP 02</span>
            </div>
            <div className="card-body">
              <AnimatePresence mode="wait">
                {itemSelecionado ? (
                  <motion.div key="result" className="result-content"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.32 }}
                  >
                    <h2 className="result-titulo">{itemSelecionado.titulo}</h2>
                    <div className="result-divider" />
                    <p className="result-desc">{itemSelecionado.descricao}</p>
                    <div className="result-actions">
                      <button className="btn-save" onClick={salvar}><Save size={13} /> Salvar</button>
                      <button className="btn-export" onClick={exportar}><Download size={13} /> Exportar</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" className="result-empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <div className="result-empty-icon"><Zap size={28} /></div>
                    <p>Preencha os parâmetros e clique em gerar</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Histórico */}
          <motion.div className="card"
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.30, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="card-head">
              <div className="card-head-icon icon-slate"><History size={15} /></div>
              <div className="card-head-text"><h3>Histórico</h3><p>Gerações anteriores salvas</p></div>
              <span className="card-head-badge">STEP 03</span>
            </div>
            <div className="card-body" style={{ padding:"1.1rem", display:"flex", flexDirection:"column" }}>
              {historico.length === 0 ? (
                <div className="history-empty">Nenhum item salvo ainda.<br />Gere e salve seu primeiro conteúdo.</div>
              ) : (
                <ul className="history-list">
                  <AnimatePresence>
                    {historico.map(item => (
                      <motion.li key={item.id} layout
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.22 }}
                        className="history-item"
                        onClick={() => setItemSelecionado({ titulo: item.titulo, descricao: item.descricao })}
                      >
                        <div className="history-item-text">
                          <p className="history-item-titulo">{item.titulo}</p>
                          <p className="history-item-sub">gerado por ia</p>
                        </div>
                        <div className="history-item-actions">
                          <button className="btn-icon btn-icon-arrow"><ChevronRight size={13} /></button>
                          <button className="btn-icon btn-icon-del" onClick={e => { e.stopPropagation(); deletar(item.id); }}><Trash2 size={13} /></button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.div>

        </div>

        <footer className="footer">
          <p>Feito por <a href="https://www.instagram.com/carlosviinicius__/?hl=pt-br" target="_blank" rel="noopener noreferrer">Carlos Vinicius</a> · Gerador com Inteligência Artificial</p>
        </footer>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
          >
            ✦ Salvo no histórico
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComingSoon() {
  const navigate = useNavigate();
  return (
    <>
      <div className="bg-fx"><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /></div>
      <div className="bg-scan" /><div className="bg-grid" />
      <div className="coming-soon">
        <div className="coming-soon-icon">🚧</div>
        <h1>Em breve</h1>
        <p>Esta página está em construção. Mais funcionalidades chegando em breve.</p>
        <button onClick={() => navigate("/")} className="btn-primary" style={{ width:"auto", padding:"12px 32px" }}>
          Voltar ao início
        </button>
      </div>
    </>
  );
}

export default App;
