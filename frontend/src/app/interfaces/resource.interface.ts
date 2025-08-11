export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'ARTICLE' | 'VIDEO' | 'PODCAST' | 'BOOK' | 'OTHER';
  url: string;
  imageUrl?: string;
  tags: string[];
  createdBy: string;
  groupId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

export interface CreateResourceRequest {
  title: string;
  description: string;
  type: 'ARTICLE' | 'VIDEO' | 'PODCAST' | 'BOOK' | 'OTHER';
  url: string;
  imageUrl?: string;
  tags: string[];
  groupId?: string;
  isPublic: boolean;
}

export interface UpdateResourceRequest {
  title?: string;
  description?: string;
  type?: 'ARTICLE' | 'VIDEO' | 'PODCAST' | 'BOOK' | 'OTHER';
  url?: string;
  imageUrl?: string;
  tags?: string[];
  isPublic?: boolean;
}
