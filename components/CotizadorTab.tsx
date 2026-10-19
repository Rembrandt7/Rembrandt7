import React, { useState } from 'react';
import Header from './Cotizador/Header';
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
    <div className="w-full min-h-[80vh] bg-slate-50 text-slate-800 font-sans rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 mt-2 sm:mt-4">
      <Header />
      <main className="container mx-auto px-2 py-4 sm:px-4 md:py-8">
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
