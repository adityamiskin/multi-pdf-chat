import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatData } from "@/lib/types";

export default function ChatList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: chats, isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await axios.get("/api/chats");
      return res.data;
    },
  });

  const createChat = useMutation({
    mutationFn: async () => {
      const res = await axios.post("/api/chats");
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      navigate(`/chat/${data.chat_id}`);
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Chats</h1>
      <ul className="space-y-2">
        {chats?.map((chat: ChatData) => (
          <li key={chat.chat_id}>
            <Link
              className="text-blue-500 hover:underline"
              to={`/chat/${chat.chat_id}`}
            >
              {chat.chat_id}
            </Link>
          </li>
        ))}
      </ul>
      <Button className="mt-4" onClick={() => createChat.mutate()}>
        New Chat
      </Button>
    </div>
  );
}
