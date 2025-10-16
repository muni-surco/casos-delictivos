import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { hasSupabase } from "@/lib/supabaseClient";

export default function RequireAuth({ children }: { children: any }) {
  if (!hasSupabase) return children; // if supabase not configured, don't block
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}
