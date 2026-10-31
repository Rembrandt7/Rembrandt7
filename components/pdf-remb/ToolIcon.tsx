import React from 'react';
import {
  Combine,
  Scissors,
  FileMinus2,
  FileOutput,
  LayoutGrid,
  Minimize2,
  Wrench,
  ScanText,
  ImagePlus,
  FileText,
  Presentation,
  Sheet,
  Code2,
  Images,
  FileType2,
  RotateCw,
  Hash,
  Stamp,
  Crop,
  PenTool,
  ShieldCheck,
  GitCompare
} from 'lucide-react';
import { PdfToolDefinition } from './toolsCatalog';

interface ToolIconProps {
  name: PdfToolDefinition['iconName'];
  size?: number;
  color?: string;
}

export const ToolIcon: React.FC<ToolIconProps> = ({ name, size = 28, color = 'currentColor' }) => {
  const props = { size, color, strokeWidth: 2 };
  switch (name) {
    case 'merge':
      return <Combine {...props} />;
    case 'split':
      return <Scissors {...props} />;
    case 'remove':
      return <FileMinus2 {...props} />;
    case 'extract':
      return <FileOutput {...props} />;
    case 'organize':
      return <LayoutGrid {...props} />;
    case 'compress':
      return <Minimize2 {...props} />;
    case 'repair':
      return <Wrench {...props} />;
    case 'ocr':
      return <ScanText {...props} />;
    case 'jpg-in':
      return <ImagePlus {...props} />;
    case 'word-in':
      return <FileText {...props} />;
    case 'ppt-in':
      return <Presentation {...props} />;
    case 'excel-in':
      return <Sheet {...props} />;
    case 'html-in':
      return <Code2 {...props} />;
    case 'jpg-out':
      return <Images {...props} />;
    case 'word-out':
      return <FileText {...props} />;
    case 'excel-out':
      return <Sheet {...props} />;
    case 'text-out':
      return <FileType2 {...props} />;
    case 'rotate':
      return <RotateCw {...props} />;
    case 'numbers':
      return <Hash {...props} />;
    case 'watermark':
      return <Stamp {...props} />;
    case 'edit':
      return <Crop {...props} />;
    case 'sign':
      return <PenTool {...props} />;
    case 'security':
      return <ShieldCheck {...props} />;
    case 'compare':
      return <GitCompare {...props} />;
    default:
      return <FileText {...props} />;
  }
};
