import { GoogleGenAI, Modality } from "@google/genai";
import { getBase64WithSelection } from "../utils/fileUtils";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_NAME = 'gemini-2.5-flash-image-preview';

const buildPrompt = (userPrompt: string, hasSelection: boolean): string => {
  const selectionInstruction = hasSelection
    ? `A mudança solicitada deve ser aplicada ESPECIFICAMENTE na área marcada com um círculo azul-petróleo na imagem. Ignore outras áreas para esta mudança. O círculo azul-petróleo é apenas um marcador para sua referência e NÃO deve aparecer na imagem final.`
    : ``;

  const baseInstruction = `Você é um especialista em design de interiores e um assistente de redecoração virtual. Sua principal tarefa é receber uma imagem de um ambiente e aplicar uma nova decoração, mantendo fielmente a estrutura espacial, perspectiva, iluminação original e todos os elementos arquitetônicos permanentes do ambiente fornecido.
${selectionInstruction}
É CRÍTICO que o ambiente resultante seja RECONHECÍVEL como o ambiente ORIGINAL, apenas com a nova decoração.

NUNCA crie um ambiente totalmente novo. NÃO altere a planta baixa, layout estrutural, localização de janelas, portas, pilares, etc.

Concentre-se APENAS nas mudanças solicitadas. Se o usuário pedir para pintar uma parede, apenas pinte a parede. Não adicione, remova ou altere outros elementos (como móveis, janelas, ou luminárias) a menos que seja parte explícita do pedido.

Aplique a seguinte decoração: "${userPrompt || 'uma nova decoração criativa e realista'}".

O resultado deve ser fotorealista e harmonioso. O ambiente do usuário é a sua tela. Sua missão é aprimorá-lo, não substituí-lo.`;

  return baseInstruction;
};

export const redecorateImage = async (
    imageBase64: string, 
    mimeType: string, 
    prompt: string, 
    selection: { x: number; y: number } | null
): Promise<string> => {
  try {
    const finalImageBase64 = selection 
      ? await getBase64WithSelection(imageBase64, mimeType, selection)
      : imageBase64;

    const fullPrompt = buildPrompt(prompt, !!selection);

    const imagePart = {
      inlineData: {
        data: finalImageBase64,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: fullPrompt,
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    }
    
    throw new Error('A API não retornou uma imagem. Tente novamente com um prompt diferente.');

  } catch (error) {
    console.error('Error in Gemini API call:', error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error('A chave da API configurada não é válida. Verifique suas credenciais.');
    }
    throw new Error('Falha ao se comunicar com o serviço de IA. Por favor, tente novamente mais tarde.');
  }
};
