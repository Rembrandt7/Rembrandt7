import React from 'react';
import { useSortable, SortableContext } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkItem } from '../../types';

interface SortableItemWrapperProps {
  id: string;
  isEditing: boolean;
  itemClassName?: string;
  children: React.ReactNode;
}

const SortableItemWrapper: React.FC<SortableItemWrapperProps> = ({ id, isEditing, itemClassName, children }) => {
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
      className={`${itemClassName || 'flex-shrink min-w-0'} flex items-center justify-center ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
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
  itemClassName?: string;
  containerRef?: React.Ref<HTMLDivElement>;
  renderItem: (item: LinkItem, index: number) => React.ReactNode;
}

export const SortableLinkList: React.FC<SortableLinkListProps> = ({
  items,
  isEditing,
  strategy,
  className,
  itemClassName,
  containerRef,
  renderItem,
}) => {
  return (
    <SortableContext
      items={items.map((item) => item.id)}
      strategy={strategy}
    >
      <div ref={containerRef} className={className}>
        {items.map((item, index) => (
          <SortableItemWrapper key={item.id} id={item.id} isEditing={isEditing} itemClassName={itemClassName}>
            {renderItem(item, index)}
          </SortableItemWrapper>
        ))}
      </div>
    </SortableContext>
  );
};
