import { useParams } from "wouter";
import { useGetDocument } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, Button, Input } from "@/components/ui-components";
import { useChatStream } from "@/hooks/use-chat-stream";
import { FileText, Send, User, Bot, AlertCircle, Download, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const docId = parseInt(id, 10);
  const { data: document, isLoading: docLoading } = useGetDocument(docId);

  if (docLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto mt-20 text-center glass-panel p-12 rounded-3xl">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Documento não encontrado</h2>
          <p className="text-muted-foreground">O documento solicitado não existe ou você não tem acesso a ele.</p>
        </div>
      </Layout>
    );
  }

  const storagePath = document.storagePath?.startsWith('/objects/')
    ? document.storagePath.slice('/objects/'.length)
    : document.storagePath;
  const fileUrl = `/api/storage/objects/${storagePath}`;
  const isPdf = document.mimeType === 'application/pdf';

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)] p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Pane - Document Viewer */}
        <div className="flex-[3] flex flex-col min-w-0 bg-secondary/30 rounded-3xl border border-border/50 overflow-hidden relative">
          
          <div className="flex-none p-4 px-6 bg-background/50 border-b border-border/50 flex justify-between items-center backdrop-blur-sm z-10">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-display font-semibold text-white truncate" title={document.title}>
                  {document.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="uppercase tracking-wider">{document.mimeType.split('/')[1] || 'FILE'}</span>
                  <span>•</span>
                  <span>Enviado em {formatDate(document.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <a href={fileUrl} target="_blank" rel="noreferrer" download>
              <Button variant="outline" size="sm" className="shrink-0 gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Baixar</span>
              </Button>
            </a>
          </div>

          <div className="flex-1 relative bg-[#1a1b1e]">
            {isPdf ? (
              <iframe 
                src={`${fileUrl}#toolbar=0`} 
                className="w-full h-full border-0"
                title={document.title}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                <div className="max-w-md">
                  <div className="w-24 h-24 mx-auto bg-secondary rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-border/50">
                    <FileText className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white mb-4">Visualização Indisponível</h3>
                  <p className="text-muted-foreground mb-8">
                    Não é possível renderizar documentos DOCX diretamente no navegador. O texto foi extraído e o assistente IA já tem conhecimento do conteúdo.
                  </p>
                  <a href={fileUrl} target="_blank" rel="noreferrer">
                    <Button variant="primary" className="w-full sm:w-auto">
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Abrir Arquivo Original
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - AI Chat */}
        <div className="flex-[2] min-w-[320px] lg:max-w-lg flex flex-col glass-panel rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-border/50 bg-background/50 flex items-center gap-3 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full gold-gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-lg leading-tight">Assistente IA</h3>
              <p className="text-xs text-primary font-medium tracking-wide">JURISDOC GEMINI</p>
            </div>
          </div>

          <ChatInterface documentId={docId} />
        </div>
      </div>
    </Layout>
  );
}

function ChatInterface({ documentId }: { documentId: number }) {
  const { messages, sendMessage, isTyping, error } = useChatStream(documentId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background/30 relative">
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <Bot className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-white font-medium mb-2">Como posso ajudar?</p>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              Faça perguntas específicas sobre cláusulas, prazos ou entidades mencionadas neste documento.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                msg.role === 'user' ? 'bg-secondary border border-border/50' : 'gold-gradient-bg text-primary-foreground'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`p-4 rounded-2xl max-w-[85%] leading-relaxed text-sm ${
                msg.role === 'user' 
                  ? 'bg-secondary text-white border border-border/50 rounded-tr-sm' 
                  : 'bg-primary/10 border border-primary/20 text-blue-50 rounded-tl-sm'
              }`}>
                {msg.content ? (
                  <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }} />
                ) : (
                  <div className="flex space-x-1 items-center h-5">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
        
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={isTyping}
            className="pr-14 rounded-full bg-secondary/80 focus-visible:ring-primary/50"
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="primary" 
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 h-9 w-9 rounded-full"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// simple markdown bold formatter
function formatMessageContent(text: string) {
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}
