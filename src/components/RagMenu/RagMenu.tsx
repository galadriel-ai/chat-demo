import React from 'react';
import PopupModal from '@components/PopupModal';
import { PromptFile } from '@type/chat';
import FileUploader from '@components/Chat/ChatContent/Message/View/FileUploader';
import { ExtFile } from '@files-ui/react';
import Toggle from '@components/Toggle';
import SpinnerIcon from '@icon/SpinnerIcon';

const RagMenu = (
  {
    uploaderFiles,
    setIsModalOpen,
    isLoading,
    onInsert,
    onRemoveFiles,
    isRagEnabled,
    onSetRagEnabled,
  }:
    {
      uploaderFiles: ExtFile[],
      setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
      isLoading: boolean,
      onInsert: (file: PromptFile, extFile: ExtFile) => Promise<void>,
      onRemoveFiles: () => Promise<void>,
      isRagEnabled: boolean,
      onSetRagEnabled: (isEnabled: boolean) => void,
    },
) => {
  const handleFileUpload = async (file: PromptFile, extFile: ExtFile) => {
    await onInsert(file, extFile);
  };

  const handleConfirm = () => {
    setIsModalOpen(false);
  };

  const onSetRagStatus = () => {
    if (!uploaderFiles || !uploaderFiles.length) return;
    onSetRagEnabled(!isRagEnabled);
  };

  return (
    <PopupModal
      title='RAG configuration'
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleConfirm}
      handleClickBackdrop={handleConfirm}
      cancelButton={false}
    >
      <div className='flex flex-col gap-4'>
        <FileUploader
          files={uploaderFiles}
          isOpen={true}
          onTextUploaded={handleFileUpload}
          onRemoveFiles={onRemoveFiles}
        />
        <div className='flex flex-row gap-x-2 items-center'>
          <Toggle
            label='RAG enabled'
            isChecked={isRagEnabled}
            setIsChecked={onSetRagStatus}
          />
          {isLoading && <SpinnerIcon />}
        </div>
      </div>
    </PopupModal>
  );
};

export default RagMenu;
