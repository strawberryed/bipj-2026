export interface DemoProfile {
    id: string;
    name: string;
    age: number;
    occupation: string;
    lifeStage: string;
    monthlyIncome: string;
    monthlyBudget: string;
    healthConditions: string[];
    existingCoverage: string[];
    concerns: string[];
    goals: string[];
    defaultChips: string[];

}

export const DEMO_PROFILES: DemoProfile[] = [
    {
        id: 'profile1',
        name: 'Ryan',
        age: 28,
        occupation: 'Software Engineer',
        lifeStage: 'Single, no dependents',
        monthlyIncome: '3,600',
        monthlyBudget: 'S$80–120/month',
        healthConditions: [],
        existingCoverage: ['MediShield Life (basic)'],
        concerns: [
            'No hospitalisation coverage beyond MediShield',
            'No critical illness protection',
            'Starting to think about long-term savings'
        ],
        goals: [
            'Get proper hospitalisation coverage',
            'Protect against critical illness',
            'Start building savings for future property'
        ],
         defaultChips: [
            'What does PRUShield cover?',
            'Do I need critical illness coverage?',
            'What is a deductible?',
            'How much coverage do I need?'
        ]
    },
    {
        id: 'profile2',
        name: 'Sarah',
        age: 34,
        occupation: 'Self-employed freelance designer',
        lifeStage: 'Married, planning to have children soon',
        monthlyIncome: '5,100',
        monthlyBudget: 'S$150–200/month',
        healthConditions: ['Mild asthma (managed)'],
        existingCoverage: ['PRUShield Plan A', 'Basic term life from previous employer (expiring)'],
        concerns: [
            'Term life expiring with no replacement',
            'Asthma may affect underwriting',
            'No maternity coverage',
            'No income replacement if hospitalised (self-employed)'
        ],
        goals: [
            'Replace expiring term life with better coverage',
            'Get maternity and newborn coverage',
            'Ensure CI coverage given family history of cancer',
            'Income protection as self-employed'
        ],
         defaultChips: [
            'What does PRUShield cover?',
            'Do I need critical illness coverage?',
            'What is a deductible?',
            'How much coverage do I need?'
        ]
    },
    {
        id: 'profile3',
        name: 'David',
        age: 52,
        occupation: 'Operations Manager',
        lifeStage: 'Married, 2 adult children, planning retirement',
        monthlyIncome: '6,200',

        monthlyBudget: 'S$300–400/month',
        healthConditions: ['Hypertension (controlled with medication)', 'High cholesterol'],
        existingCoverage: [
            'PRUShield Plan A',
            'Company group insurance (ending at retirement)',
            'Whole life policy (bought at 30, low sum assured)'
        ],
        concerns: [
            'Company insurance ends when he retires in 8 years',
            'Existing whole life coverage is too low',
            'Health conditions may affect new underwriting',
            'No dedicated CI plan despite elevated health risk',
            'Wants to leave something for children'
        ],
        goals: [
            'Top up health coverage before retirement',
            'Get CI coverage despite health conditions',
            'Build legacy for children',
            'Ensure coverage continues post-retirement'
        ],
         defaultChips: [
            'What does PRUShield cover?',
            'Do I need critical illness coverage?',
            'What is a deductible?',
            'How much coverage do I need?'
        ]
    }
];

export const DEFAULT_PROFILE_ID = 'profile3';