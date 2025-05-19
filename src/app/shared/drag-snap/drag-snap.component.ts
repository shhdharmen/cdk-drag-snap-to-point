import {
  afterNextRender,
  Component,
  ElementRef,
  viewChild,
  signal,
  computed,
  input,
  NgZone,
  inject,
} from '@angular/core';
import { CdkDrag, CdkDragEnd } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-drag-snap',
  imports: [CdkDrag, MatButtonModule],
  templateUrl: './drag-snap.component.html',
  styleUrl: './drag-snap.component.scss',
})
export class DragSnapComponent {
  private readonly boundary = viewChild<ElementRef<HTMLDivElement>>('boundary');
  private readonly dragElement =
    viewChild<ElementRef<HTMLDivElement>>('dragElement');
  readonly predictFinalPosition = input<boolean>(false);
  readonly distanceForPrediction = input<number>(10);

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
  lastDragDirection = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  lastDragDistance = signal<number>(0);
  currentCorner = signal<
    'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT'
  >('TOP_LEFT');

  finalPosition = computed<{ x: number; y: number }>(() => {
    // Get all valid positions
    const positions = this.validPositions();

    // If prediction is enabled and we have sufficient drag distance
    if (
      this.predictFinalPosition() &&
      this.lastDragDistance() >= this.distanceForPrediction()
    ) {
      const direction = this.lastDragDirection();
      const currentCornerPos = this.currentCorner();

      // For diagonal movements (when x and y are similar in magnitude), use angle-based detection
      const ratio = Math.abs(direction.x) / (Math.abs(direction.y) || 0.001); // Avoid division by zero
      const isDiagonal = ratio >= 0.5 && ratio <= 2.0;

      if (isDiagonal) {
        // It's a diagonal movement - use angle-based detection
        // Calculate the angle of movement in degrees (0-360)
        let angle = Math.atan2(direction.y, direction.x) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        // Define diagonal regions
        // DOWN_RIGHT: 0-45
        // RIGHT_DOWN: 45-90
        // DOWN_LEFT: 90-135
        // LEFT_DOWN: 135-180
        // UP_LEFT: 180-225
        // LEFT_UP: 225-270
        // UP_RIGHT: 270-315
        // RIGHT_UP: 315-360

        if ((angle >= 0 && angle < 45) || (angle >= 315 && angle < 360)) {
          // DOWN_RIGHT or RIGHT_UP
          return angle < 90 ? positions.BOTTOM_RIGHT : positions.TOP_RIGHT;
        } else if (angle >= 45 && angle < 135) {
          // RIGHT_DOWN or DOWN_LEFT
          return angle < 90 ? positions.BOTTOM_RIGHT : positions.BOTTOM_LEFT;
        } else if (angle >= 135 && angle < 225) {
          // LEFT_DOWN or UP_LEFT
          return angle < 180 ? positions.BOTTOM_LEFT : positions.TOP_LEFT;
        } else {
          // LEFT_UP or UP_RIGHT
          return angle < 270 ? positions.TOP_LEFT : positions.TOP_RIGHT;
        }
      } else {
        // Not diagonal - determine primary direction
        const isPrimaryHorizontal =
          Math.abs(direction.x) > Math.abs(direction.y);
        const isPositiveDirection = isPrimaryHorizontal
          ? direction.x > 0
          : direction.y > 0;

        if (isPrimaryHorizontal) {
          // Primarily horizontal movement (RIGHT or LEFT)
          if (isPositiveDirection) {
            // RIGHT movement - determine TOP_RIGHT or BOTTOM_RIGHT based on y position
            return this.userDragPosition().y > this.clientHeight / 2
              ? positions.BOTTOM_RIGHT
              : positions.TOP_RIGHT;
          } else {
            // LEFT movement - determine TOP_LEFT or BOTTOM_LEFT based on starting corner
            // Special case: if starting from BOTTOM_LEFT, moving LEFT should go to TOP_LEFT
            if (currentCornerPos === 'BOTTOM_LEFT') {
              return positions.TOP_LEFT;
            }

            // Otherwise, determine based on current position
            return this.userDragPosition().y > this.clientHeight / 2
              ? positions.BOTTOM_LEFT
              : positions.TOP_LEFT;
          }
        } else {
          // Primarily vertical movement (DOWN or UP)
          if (isPositiveDirection) {
            // DOWN movement
            const isInRightHalf =
              this.userDragPosition().x > this.clientWidth / 2;
            return isInRightHalf
              ? positions.BOTTOM_RIGHT
              : positions.BOTTOM_LEFT;
          } else {
            // UP movement
            const isInRightHalf =
              this.userDragPosition().x > this.clientWidth / 2;
            return isInRightHalf ? positions.TOP_RIGHT : positions.TOP_LEFT;
          }
        }
      }
    }

    // Fall back to quadrant-based logic if prediction is disabled or drag distance is insufficient
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

  private ngZone = inject(NgZone);

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
            x: this.clientWidth - this.dragElementClientWidth,
            y: this.clientHeight - this.dragElementClientHeight,
          },
        }));

        // Set initial position to TOP_LEFT
        const initialPosition = this.validPositions().TOP_LEFT;
        this.userDragPosition.set({
          x: initialPosition.x,
          y: initialPosition.y,
        });
        this.currentCorner.set('TOP_LEFT');
      }
    });
  }

  // Helper method to directly set position to a specific corner
  setCorner(
    cornerName: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT'
  ) {
    const positions = this.validPositions();
    const position = positions[cornerName];

    if (!position) {
      console.error(`Invalid corner name: ${cornerName}`);
      return;
    }

    this.ngZone.run(() => {
      // Ensure coordinates are exact without any floating point issues
      const exactPosition = {
        x: Math.round(position.x),
        y: Math.round(position.y),
      };

      // Update the position
      this.userDragPosition.set(exactPosition);
      this.currentCorner.set(cornerName);

      // Force change detection
      setTimeout(() => {
        // Verify and fix if needed
        const currentPos = this.userDragPosition();
        if (
          currentPos.x !== exactPosition.x ||
          currentPos.y !== exactPosition.y
        ) {
          console.warn('Position correction needed');
          this.userDragPosition.set(exactPosition);
        }
      }, 50);
    });
  }

  dragEnded(ev: CdkDragEnd) {
    // Get current position first
    const currentPosition = ev.source.getFreeDragPosition();

    // Track the drag direction and distance
    const dragDistance = Math.sqrt(
      Math.pow(ev.distance.x, 2) + Math.pow(ev.distance.y, 2)
    );

    this.lastDragDistance.set(dragDistance);
    this.lastDragDirection.set({
      x: ev.distance.x,
      y: ev.distance.y,
    });

    // Update user position with current position before applying snap
    this.userDragPosition.set({
      x: currentPosition.x,
      y: currentPosition.y,
    });

    // Reset the drag element to its start position to prevent jumps
    ev.source._dragRef.reset();

    // Set the element's position to the calculated final position
    // This defers the update until after Angular change detection
    setTimeout(() => {
      const position = this.finalPosition();

      // Force the element to snap exactly to one of the four corners
      let cornerName: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';
      const positions = this.validPositions();

      // Determine which corner this position corresponds to
      if (
        position.x === positions.TOP_LEFT.x &&
        position.y === positions.TOP_LEFT.y
      ) {
        cornerName = 'TOP_LEFT';
      } else if (
        position.x === positions.TOP_RIGHT.x &&
        position.y === positions.TOP_RIGHT.y
      ) {
        cornerName = 'TOP_RIGHT';
      } else if (
        position.x === positions.BOTTOM_LEFT.x &&
        position.y === positions.BOTTOM_LEFT.y
      ) {
        cornerName = 'BOTTOM_LEFT';
      } else {
        cornerName = 'BOTTOM_RIGHT';
      }

      // Use setCorner method to ensure proper positioning
      this.setCorner(cornerName);
    }, 0);
  }
}
