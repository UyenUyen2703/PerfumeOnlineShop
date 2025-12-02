export interface User {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  gender: string | null;
  role: string | null;
  phone: string | number | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}


