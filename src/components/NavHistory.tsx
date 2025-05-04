'use client';

import React, { useState, useEffect } from 'react';
import { getUserChats } from '@/lib/actions/chatActions'; // Import the server action
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton, // Use skeleton for loading state
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PlusCircle, MessageSquare } from 'lucide-react'; // Icons
import { cn } from '@/lib/utils';

// Define the expected shape of a chat object from the server action
type ChatHistoryItem = {
  id: string;
  title: string | null;
  updatedAt: Date;
};

interface NavHistoryProps {
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  currentChatId: string | null;
}

export function NavHistory({ onSelectChat, onNewChat, currentChatId }: NavHistoryProps) {
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedChats = await getUserChats();
        setChats(fetchedChats);
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
        setError("Couldn't load history.");
      }
      setIsLoading(false);
    };

    fetchChats();
  }, []); // Fetch only on mount

  return (
    <SidebarGroup className="flex-grow overflow-y-auto group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between mb-2">
        <SidebarGroupLabel className="px-2">History</SidebarGroupLabel>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={onNewChat}
          aria-label="New Chat"
        >
          <PlusCircle className="size-4" />
        </Button>
      </div>

      <SidebarMenu>
        {isLoading ? (
          // Show skeletons while loading
          <>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSkeleton showIcon />
          </>
        ) : error ? (
          <p className="px-2 text-xs text-destructive">{error}</p>
        ) : chats.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">No chats yet.</p>
        ) : (
          chats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton
                onClick={() => onSelectChat(chat.id)}
                isActive={chat.id === currentChatId}
                tooltip={chat.title || 'Chat'}
                className="justify-start"
              >
                <MessageSquare className="size-4 shrink-0" />
                <span className="truncate">{chat.title || 'Untitled Chat'}</span>
                {/* Add delete action later */}
                {/* <SidebarMenuAction showOnHover>...</SidebarMenuAction> */}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
} 