import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Item { id: string; nome: string; slug: string; owner_id: string | null; papel: string }

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

const MinhasPeladas = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [itens, setItens] = useState<Item[]>([]);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/entrar?next=/minhas-peladas", { replace: true });
  }, [loading, user, navigate]);

  const carregar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pelada_members")
      .select("papel, peladas(id, nome, slug, owner_id)")
      .eq("user_id", user.id);
    const lista = (data || [])
      .filter((m: any) => m.peladas)
      .map((m: any) => ({ ...m.peladas, papel: m.papel })) as Item[];
    setItens(lista);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const criar = async () => {
    if (!user) return;
    const n = nome.trim();
    if (n.length < 3) { setErro("Dê um nome com pelo menos 3 letras."); return; }
    setErro(""); setBusy(true);
    let slug = slugify(n);
    if (slug.length < 3) slug = `pelada-${slug}`;
    for (let i = 0; i < 5; i++) {
      const tentativa = i === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("peladas").insert({ nome: n, slug: tentativa, owner_id: user.id });
      if (!error) {
        setBusy(false);
        navigate(`/p/${tentativa}/admin`);
        return;
      }
      if (error.code !== "23505") { setErro("Não foi possível criar a pelada."); break; }
    }
    setBusy(false);
  };

  const sair = async () => { await supabase.auth.signOut(); navigate("/"); };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Minhas peladas</h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button onClick={sair} className="rounded-xl border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">Sair</button>
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-3">
          <p className="section-label">Criar nova pelada</p>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da pelada (ex: Pelada de Quinta)"
            onKeyDown={(e) => e.key === "Enter" && criar()}
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <button onClick={criar} disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
            Criar pelada
          </button>
        </div>

        <div className="space-y-2.5">
          {itens.length === 0 && <p className="text-center text-sm text-muted-foreground">Você ainda não participa de nenhuma pelada.</p>}
          {itens.map((p) => {
            const dono = p.owner_id === user.id || p.papel === "owner" || p.papel === "admin";
            return (
              <div key={p.id} className="flex items-center justify-between rounded-2xl border bg-card p-4">
                <div>
                  <p className="font-semibold text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{dono ? "Organizador" : "Jogador"} · /p/{p.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/p/${p.slug}`} className="rounded-xl border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">Abrir</Link>
                  {dono && <Link to={`/p/${p.slug}/admin`} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Admin</Link>}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs"><Link to="/" className="text-muted-foreground hover:underline">← Voltar para a Pelada da Semana</Link></p>
      </div>
    </div>
  );
};

export default MinhasPeladas;
