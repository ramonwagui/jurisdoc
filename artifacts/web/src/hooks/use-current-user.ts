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

type CurrentUserResult = 
  | { status: "provisioned"; user: AppUser }
  | { status: "not_provisioned" }
  | { status: "unauthenticated" };

async function fetchCurrentUser(): Promise<CurrentUserResult> {
  const res = await fetch("/api/users/me", { credentials: "include" });
  if (res.status === 401) return { status: "unauthenticated" };
  if (res.status === 403) return { status: "not_provisioned" };
  if (!res.ok) throw new Error("Falha ao buscar usuário");
  const user = await res.json();
  return { status: "provisioned", user };
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery<CurrentUserResult>({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });

  const user = data?.status === "provisioned" ? data.user : null;
  const isProvisioned = data?.status === "provisioned";
  const isNotProvisioned = data?.status === "not_provisioned";

  return {
    user,
    isLoading,
    isAdmin: user?.role === "admin",
    isProvisioned,
    isNotProvisioned,
    error,
  };
}
