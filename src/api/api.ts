import { ShareGPTSubmitBodyInterface } from '@type/api';
import { ConfigInterface, MessageInterface, ModelOptions } from '@type/chat';
import { toolsToApiFormat } from '@type/tool';
import { modelsSupportingTools } from '@constants/chat';

export const getChatCompletion = async (
  endpoint: string,
  messages: MessageInterface[],
  config: ConfigInterface,
  apiKey?: string,
  customHeaders?: Record<string, string>,
) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      ...config,
      max_tokens: undefined,
    }),
  });
  if (!response.ok) throw new Error(await response.text());

  const data = await response.json();
  return data;
};

export const getChatCompletionStream = async (
  endpoint: string,
  messages: MessageInterface[],
  config: ConfigInterface,
  apiKey?: string,
  customHeaders?: Record<string, string>,
) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  // TODO: needs tool calls here too?
  const formattedMessages = messages.map(m => {
    return {
      role: m.role,
      content: m.content,
    };
  });
  const formattedConfig = {
    model: config.model,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
    presence_penalty: config.presence_penalty,
    top_p: config.top_p,
    frequency_penalty: config.frequency_penalty,
  };

  let tools = toolsToApiFormat(config.enabled_tools);
  // const lastMessage = formattedMessages.at(-1);
  // if (lastMessage && lastMessage.role === 'tool') {
  //   tools = undefined;
  // }
  if (!modelsSupportingTools.includes(config.model)) {
    tools = undefined;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: formattedMessages,
      ...formattedConfig,
      max_tokens: undefined,
      stream: true,
      stream_options: {
        include_usage: true,
      },
      tools,
    }),
  });
  if (response.status === 404 || response.status === 405) {
    const text = await response.text();

    if (text.includes('model_not_found')) {
      throw new Error(
        text +
        '\nMessage from Galadriel:\nPlease ensure that you have access to the Galadriel API!',
      );
    } else {
      throw new Error(
        'Message from Galadriel:\nInvalid API endpoint!',
      );
    }
  }

  if (response.status === 429 || !response.ok) {
    const text = await response.text();
    let error = text;
    if (text.includes('insufficient_quota')) {
      error +=
        '\nMessage from Better ChatGPT:\nWe recommend changing your API endpoint or API key';
    } else if (response.status === 429) {
      error += '\nRate limited!';
    }
    throw new Error(error);
  }

  const stream = response.body;
  return stream;
};

export const submitShareGPT = async (body: ShareGPTSubmitBodyInterface) => {
  const request = await fetch('https://sharegpt.com/api/conversations', {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const response = await request.json();
  const { id } = response;
  const url = `https://shareg.pt/${id}`;
  window.open(url, '_blank');
};

export const callTool = async (apiKey: string, name: string, functionArguments: any): Promise<string | null> => {
  if (name === 'web_search') {
    if (functionArguments.query) {
      const response = await fetch('https://api.galadriel.com/v1/tool/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: functionArguments.query,
        }),
      });
      return await response.text();
    }
  }
  return null;
};