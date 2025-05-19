# Angular CDkDrag Demo - Stick cdkDrag only to allowed points

https://github.com/user-attachments/assets/3a7c39f4-6408-4e74-8a37-7c80bef5c5c4

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.12.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end testing with Playwright, we have two test scripts:

### Basic Drag Tests
To run the basic drag tests:

```bash
npm run test:e2e
```

### Comprehensive Corner Tests
To run tests for all drag scenarios from all corners:

```bash
npm run test:corners
```

**Note:** Make sure the development server is running at `http://localhost:4200` before executing these tests.

## Test Coverage

The comprehensive corner tests verify drag behavior from all four corners (TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT) in all eight directions:
- RIGHT
- DOWN
- LEFT
- UP
- DOWN_RIGHT
- DOWN_LEFT
- UP_RIGHT
- UP_LEFT

This ensures the drag-snap component correctly predicts and snaps to the final position in all possible scenarios.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
