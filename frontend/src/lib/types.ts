export interface Message {
  role: string;
  content: string;
  sources?: any[];
}

export interface ChatData {
  chat_id: string;
  messages: Message[];
  attachments: string[];
}
