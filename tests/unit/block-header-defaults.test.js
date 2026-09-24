// Every new block used to be titled "INTERACTIVE ACCORDION": the editor's base config is the
// Accordion demo and any component without its own header text inherited it.
import { describe, expect, test } from 'vitest';
import { ACCORDION_DEMO_HEADER, defaultBlockHeader, repairLeakedAccordionHeader } from '../../js/state.js';

describe('block header defaults', () => {
  test('the header is derived from the component name, with no Accordion description', () => {
    expect(defaultBlockHeader('Multiple Choice Check')).toEqual({
      blockTitle: 'MULTIPLE CHOICE CHECK',
      blockHeadline: 'Explore details about Multiple Choice Check',
      blockDesc: ''
    });
    expect(defaultBlockHeader('')).toMatchObject({ blockTitle: 'COMPONENT' });
  });

  test('leaked Accordion demo text is replaced on another component type, field by field', () => {
    const leaked = { ...ACCORDION_DEMO_HEADER, other: 1 };
    const fixed = repairLeakedAccordionHeader(leaked, 'multiple-choice', 'Multiple Choice Check');
    expect(fixed.blockTitle).toBe('MULTIPLE CHOICE CHECK');
    expect(fixed.blockHeadline).toBe('Explore details about Multiple Choice Check');
    expect(fixed.blockDesc).toBe('');
    expect(fixed.other).toBe(1);
  });

  test('text an author wrote is never touched, and the Accordion keeps its own demo header', () => {
    const custom = { blockTitle: 'MY TITLE', blockHeadline: ACCORDION_DEMO_HEADER.blockHeadline, blockDesc: 'Mine' };
    const fixed = repairLeakedAccordionHeader(custom, 'tab-blocks', 'Horizontal Tabs');
    expect(fixed.blockTitle).toBe('MY TITLE');
    expect(fixed.blockDesc).toBe('Mine');
    expect(fixed.blockHeadline).toBe('Explore details about Horizontal Tabs'); // exact demo string, replaced
    const accordion = { ...ACCORDION_DEMO_HEADER };
    expect(repairLeakedAccordionHeader(accordion, 'accordion', 'Accordion')).toEqual(accordion);
  });

  test('null config passes through unchanged', () => {
    expect(repairLeakedAccordionHeader(null, 'x', 'X')).toBeNull();
  });
});
