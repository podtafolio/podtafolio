import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Check if API key is present
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn('GOOGLE_GENERATIVE_AI_API_KEY is not set. AI features may fail.');
}

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
