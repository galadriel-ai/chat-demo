import React, { useState } from 'react';
import RagMenu from '@components/RagMenu/RagMenu';
import { postEmbedding } from '@api/embedding-api';
import useStore from '@store/store';
import { insertVectors } from '@utils/vectorStore';
import { ExtFile } from '@files-ui/react';
import { PromptFile } from '@type/chat';
import { defaultEmbeddingChunkLength } from '@constants/chat';
import { Orama } from '@orama/orama/dist/commonjs/types';

const RagTitle = React.memo((
  {
    vectorDb,
    onRemoveAll,
    isRagEnabled,
    onSetRagEnabled,
  }: {
    vectorDb: Orama<any>,
    onRemoveAll: () => void,
    isRagEnabled: boolean,
    onSetRagEnabled: (isEnabled: boolean) => void,
  },
) => {
  const apiKey = useStore((state) => state.apiKey);

  const [uploaderFiles, setUploaderFiles] = useState<ExtFile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);


  const onInsert = async (file: PromptFile, extFile: ExtFile): Promise<void> => {
    setIsLoading(true)
    const chunkLength = defaultEmbeddingChunkLength;
    const chunks: string[] = [];
    for (let i = 0; i < file.content.length; i += chunkLength) {
      chunks.push(file.content.substring(i, i + chunkLength));
    }
    const response = await postEmbedding(
      apiKey || '',
      chunks,
    );
    setUploaderFiles([...uploaderFiles, extFile]);
    onSetRagEnabled(true);
    if (response.data && response.data.length) {
      await insertVectors(
        vectorDb,
        response.data.map((d: any, i: number) => {
          return {
            content: chunks[i], embedding: d.embedding,
          };
        }),
      );
    }
    setIsLoading(false)
  };


  const onRemoveFiles = async (): Promise<void> => {
    setUploaderFiles([]);
    onRemoveAll();
  };

  return (
    <>
      <div
        className='flex gap-x-4 gap-y-1 flex-wrap w-full items-center justify-center border-b border-black/10 bg-gray-50 p-3 dark:border-gray-900/50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer'
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <div className='flex gap-x-4 justify-between w-full'>
          <div />
          <div>Configure RAG</div>
          <div>RAG {isRagEnabled ? 'enabled' : 'disabled'}</div>
        </div>

      </div>
      {isModalOpen &&
        <RagMenu
          uploaderFiles={uploaderFiles}
          setIsModalOpen={setIsModalOpen}
          isLoading={isLoading}
          onInsert={onInsert}
          onRemoveFiles={onRemoveFiles}
          isRagEnabled={isRagEnabled}
          onSetRagEnabled={onSetRagEnabled}
        />
      }
    </>
  );
});


export default RagTitle;
