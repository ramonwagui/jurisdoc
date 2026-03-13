import { Layout } from "@/components/layout";
import { Button } from "@/components/ui-components";
import { Link } from "wouter";
import { Scale } from "lucide-react";

export default function NotFound() {
  return (
    <Layout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-8 border border-border/50 shadow-2xl">
          <Scale className="w-12 h-12 text-primary opacity-50" />
        </div>
        <h1 className="text-6xl font-display font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-medium text-muted-foreground mb-8">Página não encontrada</h2>
        <p className="text-lg text-gray-400 max-w-md mb-10">
          A página que você está procurando pode ter sido removida, renomeada ou está temporariamente indisponível.
        </p>
        <Link href="/">
          <Button size="lg" className="px-10">
            Voltar ao Início
          </Button>
        </Link>
      </div>
    </Layout>
  );
}
