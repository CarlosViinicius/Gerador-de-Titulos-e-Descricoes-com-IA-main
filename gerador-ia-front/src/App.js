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
  History, LayoutDashboard, Settings, ChevronRight, Zap, Copy, UploadCloud, X, FileText, Video
} from "lucide-react";
import logo from "./assets/icons/logo-copy.png";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ==========================================
// FUNÇÕES AUXILIARES E PARSER
// ==========================================
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
  const t = stripMarkdown(texto);

  const tituloMatch = t.match(/T[ií]tulo:\s*(.*?)(?=\n|$)/i);
  const descMatch = t.match(/Descri[cç][aã]o:\s*([\s\S]*?)(?=\nRoteiro|$)/i);
  const roteiroMatch = t.match(/Roteiro:\s*([\s\S]*)$/i);

  if (tituloMatch && descMatch) {
    return {
      titulo: stripQuotes(tituloMatch[1].trim()),
      descricao: stripQuotes(descMatch[1].trim()),
      roteiro: roteiroMatch ? stripQuotes(roteiroMatch[1].trim()) : null
    };
  }
  return null;
}

const Typewriter = ({ text, delay = 15 }) => {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else clearInterval(timer);
    }, delay);
    return () => clearInterval(timer);
  }, [text, delay]);
  return <span>{displayedText}</span>;
};

