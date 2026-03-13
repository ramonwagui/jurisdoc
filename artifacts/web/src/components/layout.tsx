import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Scale, LogOut, FileText, ShieldAlert, User as UserIcon, Menu, X, Briefcase } from "lucide-react";
import { Button } from "./ui-components";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: user } = useGetCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Documentos", icon: <FileText className="w-4 h-4" /> },
    { href: "/processos", label: "Processos", icon: <Briefcase className="w-4 h-4" /> },
    ...(user?.role === "admin"
      ? [{ href: "/admin", label: "Administração", icon: <ShieldAlert className="w-4 h-4" /> }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg brand-gradient-bg flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-all duration-300">
                <Scale className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">
                Juris<span className="brand-gradient-text font-normal italic">Doc</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 bg-secondary p-1 rounded-xl">
              {navItems.map((item) => (
                <NavLink key={item.href} href={item.href} active={item.href === "/" ? location === "/" : location.startsWith(item.href)} icon={item.icon}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-3 mr-2 border-r border-border pr-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center border border-border">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={() => logout()} title="Sair do sistema" className="hidden sm:flex hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-border"
            >
              <div className="px-4 py-4 space-y-2">
                {user && (
                  <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-secondary rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center border border-border">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  </div>
                )}
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      (item.href === "/" ? location === "/" : location.startsWith(item.href))
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do sistema
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

function NavLink({ href, active, children, icon }: { href: string; active: boolean; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Link href={href} className={`
      relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300
      ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}
    `}>
      {active && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 bg-primary rounded-lg shadow-sm"
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
