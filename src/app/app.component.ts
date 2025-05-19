import { Component, signal } from '@angular/core';
import { DragSnapComponent } from './shared/drag-snap/drag-snap.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-root',
  imports: [
    DragSnapComponent,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    FormsModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'cdk-drag-snap-to-point';
  predictFinalPosition = signal(true);
  distanceForPrediction = signal(10);
}
