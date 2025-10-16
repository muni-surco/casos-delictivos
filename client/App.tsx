import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import { AuthProvider } from "@/components/AuthProvider";
import RequireAuth from "@/components/RequireAuth";

const queryClient = new QueryClient();

import { useAuth } from "@/components/AuthProvider";
import { Link, useNavigate } from "react-router-dom";

function HeaderContent() {
  const auth = useAuth();
  const session = auth?.session ?? null;
  const signOut = auth?.signOut;
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-14 items-center justify-between">
        <a href="/" className="font-extrabold tracking-tight text-lg">
          <span className="text-primary">Crimely</span>
          <span className="text-muted-foreground"> — Panel</span>
        </a>
        <div className="flex items-center gap-2">
          {!session ? (
            <>
              <a href="/login" className="text-sm text-primary underline">Entrar</a>
              <a href="/register" className="text-sm">Registrarse</a>
            </>
          ) : (
            <button
              type="button"
              className="text-sm text-rose-600"
              onClick={async () => {
                if (signOut) await signOut();
                window.location.href = "/login";
              }}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
            <HeaderContent />
            <main className="container py-6">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot" element={<ForgotPassword />} />
                <Route
                  path="/"
                  element={<RequireAuth><Index /></RequireAuth>}
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

createRoot(document.getElementById("root")!).render(<App />);
