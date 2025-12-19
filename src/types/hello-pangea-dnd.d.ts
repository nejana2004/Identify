declare module '@hello-pangea/dnd' {
  import * as React from 'react';

  // Draggable
  export interface DraggableProps {
    draggableId: string;
    index: number;
    children: (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => React.ReactElement;
    isDragDisabled?: boolean;
    disableInteractiveElementBlocking?: boolean;
    shouldRespectForcePress?: boolean;
  }

  export interface DraggableProvided {
    draggableProps: DraggableProvidedDraggableProps;
    dragHandleProps: DraggableProvidedDragHandleProps | null;
    innerRef: (element?: HTMLElement | null) => void;
    placeholder?: React.ReactElement | null;
  }

  export interface DraggableProvidedDraggableProps {
    style?: React.CSSProperties;
    'data-rbd-draggable-id': string;
    'data-rbd-draggable-context-id': string;
    [key: string]: any;
  }

  export interface DraggableProvidedDragHandleProps {
    'data-rbd-drag-handle-draggable-id': string;
    'data-rbd-drag-handle-context-id': string;
    'aria-describedby': string;
    role: string;
    tabIndex: number;
    draggable: boolean;
    onDragStart: (event: React.DragEvent<HTMLElement>) => void;
    [key: string]: any;
  }

  export interface DraggableStateSnapshot {
    isDragging: boolean;
    isDropAnimating: boolean;
    isClone: boolean;
    dropAnimation?: DropAnimation;
    draggingOver?: string;
    combineWith?: string;
    combineTargetFor?: string;
    mode?: string;
  }

  export interface DropAnimation {
    duration: number;
    curve: string;
    moveTo: {
      x: number;
      y: number;
    };
    opacity?: number;
    scale?: number;
  }

  export class Draggable extends React.Component<DraggableProps> {}

  // Droppable
  export interface DroppableProps {
    droppableId: string;
    type?: string;
    mode?: 'standard' | 'virtual';
    isDropDisabled?: boolean;
    isCombineEnabled?: boolean;
    direction?: 'horizontal' | 'vertical';
    ignoreContainerClipping?: boolean;
    renderClone?: (
      provided: DraggableProvided,
      snapshot: DraggableStateSnapshot,
      rubric: DraggableRubric
    ) => React.ReactElement;
    getContainerForClone?: () => HTMLElement;
    children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactElement;
  }

  export interface DroppableProvided {
    innerRef: (element?: HTMLElement | null) => void;
    droppableProps: {
      'data-rbd-droppable-id': string;
      'data-rbd-droppable-context-id': string;
    };
    placeholder?: React.ReactElement | null;
  }

  export interface DroppableStateSnapshot {
    isDraggingOver: boolean;
    draggingOverWith?: string;
    draggingFromThisWith?: string;
    isUsingPlaceholder: boolean;
  }

  export interface DraggableRubric {
    draggableId: string;
    type: string;
    source: {
      droppableId: string;
      index: number;
    };
  }

  export class Droppable extends React.Component<DroppableProps> {}

  // DragDropContext
  export interface DragDropContextProps {
    onDragStart?: (start: DragStart, provided: ResponderProvided) => void;
    onDragUpdate?: (update: DragUpdate, provided: ResponderProvided) => void;
    onDragEnd: (result: DropResult, provided: ResponderProvided) => void;
    children: React.ReactNode;
    liftInstruction?: string;
    screenReaderAnnounce?: (message: string) => void;
    nonce?: string;
    enableDefaultSensors?: boolean;
    sensors?: Sensor[];
  }

  export interface DragStart {
    draggableId: string;
    type: string;
    source: {
      droppableId: string;
      index: number;
    };
    mode: 'FLUID' | 'SNAP';
  }

  export interface DragUpdate extends DragStart {
    destination?: {
      droppableId: string;
      index: number;
    };
    combine?: {
      draggableId: string;
      droppableId: string;
    };
  }

  export interface DropResult extends DragUpdate {
    reason: 'DROP' | 'CANCEL';
  }

  export interface ResponderProvided {
    announce: (message: string) => void;
  }

  export interface Sensor {
    name: string;
    startCaptureMode: (props: {
      onStartCapture: (fn: any) => void;
      onCaptureEnd: (fn: any) => void;
    }) => void;
    stopCaptureMode: () => void;
  }

  export class DragDropContext extends React.Component<DragDropContextProps> {}
}
