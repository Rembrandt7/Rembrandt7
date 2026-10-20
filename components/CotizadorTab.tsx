import React, { useState } from 'react';
import QuoteForm from './Cotizador/QuoteForm';
import QuoteDisplay from './Cotizador/QuoteDisplay';
import type { QuoteDetails } from './Cotizador/types';

const CotizadorTab: React.FC = () => {
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails | null>(null);
  const [isViewingQuote, setIsViewingQuote] = useState<boolean>(false);

  const handleGenerateQuote = (details: QuoteDetails) => {
    setQuoteDetails(details);
    setIsViewingQuote(true);
  };

  const handleEditQuote = () => {
    setIsViewingQuote(false);
  };

  const handleReset = () => {
    setQuoteDetails(null);
    setIsViewingQuote(false);
  };

  return (
    <div className="w-full min-h-[80vh] bg-[#0b0f19] text-slate-100 font-sans rounded-2xl shadow-2xl overflow-hidden border border-slate-800/80 mt-1 sm:mt-2">
      <main className="container mx-auto px-2 py-2 sm:px-4 md:py-3">
        {!isViewingQuote ? (
          <QuoteForm onGenerateQuote={handleGenerateQuote} initialDetails={quoteDetails} />
        ) : (
          <QuoteDisplay
            details={quoteDetails}
            onReset={handleReset}
            onEdit={handleEditQuote}
          />
        )}
      </main>
    </div>
  );
};

export default CotizadorTab;
