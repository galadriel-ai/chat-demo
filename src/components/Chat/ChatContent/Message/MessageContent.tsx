import React, { useState } from 'react';
import useStore from '@store/store';

import ContentView from './View/ContentView';
import EditView from './View/EditView';
import { Orama } from '@orama/orama/dist/commonjs/types';

const MessageContent = ({
  isRagEnabled,
  role,
  content,
  messageIndex,
  ragContent,
  vectorDb,
  sticky = false,
}: {
  isRagEnabled: boolean,
  role: string,
  content: string,
  messageIndex: number,
  ragContent?: string,
  vectorDb?: Orama<any>,
  sticky?: boolean,
}) => {
  const [isEdit, setIsEdit] = useState<boolean>(sticky);
  const advancedMode = useStore((state) => state.advancedMode);

  return (
    <div className='relative flex flex-col gap-2 md:gap-3 lg:w-[calc(100%-115px)]'>
      {advancedMode && <div className='flex flex-grow flex-col gap-3'></div>}
      {isEdit ? (
        <EditView
          isRagEnabled={isRagEnabled}
          content={content}
          setIsEdit={setIsEdit}
          messageIndex={messageIndex}
          sticky={sticky}
          vectorDb={vectorDb}
        />
      ) : (
        <ContentView
          role={role}
          content={role !== "tool" ? content : `${content.slice(0, 200)}...`}
          ragContent={ragContent}
          setIsEdit={setIsEdit}
          messageIndex={messageIndex}
        />
      )}
    </div>
  );
};

export default MessageContent;
