# Source Architecture

This folder follows a feature-friendly scalable structure for the CareFinger user app.

## Folders

- `app`: app bootstrap and providers.
- `screens`: top-level UI screens.
- `components`: reusable UI components used across screens.
- `navigation`: route definitions and navigators.
- `theme`: colors, spacing, typography, and design tokens.
- `constants`: app-wide static values and display strings.
- `services`: API and external service integrations.
- `hooks`: reusable custom hooks.
- `utils`: generic helper functions.
- `types`: shared TypeScript types/interfaces.
- `assets`: typed asset exports.

## Growth Guidelines

- Keep business logic in `services` and hooks, not inside screen components.
- Keep screens composition-focused and move reusable UI into `components`.
- Export module public APIs from each folder `index.ts`.
