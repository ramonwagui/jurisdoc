import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Scale, LogOut, FileText, Search, ShieldAlert, User as UserIcon } from "lucide-react";
import { Button } from "./ui-components";
import { motion } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: user } = useGetCurrentUser();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50 rounded-none rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl gold-gradient-bg flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">
                <Scale className="w-6 h-6" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-white group-hover:gold-gradient-text transition-colors duration-300">
                Juris<span className="text-primary font-light italic">Doc</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-2 bg-secondary/50 p-1.5 rounded-2xl border border-border/50">
              <NavLink href="/" active={location === "/"} icon={<FileText className="w-4 h-4" />}>
                Documentos
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink href="/admin" active={location === "/admin"} icon={<ShieldAlert className="w-4 h-4" />}>
                  Administração
                </NavLink>
              )}
            </nav>

            <div className="flex items-center gap-4">
              {user && (
                <div className="hidden sm:flex items-center gap-3 mr-4 border-r border-border/50 pr-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
                    <UserIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={() => logout()} title="Sair do sistema" className="hover:bg-destructive/20 hover:text-destructive">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

function NavLink({ href, active, children, icon }: { href: string, active: boolean, children: React.ReactNode, icon: React.ReactNode }) {
  return (
    <Link href={href} className={`
      relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300
      ${active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-white hover:bg-secondary'}
    `}>
      {active && (
        <motion.div 
          layoutId="nav-pill" 
          className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/20" 
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {children}
      </span>
    </Link>
  );
}
