import useStore from '@store/store';
import { useTranslation } from 'react-i18next';
import { ChatInterface, MessageInterface } from '@type/chat';
import { callTool, getChatCompletion, getChatCompletionStream } from '@api/api';
import { parseEventSource } from '@api/helper';
import { limitMessageTokens, updateTotalTokenUsed } from '@utils/messageUtils';
import { _defaultChatConfig, modelCost } from '@constants/chat';
import { officialAPIEndpoint } from '@constants/auth';

const useSubmit = () => {
  const { t, i18n } = useTranslation('api');
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);
  const apiEndpoint = useStore((state) => state.apiEndpoint);
  const apiKey = useStore((state) => state.apiKey);
  const setGenerating = useStore((state) => state.setGenerating);
  const generating = useStore((state) => state.generating);
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const setChats = useStore((state) => state.setChats);

  const generateTitle = async (
    message: MessageInterface[],
  ): Promise<string> => {
    let data;
    try {
      if (!apiKey || apiKey.length === 0) {
        // official endpoint
        if (apiEndpoint === officialAPIEndpoint) {
          throw new Error(t('noApiKeyWarning') as string);
        }

        // other endpoints
        data = await getChatCompletion(
          useStore.getState().apiEndpoint,
          message,
          _defaultChatConfig,
        );
      } else if (apiKey) {
        // own apikey
        data = await getChatCompletion(
          useStore.getState().apiEndpoint,
          message,
          _defaultChatConfig,
          apiKey,
        );
      }
    } catch (error: unknown) {
      throw new Error(`Error generating title!\n${(error as Error).message}`);
    }
    return data.choices[0].message.content;
  };

  const handleSubmit = async () => {
    const chats = useStore.getState().chats;
    if (generating || !chats) return;

    const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));

    updatedChats[currentChatIndex].messages.push({
      role: 'assistant',
      content: '',
    });

    setChats(updatedChats);
    setGenerating(true);

    let isToolCallRequired = false;
    try {
      let stream;
      if (chats[currentChatIndex].messages.length === 0)
        throw new Error('No messages submitted!');

      const messages = limitMessageTokens(
        chats[currentChatIndex].messages,
        chats[currentChatIndex].config.max_tokens,
        chats[currentChatIndex].config.model,
      );
      if (messages.length === 0) throw new Error('Message exceed max token!');

      const startTime = new Date();
      let ttftMs: number | null = null;
      let promptTokens: number | null = null;
      let completionTokens: number | null = null;
      let tokensPerSec: number | null = null;
      // no api key (free)
      if (!apiKey || apiKey.length === 0) {
        // official endpoint
        if (apiEndpoint === officialAPIEndpoint) {
          throw new Error(t('noApiKeyWarning') as string);
        }

        // other endpoints
        stream = await getChatCompletionStream(
          useStore.getState().apiEndpoint,
          messages,
          chats[currentChatIndex].config,
        );
      } else if (apiKey) {
        // own apikey
        stream = await getChatCompletionStream(
          useStore.getState().apiEndpoint,
          messages,
          chats[currentChatIndex].config,
          apiKey,
        );
      }

      if (stream) {
        if (stream.locked)
          throw new Error(
            'Oops, the stream is locked right now. Please try again',
          );
        const reader = stream.getReader();
        let reading = true;
        let partial = '';
        const toolChunks: any[] = [];
        while (reading && useStore.getState().generating) {
          const { done, value } = await reader.read();
          const result = parseEventSource(
            partial + new TextDecoder().decode(value),
          );
          partial = '';

          if (result === '[DONE]' || done) {
            reading = false;
          } else {
            const resultString = result.reduce((output: string, curr) => {
              if (typeof curr === 'string') {
                partial += curr;
              } else {
                const content = curr.choices[0]?.delta?.content ?? null;
                const newToolChunks = curr.choices[0]?.delta?.tool_calls;
                if (newToolChunks && newToolChunks.length) toolChunks.push(...newToolChunks);
                if (content) output += content;
                else {
                  promptTokens = curr.usage?.prompt_tokens ?? null;
                  completionTokens = curr.usage?.completion_tokens ?? null;
                }
              }
              if (ttftMs === null) {
                ttftMs = (new Date()).getTime() - startTime.getTime();
              }
              return output;
            }, '');

            const updatedChats: ChatInterface[] = JSON.parse(
              JSON.stringify(useStore.getState().chats),
            );
            const updatedMessages = updatedChats[currentChatIndex].messages;
            updatedMessages[updatedMessages.length - 1].content += resultString;
            // Metrics
            if (ttftMs !== null) updatedMessages[updatedMessages.length - 1].ttftMs = ttftMs;
            if (promptTokens) updatedMessages[updatedMessages.length - 1].promptTokens = promptTokens;
            if (completionTokens) {
              updatedMessages[updatedMessages.length - 1].completionTokens = completionTokens;
              tokensPerSec = completionTokens / (((new Date()).getTime() - startTime.getTime()) / 1000);
              updatedMessages[updatedMessages.length - 1].tokensPerSec = tokensPerSec;
            }
            if (promptTokens && completionTokens) {
              const model = updatedChats[currentChatIndex].config.model;
              const totalTokens = updateTotalTokenUsed(
                model,
                promptTokens,
                completionTokens,
              );
              updatedMessages[updatedMessages.length - 1].totalTokens = totalTokens;

              const { prompt, completion } = modelCost[model as keyof typeof modelCost];
              updatedMessages[updatedMessages.length - 1].price = totalTokens * (prompt.price / prompt.unit);
            }
            setChats(updatedChats);
          }
        }


        // Handle tool calls
        const formattedToolCalls = formatToolCallChunks(toolChunks);
        if (formattedToolCalls.length) {
          // Ugly mess, should use the original one, but somehow doesn't work
          const updatedChats: ChatInterface[] = JSON.parse(
            JSON.stringify(useStore.getState().chats),
          );
          const updatedMessages = updatedChats[currentChatIndex].messages;
          updatedMessages[updatedMessages.length - 1].toolCalls = formattedToolCalls;
          setChats(updatedChats);
          isToolCallRequired = true;
        }

        if (useStore.getState().generating) {
          reader.cancel('Cancelled by user');
        } else {
          reader.cancel('Generation completed');
        }
        reader.releaseLock();
        stream.cancel();
      }

      // update tokens used in chatting
      const currChats = useStore.getState().chats;
      // const countTotalTokens = useStore.getState().countTotalTokens;
      // const countTotalTokens = useStore.getState().countTotalTokens;
      const countTotalTokens = true;

      if (currChats && countTotalTokens && promptTokens && completionTokens) {
        const model = currChats[currentChatIndex].config.model;
        const messages = currChats[currentChatIndex].messages;
        const totalTokens = updateTotalTokenUsed(
          model,
          promptTokens,
          completionTokens,
        );
      }

      // generate title for new chats
      if (
        useStore.getState().autoTitle &&
        currChats &&
        !currChats[currentChatIndex]?.titleSet
      ) {
        const messages_length = currChats[currentChatIndex].messages.length;
        const assistant_message =
          currChats[currentChatIndex].messages[messages_length - 1].content;
        const user_message =
          currChats[currentChatIndex].messages[messages_length - 2].content;

        // const message: MessageInterface = {
        //   role: 'user',
        //   content: `Generate a title in less than 6 words for the following message (language: ${i18n.language}):\n"""\nUser: ${user_message}\nAssistant: ${assistant_message}\n"""`,
        // };

        // let title = (await generateTitle([message])).trim();
        // if (title.startsWith('"') && title.endsWith('"')) {
        //   title = title.slice(1, -1);
        // }
        // const updatedChats: ChatInterface[] = JSON.parse(
        //   JSON.stringify(useStore.getState().chats),
        // );
        // updatedChats[currentChatIndex].title = title;
        // updatedChats[currentChatIndex].titleSet = true;
        // setChats(updatedChats);
        //
        // // update tokens used for generating title
        // if (countTotalTokens) {
        //   const model = _defaultChatConfig.model;
        //   updateTotalTokenUsed(model, [message], {
        //     role: 'assistant',
        //     content: title,
        //   });
        // }
      }
    } catch (e: unknown) {
      const err = (e as Error).message;
      console.log(err);
      setError(err);
    }
    setGenerating(false);

    if (isToolCallRequired) {
      await handleToolCall();
    }
  };

  const handleToolCall = async () => {
    const chats = useStore.getState().chats;
    if (generating || !chats) return;

    const updatedChats: ChatInterface[] = JSON.parse(JSON.stringify(chats));

    let name = null;
    let functionArguments = null;
    let functionId = null;
    const lastMessage = updatedChats[currentChatIndex].messages.at(-1);
    if (lastMessage && lastMessage.toolCalls && lastMessage.toolCalls.length) {
      name = lastMessage.toolCalls[0].function.name;
      functionArguments = lastMessage.toolCalls[0].function.arguments;
      functionId = lastMessage.toolCalls[0].id;
    }


    updatedChats[currentChatIndex].messages.push({
      role: 'tool',
      content: '',
    });

    setChats(updatedChats);
    setGenerating(true);
    const updatedMessages = updatedChats[currentChatIndex].messages;

    if (!name || !functionArguments || !functionId) {
      updatedMessages[updatedMessages.length - 1].content += 'Failed to get tool result';
      setChats(updatedChats);
      setGenerating(false);
      return;
    }

    try {
      const toolResponse = await callTool(
        apiKey || '', name, functionArguments,
      );
      if (toolResponse) {
        updatedMessages[updatedMessages.length - 1].content += toolResponse;
        setChats(updatedChats);
        setGenerating(false);
        handleSubmit();
        return;
      } else {
        updatedMessages[updatedMessages.length - 1].content += 'Failed to get tool result';
        setChats(updatedChats);
      }
    } catch (e: unknown) {
      const err = (e as Error).message;
      console.log(err);
      setError(err);
    }
    setGenerating(false);
  };

  const formatToolCallChunks = (toolChunks: any[]): any[] => {
    if (!toolChunks || !toolChunks.length) {
      return [];
    }
    const formattedToolCalls = [];
    const formattedToolCallsObject: any = {};
    toolChunks.forEach(chunk => {
      if (chunk.index !== undefined && chunk.index !== null) {
        if (!formattedToolCallsObject[chunk.index]) {
          // Set default value
          formattedToolCallsObject[chunk.index] = {
            id: null,
            function: {
              name: null,
              arguments: '',
            },
            type: null,
          };
        }

        formattedToolCallsObject[chunk.index].id = formattedToolCallsObject[chunk.index].id || chunk.id;
        formattedToolCallsObject[chunk.index].type = formattedToolCallsObject[chunk.index].type || chunk.type;
        if (chunk.function) {
          formattedToolCallsObject[chunk.index].function.name = formattedToolCallsObject[chunk.index].function.name || chunk.function.name;
          if (chunk.function.arguments) {
            formattedToolCallsObject[chunk.index].function.arguments += chunk.function.arguments;
          }
        }
      }
    });
    for (let [_, value] of Object.entries(formattedToolCallsObject)) {
      try {
        const formattedValue: any = value;
        formattedValue.function.arguments = JSON.parse(formattedValue.function.arguments);
        formattedToolCalls.push(value);
      } catch (e) {

      }
    }
    return formattedToolCalls;
  };

  return { handleSubmit, error };
};

export default useSubmit;
