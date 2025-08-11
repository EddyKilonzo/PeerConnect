export interface Meeting {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  isRecurring: boolean;
  recurrencePattern?: string;
  maxParticipants?: number;
  currentParticipants: number;
  isPrivate: boolean;
  groupId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  participants: MeetingParticipant[];
}

export interface MeetingParticipant {
  id: string;
  userId: string;
  meetingId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE';
  joinedAt?: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

export interface CreateMeetingRequest {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  isRecurring: boolean;
  recurrencePattern?: string;
  maxParticipants?: number;
  isPrivate: boolean;
  groupId?: string;
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  isRecurring?: boolean;
  recurrencePattern?: string;
  maxParticipants?: number;
  isPrivate?: boolean;
}
