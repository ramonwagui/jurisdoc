import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import { useRequestUploadUrl, useCreateDocument } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  
  const queryClient = useQueryClient();
  const requestUrlMutation = useRequestUploadUrl();
  const createDocMutation = useCreateDocument();

  const extractTextFromPDF = async (file: File): Promise<string> => {
    setStatusText(`Extraindo texto de ${file.name}...`);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
      setProgress(10 + Math.round((i / pdf.numPages) * 30)); // 10% to 40%
    }
    return fullText;
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    setStatusText(`Extraindo texto de ${file.name}...`);
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    setProgress(40);
    return result.value;
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setProgress(0);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Extract Text
        let extractedText = "";
        try {
          if (file.type === "application/pdf") {
            extractedText = await extractTextFromPDF(file);
          } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith('.docx')) {
            extractedText = await extractTextFromDOCX(file);
          }
        } catch (err) {
          console.error(`Falha ao extrair texto do arquivo ${file.name}`, err);
          // Continue anyway, but without extracted text
        }

        // 2. Request Presigned URL
        setStatusText(`Preparando upload de ${file.name}...`);
        setProgress(50);
        
        const { uploadURL, objectPath } = await requestUrlMutation.mutateAsync({
          data: {
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream"
          }
        });

        // 3. Upload to GCS
        setStatusText(`Enviando ${file.name} para a nuvem...`);
        setProgress(70);
        
        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file
        });

        if (!uploadRes.ok) throw new Error(`Falha no upload do arquivo ${file.name}`);

        // 4. Save to Database
        setStatusText(`Salvando metadados de ${file.name}...`);
        setProgress(90);
        
        await createDocMutation.mutateAsync({
          data: {
            title: file.name.replace(/\.[^/.]+$/, ""),
            fileName: file.name,
            storagePath: objectPath,
            mimeType: file.type || "application/octet-stream",
            extractedText
          }
        });
        
        setProgress(100);
      }
      
      // Refresh documents
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
