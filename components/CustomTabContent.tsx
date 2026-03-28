import React, { useState } from 'react';
import { LinkItem, TabConfig } from '../types';
import { DevLinkCard } from './common/DevLinkCard';
import { useLinks } from '../contexts/LinkContext';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { LinkEditorModal } from './common/LinkEditorModal';
import { SortableLinkList } from './common/SortableLinkList';
import { rectSortingStrategy } from '@dnd-kit/sortable';
import CommandsTab from './CommandsTab';

interface CustomTabContentProps {
  tab: TabConfig;
}

const CustomTabContent: React.FC<CustomTabContentProps> = ({ tab }) => {
  const { isEditing, updateConfig, config } = useLinks();
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (tab.label.toLowerCase() === 'autocad') {
    return <CommandsTab programFilter="All" />;
  }

  const handleAddLink = () => {
    setEditingLink(null);
    setIsModalOpen(true);
  };

  const handleEditLink = (link: LinkItem) => {
    setEditingLink(link);
    setIsModalOpen(true);
  };

  const handleDeleteLink = (linkId: string) => {
    if (window.confirm('¿Eliminar este acceso directo?')) {
      const newTabs = config.tabs.map(t => {
        if (t.id === tab.id) {
          return { ...t, items: t.items?.filter(i => i.id !== linkId) || [] };
        }
        return t;
      });
      updateConfig({ ...config, tabs: newTabs });
    }
  };

  const handleSaveLink = (link: LinkItem, targetSection?: string) => {
    let newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
    const currentSec = `tab:${tab.id}`;

    // If moving to a different section
    if (targetSection && targetSection !== currentSec) {
      // Remove from current tab
      const tabIndex = newConfig.tabs.findIndex((t: any) => t.id === tab.id);
      if (tabIndex >= 0) {
        newConfig.tabs[tabIndex].items = newConfig.tabs[tabIndex].items?.filter((i: any) => i.id !== link.id) || [];
      }

      // Add to target
      if (targetSection === 'linksBar') {
        newConfig.linksBar.push(link);
      } else if (targetSection === 'googleDock') {
        newConfig.googleDock.push(link);
      } else if (targetSection.startsWith('aiSidebar')) {
        const sub = targetSection.split('.')[1] as 'models' | 'quickAccess';
        newConfig.aiSidebar[sub].push(link);
      } else if (targetSection.startsWith('rightSidebar')) {
        const idx = parseInt(targetSection.split('.')[1]);
        if (newConfig.rightSidebar[idx]) {
          newConfig.rightSidebar[idx].items.push(link);
        }
      } else if (targetSection.startsWith('tab:')) {
        const targetTabId = targetSection.split(':')[1];
        const targetTabIndex = newConfig.tabs.findIndex((t: any) => t.id === targetTabId);
        if (targetTabIndex >= 0) {
          if (!newConfig.tabs[targetTabIndex].items) {
            newConfig.tabs[targetTabIndex].items = [];
          }
          newConfig.tabs[targetTabIndex].items.push(link);
        }
      } else if (targetSection.startsWith('usefulTools.')) {
        const idx = parseInt(targetSection.split('.')[1]);
        if (newConfig.usefulTools[idx]) {
          newConfig.usefulTools[idx].items.push(link);
        }
      }
    } else {
      // Standard update or add within same tab
      newConfig.tabs = newConfig.tabs.map((t: any) => {
        if (t.id === tab.id) {
          const items = t.items || [];
          const existingIndex = items.findIndex((i: any) => i.id === link.id);
          let newItems;
          if (existingIndex >= 0) {
            newItems = [...items];
            newItems[existingIndex] = link;
          } else {
            newItems = [...items, { ...link, id: link.id || Date.now().toString() }];
          }
          return { ...t, items: newItems };
        }
        return t;
      });
    }

    updateConfig(newConfig);
    setIsModalOpen(false);
  };

  const handleReorder = (newItems: LinkItem[]) => {
    const newTabs = config.tabs.map(t => 
      t.id === tab.id ? { ...t, items: newItems } : t
    );
    updateConfig({ ...config, tabs: newTabs });
  };

  return (
    <div className="max-w-7xl mx-auto p-8 min-h-[70vh] flex flex-col items-center">
      <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-12 text-center">
        {tab.label}
      </h2>

      <SortableLinkList 
        id={`tab:${tab.id}`}
        items={tab.items || []}
        isEditing={isEditing}
        onReorder={handleReorder}
        strategy={rectSortingStrategy}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full justify-items-center"
        renderItem={(item) => (
          <div key={item.id} className="relative group w-full max-w-sm">
             <DevLinkCard
                href={isEditing ? undefined : item.href}
                name={item.name}
                description={item.description || ''}
                colorClass={item.colorClass || 'hover:shadow-blue-500/20'}
             >
                <div dangerouslySetInnerHTML={{ __html: item.iconSvg }} className="h-20 w-20 text-white flex items-center justify-center" />
             </DevLinkCard>
             
             {isEditing && (
                <div className="absolute top-2 right-2 flex gap-2 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditLink(item); }}
                    className="p-2 bg-gray-800 rounded-full hover:bg-blue-600 transition-colors border border-gray-600"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteLink(item.id); }}
                    className="p-2 bg-gray-800 rounded-full hover:bg-red-600 transition-colors border border-gray-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
             )}
          </div>
        )}
      />

      {isEditing && (
        <div className="mt-8 w-full flex justify-center">
          <button
            onClick={handleAddLink}
            className="group relative flex flex-col items-center justify-center p-8 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-all duration-300 border-2 border-dashed border-gray-700 hover:border-gray-500 w-full max-w-sm h-full min-h-[200px]"
          >
            <Plus size={48} className="text-gray-500 group-hover:text-gray-300 mb-4" />
            <span className="text-gray-500 group-hover:text-gray-300 font-medium">Agregar Nuevo</span>
          </button>
        </div>
      )}

      <LinkEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveLink}
        initialItem={editingLink}
        currentSection={`tab:${tab.id}`}
        showSectionSelector={true} 
      />
    </div>
  );
};

export default CustomTabContent;
