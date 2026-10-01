import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const salvar = async () => {
    if (senha.length < 6) { setMsg("A senha precisa ter pelo menos 6 caracteres."); return; }
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) setMsg(error.message);
    else navigate("/minhas-peladas");
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-3 rounded-3xl border bg-card p-8 shadow-elevated">
        <h1 className="font-display text-center text-xl font-bold text-foreground">Nova senha</h1>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite a nova senha"
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
        {msg && <p className="text-xs text-destructive">{msg}</p>}
        <button onClick={salvar} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Salvar senha</button>
      </div>
    </div>
  );
};

export default ResetPassword;
