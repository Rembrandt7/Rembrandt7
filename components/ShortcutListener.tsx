import React, { useEffect } from 'react';
import { useLinks } from '../contexts/LinkContext';

const ShortcutListener: React.FC = () => {
  const { config, toggleEditing, saveToSupabase, isEditing } = useLinks();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar si estamos escribiendo en un input, textarea, etc.
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // System Shortcuts
      if (event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        toggleEditing();
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveToSupabase();
        return;
      }

      if (event.key === 'Escape' && isEditing) {
        event.preventDefault();
        toggleEditing();
        return;
      }

      const commands = config.commands || [];
      
      for (const cmd of commands) {
        if (!cmd.shortcut) continue;

        const parts = cmd.shortcut.toLowerCase().split('+');
        const key = parts[parts.length - 1];
        const ctrl = parts.includes('ctrl');
        const shift = parts.includes('shift');
        const alt = parts.includes('alt');
        const meta = parts.includes('win') || parts.includes('meta');

        if (
          event.key.toLowerCase() === key &&
          event.ctrlKey === ctrl &&
          event.shiftKey === shift &&
          event.altKey === alt &&
          event.metaKey === meta
        ) {
          event.preventDefault();
          if (cmd.type === 'shortcut') {
            window.open(cmd.command, '_blank');
          } else {
            navigator.clipboard.writeText(cmd.command);
          }
          console.log(`Executed: ${cmd.title}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.commands, toggleEditing, saveToSupabase, isEditing]);

  return null;
};

export default ShortcutListener;
