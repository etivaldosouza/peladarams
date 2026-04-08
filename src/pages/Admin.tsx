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
  const [cadastroAberto, setCadastroAberto] = useState(true);

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
          if (c.chave === "valor_campo") { setValorCampo(Number(c.valor)); setTempValorCampo(c.valor); }
          if (c.chave === "valor_jogador") { setValorJogador(Number(c.valor)); setTempValorJogador(c.valor); }
          if (c.chave === "cadastro_aberto") setCadastroAberto(c.valor === "true");
        }
      }
    };
    fetchData();
  }, []);

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
              if (c.chave === "cadastro_aberto") setCadastroAberto(c.valor === "true");
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

  const toggleCadastro = async () => {
    const newValue = !cadastroAberto;
    setCadastroAberto(newValue);
    await supabase.from("pelada_config").update({ valor: String(newValue) }).eq("chave", "cadastro_aberto");
  };

  const WHATSAPP_NUMBER = "5598981986302";
  const totalArrecadado = jogadores.filter((j) => j.status === "pago").length * valorJogador;
  const saldo = totalArrecadado - valorCampo;
  const vagasRestantes = 18 - jogadores.length;
  const pagos = jogadores.filter((j) => j.status === "pago");
  const pendentes = jogadores.filter((j) => j.status === "pendente");
  const sortedJogadores = [...jogadores].sort((a, b) => {
    if (a.status === "pago" && b.status !== "pago") return -1;
    if (a.status !== "pago" && b.status === "pago") return 1;
    return 0;
  });

  const gerarRelatorio = () => {
    let texto = `📊 *PRESTAÇÃO DE CONTAS*\n`;
    texto += `📅 ${dataPelada} | ⏰ 20h\n`;
    texto += `━━━━━━━━━━━━━━━━━━\n\n`;
    texto += `💰 *Financeiro:*\n`;
    texto += `  💵 Valor por jogador: R$ ${valorJogador}\n`;
    texto += `  ✅ Pagos: ${pagos.length} jogador(es)\n`;
    texto += `  💰 Total arrecadado: R$ ${totalArrecadado}\n`;
    texto += `  🏟️ Custo do campo: R$ ${valorCampo}\n`;
    texto += `\n  📌 *Saldo final: R$ ${saldo}*\n`;
    return texto;
  };

  const gerarRelatorioJogadores = () => {
    let texto = `📋 *RELATÓRIO DE JOGADORES*\n`;
    texto += `📅 ${dataPelada} | ⏰ 20h\n`;
    texto += `━━━━━━━━━━━━━━━━━━\n\n`;
    texto += `👥 Total: ${jogadores.length}/18\n\n`;
    if (pagos.length > 0) {
      texto += `✅ *Pagos (${pagos.length}):*\n`;
      pagos.forEach((j, i) => { texto += `  ${i + 1}. ${j.nome}\n`; });
      texto += `\n`;
    }
    if (pendentes.length > 0) {
      texto += `⏳ *Pendentes (${pendentes.length}):*\n`;
      pendentes.forEach((j, i) => { texto += `  ${i + 1}. ${j.nome}\n`; });
    }
    return texto;
  };

  const enviarRelatorioWhatsApp = () => {
    const texto = gerarRelatorio();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const enviarRelatorioJogadoresWhatsApp = () => {
    const texto = gerarRelatorioJogadores();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="rounded-2xl border bg-card p-8 shadow-lg w-full max-w-sm mx-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-3">
              <span className="text-2xl">🔒</span>
            </div>
            <h1 className="text-xl font-extrabold">Painel Admin</h1>
            <p className="text-xs text-muted-foreground mt-1">Acesso restrito ao administrador</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && password === ADMIN_PASSWORD && setIsAuthenticated(true)}
              placeholder="Digite a senha..."
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring focus:border-primary"
            />
            <button
              onClick={() => {
                if (password === ADMIN_PASSWORD) setIsAuthenticated(true);
                else setPassword("");
              }}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="relative overflow-hidden px-4 py-6 text-center text-white"
        style={{ background: "linear-gradient(135deg, hsl(0 0% 12%), hsl(0 0% 22%))" }}
      >
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 30% 70%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="relative">
          <h1 className="text-xl font-extrabold tracking-tight">Painel Admin 🔧</h1>
          <p className="text-xs opacity-60 mt-1">Gerencie sua pelada com facilidade</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-5">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
            <div className="text-lg mb-1">📅</div>
            <div className="text-xs font-bold text-foreground leading-tight">{dataPelada}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Data</div>
          </div>
          <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
            <div className="text-lg mb-1">👥</div>
            <div className="text-xs font-bold text-foreground">{jogadores.length}/18</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Jogadores</div>
          </div>
          <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
            <div className="text-lg mb-1">💰</div>
            <div className="text-xs font-bold" style={{ color: saldo >= 0 ? "hsl(142 72% 29%)" : "hsl(0 84% 60%)" }}>R$ {saldo}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Saldo</div>
          </div>
        </div>

        {/* Data da Pelada */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                <span className="text-base">📅</span>
              </div>
              <div>
                <h2 className="text-sm font-bold">Data da Pelada</h2>
                <p className="text-xs text-muted-foreground">{dataPelada}</p>
              </div>
            </div>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:bg-muted active:scale-95">
                  Alterar
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

        {/* Controle de Cadastro */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                <span className="text-base">📋</span>
              </div>
              <div>
                <h2 className="text-sm font-bold">Cadastro de Jogadores</h2>
                <p className="text-xs text-muted-foreground">
                  {cadastroAberto ? "Aberto para inscrições" : "Fechado para inscrições"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleCadastro}
              className="rounded-xl px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
              style={{ background: cadastroAberto ? "hsl(0 84% 60%)" : "hsl(142 72% 29%)" }}
            >
              {cadastroAberto ? "🔒 Fechar" : "🔓 Abrir"}
            </button>
          </div>
        </section>

        {/* Caixa da Pelada */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                <span className="text-base">🏦</span>
              </div>
              <h2 className="text-sm font-bold">Caixa da Pelada</h2>
            </div>
            <button
              onClick={() => {
                setTempValorCampo(String(valorCampo));
                setTempValorJogador(String(valorJogador));
                setEditingValores(!editingValores);
              }}
              className="rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:bg-muted active:scale-95"
            >
              ✏️ Editar
            </button>
          </div>

          {editingValores && (
            <div className="mb-4 space-y-2 rounded-xl bg-muted/50 border p-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold w-28">Valor campo:</label>
                <input
                  type="number"
                  value={tempValorCampo}
                  onChange={(e) => setTempValorCampo(e.target.value)}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold w-28">Valor jogador:</label>
                <input
                  type="number"
                  value={tempValorJogador}
                  onChange={(e) => setTempValorJogador(e.target.value)}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={saveValores}
                className="w-full rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
              >
                💾 Salvar valores
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
              <div className="text-base font-extrabold text-primary">R$ {totalArrecadado}</div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Arrecadado</div>
            </div>
            <div className="rounded-xl bg-muted/50 border p-3 text-center">
              <div className="text-base font-extrabold text-foreground">R$ {valorCampo}</div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Campo</div>
            </div>
            <div className="rounded-xl border p-3 text-center" style={{ background: saldo >= 0 ? "hsl(142 72% 29% / 0.05)" : "hsl(0 84% 60% / 0.05)", borderColor: saldo >= 0 ? "hsl(142 72% 29% / 0.15)" : "hsl(0 84% 60% / 0.15)" }}>
              <div className="text-base font-extrabold" style={{ color: saldo >= 0 ? "hsl(142 72% 29%)" : "hsl(0 84% 60%)" }}>R$ {saldo}</div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Saldo</div>
            </div>
          </div>
        </section>

        {/* Jogadores */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                <span className="text-base">⚽</span>
              </div>
              <h2 className="text-sm font-bold">Jogadores</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {jogadores.length}/18
              </span>
            </div>
            {jogadores.length > 0 && (
              <button onClick={clearAll} className="rounded-xl border border-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive transition-all hover:bg-destructive/5 active:scale-95">
                🗑️ Limpar
              </button>
            )}
          </div>

          {jogadores.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🏟️</div>
              <p className="text-sm text-muted-foreground">Nenhum jogador na lista.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedJogadores.map((j, index) => (
                <div
                  key={j.id}
                  className="animate-fade-in flex items-center justify-between rounded-xl border p-3 transition-all hover:shadow-sm"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: j.status === "pago" ? "hsl(142 72% 29%)" : "hsl(48 96% 53%)",
                    background: j.status === "pago" ? "hsl(142 72% 29% / 0.04)" : "hsl(var(--card))",
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-sm truncate">{j.nome}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
                      style={{
                        background: j.status === "pago" ? "hsl(142 72% 29% / 0.12)" : "hsl(48 96% 53% / 0.15)",
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
                        className="rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
                      >
                        ✅ Pago
                      </button>
                    ) : (
                      <button
                        onClick={() => markPending(j.id)}
                        className="rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all active:scale-95"
                      >
                        ↩
                      </button>
                    )}
                    <button
                      onClick={() => removePlayer(j.id)}
                      className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all active:scale-95"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Relatórios */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <span className="text-base">📊</span>
            </div>
            <h2 className="text-sm font-bold">Relatórios</h2>
          </div>

          <div className="space-y-3">
            {/* Financeiro */}
            <div className="rounded-xl bg-muted/40 border p-4">
              <h3 className="text-xs font-bold mb-2">💰 Prestação de Contas</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Resumo financeiro da pelada.</p>
              <button
                onClick={enviarRelatorioWhatsApp}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
                style={{ background: "hsl(142 70% 40%)" }}
              >
                📱 Enviar via WhatsApp
              </button>
            </div>

            {/* Jogadores */}
            <div className="rounded-xl bg-muted/40 border p-4">
              <h3 className="text-xs font-bold mb-2">📋 Lista de Jogadores</h3>
              <div className="mb-3 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>✅ Pagos:</span>
                  <span className="font-bold text-primary">{pagos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>⏳ Pendentes:</span>
                  <span className="font-bold" style={{ color: "hsl(30 80% 35%)" }}>{pendentes.length}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-semibold">👥 Total:</span>
                  <span className="font-bold">{jogadores.length}/18</span>
                </div>
              </div>
              <button
                onClick={enviarRelatorioJogadoresWhatsApp}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
                style={{ background: "hsl(142 70% 40%)" }}
              >
                📱 Enviar lista via WhatsApp
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Admin;
