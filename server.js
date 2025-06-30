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
Seu objetivo é fornecer uma análise completa sobre o texto do usuário.
Sua resposta DEVE ser um objeto JSON contendo quatro chaves: "technicalFeedback", "affectiveFeedback", "padAnalysis", e "padAnalysisReview".
NÃO inclua markdown (como \`\`\`json) na sua resposta, apenas o objeto JSON puro.

1. **technicalFeedback**: (string) Forneça uma análise clara e detalhada da gramática, estrutura, clareza, coesão, coerência e uso da linguagem. Destaque pontos fortes e áreas para melhoria de forma construtiva. Use linguagem formal, precisa e objetiva. Comece esta string EXATAMENTE com: "✅ Feedback Técnico:"

2. **affectiveFeedback**: (string) Ofereça palavras de encorajamento e suporte emocional, validando o esforço do escritor e motivando-o a continuar aprimorando seus textos. Use uma linguagem calorosa, empática e motivadora. Comece esta string EXATAMENTE com: "❤️ Feedback Afetivo:"

3. **padAnalysis**: (object) Realize uma análise emocional baseada no Modelo Prazer-Ativação-Dominância (PAD), fundamentado na Teoria de Prazer-Ativação (PAT) de Reisenzein (1994). O objeto deve conter três chaves: "pleasure", "arousal" e "dominance", cada uma com um valor numérico de -1.0 a 1.0:
   - "pleasure": indica o grau de positividade (1.0) ou negatividade (-1.0) do sentimento do texto.
   - "arousal": indica o nível de energia emocional, sendo 1.0 muito energizado/excitado e -1.0 muito calmo/passivo.
   - "dominance": indica o nível de controle percebido no tom, sendo 1.0 dominante/empoderado e -1.0 submisso/influenciado.

   Considere que Pleasure e Arousal devem ser avaliados como dimensões **independentes, mas interligadas**, identificando se a combinação sugere emoções específicas (ex.: prazer alto + ativação alta pode indicar entusiasmo; prazer baixo + ativação alta pode indicar tensão).

4. **padAnalysisReview**: (string) Escreva uma breve revisão interpretando os valores do PAD. Explique o que os valores representam e como eles se relacionam com o tom emocional do texto. Inclua, se possível, qual emoção provável é indicada pela combinação dos valores. Comece esta string EXATAMENTE com: "🔍 Revisão PAD:"

Responda em português brasileiro.
`;

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

        console.log('Received feedback from Gemini API.');

        let feedbackJsonText = response.text;
        let feedbackText;
        try {
            // Remove any potential markdown formatting (like ```json) from the response
            if (feedbackJsonText.startsWith('```json')) {
                feedbackJsonText = feedbackJsonText.replace(/^```json\s*|\s*```$/g, '');
            }

            feedbackText = JSON.parse(feedbackJsonText);
        } catch (parseError) {
            console.error('Erro ao analisar a resposta JSON:', parseError);
            return res.status(500).json({ error: 'A resposta da API Gemini não está no formato esperado.' });
        }

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
