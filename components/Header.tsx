
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white">
      <div className="container mx-auto px-4 py-5 text-center">
        <h1 className="text-4xl font-extrabold text-teal-600">Redecora Aí!</h1>
        <p className="text-slate-500 mt-1">Seu novo ambiente a um clique de distância.</p>
      </div>
    </header>
  );
};
