export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  bio?: string;
  role?: 'USER' | 'LISTENER' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  bio?: string;
  role: 'USER' | 'LISTENER' | 'ADMIN';
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  bio?: string;
}

export interface CompleteProfileRequest {
  firstName: string;
  lastName: string;
  bio?: string;
}
