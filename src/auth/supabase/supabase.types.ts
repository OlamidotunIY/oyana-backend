export type SupabaseUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  [key: string]: unknown;
};

type SupabaseError = {
  message: string;
} | null;

export type SupabaseAuthClientLike = {
  signUp: (...args: any[]) => Promise<any>;
  signInWithPassword: (...args: any[]) => Promise<any>;
  signInWithOtp: (...args: any[]) => Promise<any>;
  verifyOtp: (...args: any[]) => Promise<any>;
  resetPasswordForEmail: (...args: any[]) => Promise<any>;
  updateUser: (...args: any[]) => Promise<any>;
  refreshSession: (...args: any[]) => Promise<any>;
  getUser: (...args: any[]) => Promise<any>;
  admin: {
    listUsers: (...args: any[]) => Promise<{
      data?: {
        users?: SupabaseUser[];
      };
      error?: SupabaseError;
    }>;
  };
};

export type SupabaseClientLike = {
  auth: SupabaseAuthClientLike;
};
