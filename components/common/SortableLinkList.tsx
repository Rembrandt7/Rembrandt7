import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LinkItem } from '../../types';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children, disabled }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

interface SortableLinkListProps {
  items: LinkItem[];
  id: string; // Container ID
  renderItem: (item: LinkItem, index: number) => React.ReactNode;
  className?: string;
  isEditing: boolean;
  strategy?: any;
  children?: React.ReactNode;
  onReorder?: (items: LinkItem[]) => void;
}

export const SortableLinkList: React.FC<SortableLinkListProps> = ({
  items,
  id,
  renderItem,
  className,
  isEditing,
  strategy = rectSortingStrategy,
  children,
}) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <SortableContext id={id} items={items.map((i) => i.id)} strategy={strategy}>
      <div ref={setNodeRef} className={className}>
        {items.map((item, index) => (
          <SortableItem key={item.id} id={item.id} disabled={false}>
            {renderItem(item, index)}
          </SortableItem>
        ))}
        {children}
      </div>
    </SortableContext>
  );
};
