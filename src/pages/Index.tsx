import { useState, useEffect, useCallback } from "react";
import qrCodePix from "@/assets/qrcode-pix.jpg";

const PIX_KEY = "c760db6d-2bfe-4228-b2e4-8d35d99510d4";
const MAX_JOGADORES = 18;
const VALOR_CAMPO = 120;
const VALOR_POR_JOGADOR = 15;
const WHATSAPP_NUMBER = "5598981986302";
const ADMIN_PASSWORD = "admin123";

interface Jogador {
  id: string;
  nome: string;
  status: "pendente" | "pago";
  criadoEm: number;
}

const loadPlayers = (): Jogador[] => {
  try {
    const data = localStorage.getItem("pelada-jogadores");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const Index = () => {
  const [jogadores, setJogadores] = useState<Jogador[]>(loadPlayers);
  const [nome, setNome] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("pelada-admin") === "true");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    localStorage.setItem("pelada-jogadores", JSON.stringify(jogadores));
  }, [jogadores]);

  const vagasRestantes = MAX_JOGADORES - jogadores.length;
  const totalArrecadado = jogadores.filter((j) => j.status === "pago").length * VALOR_POR_JOGADOR;
  const saldo = totalArrecadado - VALOR_CAMPO;

  const addPlayer = useCallback(() => {
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

    setJogadores((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: trimmed, status: "pendente", criadoEm: Date.now() },
    ]);
    setNome("");
    setErro("");
  }, [nome, jogadores]);

  const markPaid = (id: string) => {
    setJogadores((prev) => prev.map((j) => (j.id === id ? { ...j, status: "pago" } : j)));
  };

  const removePlayer = (id: string) => {
    setJogadores((prev) => prev.filter((j) => j.id !== id));
  };

  const clearAll = () => {
    setJogadores([]);
    setShowConfirmClear(false);
  };

  const copyPix = async () => {
    await navigator.clipboard.writeText(PIX_KEY);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleAdminLogin = () => {
    if (adminPass === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem("pelada-admin", "true");
      setShowAdminLogin(false);
      setAdminPass("");
    } else {
      setAdminPass("");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("pelada-admin");
  };

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Segue meu comprovante de pagamento da pelada.")}`;

  const PlayerRow = ({ j }: { j: Jogador }) => (
    <div
      className="animate-fade-in flex items-center justify-between rounded-lg border p-3 transition-all"
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
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            background: j.status === "pago" ? "hsl(142 72% 29% / 0.15)" : "hsl(48 96% 53% / 0.2)",
            color: j.status === "pago" ? "hsl(142 72% 29%)" : "hsl(30 80% 35%)",
          }}
        >
          {j.status === "pago" ? "✅ Pago" : "⏳ Pendente"}
        </span>
        {isAdmin && j.status === "pendente" && (
          <button
            onClick={() => markPaid(j.id)}
            className="rounded-md px-2 py-1 text-xs font-medium transition-colors text-white"
            style={{ background: "hsl(142 72% 29%)" }}
          >
            Confirmar
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => removePlayer(j.id)}
            className="rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-8" style={{ background: "hsl(120 20% 96%)" }}>
      {/* Header */}
      <header
        className="px-4 py-6 text-center text-primary-foreground"
        style={{ background: "linear-gradient(135deg, hsl(142 72% 25%), hsl(142 72% 35%))" }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Pelada da Semana ⚽</h1>
        <p className="mt-1 text-sm opacity-90">Organize, pague e jogue!</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium">
          🎯 {vagasRestantes > 0 ? `${vagasRestantes} vaga${vagasRestantes !== 1 ? "s" : ""} restante${vagasRestantes !== 1 ? "s" : ""}` : "Lista cheia!"}
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {/* Admin toggle */}
        <div className="text-right">
          {isAdmin ? (
            <button onClick={handleAdminLogout} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              🔓 Sair do modo Admin
            </button>
          ) : (
            <button onClick={() => setShowAdminLogin(true)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              🔒 Admin
            </button>
          )}
        </div>

        {showAdminLogin && (
          <div className="rounded-xl border bg-card p-4 shadow-sm animate-fade-in">
            <h2 className="mb-2 text-sm font-semibold">Acesso Admin</h2>
            <div className="flex gap-2">
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                placeholder="Senha"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleAdminLogin}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
                style={{ background: "hsl(142 72% 29%)" }}
              >
                Entrar
              </button>
              <button
                onClick={() => { setShowAdminLogin(false); setAdminPass(""); }}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

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
          <p className="mb-1 text-sm text-muted-foreground">Valor por jogador: <strong className="text-foreground">R$ {VALOR_POR_JOGADOR},00</strong></p>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted p-3">
            <code className="flex-1 truncate text-xs font-mono">{PIX_KEY}</code>
            <button
              onClick={copyPix}
              className="shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
            >
              {copiado ? "✅ Copiado!" : "Copiar"}
            </button>
          </div>
          {/* QR Code */}
          <div className="mt-3 flex justify-center">
            <img src={qrCodePix} alt="QR Code Pix" className="h-48 w-48 rounded-lg border" />
          </div>
          {/* WhatsApp link */}
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

        {/* Caixa */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">🏦 Caixa da Pelada</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-bold" style={{ color: "hsl(142 72% 29%)" }}>
                R$ {totalArrecadado}
              </div>
              <div className="text-[11px] text-muted-foreground">Arrecadado</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-bold text-foreground">R$ {VALOR_CAMPO}</div>
              <div className="text-[11px] text-muted-foreground">Campo</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-lg font-bold" style={{ color: saldo >= 0 ? "hsl(142 72% 29%)" : "hsl(0 84% 60%)" }}>
                R$ {saldo}
              </div>
              <div className="text-[11px] text-muted-foreground">Saldo</div>
            </div>
          </div>
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
                <PlayerRow key={j.id} j={j} />
              ))}
            </div>
          )}
        </section>

        {/* Limpar (admin only) */}
        {isAdmin && jogadores.length > 0 && (
          <div className="text-center pt-2">
            {showConfirmClear ? (
              <div className="inline-flex items-center gap-2 rounded-lg border bg-card p-3 shadow-sm animate-fade-in">
                <span className="text-sm">Tem certeza?</span>
                <button onClick={clearAll} className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground">
                  Sim, limpar
                </button>
                <button onClick={() => setShowConfirmClear(false)} className="rounded-md border px-3 py-1 text-xs font-medium">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                🗑️ Limpar lista
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
