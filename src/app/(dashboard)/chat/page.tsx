'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Flame, User, Loader2, RefreshCw, Wifi } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/chat');
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        const formattedMessages = data.messages.map((msg: { role: string; content: string }, index: number) => ({
          id: `hist-${index}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(),
          source: 'history'
        }));
        setMessages(formattedMessages);
      } else {
        // Welcome message if no history
        setMessages([{
          id: '1',
          role: 'assistant',
          content: "Hey! You're now connected to the main session — same context as Telegram. What can I help you with? 🔥",
          timestamp: new Date(),
        }]);
      }
      setIsConnected(true);
    } catch (error) {
      console.error('Error loading history:', error);
      setIsConnected(false);
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Dashboard loaded, but I couldn't connect to the main session. Check gateway connection.",
        timestamp: new Date(),
      }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      source: 'dashboard'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I couldn't process that request. Please try again.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsConnected(true);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Connection error: ${error}. Check gateway status.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Chat with JDub</h1>
          <p className="text-zinc-400">Connected to main session (shared with Telegram)</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className={isConnected ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}
          >
            <Wifi className="w-3 h-3 mr-1" />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col bg-zinc-900/50 border-zinc-800 overflow-hidden">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Main Session
            <span className="text-sm font-normal text-zinc-500 ml-2">
              Messages sync across all channels
            </span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className={`w-8 h-8 flex items-center justify-center ${message.role === 'assistant' ? 'bg-orange-500/20' : 'bg-zinc-700'}`}>
                    {message.role === 'assistant' ? (
                      <Flame className="w-4 h-4 text-orange-500" />
                    ) : (
                      <User className="w-4 h-4 text-zinc-300" />
                    )}
                  </Avatar>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.role === 'assistant'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'bg-orange-500/20 text-zinc-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.source && (
                        <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-500 py-0">
                          {message.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 bg-orange-500/20 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-orange-500" />
                  </Avatar>
                  <div className="bg-zinc-800 rounded-lg px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-zinc-800">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                rows={2}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
