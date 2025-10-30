# Color Puzzle Game

This is a code bundle for Color Puzzle Game. The original project is available at https://www.figma.com/design/qM2SkGtcRizaxL5HgAU1QV/Color-Puzzle-Game.

## Running the code

Run `npm i` to install the dependencies.
Run `npm run dev` to start the development server.

## Unlocking / relocking all levels for QA

Levels are currently forced unlocked to make it easy to jump to any stage while testing.

- The toggle lives in `src/components/menu.tsx` as the `FORCE_LEVELS_UNLOCKED` constant.
- Set this constant to `false` to restore the regular progression rules where each level unlocks after completing the previous one.
- Set it back to `true` whenever you need all levels unlocked for another testing pass.
