import React, { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import useSubmit from '@hooks/useSubmit';

import { ChatInterface, PromptFile } from '@type/chat';

import PopupModal from '@components/PopupModal';
import CommandPrompt from '../CommandPrompt';
import FileUploader from '@components/Chat/ChatContent/Message/View/FileUploader';
import { ExtFile } from '@files-ui/react';
import ArrowBottom from '@icon/ArrowBottom';
import countTokens from '@utils/messageUtils';
import Tools from '@components/Chat/ChatContent/Message/Tools';
import { modelsSupportingTools } from '@constants/chat';
import { Orama } from '@orama/orama/dist/commonjs/types';
import { getDocumentCount, searchVectors } from '@utils/vectorStore';
import { postEmbedding } from '@api/embedding-api';

const EditView = (
  {
    isRagEnabled,
    content,
    setIsEdit,
    messageIndex,
    sticky,
    vectorDb,
  }: {
    isRagEnabled: boolean,
    content: string,
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>,
    messageIndex: number,
    sticky?: boolean,
    vectorDb?: Orama<any>,
  }) => {
  const inputRole = useStore((state) => state.inputRole);
  const setChats = useStore((state) => state.setChats);
  const chats = useStore((state) => state.chats);
  const currentChatIndex = useStore((state) => state.currentChatIndex);
  const apiKey = useStore((state) => state.apiKey);

  const [_content, _setContent] = useState<string>(content);

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [promptFiles, setPromptFiles] = useState<PromptFile[]>([]);
  const [uploaderFiles, setUploaderFiles] = useState<ExtFile[]>([]);


  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const textareaRef = React.createRef<HTMLTextAreaElement>();

  const [isToolsSupported, setIsToolsSupported] = useState<boolean>(false);

  useEffect(() => {
    const chats = useStore.getState().chats;
    if (chats) {
      const model = chats[currentChatIndex].config.model;
      if (modelsSupportingTools.includes(model)) {
        setIsToolsSupported(true);
      } else {
        setIsToolsSupported(false);
      }
    }
  }, [chats]);

  const { t } = useTranslation();

  const resetTextAreaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|playbook|silk/i.test(
        navigator.userAgent,
      );

    if (e.key === 'Enter' && !isMobile && !e.nativeEvent.isComposing) {
      const enterToSubmit = useStore.getState().enterToSubmit;

      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        handleGenerate();
        resetTextAreaHeight();
      } else if (
        (enterToSubmit && !e.shiftKey) ||
        (!enterToSubmit && (e.ctrlKey || e.shiftKey))
      ) {
        if (sticky) {
          e.preventDefault();
          handleGenerate();
          resetTextAreaHeight();
        } else {
          handleSave();
        }
      }
    }
  };

  const handleFileUpload = (file: PromptFile, extFile: ExtFile) => {
    const chats = useStore.getState().chats;
    if (chats) {
      const tokenCount = countTokens([{ role: 'user', content: file.content }], chats[currentChatIndex].config.model);
      if (tokenCount > chats[currentChatIndex].config.max_tokens) {
        useStore.getState()
          .setToastMessage(
            `File is ${tokenCount} tokens long, Max token for the chat is configured at ${chats[currentChatIndex].config.max_tokens}`,
          );
        useStore.getState().setToastShow(true);
        useStore.getState().setToastStatus('error');
      }
    }
    setUploaderFiles([...uploaderFiles, extFile]);
    setPromptFiles([...promptFiles, file]);
    _setContent(`${_content} {${file.name}}`);
  };

  const handleSave = () => {
    if (sticky && (_content === '' || useStore.getState().generating)) return;
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats),
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;
    if (sticky) {
      updatedMessages.push({ role: inputRole, content: _content });
      _setContent('');
      resetTextAreaHeight();
    } else {
      updatedMessages[messageIndex].content = _content;
      setIsEdit(false);
    }
    setChats(updatedChats);
  };

  const { handleSubmit } = useSubmit();
  const handleGenerate = async () => {
    if (useStore.getState().generating) return;
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats),
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;

    let displayContent = _content;
    let ragContent = undefined;
    let fullContent = _content;
    // ===== RAG
    if (vectorDb && isRagEnabled) {
      const docCount = getDocumentCount(vectorDb);
      if (docCount) {
        const response = await postEmbedding(apiKey || '', [_content]);
        if (response.data && response.data.length) {
          const searchResult = await searchVectors(vectorDb, response.data[0].embedding);
          if (searchResult && searchResult.length) {
            ragContent = '';
            ragContent += 'Context:\n\n';
            ragContent += searchResult.join('\n');
            fullContent += '\n';
            fullContent += 'Context:\n';
            fullContent += searchResult.join('\n');
          }
        }
      }
    }
    // ===== Add prompt file ? Is this needed anymore after RAG?
    promptFiles.forEach((file: PromptFile) => {
      fullContent = fullContent.replaceAll(`{${file.name}}`, file.content);
    });


    if (sticky) {
      if (_content !== '') {
        updatedMessages.push({ role: inputRole, content: fullContent, displayContent, ragContent });
      }
      _setContent('');
      setUploaderFiles([]);
      setIsUploadOpen(false);
      setPromptFiles([]);
      resetTextAreaHeight();
    } else {
      updatedMessages[messageIndex].displayContent = displayContent;
      updatedMessages[messageIndex].ragContent = ragContent;
      updatedMessages[messageIndex].content = fullContent;
      updatedChats[currentChatIndex].messages = updatedMessages.slice(
        0,
        messageIndex + 1,
      );
      setIsEdit(false);
    }
    setChats(updatedChats);
    handleSubmit();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [_content]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  return (
    <>
      <div
        className={`w-full ${
          sticky
            ? 'py-2 md:py-3 px-2 md:px-4 border border-black/10 bg-white dark:border-gray-900/50 dark:text-white dark:bg-gray-700 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]'
            : ''
        }`}
      >
        <textarea
          ref={textareaRef}
          className='m-0 resize-none rounded-lg bg-transparent overflow-y-hidden focus:ring-0 focus-visible:ring-0 leading-7 w-full placeholder:text-gray-500/40'
          onChange={(e) => {
            _setContent(e.target.value);
          }}
          value={_content}
          placeholder={t('submitPlaceholder') as string}
          onKeyDown={handleKeyDown}
          rows={1}
        ></textarea>
      </div>
      <FileUploader
        files={uploaderFiles}
        isOpen={isUploadOpen}
        onTextUploaded={handleFileUpload}
        onRemoveFiles={() => setUploaderFiles([])}
      />
      <EditViewButtons
        sticky={sticky}
        handleGenerate={handleGenerate}
        handleSave={handleSave}
        setIsModalOpen={setIsModalOpen}
        setIsEdit={setIsEdit}
        _setContent={_setContent}
        isUploadOpen={isUploadOpen}
        onToggleUpload={() => setIsUploadOpen(!isUploadOpen)}
        isToolsSupported={isToolsSupported}
      />
      {isModalOpen && (
        <PopupModal
          setIsModalOpen={setIsModalOpen}
          title={t('warning') as string}
          message={t('clearMessageWarning') as string}
          handleConfirm={handleGenerate}
        />
      )}
    </>
  );
};

