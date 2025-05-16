import {
  afterNextRender,
  Component,
  ElementRef,
  viewChild,
  signal,
  computed,
} from '@angular/core';
import { CdkDrag, CdkDragEnd } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-drag-snap',
  imports: [CdkDrag],
  templateUrl: './drag-snap.component.html',
  styleUrl: './drag-snap.component.scss',
})
export class DragSnapComponent {
  private readonly boundary = viewChild<ElementRef<HTMLDivElement>>('boundary');
  private readonly dragElement =
    viewChild<ElementRef<HTMLDivElement>>('dragElement');

  readonly validPositions = signal<{
    TOP_LEFT: { x: number; y: number };
    TOP_RIGHT: { x: number; y: number };
    BOTTOM_LEFT: { x: number; y: number };
    BOTTOM_RIGHT: { x: number; y: number };
  }>({
    TOP_LEFT: { x: 0, y: 0 },
    TOP_RIGHT: { x: 0, y: 0 },
    BOTTOM_LEFT: { x: 0, y: 0 },
    BOTTOM_RIGHT: { x: 0, y: 0 },
  });
  userDragPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  finalPosition = computed<{ x: number; y: number }>(() => {
    // Get all valid positions
    const positions = this.validPositions();

    // Get the current quadrant the element is in
    const isInRightHalf = this.userDragPosition().x > this.clientWidth / 2;
    const isInBottomHalf = this.userDragPosition().y > this.clientHeight / 2;

    // Determine target position based on current quadrant
    let targetPosition;

    if (!isInRightHalf && !isInBottomHalf) {
      targetPosition = positions.TOP_LEFT;
    } else if (isInRightHalf && !isInBottomHalf) {
      targetPosition = positions.TOP_RIGHT;
    } else if (!isInRightHalf && isInBottomHalf) {
      targetPosition = positions.BOTTOM_LEFT;
    } else {
      targetPosition = positions.BOTTOM_RIGHT;
    }

    // Update the drag position to the target position
    return { x: targetPosition.x, y: targetPosition.y };
  });
  clientHeight = 0;
  clientWidth = 0;
  dragElementClientHeight = 0;
  dragElementClientWidth = 0;

  constructor() {
    afterNextRender(() => {
      const boundaryElement = this.boundary()?.nativeElement;
      const dragElement = this.dragElement()?.nativeElement;
      if (boundaryElement && dragElement) {
        this.clientHeight = boundaryElement.clientHeight;
        this.clientWidth = boundaryElement.clientWidth;

        this.dragElementClientHeight = dragElement.clientHeight;
        this.dragElementClientWidth = dragElement.clientWidth;

        this.validPositions.update((validPositions) => ({
          ...validPositions,
          TOP_RIGHT: {
            x: this.clientWidth - this.dragElementClientWidth,
            y: 0,
          },
          BOTTOM_LEFT: {
            x: 0,
            y: this.clientHeight - this.dragElementClientHeight,
          },
          BOTTOM_RIGHT: {
            x: this.clientWidth - this.dragElementClientHeight,
            y: this.clientHeight - this.dragElementClientHeight,
          },
        }));
      }
    });
  }

  dragEnded(ev: CdkDragEnd) {
    // Get the final position after drag (dropPoint represents relative movement)
    const finalPosition = {
      x: this.finalPosition().x + ev.distance.x,
      y: this.finalPosition().y + ev.distance.y,
    };

    this.userDragPosition.set(finalPosition);
  }
}
