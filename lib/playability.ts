export function isAgeGate(s: string): boolean {
  return /age[\s_-]*restrict|confirm your age|age_check|agegate/i.test(s);
}

export function isBotWall(s: string): boolean {
  return /not a bot|unusual traffic|botguard|\bbot\b/i.test(s) && !isAgeGate(s);
}
