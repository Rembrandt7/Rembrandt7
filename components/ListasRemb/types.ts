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
  secretValue?: string;
  createdAt: string;
  [key: string]: any;
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

export interface ListasRembBackupData {
  tasks?: Task[];
  lists?: string[];
  username?: string;
  listColors?: Record<string, string>;
  listVisibility?: Record<string, boolean>;
  listNotesVisibility?: Record<string, boolean>;
  contacts?: Contact[];
  notes?: StickyNote[];
  storedImages?: StoredImage[];
  safePin?: string | null;
  safeItems?: SafeItem[];
  links?: LinkItem[];
  backupTimestamp?: number;
  [key: string]: any;
}
