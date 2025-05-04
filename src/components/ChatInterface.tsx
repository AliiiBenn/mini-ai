'use client';

import { useChat, type Message } from '@ai-sdk/react';
import { type CoreMessage } from 'ai';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
// import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Removed - Handled by MessageAvatar
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Skeleton } from "@/components/ui/skeleton"; // Removed unused import
import { SendHorizontal } from 'lucide-react'; // Icon for send button
import { ChatContainer } from '@/components/ui/chat-container'; // Import ChatContainer
import { Message as UIMessage, MessageAvatar, MessageContent } from '@/components/ui/message'; // Import Message components
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from '@/components/ui/prompt-input'; // Import PromptInput components
import { TooltipProvider } from '@radix-ui/react-tooltip'; // Needed for PromptInputAction
import { motion } from 'framer-motion'; // Import motion
import { useEffect, useRef, useMemo } from 'react'; // Import useEffect, useRef, and useMemo
import { useRouter } from 'next/navigation';

// Helper function to ensure content is string (basic handling)
function ensureStringContent(content: CoreMessage['content']): string {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        const textPart = content.find(part => part.type === 'text');
        return textPart?.text ?? JSON.stringify(content); // Fallback to JSON string
    }
    return ''; // Fallback for unknown content types
}

// Revised: Convert CoreMessage[] to Message[]
const mapCoreMessagesToMessages = (coreMessages: CoreMessage[]): Message[] => {
    const messages: Message[] = [];
    for (const msg of coreMessages) {
        // Only map roles compatible with the hook's Message type
        if (msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
                id: nanoid(),
                role: msg.role, // Role is now guaranteed to be compatible
                content: ensureStringContent(msg.content),
                createdAt: new Date(), // Provide default createdAt
            });
        } // Skip 'tool' roles
    }
    return messages;
};

// Revised: Convert Message[] to CoreMessage[]
const mapMessagesToCoreMessages = (messages: Message[]): CoreMessage[] => {
    const coreMessages: CoreMessage[] = [];
    for (const msg of messages) {
         // Only map roles compatible with CoreMessage type
         if (msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant') {
             coreMessages.push({
                role: msg.role, // Role is compatible
                content: msg.content,
            });
        } // Skip 'data' roles
    }
    return coreMessages;
};

// Define props interface
interface ChatInterfaceProps {
  chatId?: string | null;
  initialMessages?: CoreMessage[];
}

