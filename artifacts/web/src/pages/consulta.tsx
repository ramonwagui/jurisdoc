import { useState } from "react";
import { Scale, Search, Loader2, Bot, User } from "lucide-react";
import { Button, Input, Card } from "@/components/ui-components";
import { motion, AnimatePresence } from "framer-motion";

interface ConsultaResult {
  resposta: string;
  processo: {
    numero: string;
    titulo: string;
    status: string;
    area: string;
    clienteNome: string;
  } | null;
}

const statusLabels: Record<string, string> = {
  em_andamento: "Em andamento",
  aguardando_decisao: "Aguardando decisão",
  recurso: "Em recurso",
  encerrado: "Encerrado",
};

const areaLabels: Record<string, string> = {
  civil: "Cível",
  criminal: "Criminal",
  trabalhista: "Trabalhista",
  previdenciario: "Previdenciário",
  familia: "Família",
  empresarial: "Empresarial",
  outro: "Outro",
};

export default function Consulta() {
  const [cpf, setCpf] = useState("");
  const [numero, setNumero] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf.trim() && !numero.trim()) {
      setError("Informe o CPF ou o número do processo.");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/processos/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(cpf.trim() ? { cpf: cpf.trim() } : {}),
          ...(numero.trim() ? { numero: numero.trim() } : {}),
          ...(pergunta.trim() ? { pergunta: pergunta.trim() } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao consultar. Tente novamente.");
      }

      const data: ConsultaResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao consultar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg brand-gradient-bg flex items-center justify-center text-white shadow-sm">
            <Scale className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-foreground">
            Juris<span className="brand-gradient-text font-normal italic">Doc</span>
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl brand-gradient-bg flex items-center justify-center text-white shadow-lg mx-auto mb-6">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Consultar meu Processo
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Informe seu CPF ou o número do processo para consultar o andamento com nosso assistente de inteligência artificial.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="mb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">CPF</label>
                  <Input
                    value={cpf}
                    onChange={(e) => { setCpf(e.target.value); setNumero(""); }}
                    placeholder="000.000.000-00"
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Número do Processo</label>
                  <Input
                    value={numero}
                    onChange={(e) => { setNumero(e.target.value); setCpf(""); }}
                    placeholder="0000000-00.2026.8.00.0001"
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sua pergunta <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  placeholder="Ex: Qual o status atual do meu processo? Houve alguma audiência recente?"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isLoading || (!cpf.trim() && !numero.trim())}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Consultar
                  </>
                )}
              </Button>
            </form>
          </Card>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive text-sm mb-8"
            >
              {error}
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {result.processo && (
                <Card className="bg-primary/5 border-primary/20">
                  <h3 className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Dados do Processo</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Número</p>
                      <p className="text-sm font-medium text-foreground font-mono">{result.processo.numero}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="text-sm font-medium text-foreground">{result.processo.clienteNome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-medium text-foreground">{statusLabels[result.processo.status] || result.processo.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Área</p>
                      <p className="text-sm font-medium text-foreground">{areaLabels[result.processo.area] || result.processo.area}</p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="relative">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full brand-gradient-bg flex items-center justify-center text-white shadow-sm shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-primary mb-3">Resposta do Assistente</h3>
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {result.resposta}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>Este é um serviço automatizado do escritório JurisDoc.</p>
          <p>Para informações mais detalhadas, entre em contato diretamente com seu advogado.</p>
        </div>
      </main>
    </div>
  );
}
