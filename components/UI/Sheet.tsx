import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Sheet({ isOpen, onClose, title, children, footer }: SheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="sheet-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="sheet-content glass-panel animate-slide-in-right" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header flex-between">
          <h3 className="sheet-title">{title}</h3>
          <button className="icon-action-btn" onClick={onClose} aria-label="Close sheet">
            <X size={18} />
          </button>
        </div>
        
        <div className="sheet-body">
          {children}
        </div>
        
        {footer && (
          <div className="sheet-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
