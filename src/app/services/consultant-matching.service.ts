import { Injectable } from '@angular/core';
import { CONSULTANTS, ConsultantProfile } from '../consultants';
import { UserProfileData } from './user-profile.service';

export interface MatchedConsultant extends ConsultantProfile {
  matchScore: number;
  matchReasons: string[]; // which of the user's goals/concerns this consultant covers
}

@Injectable({ providedIn: 'root' })
export class ConsultantMatchingService {

  /**
   * Ranks all consultants against the user's profile.
   * - Each overlapping mainGoal is worth 2 points.
   * - The topConcern (the single most pressing issue) is worth 3 points,
   *   since it's a stronger signal than a general goal.
   * Consultants are returned sorted highest-score-first. If the user has
   * no profile yet (e.g. not logged in), everyone gets score 0 and the
   * original directory order is preserved.
   */
  matchConsultants(profile: UserProfileData | null): MatchedConsultant[] {
    const mainGoals = profile?.mainGoals ?? [];
    const topConcern = profile?.topConcern;

    const scored: MatchedConsultant[] = CONSULTANTS.map(consultant => {
      let score = 0;
      const matchReasons: string[] = [];

      for (const goal of mainGoals) {
        if (consultant.specialties.includes(goal)) {
          score += 2;
          matchReasons.push(goal);
        }
      }

      if (topConcern && consultant.specialties.includes(topConcern) && !matchReasons.includes(topConcern)) {
        score += 3;
        matchReasons.push(topConcern);
      }

      return { ...consultant, matchScore: score, matchReasons };
    });

    return scored.sort((a, b) => b.matchScore - a.matchScore);
  }

  /** Convenience for "who's the single best match" (used by book-meeting). */
  bestMatch(profile: UserProfileData | null): MatchedConsultant {
    return this.matchConsultants(profile)[0];
  }
}
