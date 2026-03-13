import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListUsers, useCreateUser, useUpdateUser, AppUser } from "@workspace/api-client-react";
import { Card, Button, Input } from "@/components/ui-components";
import { ShieldCheck, UserPlus, Search, Pencil, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

const userSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  role: z.enum(["admin", "advogado"]),
  replitUserId: z.string().min(1, "Replit User ID é obrigatório para novos usuários").optional()
});

export default function AdminPanel() {
  const { data: users, isLoading } = useListUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewUserDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: AppUser) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-3 flex items-center gap-3">
              <ShieldCheck className="w-10 h-10 text-primary" />
              Administração
            </h1>
            <p className="text-muted-foreground">Gerencie o acesso e as permissões da equipe jurídica.</p>
          </div>
          <Button onClick={openNewUserDialog} size="lg" className="shadow-primary/20">
            <UserPlus className="w-5 h-5 mr-2" />
            Adicionar Usuário
          </Button>
        </div>

        <Card className="p-0 overflow-hidden bg-secondary/20">
          <div className="p-6 border-b border-border/50 bg-background/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-medium text-white">Usuários do Sistema</h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar usuário..." 
                className="pl-10 h-10 rounded-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30 text-muted-foreground text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium">Papel</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Data de Cadastro</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
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
                    <tr key={user.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email || 'Sem email'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          user.role === 'admin' 
                            ? 'bg-primary/10 text-primary border-primary/30' 
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.active ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
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
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <UserDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        user={editingUser} 
      />
    </Layout>
  );
}

function UserDialog({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: AppUser | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  
  const isEditing = !!user;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "advogado",
      replitUserId: user?.replitUserId || ""
    }
  });

  // update form when user prop changes
  useState(() => {
    if (isOpen) {
      reset({
        name: user?.name || "",
        email: user?.email || "",
        role: user?.role || "advogado",
        replitUserId: user?.replitUserId || ""
      });
    }
  });

  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ 
          id: user.id, 
          data: { name: data.name, role: data.role as any, active: true } // simple hardcoded active for now
        });
        toast({ title: "Usuário atualizado com sucesso" });
      } else {
        if (!data.replitUserId) {
          toast({ title: "Replit User ID é obrigatório", variant: "destructive" });
          return;
        }
        await createMutation.mutateAsync({ 
          data: { 
            name: data.name, 
            email: data.email || undefined, 
            role: data.role as any, 
            replitUserId: data.replitUserId 
          } 
        });
        toast({ title: "Usuário criado com sucesso" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md glass-panel rounded-3xl p-8 shadow-2xl"
      >
        <h2 className="text-2xl font-display font-semibold text-white mb-6">
          {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Replit User ID</label>
              <Input {...register("replitUserId")} placeholder="Obrigatório para o login SSO" />
              {errors.replitUserId && <p className="text-destructive text-sm mt-1">{errors.replitUserId.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nome Completo</label>
            <Input {...register("name")} placeholder="Dr. Fulano" />
            {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email (opcional)</label>
            <Input {...register("email")} placeholder="contato@escritorio.com" type="email" />
            {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nível de Acesso</label>
            <select 
              {...register("role")}
              className="w-full h-12 rounded-xl border border-border bg-input/50 px-4 text-white focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="advogado">Advogado (Acesso Padrão)</option>
              <option value="admin">Administrador (Acesso Total)</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              Salvar Usuário
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
