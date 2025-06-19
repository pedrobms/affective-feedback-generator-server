# Servidor para Geração de Feedback Afetivo

Este é o repositório do servidor backend para o projeto Gerador de Feedback Afetivo.

## Visão Geral

Este servidor utiliza a API Gemini do Google para fornecer dois tipos de feedback sobre um texto enviado pelo usuário:

1.  **Feedback Técnico:** Uma análise da gramática, estrutura e clareza do texto.
2.  **Feedback Afetivo:** Palavras de encorajamento para motivar o escritor.

O projeto é construído com Node.js e Express.

## Tecnologias Utilizadas

* **Node.js**
* **Express**
* **Google GenAI API**
* **Cors**
* **Dotenv**

## Configuração

O servidor está configurado para ser implantado na Vercel.

### Variáveis de Ambiente

Para executar este projeto, você precisará criar um arquivo `.env` ou `.env.local` com as seguintes variáveis:

* `API_KEY`: Sua chave de API para a API Gemini do Google.
* `MODEL`: O nome do modelo Gemini a ser usado (por exemplo, "gemini-pro").
* `ALLOWED_ORIGIN`: A URL do frontend que tem permissão para fazer requisições a este servidor.
* `PORT`: A porta em que o servidor será executado (o padrão é 3001).

### Instalação

1.  Clone o repositório.
2.  Instale as dependências com `npm install`.
3.  Crie o arquivo de ambiente apropriado (`.env` ou `.env.local`).
4.  Inicie o servidor com `npm start` ou execute `node server.js`.

## API

### Rota de Feedback

* **POST** `/api/generate-feedback`

  Gera feedback para um determinado texto.

  **Corpo da Requisição:**

    ```json
    {
      "text": "O texto a ser avaliado."
    }
    ```

  **Resposta de Sucesso:**

    ```json
    {
      "feedback": "O feedback gerado pela IA."
    }
    ```

  **Respostas de Erro:**

    * `400 Bad Request`: Se nenhum texto for fornecido.
    * `500 Internal Server Error`: Se houver um erro ao se comunicar com a API Gemini ou outra falha do servidor.
