import * as React from "react";
import { MessageSquare, Send, X, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePanelState } from "@/hooks/use-panel-state";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const { chatCollapsed, toggleChat } = usePanelState();
  const isChatOpen = !chatCollapsed;

  const [messages, setMessages] = React.useState([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [showBubble, setShowBubble] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowBubble(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (messages.length === 0) {
      setHasError(false); // Reset error state on new chat
      setMessages([
        {
          id: "1",
          role: "assistant",
          content:
            "Hey! 👋 I'm Velo, your data sidekick. Ask me anything about user trends, prompts, or how Velocity is performing. I'll dig into the numbers for you!",
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length]);

  React.useEffect(() => {
    if (isChatOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatOpen, isTyping]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
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
        throw new Error(errData.error || "API_ERROR");
      }

      const data = await res.json();
      const content =
        data.choices?.[0]?.message?.content ||
        "Sorry, I couldn't process that.";

      // Check if it's the max turns message (contains "rabbit hole" from our custom message)
      const isMaxTurns =
        content.includes("rabbit hole") || content.includes("simpler question");

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: isMaxTurns
          ? "Oops, I got a bit lost in the data! 🐰 Please click **New Chat** above to start fresh with a simpler question."
          : content,
        timestamp: new Date(),
        isError: isMaxTurns,
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (isMaxTurns) {
        setHasError(true);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "😔 Sorry, there was an issue connecting to the AI. Please try again in a moment, or click **New Chat** to start fresh.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
      setHasError(true);
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
            <div
              className="fixed bottom-24 right-6 z-50 animate-bounce pointer-events-none"
              style={{
                bottom: "calc(6rem + env(safe-area-inset-bottom))",
                right: "max(1.5rem, env(safe-area-inset-right))",
              }}
            >
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
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in duration-300 bg-primary text-primary-foreground hover:scale-105 min-h-[44px] min-w-[44px]"
            style={{
              bottom: "max(1.5rem, env(safe-area-inset-bottom))",
              right: "max(1.5rem, env(safe-area-inset-right))",
            }}
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
          "fixed inset-y-0 right-0 z-40 w-full sm:w-[400px] max-w-[100vw] border-l bg-card shadow-2xl transition-transform duration-300 ease-in-out transform",
          isChatOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Velo</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                New Chat
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleChat}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
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
                      : "bg-muted text-foreground"
                  )}
                >
                  {msg.content}
                  <div
                    className={cn(
                      "text-[10px] mt-1 opacity-70",
                      msg.role === "user"
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
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
            {hasError && (
              <p className="text-xs text-muted-foreground text-center mb-2">
                Click "New Chat" above to continue
              </p>
            )}
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  hasError
                    ? "Start a new chat to continue..."
                    : "Ask about your data..."
                }
                className="flex-1"
                disabled={hasError}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isTyping || !inputValue.trim() || hasError}
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