// ==========================================
// ROTAS PRINCIPAIS
// ==========================================
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/dashboard" element={<ComingSoon />} />
        <Route path="/historico" element={<ComingSoon />} />
        <Route path="/configuracoes" element={<ComingSoon />} />
      </Routes>
    </Router>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================
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
  const [imagemBase64, setImagemBase64] = useState(null);

  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [gerando, setGerando] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const [abaAtiva, setAbaAtiva] = useState("copy");

  const categorias = ["Camisa", "Calçado", "Bolsa", "Acessório", "Outros"];
  const tons = ["Informal", "Profissional", "Divertido", "Elegante"];

  useEffect(() => {
    fetch(`${API_BASE}/titles?user_id=${userId}`)
      .then(r => r.json()).then(d => setHistorico(d)).catch(() => { });
  }, [userId]);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2500);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagemBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGerando(true);
    setItemSelecionado(null);
    setAbaAtiva("copy");

    const dados = { categoria: categoria === "Outros" ? outraCategoria : categoria, beneficios, material, imagem: imagemBase64 };

    try {
      const res = await fetch(`${API_BASE}/gerar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
      const json = await res.json();
      const parsed = parseResultadoApi(json.resultado);
      setItemSelecionado(parsed || { titulo: "Gerado com IA", descricao: stripMarkdown(json.resultado), roteiro: null });
    } catch {
      setItemSelecionado({ titulo: "Erro", descricao: "Erro ao gerar conteúdo. Verifique sua conexão.", roteiro: null });
    } finally { setGerando(false); }
  };

  // NOVA FUNÇÃO: AJUSTE FINO MÁGICO
  const handleAjuste = async (estilo) => {
    if (!itemSelecionado) return;
    setGerando(true);
    setAbaAtiva("copy"); // Volta para a primeira aba para ver o resultado

    const dados = {
      titulo_atual: itemSelecionado.titulo,
      descricao_atual: itemSelecionado.descricao,
      roteiro_atual: itemSelecionado.roteiro || "",
      estilo: estilo
    };

    try {
      const res = await fetch(`${API_BASE}/ajustar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });
      const json = await res.json();
      const parsed = parseResultadoApi(json.resultado);
      if (parsed) setItemSelecionado(parsed);
    } catch {
      showToast("✦ Erro ao ajustar o texto.");
    } finally {
      setGerando(false);
    }
  };

  const salvar = async () => {
    if (!itemSelecionado) return;
    try {
      const res = await fetch(`${API_BASE}/titles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: itemSelecionado.titulo, descricao: itemSelecionado.descricao, user_id: userId }) });
      const saved = await res.json();
      setHistorico(prev => [saved, ...prev]);
      showToast("✦ Salvo no histórico");
    } catch { }
  };

  const exportar = () => {
    if (!itemSelecionado) return;
    const textoFinal = `Título: ${itemSelecionado.titulo}\n\nDescrição:\n${itemSelecionado.descricao}${itemSelecionado.roteiro ? `\n\nROTEIRO PARA VÍDEO:\n${itemSelecionado.roteiro}` : ""}`;
    const blob = new Blob([textoFinal], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${itemSelecionado.titulo.replace(/\s+/g, "_")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const copiarTexto = () => {
    if (!itemSelecionado) return;
    const textoFormatado = abaAtiva === "roteiro"
      ? `Roteiro Viral:\n\n${itemSelecionado.roteiro}`
      : `Título: ${itemSelecionado.titulo}\n\nDescrição:\n${itemSelecionado.descricao}`;

    navigator.clipboard.writeText(textoFormatado);
    showToast(abaAtiva === "roteiro" ? "✦ Roteiro copiado!" : "✦ Texto copiado!");
  };

  const deletar = async (id) => {
    try { await fetch(`${API_BASE}/titles/${id}`, { method: "DELETE" }); setHistorico(prev => prev.filter(i => i.id !== id)); } catch { }
  };

  return (
    <div>
      <div className="bg-fx"><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" /></div>
      <div className="bg-scan" /><div className="bg-grid" /><div className="bg-vignette" />

      <div className="page-content">
        <header className="header">
          <div className="header-inner">
            <Link to="/" className="logo-mark">
              <div className="logo-icon"><img src={logo} alt="Logo" width={120} height={120} /></div>
              <div><div className="logo-text">Copy<span>Gen</span></div></div>
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
          <div className="hero-badge"><span className="hero-badge-dot" /> Sistema ativo</div>
          <p className="hero-eyebrow">IA Generativa <span>·</span> E-commerce <span>·</span> Conversão</p>
          <h2 className="hero-title">Descrições que<br /><span className="neon">convertem</span> de verdade</h2>
          <p className="hero-sub">Gere títulos, descrições irresistíveis e roteiros virais para seus produtos com IA de ponta.</p>
        </motion.section>

        <div className="main-grid">

          {/* CARD 1: Parâmetros */}
          <motion.div className="card" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.55 }}>
            <div className="card-head">
              <div className="card-head-icon icon-green"><Wand2 size={15} /></div>
              <div className="card-head-text"><h3>Parâmetros</h3><p>Configure o que deseja gerar</p></div>
              <span className="card-head-badge">STEP 01</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>

                <div className="field">
                  <label>Foto do Produto (Opcional)</label>
                  <div className="mt-1">
                    {imagemBase64 ? (
                      <div className="relative rounded-xl overflow-hidden border border-[rgba(16,185,129,0.3)]">
                        <img src={imagemBase64} alt="Preview do Produto" className="w-full h-32 object-cover opacity-90" />
                        <button type="button" onClick={() => setImagemBase64(null)} className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-1.5 rounded-lg backdrop-blur-md transition-all"><X size={14} /></button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.03)] rounded-xl cursor-pointer hover:border-[rgba(16,185,129,0.5)] hover:bg-[rgba(16,185,129,0.08)] transition-all text-center">
                        <div className="flex flex-col items-center justify-center">
                          <UploadCloud size={24} className="text-[#34d399] mb-2" />
                          <span className="font-['DM_Mono'] text-[0.65rem] uppercase tracking-widest text-[#84b8a0] block">
                            Anexar imagem
                          </span>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="field">
                  <label>Categoria</label>
                  <div className="select-wrap">
                    <select value={categoria} onChange={e => setCategoria(e.target.value)} required={!imagemBase64}>
                      <option value="">Selecione a categoria</option>
                      {categorias.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {categoria === "Outros" && (
                    <input type="text" placeholder="Digite a nova categoria" value={outraCategoria} onChange={e => setOutraCategoria(e.target.value)} style={{ marginTop: 8 }} required={!imagemBase64} />
                  )}
                </div>

                <div className="field flex gap-3">
                  <div className="flex-1">
                    <label>Material</label>
                    <input placeholder="Opcional se enviar foto" value={material} onChange={e => setMaterial(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label>Tom de voz</label>
                    <div className="select-wrap">
                      <select value={tom} onChange={e => setTom(e.target.value)}>
                        <option value="">Selecione</option>
                        {tons.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="field" style={{ flex: 1 }}>
                  <label>Benefícios extras</label>
                  <textarea rows={3} placeholder="Algum detalhe que a foto não mostra? (Ex: Proteção UV...)" value={beneficios} onChange={e => setBeneficios(e.target.value)} style={{ height: "100%", minHeight: 80 }} />
                </div>

                <button type="submit" className="btn-primary" disabled={gerando}>
                  {gerando ? <><div className="spinner" /> Gerando…</> : <><Sparkles size={14} /> Gerar com IA</>}
                </button>
              </form>
            </div>
          </motion.div>

          {/* CARD 2: Resultado */}
          <motion.div className="card" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.55 }}>
            <div className="card-head">
              <div className="card-head-icon icon-lime"><Sparkles size={15} /></div>
              <div className="card-head-text"><h3>Resultado</h3><p>Título, descrição e roteiro</p></div>
              <span className="card-head-badge">STEP 02</span>
            </div>
            <div className="card-body">
              <AnimatePresence mode="wait">
                {gerando ? (
                  <motion.div key="loading" className="flex flex-col flex-1 gap-3 p-2 animate-pulse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="h-8 bg-emerald-900/40 rounded-lg w-3/4 mx-auto mb-4"></div>
                    <div className="h-1 bg-emerald-500/30 rounded w-10 mx-auto mb-6"></div>
                    <div className="h-3 bg-emerald-900/30 rounded w-full"></div><div className="h-3 bg-emerald-900/30 rounded w-full"></div>
                    <div className="h-3 bg-emerald-900/30 rounded w-5/6"></div><div className="h-3 bg-emerald-900/30 rounded w-4/6 mb-4"></div>
                  </motion.div>
                ) : itemSelecionado ? (
                  <motion.div key="result" className="result-content flex flex-col h-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.32 }}>

                    {/* NAVEGAÇÃO DAS ABAS */}
                    <div className="tabs-container">
                      <button onClick={() => setAbaAtiva("copy")} className={`tab-btn ${abaAtiva === "copy" ? "active" : ""}`}>
                        <FileText size={15} /> Descrição Site
                      </button>
                      {itemSelecionado.roteiro && (
                        <button onClick={() => setAbaAtiva("roteiro")} className={`tab-btn ${abaAtiva === "roteiro" ? "active" : ""}`}>
                          <Video size={15} /> Roteiro TikTok
                        </button>
                      )}
                    </div>

                    <h2 className="result-titulo" style={{ fontSize: abaAtiva === "roteiro" ? "1.2rem" : "1.45rem" }}>
                      {abaAtiva === "copy" ? itemSelecionado.titulo : "Roteiro Viral 🔥"}
                    </h2>

                    <div className="result-divider" />

                    <div className="result-desc flex-1">
                      {abaAtiva === "copy" ? (
                        <Typewriter text={itemSelecionado.descricao} delay={10} />
                      ) : (
                        <Typewriter text={itemSelecionado.roteiro} delay={10} />
                      )}
                    </div>

                    {/* NOVOS BOTÕES: AJUSTE FINO MÁGICO */}
                    <div className="flex flex-wrap gap-2 justify-center mb-4 mt-2">
                      <button onClick={() => handleAjuste("mais curto, direto e objetivo")} className="text-[0.7rem] font-medium px-3 py-1.5 bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] rounded-lg hover:border-[#34d399] hover:bg-[rgba(16,185,129,0.1)] transition-all text-[#84b8a0] hover:text-[#34d399]">🤏 Mais Curto</button>
                      <button onClick={() => handleAjuste("muito mais persuasivo, focado em vendas e escassez")} className="text-[0.7rem] font-medium px-3 py-1.5 bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] rounded-lg hover:border-[#34d399] hover:bg-[rgba(16,185,129,0.1)] transition-all text-[#84b8a0] hover:text-[#34d399]">🔥 Mais Vendedor</button>
                      <button onClick={() => handleAjuste("mais engraçado, divertido e cheio de emojis")} className="text-[0.7rem] font-medium px-3 py-1.5 bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] rounded-lg hover:border-[#34d399] hover:bg-[rgba(16,185,129,0.1)] transition-all text-[#84b8a0] hover:text-[#34d399]">😂 Mais Divertido</button>
                      <button onClick={() => handleAjuste("mais técnico, sério, chique e profissional")} className="text-[0.7rem] font-medium px-3 py-1.5 bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] rounded-lg hover:border-[#34d399] hover:bg-[rgba(16,185,129,0.1)] transition-all text-[#84b8a0] hover:text-[#34d399]">👔 Profissional</button>
                    </div>

                    <div className="result-actions">
                      <button className="btn-save" onClick={salvar} disabled={abaAtiva === "roteiro"} style={{ opacity: abaAtiva === "roteiro" ? 0.5 : 1 }}>
                        <Save size={14} /> Salvar
                      </button>
                      <button className="btn-export" onClick={copiarTexto}><Copy size={14} /> Copiar</button>
                      <button className="btn-export" onClick={exportar}><Download size={14} /> Exportar</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" className="result-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="result-empty-icon"><Zap size={28} /></div>
                    <p>Preencha os parâmetros e clique em gerar</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* CARD 3: Histórico */}
          <motion.div className="card" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30, duration: 0.55 }}>
            <div className="card-head">
              <div className="card-head-icon icon-slate"><History size={15} /></div>
              <div className="card-head-text"><h3>Histórico</h3><p>Gerações anteriores salvas</p></div>
              <span className="card-head-badge">STEP 03</span>
            </div>
            <div className="card-body" style={{ padding: "1.1rem", display: "flex", flexDirection: "column" }}>
              {historico.length === 0 ? (
                <div className="history-empty">Nenhum item salvo ainda.<br />Gere e salve seu primeiro conteúdo.</div>
              ) : (
                <ul className="history-list">
                  <AnimatePresence>
                    {historico.map(item => (
                      <motion.li key={item.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.22 }}
                        className="history-item" onClick={() => setItemSelecionado({ titulo: item.titulo, descricao: item.descricao, roteiro: null })}
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
      </div>

      <AnimatePresence>
        {toast.show && (
          <motion.div className="toast" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>
            {toast.message}
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
        <p>Página em construção.</p>
        <button onClick={() => navigate("/")} className="btn-primary" style={{ width: "auto", padding: "12px 32px" }}>Voltar ao início</button>
      </div>
    </>
  );
}

export default App;