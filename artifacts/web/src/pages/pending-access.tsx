import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Scale, Clock, LogOut, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui-components";
import { motion } from "framer-motion";

export default function PendingAccess() {
  const { logout, user } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-16 h-16 mx-auto rounded-xl brand-gradient-bg flex items-center justify-center mb-8 shadow-sm">
          <Scale className="w-8 h-8 text-white" />
        </div>

        <div className="bg-card rounded-2xl p-8 mb-6 border border-border shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Clock className="w-7 h-7 text-primary" />
          </div>

          <h1 className="text-2xl font-display font-bold text-foreground mb-3">
            Acesso Pendente
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Sua conta foi autenticada com sucesso, mas ainda não foi aprovada por um administrador do sistema.
          </p>

          {user?.id && (
            <div className="mb-6 text-left">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Seu Replit User ID
              </p>
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-3 border border-border">
                <code className="flex-1 text-sm text-foreground font-mono truncate select-all">
                  {user.id}
                </code>
                <button
                  onClick={copyId}
                  className="shrink-0 p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Copiar ID"
                >
                  {copied
                    ? <Check className="w-4 h-4 text-primary" />
                    : <Copy className="w-4 h-4" />
                  }
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Envie este ID para o administrador do escritório para ser cadastrado.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground/80 leading-relaxed">
            O administrador deve inserir esse ID no painel de Administração do JurisDoc.
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={() => logout()}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair e voltar ao login
        </Button>
      </motion.div>
    </div>
  );
}
