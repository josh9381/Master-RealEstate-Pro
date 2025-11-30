// Utility functions for lead scoring

export function getScoreCategory(score: number): 'HOT' | 'WARM' | 'COOL' | 'COLD' {
  if (score >= 80) return 'HOT';
  if (score >= 50) return 'WARM';
  if (score >= 25) return 'COOL';
  return 'COLD';
}

export function filterLeadsByScore(leads: any[], category: string): any[] {
  if (category === 'ALL') return leads;
  
  return leads.filter(lead => {
    const leadCategory = getScoreCategory(lead.score || 0);
    return leadCategory === category;
  });
}

export function sortLeadsByScore(leads: any[], direction: 'asc' | 'desc' = 'desc'): any[] {
  return [...leads].sort((a, b) => {
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    return direction === 'desc' ? scoreB - scoreA : scoreA - scoreB;
  });
}
