export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'analyst' | 'owner';
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}