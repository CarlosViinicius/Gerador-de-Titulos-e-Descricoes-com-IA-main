import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Save, Download, Trash2, Sparkles } from "lucide-react";
import "./App.css";

// URL da API do backend (use .env REACT_APP_API_URL para alterar)
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Remove Markdown básico para exibir texto puro
function stripMarkdown(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

// Remove aspas que envolvem o texto (duplas ou simples)
function stripQuotes(text) {
  if (!text || typeof text !== "string") return text;
  const t = text.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

// Extrai só o título e a descrição do texto retornado pela API (ignora intro e rótulos)
function parseResultadoApi(texto) {
  if (!texto || typeof texto !== "string") return null;
  const t = texto.trim();
  // Procura por "Título:" ou "**Título:**" (evita pegar "sugestões de título" na intro)
  const tituloRegex = /(?:^|\n)\s*\*{0,2}\s*T[ií]tulo\s*:\s*\*{0,2}\s*["']?\s*([^"\n]+?)["']?\s*(?=\n|$)/i;
  const descRegex = /(?:^|\n)\s*\*{0,2}\s*Descri[cç][aã]o\s*:\s*\*{0,2}\s*["']?([\s\S]*)["']?\s*$/i;
  const tituloMatch = t.match(tituloRegex);
  const descMatch = t.match(descRegex);
  if (tituloMatch && descMatch) {
    return {
      titulo: stripQuotes(stripMarkdown(tituloMatch[1].trim())),
      descricao: stripQuotes(stripMarkdown(descMatch[1].trim())),
    };
  }
  // Fallback: formato simples "Título: x\nDescrição: y"
  const simple = t.match(/T[ií]tulo\s*:\s*([^\n]+)\s*\n\s*Descri[cç][aã]o\s*:\s*([\s\S]*)/i);
  if (simple) {
    return {
      titulo: stripQuotes(stripMarkdown(simple[1].trim())),
      descricao: stripQuotes(stripMarkdown(simple[2].trim())),
    };
  }
  return null;
}

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

function MainPage() {
  // Estados do formulário e resultado
  const [categoria, setCategoria] = useState("");
  const [outraCategoria, setOutraCategoria] = useState("");
  const [material, setMaterial] = useState("");
  const [tom, setTom] = useState("");
  const [beneficios, setBeneficios] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState(null);

  // Histórico e estado de geração
  const [historico, setHistorico] = useState([]);
  const [gerando, setGerando] = useState(false);

  const categorias = ["Camisa", "Calçado", "Bolsa", "Acessório", "Outros"];
  const tons = ["Informal", "Profissional", "Divertido", "Elegante"];

  // Carrega histórico do banco ao iniciar
  useEffect(() => {
    fetch(`${API_BASE}/titles`)
      .then((res) => res.json())
      .then((data) => setHistorico(data))
      .catch((err) => console.error("Erro ao carregar histórico:", err));
  }, []);

  // Gera título/descrição via IA
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGerando(true);
    const dados = {
      categoria: categoria === "Outros" ? outraCategoria : categoria,
      beneficios,
      material,
    };
    try {
      const resposta = await fetch(`${API_BASE}/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      const json = await resposta.json();
      const texto = json.resultado;
      const parsed = parseResultadoApi(texto);
      if (parsed) {
        setItemSelecionado({
          titulo: parsed.titulo,
          descricao: parsed.descricao,
        });
      } else {
        setItemSelecionado({
          titulo: "Gerado com IA",
          descricao: stripMarkdown(texto),
        });
      }
    } catch {
      setItemSelecionado({
        titulo: "Erro",
        descricao: "Erro ao gerar conteúdo.",
      });
    } finally {
      setGerando(false);
    }
  };

  // Salva no banco e atualiza histórico
  const salvar = async () => {
    if (!itemSelecionado) return;
    try {
      const response = await fetch(`${API_BASE}/titles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: itemSelecionado.titulo,
          descricao: itemSelecionado.descricao,
        }),
      });
      const saved = await response.json();
      setHistorico((prev) => [saved, ...prev]);
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  // Exporta como TXT
  const exportar = () => {
    if (!itemSelecionado) return;
    const blob = new Blob(
      [
        `Título: ${itemSelecionado.titulo}\n\nDescrição: ${itemSelecionado.descricao}`,
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${itemSelecionado.titulo.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Deleta item do histórico
  const deletar = async (id) => {
    try {
      await fetch(`${API_BASE}/titles/${id}`, { method: "DELETE" });
      setHistorico((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  };

  return (
    <div className="min-h-screen font-sans page-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg shadow-primary-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Gerador de Títulos e Descrições
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/historico"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              Histórico
            </Link>
            <Link
              to="/configuracoes"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              Configurações
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Gerador de Títulos e Descrições com IA
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-base sm:text-lg">
            Crie títulos e descrições de produtos atraentes sem esforço com inteligência artificial.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Card Formulário */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col min-h-[420px] transition-shadow duration-300 hover:shadow-cardHover"
          >
            <div className="px-6 py-5 border-b border-gray-100 border-l-4 border-l-primary-500">
              <h3 className="text-lg font-semibold text-gray-900">Parâmetros</h3>
              <p className="text-sm text-gray-500 mt-0.5">Preencha para gerar com IA</p>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 p-6 gap-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Categoria
                </label>
                <select
                  className="input-main w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all text-sm"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="">Selecione a categoria</option>
                  {categorias.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
                {categoria === "Outros" && (
                  <input
                    type="text"
                    className="input-main mt-2 w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    placeholder="Digite a nova categoria"
                    value={outraCategoria}
                    onChange={(e) => setOutraCategoria(e.target.value)}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Material
                </label>
                <input
                  className="input-main w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                  placeholder="Material (opcional)"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Tom
                </label>
                <select
                  className="input-main w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                  value={tom}
                  onChange={(e) => setTom(e.target.value)}
                >
                  <option value="">Selecione o tom</option>
                  {tons.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-h-0">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Benefícios
                </label>
                <textarea
                  className="input-main w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
                  placeholder="Descreva os benefícios do produto..."
                  value={beneficios}
                  onChange={(e) => setBeneficios(e.target.value)}
                  rows={3}
                />
              </div>
              <button
                type="submit"
                disabled={gerando}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:from-primary-500 hover:to-primary-600 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                {gerando ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gerando...
                  </>
                ) : (
                  "Gerar com IA"
                )}
              </button>
            </form>
          </motion.div>

          {/* Card Resultado */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col min-h-[420px] transition-shadow duration-300 hover:shadow-cardHover"
          >
            <div className="px-6 py-5 border-b border-gray-100 border-l-4 border-l-emerald-500">
              <h3 className="text-lg font-semibold text-gray-900">Resultado</h3>
              <p className="text-sm text-gray-500 mt-0.5">Título e descrição gerados</p>
            </div>
            <div className="flex-1 p-6 flex flex-col min-h-0 overflow-hidden">
              {itemSelecionado ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-3 leading-tight text-center">
                    {itemSelecionado.titulo}
                  </h2>
                  <div className="flex-1 overflow-y-auto min-h-0 mb-6 text-left">
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {itemSelecionado.descricao}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center flex-shrink-0">
                    <button
                      onClick={salvar}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                    <button
                      onClick={exportar}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" />
                      Exportar
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 mx-2">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mx-auto mb-4 text-primary-600">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 text-center max-w-[200px]">
                    Gere um conteúdo ou selecione um item do histórico
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Card Histórico */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col min-h-[420px] transition-shadow duration-300 hover:shadow-cardHover"
          >
            <div className="px-6 py-5 border-b border-gray-100 border-l-4 border-l-amber-500 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Histórico</h3>
              <p className="text-sm text-gray-500 mt-0.5">Suas gerações anteriores</p>
            </div>
            <ul className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {historico.length === 0 ? (
                <li className="text-center py-8 text-gray-400 text-sm">
                  Nenhum item no histórico ainda.
                </li>
              ) : (
                historico.map((item) => (
                  <motion.li
                    key={item.id}
                    whileHover={{ scale: 1.01 }}
                    className="group cursor-pointer px-4 py-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 hover:border-l-4 hover:border-l-primary-400 transition-all flex justify-between items-center gap-2"
                    onClick={() =>
                      setItemSelecionado({
                        titulo: item.titulo,
                        descricao: item.descricao,
                      })
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {item.titulo}
                      </p>
                      <p className="text-xs text-gray-500">Gerado por IA</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <ArrowRight className="w-4 h-4 text-primary-500" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletar(item.id);
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.li>
                ))
              )}
            </ul>
          </motion.div>
        </div>

        {/* Badge IA no rodapé */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 flex flex-col items-center gap-4"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 shadow-sm text-gray-600 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-primary-500" />
            Gerador com Inteligência Artificial
          </div>
          <p className="text-gray-500 text-sm">
            Feito por{" "}
            <a
              href="https://www.instagram.com/carlosviinicius__/?hl=pt-br"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
            >
              Carlos Vinicius
            </a>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function ComingSoon() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-surface-50 to-gray-100/80 p-6 font-sans">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center text-4xl mx-auto mb-6">
          🚧
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Em breve</h1>
        <p className="text-gray-600 mb-8 max-w-sm">
          Esta página está em construção. Em breve você terá acesso a mais funcionalidades.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all active:scale-[0.98]"
        >
          Voltar para a Página Inicial
        </button>
      </div>
    </div>
  );
}

export default App;
