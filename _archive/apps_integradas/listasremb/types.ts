
export interface Task {
  id: string;
  title: string;
  category: string; 
  completed: boolean;
  dueDate: string; // ISO Date string
  priority: 'Alta' | 'Media' | 'Baja';
  notes?: string;
  progress?: number; // 0 - 100
}

export interface Contact {
  id: string;
  name: string;
  alias: string;
  phone: string;
  email: string;
  profession: string;
  notes: string;
}

export interface StickyNote {
  id: string;
  content: string;
  color: string;
  createdAt: string;
}

export interface StoredImage {
  id: string;
  name: string;
  data: string; // Base64
  date: string;
}

export interface SafeItem {
  id: string;
  site: string;
  username: string;
  password: string; // Stored locally
  createdAt: string;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  theme: string; // Grouping category
  color: string; // Hex color
}

export interface CategoryStats {
  name: string;
  count: number;
  color: string;
}

export type FilterType = 'all' | 'active' | 'completed' | string;

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
