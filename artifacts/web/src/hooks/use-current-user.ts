import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";

interface AppUser {
  id: number;
  replitUserId: string;
  name: string;
  email: string | null;
  role: "admin" | "advogado";
  active: boolean;
  createdAt: string;
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery<AppUser>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao buscar usuário");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  return {
    user: data ?? null,
    isLoading,
    isAdmin: data?.role === "admin",
    error,
  };
}
