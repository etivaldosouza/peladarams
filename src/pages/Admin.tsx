import { useState, useEffect } from "react";

const ADMIN_PASSWORD = "admin123";
const VALOR_POR_JOGADOR = 10;
const VALOR_CAMPO = 120;

interface Jogador {
  id: string;
  nome: string;
  status: "pendente" | "pago";
  criadoEm: number;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [jogadores, setJogadores] = useState<Jogador[]>([]);

  useEffect(() => {
    const data = localStorage.getItem("pelada-jogadores");
    if (data) setJogadores(JSON.parse(data));
  }, []);

  // Sync with localStorage changes
  useEffect(() => {
    const interval = setInterval(() => {
      const data = localStorage.getItem("pelada-jogadores");
      if (data) setJogadores(JSON.parse(data));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const save = (updated: Jogador[]) => {
    setJogadores(updated);
    localStorage.setItem("pelada-jogadores", JSON.stringify(updated));
  };

  const markPaid = (id: string) => {
    save(jogadores.map((j) => (j.id === id ? { ...j, status: "pago" } : j)));
  };

  const removePlayer = (id: string) => {
    save(jogadores.filter((j) => j.id !== id));
  };

  const clearAll = () => {
    if (window.confirm("Tem certeza que deseja limpar toda a lista?")) {
      save([]);
    }
  };

  const totalArrecadado = jogadores.filter((j) => j.status === "pago").length * VALOR_POR_JOGADOR;
  const saldo = totalArrecadado - VALOR_CAMPO;

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
        <p className="mt-1 text-sm opacity-90">Gerenciamento da pelada</p>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {/* Caixa */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">🏦 Caixa da Pelada</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-bold" style={{ color: "hsl(142 72% 29%)" }}>R$ {totalArrecadado}</div>
              <div className="text-[11px] text-muted-foreground">Arrecadado</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-bold text-foreground">R$ {VALOR_CAMPO}</div>
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
                    {j.status === "pendente" && (
                      <button
                        onClick={() => markPaid(j.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-white"
                        style={{ background: "hsl(142 72% 29%)" }}
                      >
                        Confirmar
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
