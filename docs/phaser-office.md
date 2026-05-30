# Phaser Office

The office is driven by `packages/game-schema/src/index.ts`.

Each interactable has:

- id
- label
- kind
- x/y/width/height
- action
- panel

The Phaser scene creates interactive zones from this registry and emits `agentos:interaction` events. React receives the events and opens the matching panel.
