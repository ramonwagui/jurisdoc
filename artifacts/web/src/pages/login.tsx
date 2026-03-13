import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Scale, ShieldCheck, Zap, Database, Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@/components/ui-components";
import { motion } from "framer-motion";
import { Redirect } from "wouter";

interface SetupStatus {
  needsSetup: boolean;
}

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    fetch("/api/auth/setup-status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setSetupStatus(data);
        setCheckingSetup(false);
      })
      .catch(() => {
        setSetupStatus({ needsSetup: false });
        setCheckingSetup(false);
      });
  }, []);

  if (isLoading || checkingSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-between p-12 bg-secondary border-r border-border">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1920&q=80&fit=crop"
            alt="Pilares da Justiça"
            className="w-full h-full object-cover opacity-[0.06]"
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl brand-gradient-bg flex items-center justify-center shadow-sm">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <span className="font-display font-bold text-3xl tracking-tight text-foreground">
              Juris<span className="brand-gradient-text font-normal italic">Doc</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-5xl font-display font-bold text-foreground mb-6 leading-tight">
            Gestão inteligente de documentos jurídicos.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Busca avançada, extração de texto automática e análise de documentos com Inteligência Artificial para equipes de alta performance.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-card p-10 rounded-2xl border border-border shadow-sm"
          >
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <div className="w-11 h-11 rounded-lg brand-gradient-bg flex items-center justify-center text-white">
                <Scale className="w-6 h-6" />
              </div>
              <span className="font-display font-bold text-3xl text-foreground">
                Juris<span className="brand-gradient-text font-normal italic">Doc</span>
              </span>
            </div>

            {setupStatus?.needsSetup ? (
              <SetupForm />
            ) : (
              <LoginForm />
            )}

            <div className="grid grid-cols-1 gap-5 pt-8 border-t border-border mt-8">
              <FeatureItem icon={<ShieldCheck className="w-5 h-5 text-primary" />} title="Segurança Avançada" desc="Controle de acesso por função" />
              <FeatureItem icon={<Zap className="w-5 h-5 text-primary" />} title="Busca Instantânea" desc="Pesquisa full-text em todos os arquivos" />
              <FeatureItem icon={<Database className="w-5 h-5 text-primary" />} title="Assistente IA" desc="Converse com seus documentos via Gemini" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email e senha são obrigatórios");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao entrar. Verifique suas credenciais.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Bem-vindo</h2>
        <p className="text-muted-foreground">Acesse sua conta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
          <Input
            type="email"
            placeholder="seu@escritorio.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Senha</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full text-base mt-2"
          isLoading={isSubmitting}
        >
          Entrar no Sistema
        </Button>
      </form>
    </>
  );
}

function SetupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Todos os campos são obrigatórios");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao criar conta de administrador.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Configuração Inicial</h2>
        <p className="text-muted-foreground">Crie a conta de administrador do sistema</p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-6 text-sm text-primary">
        Nenhum usuário encontrado. Configure o primeiro administrador para começar.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nome Completo</label>
          <Input
            placeholder="Dr. Administrador"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
          <Input
            type="email"
            placeholder="admin@escritorio.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Senha</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full text-base mt-2"
          isLoading={isSubmitting}
        >
          Criar Administrador e Entrar
        </Button>
      </form>
    </>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2 rounded-lg bg-secondary border border-border mt-0.5">
        {icon}
      </div>
      <div>
        <h4 className="text-foreground font-medium mb-0.5">{title}</h4>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
