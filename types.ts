
export enum Tab {
  EMAIL_GEN = 'Generador de Email',
  IMAGE_GEN = 'Generador de Imagen',
  IMAGE_EDIT = 'Image Editor',
  VIDEO_GEN = 'Video Generation',
  FILM_CRITIC = 'Crítico Cineasta',
  MIXBOARD = 'Mixboard',
  TTS = 'Audios',
  RENDERS = 'Renders',
  PROMPTS = 'Prompts',
  ENGINEER = 'Ingeniero',
  DATABASE = 'Base de Datos',
  ORGANIZER = 'Organizador',
  CHATGPT = 'Chat Gpt',
  USEFUL_TOOLS = 'Herramientas Útiles',
}

export interface LinkItem {
  id: string;
  name: string;
  href: string;
  description?: string;
  colorClass?: string;
  iconSvg: string; // HTML string for the icon (SVG or IMG tag)
  outlineColor?: string;
  outlineWidth?: number;
  hasBackground?: boolean; // Whether to show the circular/square background
}

export interface LinkSection {
  id: string;
  title: string;
  subtitle?: string;
  gradient?: string;
  iconSvg?: string;
  items: LinkItem[];
}

export interface TabConfig {
  id: string;
  label: string;
  type: 'system' | 'custom';
  componentKey?: string; // For system tabs to map to the component
  items?: LinkItem[]; // For custom tabs
  icon?: string; // Icon name
  isVisible: boolean;
}

export interface Command {
  id: string;
  title: string;
  program: string;
  command: string;
  description: string;
  color?: string;
  shortcut?: string;
  type: 'command' | 'shortcut';
  groupId?: string;
}

export interface CommandGroup {
  id: string;
  name: string;
  color?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
  color?: string;
  type?: 'event' | 'holiday' | 'vacation' | 'mountain' | 'party' | 'off' | 'medical' | 'birthday' | 'payment' | 'trabajo';
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  isPaid?: boolean;
  amount?: string;
  isVariable?: boolean;
  // New fields for "trabajo"
  jobCategory?: 'trabajos mios' | 'javer' | 'proyectos personales';
  isFinished?: boolean;
  finishedDate?: string;
  totalPayment?: string;
  advancePayment?: string;
  deliveryDate?: string;
  isIndefinite?: boolean;
  googleEventId?: string;
  reminderMinutes?: number;
}

export interface AIHistoryItem {
  id: string;
  type: 'email' | 'improvement';
  original?: string;
  result: string;
  timestamp: number;
}

export interface Credencial {
  id: string;
  nombre: string;
  usuario: string;
  contra: string;
  datos: string;
  color: string;
}

export interface Estudio {
  id: string;
  nombre: string;
  enlace: string;
  descripcion: string;
  avance?: number; // Progress from 0 to 100
}

export interface NewsItem {
  title: string;
  summary?: string;
  url: string;
  source?: string;
  audioSummary?: string;
  thumbnail?: string;
}

export interface TutorialItem {
  title: string;
  summary: string;
  url: string;
  thumbnail: string;
}

export interface Note {
  id: string;
  text: string;
  completed: boolean;
  category: 'estudios' | 'recientes' | 'notas' | 'trabajo' | 'compras';
  title?: string;
  progress?: number;
  link?: string;
  quantity?: string;
  startDate?: string;
  createdAt?: number;
}

export interface CalendarToken {
  id: string;
  name: string;
  symbol: string;
  intervalDays: number;
  startDate: string;
  currentActiveDate: string;
  color?: string;
  isCompleted?: boolean;
  reminderMinutes?: number;
  reminderTime?: string;
}

export interface FinanzasCard {
  id: string;
  type: 'credito' | 'debito' | 'deuda' | 'ahorro';
  name: string;
  expirationDate: string;
  paymentDate?: string;
  cutoffDate?: string;
  balance: number;
  annualYieldRate?: number;
  lastYieldUpdate?: number;
}

export interface FinancialItem {
  id: string;
  type: 'deuda' | 'ahorro';
  name: string;
  monthlyAmount: number;
  totalAmount: number; // Total original debt or savings goal
  currentAmount: number; // Remaining debt or current savings
  startDate: string;
  endDate?: string;
  description?: string;
  // Debt specific
  totalPayments?: number;
  paymentsMade?: number;
  paymentDate?: string; // Day of month
  annualInterestRate?: number;
}

