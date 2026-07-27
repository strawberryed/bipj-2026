export interface Plan {
  id: string;
  name: string;
  category: string;
  filterCategory: 'life' | 'ci' | 'health' | 'wealth';
  filterPremium: 'under50' | '50to100' | 'above100';
  filterCoverage: 'protection' | 'health' | 'savings';
  premium: string;
  description: string;
  covered: string[];
  notCovered: string[];
  bestFor: string[];
  risks: string[];
  considerations: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'p1',
    name: 'PRUVital Cover',
    category: 'Life Protection',
    filterCategory: 'life',
    filterPremium: 'under50',
    filterCoverage: 'protection',
    premium: 'From S$45/month',
    description: 'Straightforward life coverage with no medical exam required.',
    covered: ['Death and terminal illness', 'Total and permanent disability', 'Optional CI add-on for 5 conditions'],
    notCovered: ['Pre-existing conditions', 'Self-inflicted injuries', 'Suicide within first year'],
    bestFor: ['Young families', 'First-time buyers', 'Those wanting simple protection'],
    risks: [
      'No cash value — premiums paid are not recoverable if policy lapses',
      'Optional CI add-on only covers 5 conditions — very limited critical illness protection',
      'Pre-existing conditions are fully excluded — existing health issues won\'t be covered',
      'Coverage amount may become insufficient as family and financial responsibilities grow',
      'Suicide exclusion in first year means no payout if this occurs early in the policy'
    ],
    considerations: [
      'If you have pre-existing conditions, check carefully what is excluded before buying',
      'If you need comprehensive CI coverage, this plan\'s optional add-on may not be enough',
      'If you want a savings or investment component, this plan has none — premiums don\'t build value',
      'Review coverage amount regularly as your income and dependents increase'
    ]
  },
  {
    id: 'p2',
    name: 'PRUActive Term',
    category: 'Life Protection',
    filterCategory: 'life',
    filterPremium: 'under50',
    filterCoverage: 'protection',
    premium: 'From S$38/month',
    description: 'Flexible term coverage that adapts as your life changes.',
    covered: ['Death and terminal illness', 'TPD', 'Adjustable coverage amount'],
    notCovered: ['No cash value', 'Pre-existing conditions', 'Coverage ends at term'],
    bestFor: ['Young couples', 'Those with mortgage', 'Buyers wanting flexibility'],
    risks: [
      'No cash value — all premiums are lost when the term ends with no payout',
      'Coverage completely stops at end of term — no lifelong protection',
      'Pre-existing conditions excluded — gaps in coverage for existing health issues',
      'Renewing at an older age will significantly increase premiums',
      'If your health deteriorates, renewing coverage may become difficult or expensive'
    ],
    considerations: [
      'If you need coverage beyond the term period, plan ahead for renewal or replacement',
      'Not suitable if you want permanent lifelong protection',
      'If you\'re older or have health issues at renewal, premiums may increase substantially',
      'Consider pairing with a savings plan since this plan builds no cash value'
    ]
  },
  {
    id: 'p3',
    name: 'PRUActive Life V',
    category: 'Critical Illness + Whole Life',
    filterCategory: 'ci',
    filterPremium: '50to100',
    filterCoverage: 'protection',
    premium: 'From S$55/month',
    description: 'Lifelong protection against 182 conditions including early-stage CI.',
    covered: ['182 CI conditions including early stage', 'Mental illness', 'Death and TPD'],
    notCovered: ['Pre-existing conditions', 'Self-inflicted', 'High-risk activity exclusions'],
    bestFor: ['Those with CI family history', 'Smokers', 'Mid-career individuals'],
    risks: [
      'Higher premiums compared to basic life plans — cost may be a concern for tight budgets',
      'Pre-existing conditions are excluded — if you already have a CI condition it won\'t be covered',
      'High-risk activities like extreme sports may be excluded without additional riders',
      'Whole life component means long-term premium commitment',
      'Policy may lapse if premiums are not kept up, losing all coverage and accumulated value'
    ],
    considerations: [
      'If you have pre-existing CI conditions, these will likely be excluded from coverage',
      'Smokers will face higher premiums — quitting may reduce costs significantly',
      'The wide 182-condition coverage is valuable but review the full list to understand exactly what qualifies',
      'Mental illness coverage is included but check the specific conditions and claim requirements'
    ]
  },
  {
    id: 'p4',
    name: 'PRUShield + PRUExtra',
    category: 'Health Protection',
    filterCategory: 'health',
    filterPremium: 'under50',
    filterCoverage: 'health',
    premium: 'From S$38/month',
    description: 'Hospitalisation coverage that tops up your MediShield Life.',
    covered: ['As-charged hospitalisation', 'Pre and post hospital visits', 'Surgical bills'],
    notCovered: ['Cosmetic procedures', 'Pre-existing within waiting period', 'Pregnancy under base plan'],
    bestFor: ['Self-employed', 'No employer benefits', 'Those wanting lower out-of-pocket costs'],
    risks: [
      'Pre-existing conditions have a waiting period — no claims allowed for these during the initial period',
      'Pregnancy is not covered under the base plan — maternity riders needed for this',
      'Cosmetic and non-medically necessary procedures are excluded',
      'If you downgrade or lapse the policy, reinstating with pre-existing conditions may be difficult',
      'Co-payment still applies under PRUExtra — not fully zero out-of-pocket in all cases'
    ],
    considerations: [
      'If you have pre-existing conditions, understand the waiting period before coverage kicks in',
      'Self-employed individuals should note there is no employer medical backup if this plan lapses',
      'Maternity coverage requires an additional rider — plan ahead if you\'re considering starting a family',
      'Understand the difference between what PRUShield covers vs what PRUExtra adds on top'
    ]
  },
  {
    id: 'p5',
    name: 'PRUActive Saver III',
    category: 'Wealth Accumulation',
    filterCategory: 'wealth',
    filterPremium: 'above100',
    filterCoverage: 'savings',
    premium: 'From S$120/month',
    description: 'A capital-guaranteed savings plan for your future milestones.',
    covered: ['Capital guaranteed at maturity', 'Death benefit', 'Flexible payout timing'],
    notCovered: ['No CI or disability coverage', 'Early surrender penalty', 'Returns beyond capital not guaranteed'],
    bestFor: ['Education savers', 'Property planners', 'Early career individuals'],
    risks: [
      'Early surrender results in financial penalty — you may get back less than you put in',
      'Returns beyond the guaranteed capital are not guaranteed and depend on fund performance',
      'No CI or disability coverage — a separate protection plan is still needed',
      'Inflation risk — guaranteed returns may not keep pace with rising costs over time',
      'Long lock-in period means funds are not easily accessible in emergencies'
    ],
    considerations: [
      'This plan is purely for savings — you still need a separate health and life protection plan',
      'Only commit to this if you\'re confident you won\'t need the money before maturity',
      'Understand the difference between guaranteed and non-guaranteed returns before signing',
      'Compare the effective interest rate against other savings options like SSBs or fixed deposits'
    ]
  },
  {
    id: 'p6',
    name: 'PRULink Assurance Account II',
    category: 'Investment-Linked',
    filterCategory: 'wealth',
    filterPremium: 'above100',
    filterCoverage: 'savings',
    premium: 'From S$150/month',
    description: 'An investment-linked plan that grows your wealth while providing life coverage.',
    covered: ['Life coverage throughout policy term', 'Investment returns linked to chosen funds', 'Partial withdrawals allowed'],
    notCovered: ['Investment losses not guaranteed', 'Pre-existing conditions', 'High-risk activity exclusions'],
    bestFor: ['Growth-oriented investors', 'Long-term wealth builders', 'Those comfortable with market exposure'],
    risks: [
      'Investment returns are not guaranteed — you can lose money if funds perform poorly',
      'Market downturns can significantly reduce your policy value',
      'Fees and charges (fund management, admin) reduce effective returns',
      'Life coverage amount may decrease if investment value drops significantly',
      'Early withdrawal or surrender may result in significant losses',
      'Requires active monitoring of fund performance and rebalancing'
    ],
    considerations: [
      'Only suitable if you understand and are comfortable with investment risk',
      'Not a guaranteed savings plan — returns depend entirely on market performance',
      'You need to actively choose and monitor your investment funds',
      'Consider whether a simpler savings plan better suits your risk appetite',
      'Ensure you have separate emergency funds since this is a long-term investment'
    ]
  },
  {
    id: 'p7',
    name: 'PRUMajor Care',
    category: 'Critical Illness',
    filterCategory: 'ci',
    filterPremium: '50to100',
    filterCoverage: 'health',
    premium: 'From S$65/month',
    description: 'Comprehensive critical illness coverage with multi-pay benefit across different stages.',
    covered: ['Multiple CI claims across different conditions', 'Early, intermediate, and advanced stage coverage', 'Special benefit for juvenile conditions'],
    notCovered: ['Pre-existing conditions', 'Non-covered conditions list applies', 'Waiting period of 90 days'],
    bestFor: ['Those wanting multi-claim CI protection', 'Parents protecting children', 'Anyone with elevated health risk'],
    risks: [
      '90-day waiting period — no CI claims can be made in the first 90 days of the policy',
      'Pre-existing conditions are excluded — existing CI conditions won\'t be covered',
      'Not all critical illnesses are covered — review the full conditions list carefully',
      'Premiums increase with age — long-term affordability should be considered',
      'Multiple claims reduce the overall benefit pool available for future claims'
    ],
    considerations: [
      'Review the full list of covered conditions to ensure your key concerns are included',
      'The 90-day waiting period means you\'re not immediately protected after purchase',
      'If you have pre-existing health conditions, check exactly what will be excluded',
      'Parents should note the juvenile conditions benefit when considering this for family protection'
    ]
  },
  {
    id: 'p8',
    name: 'PRUEarly Stage Crisis Cover II',
    category: 'Critical Illness',
    filterCategory: 'ci',
    filterPremium: '50to100',
    filterCoverage: 'health',
    premium: 'From S$58/month',
    description: 'Pays out at the earliest detectable stage of 36 critical illnesses.',
    covered: ['36 critical illnesses at early stage', 'Cancer in situ', 'Mild stroke with neurological deficit'],
    notCovered: ['Pre-existing conditions', 'Standard exclusions apply', 'Conditions not on covered list'],
    bestFor: ['Early diagnosis advocates', 'Those with family history of CI', 'Health-conscious individuals'],
    risks: [
      'Only covers 36 conditions — narrower than broader CI plans covering 100+ conditions',
      'Pre-existing conditions are excluded — existing health issues won\'t trigger a payout',
      'Standard exclusions apply — read the policy document carefully for what\'s excluded',
      'Early-stage payout may be lower than advanced-stage plans',
      'Conditions not on the covered list will not result in any payout regardless of severity'
    ],
    considerations: [
      'Check all 36 covered conditions carefully — ensure your family history conditions are included',
      'This plan focuses on early detection — pair with a comprehensive CI plan for full-stage coverage',
      'If you have pre-existing conditions, understand clearly what will be excluded',
      'Cancer in situ is covered but confirm the exact definition and qualifying criteria'
    ]
  },
  {
    id: 'p9',
    name: 'PRUPersonal Accident',
    category: 'Health Protection',
    filterCategory: 'health',
    filterPremium: 'under50',
    filterCoverage: 'health',
    premium: 'From S$18/month',
    description: 'Affordable protection against accidents, disabilities, and accidental death.',
    covered: ['Accidental death and TPD', 'Medical expenses due to accident', 'Daily hospital income for accidents'],
    notCovered: ['Illness-related claims', 'Self-inflicted injuries', 'Extreme sports without rider'],
    bestFor: ['Active lifestyle individuals', 'Those in physical occupations', 'Budget-conscious buyers'],
    risks: [
      'Does not cover illness at all — only accidents qualify for claims',
      'Extreme sports and high-risk activities excluded without additional riders',
      'Self-inflicted injuries are fully excluded',
      'Occupation classification affects premiums and coverage — high-risk jobs cost more',
      'Not a substitute for a full health or hospitalisation plan'
    ],
    considerations: [
      'This plan only covers accidents — you still need a separate health plan for illness',
      'If you participate in extreme sports, check if a rider is available to cover this',
      'Your occupation matters — manual or high-risk workers may face higher premiums or exclusions',
      'Good as a supplement to existing coverage but not as a standalone health plan'
    ]
  },
  {
    id: 'p10',
    name: 'PRULife Ready',
    category: 'Life Protection',
    filterCategory: 'life',
    filterPremium: 'under50',
    filterCoverage: 'protection',
    premium: 'From S$28/month',
    description: 'Entry-level whole life coverage designed for first-time insurance buyers.',
    covered: ['Whole-of-life death benefit', 'TPD benefit', 'Small cash value accumulation'],
    notCovered: ['Pre-existing conditions', 'No CI component', 'Limited flexibility in coverage adjustment'],
    bestFor: ['First-time buyers', 'Young adults starting out', 'Those wanting minimal commitment'],
    risks: [
      'Coverage amount is fixed and limited — may become insufficient as life circumstances change',
      'No CI component — critical illness is not covered under this plan',
      'Limited flexibility to adjust coverage as needs evolve',
      'Cash value accumulation is small — not a meaningful savings vehicle',
      'Pre-existing conditions are excluded from coverage'
    ],
    considerations: [
      'Good starting point but likely needs to be supplemented with CI and health coverage later',
      'The fixed coverage amount may not keep up with your growing financial responsibilities',
      'If you anticipate needing to adjust your coverage, this plan\'s limited flexibility may be a constraint',
      'Treat the small cash value as a bonus rather than a savings strategy'
    ]
  },
  {
    id: 'p11',
    name: 'PRUGolden Life',
    category: 'Life Protection',
    filterCategory: 'life',
    filterPremium: '50to100',
    filterCoverage: 'protection',
    premium: 'From S$80/month',
    description: 'Whole life plan tailored for seniors aged 45 and above, no medical required.',
    covered: ['Whole-of-life death benefit', 'No medical underwriting required', 'Premium waiver on TPD'],
    notCovered: ['Suicide within first 2 years', 'War and civil unrest', 'Aviation other than passenger'],
    bestFor: ['Seniors 45–70 years old', 'Those who cannot pass medical underwriting', 'Legacy planning for later life'],
    risks: [
      'Higher premiums relative to coverage amount compared to younger-age plans',
      'Suicide exclusion applies for first 2 years — no payout if this occurs in early policy period',
      'War, civil unrest, and non-passenger aviation are excluded',
      'No CI coverage — a separate CI plan is still needed for critical illness protection',
      'Coverage amount may be limited compared to what could be obtained at a younger age'
    ],
    considerations: [
      'Designed specifically for seniors 45–70 — not suitable for younger buyers',
      'No medical underwriting is a key advantage for those with health conditions',
      'Primarily a legacy planning tool — understand that the death benefit is the main feature',
      'Consider whether the premium-to-coverage ratio meets your legacy planning needs'
    ]
  },
  {
    id: 'p12',
    name: 'PRUCash Back',
    category: 'Wealth Accumulation',
    filterCategory: 'wealth',
    filterPremium: '50to100',
    filterCoverage: 'savings',
    premium: 'From S$90/month',
    description: 'A participating endowment plan with regular cash payouts every 3 years.',
    covered: ['Regular cash payouts from year 3', 'Death and TPD benefit', 'Maturity benefit at end of term'],
    notCovered: ['No CI coverage included', 'Early termination loss', 'Non-participating bonuses not guaranteed'],
    bestFor: ['Those wanting regular income', 'Medium-term savers (10–20 years)', 'Conservative investors'],
    risks: [
      'Early termination results in financial loss — surrender value may be less than premiums paid',
      'Non-participating (bonus) returns are not guaranteed and may vary',
      'No CI coverage — a separate protection plan is required alongside this',
      'Inflation risk — cash payouts every 3 years may lose purchasing power over time',
      'Long commitment required to realise full benefit — not suitable for short-term savers'
    ],
    considerations: [
      'Only commit if you\'re confident you can maintain premiums for the full term',
      'Understand clearly which portions of returns are guaranteed vs non-guaranteed',
      'This plan has no CI or disability coverage — additional protection plans are needed',
      'The 3-year cash payout cycle suits those who want periodic liquidity from their savings'
    ]
  },
  {
    id: 'p13',
    name: 'PRUHealth Booster',
    category: 'Health Protection',
    filterCategory: 'health',
    filterPremium: 'under50',
    filterCoverage: 'health',
    premium: 'From S$32/month',
    description: 'Top-up rider that enhances your existing health plan with higher limits and lower deductibles.',
    covered: ['Deductible reimbursement', 'Co-insurance coverage', 'Additional daily hospital cash'],
    notCovered: ['Must have base health plan', 'Cosmetic and dental excluded', 'Outpatient GP visits not covered'],
    bestFor: ['Existing health plan holders', 'Those wanting zero out-of-pocket', 'Frequent hospitalisation risk profiles'],
    risks: [
      'Cannot be purchased standalone — requires an existing base health plan',
      'If your base health plan lapses, this rider may also lapse',
      'Outpatient and GP visits are not covered — only inpatient hospitalisation benefits',
      'Cosmetic and dental procedures are excluded',
      'Coverage scope is limited to what the base plan covers — won\'t fill gaps outside base plan scope'
    ],
    considerations: [
      'You must already have a qualifying base health plan — confirm compatibility before purchasing',
      'If your base plan changes or lapses, this booster is affected too',
      'Good for reducing out-of-pocket hospitalisation costs but doesn\'t cover outpatient needs',
      'Review whether the additional premium is worth it based on your hospitalisation risk profile'
    ]
  },
];

// Grouped by filterCategory for easy lookup in gemini.service.ts
export const POLICIES: Record<string, Plan[]> = {
  life:   PLANS.filter(p => p.filterCategory === 'life'),
  ci:     PLANS.filter(p => p.filterCategory === 'ci'),
  health: PLANS.filter(p => p.filterCategory === 'health'),
  wealth: PLANS.filter(p => p.filterCategory === 'wealth'),
};