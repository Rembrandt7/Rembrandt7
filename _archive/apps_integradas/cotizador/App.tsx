import React, { useState } from 'react';
import Header from './components/Header';
import QuoteForm from './components/QuoteForm';
import QuoteDisplay from './components/QuoteDisplay';
import type { QuoteDetails } from './types';

const App: React.FC = () => {
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails | null>(null);
  const [isQuoteReady, setIsQuoteReady] = useState(false);

  const handleGenerateQuote = (details: QuoteDetails) => {
    setQuoteDetails(details);
    setIsQuoteReady(true);
  };

  const handleReset = () => {
    setQuoteDetails(null);
    setIsQuoteReady(false);
  };

  const handleEdit = () => {
    setIsQuoteReady(false);
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="w-full">
        {!isQuoteReady && <Header />}
        <main className="mt-8">
          {!isQuoteReady ? (
            <QuoteForm onGenerateQuote={handleGenerateQuote} initialDetails={quoteDetails} />
          ) : (
            <QuoteDisplay details={quoteDetails} onReset={handleReset} onEdit={handleEdit} />
          )}
        </main>
      </div>
       <footer className="text-center py-8 mt-auto text-slate-500 text-sm no-print">
        <p>Generador de Cotizaciones v1.2. Creado con elegancia.</p>
      </footer>
    </div>
  );
};

export default App;