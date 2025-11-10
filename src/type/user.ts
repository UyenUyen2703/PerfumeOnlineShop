export interface User {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_URL: string | null;
  role: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}