export interface NutritionProfile {
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goal?: string;
  activityLevel?: string;
  calorieGoal?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  icon?: string;
  protein?: number;
  carbs?: number;
  fats?: number;
  sugar?: number;
  isFavorite?: boolean;
  order?: number;
}

export interface ConsumedFood {
  food: FoodItem;
  quantity: number;
  description?: string;
}

export interface NutritionLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meals: string;
  waterIntake?: number;
  sleepHours?: number;
  sleepTime?: string; // HH:mm
  wakeTime?: string; // HH:mm
  activity?: string;
  activities?: { 
    name: string; 
    duration?: number; 
    distance?: number; 
    unit?: 'min' | 'km';
    type: 'pesas' | 'correr' | 'natacion' | 'montaña' | 'otro';
    caloriesBurned?: number;
  }[];
  calories?: number;
  steps?: number;
  consumedFoods?: ConsumedFood[];
}

export interface MealPlanDay {
  date: string;
  meals: {
    time: string;
    food: string;
    quantity: string;
    type: 'desayuno' | 'comida' | 'cena' | 'snack';
    calories?: number;
  }[];
}

export interface NutritionData {
  profile: NutritionProfile;
  logs: NutritionLogEntry[];
  availableFoods?: FoodItem[];
  aiChatHistory?: { role: 'user' | 'model'; text: string; date: string }[];
  mealPlanChatHistory?: { role: 'user' | 'model'; text: string; date: string }[];
  weeklyMealPlan?: MealPlanDay[];
  exclusions?: string[];
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  type: 'ai_advice' | 'calendar_alert';
}

export interface MemoriaIA {
  perfil: string;
  estilo: string;
  laboral: string;
  personal: string;
}

export interface AppConfig {
  version?: number;
  linksBar: LinkItem[];
  aiSidebar: {
    models: LinkItem[];
    quickAccess: LinkItem[];
  };
  rightSidebar: LinkSection[];
  googleDock: LinkItem[];
  usefulTools: LinkSection[];
  tabs: TabConfig[];
  commands: Command[];
  commandGroups?: CommandGroup[];
  aiHistory?: AIHistoryItem[];
  reminders: string[];
  calendarEvents?: CalendarEvent[];
  calendarTokens?: CalendarToken[];
  notes?: Note[];
  userRoutine?: string;
  calendarSettings?: {
    saveButton?: { icon: string; color: string; label?: string; svg?: string };
    notesButton?: { icon: string; color: string; label?: string; svg?: string };
    aiButton?: { icon: string; color: string; label?: string; svg?: string };
  };
  workPending?: string[];
  vacationConfig?: {
    initialDays: number;
    resetDate: string; // MM-DD
    daysAfterReset: number;
  };
  credenciales: Credencial[];
  estudios: Estudio[];
  news: NewsItem[];
  aiTutorials: TutorialItem[];
  memoria_ia: MemoriaIA;
  grokEmail?: string;
  googleCalendarTokens?: any;
  notesMigrated?: boolean;
  finanzasCards?: FinanzasCard[];
  financialItems?: FinancialItem[];
  finanzasNews?: NewsItem[];
  nutritionProfile?: NutritionProfile;
  nutritionLogs?: NutritionLogEntry[];
  notifications?: AppNotification[];
  lastNotificationCheck?: string; // YYYY-MM-DD
  updatedAt?: number; // Timestamp
}

export interface GoogleApiConfig {
  clientId: string;
  clientSecret: string;
  apiKey: string;
}

export type Message = {
  role: 'user' | 'model';
  parts: {
    text?: string;
    imageBase64?: string;
    mimeType?: string;
  }[];
};


export type AspectRatioImg = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type AspectRatioVideo = "16:9" | "9:16";

// This is a simplified representation of the Veo operation object
export interface VeoOperation {
  done?: boolean;
  name?: string;
  response?: {
    generatedVideos?: {
      video?: {
        uri: string;
      };
    }[];
  };
  error?: any;
  [key: string]: any;
}

export enum VideoGenerationReferenceType {
  ASSET = 'ASSET',
}

export interface VideoGenerationReferenceImage {
  image: {
    imageBytes: string;
    mimeType: string;
  };
  referenceType: VideoGenerationReferenceType;
}


// Fix: To resolve a TypeScript error with duplicate global declarations,
// the AIStudio interface is defined within the `declare global` block.
// This ensures it is treated as a true global type, making it available
// on the `window` object without conflicts.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

declare module '@google/genai' {
  interface GoogleGenAIOptions {
    baseUrl?: string;
  }
}
