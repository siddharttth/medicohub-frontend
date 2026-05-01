import apiClient from './axios';

interface AskAIResponse {
  answer: string;
  sources?: string[];
}

export const aiApi = {
  ask: (question: string, context?: string): Promise<AskAIResponse> =>
    apiClient.post('/ai/ask', { question, context }).then((r) => r.data),
};
