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
      <div className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-between p-12 bg-secondary border-r border-border">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1920&q=80&fit=crop" 
            alt="Pillars of Justice" 
            className="w-full h-full object-cover opacity-[0.06]"
          />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 group">
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

      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md relative z-10">
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

            <div className="text-center mb-10">
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">Bem-vindo</h2>
              <p className="text-muted-foreground">Acesse sua conta para continuar</p>
            </div>

            <Button 
              variant="primary" 
              size="lg" 
              className="w-full text-base mb-8" 
              onClick={() => login()}
              isLoading={isLoading}
            >
              Entrar no Sistema
            </Button>

            <div className="grid grid-cols-1 gap-5 pt-8 border-t border-border">
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
