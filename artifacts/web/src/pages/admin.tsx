import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useListUsers, useUpdateUser, useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@workspace/api-client-react";
import type { AppUser } from "@workspace/api-client-react";
import { Card, Button, Input } from "@/components/ui-components";
import { ShieldCheck, UserPlus, Search, Pencil, CheckCircle2, XCircle, Power, Eye, EyeOff, Tag, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

const newUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "advogado"]),
});

const editUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  role: z.enum(["admin", "advogado"]),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
});

type NewUserFormData = z.infer<typeof newUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

export default function AdminPanel() {
  const { data: users, isLoading } = useListUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const updateMutation = useUpdateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredUsers = users?.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const openNewUserDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: AppUser) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const toggleActive = async (user: AppUser) => {
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        data: { active: !user.active },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: user.active ? "Usuário desativado" : "Usuário ativado" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao alterar status", description: message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Administração
            </h1>
            <p className="text-muted-foreground">Gerencie o acesso e as permissões da equipe jurídica.</p>
          </div>
          <Button onClick={openNewUserDialog} size="lg">
            <UserPlus className="w-5 h-5 mr-2" />
            Adicionar Usuário
          </Button>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-medium text-foreground">Usuários do Sistema</h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                className="pl-10 h-10 rounded-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary text-muted-foreground text-sm uppercase tracking-wider">
                  <th className="px-6 py-3.5 font-medium">Nome</th>
                  <th className="px-6 py-3.5 font-medium">Papel</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 font-medium">Data de Cadastro</th>
                  <th className="px-6 py-3.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Carregando usuários...
                    </td>
                  </tr>
                ) : filteredUsers?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredUsers?.map((user) => (
                    <tr key={user.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email || "Sem email"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          user.role === "admin"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary text-secondary-foreground border-border"
                        }`}>
                          {user.role === "admin" ? "Administrador" : "Advogado"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.active ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 text-sm">
                            <CheckCircle2 className="w-4 h-4" /> Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                            <XCircle className="w-4 h-4" /> Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                          <Pencil className="w-4 h-4 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(user)}
                          className={user.active ? "hover:text-destructive" : "hover:text-emerald-600"}
                        >
                          <Power className="w-4 h-4 mr-1" />
                          {user.active ? "Desativar" : "Ativar"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <CategoriesSection />
      </div>

      <UserDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        user={editingUser}
      />
    </Layout>
  );
}

function CategoriesSection() {
  const { data: categories, isLoading } = useListCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await createMutation.mutateAsync({ data: { name: newCategoryName.trim() } });
      setNewCategoryName("");
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoria criada com sucesso" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao criar categoria", description: message, variant: "destructive" });
    }
  };

  const handleStartEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      await updateMutation.mutateAsync({ id: editingId, data: { name: editingName.trim() } });
      setEditingId(null);
      setEditingName("");
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoria renomeada" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao renomear", description: message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) return;

    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoria excluída" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao excluir", description: message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-0 overflow-hidden mt-8">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Categorias
        </h2>
      </div>

      <div className="p-5">
        <form onSubmit={handleCreate} className="flex gap-3 mb-6">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nome da nova categoria..."
            className="flex-1"
          />
          <Button type="submit" disabled={!newCategoryName.trim() || createMutation.isPending}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </form>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando categorias...</p>
        ) : categories && categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-secondary text-secondary-foreground border border-border"
              >
                <Tag className="w-3.5 h-3.5 text-primary" />
                {editingId === cat.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") { setEditingId(null); setEditingName(""); }
                    }}
                    autoFocus
                    className="bg-transparent border-b border-primary outline-none text-sm w-24"
                  />
                ) : (
                  <span
                    onDoubleClick={() => handleStartEdit(cat.id, cat.name)}
                    className="cursor-pointer"
                    title="Duplo clique para renomear"
                  >
                    {cat.name}
                  </span>
                )}
                <button
                  onClick={() => handleStartEdit(cat.id, cat.name)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Renomear categoria"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Excluir categoria"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma categoria cadastrada.</p>
        )}
      </div>
    </Card>
  );
}

function UserDialog({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: AppUser | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateUser();
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const isEditing = !!user;

  const newForm = useForm<NewUserFormData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "advogado" },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: user?.name || "", role: user?.role || "advogado", password: "" },
  });

  useEffect(() => {
    if (isOpen) {
      setShowPassword(false);
      if (isEditing) {
        editForm.reset({ name: user.name, role: user.role, password: "" });
      } else {
        newForm.reset({ name: "", email: "", password: "", role: "advogado" });
      }
    }
  }, [isOpen, user, isEditing]);

  const onSubmitNew = async (data: NewUserFormData) => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar usuário");
      }
      toast({ title: "Usuário criado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao criar", description: message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const onSubmitEdit = async (data: EditUserFormData) => {
    if (!user) return;
    try {
      const updateData: Record<string, unknown> = { name: data.name, role: data.role };
      if (data.password && data.password.length >= 6) {
        updateData.password = data.password;
      }
      await updateMutation.mutateAsync({ id: user.id, data: updateData });
      toast({ title: "Usuário atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao atualizar", description: message, variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-card rounded-2xl p-8 shadow-xl border border-border"
      >
        <h2 className="text-2xl font-display font-semibold text-foreground mb-6">
          {isEditing ? "Editar Usuário" : "Novo Usuário"}
        </h2>

        {isEditing ? (
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nome Completo</label>
              <Input {...editForm.register("name")} placeholder="Dr. Fulano de Tal" />
              {editForm.formState.errors.name && (
                <p className="text-destructive text-sm mt-1">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nível de Acesso</label>
              <select
                {...editForm.register("role")}
                className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm"
              >
                <option value="advogado">Advogado (Acesso Padrão)</option>
                <option value="admin">Administrador (Acesso Total)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Nova Senha <span className="text-muted-foreground/60 font-normal">(deixe em branco para manter)</span>
              </label>
              <div className="relative">
                <Input
                  {...editForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {editForm.formState.errors.password && (
                <p className="text-destructive text-sm mt-1">{editForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" isLoading={updateMutation.isPending}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={newForm.handleSubmit(onSubmitNew)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nome Completo</label>
              <Input {...newForm.register("name")} placeholder="Dr. Fulano de Tal" />
              {newForm.formState.errors.name && (
                <p className="text-destructive text-sm mt-1">{newForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
              <Input {...newForm.register("email")} type="email" placeholder="fulano@escritorio.com.br" />
              {newForm.formState.errors.email && (
                <p className="text-destructive text-sm mt-1">{newForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Senha de Acesso</label>
              <div className="relative">
                <Input
                  {...newForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newForm.formState.errors.password && (
                <p className="text-destructive text-sm mt-1">{newForm.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nível de Acesso</label>
              <select
                {...newForm.register("role")}
                className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm"
              >
                <option value="advogado">Advogado (Acesso Padrão)</option>
                <option value="admin">Administrador (Acesso Total)</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" isLoading={isCreating}>
                Criar Usuário
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
