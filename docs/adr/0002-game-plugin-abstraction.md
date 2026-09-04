# Modular Game Plugin Abstraction

To support adding new 1-on-1 games (such as Hangman, Tic-Tac-Toe) without touching networking or lobby code, the platform decouples the core shell from individual game implementations. Each game is implemented as a self-contained module conforming to a `GameDefinition` interface providing state management, move validation, win conditions, and UI rendering.
