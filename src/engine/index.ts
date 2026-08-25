/**
 * src/engine — public surface for the UI layer.
 * Runtime path: turn resolver + creation + rng + save + audit + types.
 */

export * from './types';
export * from './rng';
export * from './audit';
export * from './save';
export { executeCommand } from './turn';
export { parseCommand, COMMAND_SPECS } from './commands';
export {
  newGame,
  chooseOrigin,
  allocateAttributes,
  rollSpiritRoot,
  rollHiddenFate,
} from './creation';
export { breakthroughChance } from './breakthrough';
export { atMajorGate, isAtMajorGate, majorGateTarget } from './realms';
export { powerOf, defenseOf, combatPower, defenseValue, FREE_POINTS, CREATION_CAP } from './attributes';
