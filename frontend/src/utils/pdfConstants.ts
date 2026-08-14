// PDF rendering and processing constants

export const PDF_SCALE = 1.15;
export const PDF_RENDER_THRESHOLD = 0.1;
export const PDF_OBSERVE_DELAY = 500;
export const PDF_MAX_TEXT_LENGTH = 12000;
export const PDF_TRUNCATION_MESSAGE = '\n\n...[TRUNCATED]';
export const MIN_SELECTION_LENGTH = 5;
export const MIN_CONSOLE_LOG_LENGTH = 3;
export const DEFAULT_HIGHLIGHT_COLOR = '#6366f1';
export const SELECTION_HIGHLIGHT_COLOR = 'rgba(99, 102, 241, 0.4)';
export const SELECTION_BORDER_RADIUS = '2px';

// Text layer error message
export const TEXT_LAYER_ERROR = 'Text layer skipped';

// Error messages
export const PDF_RENDERING_ERROR = 'PDF Rendering Error';
export const EMPTY_SELECTION_ERROR = 'Please select some text on the PDF first!';
export const LOADING_ERROR = 'Please wait for the document to finish loading.';
export const TRUNCATION_WARNING = 'Document is very long. Only the first ~12,000 characters will be sent to the LLM.';