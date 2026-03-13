import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useChatStream(documentId: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    setError(null);
    const newMessage: ChatMessage = { role: "user", content };
    const currentHistory = [...messages];
    
    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          message: content,
          history: currentHistory
        }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) throw new Error('Falha ao comunicar com o assistente');
      if (!res.body) throw new Error('Sem resposta do servidor');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      setMessages(prev => [...prev, { role: "assistant", content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                break;
              }
              if (data.error) {
                setError(data.error);
                break;
              }
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    content: assistantContent,
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Incomplete JSON — will be handled in next chunk
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Ocorreu um erro');
        console.error(err);
      } else if (!(err instanceof Error)) {
        setError('Ocorreu um erro');
        console.error(err);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => setMessages([]);

  return { messages, sendMessage, isTyping, error, clearChat };
}
