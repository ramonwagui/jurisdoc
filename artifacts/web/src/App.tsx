import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { useCurrentUser } from "@/hooks/use-current-user";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import PendingAccess from "@/pages/pending-access";
import Dashboard from "@/pages/dashboard";
import DocumentDetail from "@/pages/document-detail";
import AdminPanel from "@/pages/admin";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isAdmin, isProvisioned, isNotProvisioned, isLoading: isUserLoading } = useCurrentUser();

  if (isLoading || (isAuthenticated && isUserLoading)) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  if (isNotProvisioned) {
    return <Redirect to="/acesso-pendente" />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function PendingAccessGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isProvisioned, isLoading: isUserLoading } = useCurrentUser();

  if (isLoading || (isAuthenticated && isUserLoading)) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  if (isProvisioned) {
    return <Redirect to="/" />;
  }

  return <PendingAccess />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/acesso-pendente" component={PendingAccessGuard} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/document/:id" component={() => <ProtectedRoute component={DocumentDetail} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPanel} adminOnly />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
