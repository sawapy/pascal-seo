export interface Keyword {
  id: string;
  pascal_id?: number;
  term: string;
  volume?: number;
  currentRank?: number;
  siteName?: string;
  rankType?: string;
  deviceType?: string;
  area?: string;
}

export interface RankingData {
  date: string; // ISO Date string YYYY-MM-DD
  rank: number;
}

export interface UserProfile {
  email: string;
  name: string;
  avatarUrl?: string;
}

export enum TimeRange {
  ONE_MONTH = '1m',
  THREE_MONTHS = '3m',
  SIX_MONTHS = '6m',
  ONE_YEAR = '1y',
  CUSTOM = 'custom'
}