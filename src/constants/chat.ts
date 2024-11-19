import { v4 as uuidv4 } from 'uuid';
import { ChatInterface, ConfigInterface, ModelOptions } from '@type/chat';
import useStore from '@store/store';

export const defaultEmbeddingModel: string = 'gte-large-en-v1.5';
export const defaultEmbeddingChunkLength: number = 400;

const date = new Date();
const dateString =
  date.getFullYear() +
  '-' +
  ('0' + (date.getMonth() + 1)).slice(-2) +
  '-' +
  ('0' + date.getDate()).slice(-2);

// default system message obtained using the following method: https://twitter.com/DeminDimin/status/1619935545144279040
export const _defaultSystemMessage =
  import.meta.env.VITE_DEFAULT_SYSTEM_MESSAGE ??
  `You are Llama3.1, a large language model trained by Meta.
Carefully heed the user's instructions. 
Respond using Markdown.`;

export const modelOptions: ModelOptions[] = [
  'llama3.1:8b',
  'llama3.1:70b',
  'llama3.1:405b',
  'hugging-quants/Meta-Llama-3.1-70B-Instruct-AWQ-INT4',
];

export const modelsSupportingTools: ModelOptions[] = [
  'llama3.1:70b',
  'llama3.1:405b',
  'hugging-quants/Meta-Llama-3.1-70B-Instruct-AWQ-INT4',
];

export const defaultModel = 'llama3.1:70b';

export const modelMaxToken = {
  'llama3.1:8b': 8192,
  'llama3.1:70b': 128000,
  'llama3.1:405b': 128000,
  'hugging-quants/Meta-Llama-3.1-70B-Instruct-AWQ-INT4': 128000,
};

export const modelCost = {
  'llama3.1:8b': {
    prompt: { price: 0.00008, unit: 1000 },
    completion: { price: 0.00008, unit: 1000 },
  },
  'llama3.1:70b': {
    prompt: { price: 0.00079, unit: 1000 },
    completion: { price: 0.00079, unit: 1000 },
  },
  'llama3.1:405b': {
    prompt: { price: 0.0035, unit: 1000 },
    completion: { price: 0.0035, unit: 1000 },
  },
  'hugging-quants/Meta-Llama-3.1-70B-Instruct-AWQ-INT4': {
    prompt: { price: 0.0035, unit: 1000 },
    completion: { price: 0.0035, unit: 1000 },
  },
};

export const defaultUserMaxToken = 4000;

export const _defaultChatConfig: ConfigInterface = {
  model: defaultModel,
  max_tokens: defaultUserMaxToken,
  temperature: 1,
  presence_penalty: 0,
  top_p: 1,
  frequency_penalty: 0,
  enabled_tools: [],
};

export const generateDefaultChat = (
  title?: string,
  folder?: string,
): ChatInterface => ({
  id: uuidv4(),
  title: title ? title : 'New Chat',
  messages:
    useStore.getState().defaultSystemMessage.length > 0
      ? [{ role: 'system', content: useStore.getState().defaultSystemMessage }]
      : [],
  config: { ...useStore.getState().defaultChatConfig },
  titleSet: false,
  folder,
});

export const codeLanguageSubset = [
  'python',
  'javascript',
  'java',
  'go',
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'graphql',
  'json',
  'kotlin',
  'less',
  'lua',
  'makefile',
  'markdown',
  'objectivec',
  'perl',
  'php',
  'php-template',
  'plaintext',
  'python-repl',
  'r',
  'ruby',
  'rust',
  'scss',
  'shell',
  'sql',
  'swift',
  'typescript',
  'vbnet',
  'wasm',
  'xml',
  'yaml',
];
