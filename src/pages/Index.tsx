import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import qrCodePix from "@/assets/qrcode-pix.jpg";

const PIX_KEY = "c760db6d-2bfe-4228-b2e4-8d35d99510d4";
const MAX_JOGADORES = 18;
const WHATSAPP_NUMBER = "5598981986302";
const STORAGE_KEY = "jogador_id";

interface Jogador {
  id: string;
  nome: string;
  status: "pendente" | "pago";
  criado_em: string;
  dispositivo_id?: string | null;
}

const Index = () => {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [nome, setNome] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");
  const [dataPelada, setDataPelada] = useState("A definir");
  const [valorJogador, setValorJogador] = useState(10);
  const [cadastroAberto, setCadastroAberto] = useState(true);
  const [meuJogador, setMeuJogador] = useState<Jogador | null>(null);
  const [carregando, setCarregando] = useState(true);

  const getDispositivoId = useCallback(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  }, []);

  const verificarInscricao = useCallback((players: Jogador[]) => {
    const dispositivoId = localStorage.getItem(STORAGE_KEY);
    if (dispositivoId) {
      const encontrado = players.find((j) => j.dispositivo_id === dispositivoId);
      setMeuJogador(encontrado || null);
    } else {
      setMeuJogador(null);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: players } = await supabase
        .from("jogadores")
        .select("*")
        .order("criado_em", { ascending: true });
      if (players) {
        const typed = players as Jogador[];
        setJogadores(typed);
        verificarInscricao(typed);
      }

      const { data: config } = await supabase.from("pelada_config").select("*");
      if (config) {
        for (const c of config) {
          if (c.chave === "data_pelada") setDataPelada(c.valor);
          if (c.chave === "valor_jogador") setValorJogador(Number(c.valor));
          if (c.chave === "cadastro_aberto") setCadastroAberto(c.valor === "true");
        }
      }
      setCarregando(false);
    };
    fetchData();
  }, [verificarInscricao]);

  useEffect(() => {
    const channel = supabase
      .channel("public-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jogadores" }, () => {
        supabase.from("jogadores").select("*").order("criado_em", { ascending: true }).then(({ data }) => {
          if (data) {
            const typed = data as Jogador[];
            setJogadores(typed);
            verificarInscricao(typed);
          }
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pelada_config" }, () => {
        supabase.from("pelada_config").select("*").then(({ data }) => {
          if (data) {
            for (const c of data) {
              if (c.chave === "data_pelada") setDataPelada(c.valor);
              if (c.chave === "valor_jogador") setValorJogador(Number(c.valor));
              if (c.chave === "cadastro_aberto") setCadastroAberto(c.valor === "true");
            }
          }
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [verificarInscricao]);

  const vagasRestantes = MAX_JOGADORES - jogadores.length;
  const porcentagemOcupada = (jogadores.length / MAX_JOGADORES) * 100;

  const addPlayer = useCallback(async () => {
    const trimmed = nome.trim();
    if (!trimmed) return;

    if (meuJogador) {
      setErro("Você já está inscrito nesta pelada!");
      setTimeout(() => setErro(""), 3000);
      return;
    }

    if (jogadores.length >= MAX_JOGADORES) {
      setErro("Lista cheia! Não há mais vagas.");
      setTimeout(() => setErro(""), 3000);
      return;
    }

    const nomeExiste = jogadores.some(
      (j) => j.nome.toLowerCase() === trimmed.toLowerCase()
    );
    if (nomeExiste) {
      setErro("Esse nome já está na lista!");
      setTimeout(() => setErro(""), 3000);
      return;
    }

    const dispositivoId = getDispositivoId();

    const { data: existing } = await supabase
      .from("jogadores")
      .select("id")
      .eq("dispositivo_id", dispositivoId)
      .maybeSingle();

    if (existing) {
      setErro("Você já está inscrito nesta pelada!");
      setTimeout(() => setErro(""), 3000);
      return;
    }

    const tempId = crypto.randomUUID();
    const novoJogador: Jogador = { id: tempId, nome: trimmed, status: "pendente", criado_em: new Date().toISOString(), dispositivo_id: dispositivoId };
    setJogadores((prev) => [...prev, novoJogador]);
    setMeuJogador(novoJogador);
    setNome("");
    setErro("");

    const { error } = await supabase.from("jogadores").insert({ nome: trimmed, dispositivo_id: dispositivoId });
    if (error) {
      setJogadores((prev) => prev.filter((j) => j.id !== tempId));
      setMeuJogador(null);
      setErro("Erro ao cadastrar. Tente novamente.");
      setTimeout(() => setErro(""), 3000);
    }
  }, [nome, jogadores, meuJogador, getDispositivoId]);

  const sairDaLista = useCallback(async () => {
    if (!meuJogador) return;

    const jogadorId = meuJogador.id;
    setJogadores((prev) => prev.filter((j) => j.id !== jogadorId));
    setMeuJogador(null);

    const { error } = await supabase.from("jogadores").delete().eq("dispositivo_id", localStorage.getItem(STORAGE_KEY) || "");
    if (error) {
      const { data } = await supabase.from("jogadores").select("*").order("criado_em", { ascending: true });
      if (data) {
        const typed = data as Jogador[];
        setJogadores(typed);
        verificarInscricao(typed);
      }
    }
  }, [meuJogador, verificarInscricao]);

  const copyPix = async () => {
    await navigator.clipboard.writeText(PIX_KEY);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Segue meu comprovante de pagamento da pelada.")}`;

  const sortedJogadores = [...jogadores].sort((a, b) => {
    if (a.status === "pago" && b.status !== "pago") return -1;
    if (a.status !== "pago" && b.status === "pago") return 1;
    return 0;
  });

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden px-4 py-8 text-center text-primary-foreground"
        style={{ background: "linear-gradient(135deg, hsl(142 72% 22%), hsl(142 72% 32%), hsl(142 50% 38%))" }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }}
        />
        <div className="relative">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pelada da Semana</h1>
          <p className="text-sm opacity-80 mt-1">Organize, jogue e se divirta!</p>

          <div className="mt-5 grid grid-cols-3 gap-3 max-w-sm mx-auto">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md px-3 py-3 border border-white/20 transition-transform hover:scale-105">
              <div className="text-xl mb-1">📅</div>
              <div className="text-sm font-bold leading-tight">{dataPelada}</div>
              <div className="text-[10px] opacity-60 uppercase tracking-widest mt-0.5">Data</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md px-3 py-3 border border-white/20 transition-transform hover:scale-105">
              <div className="text-xl mb-1">⏰</div>
              <div className="text-sm font-bold">20h</div>
              <div className="text-[10px] opacity-60 uppercase tracking-widest mt-0.5">Horário</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md px-3 py-3 border border-white/20 transition-transform hover:scale-105">
              <div className="text-xl mb-1">🎯</div>
              <div className="text-sm font-bold">
                {vagasRestantes > 0 ? `${vagasRestantes} vaga${vagasRestantes !== 1 ? "s" : ""}` : "Lotado!"}
              </div>
              <div className="text-[10px] opacity-60 uppercase tracking-widest mt-0.5">Restantes</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 max-w-sm mx-auto">
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${porcentagemOcupada}%`, background: porcentagemOcupada >= 100 ? "hsl(0 84% 65%)" : "hsl(48 96% 60%)" }}
              />
            </div>
            <p className="text-[10px] opacity-60 mt-1">{jogadores.length}/{MAX_JOGADORES} confirmados</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-5">
        {/* Cadastro */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <span className="text-base">📋</span>
            </div>
            <h2 className="text-base font-bold">Cadastro</h2>
          </div>
          {!cadastroAberto ? (
            <div className="text-center py-5 rounded-xl bg-destructive/5 border border-destructive/10">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-sm font-semibold text-destructive">Cadastro fechado</p>
              <p className="text-xs text-muted-foreground mt-1">Aguarde o administrador liberar.</p>
            </div>
          ) : meuJogador ? (
            <div className="text-center py-4 space-y-3">
              <div className="rounded-xl p-4 bg-primary/5 border border-primary/15">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-sm font-semibold text-primary">
                  Inscrito como <strong>{meuJogador.nome}</strong>
                </p>
              </div>
              <button
                onClick={sairDaLista}
                className="rounded-xl border border-destructive/20 px-5 py-2.5 text-sm font-semibold text-destructive transition-all hover:bg-destructive/5 active:scale-95"
              >
                🚪 Sair da lista
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                  placeholder="Digite seu nome..."
                  className="flex-1 rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring focus:border-primary"
                  maxLength={30}
                  disabled={jogadores.length >= MAX_JOGADORES}
                />
                <button
                  onClick={addPlayer}
                  disabled={!nome.trim() || jogadores.length >= MAX_JOGADORES}
                  className="shrink-0 rounded-xl px-5 py-3 text-sm font-bold text-primary-foreground bg-primary transition-all hover:opacity-90 disabled:opacity-40 active:scale-95"
                >
                  Entrar
                </button>
              </div>
              {erro && (
                <div className="mt-3 rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2 animate-fade-in">
                  <p className="text-sm font-medium text-destructive">{erro}</p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Pix */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <span className="text-base">💰</span>
            </div>
            <div>
              <h2 className="text-base font-bold">Pagamento via Pix</h2>
              <p className="text-xs text-muted-foreground">R$ {valorJogador},00 por jogador</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-muted/60 border p-3">
            <code className="flex-1 truncate text-xs font-mono text-muted-foreground">{PIX_KEY}</code>
            <button
              onClick={copyPix}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            >
              {copiado ? "✅ Copiado!" : "📋 Copiar"}
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            <img src={qrCodePix} alt="QR Code Pix" className="h-44 w-44 rounded-xl border-2 border-border shadow-sm" />
          </div>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            style={{ background: "hsl(142 70% 40%)" }}
          >
            📱 Enviar comprovante via WhatsApp
          </a>
        </section>

        {/* Jogadores */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                <span className="text-base">⚽</span>
              </div>
              <h2 className="text-base font-bold">Jogadores</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {jogadores.length}/{MAX_JOGADORES}
            </span>
          </div>

          {jogadores.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🏟️</div>
              <p className="text-sm text-muted-foreground">Nenhum jogador confirmado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedJogadores.map((j, index) => (
                <div
                  key={j.id}
                  className="animate-fade-in flex items-center justify-between rounded-xl border p-3.5 transition-all hover:shadow-sm"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: j.status === "pago" ? "hsl(142 72% 29%)" : "hsl(48 96% 53%)",
                    background: j.status === "pago" ? "hsl(142 72% 29% / 0.04)" : "hsl(var(--card))",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="font-semibold truncate">{j.nome}</span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      background: j.status === "pago" ? "hsl(142 72% 29% / 0.12)" : "hsl(48 96% 53% / 0.15)",
                      color: j.status === "pago" ? "hsl(142 72% 29%)" : "hsl(30 80% 35%)",
                    }}
                  >
                    {j.status === "pago" ? "✅ Pago" : "⏳ Pendente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="mt-4 pb-6 text-center">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-2xl bg-muted/40 border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Feito por <strong className="font-semibold text-foreground">Etivaldo</strong> · Mantido por <strong className="font-semibold text-foreground">Display Tecnologia</strong>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
