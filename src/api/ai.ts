import apiClient from './axios';

interface AskAIResponse {
  answer: string;
  sources?: string[];
}

export const aiApi = {
  ask: (question: string, subject?: string): Promise<AskAIResponse> =>
    apiClient.post('/ai/ask', { question, subject }).then((r) => r.data.data),
};
