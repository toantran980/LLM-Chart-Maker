import { useRef } from 'react';

interface FileUploadProps {
  onFileLoaded: (content: string, file: File) => void;
}

/**
 * FileUpload component allows users to upload .txt, .pdf, .doc, or .docx files.
 * It reads the content of text files and passes it to the parent component via onFileLoaded callback.
 * For PDF files, it directly passes the file object for further processing (e.g., rendering).  
 */
export default function FileUpload({ onFileLoaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onFileLoaded(reader.result, file);
      }
    };
    if (file.type === 'application/pdf') {
      onFileLoaded('', file);
    } else {
      reader.readAsText(file);
    }
  }

  return (
    <label className="modern-upload-btn">
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span>Upload File</span>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.pdf,.doc,.docx"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </label>
  );
}

