import { Bot, FileText } from "lucide-react";
import { Badge } from "./ui/badge";
import { Markdown } from "./ui/markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: { [key: string]: any }[];
}

export default function ChatMessage({
  role,
  content,
  sources,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-start gap-3 mb-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`max-w-[70%] ${isUser ? "order-first rounded-lg p-2 text-foreground bg-secondary" : ""}`}
      >
        <Markdown>{content}</Markdown>

        {sources && sources.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <FileText className="w-3 h-3" />
              <span>Sources:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((s, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs text-gray-600"
                >
                  {s.source || JSON.stringify(s)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
