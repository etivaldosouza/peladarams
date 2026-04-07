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

  // Get or create device ID
  const getDispositivoId = useCallback(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  }, []);

  // Check if current device already has a registered player
  const verificarInscricao = useCallback((players: Jogador[]) => {
    const dispositivoId = localStorage.getItem(STORAGE_KEY);
    if (dispositivoId) {
      const encontrado = players.find((j) => j.dispositivo_id === dispositivoId);
      setMeuJogador(encontrado || null);
    } else {
      setMeuJogador(null);
    }
  }, []);

  // Load initial data
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

  // Realtime subscriptions
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

    // Check server-side if device already registered
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

    // Optimistic update
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
    // Optimistic
    setJogadores((prev) => prev.filter((j) => j.id !== jogadorId));
    setMeuJogador(null);

    const { error } = await supabase.from("jogadores").delete().eq("dispositivo_id", localStorage.getItem(STORAGE_KEY) || "");
    if (error) {
      // Revert on failure - refetch
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

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(120 20% 96%)" }}>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: "hsl(120 20% 96%)" }}>
      <header
        className="px-4 py-6 text-center text-primary-foreground"
        style={{ background: "linear-gradient(135deg, hsl(142 72% 25%), hsl(142 72% 35%))" }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Pelada da Semana ⚽</h1>
        <div className="mt-4 grid grid-cols-3 gap-3 max-w-sm mx-auto">
          <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
            <div className="text-lg">📅</div>
            <div className="text-sm font-bold leading-tight">{dataPelada}</div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">Data</div>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
            <div className="text-lg">⏰</div>
            <div className="text-sm font-bold">20h</div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">Horário</div>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
            <div className="text-lg">🎯</div>
            <div className="text-sm font-bold">
              {vagasRestantes > 0 ? `${vagasRestantes} vaga${vagasRestantes !== 1 ? "s" : ""}` : "Lotado!"}
            </div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">Restantes</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {/* Cadastro */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">📋 Cadastro</h2>
          {!cadastroAberto ? (
            <div className="text-center py-4">
              <p className="text-sm font-medium" style={{ color: "hsl(0 84% 60%)" }}>🔒 Cadastro fechado no momento.</p>
              <p className="text-xs text-muted-foreground mt-1">Aguarde o administrador liberar as inscrições.</p>
            </div>
          ) : meuJogador ? (
            <div className="text-center py-3 space-y-3">
              <div className="rounded-lg p-3" style={{ background: "hsl(142 72% 29% / 0.08)", border: "1px solid hsl(142 72% 29% / 0.2)" }}>
                <p className="text-sm font-medium" style={{ color: "hsl(142 72% 29%)" }}>
                  ✅ Você está inscrito como <strong>{meuJogador.nome}</strong>
                </p>
              </div>
              <button
                onClick={sairDaLista}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                style={{ color: "hsl(0 84% 60%)", borderColor: "hsl(0 84% 60% / 0.3)" }}
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
                  placeholder="Seu nome"
                  className="flex-1 rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  maxLength={30}
                  disabled={jogadores.length >= MAX_JOGADORES}
                />
                <button
                  onClick={addPlayer}
                  disabled={!nome.trim() || jogadores.length >= MAX_JOGADORES}
                  className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
                  style={{ background: "hsl(142 72% 29%)" }}
                >
                  Confirmar
                </button>
              </div>
              {erro && (
                <p className="mt-2 text-sm font-medium animate-fade-in" style={{ color: "hsl(0 84% 60%)" }}>
                  {erro}
                </p>
              )}
            </>
          )}
        </section>

        {/* Pix */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">💰 Pagamento via Pix</h2>
          <p className="mb-1 text-sm text-muted-foreground">Valor por jogador: <strong className="text-foreground">R$ {valorJogador},00</strong></p>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted p-3">
            <code className="flex-1 truncate text-xs font-mono">{PIX_KEY}</code>
            <button
              onClick={copyPix}
              className="shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
            >
              {copiado ? "✅ Copiado!" : "Copiar"}
            </button>
          </div>
          <div className="mt-3 flex justify-center">
            <img src={qrCodePix} alt="QR Code Pix" className="h-48 w-48 rounded-lg border" />
          </div>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "hsl(142 70% 40%)" }}
          >
            📱 Enviar comprovante via WhatsApp
          </a>
        </section>

        {/* Jogadores */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">
            ✅ Jogadores ({jogadores.length}/{MAX_JOGADORES})
          </h2>
          {jogadores.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhum jogador confirmado ainda.</p>
          ) : (
            <div className="space-y-2">
              {[...jogadores].sort((a, b) => (a.status === "pago" ? -1 : 1) - (b.status === "pago" ? -1 : 1)).map((j) => (
                <div
                  key={j.id}
                  className="animate-fade-in flex items-center justify-between rounded-lg border p-3"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: j.status === "pago" ? "hsl(142 72% 29%)" : "hsl(48 96% 53%)",
                    background: j.status === "pago" ? "hsl(142 72% 29% / 0.06)" : "hsl(0 0% 100%)",
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">⚽</span>
                    <span className="font-medium truncate">{j.nome}</span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: j.status === "pago" ? "hsl(142 72% 29% / 0.15)" : "hsl(48 96% 53% / 0.2)",
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

      <footer className="mt-8 pb-4 text-center text-xs text-muted-foreground">
        Feito por <strong className="font-semibold text-foreground">Etivaldo</strong> e mantido por <strong className="font-semibold text-foreground">Display Tecnologia</strong>
      </footer>
    </div>
  );
};

export default Index;
