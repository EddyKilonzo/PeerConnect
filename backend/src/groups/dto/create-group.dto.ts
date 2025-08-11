export interface CreateGroupDto {
  name: string;
  description: string;
  topicId: string;
  isPrivate: boolean;
  isLocked: boolean; // Group can be locked by admin
  maxMembers?: number;
  rules?: string[];
  tags?: string[];
  allowAnonymous: boolean; // Allow users to use anonymous names
}

export interface GroupMemberDto {
  userId: string;
  displayName: string; // Can be anonymous or real name
  isAnonymous: boolean;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN' | 'HEAD'; // HEAD is the group creator/owner
  joinedAt: Date;
  lastSeen: Date;
  isOnline: boolean;
}

export interface GroupRoomDto {
  id: string;
  name: string;
  type: 'VOICE' | 'TEXT';
  description?: string;
  isActive: boolean;
  isLocked: boolean; // Room can be locked by moderators
  currentParticipants: number;
  maxParticipants?: number;
  createdBy: string; // User ID who created the room
}

export interface GroupInviteDto {
  groupId: string;
  invitedUserId: string;
  invitedBy: string;
  expiresAt: Date;
  inviteCode: string; // Unique invite code
  maxUses?: number; // Limit how many times invite can be used
  currentUses: number;
}

export interface GroupModerationDto {
  action: 'WARN' | 'MUTE' | 'LISTENER_RESPONSE' | 'LOCK_ROOM' | 'LOCK_GROUP';
  userId: string;
  reason: string;
  duration?: number; // in minutes, for temporary actions
  moderatorId?: string; // Optional for listener responses
  listenerId?: string; // For listener response actions
  targetType: 'USER' | 'ROOM' | 'GROUP';
  targetId?: string; // For room/group actions
}

export interface ContentFilterDto {
  content: string;
  type: 'MESSAGE' | 'VOICE_TRANSCRIPT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  flaggedTerms: string[];
  suggestedAction:
    | 'WARN'
    | 'MUTE'
    | 'LISTENER_RESPONSE'
    | 'BAN'
    | 'LOCK_ROOM'
    | 'NONE';
  confidence: number; // AI confidence score (0-1)
}

export interface GroupLockDto {
  groupId: string;
  isLocked: boolean;
  lockedBy: string; // User ID who locked/unlocked
  reason?: string;
  lockedAt: Date;
  unlockAt?: Date; // For temporary locks
}

export interface AnonymousUserDto {
  userId: string;
  anonymousName: string; // Generated anonymous name
  groupId: string;
  createdAt: Date;
  lastUsed: Date;
}

export interface ListenerResponseDto {
  id: string;
  groupId: string;
  userId: string; // User who triggered the response
  listenerId: string; // Listener who is responding
  content: string; // The flagged content
  flaggedTerms: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  responseContent: string; // Listener's response message
  responseType:
    | 'SUPPORT'
    | 'GUIDANCE'
    | 'RESOURCE'
    | 'ESCALATION'
    | 'CLARIFICATION';
  createdAt: Date;
  respondedAt?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
  escalationReason?: string;
  followUpRequired: boolean;
  followUpNotes?: string;
}
