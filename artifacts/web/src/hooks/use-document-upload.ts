import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  
  const queryClient = useQueryClient();

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setProgress(0);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setStatusText(`Enviando ${file.name}...`);
        setProgress(Math.round(((i) / files.length) * 80) + 10);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

        const response = await fetch(`${API_BASE}/api/storage/upload-document`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
          throw new Error(err.error || `Falha no upload de ${file.name}`);
        }

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      await queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setStatusText("Concluído!");
      
    } catch (err) {
      console.error(err);
      setStatusText("Erro durante o upload");
      throw err;
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
        setStatusText("");
      }, 2000);
    }
  };

  return { uploadFiles, isUploading, progress, statusText };
}
