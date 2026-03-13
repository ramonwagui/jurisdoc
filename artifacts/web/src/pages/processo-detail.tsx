import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetProcesso, useUpdateProcesso, useCreateAndamento, useDeleteAndamento, useListUsers, getGetProcessoQueryKey } from "@workspace/api-client-react";
import type { Andamento } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, Button, Input } from "@/components/ui-components";
import { statusLabels, statusColors, areaLabels, areaColors } from "./processos";
import {
  Briefcase, ArrowLeft, AlertCircle, Calendar, Clock, FileText,
  Gavel, MessageSquare, Eye, EyeOff, Plus, Trash2, User, ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";

const tipoLabels: Record<string, string> = {
  andamento: "Andamento",
  parecer: "Parecer",
  audiencia: "Audiência",
  prazo: "Prazo",
  recurso: "Recurso",
  encerramento: "Encerramento",
  outro: "Outro",
};

const tipoIcons: Record<string, React.ReactNode> = {
  andamento: <MessageSquare className="w-4 h-4" />,
  parecer: <FileText className="w-4 h-4" />,
  audiencia: <Gavel className="w-4 h-4" />,
  prazo: <Clock className="w-4 h-4" />,
  recurso: <Briefcase className="w-4 h-4" />,
  encerramento: <AlertCircle className="w-4 h-4" />,
  outro: <MessageSquare className="w-4 h-4" />,
};

const tipoColors: Record<string, string> = {
  andamento: "bg-blue-100 text-blue-700 border-blue-200",
  parecer: "bg-emerald-100 text-emerald-700 border-emerald-200",
  audiencia: "bg-amber-100 text-amber-700 border-amber-200",
  prazo: "bg-red-100 text-red-700 border-red-200",
  recurso: "bg-purple-100 text-purple-700 border-purple-200",
  encerramento: "bg-gray-100 text-gray-600 border-gray-200",
  outro: "bg-sky-100 text-sky-700 border-sky-200",
};

export default function ProcessoDetail() {
  const { id } = useParams<{ id: string }>();
  const processoId = parseInt(id, 10);
  const { data: processo, isLoading } = useGetProcesso(processoId);
  const updateMutation = useUpdateProcesso();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useCurrentUser();
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setShowStatusDropdown(false);
    try {
      await updateMutation.mutateAsync({
        id: processoId,
        data: { status: newStatus as Parameters<typeof updateMutation.mutateAsync>[0]["data"]["status"] },
      });
      queryClient.invalidateQueries({ queryKey: getGetProcessoQueryKey(processoId) });
      toast({ title: `Status alterado para "${statusLabels[newStatus]}"` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar status";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!processo) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto mt-20 text-center bg-card p-12 rounded-2xl border border-border shadow-sm">
          <AlertCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Processo não encontrado</h2>
          <p className="text-muted-foreground">O processo solicitado não existe ou você não tem acesso.</p>
        </div>
      </Layout>
    );
  }

  const andamentos: Andamento[] = (processo as any).andamentos ?? [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/processos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar aos processos
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-secondary border border-border text-primary">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold text-foreground mb-1">{processo.titulo}</h1>
                  <p className="text-sm text-muted-foreground font-mono">{processo.numero}</p>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${statusColors[processo.status] || statusColors.em_andamento}`}
                >
                  {statusLabels[processo.status] || processo.status}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showStatusDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-card rounded-xl border border-border shadow-lg p-2 z-20 min-w-[200px]">
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(key)}
                          className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                            processo.status === key
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoItem label="Cliente" value={processo.clienteNome} />
              <InfoItem label="CPF" value={processo.clienteCpf} />
              <InfoItem label="Área" value={
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${areaColors[processo.area] || ""}`}>
                  {areaLabels[processo.area] || processo.area}
                </span>
              } />
              <InfoItem label="Advogado" value={processo.advogadoNome || "—"} />
            </div>

            {(processo as any).clienteTelefone && (
              <div className="mt-4">
                <InfoItem label="Telefone" value={(processo as any).clienteTelefone} />
              </div>
            )}

            {processo.descricao && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1 font-medium">Descrição</p>
                <p className="text-sm text-foreground leading-relaxed">{processo.descricao}</p>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Andamentos
            <span className="text-sm font-normal text-muted-foreground">({andamentos.length})</span>
          </h2>

          {andamentos.length > 0 ? (
            <div className="relative ml-4 border-l-2 border-border pl-8 space-y-6 mb-8">
              {andamentos.map((and, i) => (
                <AndamentoItem key={and.id} andamento={and} processoId={processoId} currentUserId={currentUser?.id} isAdmin={currentUser?.role === "admin"} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-card rounded-2xl border-2 border-dashed border-border mb-8">
              <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">Nenhum andamento registrado.</p>
            </div>
          )}

          <NewAndamentoForm processoId={processoId} />
        </motion.div>
      </div>
    </Layout>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function AndamentoItem({ andamento, processoId, currentUserId, isAdmin, index }: {
  andamento: Andamento; processoId: number; currentUserId?: number; isAdmin?: boolean; index: number;
}) {
  const deleteMutation = useDeleteAndamento();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canDelete = isAdmin || andamento.autorId === currentUserId;

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este andamento?")) return;
    try {
      await deleteMutation.mutateAsync({ id: processoId, andId: andamento.id });
      queryClient.invalidateQueries({ queryKey: getGetProcessoQueryKey(processoId) });
      toast({ title: "Andamento excluído" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao excluir";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const eventDate = andamento.dataEvento
    ? formatDate(andamento.dataEvento)
    : formatDate(andamento.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full border-2 border-border bg-card flex items-center justify-center">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${tipoColors[andamento.tipo]?.split(" ")[0] || "bg-blue-100"}`}>
          {tipoIcons[andamento.tipo] ? <span className="scale-[0.6]">{tipoIcons[andamento.tipo]}</span> : null}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${tipoColors[andamento.tipo] || tipoColors.outro}`}>
              {tipoIcons[andamento.tipo]}
              {tipoLabels[andamento.tipo] || andamento.tipo}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {eventDate}
            </span>
            {andamento.visivelCliente ? (
              <span className="text-xs text-emerald-600 flex items-center gap-1" title="Visível ao cliente">
                <Eye className="w-3 h-3" /> Visível
              </span>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1" title="Não visível ao cliente">
                <EyeOff className="w-3 h-3" /> Interno
              </span>
            )}
          </div>
          {canDelete && (
            <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10" title="Excluir andamento">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{andamento.conteudo}</p>

        {andamento.autorNome && (
          <div className="mt-3 pt-2 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3 h-3" /> {andamento.autorNome}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function NewAndamentoForm({ processoId }: { processoId: number }) {
  const createMutation = useCreateAndamento();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [tipo, setTipo] = useState("andamento");
  const [conteudo, setConteudo] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [visivelCliente, setVisivelCliente] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conteudo.trim()) return;

    try {
      await createMutation.mutateAsync({
        id: processoId,
        data: {
          tipo: tipo as any,
          conteudo: conteudo.trim(),
          visivelCliente,
          ...(dataEvento ? { dataEvento } : {}),
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetProcessoQueryKey(processoId) });
      toast({ title: "Andamento registrado" });
      setConteudo("");
      setDataEvento("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao registrar";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-primary" />
        Registrar Andamento
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm">
              {Object.entries(tipoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Data do Evento <span className="text-muted-foreground/60 font-normal">(opcional)</span></label>
            <Input type="datetime-local" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Conteúdo *</label>
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Descreva o andamento..."
            rows={3}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setVisivelCliente(!visivelCliente)}
              className={`relative w-11 h-6 rounded-full transition-colors ${visivelCliente ? "bg-primary" : "bg-border"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${visivelCliente ? "translate-x-5" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-foreground flex items-center gap-1.5">
              {visivelCliente ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              {visivelCliente ? "Visível ao cliente" : "Somente interno"}
            </span>
          </label>

          <Button type="submit" isLoading={createMutation.isPending} disabled={!conteudo.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar
          </Button>
        </div>
      </form>
    </Card>
  );
}
