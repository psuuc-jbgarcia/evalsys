import { createContext } from 'react';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'panel';
  csvExportLocked?: boolean;
  gradingLocked?: boolean;
  gradingLockedSubjects?: string[];
  mustChangePassword?: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
