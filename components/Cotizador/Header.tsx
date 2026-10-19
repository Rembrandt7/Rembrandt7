import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">
        Generador de Cotizaciones Profesionales
      </h1>
      <p className="mt-2 text-slate-600 max-w-2xl mx-auto">
        Cree una cotización de arquitectura detallada y lista para su cliente en segundos.
      </p>
    </header>
  );
};

export default Header;