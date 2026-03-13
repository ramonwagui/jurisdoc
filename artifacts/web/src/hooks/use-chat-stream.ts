import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAR_INTERVAL_MS = 18;

export function useChatStream(documentId: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const queueRef = useRef<string>("");
  const displayedRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamDoneRef = useRef(false);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      stopInterval();
    };
  }, [stopInterval]);

  const startRevealing = useCallback(() => {
    if (intervalRef.current) return;
    setIsRevealing(true);

    intervalRef.current = setInterval(() => {
      const queue = queueRef.current;
      const displayed = displayedRef.current;

      if (displayed.length < queue.length) {
        const nextChunkEnd = Math.min(displayed.length + 1, queue.length);
        const newDisplayed = queue.slice(0, nextChunkEnd);
        displayedRef.current = newDisplayed;

        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (!last || last.role !== 'assistant') return prev;
          updated[updated.length - 1] = { ...last, content: newDisplayed };
          return updated;
        });
      } else if (streamDoneRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRevealing(false);
      }
    }, CHAR_INTERVAL_MS);
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    stopInterval();
    queueRef.current = "";
    displayedRef.current = "";
    streamDoneRef.current = false;
    setIsRevealing(false);

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
                queueRef.current += data.content;
                startRevealing();
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
      streamDoneRef.current = true;
      abortControllerRef.current = null;
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopInterval();
    setMessages([]);
    queueRef.current = "";
    displayedRef.current = "";
    streamDoneRef.current = false;
    setIsRevealing(false);
    setIsTyping(false);
  };

  const isBusy = isTyping || isRevealing;

  return { messages, sendMessage, isTyping: isBusy, isRevealing, error, clearChat };
}
