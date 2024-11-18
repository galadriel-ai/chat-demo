import { count, create, insertMultiple, search } from '@orama/orama';
import { Orama } from '@orama/orama/dist/commonjs/types';


export interface embeddingInput {
  content: string;
  embedding: number[];
}

export const initVectorDB = (): Orama<any> => {
  return create({
    schema: {
      content: 'string',
      // Vector size must be expressed during schema initialization
      embedding: 'vector[1024]',
      meta: {},
    },
  });
};

export const getDocumentCount = (vectorDb: Orama<any>): number => {
  return count(vectorDb);
};

export const insertVectors = async (vectorDb: Orama<any>, inputs: embeddingInput[]): Promise<void> => {
  await insertMultiple(vectorDb, inputs);
};

export const searchVectors = async (vectorDb: Orama<any>, inputs: number[]): Promise<string[]> => {
  const result = await search(vectorDb, {
    mode: 'vector',
    vector: {
      property: 'embedding',
      value: inputs,
    },
    // TODO: set some threshold?
    similarity: 0,
    limit: 4,
  });
  const results: string[] = [];
  if (result && result.hits?.length) {
    result.hits.forEach(r => {
      if (r.document?.content) results.push(r.document.content);
    });
  }
  return results;
};