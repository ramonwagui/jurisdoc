import { useAuth } from "@workspace/replit-auth-web";
import { Scale, ShieldCheck, Zap, Database } from "lucide-react";
import { Button } from "@/components/ui-components";
import { motion } from "framer-motion";

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();

  if (isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 z-0">
          {/* using Unsplash placeholder for high quality architectural legal background */}
          {/* architectural classic pillars library deep tone */}
          <img 
            src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1920&q=80&fit=crop" 
            alt="Pillars of Justice" 
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 group">
            <div className="w-14 h-14 rounded-2xl gold-gradient-bg flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20">
              <Scale className="w-8 h-8" />
            </div>
            <span className="font-display font-bold text-4xl tracking-tight text-white">
              Juris<span className="text-primary font-light italic">Doc</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-5xl font-display font-bold text-white mb-6 leading-tight">
            Gestão inteligente de documentos jurídicos.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Busca avançada, extração de texto automática e análise de documentos com Inteligência Artificial para equipes de alta performance.
          </p>
        </div>
      </div>

      {/* Right panel - Login */}
      <div className="flex-1 flex items-center justify-center p-8 border-l border-border/50 relative">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-panel p-10 rounded-3xl"
          >
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <div className="w-12 h-12 rounded-xl gold-gradient-bg flex items-center justify-center text-primary-foreground">
                <Scale className="w-6 h-6" />
              </div>
              <span className="font-display font-bold text-3xl text-white">
                Juris<span className="text-primary font-light italic">Doc</span>
              </span>
            </div>

            <div className="text-center mb-10">
              <h2 className="text-3xl font-display font-bold text-white mb-3">Bem-vindo</h2>
              <p className="text-muted-foreground">Acesse sua conta para continuar</p>
            </div>

            <Button 
              variant="primary" 
              size="lg" 
              className="w-full text-lg mb-8" 
              onClick={() => login()}
              isLoading={isLoading}
            >
              Entrar no Sistema
            </Button>

            <div className="grid grid-cols-1 gap-6 pt-8 border-t border-border/50">
              <FeatureItem icon={<ShieldAlertIcon />} title="Segurança Avançada" desc="Controle de acesso por função" />
              <FeatureItem icon={<Zap />} title="Busca Instantânea" desc="Pesquisa full-text em todos os arquivos" />
              <FeatureItem icon={<Database />} title="Assistente IA" desc="Converse com seus documentos via Gemini" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ShieldAlertIcon() {
  return <ShieldCheck className="w-5 h-5 text-primary" />;
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2 rounded-lg bg-secondary border border-border/50 mt-1">
        {icon}
      </div>
      <div>
        <h4 className="text-white font-medium mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
