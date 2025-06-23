import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, GripVertical } from 'lucide-react';

interface DraggableImageGridProps {
  images: string[];
  mainImageIndex: number;
  onReorder: (newImages: string[]) => void;
  onRemove: (index: number) => void;
  onSetMain: (index: number) => void;
}

interface SortableImageProps {
  id: string;
  image: string;
  index: number;
  isMain: boolean;
  onRemove: () => void;
  onSetMain: () => void;
}

function SortableImage({ id, image, index, isMain, onRemove, onSetMain }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group border-2 rounded-lg overflow-hidden transition-all duration-200 ${
        isDragging ? 'border-blue-400 shadow-lg scale-105 z-50' : 'border-gray-200 hover:border-gray-300'
      } ${isMain ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 bg-black/70 text-white p-1.5 rounded-md cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/90"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Image */}
      <img
        src={image}
        alt={`Upload ${index + 1}`}
        className="w-full h-24 object-cover transition-transform duration-200"
        draggable={false}
      />

      {/* Remove Button */}
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
        onClick={onRemove}
        title="Remove image"
      >
        <X className="h-3 w-3" />
      </Button>

      {/* Main Image Badge */}
      {isMain && (
        <Badge className="absolute bottom-2 left-2 text-xs bg-blue-500 hover:bg-blue-600 transition-colors">
          ⭐ Main
        </Badge>
      )}

      {/* Set as Main Button */}
      {!isMain && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="absolute bottom-2 right-2 h-6 text-xs px-2 py-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-50 hover:border-blue-300"
          onClick={onSetMain}
          title="Set as main image"
        >
          Set Main
        </Button>
      )}

      {/* Image Index Indicator */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        {index + 1}
      </div>
    </div>
  );
}

export default function DraggableImageGrid({
  images,
  mainImageIndex,
  onReorder,
  onRemove,
  onSetMain,
}: DraggableImageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = images.findIndex((_, index) => `image-${index}` === active.id);
      const newIndex = images.findIndex((_, index) => `image-${index}` === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newImages = arrayMove(images, oldIndex, newIndex);
        onReorder(newImages);
      }
    }
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Uploaded Images ({images.length})
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
          Drag to reorder
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={images.map((_, index) => `image-${index}`)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/30">
            {images.map((image, index) => (
              <SortableImage
                key={`image-${index}`}
                id={`image-${index}`}
                image={image}
                index={index}
                isMain={index === mainImageIndex}
                onRemove={() => onRemove(index)}
                onSetMain={() => onSetMain(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <div className="text-blue-500 mt-0.5">💡</div>
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">Image Management Tips:</p>
            <ul className="space-y-1 text-blue-600">
              <li>• Drag images to reorder them</li>
              <li>• Click "Set Main" to designate the primary image</li>
              <li>• Hover over images to see controls</li>
              <li>• The main image appears first in listings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
