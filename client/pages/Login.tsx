import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.signIn(username, password);
      nav("/");
    } catch (err: any) {
      setError(err?.message ?? "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Iniciar sesión</h2>
      {!auth && <div className="text-sm text-rose-600">Auth no configurado.</div>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="username">Correo</Label>
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <a href="/forgot" className="text-primary underline">¿Olvidaste tu contraseña?</a>
          </div>
          <div>
            <Button type="submit" disabled={loading}>{loading ? "Cargando..." : "Entrar"}</Button>
          </div>
        </div>
      </form>
      <div className="text-sm mt-4">
        ¿No tienes una cuenta? <a href="/register" className="text-primary underline">Regístrate</a>
      </div>
    </div>
  );
}
