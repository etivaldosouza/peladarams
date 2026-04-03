import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import qrCodePix from "@/assets/qrcode-pix.jpg";

const PIX_KEY = "c760db6d-2bfe-4228-b2e4-8d35d99510d4";
const MAX_JOGADORES = 18;
const WHATSAPP_NUMBER = "5598981986302";

interface Jogador {
  id: string;
  nome: string;
  status: "pendente" | "pago";
  criado_em: string;
}

const Index = () => {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [nome, setNome] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");
  const [dataPelada, setDataPelada] = useState("A definir");
  const [valorJogador, setValorJogador] = useState(10);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      const { data: players } = await supabase
        .from("jogadores")
        .select("*")
        .order("criado_em", { ascending: true });
      if (players) setJogadores(players as Jogador[]);

      const { data: config } = await supabase.from("pelada_config").select("*");
      if (config) {
        for (const c of config) {
          if (c.chave === "data_pelada") setDataPelada(c.valor);
          if (c.chave === "valor_campo") setValorCampo(Number(c.valor));
          if (c.chave === "valor_jogador") setValorJogador(Number(c.valor));
        }
      }
    };
    fetchData();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("public-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jogadores" }, () => {
        supabase.from("jogadores").select("*").order("criado_em", { ascending: true }).then(({ data }) => {
          if (data) setJogadores(data as Jogador[]);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pelada_config" }, () => {
        supabase.from("pelada_config").select("*").then(({ data }) => {
          if (data) {
            for (const c of data) {
              if (c.chave === "data_pelada") setDataPelada(c.valor);
              if (c.chave === "valor_campo") setValorCampo(Number(c.valor));
              if (c.chave === "valor_jogador") setValorJogador(Number(c.valor));
              if (c.chave === "ajuste_saldo") setAjusteSaldo(Number(c.valor));
            }
          }
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const [ajusteSaldo, setAjusteSaldo] = useState(0);

  // Load ajuste_saldo from config
  useEffect(() => {
    const fetchAjuste = async () => {
      const { data } = await supabase.from("pelada_config").select("*").eq("chave", "ajuste_saldo");
      if (data && data.length > 0) setAjusteSaldo(Number(data[0].valor));
    };
    fetchAjuste();
  }, []);

  const vagasRestantes = MAX_JOGADORES - jogadores.length;
  const totalArrecadado = jogadores.filter((j) => j.status === "pago").length * valorJogador;
  const saldo = totalArrecadado - valorCampo + ajusteSaldo;

  const addPlayer = useCallback(async () => {
    const trimmed = nome.trim();
    if (!trimmed) return;

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

    // Optimistic update
    const tempId = crypto.randomUUID();
    const novoJogador: Jogador = { id: tempId, nome: trimmed, status: "pendente", criado_em: new Date().toISOString() };
    setJogadores((prev) => [...prev, novoJogador]);
    setNome("");
    setErro("");

    const { error } = await supabase.from("jogadores").insert({ nome: trimmed });
    if (error) {
      setJogadores((prev) => prev.filter((j) => j.id !== tempId));
      setErro("Erro ao cadastrar. Tente novamente.");
      setTimeout(() => setErro(""), 3000);
    }
  }, [nome, jogadores]);

  const copyPix = async () => {
    await navigator.clipboard.writeText(PIX_KEY);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Segue meu comprovante de pagamento da pelada.")}`;

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
              {jogadores.map((j) => (
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
