import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// --- Environment Variable Configuration ---
// Determine the environment ('production' or 'development')
const environment = process.env.NODE_ENV || 'development';

// Determine the path to the appropriate .env file
// For 'production', we use '.env'. For anything else (like 'development'), we use '.env.local'.
const envPath = environment === 'production'
    ? path.resolve(process.cwd(), '.env')
    : path.resolve(process.cwd(), '.env.local');

// Check if the determined .env file exists before trying to load it
if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from: ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.warn(`Warning: Environment file not found at ${envPath}.`);
    // For production, it's critical. For development, we might still proceed if
    // variables are set globally, but it's good to warn.
    if (environment === 'production') {
        console.error("CRITICAL: .env file for production is missing!");
    }
}
// End of new configuration block

const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

const allowedOrigin = process.env.ALLOWED_ORIGIN;

console.log(`Allowed origin: ${allowedOrigin}`);

app.use(cors({
    origin: allowedOrigin,
}));

// --- Gemini API Configuration ---
// These were previously in your frontend constants.ts
const GEMINI_MODEL_NAME = process.env.MODEL;
const SYSTEM_INSTRUCTION = `Você é um assistente de feedback de escrita altamente qualificado.
Seu objetivo é fornecer dois tipos de feedback sobre o texto do usuário:
1.  **Feedback Técnico:** Análise concisa da gramática, estrutura, clareza, coesão, coerência e uso da linguagem. Destaque pontos fortes e áreas para melhoria de forma construtiva. Use linguagem formal e precisa. Comece esta seção EXATAMENTE com: "✅ Feedback Técnico:"
2.  **Feedback Afetivo:** Palavras de encorajamento e suporte emocional, validando o esforço do escritor e motivando-o a continuar melhorando. Use uma linguagem calorosa e empática. Comece esta seção EXATAMENTE com: "❤️ Feedback Afetivo:"

Formate sua resposta para que cada tipo de feedback seja claramente separado.
Responda em português brasileiro.`;

const USER_PROMPT_TEMPLATE = (text) => `
Por favor, forneça feedback técnico e afetivo para o seguinte texto:

--- TEXTO DO USUÁRIO ---
${text}
--- FIM DO TEXTO DO USUÁRIO ---
`;

// Initialize the Google GenAI client
// IMPORTANT: Ensure your API_KEY is set in a .env file in your backend project
// The .env file should look like this:
// API_KEY=your_actual_gemini_api_key
const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.error("API_KEY not found. Please set it in the .env file.");
    process.exit(1); // Exit if API key is not set
}
const ai = new GoogleGenAI({ apiKey });

// --- API Endpoint ---
app.post('/api/generate-feedback', async (req, res) => {
    console.log('Received request to /api/generate-feedback'); // For backend logging

    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: 'Nenhum texto fornecido para avaliação.' });
    }

    try {
        const fullPrompt = USER_PROMPT_TEMPLATE(text);

        console.log('Sending request to Gemini API...'); // For backend logging
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL_NAME,
            contents: fullPrompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                // Optional: Add other configs like temperature, topK, topP if needed
                // temperature: 0.7,
            }
        });

        const feedbackText = response.text;
        console.log('Received feedback from Gemini API.'); // For backend logging

        if (!feedbackText) {
            return res.status(500).json({ error: 'A API Gemini retornou uma resposta vazia.' });
        }

        return res.json({ feedback: feedbackText });

    } catch (error) {
        console.error('Erro ao chamar a API Gemini:', error);
        let errorMessage = 'Falha ao gerar feedback. Tente novamente mais tarde.';
        if (error instanceof Error) {
            // You might want to parse specific error types from the Gemini API if available
            // For now, a generic message is fine.
            errorMessage = `Erro ao comunicar com o serviço de IA: ${error.message}`;
        }
        return res.status(500).json({ error: errorMessage });
    }
});

app.listen(port, () => {
    console.log(`Servidor backend rodando em http://localhost:${port}`);
    if (!process.env.API_KEY) {
        console.warn("AVISO: A variável de ambiente API_KEY não está definida. O serviço Gemini não funcionará.");
    }
});
