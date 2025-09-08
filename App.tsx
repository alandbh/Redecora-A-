import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { LoadingSpinner } from './components/LoadingSpinner';
import { redecorateImage } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

import { ArrowRightIcon } from './components/icons/ArrowRightIcon';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { UndoIcon } from './components/icons/UndoIcon';
import { RedoIcon } from './components/icons/RedoIcon';
import { CompareIcon } from './components/icons/CompareIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';

interface Selection {
  original: { x: number; y: number };
  display: { x: number; y: number };
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // State for image history (undo/redo)
  const [history, setHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [initialMimeType, setInitialMimeType] = useState<string | null>(null);
  
  const currentImage = history[currentIndex];
  const originalImage = history[0];

  const handleImageChange = async (file: File | null) => {
    if (file) {
      try {
        const base64Image = await fileToBase64(file);
        setHistory([base64Image]);
        setCurrentIndex(0);
        setInitialMimeType(file.type);
        setPrompt('');
        setError(null);
        setSelection(null);
      } catch (err) {
        setError("Não foi possível carregar a imagem. Tente novamente.");
        console.error(err);
      }
    } else {
      // Reset everything
      setHistory([]);
      setCurrentIndex(-1);
      setInitialMimeType(null);
      setPrompt('');
      setError(null);
      setSelection(null);
    }
  };

  const handleReset = () => {
     handleImageChange(null);
  };

  const handleSelectPoint = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const parent = img.parentElement;
    if (!parent) return;

    // Part 1: Calculate coordinates for the VISUAL MARKER
    // The marker is positioned relative to the parent div.
    const parentRect = parent.getBoundingClientRect();
    const markerX = e.clientX - parentRect.left;
    const markerY = e.clientY - parentRect.top;

    // Part 2: Calculate coordinates for the AI
    // This requires calculating the offsets from `object-contain`.
    const imgRect = img.getBoundingClientRect();
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;
    const displayWidth = imgRect.width;
    const displayHeight = imgRect.height;
    
    const imageAspectRatio = originalWidth / originalHeight;
    const containerAspectRatio = displayWidth / displayHeight;

    let renderedImageWidth = displayWidth;
    let renderedImageHeight = displayHeight;
    let letterboxOffsetX = 0;
    let letterboxOffsetY = 0;

    if (containerAspectRatio > imageAspectRatio) { // horizontal letterboxing
      renderedImageWidth = displayHeight * imageAspectRatio;
      letterboxOffsetX = (displayWidth - renderedImageWidth) / 2;
    } else if (containerAspectRatio < imageAspectRatio) { // vertical letterboxing
      renderedImageHeight = displayWidth / imageAspectRatio;
      letterboxOffsetY = (displayHeight - renderedImageHeight) / 2;
    }

    // Click coordinates relative to the <img> element's top-left.
    const clickX_in_imgElement = e.clientX - imgRect.left;
    const clickY_in_imgElement = e.clientY - imgRect.top;

    // Click coordinates relative to the VISIBLE IMAGE's top-left.
    const clickX_in_visibleImage = clickX_in_imgElement - letterboxOffsetX;
    const clickY_in_visibleImage = clickY_in_imgElement - letterboxOffsetY;
    
    // Ignore clicks in the letterboxed area.
    if (clickX_in_visibleImage < 0 || clickX_in_visibleImage > renderedImageWidth || clickY_in_visibleImage < 0 || clickY_in_visibleImage > renderedImageHeight) {
      return;
    }

    // Scaling factors.
    const widthScale = originalWidth / renderedImageWidth;
    const heightScale = originalHeight / renderedImageHeight;
    
    // Final coordinates for the AI.
    const originalX = clickX_in_visibleImage * widthScale;
    const originalY = clickY_in_visibleImage * heightScale;
    
    setSelection({
      original: { x: originalX, y: originalY },
      display: { x: markerX, y: markerY }
    });
  };
  
  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelection(null);
    }
  };
  
  const handleRedo = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelection(null);
    }
  };

  const handleRedecorate = useCallback(async () => {
    if (!currentImage || !initialMimeType) {
      setError('Ocorreu um erro. Por favor, envie a imagem novamente.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const selectionCoords = selection ? selection.original : null;
      const generatedImageBase64 = await redecorateImage(currentImage, initialMimeType, prompt, selectionCoords);
      
      const newHistory = history.slice(0, currentIndex + 1);
      setHistory([...newHistory, generatedImageBase64]);
      setCurrentIndex(newHistory.length);
      setSelection(null); // Clear selection after redecoration

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao redecorar a imagem.');
    } finally {
      setIsLoading(false);
    }
  }, [currentImage, initialMimeType, prompt, selection, history, currentIndex]);

  const displayedImageSrc = `data:${initialMimeType};base64,${isComparing ? originalImage : currentImage}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {!currentImage ? (
           <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
             <h2 className="text-2xl font-bold text-slate-700 mb-1">Comece por aqui</h2>
             <p className="text-slate-500 mb-6">Faça o upload da foto do espaço que você quer transformar.</p>
             <ImageUploader onImageChange={handleImageChange} />
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Coluna de Controles */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-lg border border-slate-200 w-full lg:sticky lg:top-8">
              <h2 className="text-2xl font-bold text-slate-700 mb-1">1. Foque a mudança</h2>
              <p className="text-slate-500 mb-3">Clique na imagem para indicar a área que deseja alterar (ex: uma parede).</p>
              {selection && (
                  <button 
                    onClick={() => setSelection(null)} 
                    className="text-sm font-semibold text-teal-600 hover:text-teal-700 mb-4"
                  >
                    Limpar seleção
                  </button>
              )}

              <h2 className="text-2xl font-bold text-slate-700 mt-4 mb-1">2. Descreva sua ideia</h2>
              <p className="text-slate-500 mb-4">(Opcional) Ex: "pinte esta parede de azul".</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Gostaria de uma decoração moderna..."
                className="w-full h-28 p-3 bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200 resize-none"
                disabled={isLoading}
              />
              
              <button
                onClick={handleRedecorate}
                disabled={isLoading}
                className="mt-6 w-full bg-teal-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-105 disabled:scale-100"
              >
                {isLoading ? 'Redecorando...' : 'Redecorar Ambiente'}
                {!isLoading && <ArrowRightIcon />}
              </button>
              {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            </div>

            {/* Coluna de Resultado */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-slate-200 w-full min-h-[600px] flex flex-col justify-between items-center">
                <div className="w-full">
                    <h2 className="text-2xl font-bold text-slate-700 mb-4 self-start">Seu Ambiente</h2>
                    <div className="relative group w-full flex justify-center items-center bg-slate-100 rounded-lg min-h-[400px]">
                      {isLoading ? (
                        <LoadingSpinner />
                      ) : (
                          <>
                            <img 
                              src={displayedImageSrc} 
                              alt="Pré-visualização do ambiente" 
                              onClick={handleSelectPoint}
                              className="w-full h-auto max-h-[500px] object-contain rounded-lg border border-slate-300 cursor-crosshair" 
                            />
                            {selection && (
                              <div
                                className="absolute w-4 h-4 bg-teal-500 border-2 border-white rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                                style={{ left: selection.display.x, top: selection.display.y }}
                                aria-hidden="true"
                              />
                            )}
                          </>
                      )}
                    </div>
                </div>

                <div className="w-full flex flex-wrap items-center justify-center gap-3 mt-6 pt-6 border-t border-slate-200">
                    <button onClick={handleUndo} disabled={currentIndex <= 0 || isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><UndoIcon /> Desfazer</button>
                    <button onClick={handleRedo} disabled={currentIndex >= history.length - 1 || isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><RedoIcon /> Refazer</button>
                    <button 
                      onMouseDown={() => setIsComparing(true)}
                      onMouseUp={() => setIsComparing(false)}
                      onMouseLeave={() => setIsComparing(false)}
                      onTouchStart={() => setIsComparing(true)}
                      onTouchEnd={() => setIsComparing(false)}
                      disabled={history.length <= 1 || isLoading} 
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <CompareIcon /> Comparar Original
                    </button>
                    <a href={displayedImageSrc} download={`redecora-ai-${currentIndex}.png`} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors"><DownloadIcon /> Baixar</a>
                    <button onClick={handleReset} className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-red-600 rounded-md hover:bg-red-50 transition-colors"><XCircleIcon /> Começar de Novo</button>
                </div>
            </div>
          </div>
        )}
      </main>
      <footer className="text-center py-6 text-slate-500 text-sm">
        <p>By Alan Vasconcelos and Gemini. Redecora Aí! &copy; 2025</p>
      </footer>
    </div>
  );
};

export default App;