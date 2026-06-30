// Official Round of 32 bracket order. Adjacent pairs (0,1), (2,3), ... feed the
// same Round of 16 slot, and so on recursively for QF/SF/Final. Reconstructed
// from public tournament bracket sources. The pairing at index [2,3]
// (South Africa/Canada + Netherlands/Morocco) is verified against this
// tournament's actual Round of 16 result (Canada vs Morocco) — the other
// pairings could not be cross-checked the same way yet. If a future result
// contradicts one, this table is the only place that needs fixing.
export const R32_BRACKET_ORDER: [string, string][] = [
  ["1E", "3RD"], // Germany vs Paraguay
  ["1I", "3RD"], // France vs Sweden
  ["2A", "2B"], // South Africa vs Canada
  ["1F", "2C"], // Netherlands vs Morocco          -- verified
  ["1C", "2F"], // Brazil vs Japan
  ["2E", "2I"], // Ivory Coast vs Norway
  ["1A", "3RD"], // Mexico vs Ecuador
  ["1L", "3RD"], // England vs Congo DR
  ["1D", "3RD"], // United States vs Bosnia-Herzegovina
  ["1G", "3RD"], // Belgium vs Senegal
  ["1J", "2H"], // Argentina vs Cape Verde Islands
  ["2D", "2G"], // Australia vs Egypt
  ["1K", "3RD"], // Colombia vs Ghana
  ["1B", "3RD"], // Switzerland vs Algeria
  ["2K", "2L"], // Portugal vs Croatia
  ["1H", "2J"], // Spain vs Austria
];

const STAGE_DEPTH: Record<string, number> = {
  ROUND_OF_32: 0,
  ROUND_OF_16: 1,
  QUARTER_FINAL: 2,
  SEMI_FINAL: 3,
  THIRD_PLACE: 3,
  FINAL: 4,
};

/**
 * Bracket slot index for a knockout match, given a team-name → Round-of-32
 * slot lookup (see getTeamBracketSlots). Returns null if neither team has a
 * known slot yet (e.g. group stage still in progress).
 */
export function bracketSlotForMatch(
  match: { stage: string; homeTeam: string; awayTeam: string },
  teamToSlot: Record<string, number>
): number | null {
  const r32Slot = teamToSlot[match.homeTeam] ?? teamToSlot[match.awayTeam];
  if (r32Slot === undefined) return null;
  const depth = STAGE_DEPTH[match.stage] ?? 0;
  return Math.floor(r32Slot / 2 ** depth);
}