const EditViewButtons = memo(
  ({
     sticky = false,
     handleGenerate,
     handleSave,
     setIsModalOpen,
     setIsEdit,
     _setContent,
     isUploadOpen,
     onToggleUpload,
     isToolsSupported,
   }: {
    sticky?: boolean;
    handleGenerate: () => void;
    handleSave: () => void;
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
    _setContent: React.Dispatch<React.SetStateAction<string>>;
    isUploadOpen: boolean,
    onToggleUpload: () => void,
    isToolsSupported: boolean;
  }) => {
    const { t } = useTranslation();
    const generating = useStore.getState().generating;
    const advancedMode = useStore((state) => state.advancedMode);

    return (
      <div className='flex'>
        <div className={'justify-center'}>
          <button
            className={`btn relative mr-2 flex flex-row gap-2 fill-white ${
              sticky
                ? `btn-neutral ${
                  generating ? 'cursor-not-allowed opacity-40' : ''
                }`
                : 'btn-neutral'
            }`}
            onClick={onToggleUpload}
          >
            <ArrowBottom
              className={`h-3 w-3 transition-all duration-100 text-white ${
                !isUploadOpen ? 'rotate-180' : ''
              }`}
            />
            Upload file
          </button>
        </div>
        <div className='flex-1 text-center mt-2 flex justify-center'>

          {sticky && (
            <button
              className={`btn relative mr-2 btn-primary ${
                generating ? 'cursor-not-allowed opacity-40' : ''
              }`}
              onClick={handleGenerate}
              aria-label={t('generate') as string}
            >
              <div className='flex items-center justify-center gap-2'>
                {t('generate')}
              </div>
            </button>
          )}

          {sticky || (
            <button
              className='btn relative mr-2 btn-primary'
              onClick={() => {
                !generating && setIsModalOpen(true);
              }}
            >
              <div className='flex items-center justify-center gap-2'>
                {t('generate')}
              </div>
            </button>
          )}

          <button
            className={`btn relative mr-2 ${
              sticky
                ? `btn-neutral ${
                  generating ? 'cursor-not-allowed opacity-40' : ''
                }`
                : 'btn-neutral'
            }`}
            onClick={handleSave}
            aria-label={t('save') as string}
          >
            <div className='flex items-center justify-center gap-2'>
              {t('save')}
            </div>
          </button>

          {sticky || (
            <button
              className='btn relative btn-neutral'
              onClick={() => setIsEdit(false)}
              aria-label={t('cancel') as string}
            >
              <div className='flex items-center justify-center gap-2'>
                {t('cancel')}
              </div>
            </button>
          )}
        </div>
        {/*{sticky && advancedMode && <TokenCount />}*/}
        <div className={'flex flex-row gap-2 items-center'}>
          {isToolsSupported && <Tools />}
          <CommandPrompt _setContent={_setContent} />
        </div>
      </div>
    );
  },
);

export default EditView;
