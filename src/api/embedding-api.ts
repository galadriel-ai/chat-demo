import { defaultEmbeddingModel } from '@constants/chat';

export const postEmbedding = async (apiKey: string, inputs: string[]): Promise<any | null> => {
  const response = await fetch('https://api.galadriel.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: defaultEmbeddingModel,
      input: inputs,
    }),
  });
  return await response.json();
};
