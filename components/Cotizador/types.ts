
export interface Activity {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  type: string;
}

export interface DefaultConfigProfile {
  id: string;
  name: string;
  isDefault: boolean;
  companyTagline?: string;
  recipientPrefix?: string;
  deliveryTime?: string;
  requireAdvance: boolean;
  addIVA: boolean;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  addWithholdings: boolean;
  ivaWithholdingPercentage: number;
  isrWithholdingPercentage: number;
  generalConditions?: string;
  taxId?: string;
  legalName?: string;
  logoB64?: string | null;
  signatureB64?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteDetails {
  projectName: string;
  recipientPrefix: string;
  recipientName: string;
  activities: Activity[];
  addIVA: boolean;
  deliveryTime: string;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  logoB64?: string | null;
  companyTagline?: string;
  signatureB64?: string | null;
  generalConditions?: string;
  addWithholdings: boolean;
  ivaWithholdingPercentage: number;
  isrWithholdingPercentage: number;
  // New Fiscal Fields
  taxSituationPdfB64?: string | null; // For the PDF file
  taxId?: string; // RFC
  legalName?: string; // Razón Social
  requireAdvance: boolean; // Toggle for 50% advance
}

export interface GeneratedQuote {
  projectName: string;
  priceRange: {
    min: number;
    max: number;
  };
  timeline: {
    min: number;
    max: number;
  };
  costBreakdown: {
    feature: string;
    description: string;
    cost: number;
  }[];
  summary: string;
}