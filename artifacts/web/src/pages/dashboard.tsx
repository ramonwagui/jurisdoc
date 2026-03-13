import { useState } from "react";
import { useListDocuments, useSearchDocuments, getListDocumentsQueryKey, getSearchDocumentsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { UploadModal } from "@/components/upload-modal";
import { Input, Button, Card } from "@/components/ui-components";
import { Search, Plus, FileText, Calendar, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface DocumentListItem {
  id: number;
  title: string;
  fileName: string;
  createdAt: string;
  uploaderName?: string | null;
  snippet?: string | null;
}

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const isSearching = debouncedSearch.trim().length > 0;

  const listParams = { page: 1, limit: 20 };
  const { data: listData, isLoading: listLoading } = useListDocuments(
    listParams,
    { query: { queryKey: getListDocumentsQueryKey(listParams), enabled: !isSearching } }
  );
  const searchParams = { q: debouncedSearch, page: 1, limit: 20 };
  const { data: searchData, isLoading: searchLoading } = useSearchDocuments(
    searchParams,
    { query: { queryKey: getSearchDocumentsQueryKey(searchParams), enabled: isSearching } }
  );

  const isLoading = isSearching ? searchLoading : listLoading;

  const documents: DocumentListItem[] = isSearching
    ? (searchData?.results || []).map((r) => ({
        id: r.id,
        title: r.title,
        fileName: r.fileName,
        createdAt: r.createdAt,
        uploaderName: r.uploaderName,
        snippet: r.snippet,
      }))
    : (listData?.documents || []).map((d) => ({
        id: d.id,
        title: d.title,
        fileName: d.fileName,
        createdAt: d.createdAt,
        uploaderName: d.uploaderName,
        snippet: null,
      }));

  const total = isSearching ? searchData?.total || 0 : listData?.total || 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="text-4xl md:text-5xl font-display font-bold text-white mb-4"
            >
              Acervo Jurídico
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl"
            >
              Gerencie, busque e analise seus documentos com o poder da Inteligência Artificial.
            </motion.p>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Button size="lg" onClick={() => setIsUploadModalOpen(true)} className="w-full md:w-auto">
              <Plus className="w-5 h-5 mr-2" />
              Enviar Documentos
            </Button>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="relative max-w-3xl mb-12 group"
        >
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por termos, processos, partes envolvidas..."
            className="pl-14 h-16 text-lg rounded-2xl bg-secondary/80 border-2 border-border focus-visible:border-primary shadow-inner"
          />
        </motion.div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-white flex items-center gap-2">
              {isSearching ? "Resultados da Busca" : "Documentos Recentes"}
              {isLoading && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span></span>}
            </h2>
            <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              {total} encontrados
            </span>
          </div>

          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {documents.map((doc, i) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    layout
                  >
                    <Link href={`/document/${doc.id}`}>
                      <Card className="h-full cursor-pointer hover-lift group relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <ChevronRight className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-4 mb-4">
                          <div className="p-3 rounded-xl bg-secondary border border-border/50 text-primary">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <h3 className="text-lg font-display font-semibold text-white truncate" title={doc.title}>
                              {doc.title}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">{doc.fileName}</p>
                          </div>
                        </div>
                        
                        {doc.snippet && (
                          <div className="mb-6 flex-1">
                            <div className="text-sm text-gray-300 bg-background/50 p-4 rounded-xl border border-border/50 leading-relaxed italic line-clamp-3">
                              "{doc.snippet.replace(/<\/?mark>/g, '')}"
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(doc.createdAt)}
                          </div>
                          {doc.uploaderName && (
                            <span className="bg-secondary px-2 py-1 rounded-md">
                              Por {doc.uploaderName}
                            </span>
                          )}
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : !isLoading ? (
            <div className="text-center py-24 glass-panel rounded-3xl border-dashed">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-white mb-2">Nenhum documento encontrado</h3>
              <p className="text-muted-foreground">
                {isSearching 
                  ? "Tente usar termos diferentes." 
                  : "Envie seu primeiro documento para começar."
                }
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
    </Layout>
  );
}
