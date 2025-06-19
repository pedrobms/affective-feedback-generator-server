const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const environment = process.env.NODE_ENV || 'development';

const envPath = environment === 'production'
    ? path.resolve(process.cwd(), '.env')
    : path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from: ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.warn(`Warning: Environment file not found at ${envPath}.`);
    if (environment === 'production') {
        console.error("CRITICAL: .env file for production is missing!");
    }
}

const app = express();

// CORS configuration
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors({
    origin: allowedOrigin,
}));

app.use(express.json());

// Gemini API Setup
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

const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.error("API_KEY not found. Please set it in the .env file.");
    process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

// API Route
app.post('/api/generate-feedback', async (req, res) => {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: 'Nenhum texto fornecido para avaliação.' });
    }

    try {
        const fullPrompt = USER_PROMPT_TEMPLATE(text);

        console.log('Sending request to Gemini API...');
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL_NAME,
            contents: fullPrompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
            }
        });

        const feedbackText = response.text;
        console.log('Received feedback from Gemini API.');

        if (!feedbackText) {
            return res.status(500).json({ error: 'A API Gemini retornou uma resposta vazia.' });
        }

        return res.json({ feedback: feedbackText });

    } catch (error) {
        console.error('Erro ao chamar a API Gemini:', error);
        let errorMessage = 'Falha ao gerar feedback. Tente novamente mais tarde.';
        if (error instanceof Error) {
            errorMessage = `Erro ao comunicar com o serviço de IA: ${error.message}`;
        }
        return res.status(500).json({ error: errorMessage });
    }
});

module.exports = app;

if (require.main === module) {
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
        console.log(`Servidor backend rodando localmente em http://localhost:${port}`);
    });
}
