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
      // For PDF, just pass the file for now (viewing handled elsewhere)
      onFileLoaded('', file);
    } else {
      reader.readAsText(file);
    }
  }

  return (
    <label className="custom-file-upload modern-upload-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 22px', border: '2px solid #0096e6', borderRadius: 8, background: '#f7fafc', color: '#0096e6', fontWeight: 600, fontSize: '1.08rem', boxShadow: '0 2px 8px 0 rgba(0,150,230,0.08)', transition: 'background 0.2s, color 0.2s, border 0.2s' }}>
      <svg width="20" height="20" fill="none" stroke="#0096e6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
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
