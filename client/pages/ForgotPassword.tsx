import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await auth.resetPassword(email);
      setMessage("Email de restablecimiento enviado si la cuenta existe.");
    } catch (err: any) {
      setError(err?.message ?? "Error al solicitar restablecimiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Recuperar contraseña</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        {message && <div className="text-sm text-emerald-600">{message}</div>}
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar email"}</Button>
        </div>
      </form>
    </div>
  );
}
