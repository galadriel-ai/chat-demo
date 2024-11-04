export interface EventSourceDataInterface {
  choices: EventSourceDataChoices[];
  usage: EventSourceUsage;
  created: number;
  id: string;
  model: string;
  object: string;
}

export type EventSourceData = EventSourceDataInterface | '[DONE]';

export interface EventSourceDataChoices {
  delta: {
    content?: string;
    role?: string;
  };
  finish_reason?: string;
  index: number;
}

export interface EventSourceUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ShareGPTSubmitBodyInterface {
  avatarUrl: string;
  items: {
    from: 'gpt' | 'human';
    value: string;
  }[];
}
