import React from 'react';
import useStore from '@store/store';

import Avatar from './Avatar';
import MessageContent from './MessageContent';

import { Role } from '@type/chat';
import { Orama } from '@orama/orama/dist/commonjs/types';

// const backgroundStyle: { [role in Role]: string } = {
//   user: 'dark:bg-gray-800',
//   assistant: 'bg-gray-50 dark:bg-gray-650',
//   system: 'bg-gray-50 dark:bg-gray-650',
// };
const backgroundStyle = ['dark:bg-gray-800', 'bg-gray-50 dark:bg-gray-650'];

const Message = React.memo(
  ({
     isRagEnabled,
     role,
     content,
     messageIndex,
     toolCalls,
     displayContent,
     ragContent,
     ttftMs,
     promptTokens,
     completionTokens,
     tokensPerSec,
     price,
     vectorDb,
     sticky = false,
   }: {
    isRagEnabled: boolean,
    role: Role,
    content: string,
    messageIndex: number,
    toolCalls?: any[],
    displayContent?: string,
    ragContent?: string,
    ttftMs?: number,
    promptTokens?: number,
    completionTokens?: number,
    tokensPerSec?: number,
    price?: number,
    vectorDb?: Orama<any>,
    sticky?: boolean,
  }) => {
    const hideSideMenu = useStore((state) => state.hideSideMenu);
    // const advancedMode = useStore((state) => state.advancedMode);

    return (
      <div
        className={`w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group ${
          backgroundStyle[messageIndex % 2]
        }`}
      >
        <div
          className={`text-base gap-4 md:gap-6 m-auto p-4 md:py-6 flex transition-all ease-in-out ${
            hideSideMenu
              ? 'md:max-w-5xl lg:max-w-5xl xl:max-w-6xl'
              : 'md:max-w-3xl lg:max-w-3xl xl:max-w-4xl'
          }`}
        >
          <Avatar role={role} />
          <div className='w-[calc(100%-50px)] '>
            {/*{advancedMode &&*/}
            {/*  <RoleSelector*/}
            {/*    role={role}*/}
            {/*    messageIndex={messageIndex}*/}
            {/*    sticky={sticky}*/}
            {/*  />}*/}
            <div className={'flex flex-row gap-4 py-2 text-xs italic text-gray-900 dark:text-gray-300'}>
              {ttftMs &&
                <div className={'flex flex-col'}>
                  <div>ttft</div>
                  <div>{ttftMs} ms</div>
                </div>
              }
              {(promptTokens && completionTokens) &&
                <div className={'flex flex-col'}>
                  <div>prompt/completion tokens</div>
                  <div>{promptTokens}/{completionTokens}</div>
                </div>
              }
              {tokensPerSec &&
                <div className={'flex flex-col'}>
                  <div>tok/sec</div>
                  <div>{tokensPerSec.toFixed(2)}</div>
                </div>
              }
              {price &&
                <div className={'flex flex-col'}>
                  <div>price</div>
                  <div>{price.toFixed(5)}$</div>
                </div>
              }
            </div>
            {(toolCalls && toolCalls.length) ?
              <>
                <MessageContent
                  isRagEnabled={isRagEnabled}
                  role={role}
                  content={`Calling: **${toolCalls[0].function?.name}** with arguments: **${JSON.stringify(toolCalls[0].function?.arguments)}**`}
                  messageIndex={messageIndex}
                  sticky={sticky}
                />
              </>
              :
              <MessageContent
                isRagEnabled={isRagEnabled}
                role={role}
                content={displayContent || content}
                ragContent={ragContent}
                messageIndex={messageIndex}
                sticky={sticky}
                vectorDb={vectorDb}
              />
            }

          </div>
        </div>
      </div>
    );
  },
);

export default Message;
