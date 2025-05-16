import { Component } from '@angular/core';
import { DragSnapComponent } from './shared/drag-snap/drag-snap.component';

@Component({
  selector: 'app-root',
  imports: [DragSnapComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'cdk-drag-snap-to-point';
}
