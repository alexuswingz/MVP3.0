'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-white/10 transition-colors ${isActive ? 'bg-white/15 text-white' : 'text-gray-400'}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-600" aria-hidden />;
}

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  editable?: boolean;
  onFocusChange?: (focused: boolean) => void;
  /** Background color for the editor container (default: #1A202C). Use modal background to match. */
  background?: string;
  /** When true, content expands to fit and no scrollbar is shown (for full visibility when editing). */
  expandToFit?: boolean;
  /** When true, automatically focus the editor and show toolbar on mount. */
  autoFocus?: boolean;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write something...',
  className = '',
  contentClassName = '',
  editable = true,
  onFocusChange,
  background = '#1A202C',
  expandToFit = false,
  autoFocus = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);
  const [isFocused, setIsFocused] = useState(autoFocus);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const fontSizeRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((cmd: string, cmdValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, cmdValue);
  }, []);

  const handleInput = useCallback(() => {
    if (!editorRef.current || isInternalUpdate.current) return;
    const html = editorRef.current.innerHTML;
    onChange?.(html);
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url) {
      exec('createLink', url);
      setTimeout(() => handleInput(), 0);
    }
  }, [exec, handleInput]);

  const insertImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        exec('insertImage', reader.result as string);
        setTimeout(() => handleInput(), 0);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [exec, handleInput]
  );

  const insertAttachment = useCallback(() => {
    attachmentInputRef.current?.click();
  }, []);

  const handleAttachmentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      exec('insertHTML', `<p>📎 <a href="#" target="_blank">${file.name}</a></p>`);
      setTimeout(() => handleInput(), 0);
      e.target.value = '';
    },
    [exec, handleInput]
  );

  // Sync value from props (e.g. switching tickets) - only when different to avoid cursor jumps
  useEffect(() => {
    if (!editorRef.current) return;
    const el = editorRef.current;
    const html = value || '';
    if (el.innerHTML !== html) {
      isInternalUpdate.current = true;
      el.innerHTML = html || '';
      isInternalUpdate.current = false;
    }
  }, [value]);

  // Auto-focus the editor on mount when autoFocus is true
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      setTimeout(() => {
        editorRef.current?.focus();
      }, 0);
    }
  }, [autoFocus]);

  // Close font size dropdown when clicking outside
  useEffect(() => {
    if (!showFontSizeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setShowFontSizeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFontSizeDropdown]);

  const setFontSize = useCallback((size: string) => {
    editorRef.current?.focus();
    exec('fontSize', size);
    setTimeout(() => handleInput(), 0);
    setShowFontSizeDropdown(false);
  }, [exec, handleInput]);

  const handleContentFocus = useCallback(() => {
    setIsFocused(true);
    onFocusChange?.(true);
  }, [onFocusChange]);
  const handleContentBlur = useCallback(() => {
    setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
        onFocusChange?.(false);
      }
    }, 0);
  }, [onFocusChange]);

  const handleFormat = useCallback(
    (cmd: string) => () => {
      editorRef.current?.focus();
      exec(cmd);
      // Small delay to ensure DOM is updated before reading innerHTML
      setTimeout(() => {
        handleInput();
      }, 0);
    },
    [exec, handleInput]
  );

  return (
    <div
      ref={wrapperRef}
      className={`overflow-hidden rounded-lg flex flex-col ${className}`}
      style={{
        background,
        ...(isFocused && {
          border: '1px solid #3B82F6',
          boxSizing: 'border-box',
        }),
      }}
    >
      {/* Toolbar - only visible when editor is focused (clicked) */}
      {isFocused && (
      <div
        className="flex items-center flex-wrap box-border"
        style={{
          width: 488,
          height: 44,
          padding: '8px 12px 16px',
          gap: 12,
          opacity: 1,
          background: '#141C2D',
          marginBottom: 8,
        }}
      >
        <ToolbarButton onClick={handleFormat('bold')} title="Bold">
          <span className="text-sm font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton onClick={handleFormat('italic')} title="Italic">
          <span className="text-sm italic">I</span>
        </ToolbarButton>
        <ToolbarButton onClick={handleFormat('underline')} title="Underline">
          <span className="text-sm underline">U</span>
        </ToolbarButton>
        <ToolbarButton onClick={handleFormat('strikeThrough')} title="Strikethrough">
          <span className="text-sm line-through">S</span>
        </ToolbarButton>
        {/* Font Size Dropdown */}
        <div ref={fontSizeRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
            title="Text Size"
            className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 flex items-center gap-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showFontSizeDropdown && (
            <div 
              className="absolute top-full left-0 mt-1 bg-[#1e293b] border border-gray-600 rounded-md shadow-lg z-50 py-1 min-w-[100px]"
              style={{ zIndex: 9999 }}
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontSize('1')}
                className="w-full px-3 py-1 text-left text-xs text-gray-300 hover:bg-white/10"
              >
                Small
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontSize('3')}
                className="w-full px-3 py-1 text-left text-sm text-gray-300 hover:bg-white/10"
              >
                Normal
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontSize('5')}
                className="w-full px-3 py-1 text-left text-base text-gray-300 hover:bg-white/10"
              >
                Large
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontSize('7')}
                className="w-full px-3 py-1 text-left text-lg text-gray-300 hover:bg-white/10"
              >
                Extra Large
              </button>
            </div>
          )}
        </div>
        <ToolbarButton onClick={handleFormat('insertUnorderedList')} title="Bullet List">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={handleFormat('insertOrderedList')} title="Numbered List">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m-4 4h10" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={insertLink} title="Link">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={insertImage} title="Image">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={insertAttachment} title="Attachment">
          <input
            ref={attachmentInputRef}
            type="file"
            className="hidden"
            onChange={handleAttachmentChange}
          />
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </ToolbarButton>
      </div>
      )}

      {/* Editable content - innerHTML synced via useEffect to avoid React overwriting on input */}
      <div
        ref={editorRef}
        contentEditable={editable}
        data-placeholder={placeholder}
        onFocus={handleContentFocus}
        onBlur={(e) => { handleInput(); handleContentBlur(); }}
        onInput={handleInput}
        className={`rich-text-editor-content min-h-[120px] px-3 py-2 text-sm text-gray-300 focus:outline-none rounded-b-lg transition-colors duration-150 hover:bg-white/[0.08] [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-gray-500 ${expandToFit ? 'overflow-visible min-h-fit-content' : 'overflow-auto'} ${contentClassName}`}
        style={{ background }}
        suppressContentEditableWarning
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .rich-text-editor-content[contenteditable="true"] {
          outline: none;
        }
        .rich-text-editor-content[contenteditable="true"] p { margin: 0.25em 0; }
        .rich-text-editor-content[contenteditable="true"] ul, .rich-text-editor-content[contenteditable="true"] ol {
          padding-left: 1.5em; margin: 0.5em 0;
        }
        .rich-text-editor-content[contenteditable="true"] ul { list-style-type: disc; }
        .rich-text-editor-content[contenteditable="true"] ol { list-style-type: decimal; }
        .rich-text-editor-content[contenteditable="true"] li { margin: 0.25em 0; }
        .rich-text-editor-content[contenteditable="true"] a { color: #60a5fa; text-decoration: underline; cursor: pointer; }
        .rich-text-editor-content[contenteditable="true"] img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
      `}} />
    </div>
  );
}
