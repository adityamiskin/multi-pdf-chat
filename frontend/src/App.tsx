import React, { useEffect } from "react";
import {
  Routes,
  Route,
  useNavigate,
  Link,
  useParams,
  useLocation,
} from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Chat from "./pages/Chat";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarMenuSkeleton,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { ChatData } from "./lib/types";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const pathChatId = location.pathname.startsWith("/chat/")
    ? location.pathname.split("/chat/")[1]
    : undefined;

  const currentChatId = pathChatId;

  async function fetchChats() {
    return axios.get("/api/chats").then((res) => res.data);
  }

  const queryClient = useQueryClient();
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
  });

  const createChat = useMutation({
    mutationFn: async () => {
      return axios.post("/api/chats").then((res) => res.data);
    },
    onSuccess: (data: ChatData) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      navigate(`/chat/${data.chat_id}`);
    },
  });

  const deleteChat = useMutation({
    mutationFn: (chatId: string) => {
      return axios.delete(`/api/chats/${chatId}`);
    },
    onSuccess: (_, deletedChatId) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (currentChatId === deletedChatId) {
        navigate("/");
      }
    },
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <Button
              onClick={() => createChat.mutate()}
              disabled={createChat.isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              {createChat.isLoading ? "Creating..." : "New Chat"}
            </Button>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
              <SidebarGroupContent>
                {isLoading ? (
                  <SidebarMenuSkeleton />
                ) : chats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No chats yet</p>
                  </div>
                ) : (
                  <SidebarMenu>
                    {chats.map((chat: ChatData) => (
                      <SidebarMenuItem key={chat.chat_id}>
                        <SidebarMenuButton
                          asChild
                          isActive={currentChatId === chat.chat_id}
                        >
                          <Link
                            to={`/chat/${chat.chat_id}`}
                            className="flex items-center justify-between pr-2"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate text-sm">
                                {chat.messages.length > 0
                                  ? chat.messages[0].content.slice(0, 30) +
                                    "..."
                                  : `Chat ${chat.chat_id.slice(0, 8)}...`}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => deleteChat.mutate(chat.chat_id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 hover:bg-red-100 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main className="w-full">
          <Routes>
            <Route path="/chat/:chatId" element={<Chat />} />
            <Route
              path="*"
              element={
                <div className="flex items-center justify-center h-full bg-gray-50 w-full">
                  <div className="text-center mx-auto p-8">
                    <MessageSquare className="w-16 h-16 mx-auto mb-6 text-gray-300" />
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                      Welcome to PDF Chat
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Upload PDF documents and have intelligent conversations
                      about their content.
                    </p>
                    <Button onClick={() => createChat.mutate()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start New Chat
                    </Button>
                  </div>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
}
