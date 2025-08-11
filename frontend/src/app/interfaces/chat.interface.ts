export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  groupId?: string;
  meetingId?: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

export interface SendMessageRequest {
  content: string;
  groupId?: string;
  meetingId?: string;
  isPrivate: boolean;
}

export interface ChatRoom {
  id: string;
  type: 'GROUP' | 'MEETING' | 'PRIVATE';
  name: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  participants: string[];
}
