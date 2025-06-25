export interface User {
  id: string;           // UUID from Supabase
  chat_id: string;      // Telegram chat ID
  name: string;
  is_onboarded: boolean;
  // Add other fields as needed
}

export interface Pet {
  id: string;           // UUID from Supabase
  user_id: string;
  name: string;
  type: string;         // e.g., 'dog', 'cat'
  breed?: string;
  age?: number;
  // Add other fields as needed
}
