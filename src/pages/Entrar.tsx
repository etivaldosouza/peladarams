import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

const inputCls =
  "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring/50 focus:border-primary placeholder:text-muted-foreground/60";
const btnCls =
  "w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 disabled:opacity-50";

const Entrar = () => {
  const [params] = useSearchParams();
  const next = params.get("next");
  const destino = next && next.startsWith("/") ? next : "/minhas-peladas";
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modo, setModo] = useState<"entrar" | "criar" | "esqueci">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(destino, { replace: true });
  }, [user, destino, navigate]);

  const google = async () => {
    setErro("");
    sessionStorage.setItem("auth_next", destino);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/entrar" });
    if (r.error) setErro("Não foi possível entrar com Google.");
  };

  const enviar = async () => {
    setErro(""); setMsg(""); setBusy(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) setErro("E-mail ou senha incorretos.");
      } else if (modo === "criar") {
        if (senha.length < 6) { setErro("A senha precisa ter pelo menos 6 caracteres."); return; }
        const { error } = await supabase.auth.signUp({
          email, password: senha,
          options: { emailRedirectTo: window.location.origin + destino, data: { full_name: nome } },
        });
        if (error) setErro(error.message);
        else setMsg("Conta criada! Confira seu e-mail para confirmar o cadastro.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) setErro(error.message);
        else setMsg("Enviamos um link para redefinir sua senha.");
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-8 shadow-elevated">
        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl">⚽</div>
          <h1 className="font-display text-xl font-bold text-foreground">
            {modo === "criar" ? "Criar conta" : modo === "esqueci" ? "Recuperar senha" : "Entrar"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Organize ou participe de peladas</p>
        </div>

        {modo !== "esqueci" && (
          <>
            <button onClick={google} className="w-full rounded-xl border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted">
              Continuar com Google
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />ou<div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <div className="space-y-2.5">
          {modo === "criar" && <input className={inputCls} placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />}
          <input className={inputCls} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {modo !== "esqueci" && (
            <input className={inputCls} type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()} />
          )}
          {erro && <p className="text-xs font-medium text-destructive">{erro}</p>}
          {msg && <p className="text-xs font-medium text-primary">{msg}</p>}
          <button onClick={enviar} disabled={busy || !email} className={btnCls}>
            {modo === "criar" ? "Criar conta" : modo === "esqueci" ? "Enviar link" : "Entrar"}
          </button>
        </div>

        <div className="mt-5 space-y-1.5 text-center text-xs text-muted-foreground">
          {modo === "entrar" && (
            <>
              <p>Não tem conta? <button className="font-semibold text-primary" onClick={() => setModo("criar")}>Criar conta</button></p>
              <p><button className="font-semibold text-primary" onClick={() => setModo("esqueci")}>Esqueci minha senha</button></p>
            </>
          )}
          {modo !== "entrar" && <p><button className="font-semibold text-primary" onClick={() => setModo("entrar")}>Voltar para entrar</button></p>}
          <p><Link to="/" className="hover:underline">← Voltar para a pelada</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Entrar;
