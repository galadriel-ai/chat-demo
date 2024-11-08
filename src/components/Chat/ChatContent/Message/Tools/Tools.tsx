import React, { useEffect, useState } from 'react';
import useStore from '@store/store';

import useHideOnOutsideClick from '@hooks/useHideOnOutsideClick';
import { Tool } from '@type/tool';
import { supportedTools } from '@constants/tools';
import { ChatInterface } from '@type/chat';
import Toggle from '@components/Toggle';

const Tools = () => {

  const chats = useStore((state) => state.chats);
  const setChats = useStore((state) => state.setChats);
  const currentChatIndex = useStore((state) => state.currentChatIndex);

  const [dropDown, setDropDown, dropDownRef] = useHideOnOutsideClick();

  const [enabledTools, setEnabledTools] = useState<string[]>([]);

  useEffect(() => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats),
    );
    let tools_enabled: Tool[] = [];
    if (updatedChats[currentChatIndex].config.enabled_tools) {
      tools_enabled = updatedChats[currentChatIndex].config.enabled_tools;
    }
    setEnabledTools(tools_enabled.map(t => t.name));
    // Need chats in the dependencies here, since currentChatIndex changes 0 => 0 if user on
    // the top chat and creates a new one
  }, [currentChatIndex, chats]);

  const toggleTool = async (name: string) => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats),
    );
    const currentChat = updatedChats[currentChatIndex];
    if (!currentChat.config.enabled_tools || !currentChat.config.enabled_tools.length) {
      currentChat.config.enabled_tools = supportedTools.filter(t => t.name === name);
    } else {
      const alreadyEnabled = supportedTools.filter(t => t.name === name).length;
      if (alreadyEnabled) {
        currentChat.config.enabled_tools = currentChat.config.enabled_tools.filter(t => t.name !== name);
      } else {
        currentChat.config.enabled_tools.push(supportedTools.filter(t => t.name === name)[0]);
      }
    }
    setChats(updatedChats);
    setEnabledTools(currentChat.config.enabled_tools.map(t => t.name));
  };

  return (
    <div className='relative max-wd-sm' ref={dropDownRef}>
      <button
        className='btn btn-neutral btn-small'
        aria-label='prompt library'
        onClick={() => setDropDown(!dropDown)}
      >
        Tools
      </button>
      <div
        className={`${
          dropDown ? '' : 'hidden'
        } absolute top-100 bottom-100 right-0 z-10 bg-white rounded-lg shadow-xl border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group dark:bg-gray-800 opacity-90 max-w-sm`}
      >
        <div className='text-sm px-4 py-2 w-max'>Available tools</div>
        <ul
          className='text-sm text-gray-700 dark:text-gray-200 p-0 m-0 w-full max-md:max-w-[90vw] max-h-32 overflow-auto'>
          {supportedTools.map((tool: Tool, index: number) => (
            <li
              className='px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer text-start w-full'
              onClick={() => {
                toggleTool(tool.name);
              }}
              key={`tool-${index}`}
            >
              <Toggle
                label={tool.name}
                isChecked={enabledTools.includes(tool.name)}
                setIsChecked={() => {
                  toggleTool(tool.name);
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Tools;
