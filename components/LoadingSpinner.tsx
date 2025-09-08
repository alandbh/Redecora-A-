
import React, { useState, useEffect } from 'react';

const messages = [
  'Consultando os melhores designers...',
  'Escolhendo a paleta de cores perfeita...',
  'Posicionando os móveis no lugar...',
  'Adicionando os toques finais...',
  'Quase pronto para revelar seu novo espaço!'
];

export const LoadingSpinner: React.FC = () => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8">
             <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-500"></div>
            <p className="mt-6 text-slate-600 text-lg font-medium transition-opacity duration-500">
                {messages[messageIndex]}
            </p>
        </div>
    );
};
