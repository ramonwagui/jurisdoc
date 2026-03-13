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
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto mt-20 text-center bg-card p-12 rounded-2xl border border-border shadow-sm">
          <AlertCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Documento não encontrado</h2>
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
      <div className="h-[calc(100vh-64px)] p-4 sm:p-5 flex flex-col lg:flex-row gap-5">
        <div className="flex-[3] flex flex-col min-w-0 bg-card rounded-2xl border border-border overflow-hidden relative shadow-sm">
          
          <div className="flex-none p-4 px-6 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-display font-semibold text-foreground truncate" title={document.title}>
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

          <div className="flex-1 relative bg-secondary">
            {isPdf ? (
              <iframe 
                src={`${fileUrl}#toolbar=0`} 
                className="w-full h-full border-0"
                title={document.title}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                <div className="max-w-md">
                  <div className="w-20 h-20 mx-auto bg-card rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-border">
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground mb-4">Visualização Indisponível</h3>
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

        <div className="flex-[2] min-w-[320px] lg:max-w-lg flex flex-col bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full brand-gradient-bg flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-base leading-tight">Assistente IA</h3>
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
  const { messages, sendMessage, isTyping, isRevealing, error } = useChatStream(documentId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping, isRevealing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <Bot className="w-14 h-14 text-muted-foreground mb-4 opacity-40" />
            <p className="text-foreground font-medium mb-1">Como posso ajudar?</p>
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
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-secondary border border-border' : 'brand-gradient-bg text-white'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-muted-foreground" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-3.5 rounded-xl max-w-[85%] leading-relaxed text-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-secondary border border-border text-foreground rounded-tl-sm'
              }`}>
                {msg.content ? (
                  <div className="prose prose-sm max-w-none">
                    <span dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }} />
                    {msg.role === 'assistant' && isRevealing && i === messages.length - 1 && (
                      <span className="inline-block w-[2px] h-[1em] bg-foreground ml-0.5 align-middle animate-blink" />
                    )}
                  </div>
                ) : msg.role === 'assistant' && i === messages.length - 1 && isTyping ? (
                  <div className="flex space-x-1 items-center h-5">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ))
        )}
        
        {error && (
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={isTyping}
            className="pr-12 rounded-full"
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="primary" 
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 h-8 w-8 rounded-full"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function formatMessageContent(text: string) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  let html = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}
