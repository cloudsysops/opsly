import type { UniverseCharacter, VisualDna } from '../types.js';

export function getVisualDna(character: UniverseCharacter): VisualDna {
  return character.visualIdentity.dna;
}

export function formatVisualDnaBlock(character: UniverseCharacter): string {
  const dna = getVisualDna(character);
  const invariants = dna.invariants.map((item) => `- ${item}`).join('\n');
  const negatives = dna.negatives.map((item) => `- ${item}`).join('\n');
  return [
    `${character.name} VISUAL DNA:`,
    dna.styleAnchor,
    'INVARIANTS:',
    invariants,
    'NEGATIVE CONSISTENCY:',
    negatives,
  ].join('\n');
}

export function collectVisualDna(characters: UniverseCharacter[]): string {
  return characters.map(formatVisualDnaBlock).join('\n\n');
}
