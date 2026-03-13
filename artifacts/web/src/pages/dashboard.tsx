import { useState } from "react";
import { useListDocuments, useSearchDocuments, useListCategories, getListDocumentsQueryKey, getSearchDocumentsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { UploadModal } from "@/components/upload-modal";
import { Input, Button, Card } from "@/components/ui-components";
import { Search, Plus, FileText, Calendar, ChevronRight, Tag } from "lucide-react";
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
  categoryId?: number | null;
  categoryName?: string | null;
}

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const { data: categories } = useListCategories();

  const isSearching = debouncedSearch.trim().length > 0;

  const listParams = { page: 1, limit: 20, ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}) };
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
        categoryId: r.categoryId,
        categoryName: r.categoryName,
      }))
    : (listData?.documents || []).map((d) => ({
        id: d.id,
        title: d.title,
        fileName: d.fileName,
        createdAt: d.createdAt,
        uploaderName: d.uploaderName,
        snippet: null,
        categoryId: d.categoryId,
        categoryName: d.categoryName,
      }));

  const total = isSearching ? searchData?.total || 0 : listData?.total || 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2"
            >
              Acervo Jurídico
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="text-base text-muted-foreground max-w-2xl"
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
          className="relative max-w-3xl mb-6 group"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por termos, processos, partes envolvidas..."
            className="pl-12 h-12 text-base rounded-xl"
          />
        </motion.div>

        {categories && categories.length > 0 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="flex flex-wrap gap-2 mb-10"
          >
            <button
              onClick={() => setSelectedCategoryId(undefined)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                !selectedCategoryId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? undefined : cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedCategoryId === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </motion.div>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
              {isSearching ? "Resultados da Busca" : "Documentos Recentes"}
              {isLoading && <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span></span>}
            </h2>
            <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border">
              {total} encontrados
            </span>
          </div>

          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <ChevronRight className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 mb-4">
                          <div className="p-2.5 rounded-lg bg-secondary border border-border text-primary">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <h3 className="text-base font-display font-semibold text-foreground truncate" title={doc.title}>
                              {doc.title}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">{doc.fileName}</p>
                          </div>
                        </div>

                        {doc.categoryName && (
                          <div className="mb-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                              <Tag className="w-3 h-3" />
                              {doc.categoryName}
                            </span>
                          </div>
                        )}
                        
                        {doc.snippet && (
                          <div className="mb-4 flex-1">
                            <div className="text-sm text-muted-foreground bg-secondary/60 p-3 rounded-lg border border-border leading-relaxed italic line-clamp-3">
                              "{doc.snippet.replace(/<\/?mark>/g, '')}"
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(doc.createdAt)}
                          </div>
                          {doc.uploaderName && (
                            <span className="bg-secondary px-2 py-0.5 rounded-md border border-border">
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
            <div className="text-center py-20 bg-card rounded-2xl border-2 border-dashed border-border">
              <FileText className="w-14 h-14 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum documento encontrado</h3>
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
