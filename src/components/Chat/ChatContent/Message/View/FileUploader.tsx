import * as pdfjsLib from 'pdfjs-dist';
import React, { ChangeEvent, useState } from 'react';
import { PromptFile } from '@type/chat';
import { Dropzone, ExtFile, FileMosaic } from '@files-ui/react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;

const SUPPORTED_FILE_TYPES = [
  'text/plain', 'application/json', 'application/pdf',
];
const SUPPORTED_FILE_EXTENSIONS = [
  ".txt", ".json", ".pdf"
]

function FileUploader(
  {
    files,
    isOpen,
    onTextUploaded,
    onRemoveFiles,
  }: {
    files: ExtFile[],
    isOpen: boolean,
    onTextUploaded: (file: PromptFile, extFile: ExtFile) => void
    onRemoveFiles: () => void
  }) {

  const updateFiles = async (newFiles: ExtFile[]) => {
    if (!newFiles.length) {
      onRemoveFiles();
      return;
    }
    newFiles.forEach(file => {
      if (!files.includes(file) && file.type) {
        if (file.name && file.file && SUPPORTED_FILE_TYPES.includes(file.type)) {
          if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
              if (e.target) {
                const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let extractedText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent();
                  const pageText = textContent.items.map((item: any) => item.str).join(' ');
                  extractedText += pageText + '\n';
                }
                console.log('extractedText');
                console.log(extractedText);
                if (extractedText) {
                  onTextUploaded(
                    {
                      name: file.name || 'file',
                      content: extractedText,
                    },
                    file,
                  );
                }
              }
            };
            reader.readAsArrayBuffer(file.file);
          } else {
            const reader = new FileReader();
            reader.onload = async (e) => {
              if (e.target) {
                onTextUploaded(
                  {
                    name: file.name || 'file',
                    content: e.target.result as string,
                  },
                  file,
                );
              }
            };
            reader.readAsText(file.file);
          }
        }
      }
    });


  };

  return (
    <div>
      {isOpen &&
        <Dropzone
          onChange={updateFiles}
          value={files}
          footerConfig={{
            allowedTypesLabel: true,
            customMessage: `${SUPPORTED_FILE_EXTENSIONS.join(", ")} files supported`,
          }}
        >
          {files.map((file: ExtFile, index: number) => (
            <FileMosaic key={index} {...file} preview />
          ))}
        </Dropzone>
      }
    </div>
  );
}

export default FileUploader;
