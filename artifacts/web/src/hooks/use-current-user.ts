import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";

interface AppUser {
  id: number;
  name: string;
  email: string | null;
  role: "admin" | "advogado";
  active: boolean;
  createdAt: string;
}

async function fetchCurrentUser(): Promise<AppUser | null> {
  const res = await fetch("/api/users/me", { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuth();

  const { data: user, isLoading, error } = useQuery<AppUser | null>({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });

  return {
    user: user ?? null,
    isLoading,
    isAdmin: user?.role === "admin",
    error,
  };
}
