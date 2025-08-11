export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  isPrivate: boolean;
  maxMembers?: number;
  currentMembers: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  members: GroupMember[];
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  joinedAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  imageUrl?: string;
  isPrivate: boolean;
  maxMembers?: number;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}
