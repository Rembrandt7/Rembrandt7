export enum FileStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum TargetFormat {
  JPG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  PDF = 'application/pdf',
  ORIGINAL = 'original',
}

export type AttachmentCategory = 'RENDER' | 'VIDEO' | 'CAD' | 'PDF' | 'DOC';

// Toast Notification Types
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Generic interface for the Modal to display both Main Files and Attachments
export interface PreviewFile {
  id: string; // Added ID to identify the file for renaming
  name: string;
  originalName?: string;
  previewUrl?: string;
  type: 'image' | 'video' | 'pdf' | 'cad';
  size: number;
  newSize?: number;
  format?: string;
}

export interface MediaFile {
  id: string;
  originalFile: File;
  previewUrl: string;
  newName: string;
  targetFormat: TargetFormat;
  status: FileStatus;
  statusMessage?: string;
  convertedBlob?: Blob;
  originalSize: number;
  newSize?: number;
  type: 'image' | 'video' | 'pdf' | 'cad';
}

export interface AttachmentFile {
  id: string;
  file: File;
  customName: string; // Name without extension
  size: number;
  previewUrl?: string;
  category: AttachmentCategory;
}

// Interface for PDF Merge Panel
export interface PdfPageFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
}

export interface ProcessingOptions {
  globalFormat: TargetFormat;
  quality: number; // 0 to 1
}
