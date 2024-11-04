import React from 'react';
import useStore from '@store/store';

import Avatar from './Avatar';
import MessageContent from './MessageContent';

import { Role } from '@type/chat';
import RoleSelector from './RoleSelector';

// const backgroundStyle: { [role in Role]: string } = {
//   user: 'dark:bg-gray-800',
//   assistant: 'bg-gray-50 dark:bg-gray-650',
//   system: 'bg-gray-50 dark:bg-gray-650',
// };
const backgroundStyle = ['dark:bg-gray-800', 'bg-gray-50 dark:bg-gray-650'];

const Message = React.memo(
  ({
     role,
     content,
     messageIndex,
     ttftMs,
     promptTokens,
     completionTokens,
     tokensPerSec,
     price,
     sticky = false,
   }: {
    role: Role;
    content: string;
    messageIndex: number;
    ttftMs?: number;
    promptTokens?: number;
    completionTokens?: number;
    tokensPerSec?: number;
    price?: number;
    sticky?: boolean;
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
            <MessageContent
              role={role}
              content={content}
              messageIndex={messageIndex}
              sticky={sticky}
            />
          </div>
        </div>
      </div>
    );
  },
);

export default Message;
