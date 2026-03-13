import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, FileText, CheckCircle } from "lucide-react";
import { Button } from "./ui-components";
import { useDocumentUpload } from "@/hooks/use-document-upload";
import { useToast } from "@/hooks/use-toast";

export function UploadModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { uploadFiles, isUploading, progress, statusText } = useDocumentUpload();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    try {
      await uploadFiles(acceptedFiles);
      toast({
        title: "Sucesso",
        description: "Documentos enviados com sucesso.",
        variant: "default",
      });
      setTimeout(onClose, 2000);
    } catch (e) {
      toast({
        title: "Erro no envio",
        description: "Ocorreu um erro ao enviar os documentos.",
        variant: "destructive",
      });
    }
  }, [uploadFiles, onClose, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    disabled: isUploading
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => !isUploading && onClose()}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl glass-panel rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="flex justify-between items-center p-6 border-b border-border/50 bg-secondary/30">
          <h2 className="text-xl font-display font-semibold text-white">Enviar Documentos</h2>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isUploading} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-8">
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-secondary/30'}
              ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="w-20 h-20 mx-auto rounded-full bg-secondary/80 flex items-center justify-center mb-6 shadow-inner">
              <UploadCloud className={`w-10 h-10 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Arraste e solte seus arquivos aqui</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Suporta arquivos PDF e DOCX para extração automática de texto.
            </p>
            <Button variant="secondary" className="pointer-events-none">
              Selecionar Arquivos
            </Button>
          </div>

          <AnimatePresence>
            {isUploading && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-secondary/50 rounded-xl p-4 border border-border/50">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-primary font-medium flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {statusText}
                    </span>
                    <span className="text-white">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "easeInOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// Added to prevent missing import
import { Loader2 } from "lucide-react";
