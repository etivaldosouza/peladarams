import { useState, useEffect, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { parseSorteio, type Sorteio } from "@/lib/sorteio";
import qrCodePix from "@/assets/qrcode-pix.jpg";

const PIX_KEY = "c760db6d-2bfe-4228-b2e4-8d35d99510d4";
const WHATSAPP_NUMBER = "5598981986302";
const STORAGE_KEY = "jogador_id";


interface Jogador {
  id: string;
  nome: string;
  status: "pendente" | "pago";
  criado_em: string;
  dispositivo_id?: string | null;
  telefone?: string | null;
}

const Index = () => {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [dataPelada, setDataPelada] = useState("A definir");
  const [horarioPelada, setHorarioPelada] = useState("20h");
  const [localPelada, setLocalPelada] = useState("");
  const [maxJogadores, setMaxJogadores] = useState(21);
  const [sorteio, setSorteio] = useState<Sorteio | null>(null);
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

  const aplicarConfig = useCallback((config: { chave: string; valor: string }[]) => {
    for (const c of config) {
      if (c.chave === "data_pelada") setDataPelada(c.valor);
      if (c.chave === "horario_pelada") setHorarioPelada(c.valor);
      if (c.chave === "local_pelada") setLocalPelada(c.valor);
      if (c.chave === "valor_jogador") setValorJogador(Number(c.valor));
      if (c.chave === "cadastro_aberto") setCadastroAberto(c.valor === "true");
      if (c.chave === "max_jogadores") setMaxJogadores(Number(c.valor) || 21);
      if (c.chave === "sorteio_atual") setSorteio(parseSorteio(c.valor));
    }
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      const { data: players } = await supabase
        .from("jogadores_public")
        .select("*")
        .order("criado_em", { ascending: true });
      if (players) {
        const typed = players as Jogador[];
        setJogadores(typed);
        verificarInscricao(typed);
      }

      const { data: config } = await supabase.from("pelada_config").select("*");
      if (config) aplicarConfig(config);

      setCarregando(false);
    };
    fetchData();
  }, [verificarInscricao, aplicarConfig]);

  useEffect(() => {
    const channel = supabase
      .channel("public-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jogadores" }, () => {
        supabase.from("jogadores_public").select("*").order("criado_em", { ascending: true }).then(({ data }) => {
          if (data) {
            const typed = data as Jogador[];
            setJogadores(typed);
            verificarInscricao(typed);
          }
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pelada_config" }, () => {
        supabase.from("pelada_config").select("*").then(({ data }) => {
          if (data) aplicarConfig(data);
        });
      })

      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [verificarInscricao, aplicarConfig]);

  const vagasRestantes = maxJogadores - jogadores.length;
  const porcentagemOcupada = (jogadores.length / maxJogadores) * 100;

  const addPlayer = useCallback(async () => {
    const trimmed = nome.trim();
    const telefoneTrim = telefone.trim();
    const telefoneDigits = telefoneTrim.replace(/\D/g, "");
    if (!trimmed) return;

    if (!telefoneTrim) {
      setMensagem({ tipo: "erro", texto: "Informe seu telefone para confirmar a inscrição." });
      return;
    }

    if (telefoneDigits.length < 10 || telefoneDigits.length > 13) {
      setMensagem({ tipo: "erro", texto: "Telefone inválido. Use DDD + número (ex: 98 98198-6302)." });
      return;
    }

    if (meuJogador) {
      setMensagem({ tipo: "erro", texto: "Você já está inscrito nesta pelada!" });
      return;
    }

    if (jogadores.length >= maxJogadores) {
      setMensagem({ tipo: "erro", texto: "Lista cheia! Não há mais vagas." });
      return;
    }

    const nomeExiste = jogadores.some(
      (j) => j.nome.toLowerCase() === trimmed.toLowerCase()
    );
    if (nomeExiste) {
      setMensagem({ tipo: "erro", texto: "Esse nome já está na lista!" });
      return;
    }

    const dispositivoId = getDispositivoId();

    const { data: existing } = await supabase
      .from("jogadores_public")
      .select("id")
      .eq("dispositivo_id", dispositivoId)
      .maybeSingle();

    if (existing) {
      setMensagem({ tipo: "erro", texto: "Você já está inscrito nesta pelada!" });
      return;
    }

    const tempId = crypto.randomUUID();
    const novoJogador: Jogador = { id: tempId, nome: trimmed, status: "pendente", criado_em: new Date().toISOString(), dispositivo_id: dispositivoId, telefone: telefoneTrim };
    setJogadores((prev) => [...prev, novoJogador]);
    setMeuJogador(novoJogador);
    setNome("");
    setTelefone("");
    setErro("");

    const { error } = await supabase.from("jogadores").insert({ nome: trimmed, dispositivo_id: dispositivoId, telefone: telefoneTrim });
    if (error) {
      setJogadores((prev) => prev.filter((j) => j.id !== tempId));
      setMeuJogador(null);
      const err = error as { code?: string; message?: string };
      const isDup = err.code === "23505" || /duplicate|unique/i.test(err.message || "");
      const isPhone = /telefone/i.test(err.message || "");
      const msg = isDup
        ? (isPhone ? "Este telefone já está cadastrado em outra inscrição." : "Você já está inscrito nesta pelada!")
        : "Erro ao cadastrar. Tente novamente.";
      setMensagem({ tipo: "erro", texto: msg });
      return;
    }
    setMensagem({ tipo: "sucesso", texto: `Você está na lista como ${trimmed}! Sua inscrição será confirmada apenas após o pagamento. Não esqueça de enviar o comprovante do Pix via WhatsApp.` });
  }, [nome, telefone, jogadores, meuJogador, maxJogadores, getDispositivoId]);

  const sairDaLista = useCallback(async () => {
    if (!meuJogador) return;

    const jogadorId = meuJogador.id;
    const dispositivoId = localStorage.getItem(STORAGE_KEY) || "";
    setJogadores((prev) => prev.filter((j) => j.id !== jogadorId));
    setMeuJogador(null);

    const { error } = await supabase.rpc("delete_my_registration", { p_device_id: dispositivoId });
    if (error) {
      const { data } = await supabase.from("jogadores_public").select("*").order("criado_em", { ascending: true });
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-[3px] border-primary/20" />
            <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header
        className="relative overflow-hidden px-4 pt-12 pb-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          className="absolute -top-24 -right-16 h-72 w-72 rounded-full opacity-20 blur-2xl"
          style={{ background: "radial-gradient(circle, hsl(160 84% 45%), transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 backdrop-blur-sm">
              <span className="text-xl">⚽</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold leading-tight">Pelada da Semana</h1>
              {localPelada && (
                <p className="truncate text-xs font-medium text-primary-foreground/60">📍 {localPelada}</p>
              )}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2.5">
            {[
              { icon: "📅", value: dataPelada, label: "Data" },
              { icon: "⏰", value: horarioPelada, label: "Horário" },
              {
                icon: "🎯",
                value: vagasRestantes > 0 ? `${vagasRestantes} vaga${vagasRestantes !== 1 ? "s" : ""}` : "Lotado",
                label: "Restantes",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.07] px-3 py-3 backdrop-blur-md transition-colors duration-300 hover:bg-primary-foreground/[0.12]"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/50">
                  {item.label}
                </div>
                <div className="mt-1.5 font-display text-sm font-semibold leading-tight">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between text-xs font-medium text-primary-foreground/60">
              <span>Confirmados</span>
              <span className="font-display font-semibold text-primary-foreground tabular-nums">
                {jogadores.length}/{maxJogadores}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${porcentagemOcupada}%`,
                  background:
                    porcentagemOcupada >= 100
                      ? "linear-gradient(90deg, hsl(0 72% 51%), hsl(0 72% 62%))"
                      : "linear-gradient(90deg, hsl(160 84% 40%), hsl(160 70% 58%))",
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-16 max-w-lg space-y-4 px-4 pb-6 relative z-10">
        {/* Aviso de lista completa */}
        {vagasRestantes <= 0 && (
          <div className="animate-scale-in flex items-start gap-3 rounded-3xl border border-destructive/20 bg-destructive/5 p-4">
            <span className="text-2xl leading-none">🚫</span>
            <div>
              <p className="font-display text-sm font-bold text-destructive">Lista completa!</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Já são {maxJogadores} jogadores inscritos. As inscrições estão encerradas para esta pelada — fique atento à próxima rodada.
              </p>
            </div>
          </div>
        )}

        {/* Cadastro */}
        <section className="animate-slide-up card-surface p-6">

          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10">
              <span className="text-lg">📋</span>
            </div>
            <h2 className="font-display text-base font-semibold text-foreground">Cadastro</h2>
          </div>

          {!cadastroAberto ? (
            <div className="text-center py-6 rounded-xl bg-destructive/5 border border-destructive/10">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-3">
                <span className="text-xl">🔒</span>
              </div>
              <p className="text-sm font-bold text-destructive">Cadastro fechado</p>
              <p className="text-xs text-muted-foreground mt-1">Aguarde o administrador liberar.</p>
            </div>
          ) : meuJogador ? (
            <div className="text-center py-5 space-y-4">
              <div className="rounded-xl p-5 bg-primary/5 border border-primary/15">
                <div className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-primary/10 mb-2">
                  <span className="text-xl">✅</span>
                </div>
                <p className="text-sm font-bold text-primary">
                  Inscrito como <span className="underline decoration-primary/30 underline-offset-2">{meuJogador.nome}</span>
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="rounded-xl border border-destructive/20 px-6 py-2.5 text-sm font-semibold text-destructive transition-all duration-200 hover:bg-destructive/5 hover:border-destructive/30 active:scale-95"
                  >
                    ❌ Cancelar inscrição
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar inscrição?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja cancelar sua inscrição na pelada? Você poderá se inscrever novamente se houver vagas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Não, manter</AlertDialogCancel>
                    <AlertDialogAction onClick={sairDaLista} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sim, cancelar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                  placeholder="Digite seu nome..."
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-ring/50 focus:border-primary placeholder:text-muted-foreground/60"
                  maxLength={30}
                  disabled={jogadores.length >= maxJogadores}
                />
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                  type="tel"
                  inputMode="tel"
                  placeholder="Telefone (obrigatório) – ex: 98 98198-6302"
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-ring/50 focus:border-primary placeholder:text-muted-foreground/60"
                  maxLength={20}
                  disabled={jogadores.length >= maxJogadores}
                />
                <button
                  onClick={addPlayer}
                  disabled={!nome.trim() || !telefone.trim() || jogadores.length >= maxJogadores}
                  className="w-full rounded-xl px-6 py-3 text-sm font-bold text-primary-foreground bg-primary shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110 disabled:opacity-40 disabled:shadow-none active:scale-95"
                >
                  Entrar na lista
                </button>
              </div>
              {erro && (
                <div className="mt-3 rounded-xl bg-destructive/5 border border-destructive/10 px-4 py-2.5 animate-scale-in">
                  <p className="text-sm font-medium text-destructive">{erro}</p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Pix */}
        <section className="animate-slide-up card-surface p-6 transition-shadow duration-300 hover:shadow-elevated" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent/15">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">Pagamento via Pix</h2>
              <p className="text-xs text-muted-foreground">R$ {valorJogador},00 por jogador</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-muted/50 border p-3">
            <code className="flex-1 truncate text-xs font-mono text-muted-foreground">{PIX_KEY}</code>
            <button
              onClick={copyPix}
              className="shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-all duration-200 hover:shadow hover:brightness-110 active:scale-95"
            >
              {copiado ? "✅ Copiado!" : "📋 Copiar"}
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="rounded-2xl border-2 border-border p-1.5 bg-card shadow-sm">
              <img src={qrCodePix} alt="QR Code Pix" className="h-44 w-44 rounded-xl" />
            </div>
          </div>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110 active:scale-95"
            style={{ background: "linear-gradient(135deg, hsl(142 70% 36%), hsl(142 70% 44%))" }}
          >
            📱 Enviar comprovante via WhatsApp
          </a>
        </section>

        {/* Times da Pelada */}
        {sorteio && (
          <section className="animate-slide-up card-surface p-6 transition-shadow duration-300 hover:shadow-elevated" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10">
                <span className="text-lg">⚽</span>
              </div>
              <h2 className="font-display text-base font-semibold text-foreground">Times da Pelada</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {sorteio.times.map((t) => (
                <div
                  key={t.nome}
                  className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md"
                  style={{ borderColor: `hsl(${t.cor ?? "142 72% 29%"} / 0.35)` }}
                >
                  <div
                    className="flex items-center gap-2 px-4 py-2.5"
                    style={{ background: `hsl(${t.cor ?? "142 72% 29%"} / 0.12)` }}
                  >
                    <span
                      className="h-4 w-4 rounded-full ring-2 ring-background shrink-0"
                      style={{ background: `hsl(${t.cor ?? "142 72% 29%"})` }}
                    />
                    <h3 className="text-sm font-extrabold tracking-wide text-foreground">{t.nome}</h3>
                  </div>
                  <ul className="space-y-1.5 p-4">
                    {t.goleiro && (
                      <li className="flex items-center gap-2 text-sm font-bold text-primary">
                        <span>🧤</span>
                        <span className="truncate">{t.goleiro}</span>
                      </li>
                    )}
                    {t.jogadores.map((j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        <span className="truncate">{j}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>


            <div className="mt-4 space-y-2">
              <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent-foreground/70">🔥 Primeiro jogo</p>
                <p className="mt-1 text-sm font-extrabold text-foreground">
                  {sorteio.times[sorteio.primeiroJogo[0]].nome} × {sorteio.times[sorteio.primeiroJogo[1]].nome}
                </p>
              </div>
              {sorteio.aguarda.length > 0 && (
                <div className="rounded-xl border bg-muted/30 p-3 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">
                    ⏳ Aguarda: {sorteio.aguarda.map((i) => sorteio.times[i].nome).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Jogadores */}

        <section className="animate-slide-up card-surface p-6 transition-shadow duration-300 hover:shadow-elevated" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10">
                <span className="text-lg">⚽</span>
              </div>
              <h2 className="font-display text-base font-semibold text-foreground">Jogadores</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary tabular-nums">
              {jogadores.length}/{maxJogadores}
            </span>
          </div>

          {jogadores.length === 0 ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-3">
                <span className="text-2xl">🏟️</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">Nenhum jogador confirmado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedJogadores.map((j, index) => (
                <div
                  key={j.id}
                  className="animate-fade-in flex items-center justify-between rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm group"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: j.status === "pago" ? "hsl(142 72% 29%)" : "hsl(48 96% 53%)",
                    background: j.status === "pago" ? "hsl(142 72% 29% / 0.03)" : "hsl(var(--card))",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-bold text-muted-foreground tabular-nums shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-sm truncate text-foreground">{j.nome}</span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0"
                    style={{
                      background: j.status === "pago" ? "hsl(142 72% 29% / 0.1)" : "hsl(48 96% 53% / 0.12)",
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
      </main>


      <footer className="mt-4 pb-8 text-center">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-2xl bg-muted/30 border px-5 py-3.5">
            <p className="text-xs text-muted-foreground">
              Feito por <strong className="font-semibold text-foreground">Etivaldo</strong> · Mantido por <strong className="font-semibold text-foreground">Display Tecnologia</strong>
            </p>
          </div>
        </div>
      </footer>

      <AlertDialog open={!!mensagem} onOpenChange={(o) => !o && setMensagem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {mensagem?.tipo === "sucesso" ? "✅ Inscrição confirmada" : "⚠️ Atenção"}
            </AlertDialogTitle>
            <AlertDialogDescription>{mensagem?.texto}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setMensagem(null)}>OK, entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
