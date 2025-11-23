import { GoogleGenAI, Type } from "@google/genai";
import { Chapter, BookIdea, ReviewSuggestion } from "../types";

// Initialize the client. API_KEY is expected from the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = "gemini-2.5-flash";
const MODEL_IMAGE = "gemini-2.5-flash-image";

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    // Enhance prompt for better results while keeping user intent
    const enhancedPrompt = `High quality, masterpiece, detailed. Context: ${prompt}.`;

    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        // No responseMimeType for image generation models
      }
    });

    // Iterate through parts to find the image
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("Nenhuma imagem retornada pela IA");
  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    throw error;
  }
};

export const generateBookOutline = async (title: string, description: string, chapterCount: number = 10): Promise<Partial<Chapter>[]> => {
  try {
    const prompt = `Crie um esboço detalhado de capítulos para um livro intitulado "${title}". 
    O livro é sobre: "${description}".
    Gere aproximadamente ${chapterCount} capítulos.
    IMPORTANTE: Responda em PORTUGUÊS DO BRASIL.
    Retorne um array JSON onde cada item tem um "title" (título) e um breve "summary" (resumo) do que acontece no capítulo. Mantenha as chaves do JSON em inglês (title, summary), mas os valores em Português.`;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING }
            },
            required: ["title", "summary"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Sem resposta da IA");
    
    const parsedData = JSON.parse(jsonText);
    return parsedData.map((item: any) => ({
      title: item.title,
      summary: item.summary,
      content: ""
    }));

  } catch (error) {
    console.error("Erro ao gerar esboço:", error);
    throw error;
  }
};

export const generateBookIdeas = async (): Promise<BookIdea[]> => {
  try {
    const prompt = `Gere uma lista de 10 ideias de livros criativas e únicas. Misture conceitos de romances (novels) e histórias em quadrinhos (comics).
    Para cada ideia, forneça um "title" (título) chamativo, uma "description" (descrição) de 1-2 frases, e um "type" (tipo: 'novel' ou 'comic').
    IMPORTANTE: O conteúdo deve estar em PORTUGUÊS DO BRASIL. As chaves do JSON em inglês.
    Retorne o resultado como um array JSON.`;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['novel', 'comic'] }
                },
                required: ["title", "description", "type"]
            }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Erro ao gerar ideias:", error);
    throw error;
  }
};

export const generateChapterContent = async (bookTitle: string, chapterTitle: string, chapterSummary: string, previousContext: string = ""): Promise<string> => {
  try {
    let prompt = `Você é um autor escrevendo o livro "${bookTitle}". 
    Escreva o conteúdo para o capítulo intitulado "${chapterTitle}".
    
    Planejamento do Capítulo: ${chapterSummary}
    
    Escreva em um estilo literário envolvente e profissional adequado ao gênero. Use formatação Markdown.
    IMPORTANTE: Escreva em PORTUGUÊS DO BRASIL.`;

    if (previousContext) {
      prompt += `\n\nContexto dos capítulos anteriores: ${previousContext.slice(-1000)}`;
    }

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Erro ao gerar conteúdo:", error);
    throw error;
  }
};

export const continueWriting = async (currentContent: string, bookContext: string): Promise<string> => {
  try {
    const prompt = `Continue escrevendo a história a seguir. Mantenha o estilo, tom e vozes dos personagens.
    
    Contexto da História (Resumo): ${bookContext}
    
    Últimos parágrafos:
    "${currentContent.slice(-2000)}"
    
    Escreva os próximos 2-3 parágrafos naturalmente.
    IMPORTANTE: Escreva em PORTUGUÊS DO BRASIL.`;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Erro ao continuar escrita:", error);
    throw error;
  }
};

export const improveText = async (text: string, instruction: string): Promise<string> => {
    try {
        const prompt = `Reescreva o texto a seguir baseado nesta instrução: "${instruction}".
        
        Texto Original:
        ${text}
        
        Retorne apenas o texto reescrito em PORTUGUÊS DO BRASIL.`;
    
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });
    
        return response.text || text;
      } catch (error) {
        console.error("Erro ao melhorar texto:", error);
        throw error;
      }
};

export const reviewChapterContent = async (content: string): Promise<ReviewSuggestion[]> => {
    try {
        if (!content || content.length < 10) return [];

        const prompt = `Atue como um editor de livros profissional brasileiro. Revise o texto a seguir procurando por erros de gramática, ortografia, pontuação, estilo, clareza e fluidez.
        
        Texto para revisar:
        """
        ${content}
        """
        
        Retorne um array JSON de sugestões. Cada sugestão deve incluir:
        - "originalText": O trecho exato que você quer mudar.
        - "suggestedText": A versão melhorada (em Português).
        - "explanation": Por que esta mudança é recomendada (em Português).
        - "type": Um de "grammar", "spelling", "style", "clarity".
        
        Limite às top 10 sugestões mais importantes.`;

        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            originalText: { type: Type.STRING },
                            suggestedText: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["grammar", "spelling", "style", "clarity"] }
                        },
                        required: ["originalText", "suggestedText", "explanation", "type"]
                    }
                }
            }
        });

        const suggestions = JSON.parse(response.text || "[]");
        return suggestions.map((s: any) => ({ ...s, id: crypto.randomUUID() }));

    } catch (error) {
        console.error("Erro ao revisar texto:", error);
        throw error;
    }
};

export const interactWithPersona = async (message: string, persona: 'muse' | 'critic' | 'guardian', history: string[]): Promise<string> => {
    try {
        const personas = {
            muse: "Você é 'A Musa', uma IA criativa, inspiradora e poética. Você ajuda autores com bloqueio criativo, sugere ideias e fala de forma etérea e encorajadora. Responda em Português.",
            critic: "Você é 'O Crítico', uma IA analítica, direta e um pouco cínica. Você aponta falhas lógicas e clichês, mas quer que a obra seja excelente. Responda em Português.",
            guardian: "Você é 'O Guardião', uma IA protetora do Nexus. Você é formal, educado e ajuda com questões técnicas sobre escrita e estrutura. Responda em Português."
        };

        const systemInstruction = personas[persona];
        const context = history.slice(-5).join("\n"); // Last 5 messages for context

        const prompt = `${systemInstruction}
        
        Histórico da conversa:
        ${context}
        
        Usuário: "${message}"
        
        Sua resposta:`;

        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: prompt,
        });

        return response.text || "Estou sem palavras no momento...";
    } catch (error) {
        console.error("Erro no chat IA:", error);
        return "Desculpe, minha conexão com o Nexus está instável.";
    }
};