import { MessageInterface, ModelOptions, TotalTokenUsed } from '@type/chat';

import useStore from '@store/store';
import llama3Tokenizer from 'llama3-tokenizer-js';


export const getChatGPTEncoding = (
  messages: MessageInterface[],
  model: ModelOptions,
) => {
  const msgSep = '<|eot_id|>';
  const roleStart = "<|start_header_id|>";
  const roleEnd = "<|end_header_id|>\n\n";

  const serialized = "<|begin_of_text|>" + [
    messages
      .map(({ role, content }) => {
        return `${roleStart}${role}${roleEnd}${content}`;
      })
      .join(msgSep),
    `assistant${roleEnd}`,
  ].join(msgSep);

  return llama3Tokenizer.encode(serialized, {bos: true, eos: true})
};

const countTokens = (messages: MessageInterface[], model: ModelOptions) => {
  if (messages.length === 0) return 0;
  // TODO: this is roughly correct most of the time :)
  return getChatGPTEncoding(messages, model).length + 19;
};

export const limitMessageTokens = (
  messages: MessageInterface[],
  limit: number = 4096,
  model: ModelOptions,
): MessageInterface[] => {
  const limitedMessages: MessageInterface[] = [];
  let tokenCount = 0;

  const isSystemFirstMessage = messages[0]?.role === 'system';
  let retainSystemMessage = false;

  // Check if the first message is a system message and if it fits within the token limit
  if (isSystemFirstMessage) {
    const systemTokenCount = countTokens([messages[0]], model);
    if (systemTokenCount < limit) {
      tokenCount += systemTokenCount;
      retainSystemMessage = true;
    }
  }

  // Iterate through messages in reverse order, adding them to the limitedMessages array
  // until the token limit is reached (excludes first message)
  for (let i = messages.length - 1; i >= 1; i--) {
    const count = countTokens([messages[i]], model);
    if (count + tokenCount > limit) break;
    tokenCount += count;
    limitedMessages.unshift({ ...messages[i] });
  }

  // Process first message
  if (retainSystemMessage) {
    // Insert the system message in the third position from the end
    limitedMessages.splice(-3, 0, { ...messages[0] });
  } else if (!isSystemFirstMessage) {
    // Check if the first message (non-system) can fit within the limit
    const firstMessageTokenCount = countTokens([messages[0]], model);
    if (firstMessageTokenCount + tokenCount < limit) {
      limitedMessages.unshift({ ...messages[0] });
    }
  }

  return limitedMessages;
};

export const updateTotalTokenUsed = (
  model: ModelOptions,
  newPromptTokens: number,
  newCompletionTokens: number,
): number => {
  const setTotalTokenUsed = useStore.getState().setTotalTokenUsed;
  const updatedTotalTokenUsed: TotalTokenUsed = JSON.parse(
    JSON.stringify(useStore.getState().totalTokenUsed),
  );

  const { promptTokens = 0, completionTokens = 0 } =
  updatedTotalTokenUsed[model] ?? {};

  const totalPromptTokens = promptTokens + newPromptTokens;
  const totalCompletionTokens = completionTokens + newCompletionTokens;
  updatedTotalTokenUsed[model] = {
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
  };
  setTotalTokenUsed(updatedTotalTokenUsed);
  return totalPromptTokens + totalCompletionTokens;
};

export default countTokens;
