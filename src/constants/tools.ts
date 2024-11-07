import { Tool } from '@type/tool';

export const supportedTools: Tool[] = [
  {
    name: 'web_search',
    description: 'Search Google and return top 10 results',
    requiredProperties: ['query'],
    properties: [{
      name: 'query',
      type: 'string',
      description: 'Search query.',
    }],
  },
];