export function ChatInterface({ chatId: initialChatId, initialMessages = [] }: ChatInterfaceProps) {
  const router = useRouter();
  const prevIsLoadingRef = useRef<boolean>(false);

  // Memoize mapped initial messages - recalculates only when initialMessages content changes
  const memoizedInitialMessages = useMemo(() => {
    console.log("Memoizing initial messages for ID:", initialChatId);
    return mapCoreMessagesToMessages(initialMessages);
  }, [initialMessages]);

  const {
    messages,
    input,
    handleSubmit,
    isLoading,
    error,
    setInput,
    setMessages
  } = useChat({
    api: '/api/chat',
    initialMessages: memoizedInitialMessages,
    id: initialChatId ?? undefined,
  });

  // --- Effect to Reset Messages ONLY on Chat ID Change --- //
  useEffect(() => {
    // Runs ONLY when initialChatId prop changes.
    // Resets messages using the initialMessages prop corresponding to the new ID.
    console.log(`Resetting messages: initialChatId changed to [${initialChatId}]`);
    setMessages(mapCoreMessagesToMessages(initialMessages));
    prevIsLoadingRef.current = false; // Reset loading tracking for new chat
  // We ONLY want this to run when the chat context actually changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [initialChatId]); // *** Depend ONLY on initialChatId ***

  // --- Effect for Saving Chat on Completion --- //
  useEffect(() => {
    const wasLoading = prevIsLoadingRef.current;
    prevIsLoadingRef.current = isLoading; // Update ref immediately

    if (!isLoading && wasLoading) {
        // Read latest state
        const currentMessages = messages;
        const currentInitialMessages = initialMessages; // Read prop directly
        
      if (currentMessages && currentMessages.length > 0) {
        const isExistingChat = !!initialChatId;
        // Simple check: Save only if messages increased compared to initial for this chat
        if (!isExistingChat || currentMessages.length > mapCoreMessagesToMessages(currentInitialMessages).length) {
            console.log('Loading finished, attempting to save chat...');
            const messagesToSave: CoreMessage[] = mapMessagesToCoreMessages(currentMessages);
            const apiEndpoint = isExistingChat ? `/api/chats/${initialChatId}` : '/api/chats';
            const method = isExistingChat ? 'PUT' : 'POST';
    
            fetch(apiEndpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messagesToSave }),
            })
            .then(async (response) => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `Failed to save chat: ${response.statusText}`);
                }
                return response.json();
            })
            .then((savedChat) => {
               if (method === 'POST' && savedChat.id) {
                 router.replace(`/chat/${savedChat.id}`, { scroll: false });
                 console.log("New chat created, saved, and navigating. ID:", savedChat.id);
               } else if (method === 'PUT') {
                 console.log("Chat updated successfully, ID:", initialChatId);
               }
             })
            .catch((saveError) => {
               console.error("--- Error saving chat ---", saveError);
             });
        } else {
             console.log("Loading finished, but no new messages detected to save.");
        }
      }
    }
  }, [isLoading, initialChatId, router, messages, initialMessages]); // Dependencies needed for reading inside

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFormSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
     if (e) e.preventDefault();
     if (!input.trim()) return;
     handleSubmit();
  };

  useEffect(() => {
    if (error) {
      console.error("--- Client-side useChat Error ---", error);
    }
  }, [error]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full w-full">
        {error && (
          <Alert variant="destructive" className="m-4 flex-shrink-0">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message || 'An unknown error occurred.'}</AlertDescription>
          </Alert>
        )}
        <div className="flex-grow overflow-hidden max-w-3xl w-full mx-auto mt-4">
          <ChatContainer
            ref={chatContainerRef}
            className={cn(
              "h-full overflow-y-auto p-4 space-y-4",
              messages.length === 0 && "flex flex-col justify-center items-center"
            )}
          >
            {messages.length > 0
              ? messages.map((m: Message) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <UIMessage
                      className={cn(m.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      {m.role !== 'user' && (
                        <MessageAvatar
                          src=""
                          alt={m.role === 'assistant' ? 'Agent' : 'Other'}
                          fallback={m.role === 'assistant' ? 'A' : m.role.charAt(0).toUpperCase()}
                          className="size-8"
                        />
                      )}
                      <MessageContent
                        markdown
                        className={cn(
                          'max-w-[75%] shadow-sm',
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        )}
                      >
                        {m.content}
                      </MessageContent>
                      {m.role === 'user' && (
                        <MessageAvatar
                          src=""
                          alt="User"
                          fallback="Y"
                          className="size-8"
                        />
                      )}
                    </UIMessage>
                  </motion.div>
                ))
              : !isLoading && (
                <div className="text-center text-muted-foreground">Start the conversation!</div>
              )}
          </ChatContainer>
        </div>
        <div className="p-4 flex-shrink-0 max-w-3xl w-full mx-auto">
          <form onSubmit={handleFormSubmit} className="w-full">
              <PromptInput
                 className="w-full flex items-end"
              >
                 <PromptInputTextarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="min-h-[40px]"
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleFormSubmit();
                      }
                  }}
                 />
                 <PromptInputActions>
                   <PromptInputAction tooltip="Send message">
                     <Button
                       type="submit"
                       disabled={isLoading || !input.trim()}
                     >
                       <SendHorizontal className="size-4" />
                     </Button>
                   </PromptInputAction>
                 </PromptInputActions>
              </PromptInput>
          </form>
        </div>
      </div>
    </TooltipProvider>
  );
} 