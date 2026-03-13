import { useState } from "react";
import { useListProcessos, useCreateProcesso, useListUsers, getListProcessosQueryKey } from "@workspace/api-client-react";
import type { Processo, CreateProcessoBody } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Input, Button, Card } from "@/components/ui-components";
import { Search, Plus, Briefcase, Calendar, ChevronRight, Filter, X } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  em_andamento: "Em andamento",
  aguardando_decisao: "Aguardando decisão",
  recurso: "Em recurso",
  encerrado: "Encerrado",
};

const statusColors: Record<string, string> = {
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  aguardando_decisao: "bg-amber-100 text-amber-800 border-amber-200",
  recurso: "bg-purple-100 text-purple-800 border-purple-200",
  encerrado: "bg-gray-100 text-gray-600 border-gray-200",
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

const areaColors: Record<string, string> = {
  civil: "bg-sky-100 text-sky-800 border-sky-200",
  criminal: "bg-red-100 text-red-800 border-red-200",
  trabalhista: "bg-orange-100 text-orange-800 border-orange-200",
  previdenciario: "bg-teal-100 text-teal-800 border-teal-200",
  familia: "bg-pink-100 text-pink-800 border-pink-200",
  empresarial: "bg-indigo-100 text-indigo-800 border-indigo-200",
  outro: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function Processos() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [areaFilter, setAreaFilter] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const params = {
    page: 1,
    limit: 50,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(areaFilter ? { area: areaFilter } : {}),
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  };
  const { data, isLoading } = useListProcessos(params, {
    query: { queryKey: getListProcessosQueryKey(params) },
  });

  const processos = data?.processos ?? [];
  const total = data?.total ?? 0;
  const hasFilters = !!statusFilter || !!areaFilter;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2"
            >
              Processos Jurídicos
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="text-base text-muted-foreground max-w-2xl"
            >
              Gerencie e acompanhe todos os processos do escritório.
            </motion.p>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Button size="lg" onClick={() => setIsModalOpen(true)} className="w-full md:w-auto">
              <Plus className="w-5 h-5 mr-2" />
              Novo Processo
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="relative max-w-3xl mb-6 group"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número, cliente, CPF ou título..."
            className="pl-12 h-12 text-base rounded-xl"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          <div className="flex items-center gap-1 mr-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Status:</span>
          </div>
          <button
            onClick={() => setStatusFilter(undefined)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !statusFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            Todos
          </button>
          {Object.entries(statusLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? undefined : key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                statusFilter === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {label}
            </button>
          ))}

          <div className="w-px h-6 bg-border self-center mx-2" />

          <div className="flex items-center gap-1 mr-2">
            <span className="text-sm text-muted-foreground font-medium">Área:</span>
          </div>
          <button
            onClick={() => setAreaFilter(undefined)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !areaFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            Todas
          </button>
          {Object.entries(areaLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setAreaFilter(areaFilter === key ? undefined : key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                areaFilter === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {label}
            </button>
          ))}

          {hasFilters && (
            <button
              onClick={() => { setStatusFilter(undefined); setAreaFilter(undefined); }}
              className="px-3 py-1.5 rounded-full text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </motion.div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
              Processos
              {isLoading && <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" /></span>}
            </h2>
            <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border">
              {total} encontrados
            </span>
          </div>

          {processos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence>
                {processos.map((proc, i) => (
                  <motion.div
                    key={proc.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    layout
                  >
                    <ProcessoCard processo={proc} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : !isLoading ? (
            <div className="text-center py-20 bg-card rounded-2xl border-2 border-dashed border-border">
              <Briefcase className="w-14 h-14 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum processo encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || hasFilters
                  ? "Tente usar termos diferentes ou remover os filtros."
                  : "Cadastre seu primeiro processo para começar."}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {isModalOpen && <ProcessoModal onClose={() => setIsModalOpen(false)} />}
    </Layout>
  );
}

function ProcessoCard({ processo }: { processo: Processo }) {
  return (
    <Link href={`/processos/${processo.id}`}>
      <Card className="h-full cursor-pointer hover-lift group relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-primary" />
          </div>
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div className="p-2.5 rounded-lg bg-secondary border border-border text-primary">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="text-base font-display font-semibold text-foreground truncate" title={processo.titulo}>
              {processo.titulo}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{processo.numero}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[processo.status] || statusColors.em_andamento}`}>
            {statusLabels[processo.status] || processo.status}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${areaColors[processo.area] || areaColors.outro}`}>
            {areaLabels[processo.area] || processo.area}
          </span>
        </div>

        <p className="text-sm text-foreground mb-1">
          <span className="text-muted-foreground">Cliente:</span> {processo.clienteNome}
        </p>
        {processo.advogadoNome && (
          <p className="text-sm text-foreground mb-1">
            <span className="text-muted-foreground">Advogado:</span> {processo.advogadoNome}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-border flex items-center text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          {formatDate(processo.createdAt)}
        </div>
      </Card>
    </Link>
  );
}

function ProcessoModal({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateProcesso();
  const { user: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const { data: users } = useListUsers({ query: { enabled: isAdmin } });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    numero: "",
    titulo: "",
    clienteNome: "",
    clienteCpf: "",
    clienteTelefone: "",
    area: "civil",
    status: "em_andamento",
    descricao: "",
    advogadoId: currentUser?.id || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.clienteNome.trim() || !form.clienteCpf.trim()) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    try {
      const body: CreateProcessoBody = {
        titulo: form.titulo.trim(),
        clienteNome: form.clienteNome.trim(),
        clienteCpf: form.clienteCpf.trim(),
        ...(form.numero.trim() ? { numero: form.numero.trim() } : {}),
        ...(form.clienteTelefone.trim() ? { clienteTelefone: form.clienteTelefone.trim() } : {}),
        area: form.area as CreateProcessoBody["area"],
        status: form.status as CreateProcessoBody["status"],
        ...(form.descricao.trim() ? { descricao: form.descricao.trim() } : {}),
        ...(currentUser?.role === "admin" && form.advogadoId ? { advogadoId: form.advogadoId } : {}),
      };

      await createMutation.mutateAsync({ data: body });
      queryClient.invalidateQueries({ queryKey: ["/api/processos"] });
      toast({ title: "Processo criado com sucesso" });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar processo";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const advogados = users?.filter((u) => u.active) ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg bg-card rounded-2xl p-8 shadow-xl border border-border max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">Novo Processo</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Número do Processo <span className="text-muted-foreground/60 font-normal">(opcional, será gerado automaticamente)</span></label>
            <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="0000000-00.2026.8.00.0001" />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Título *</label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Ação de Indenização por Danos Morais" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nome do Cliente *</label>
              <Input value={form.clienteNome} onChange={(e) => setForm({ ...form, clienteNome: e.target.value })} placeholder="João da Silva" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">CPF do Cliente *</label>
              <Input value={form.clienteCpf} onChange={(e) => setForm({ ...form, clienteCpf: e.target.value })} placeholder="000.000.000-00" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Telefone do Cliente</label>
            <Input value={form.clienteTelefone} onChange={(e) => setForm({ ...form, clienteTelefone: e.target.value })} placeholder="(11) 99999-0000" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Área</label>
              <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm">
                {Object.entries(areaLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm">
                {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {isAdmin && advogados.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Advogado Responsável</label>
              <select value={form.advogadoId} onChange={(e) => setForm({ ...form, advogadoId: Number(e.target.value) })} className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm">
                {advogados.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Detalhes sobre o processo..."
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Criar Processo</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export { statusLabels, statusColors, areaLabels, areaColors };
