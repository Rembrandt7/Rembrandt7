import { Task } from './types';
import { Layout, Briefcase, Home, ShoppingCart, Star, GraduationCap, Folder, Box } from 'lucide-react';

export const INITIAL_TASKS: Task[] = [];

export const CATEGORY_ICONS: Record<string, any> = {
  'Personal': Star,
  'Trabajo': Briefcase,
  'Casa': Home,
  'Hogar': Home,
  'Compras': ShoppingCart,
  'Estudios': GraduationCap,
  'Impresión 3D': Box,
  'General': Layout,
  'default': Folder
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Personal': 'bg-purple-100 text-purple-700',
  'Trabajo': 'bg-blue-100 text-blue-700',
  'Casa': 'bg-green-100 text-green-700',
  'Hogar': 'bg-green-100 text-green-700',
  'Compras': 'bg-orange-100 text-orange-700',
  'Estudios': 'bg-pink-100 text-pink-700',
  'Impresión 3D': 'bg-cyan-100 text-cyan-800',
  'default': 'bg-slate-100 text-slate-700'
};

export const DEFAULT_LISTS = ['Trabajo', 'Casa', 'Compras', 'Estudios', 'Impresión 3D'];

