import React from 'react';
import { useSortable, SortableContext } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkItem } from '../../types';

interface SortableItemWrapperProps {
  id: string;
  isEditing: boolean;
  children: React.ReactNode;
}

const SortableItemWrapper: React.FC<SortableItemWrapperProps> = ({ id, isEditing, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  const sortableProps = isEditing
    ? { ...attributes, ...listeners }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isEditing ? 'cursor-grab active:cursor-grabbing' : undefined}
      {...sortableProps}
    >
      {children}
    </div>
  );
};

interface SortableLinkListProps {
  id: string;
  items: LinkItem[];
  isEditing: boolean;
  onReorder?: (newItems: LinkItem[]) => void;
  strategy: any;
  className?: string;
  renderItem: (item: LinkItem, index: number) => React.ReactNode;
}

export const SortableLinkList: React.FC<SortableLinkListProps> = ({
  items,
  isEditing,
  strategy,
  className,
  renderItem,
}) => {
  return (
    <SortableContext
      items={items.map((item) => item.id)}
      strategy={strategy}
    >
      <div className={className}>
        {items.map((item, index) => (
          <SortableItemWrapper key={item.id} id={item.id} isEditing={isEditing}>
            {renderItem(item, index)}
          </SortableItemWrapper>
        ))}
      </div>
    </SortableContext>
  );
};
