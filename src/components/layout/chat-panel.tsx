import * as React from "react";
import { MessageSquare, Send, X, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePanelState } from "@/hooks/use-panel-state";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatPanel() {
  const { chatCollapsed, toggleChat } = usePanelState();
  // If chatCollapsed is true, panel is closed.
  const isChatOpen = !chatCollapsed;

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [showBubble, setShowBubble] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Hide bubble after 5 seconds to not block content
    const timer = setTimeout(() => setShowBubble(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    // Set initial welcome message on client-side only to avoid hydration mismatch (Date())
    if (messages.length === 0) {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content:
            "Hello! I have access to your database insights. Ask me about trends, user growth, or enhancement performance.",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  React.useEffect(() => {
    // Scroll to bottom on open or new message
    if (isChatOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatOpen, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Prepare messages for API (exclude ID/Timestamp)
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch response");
      }

      const data = await res.json();
      const content =
        data.choices?.[0]?.message?.content ||
        "Sorry, I couldn't process that.";

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, there was an error connecting to the AI.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Visible when chat is closed) */}
      {!isChatOpen && (
        <>
          {/* AI Magic Hint Bubble */}
          {showBubble && (
            <div className="fixed bottom-24 right-6 z-50 animate-bounce pointer-events-none">
              <div className="relative bg-white dark:bg-zinc-800 text-foreground px-4 py-2 rounded-xl shadow-xl border border-border/50">
                <div className="flex items-center gap-2 font-medium text-sm whitespace-nowrap">
                  <span className="text-lg">✨</span>
                  AI Magic inside!
                </div>
                {/* Arrow */}
                <div className="absolute -bottom-2 right-6 h-4 w-4 bg-white dark:bg-zinc-800 border-b border-r border-border/50 transform rotate-45" />
              </div>
            </div>
          )}

          <Button
            onClick={toggleChat}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in duration-300 bg-primary text-primary-foreground hover:scale-105"
            size="icon"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Backdrop */}
      {isChatOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm sm:hidden"
          onClick={toggleChat}
        />
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-full sm:w-[400px] border-l bg-card shadow-2xl transition-transform duration-300 ease-in-out transform",
          isChatOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">AI Assistant</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleChat}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "",
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-lg p-3 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {msg.content}
                  <div
                    className={cn(
                      "text-[10px] mt-1 opacity-70",
                      msg.role === "user"
                        ? "text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 border">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg p-3 text-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-card">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your data..."
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isTyping || !inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
