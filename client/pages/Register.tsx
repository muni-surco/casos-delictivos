import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('El correo es requerido');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });

      if (res.ok) {
        setSuccess('Cuenta creada correctamente.');
        // Optionally navigate after a short delay
        setTimeout(() => nav('/login'), 1500);
        return;
      }

      // Try to parse error body safely; if body was already read, fall back to a generic message
      try {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to register');
      } catch (parseErr: any) {
        throw new Error(parseErr?.message?.includes('body stream already read') ? 'Failed to register' : parseErr?.message || 'Failed to register');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Crear cuenta</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="username">Usuario</Label>
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Repetir contraseña</Label>
          <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        {success && <div className="text-sm text-emerald-600">{success}</div>}
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>{loading ? "Cargando..." : "Registrarse"}</Button>
        </div>
      </form>
    </div>
  );
}
