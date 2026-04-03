import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_PASSWORD = "admin123";

interface Jogador {
  id: string;
  nome: string;
  status: "pendente" | "pago";
  criado_em: string;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [dataPelada, setDataPelada] = useState("A definir");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [valorCampo, setValorCampo] = useState(110);
  const [valorJogador, setValorJogador] = useState(10);
  const [editingValores, setEditingValores] = useState(false);
  const [tempValorCampo, setTempValorCampo] = useState("110");
  const [tempValorJogador, setTempValorJogador] = useState("10");

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
          if (c.chave === "data_pelada") { setDataPelada(c.valor); }
          if (c.chave === "valor_campo") { setValorCampo(Number(c.valor)); setTempValorCampo(c.valor); }
          if (c.chave === "valor_jogador") { setValorJogador(Number(c.valor)); setTempValorJogador(c.valor); }
        }
      }
    };
    fetchData();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("admin-changes")
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
              if (c.chave === "valor_campo") { setValorCampo(Number(c.valor)); setTempValorCampo(c.valor); }
              if (c.chave === "valor_jogador") { setValorJogador(Number(c.valor)); setTempValorJogador(c.valor); }
            }
          }
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markPaid = async (id: string) => {
    setJogadores((prev) => prev.map((j) => j.id === id ? { ...j, status: "pago" as const } : j));
    await supabase.from("jogadores").update({ status: "pago" }).eq("id", id);
  };

  const markPending = async (id: string) => {
    setJogadores((prev) => prev.map((j) => j.id === id ? { ...j, status: "pendente" as const } : j));
    await supabase.from("jogadores").update({ status: "pendente" }).eq("id", id);
  };

  const removePlayer = async (id: string) => {
    setJogadores((prev) => prev.filter((j) => j.id !== id));
    await supabase.from("jogadores").delete().eq("id", id);
  };

  const clearAll = async () => {
    if (window.confirm("Tem certeza que deseja limpar toda a lista?")) {
      // Delete all rows
      const ids = jogadores.map((j) => j.id);
      if (ids.length > 0) {
        await supabase.from("jogadores").delete().in("id", ids);
      }
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, "EEEE, dd/MM", { locale: ptBR });
      const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      setDataPelada(capitalized);
      await supabase.from("pelada_config").update({ valor: capitalized }).eq("chave", "data_pelada");
      setCalendarOpen(false);
    }
  };

  const saveValores = async () => {
    const vc = Number(tempValorCampo) || 110;
    const vj = Number(tempValorJogador) || 10;
    await supabase.from("pelada_config").update({ valor: String(vc) }).eq("chave", "valor_campo");
    await supabase.from("pelada_config").update({ valor: String(vj) }).eq("chave", "valor_jogador");
    setValorCampo(vc);
    setValorJogador(vj);
    setEditingValores(false);
  };

  const totalArrecadado = jogadores.filter((j) => j.status === "pago").length * valorJogador;
  const saldo = totalArrecadado - valorCampo;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(120 20% 96%)" }}>
        <div className="rounded-xl border bg-card p-6 shadow-sm w-full max-w-sm mx-4">
          <h1 className="text-xl font-bold mb-4 text-center">🔒 Painel Admin</h1>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && password === ADMIN_PASSWORD && setIsAuthenticated(true)}
              placeholder="Senha"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => {
                if (password === ADMIN_PASSWORD) setIsAuthenticated(true);
                else setPassword("");
              }}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: "hsl(142 72% 29%)" }}
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: "hsl(120 20% 96%)" }}>
      <header
        className="px-4 py-6 text-center text-primary-foreground"
        style={{ background: "linear-gradient(135deg, hsl(0 0% 15%), hsl(0 0% 25%))" }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Painel Admin 🔧</h1>
        <p className="mt-1 text-sm opacity-90">📅 {dataPelada} — ⏰ 20h</p>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {/* Data da Pelada */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">📅 Data da Pelada</h2>
          <div className="flex items-center justify-between">
            <span className="font-medium">{dataPelada}</span>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent">
                  📅 Alterar data
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">🏦 Caixa da Pelada</h2>
            <button
              onClick={() => {
                setTempValorCampo(String(valorCampo));
                setTempValorJogador(String(valorJogador));
                setEditingValores(!editingValores);
              }}
              className="rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
            >
              ✏️ Editar valores
            </button>
          </div>
          {editingValores && (
            <div className="mb-3 space-y-2 rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium w-28">Valor campo:</label>
                <input
                  type="number"
                  value={tempValorCampo}
                  onChange={(e) => setTempValorCampo(e.target.value)}
                  className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium w-28">Valor jogador:</label>
                <input
                  type="number"
                  value={tempValorJogador}
                  onChange={(e) => setTempValorJogador(e.target.value)}
                  className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={saveValores}
                className="w-full rounded-md px-3 py-2 text-xs font-semibold text-white"
                style={{ background: "hsl(142 72% 29%)" }}
              >
                💾 Salvar valores
              </button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-bold" style={{ color: "hsl(142 72% 29%)" }}>R$ {totalArrecadado}</div>
              <div className="text-[11px] text-muted-foreground">Arrecadado</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-bold text-foreground">R$ {valorCampo}</div>
              <div className="text-[11px] text-muted-foreground">Campo</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-bold" style={{ color: saldo >= 0 ? "hsl(142 72% 29%)" : "hsl(0 84% 60%)" }}>R$ {saldo}</div>
              <div className="text-[11px] text-muted-foreground">Saldo</div>
            </div>
          </div>
        </section>

        {/* Jogadores */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">⚽ Jogadores ({jogadores.length}/18)</h2>
            {jogadores.length > 0 && (
              <button onClick={clearAll} className="text-xs text-destructive hover:underline">🗑️ Limpar</button>
            )}
          </div>
          {jogadores.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhum jogador na lista.</p>
          ) : (
            <div className="space-y-2">
              {jogadores.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: j.status === "pago" ? "hsl(142 72% 29%)" : "hsl(48 96% 53%)",
                    background: j.status === "pago" ? "hsl(142 72% 29% / 0.06)" : "hsl(0 0% 100%)",
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{j.nome}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: j.status === "pago" ? "hsl(142 72% 29% / 0.15)" : "hsl(48 96% 53% / 0.2)",
                        color: j.status === "pago" ? "hsl(142 72% 29%)" : "hsl(30 80% 35%)",
                      }}
                    >
                      {j.status === "pago" ? "✅ Pago" : "⏳ Pendente"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {j.status === "pendente" ? (
                      <button
                        onClick={() => markPaid(j.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-white"
                        style={{ background: "hsl(142 72% 29%)" }}
                      >
                        ✅ Confirmar
                      </button>
                    ) : (
                      <button
                        onClick={() => markPending(j.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium border text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ↩ Reverter
                      </button>
                    )}
                    <button
                      onClick={() => removePlayer(j.id)}
                      className="rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Admin;
