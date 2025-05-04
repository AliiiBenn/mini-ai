'use client';

import { AppSidebar } from "@/components/AppSidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { ChatInterface } from '@/components/ChatInterface';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { type CoreMessage } from 'ai'; // Import CoreMessage type

// Define type for Chat data expected from API
type ChatData = {
    id: string;
    title?: string | null;
    messages: CoreMessage[]; // Assuming messages are stored as CoreMessage[]
    createdAt: string; // Or Date
    updatedAt: string; // Or Date
    userId: string;
};

// Reusable MainContent component, now accepting initial props
function MainContent({ initialMessages, chatId }: { initialMessages: CoreMessage[], chatId: string }) {
    const { state: sidebarState } = useSidebar();

    return (
        <SidebarInset>
            {sidebarState === 'expanded' && (
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:h-[60px]">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                         {/* Maybe display chat title here? */}
                    </div>
                </header>
            )}
            <main className="flex flex-1 flex-col p-0">
                <ChatInterface initialMessages={initialMessages} chatId={chatId} />
            </main>
        </SidebarInset>
    );
}

function FloatingSidebarTrigger() {
    const { state: sidebarState } = useSidebar();
    return (
        <SidebarTrigger
            className={cn(
                "fixed top-4 left-4 z-50",
                sidebarState === 'expanded' ? "hidden" : "block"
            )}
        />
    )
}

export default function ChatPage() {
    const router = useRouter();
    const params = useParams();
    const chatId = params?.chatId as string | undefined;
    const { data: session, status } = useSession();
    const [chatData, setChatData] = useState<ChatData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Memoize the messages from chatData --- 
    const memoizedMessages = useMemo(() => {
        // Ensure messages are CoreMessage[] and handle potential null/undefined chatData
        const messages = chatData?.messages;
        return (Array.isArray(messages) ? messages : []) as CoreMessage[];
    }, [chatData]); // Recalculate only when chatData reference changes

    useEffect(() => {
        // Redirect if status is determined and user is unauthenticated
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated' && chatId) {
            setIsLoading(true);
            setError(null);
            fetch(`/api/chats/${chatId}`)
                .then(async (res) => {
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({})); // Try parsing error body
                        throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then((data: ChatData) => {
                    // Validate or sanitize messages if needed
                    // Ensure messages are in CoreMessage format
                    const validMessages = (Array.isArray(data.messages) ? data.messages : []) as CoreMessage[];
                    setChatData({...data, messages: validMessages });
                })
                .catch((err) => {
                    console.error("Failed to fetch chat data:", err);
                    setError(err.message || 'Failed to load chat');
                    // Optionally redirect if chat not found (e.g., err.message contains '404')
                    // if (err.message.includes('404')) router.push('/');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else if (status === 'authenticated' && !chatId) {
             // Should not happen if routing is correct, but handle defensively
             router.push('/'); // Redirect to new chat page
        }
    }, [status, chatId, router]);

    // Define navigation handlers
    const handleSelectChat = (selectedChatId: string) => {
        // Avoid redundant navigation if already on the page
        if (selectedChatId !== chatId) {
            router.push(`/chat/${selectedChatId}`);
        }
    };

    const handleNewChat = () => {
        router.push('/');
    };

    // Loading state for session check
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading session...</p>
            </div>
        );
    }

    // Loading state for chat data fetching
    if (isLoading && status === 'authenticated') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading chat...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-red-500">Error: {error}</p>
                <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Go to New Chat
                </button>
            </div>
        );
    }

    // Render the chat interface if authenticated and data is loaded
    if (status === 'authenticated' && chatData && chatId) {
        return (
            <SidebarProvider>
                <FloatingSidebarTrigger />
                <AppSidebar
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                    currentChatId={chatId}
                />
                <MainContent initialMessages={memoizedMessages} chatId={chatId} />
            </SidebarProvider>
        );
    }

    // Fallback or redirect state
    return null;
} 