import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import ChatMessage from "../components/ChatMessage";
import DocumentUploader from "../components/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ChatData, Message } from "@/lib/types";

export default function Chat() {
  const { chatId } = useParams<{ chatId: string }>();
  const [query, setQuery] = useState("");
  const [streamed, setStreamed] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamed]);

  const { data: chatData, refetch } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const res = await axios.get(`/api/chats/${chatId}`);
      return res.data;
    },
    enabled: !!chatId,
    onSuccess: (data: ChatData) => setMessages(data.messages),
  });

  const handleQuery = async () => {
    if (!query.trim() || !chatId || isLoading) return;

    const userQuery = query;
    setQuery("");
    setStreamed("");
    setIsLoading(true);
    setMessages((m) => [...m, { role: "user", content: userQuery }]);

    try {
      const response = await fetch(`/api/chats/${chatId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!response.body) {
        setIsLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantMsg = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          assistantMsg += chunk;
          setStreamed((s) => s + chunk);
        }
      }

      setMessages((m) => [...m, { role: "assistant", content: assistantMsg }]);
      setStreamed("");
      await refetch();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!chatId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Chat {chatId?.slice(0, 8)}...
          </h1>
          {chatData?.attachments.length ? (
            <p className="text-sm text-gray-500 mt-1">
              {chatData.attachments.length} document(s) attached
            </p>
          ) : null}
        </div>

        <DocumentUploader chatId={chatId!} />
      </div>

      {/* Attachments */}
      {chatData?.attachments.length ? (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex flex-wrap gap-2">
            {chatData.attachments.map((file, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200"
              >
                <Paperclip className="w-3 h-3" />
                {file}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col w-full mx-auto flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && !streamed && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>
                  Start a conversation by asking a question about your documents
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
              sources={msg.sources}
            />
          ))}

          {streamed && <ChatMessage role="assistant" content={streamed} />}

          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Textarea
                placeholder="Ask a question about your documents..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleQuery()
                }
                disabled={isLoading}
                className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Button onClick={handleQuery} disabled={!query.trim() || isLoading}>
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
