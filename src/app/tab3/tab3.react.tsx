import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
	Area,
	AreaChart,
	Cell,
	Pie,
	PieChart,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
} from 'recharts';
import {
	Bot,
	Bell,
	CalendarClock,
	ChartPie,
	ChevronRight,
	CircleCheck,
	FileText,
	Filter,
	MessageSquareText,
	Phone,
	Search,
	ShieldCheck,
	Sparkles,
	Users,
} from 'lucide-react';
import {
	approveProposalAcceptance,
	approveMeetingChange,
	addTimelineEvent,
	getChatHistory,
	getCustomers,
	getCurrentUser,
	getMeetingChangeRequestsForCustomer,
	getMeetingsForUser,
	getPendingProposalAcceptancesForConsultant,
	getProposalAcceptanceRequestsForCustomer,
	getPendingMeetingChangesForConsultant,
	getTimelineEventsForUser,
	getUnreadTimelineCountForUser,
	getUserById,
	logoutUser,
	markTimelineRead,
	MeetingChangeRequestRecord,
	MeetingRecord,
	ProposalAcceptanceRecord,
	rejectProposalAcceptance,
	rejectMeetingChange,
	requestProposalAcceptance,
	requestMeetingChange,
	TimelineRecord,
	TimelineType,
	UserRecord,
} from '../../data/app-db';

type Role = 'customer' | 'consultant';
type CustomerView = 'home' | 'chatbot' | 'proposal' | 'compare' | 'policies';
type ConsultantView = 'dashboard' | 'clients' | 'profile' | 'analytics' | 'recommendations';

interface MeetingSlotOption {
	date: string;
	time: string;
}

interface PolicyCard {
	id: string;
	name: string;
	premium: string;
	coverage: string;
	renewal: string;
	pros: string[];
	cons: string[];
	matchScore: number;
}

interface Client {
	id: string;
	userId?: string;
	name: string;
	age: number;
	contact: string;
	tag: string;
	status: 'Active' | 'Pending';
	lastInteraction: string;
	preferences: string[];
}

interface Recommendation {
	id: string;
	policyName: string;
	premium: string;
	score: number;
	reason: string;
	fullReasoning: string;
}


const customerPolicies: PolicyCard[] = [
	{
		id: 'p1',
		name: 'PRUShield + PRUExtra',
		premium: 'S$88/mo',
		coverage: 'Health',
		renewal: '30 Nov 2026',
		pros: ['Strong hospitalisation support', 'Lower out-of-pocket risk', 'Good specialist network'],
		cons: ['Higher than basic premium', 'Needs rider for richer post-care'],
		matchScore: 92,
	},
	{
		id: 'p2',
		name: 'PRUActive Life V',
		premium: 'S$74/mo',
		coverage: 'Life + CI',
		renewal: '15 Jan 2027',
		pros: ['Early-stage CI coverage', 'Lifelong profile fit', 'Balanced family protection'],
		cons: ['Long-term commitment', 'More complex benefit wording'],
		matchScore: 87,
	},
	{
		id: 'p3',
		name: 'PRUActive Saver III',
		premium: 'S$120/mo',
		coverage: 'Savings',
		renewal: '08 Mar 2027',
		pros: ['Capital guarantee at maturity', 'Milestone planning support', 'Predictable schedule'],
		cons: ['Early surrender penalty', 'Not a protection substitute'],
		matchScore: 78,
	},
];

const clients: Client[] = [
	{
		id: 'c1',
		userId: 'u-customer-demo',
		name: 'Orange Tan',
		age: 34,
		contact: '+65 9123 0011',
		tag: 'Health Protection',
		status: 'Pending',
		lastInteraction: '16 Jul 2026',
		preferences: ['Low risk', 'Family coverage', 'Stable premium'],
	},
	{
		id: 'c2',
		name: 'Daniel Lim',
		age: 41,
		contact: '+65 9455 7282',
		tag: 'Life + CI',
		status: 'Active',
		lastInteraction: '15 Jul 2026',
		preferences: ['Growth upside', 'Long-term protection', 'Early CI payout'],
	},
	{
		id: 'c3',
		name: 'Mei Lin',
		age: 29,
		contact: '+65 8763 0922',
		tag: 'Wealth Accumulation',
		status: 'Active',
		lastInteraction: '14 Jul 2026',
		preferences: ['Savings discipline', 'Low volatility', 'Milestone planning'],
	},
];

const recommendations: Recommendation[] = [
	{
		id: 'r1',
		policyName: 'PRUShield + PRUExtra Plus',
		premium: 'S$102/mo',
		score: 93,
		reason: 'Best fit for hospital gap and family support profile.',
		fullReasoning:
			'The profile shows high concern for claim stability and family dependency. This option improves inpatient and post-hospitalisation cover while staying inside the premium comfort range.',
	},
	{
		id: 'r2',
		policyName: 'PRUActive Life V (Enhanced CI Rider)',
		premium: 'S$89/mo',
		score: 88,
		reason: 'Matches early-stage critical illness concern and long-term dependents.',
		fullReasoning:
			'The customer profile has medium-high major illness concern. Enhanced CI rider improves early-stage payout confidence and complements current health cover without overloading savings spend.',
	},
	{
		id: 'r3',
		policyName: 'PRUPersonal Accident + Daily Care Rider',
		premium: 'S$31/mo',
		score: 81,
		reason: 'Affordable add-on to close accident-driven income disruption risk.',
		fullReasoning:
			'For budget-sensitive expansion, this closes accidental disability and short-term disruption gaps that are not fully covered by the primary plan stack.',
	},
];

const radarData = [
	{ axis: 'Life', value: 68 },
	{ axis: 'Health', value: 84 },
	{ axis: 'Critical Illness', value: 58 },
	{ axis: 'Disability', value: 46 },
	{ axis: 'Savings', value: 72 },
];

const donutData = [
	{ name: 'Health', value: 44, color: '#5b257c' },
	{ name: 'Life', value: 24, color: '#74409a' },
	{ name: 'Critical Illness', value: 18, color: '#8f67af' },
	{ name: 'Savings', value: 14, color: '#c5add9' },
];

const trendData = [
	{ week: 'W1', score: 58 },
	{ week: 'W2', score: 64 },
	{ week: 'W3', score: 71 },
	{ week: 'W4', score: 79 },
];

const reasoningPanel = [
	{
		id: 'why-1',
		title: 'Coverage fit to life stage',
		summary: 'Hospital and critical illness risk are highest priority based on your family stage.',
		deepDive:
			'Your inputs point to dependency-heavy commitments and low tolerance for sudden medical outflow. The recommendation prioritises inpatient robustness and claim stability first.',
	},
	{
		id: 'why-2',
		title: 'Premium sustainability',
		summary: 'Projected premiums remain inside your preferred comfort band.',
		deepDive:
			'Filtering avoids combinations likely to trigger policy lapse risk in 24-36 months. The selected option keeps annual increments within your expressed affordability threshold.',
	},
	{
		id: 'why-3',
		title: 'Gap closure impact',
		summary: 'Current setup leaves clear hospital and disability gaps.',
		deepDive:
			'Comparison against your current portfolio highlights under-protected claim categories in specialist and disability layers. This option addresses the largest deficits first.',
	},
];

function cx(...classes: Array<string | false | undefined>): string {
	return classes.filter(Boolean).join(' ');
}

function relativeTime(iso: string): string {
	const timestamp = new Date(iso).getTime();
	const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));

	if (diffMinutes < 60) {
		return `${diffMinutes}m ago`;
	}

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `${diffHours}h ago`;
	}

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) {
		return `${diffDays}d ago`;
	}

	return new Date(iso).toLocaleDateString();
}

function initials(name: string): string {
	return name
		.split(' ')
		.map(part => part.charAt(0).toUpperCase())
		.slice(0, 2)
		.join('');
}

function formatCalendarDate(date: string): string {
	return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	});
}

function buildMeetingDateTime(date: string, time: string): Date {
	const isoCandidate = new Date(`${date}T${time}`);
	if (!Number.isNaN(isoCandidate.getTime())) {
		return isoCandidate;
	}

	const fallback = new Date(`${date}T00:00:00`);
	const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
	if (!match) {
		return fallback;
	}

	let hours = Number(match[1]) % 12;
	if (match[3].toUpperCase() === 'PM') {
		hours += 12;
	}

	fallback.setHours(hours, Number(match[2]), 0, 0);
	return fallback;
}

function hashSeed(text: string): number {
	let hash = 0;
	for (let index = 0; index < text.length; index += 1) {
		hash = ((hash << 5) - hash) + text.charCodeAt(index);
		hash |= 0;
	}
	return Math.abs(hash);
}

function formatSlot(slot: MeetingSlotOption): string {
	return `${formatCalendarDate(slot.date)} at ${slot.time}`;
}

function createCustomerPolicies(user: UserRecord): PolicyCard[] {
	const variant = hashSeed(user.id) % 3;

	if (variant === 1) {
		return [
			{
				id: 'p1-v1',
				name: 'PRUShield Elite Care',
				premium: 'S$96/mo',
				coverage: 'Health',
				renewal: '03 Dec 2026',
				pros: ['Private hospital access', 'High annual claim limit', 'Strong post-care support'],
				cons: ['Higher base premium', 'Rider choice required'],
				matchScore: 90,
			},
			{
				id: 'p2-v1',
				name: 'PRUFamily Critical Care',
				premium: 'S$82/mo',
				coverage: 'Life + CI',
				renewal: '21 Jan 2027',
				pros: ['Early-stage CI payout', 'Family add-on discounts', 'Strong dependent protection'],
				cons: ['Long-term premium step-ups', 'Rider terms are detailed'],
				matchScore: 86,
			},
			{
				id: 'p3-v1',
				name: 'PRUSecure Saver Plus',
				premium: 'S$128/mo',
				coverage: 'Savings',
				renewal: '09 Mar 2027',
				pros: ['Disciplined savings path', 'Maturity milestone support', 'Moderate volatility profile'],
				cons: ['Penalty for early surrender', 'Lower liquidity in first years'],
				matchScore: 79,
			},
		];
	}

	if (variant === 2) {
		return [
			{
				id: 'p1-v2',
				name: 'PRUHealthShield Advantage',
				premium: 'S$84/mo',
				coverage: 'Health',
				renewal: '18 Nov 2026',
				pros: ['Good public/private coverage blend', 'Specialist consult buffer', 'Affordable rider stack'],
				cons: ['Moderate deductible without rider', 'Co-pay cap conditions apply'],
				matchScore: 91,
			},
			{
				id: 'p2-v2',
				name: 'PRUActive Life Family V',
				premium: 'S$76/mo',
				coverage: 'Life + CI',
				renewal: '13 Jan 2027',
				pros: ['Balanced CI and death benefit', 'Term conversion flexibility', 'Supports low-risk planning'],
				cons: ['Lower wealth upside', 'Requires annual review discipline'],
				matchScore: 85,
			},
			{
				id: 'p3-v2',
				name: 'PRUMilestone Saver',
				premium: 'S$112/mo',
				coverage: 'Savings',
				renewal: '02 Apr 2027',
				pros: ['Lower entry premium', 'Milestone-linked withdrawals', 'Predictable projection'],
				cons: ['Not suited for short horizon', 'Partial withdrawal rules apply'],
				matchScore: 77,
			},
		];
	}

	return customerPolicies;
}

function createCustomerProposal(user: UserRecord, policies: PolicyCard[]) {
	const leadPolicy = policies[0];
	const coverAmount = hashSeed(user.id) % 2 === 0 ? '$500,000' : '$450,000';

	return {
		plan: leadPolicy.name,
		provider: 'Orange Financial',
		premiumMonthly: leadPolicy.premium,
		coverage: coverAmount,
		term: 'Annual',
		benefits: [
			`Designed around ${user.name}'s ${user.riskAppetite ?? 'medium'} risk profile and family commitments.`,
			'Improves specialist and major-claim resilience for hospital and critical illness exposure.',
			'Keeps projected cost within current affordability range while preserving key protections.',
		],
		breakdown: [
			{ name: 'Inpatient Room & Board', cover: 'As incurred' },
			{ name: 'Intensive Care Unit', cover: 'As incurred' },
			{ name: 'Pre/Post-Hospitalisation', cover: 'Up to $30k total' },
			{ name: 'Critical Illness Buffer', cover: 'Rider-backed' },
		],
	};
}

const fallbackProposalUser: UserRecord = {
	id: 'fallback-customer',
	role: 'customer',
	name: 'Customer',
	email: 'customer@local',
	password: '',
	createdAt: new Date(0).toISOString(),
};

export function Tab3ReactApp(): React.JSX.Element {
	const [activeUser, setActiveUser] = useState<UserRecord | null>(getCurrentUser());
	const role: Role = activeUser?.role ?? 'customer';
	const [customerView, setCustomerView] = useState<CustomerView>('home');
	const [consultantView, setConsultantView] = useState<ConsultantView>('dashboard');
	const [clientFilter, setClientFilter] = useState<'All' | 'Active' | 'Pending'>('All');
	const [clientQuery, setClientQuery] = useState('');
	const [selectedClientId, setSelectedClientId] = useState<string>(clients[0].id);
	const [expandedReasonId, setExpandedReasonId] = useState<string | null>(reasoningPanel[0].id);
	const [expandedRecommendationId, setExpandedRecommendationId] = useState<string | null>(null);
	const [timelineItems, setTimelineItems] = useState<TimelineRecord[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [notificationAutoOpenedFor, setNotificationAutoOpenedFor] = useState<string | null>(null);
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const [consultantMenuOpen, setConsultantMenuOpen] = useState(false);
	const [selectedTimelineFilters, setSelectedTimelineFilters] = useState<TimelineType[]>(['aichat', 'consultation', 'proposal', 'document', 'email', 'direct-message']);
	const [selectedConsultantTimelineFilters, setSelectedConsultantTimelineFilters] = useState<TimelineType[]>(['aichat', 'consultation', 'proposal', 'document', 'email', 'direct-message']);
	const [timelineVisibleCount, setTimelineVisibleCount] = useState(4);
	const [portalMessage, setPortalMessage] = useState('');
	const [customerRequests, setCustomerRequests] = useState<MeetingChangeRequestRecord[]>([]);
	const [consultantPendingRequests, setConsultantPendingRequests] = useState<MeetingChangeRequestRecord[]>([]);
	const [customerProposalRequests, setCustomerProposalRequests] = useState<ProposalAcceptanceRecord[]>([]);
	const [consultantPendingProposalRequests, setConsultantPendingProposalRequests] = useState<ProposalAcceptanceRecord[]>([]);
	const [selectedPolicyId, setSelectedPolicyId] = useState<string>(customerPolicies[0].id);
	const [policyDeepDiveOpen, setPolicyDeepDiveOpen] = useState(false);
	const [changingMeetingId, setChangingMeetingId] = useState<string | null>(null);
	const [meetingForm, setMeetingForm] = useState({
		meetingId: '',
		proposedSlots: [] as MeetingSlotOption[],
		reason: '',
		guidanceOptions: [] as string[],
	});
	const guidanceOptions = [
		'Need a later evening slot',
		'Need a lunch-hour slot',
		'Need more time to review proposal',
		'Family schedule conflict',
	];

	const workspaceClients = useMemo(() => {
		const customerUsers = getCustomers();

		if (customerUsers.length === 0) {
			return clients;
		}

		return customerUsers.map(user => {
			const fallbackClient = clients.find(client => client.userId === user.id || client.name === user.name);
			const userTimeline = timelineItems.filter(item => item.customerId === user.id);
			const latestInteraction = userTimeline[0]?.createdAt;
			const hasPending = consultantPendingRequests.some(request => request.customerId === user.id);

			return {
				id: user.id,
				userId: user.id,
				name: user.name,
				age: fallbackClient?.age ?? 34,
				contact: user.email,
				tag: user.financialPriorities?.[0] ?? fallbackClient?.tag ?? 'Protection Planning',
				status: hasPending ? 'Pending' as const : 'Active' as const,
				lastInteraction: latestInteraction ? new Date(latestInteraction).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : (fallbackClient?.lastInteraction ?? 'No recent activity'),
				preferences: user.financialPriorities?.length ? user.financialPriorities : (fallbackClient?.preferences ?? ['Profile saved']),
			};
		});
	}, [consultantPendingRequests, timelineItems]);

	const visibleClients = useMemo(() => {
		return workspaceClients.filter(client => {
			const roleMatch = clientFilter === 'All' || client.status === clientFilter;
			const queryMatch = client.name.toLowerCase().includes(clientQuery.toLowerCase().trim());
			return roleMatch && queryMatch;
		});
	}, [clientFilter, clientQuery, workspaceClients]);

	const activeClient = useMemo(
		() => workspaceClients.find(client => client.id === selectedClientId) ?? workspaceClients[0] ?? clients[0],
		[selectedClientId, workspaceClients]
	);

	const customerTabs: Array<{ id: CustomerView; label: string; icon: React.JSX.Element }> = [
		{ id: 'home', label: 'Interaction Timeline', icon: <ChartPie size={16} /> },
		{ id: 'chatbot', label: 'AI Chatbot', icon: <Bot size={16} /> },
		{ id: 'proposal', label: 'Current Proposal', icon: <FileText size={16} /> },
		{ id: 'compare', label: 'Policy Comparison', icon: <ShieldCheck size={16} /> },
		{ id: 'policies', label: 'My Policies', icon: <FileText size={16} /> },
	];

	const consultantTabs: Array<{ id: ConsultantView; label: string; icon: React.JSX.Element }> = [
		{ id: 'dashboard', label: 'Dashboard', icon: <ChartPie size={16} /> },
		{ id: 'clients', label: 'Client List', icon: <Users size={16} /> },
		{ id: 'profile', label: 'Client Profile', icon: <FileText size={16} /> },
		{ id: 'analytics', label: 'Coverage & Analytics', icon: <Sparkles size={16} /> },
		{ id: 'recommendations', label: 'Recommendations', icon: <MessageSquareText size={16} /> },
	];

	const displayName = activeUser?.name || 'User';
	const lifeStage = activeUser?.lifeStage || 'Young Family';
	const riskAppetite = activeUser?.riskAppetite || 'medium';
	const savedChatCount = activeUser ? getChatHistory(activeUser.id).length : 0;
	const personalizedPolicies = useMemo(() => {
		if (!activeUser || activeUser.role !== 'customer') {
			return customerPolicies;
		}

		return createCustomerPolicies(activeUser);
	}, [activeUser]);
	const selectedPolicy = useMemo(
		() => personalizedPolicies.find(policy => policy.id === selectedPolicyId) ?? personalizedPolicies[0],
		[personalizedPolicies, selectedPolicyId]
	);
	const currentProposal = useMemo(() => {
		const proposalUser = activeUser && activeUser.role === 'customer' ? activeUser : fallbackProposalUser;
		const proposalPolicies = activeUser && activeUser.role === 'customer' ? personalizedPolicies : customerPolicies;
		return createCustomerProposal(proposalUser, proposalPolicies);
	}, [activeUser, personalizedPolicies]);

	const eventTagLabel: Record<TimelineRecord['type'], string> = {
		aichat: 'AI Chat',
		consultation: 'Consultation',
		proposal: 'Proposal',
		document: 'Document',
		email: 'Email',
		'direct-message': 'DM',
	};

	const eventTagDescription: Record<TimelineRecord['type'], string> = {
		aichat: 'AI conversation records and follow-up prompts shared between customer and consultant.',
		consultation: 'Meeting activity including bookings, reminders, approvals, and consultant actions.',
		proposal: 'Proposal reviews, recommendation decisions, and offer acceptance milestones.',
		document: 'Generated summaries, submitted documents, and policy paperwork updates.',
		email: 'Email-based communication and sent recommendation packages.',
		'direct-message': 'Direct customer-consultant messaging outside the formal meeting flow.',
	};

	const statusTagDescription: Record<Client['status'], string> = {
		Active: 'This client has no pending approval items blocking the current workflow.',
		Pending: 'This client currently needs consultant action, usually for a meeting change or follow-up.',
	};

	const customerTimeline = useMemo(() => {
		if (!activeUser || activeUser.role !== 'customer') {
			return [];
		}

		return timelineItems.filter(
			item => item.customerId === activeUser.id && selectedTimelineFilters.includes(item.type)
		);
	}, [activeUser, timelineItems, selectedTimelineFilters]);

	const consultantTimeline = useMemo(() => {
		if (!activeUser || activeUser.role !== 'consultant') {
			return [];
		}

		if (activeClient.userId) {
			return timelineItems.filter(
				item => item.customerId === activeClient.userId && selectedConsultantTimelineFilters.includes(item.type)
			);
		}

		return timelineItems.filter(item => selectedConsultantTimelineFilters.includes(item.type));
	}, [activeClient.userId, activeUser, timelineItems, selectedConsultantTimelineFilters]);

	useEffect(() => {
		if (workspaceClients.length === 0) {
			return;
		}

		if (!workspaceClients.some(client => client.id === selectedClientId)) {
			setSelectedClientId(workspaceClients[0].id);
		}
	}, [selectedClientId, workspaceClients]);

	useEffect(() => {
		setTimelineVisibleCount(4);
	}, [activeUser?.id]);

	useEffect(() => {
		if (personalizedPolicies.length === 0) {
			return;
		}

		if (!personalizedPolicies.some(policy => policy.id === selectedPolicyId)) {
			setSelectedPolicyId(personalizedPolicies[0].id);
		}
	}, [personalizedPolicies, selectedPolicyId]);

	useEffect(() => {
		const refreshWorkspace = () => {
			const sessionUser = getCurrentUser();
			setActiveUser(sessionUser);

			if (!sessionUser) {
				setTimelineItems([]);
				setUnreadCount(0);
				setMeetings([]);
				setCustomerRequests([]);
				setConsultantPendingRequests([]);
				setCustomerProposalRequests([]);
				setConsultantPendingProposalRequests([]);
				setPortalMessage('');
				setNotificationsOpen(false);
				return;
			}

			setTimelineItems(getTimelineEventsForUser(sessionUser));
			setUnreadCount(getUnreadTimelineCountForUser(sessionUser));
			const nextMeetings = getMeetingsForUser(sessionUser);
			setMeetings(nextMeetings);

			if (sessionUser.role === 'customer') {
				setCustomerRequests(getMeetingChangeRequestsForCustomer(sessionUser.id));
				setCustomerProposalRequests(getProposalAcceptanceRequestsForCustomer(sessionUser.id));
				setConsultantPendingRequests([]);
				setConsultantPendingProposalRequests([]);

				if (changingMeetingId && !nextMeetings.some(item => item.id === changingMeetingId)) {
					setChangingMeetingId(null);
				}
			} else {
				setConsultantPendingRequests(getPendingMeetingChangesForConsultant(sessionUser.id));
				setConsultantPendingProposalRequests(getPendingProposalAcceptancesForConsultant(sessionUser.id));
				setCustomerRequests([]);
				setCustomerProposalRequests([]);
			}
		};

		refreshWorkspace();
		const timerId = window.setInterval(refreshWorkspace, 1500);
		window.addEventListener('storage', refreshWorkspace);

		return () => {
			window.clearInterval(timerId);
			window.removeEventListener('storage', refreshWorkspace);
		};
	}, [changingMeetingId]);

	useEffect(() => {
		if (!activeUser || activeUser.role !== 'customer') {
			return;
		}

		if (!meetingForm.meetingId) {
			return;
		}

		const draftKey = `bipj_meeting_change_draft_${activeUser.id}_${meetingForm.meetingId}`;
		localStorage.setItem(draftKey, JSON.stringify(meetingForm));
	}, [activeUser, meetingForm]);

	useEffect(() => {
		if (!activeUser || meetings.length === 0) {
			return;
		}

		const reminderStorageKey = 'bipj_meeting_popup_state_v1';
		const reminderState = JSON.parse(localStorage.getItem(reminderStorageKey) ?? '{}') as Record<string, true>;

		meetings.forEach(meeting => {
			const meetingDate = buildMeetingDateTime(meeting.date, meeting.time);
			const diffMs = meetingDate.getTime() - Date.now();
			const hoursUntilMeeting = diffMs / 3600000;
			const reminderKey = `${activeUser.id}:${meeting.id}:${meeting.date}:${meeting.time}`;

			if (hoursUntilMeeting > 0 && hoursUntilMeeting <= 48 && !reminderState[reminderKey]) {
				addTimelineEvent({
					customerId: meeting.customerId,
					consultantId: meeting.consultantId,
					type: 'consultation',
					channel: 'meeting',
					title: 'Meeting reminder',
					detail: activeUser.role === 'customer'
						? `Your meeting with ${meeting.consultantName} is coming up on ${formatCalendarDate(meeting.date)} at ${meeting.time}.`
						: `${customerName(meeting.customerId)} has an upcoming meeting on ${formatCalendarDate(meeting.date)} at ${meeting.time}.`,
					readBy: [],
				});

				window.alert(
					activeUser.role === 'customer'
						? `Meeting reminder: ${meeting.consultantName} on ${formatCalendarDate(meeting.date)} at ${meeting.time}.`
						: `Meeting reminder: ${customerName(meeting.customerId)} on ${formatCalendarDate(meeting.date)} at ${meeting.time}.`
				);

				reminderState[reminderKey] = true;
				localStorage.setItem(reminderStorageKey, JSON.stringify(reminderState));
			}
		});
	}, [activeUser, meetings]);

	useEffect(() => {
		if (!activeUser || activeUser.role !== 'consultant') {
			setNotificationAutoOpenedFor(null);
			return;
		}

		if ((consultantPendingRequests.length > 0 || consultantPendingProposalRequests.length > 0) && notificationAutoOpenedFor !== activeUser.id) {
			setNotificationsOpen(true);
			setNotificationAutoOpenedFor(activeUser.id);
		}
	}, [activeUser, consultantPendingProposalRequests.length, consultantPendingRequests.length, notificationAutoOpenedFor]);

	const openNotificationCenter = () => {
		if (!activeUser) {
			return;
		}

		setNotificationsOpen(current => !current);
	};

	const markNotificationsSeen = () => {
		if (!activeUser) {
			return;
		}

		markTimelineRead(activeUser.id);
		setUnreadCount(0);
	};

	const addCustomerTimelineTouchpoint = (input: {
		type: TimelineRecord['type'];
		channel: TimelineRecord['channel'];
		title: string;
		detail: string;
		policyOptions?: string[];
	}) => {
		if (!activeUser || activeUser.role !== 'customer') {
			return;
		}

		addTimelineEvent({
			customerId: activeUser.id,
			consultantId: 'u-consultant-demo',
			type: input.type,
			channel: input.channel,
			title: input.title,
			detail: input.detail,
			policyOptions: input.policyOptions,
			readBy: [activeUser.id],
		});

		setTimelineItems(getTimelineEventsForUser(activeUser));
		setUnreadCount(getUnreadTimelineCountForUser(activeUser));
	};

	const onMeetingSelected = (meetingId: string) => {
		const meeting = meetings.find(item => item.id === meetingId);
		if (!meeting) {
			return;
		}

		if (!activeUser || activeUser.role !== 'customer') {
			return;
		}

		const draftKey = `bipj_meeting_change_draft_${activeUser.id}_${meeting.id}`;
		const draft = JSON.parse(localStorage.getItem(draftKey) ?? 'null') as
			| { meetingId: string; proposedSlots: MeetingSlotOption[]; reason: string; guidanceOptions: string[] }
			| null;

		setMeetingForm({
			meetingId: meeting.id,
			proposedSlots: draft?.proposedSlots?.length
				? draft.proposedSlots
				: [{ date: meeting.date, time: meeting.time }],
			reason: draft?.reason ?? '',
			guidanceOptions: draft?.guidanceOptions ?? [],
		});
		setChangingMeetingId(meeting.id);
	};

	const addMeetingSlot = () => {
		setMeetingForm(current => ({
			...current,
			proposedSlots: [...current.proposedSlots, { date: '', time: '' }],
		}));
	};

	const removeMeetingSlot = (index: number) => {
		setMeetingForm(current => ({
			...current,
			proposedSlots: current.proposedSlots.filter((_, slotIndex) => slotIndex !== index),
		}));
	};

	const updateMeetingSlot = (index: number, patch: Partial<MeetingSlotOption>) => {
		setMeetingForm(current => ({
			...current,
			proposedSlots: current.proposedSlots.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...patch } : slot),
		}));
	};

	const toggleGuidanceOption = (option: string) => {
		setMeetingForm(current => ({
			...current,
			guidanceOptions: current.guidanceOptions.includes(option)
				? current.guidanceOptions.filter(item => item !== option)
				: [...current.guidanceOptions, option],
		}));
	};

	const submitMeetingChange = () => {
		if (!activeUser || activeUser.role !== 'customer') {
			return;
		}

		const validSlots = meetingForm.proposedSlots.filter(slot => slot.date.trim() && slot.time.trim());

		if (!meetingForm.meetingId || validSlots.length === 0 || !meetingForm.reason.trim()) {
			setPortalMessage('Choose at least one proposed date/time and add your reason before sending the request.');
			return;
		}

		if (meetingForm.guidanceOptions.length === 0) {
			setPortalMessage('Select at least one guiding option before submitting to consultant.');
			return;
		}

		const result = requestMeetingChange({
			meetingId: meetingForm.meetingId,
			customerId: activeUser.id,
			proposedDate: validSlots[0].date,
			proposedTime: validSlots[0].time,
			proposedSlots: validSlots,
			reason: meetingForm.reason,
			guidanceOptions: meetingForm.guidanceOptions,
		});

		if (!result.ok) {
			setPortalMessage(result.message);
			return;
		}

		setPortalMessage(`Change request sent to consultant with slots: ${validSlots.map(slot => formatSlot(slot)).join(' / ')}.`);
		setTimelineItems(getTimelineEventsForUser(activeUser));
		setUnreadCount(getUnreadTimelineCountForUser(activeUser));
		setMeetings(getMeetingsForUser(activeUser));
		setCustomerRequests(getMeetingChangeRequestsForCustomer(activeUser.id));
		setChangingMeetingId(null);
	};

	const approvePendingRequest = (request: MeetingChangeRequestRecord) => {
		if (!activeUser || activeUser.role !== 'consultant') {
			return;
		}

		const result = approveMeetingChange(request.id, activeUser.id);
		setPortalMessage(result.ok ? 'Meeting change approved and customer notified.' : result.message);

		if (result.ok) {
			setTimelineItems(getTimelineEventsForUser(activeUser));
			setUnreadCount(getUnreadTimelineCountForUser(activeUser));
			setMeetings(getMeetingsForUser(activeUser));
			setConsultantPendingRequests(getPendingMeetingChangesForConsultant(activeUser.id));
			setConsultantPendingProposalRequests(getPendingProposalAcceptancesForConsultant(activeUser.id));
		}
	};

	const rejectPendingRequest = (request: MeetingChangeRequestRecord) => {
		if (!activeUser || activeUser.role !== 'consultant') {
			return;
		}

		const result = rejectMeetingChange({ requestId: request.id, consultantId: activeUser.id });
		setPortalMessage(result.ok ? 'Meeting change rejected and customer notified.' : result.message);

		if (result.ok) {
			setTimelineItems(getTimelineEventsForUser(activeUser));
			setUnreadCount(getUnreadTimelineCountForUser(activeUser));
			setMeetings(getMeetingsForUser(activeUser));
			setConsultantPendingRequests(getPendingMeetingChangesForConsultant(activeUser.id));
			setConsultantPendingProposalRequests(getPendingProposalAcceptancesForConsultant(activeUser.id));
		}
	};

	const approveProposalRequest = (request: ProposalAcceptanceRecord) => {
		if (!activeUser || activeUser.role !== 'consultant') {
			return;
		}

		const result = approveProposalAcceptance(request.id, activeUser.id);
		setPortalMessage(result.ok ? 'Proposal approved and customer notified.' : result.message);

		if (result.ok) {
			setTimelineItems(getTimelineEventsForUser(activeUser));
			setUnreadCount(getUnreadTimelineCountForUser(activeUser));
			setConsultantPendingProposalRequests(getPendingProposalAcceptancesForConsultant(activeUser.id));
		}
	};

	const rejectProposalRequest = (request: ProposalAcceptanceRecord) => {
		if (!activeUser || activeUser.role !== 'consultant') {
			return;
		}

		const result = rejectProposalAcceptance({ requestId: request.id, consultantId: activeUser.id });
		setPortalMessage(result.ok ? 'Proposal rejected and customer notified.' : result.message);

		if (result.ok) {
			setTimelineItems(getTimelineEventsForUser(activeUser));
			setUnreadCount(getUnreadTimelineCountForUser(activeUser));
			setConsultantPendingProposalRequests(getPendingProposalAcceptancesForConsultant(activeUser.id));
		}
	};

	const openClientProfile = (customerId: string) => {
		setSelectedClientId(customerId);
		setConsultantView('profile');
	};

	const openChatWorkspace = (seedPrompt?: string) => {
		if (seedPrompt) {
			localStorage.setItem('bipj_chat_seed_prompt_v1', seedPrompt);
		}

		if (activeUser?.role === 'customer') {
			addCustomerTimelineTouchpoint({
				type: 'aichat',
				channel: 'ai-chat',
				title: 'AI conversation opened from workspace',
				detail: seedPrompt
					? 'Customer opened AI with proposal/policy context from Tab 3.'
					: 'Customer continued the saved AI conversation from Tab 3.',
			});
		}

		window.location.assign('/tabs/chatbot');
	};

	const attachProfileInputs = () => {
		if (activeUser?.role === 'customer') {
			addCustomerTimelineTouchpoint({
				type: 'document',
				channel: 'system',
				title: 'Profile inputs attached to AI context',
				detail: 'Customer attached profile details before continuing chat.',
			});
		}

		setPortalMessage('Profile inputs attached. Continue the saved chat to see updated recommendations.');
	};

	const toggleTimelineFilter = (filterType: TimelineType) => {
		setSelectedTimelineFilters(current =>
			current.includes(filterType)
				? current.filter(t => t !== filterType)
				: [...current, filterType]
		);
	};

	const toggleConsultantTimelineFilter = (filterType: TimelineType) => {
		setSelectedConsultantTimelineFilters(current =>
			current.includes(filterType)
				? current.filter(t => t !== filterType)
				: [...current, filterType]
		);
	};

	const escalateToConsultant = () => {
		if (!activeUser || activeUser.role !== 'customer') {
			return;
		}

		addCustomerTimelineTouchpoint({
			type: 'direct-message',
			channel: 'direct-message',
			title: 'Escalated to consultant',
			detail: 'Customer requested consultant follow-up with AI summary attached.',
		});

		setPortalMessage('Escalation sent. Consultant can now review this from the pending interactions queue.');
	};

	const viewClientAiSummary = () => {
		setPortalMessage(`AI summary opened for ${activeClient.name}.`);
	};

	const generateClientRadarData = () => {
		if (!activeClient) return radarData;
		const client = activeClient as any;
		const riskLevel = client.preferences?.some((p: string) => p.includes('risk')) ? (client.preferences?.some((p: string) => p.includes('Low')) ? 45 : 85) : 65;
		const hasFamily = client.preferences?.some((p: string) => p.includes('Family')) ?? true;
		const hasProtection = client.preferences?.some((p: string) => p.includes('protection')) ?? true;
		const hasWealth = client.tag?.includes('Wealth') ?? false;
		
		return [
			{ axis: 'Life', value: hasFamily && hasProtection ? 78 : 58 },
			{ axis: 'Health', value: hasProtection ? 82 : 64 },
			{ axis: 'Critical Illness', value: riskLevel > 70 ? 72 : 52 },
			{ axis: 'Disability', value: riskLevel > 70 ? 68 : 38 },
			{ axis: 'Savings', value: hasWealth ? 85 : 65 },
		];
	};

	const generateClientTrendData = () => {
		if (!activeClient) return trendData;
		const client = activeClient as any;
		const riskLevel = client.preferences?.some((p: string) => p.includes('Low')) ? 0.6 : (client.preferences?.some((p: string) => p.includes('Growth')) ? 0.8 : 0.7);
		const startScore = Math.round(55 + riskLevel * 15);
		
		return [
			{ week: 'W1', score: startScore },
			{ week: 'W2', score: Math.round(startScore + 6 * riskLevel) },
			{ week: 'W3', score: Math.round(startScore + 12 * riskLevel) },
			{ week: 'W4', score: Math.round(startScore + 18 * riskLevel) },
		];
	};

	const buildClientRecommendations = () => {
		if (!activeClient) return recommendations;
		const client = activeClient as any;
		const isLowRisk = client.preferences?.some((p: string) => p.includes('Low'));
		const isGrowth = client.preferences?.some((p: string) => p.includes('Growth'));
		const hasFamily = client.preferences?.some((p: string) => p.includes('Family'));
		const isWealth = client.tag?.includes('Wealth');
		
		const baseRecs: Recommendation[] = [];
		
		if (hasFamily || !isGrowth) {
			baseRecs.push({
				id: 'r1',
				policyName: 'PRUShield + PRUExtra Plus',
				premium: 'S$102/mo',
				score: 94,
				reason: `Based on ${client.name}'s profile: family coverage priority matched with hospital gap protection.`,
				fullReasoning: `${client.name}'s profile indicates concern for family stability and claim safety. This option improves inpatient and post-hospitalisation cover while maintaining premium affordability. The ${client.age}-year-old profile with ${hasFamily ? 'family commitments' : 'personal needs'} is well-suited to this plan stack.`,
			});
		}

		if (!isWealth || (isGrowth && hasFamily)) {
			baseRecs.push({
				id: 'r2',
				policyName: 'PRUActive Life V (Enhanced CI Rider)',
				premium: 'S$89/mo',
				score: isGrowth ? 89 : 86,
				reason: `Matches ${client.name}'s ${isGrowth ? 'growth-oriented' : 'balanced'} profile with early-stage critical illness protection.`,
				fullReasoning: `${client.name}'s preferences for ${client.preferences?.join(', ') ?? 'balanced protection'} indicate a need for flexible, early-stage protection. Enhanced CI rider improves payout confidence and complements existing cover. At age ${client.age}, this timing optimizes long-term dependent protection.`,
			});
		}

		if (isWealth) {
			baseRecs.push({
				id: 'r3',
				policyName: 'PRUActive Saver III Enhanced',
				premium: 'S$135/mo',
				score: 91,
				reason: `Wealth accumulation strategy aligned with ${client.name}'s long-term savings discipline focus.`,
				fullReasoning: `${client.name}'s profile shows commitment to wealth building and stable accumulation. Enhanced version provides milestone planning, capital guarantee, and tax-efficient investment options. Predictable returns support long-term financial milestones.`,
			});
		} else {
			baseRecs.push({
				id: 'r3',
				policyName: 'PRUPersonal Accident + Daily Care Rider',
				premium: 'S$31/mo',
				score: isLowRisk ? 79 : 82,
				reason: `Affordable gap-closer for ${client.name}'s ${isLowRisk ? 'risk-averse' : 'balanced'} profile.`,
				fullReasoning: `For ${client.name}'s profile, this rider closes accidental disability and income disruption gaps not fully covered by primary plans. Budget-friendly addition maintains affordability while expanding protection scope.`,
			});
		}

		return baseRecs;
	};

	const activeClientRecommendations = useMemo(
		() => buildClientRecommendations(),
		[activeClient]
	);

	const recommendGapAction = (issue: string) => {
		setPortalMessage(`Recommendation draft created for: ${issue}`);
	};

	const sendRecommendationToClient = (item: Recommendation) => {
		if (activeUser?.role === 'consultant' && activeClient.userId) {
			addTimelineEvent({
				customerId: activeClient.userId,
				consultantId: activeUser.id,
				type: 'proposal',
				channel: 'direct-message',
				title: `Consultant sent recommendation: ${item.policyName}`,
				detail: `${activeUser.name} sent a recommendation to ${activeClient.name}.`,
				policyOptions: [item.policyName],
				readBy: [activeUser.id],
			});
		}

		setPortalMessage(`Recommendation sent to ${activeClient.name}.`);
	};

	const askAiAboutProposal = () => {
		openChatWorkspace(`Explain proposal ${currentProposal.plan} for ${displayName}. Focus on premium ${currentProposal.premiumMonthly}, coverage ${currentProposal.coverage}, and trade-offs in simple terms.`);
	};

	const submitProposalForConsultantApproval = () => {
		if (!activeUser || activeUser.role !== 'customer') {
			return;
		}

		const result = requestProposalAcceptance({
			customerId: activeUser.id,
			policyName: currentProposal.plan,
		});

		setPortalMessage(result.ok ? 'Signed proposal sent to consultant for approval.' : result.message);
		if (result.ok) {
			setTimelineItems(getTimelineEventsForUser(activeUser));
			setUnreadCount(getUnreadTimelineCountForUser(activeUser));
			setCustomerProposalRequests(getProposalAcceptanceRequestsForCustomer(activeUser.id));
		}
	};

	const notificationItems = activeUser
		? timelineItems
			.filter(item => !item.readBy.includes(activeUser.id))
			.concat(timelineItems.filter(item => item.readBy.includes(activeUser.id)))
			.slice(0, 8)
		: [];
	const consultantRequestNotifications = activeUser?.role === 'consultant'
		? consultantPendingRequests.slice(0, 6)
		: [];
	const consultantProposalNotifications = activeUser?.role === 'consultant'
		? consultantPendingProposalRequests.slice(0, 6)
		: [];
	const totalUnreadCount = unreadCount + consultantRequestNotifications.length + consultantProposalNotifications.length;

	const customerName = (customerId: string) => getUserById(customerId)?.name ?? 'Customer';
	const selectedClientPendingRequests = activeClient.userId
		? consultantPendingRequests.filter(request => request.customerId === activeClient.userId)
		: [];
	const selectedClientPendingProposalRequests = activeClient.userId
		? consultantPendingProposalRequests.filter(request => request.customerId === activeClient.userId)
		: [];

	if (!activeUser) {
		return (
			<div className="tab3-react-shell">
				<section className="workspace-card">
					<article className="panel">
						<h2>Login required</h2>
						<p className="meta">Please login from Tab 4 to load your personalised content.</p>
						<button type="button" className="primary" onClick={() => window.location.assign('/tabs/tab4')}>
							Go to Profile Login
						</button>
					</article>
				</section>
			</div>
		);
	}

	return (
		<div className={cx('tab3-react-shell', role === 'consultant' && 'consultant-theme')}>
			<header className="hero-band">
				<div>
					<p className="kicker">Unified Insurance Workspace</p>
					<h1>{activeUser.role === 'customer' ? 'Interaction Timeline' : 'Consultant Workspace'}</h1>
					<p className="subtitle">
						Signed in as {displayName}. Content is tailored from your profile, role, and saved preferences.
					</p>
				</div>
				<div className="hero-actions">
					<button type="button" className="notify-bell" onClick={openNotificationCenter} aria-label="Open notifications">
						<Bell size={18} />
						{totalUnreadCount > 0 ? <span>{totalUnreadCount > 9 ? '9+' : totalUnreadCount}</span> : null}
					</button>
					{activeUser.role === 'customer' ? (
						<button
							type="button"
							className="ghost"
							onClick={() => setProfileMenuOpen(current => !current)}
						>
							View Profile
						</button>
					) : (
						<button
							type="button"
							className="ghost"
							onClick={() => setConsultantMenuOpen(current => !current)}
						>
							Menu
						</button>
					)}
					<p className="hero-note">{totalUnreadCount > 0 ? `${totalUnreadCount} new updates` : 'No new updates'}</p>
				</div>
			</header>

			{activeUser.role === 'customer' && profileMenuOpen ? (
				<section className="workspace-card">
					<article className="panel profile-mini-card">
						<div className="panel-head-inline">
							<h3>My Profile</h3>
							<button type="button" className="ghost" onClick={() => setProfileMenuOpen(false)}>Close</button>
						</div>
						<div className="profile-grid">
							<p><strong>Name:</strong> {activeUser.name}</p>
							<p><strong>Email:</strong> {activeUser.email}</p>
							<p><strong>Life Stage:</strong> {activeUser.lifeStage ?? 'Not set'}</p>
							<p><strong>Risk:</strong> {activeUser.riskAppetite ?? 'Not set'}</p>
							<p><strong>Income:</strong> {activeUser.monthlyIncome ?? 'Not set'}</p>
							<p><strong>Employment:</strong> {activeUser.employmentStatus ?? 'Not set'}</p>
							<p><strong>Dependents:</strong> {activeUser.dependents ?? 0}</p>
							<p><strong>Priorities:</strong> {activeUser.financialPriorities?.join(', ') ?? 'Not set'}</p>
							<p><strong>Horizon:</strong> {activeUser.planningHorizon ?? 'Not set'}</p>
							<p><strong>Preferred Contact:</strong> {activeUser.preferredContact ?? 'Not set'}</p>
						</div>
						<div className="profile-actions">
							<button
								type="button"
								className="primary"
								onClick={() => {
									logoutUser();
									window.location.assign('/tab4');
								}}
							>
								Logout
							</button>
						</div>
					</article>
				</section>
			) : null}

			{activeUser.role === 'consultant' && consultantMenuOpen ? (
				<section className="workspace-card">
					<article className="panel profile-mini-card">
						<div className="panel-head-inline">
							<h3>Consultant Menu</h3>
							<button type="button" className="ghost" onClick={() => setConsultantMenuOpen(false)}>Close</button>
						</div>
						<div className="profile-grid">
							<p><strong>Name:</strong> {activeUser.name}</p>
							<p><strong>Email:</strong> {activeUser.email}</p>
						</div>
						<div className="profile-actions">
							<button
								type="button"
								className="primary"
								onClick={() => {
									logoutUser();
									window.location.assign('/tab4');
								}}
							>
								Logout
							</button>
						</div>
					</article>
				</section>
			) : null}

			{notificationsOpen ? (
				<section className="workspace-card notification-board">
					<div className="panel-head-inline">
						<div>
							<p className="kicker">Notifications</p>
							<h3>{totalUnreadCount > 0 ? 'New updates' : 'Recent updates'}</h3>
						</div>
						{unreadCount > 0 ? <button type="button" className="ghost" onClick={markNotificationsSeen}>Mark all seen</button> : null}
					</div>
					{consultantRequestNotifications.length > 0 ? (
						<div className="notification-list-board">
							{consultantRequestNotifications.map(request => (
								<article className="notification-card" key={request.id}>
									<div>
										<p className="meta strong">Meeting change from {customerName(request.customerId)}</p>
										<p className="meta">{formatCalendarDate(request.proposedDate)} • {request.proposedTime}</p>
										<p className="meta">Reason: {request.reason}</p>
										<p className="meta">Options: {request.guidanceOptions.join(', ')}</p>
									</div>
									<div className="approval-actions">
										<button type="button" className="ghost" onClick={() => openClientProfile(request.customerId)}>Open Customer</button>
										<button type="button" className="ghost reject" onClick={() => rejectPendingRequest(request)}>Reject</button>
										<button type="button" className="primary" onClick={() => approvePendingRequest(request)}>Approve</button>
									</div>
								</article>
							))}
						</div>
					) : null}
					{consultantProposalNotifications.length > 0 ? (
						<div className="notification-list-board">
							{consultantProposalNotifications.map(request => (
								<article className="notification-card" key={request.id}>
									<div>
										<p className="meta strong">Proposal approval from {customerName(request.customerId)}</p>
										<p className="meta">Policy: {request.policyName}</p>
										<p className="meta">Requested {relativeTime(request.requestedAt)}</p>
									</div>
									<div className="approval-actions">
										<button type="button" className="ghost" onClick={() => openClientProfile(request.customerId)}>Open Customer</button>
										<button type="button" className="ghost reject" onClick={() => rejectProposalRequest(request)}>Reject</button>
										<button type="button" className="primary" onClick={() => approveProposalRequest(request)}>Approve</button>
									</div>
								</article>
							))}
						</div>
					) : null}
					<div className="notification-list-board">
						{notificationItems.map(item => (
							<article className="notification-card" key={item.id}>
								<div>
									<p className="meta strong">{item.title}</p>
									<p className="meta">{item.detail}</p>
									{item.policyOptions?.length ? <p className="meta">Guidance: {item.policyOptions.join(', ')}</p> : null}
								</div>
								<span className={cx('tag', activeUser && !item.readBy.includes(activeUser.id) && 'warn')}>{relativeTime(item.createdAt)}</span>
							</article>
						))}
					</div>
				</section>
			) : null}

			{portalMessage ? (
				<section className="workspace-card status-message">
					<article className="panel">
						<p className="meta strong">{portalMessage}</p>
					</article>
				</section>
			) : null}

			{role === 'customer' ? (
				<section className="workspace-card">
					<nav className="top-nav">
						{customerTabs.map(tab => (
							<button
								key={tab.id}
								type="button"
								className={cx('nav-pill', customerView === tab.id && 'active')}
								onClick={() => setCustomerView(tab.id)}
							>
								{tab.icon}
								<span>{tab.label}</span>
							</button>
						))}
					</nav>

					{customerView === 'home' && (
						<div className="content-stack">
							<article className="panel bright timeline-status">
								<div>
									<p className="kicker">Status Update</p>
									<h2>On Track for Wellness</h2>
									<p>
										{displayName}, your financial protection is maturing. Profile: {lifeStage} • {riskAppetite} risk.
									</p>
								</div>
								<button
									type="button"
									className="primary"
									onClick={() => {
										addCustomerTimelineTouchpoint({
											type: 'aichat',
											channel: 'ai-chat',
											title: 'Customer opened AI chat',
											detail: 'Customer launched AI assistant from quick access in timeline.',
											policyOptions: [currentProposal.plan],
										});
										openChatWorkspace();
									}}
								>
									Talk to AI
									<ChevronRight size={16} />
								</button>
							</article>

							<section className="timeline-feed" aria-label="Realtime timeline">
								<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #d9dce7' }}>
									<button
										type="button"
										className={cx('guide-chip', selectedTimelineFilters.includes('aichat') && 'active')}
										onClick={() => toggleTimelineFilter('aichat')}
										style={{ fontSize: '0.85rem', padding: '6px 12px' }}
									>
										AI Chat
									</button>
									<button
										type="button"
										className={cx('guide-chip', selectedTimelineFilters.includes('consultation') && 'active')}
										onClick={() => toggleTimelineFilter('consultation')}
										style={{ fontSize: '0.85rem', padding: '6px 12px' }}
									>
										Consultation
									</button>
									<button
										type="button"
										className={cx('guide-chip', selectedTimelineFilters.includes('proposal') && 'active')}
										onClick={() => toggleTimelineFilter('proposal')}
										style={{ fontSize: '0.85rem', padding: '6px 12px' }}
									>
										Proposal
									</button>
								</div>
								
								{customerTimeline.slice(0, timelineVisibleCount).map(item => (
									<article className="timeline-event" key={item.id}>
										<span className="timeline-dot" aria-hidden="true" />
										<div className="timeline-card">
											<div className="timeline-card-head">
												<span className={cx('timeline-tag', item.type)}>{eventTagLabel[item.type]}</span>
												<p className="meta">{relativeTime(item.createdAt)}</p>
											</div>
											<h3>{item.title}</h3>
											<p>{item.detail}</p>
											{item.policyOptions?.length ? <p className="meta">Options: {item.policyOptions.join(', ')}</p> : null}
											{item.type === 'aichat' ? <button type="button" className="timeline-link" onClick={() => setCustomerView('chatbot')}>View Transcript<ChevronRight size={15} /></button> : null}
											{item.type === 'proposal' ? <button type="button" className="timeline-link" onClick={() => setCustomerView('proposal')}>View Proposal<ChevronRight size={15} /></button> : null}
											{item.type === 'document' ? <button type="button" className="timeline-link" onClick={() => setCustomerView('policies')}>Open Documents<ChevronRight size={15} /></button> : null}
										</div>
									</article>
								))}
								{timelineVisibleCount < customerTimeline.length ? (
									<button type="button" className="ghost full" onClick={() => setTimelineVisibleCount(count => count + 4)}>
										View More Updates
									</button>
								) : null}
								{customerTimeline.length === 0 ? <article className="panel"><p className="meta">No interactions yet. Start by using Talk to AI.</p></article> : null}
							</section>

							<article className="panel upcoming-panel">
								<div className="panel-head-inline">
									<h3>Upcoming Consultant Sessions</h3>
									<span className="score-pill">{meetings.length} booked</span>
								</div>
								<div className="appointment-list">
									{meetings.map(appointment => (
										<div className="appointment-card" key={appointment.id}>
											<div>
												<p className="meta strong">{appointment.consultantName}</p>
												<p className="meta">{appointment.consultantTitle}</p>
												<p className="meta">{appointment.specialty}</p>
												<p className="meta">{formatCalendarDate(appointment.date)} • {appointment.time} • {appointment.channel}</p>
											</div>
											<div className="appointment-actions">
												<span className={cx('tag', appointment.status === 'change-pending' && 'warn')}>
													{appointment.status === 'change-pending' ? 'Awaiting approval' : 'Confirmed'}
												</span>
												<button
													type="button"
													className="ghost"
													onClick={() => {
														if (changingMeetingId === appointment.id) {
															setChangingMeetingId(null);
														} else {
															onMeetingSelected(appointment.id);
														}
													}}
												>
													{changingMeetingId === appointment.id ? 'Hide Change Form' : 'Change Meeting Date'}
												</button>
											</div>
										</div>
									))}
								</div>

								{changingMeetingId ? (
								<div className="meeting-change-form">
									<h3>Change Meeting</h3>
									<p style={{ fontSize: '0.85rem', color: '#667085', marginBottom: '12px' }}>
										<strong>Proposed Dates & Times:</strong> Select one or more date/time combinations
									</p>
									<div className="meeting-form-grid">
										<div style={{ gridColumn: '1 / -1' }}>
											<label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#667085' }}>Select Meeting to Change</label>
											<select value={meetingForm.meetingId} onChange={event => onMeetingSelected(event.target.value)}>
												{meetings.map(meeting => (
													<option key={meeting.id} value={meeting.id}>
														{meeting.consultantName} • {formatCalendarDate(meeting.date)} • {meeting.time}
													</option>
												))}
											</select>
										</div>
										
										{meetingForm.proposedSlots.map((slot, slotIndex) => (
											<div key={`${meetingForm.meetingId}-${slotIndex}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', gridColumn: '1 / -1', padding: '12px', backgroundColor: '#f8f9fb', borderRadius: '12px' }}>
												<div>
													<label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px', color: '#667085' }}>Date</label>
													<input 
														type="date" 
														value={slot.date} 
														onChange={event => updateMeetingSlot(slotIndex, { date: event.target.value })} 
														className="date-time-input"
														style={{ width: '100%', boxSizing: 'border-box', fontSize: '1rem', cursor: 'pointer' }}
													/>
												</div>
												<div>
													<label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px', color: '#667085' }}>Time</label>
													<input 
														type="time" 
														value={slot.time} 
														onChange={event => updateMeetingSlot(slotIndex, { time: event.target.value })} 
														className="date-time-input"
														style={{ width: '100%', boxSizing: 'border-box', fontSize: '1rem', cursor: 'pointer' }}
													/>
												</div>
												{meetingForm.proposedSlots.length > 1 ? (
													<button type="button" className="ghost" onClick={() => removeMeetingSlot(slotIndex)} style={{ gridColumn: '1 / -1' }}>Remove this option</button>
												) : null}
											</div>
										))}
										
										<button type="button" className="ghost" onClick={addMeetingSlot} style={{ gridColumn: '1 / -1' }}>+ Add Another Date Option</button>
										<textarea rows={4} value={meetingForm.reason} onChange={event => setMeetingForm(current => ({ ...current, reason: event.target.value }))} placeholder="State the reason for change" />
										<div className="guide-chip-row">
											{guidanceOptions.map(option => (
												<button key={option} type="button" className={cx('guide-chip', meetingForm.guidanceOptions.includes(option) && 'active')} onClick={() => toggleGuidanceOption(option)}>
													{option}
												</button>
											))}
										</div>
										<button type="button" className="primary" onClick={submitMeetingChange}>Send Request To Consultant</button>
									</div>
								</div>
								) : null}

								{customerRequests.length > 0 ? (
									<div className="request-status-list">
										<h3>Requests Sent to Consultant</h3>
										{customerRequests.map(request => (
											<div key={request.id} className="request-status-card">
												<p className="meta strong">{formatCalendarDate(request.proposedDate)} • {request.proposedTime}</p>
												{request.proposedSlots?.length ? <p className="meta">All options: {request.proposedSlots.map(slot => formatSlot(slot)).join(' / ')}</p> : null}
												<p className="meta">{request.reason}</p>
												{request.guidanceOptions.length ? <p className="meta">Guidance: {request.guidanceOptions.join(', ')}</p> : null}
												<span className={cx('tag', request.status === 'pending' && 'warn')}>
													{request.status === 'pending' ? 'Waiting for consultant' : request.status === 'approved' ? 'Approved' : 'Rejected'}
												</span>
											</div>
										))}
									</div>
								) : null}
							</article>
						</div>
					)}

					{customerView === 'proposal' && (
						<div className="content-stack">
							<article className="panel proposal-card">
								<div className="proposal-hero">
									<p className="kicker">Insurance Proposal</p>
									<h3>{currentProposal.plan}</h3>
									<p className="meta">Underwritten by {currentProposal.provider}</p>
								</div>

								<div className="proposal-metrics">
									<div><span>Monthly Premium</span><strong>{currentProposal.premiumMonthly}</strong></div>
									<div><span>Coverage</span><strong>{currentProposal.coverage}</strong></div>
									<div><span>Term</span><strong>{currentProposal.term}</strong></div>
								</div>

								<div className="proposal-fit">
									<h4>Why this fits you</h4>
									<p>
										Based on your profile, this plan optimises hospital coverage and critical illness support for your current risk appetite.
									</p>
								</div>

								<div className="proposal-benefits">
									<h4>Key Benefits</h4>
									{currentProposal.benefits.map(benefit => (
										<div className="proposal-benefit" key={benefit}>
											<CircleCheck size={15} />
											<p>{benefit}</p>
										</div>
									))}
								</div>

								<div className="proposal-breakdown">
									<h4>Detailed Breakdown</h4>
									{currentProposal.breakdown.map(row => (
										<div className="proposal-row" key={row.name}>
											<span>{row.name}</span>
											<strong>{row.cover}</strong>
										</div>
									))}
								</div>

								<div className="proposal-total">
									<span>Total Monthly Premium</span>
									<strong>{currentProposal.premiumMonthly}</strong>
								</div>

								<div className="proposal-action-stack">
									<button
										type="button"
										className="ghost full"
										onClick={askAiAboutProposal}
									>
										Ask AI About This Proposal
									</button>

									<button
										type="button"
										className="primary full"
										onClick={submitProposalForConsultantApproval}
									>
										Sign & Accept Proposal
									</button>
								</div>
							</article>

							{customerProposalRequests.length > 0 ? (
								<article className="panel request-status-list">
									<h3>Proposal Approval Status</h3>
									{customerProposalRequests.map(request => (
										<div key={request.id} className="request-status-card">
											<p className="meta strong">{request.policyName}</p>
											<p className="meta">Requested {relativeTime(request.requestedAt)}</p>
											<span className={cx('tag', request.status === 'pending' && 'warn')}>
												{request.status === 'pending' ? 'Waiting for consultant' : request.status === 'approved' ? 'Approved' : 'Rejected'}
											</span>
										</div>
									))}
								</article>
							) : null}
						</div>
					)}

					{customerView === 'chatbot' && (
						<div className="content-stack">
							<div className="grid two">
								<article className="panel chat-panel">
									<div className="chat-head">
										<h3>AI Chatbot</h3>
										<p>{savedChatCount > 0 ? `Saved conversation ready with ${savedChatCount} messages. Continue the same thread.` : 'Answer a few questions on needs, risk appetite, and life stage.'}</p>
									</div>
									<div className="chat-log">
										<div className="bubble ai">What matters most to you now: lower premium, stronger protection, or long-term savings?</div>
										<div className="bubble customer">Young family, two kids. I want stronger medical protection without premium shock.</div>
										<div className="bubble ai">Thanks. I recommend PRUShield + PRUExtra Plus as your primary candidate.</div>
									</div>
									<div className="chat-actions">
										<button
											type="button"
											className="primary"
											onClick={() => openChatWorkspace()}
										>
											Continue Saved Chat
										</button>
										<button type="button" className="ghost" onClick={attachProfileInputs}>Attach Profile Inputs</button>
									</div>
								</article>

								<article className="panel">
									<div className="panel-head-inline">
										<h3>Personalised Recommendation</h3>
										<span className="score-pill">92% Match</span>
									</div>
									<p className="meta strong">Recommended: PRUShield + PRUExtra Plus</p>
									<p className="meta">Here&apos;s why, based on your inputs:</p>

									<div className="reasoning-list">
										{reasoningPanel.map(reason => (
											<div className="reasoning-item" key={reason.id}>
												<button
													type="button"
													className="reasoning-trigger"
													onClick={() => setExpandedReasonId(expandedReasonId === reason.id ? null : reason.id)}
												>
													<span>{reason.title}</span>
													<ChevronRight size={15} className={cx(expandedReasonId === reason.id && 'open')} />
												</button>
												<p>{reason.summary}</p>
												{expandedReasonId === reason.id ? <p className="deep">{reason.deepDive}</p> : null}
											</div>
										))}
									</div>

									<button type="button" className="primary full" onClick={escalateToConsultant}>Escalate to Consultant (Attach AI Session Summary)</button>
								</article>
							</div>
						</div>
					)}

					{customerView === 'compare' && (
						<div className="content-stack">
							<article className="panel">
								<h3>Policy Comparison (2-3 policies)</h3>
								<div className="comparison-table-wrap">
									<table className="comparison-table">
										<thead>
											<tr>
												<th>Policy</th>
												<th>Premium</th>
												<th>Coverage</th>
												<th>Pros</th>
												<th>Cons</th>
												<th>Match Score</th>
											</tr>
										</thead>
										<tbody>
											{personalizedPolicies.map(policy => (
												<tr key={policy.id} className={cx(selectedPolicy?.id === policy.id && 'selected')}>
													<td>{policy.name}</td>
													<td>{policy.premium}</td>
													<td>{policy.coverage}</td>
													<td>{policy.pros[0]}</td>
													<td>{policy.cons[0]}</td>
													<td>
														<div className="score-bar">
															<span style={{ width: `${policy.matchScore}%` }}></span>
															<strong>{policy.matchScore}%</strong>
														</div>
														<button type="button" className="timeline-link" onClick={() => setSelectedPolicyId(policy.id)}>
															View Details
															<ChevronRight size={15} />
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</article>

							{selectedPolicy ? (
								<article className="panel proposal-card">
									<div className="proposal-hero">
										<p className="kicker">Top Recommendation</p>
										<h3>{selectedPolicy.name}</h3>
										<p className="meta">Coverage: {selectedPolicy.coverage}</p>
									</div>
									<div className="proposal-metrics">
										<div><span>Match</span><strong>{selectedPolicy.matchScore}%</strong></div>
										<div><span>Premium</span><strong>{selectedPolicy.premium}</strong></div>
										<div><span>Renewal</span><strong>{selectedPolicy.renewal}</strong></div>
									</div>
									<div className="proposal-breakdown">
										<h4>Match Reasoning</h4>
										{selectedPolicy.pros.map(reason => (
											<div className="proposal-row" key={reason}><span>{reason}</span><strong>Strength</strong></div>
										))}
									</div>

									<button type="button" className="reason-toggle" onClick={() => setPolicyDeepDiveOpen(current => !current)}>
										Deep Dive Analysis
										<ChevronRight size={15} className={cx(policyDeepDiveOpen && 'open')} />
									</button>

									{policyDeepDiveOpen ? (
										<div className="proposal-breakdown">
											<div className="proposal-row"><span>Plan Comparison</span><strong>Current vs selected shown</strong></div>
											<div className="proposal-row"><span>Coverage Strength</span><strong>Health strongest, CI moderate</strong></div>
											<div className="proposal-row"><span>Deductible Waiver</span><strong>Premium rider available</strong></div>
											<div className="proposal-row"><span>Diagnostic Tests</span><strong>Included by rider class</strong></div>
										</div>
									) : null}

									<div className="proposal-action-stack">
										<button
											type="button"
											className="primary full"
											onClick={() => {
												setPortalMessage(`${selectedPolicy.name} selected for proposal follow-up.`);
												setCustomerView('proposal');
											}}
										>
											Select This Plan
										</button>
										<button
											type="button"
											className="ghost full"
											onClick={() => openChatWorkspace(`Compare ${personalizedPolicies.map(policy => policy.name).join(' vs ')} for ${displayName}. Focus on premium, coverage, and trade-offs.`)}
										>
											Compare With Others In AI
										</button>
									</div>
								</article>
							) : null}
						</div>
					)}

					{customerView === 'policies' && (
						<div className="content-stack">
							<article className="panel">
								<h3>My Policies</h3>
								<div className="policy-list">
									{personalizedPolicies.map(policy => {
										const coverageTooltips: { [key: string]: string } = {
											Health: 'Health insurance: Hospital, medical, and critical illness coverage',
											'Life + CI': 'Life insurance plus Critical Illness: Income and family protection with early illness payout',
											Savings: 'Savings plan: Capital accumulation with guaranteed returns and milestone planning',
										};
										return (
											<div className="policy-row" key={policy.id}>
												<div>
													<p className="meta strong">{policy.name}</p>
													<p className="meta">Renewal: {policy.renewal}</p>
												</div>
												<div className="policy-right">
													<span className="tag" title={coverageTooltips[policy.coverage] || `Coverage: ${policy.coverage}`}>{policy.coverage}</span>
													<strong>{policy.premium}</strong>
												</div>
											</div>
										);
									})}
								</div>
							</article>

							<article className="panel">
								<h3>Profile Match Trend</h3>
								<div className="mini-chart">
									<ResponsiveContainer width="100%" height={180}>
										<AreaChart data={trendData}>
											<defs>
												<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#6c3a90" stopOpacity={0.55} />
														<stop offset="95%" stopColor="#6c3a90" stopOpacity={0.03} />
												</linearGradient>
											</defs>
											<Tooltip />
											<Area type="monotone" dataKey="score" stroke="#5b257c" fill="url(#trendFill)" strokeWidth={2.4} />
										</AreaChart>
									</ResponsiveContainer>
								</div>
							</article>
						</div>
					)}
				</section>
			) : (
				<section className="workspace-card">
					<nav className="top-nav">
						{consultantTabs.map(tab => (
							<button
								key={tab.id}
								type="button"
								className={cx('nav-pill', consultantView === tab.id && 'active')}
								onClick={() => setConsultantView(tab.id)}
							>
								{tab.icon}
								<span>{tab.label}</span>
							</button>
						))}
					</nav>

					{consultantView === 'dashboard' && (
						<div className="content-stack">
							<article className="panel consultant-head">
								<div>
									<p className="kicker">Consultant Dashboard</p>
									<h2>Hi {displayName}</h2>
								</div>
								<span className="status-badge">Blue Desk</span>
							</article>

							{consultantPendingRequests.length > 0 ? (
								<article className="panel approvals-panel">
									<div className="panel-head-inline">
										<div>
											<h3>Pending Meeting Changes</h3>
											<p className="meta">Approve customer date changes from here.</p>
										</div>
										<span className="score-pill">{consultantPendingRequests.length} pending</span>
									</div>
									<div className="approval-list">
										{consultantPendingRequests.map(request => (
											<div className="approval-card" key={request.id}>
												<div>
													<button type="button" className="link-button" onClick={() => openClientProfile(request.customerId)}>
														{customerName(request.customerId)}
													</button>
													<p className="meta">Requested {formatCalendarDate(request.proposedDate)} • {request.proposedTime}</p>
													<p className="meta">Reason: {request.reason}</p>
													{request.guidanceOptions.length ? <p className="meta">Guidance: {request.guidanceOptions.join(', ')}</p> : null}
												</div>
												<div className="approval-actions">
													<button type="button" className="ghost" onClick={() => openClientProfile(request.customerId)}>Open Customer</button>
													<button type="button" className="ghost reject" onClick={() => rejectPendingRequest(request)}>Reject</button>
													<button type="button" className="primary" onClick={() => approvePendingRequest(request)}>Approve</button>
												</div>
											</div>
										))}
									</div>
								</article>
							) : null}

							{consultantPendingProposalRequests.length > 0 ? (
								<article className="panel approvals-panel">
									<div className="panel-head-inline">
										<div>
											<h3>Pending Proposal Approvals</h3>
											<p className="meta">Customer signed proposals waiting for consultant approval.</p>
										</div>
										<span className="score-pill">{consultantPendingProposalRequests.length} pending</span>
									</div>
									<div className="approval-list">
										{consultantPendingProposalRequests.map(request => (
											<div className="approval-card" key={request.id}>
												<div>
													<button type="button" className="link-button" onClick={() => openClientProfile(request.customerId)}>
														{customerName(request.customerId)}
													</button>
													<p className="meta">Policy: {request.policyName}</p>
												</div>
												<div className="approval-actions">
													<button type="button" className="ghost" onClick={() => openClientProfile(request.customerId)}>Open Customer</button>
													<button type="button" className="ghost reject" onClick={() => rejectProposalRequest(request)}>Reject</button>
													<button type="button" className="primary" onClick={() => approveProposalRequest(request)}>Approve</button>
												</div>
											</div>
										))}
									</div>
								</article>
							) : null}

							<div className="grid three">
								<article className="panel metric"><Users size={18} /><h3>{workspaceClients.length}</h3><p>Active Clients</p></article>
								<article className="panel metric"><CalendarClock size={18} /><h3>{consultantPendingRequests.length + consultantPendingProposalRequests.length}</h3><p>Pending Follow-ups</p></article>
								<article className="panel metric"><CircleCheck size={18} /><h3>{consultantTimeline.length}</h3><p>Recent Activity</p></article>
							</div>

							<article className="panel">
								<h3>Recent Client Interactions</h3>
								<div className="interaction-list">
									{workspaceClients.map(client => (
										<div className="interaction-row" key={client.id}>
											<div>
												<p className="meta strong">{client.name}</p>
												<p className="meta">Last contact: {client.lastInteraction}</p>
											</div>
											<span className={cx('tag', client.status === 'Pending' && 'warn')} title={statusTagDescription[client.status]}>{client.status}</span>
										</div>
									))}
								</div>
							</article>
						</div>
					)}

					{consultantView === 'clients' && (
						<div className="content-stack">
							<article className="panel">
								<div className="search-row">
									<Search size={16} />
									<input
										value={clientQuery}
										onChange={event => setClientQuery(event.target.value)}
										placeholder="Search clients"
									/>
								</div>

								<div className="filter-row">
									{(['All', 'Active', 'Pending'] as const).map(filter => (
										<button
											key={filter}
											type="button"
											className={cx(clientFilter === filter && 'active')}
											onClick={() => setClientFilter(filter)}
										>
											<Filter size={14} />
											{filter}
										</button>
									))}
								</div>
							</article>

							<article className="panel">
								<div className="client-card-list">
									{visibleClients.map(client => (
										<button
											key={client.id}
											type="button"
											className={cx('client-card', client.id === selectedClientId && 'selected')}
											onClick={() => {
												setSelectedClientId(client.id);
												setConsultantView('profile');
											}}
										>
											<div className="avatar">{initials(client.name)}</div>
											<div>
												<p className="meta strong">{client.name}</p>
												<p className="meta">{client.tag} • {client.lastInteraction}</p>
											</div>
											<span className={cx('tag', client.status === 'Pending' && 'warn')} title={statusTagDescription[client.status]}>{client.status}</span>
										</button>
									))}
								</div>
							</article>
						</div>
					)}

					{consultantView === 'profile' && (
						<div className="content-stack">
							{selectedClientPendingRequests.length > 0 ? (
								<article className="panel approvals-panel">
									<div className="panel-head-inline">
										<div>
											<h3>Pending Request For {activeClient.name}</h3>
											<p className="meta">Approve or reject the selected customer request.</p>
										</div>
									</div>
									<div className="approval-list">
										{selectedClientPendingRequests.map(request => (
											<div className="approval-card" key={request.id}>
												<div>
													<p className="meta">Requested {formatCalendarDate(request.proposedDate)} • {request.proposedTime}</p>
													<p className="meta">Reason: {request.reason}</p>
													<p className="meta">Selected options: {request.guidanceOptions.join(', ')}</p>
												</div>
												<div className="approval-actions">
													<button type="button" className="ghost reject" onClick={() => rejectPendingRequest(request)}>Reject</button>
													<button type="button" className="primary" onClick={() => approvePendingRequest(request)}>Approve</button>
												</div>
											</div>
										))}
									</div>
								</article>
							) : null}

							{selectedClientPendingProposalRequests.length > 0 ? (
								<article className="panel approvals-panel">
									<div className="panel-head-inline">
										<div>
											<h3>Pending Proposal Approval For {activeClient.name}</h3>
											<p className="meta">Approve or reject signed proposals from this customer.</p>
										</div>
									</div>
									<div className="approval-list">
										{selectedClientPendingProposalRequests.map(request => (
											<div className="approval-card" key={request.id}>
												<div>
													<p className="meta strong">{request.policyName}</p>
													<p className="meta">Requested {relativeTime(request.requestedAt)}</p>
												</div>
												<div className="approval-actions">
													<button type="button" className="ghost reject" onClick={() => rejectProposalRequest(request)}>Reject</button>
													<button type="button" className="primary" onClick={() => approveProposalRequest(request)}>Approve</button>
												</div>
											</div>
										))}
									</div>
								</article>
							) : null}

							<article className="panel">
								<div className="profile-top">
									<div>
										<h3>{activeClient.name}</h3>
										<p className="meta">Age {activeClient.age} • {activeClient.contact}</p>
									</div>
									<button type="button" className="ghost" onClick={viewClientAiSummary}>
										<FileText size={15} />
										View Full AI Session Summary
									</button>
								</div>

								<div className="chip-row">
									{activeClient.preferences.map(pref => {
										const preferenceTooltips: { [key: string]: string } = {
											'Low risk': 'Prefers conservative investment and protection strategies with stable, predictable outcomes',
											'Growth upside': 'Interested in growth-oriented plans with potential for returns above inflation',
											'Family coverage': 'Prioritizes protection for dependents and household financial security',
											'Long-term protection': 'Seeks multi-decade protection plans that grow with life stages',
											'Early CI payout': 'Values early-stage critical illness payouts for immediate financial support',
											'Savings discipline': 'Committed to systematic savings and wealth accumulation',
											'Low volatility': 'Prefers stable investment options with minimal market fluctuations',
											'Milestone planning': 'Plans for specific financial milestones like education, marriage, retirement',
											'Stable premium': 'Desires predictable premium amounts without significant fluctuations',
										};
										return (
											<span key={pref} className="tag" title={preferenceTooltips[pref] || `Preference: ${pref}`}>{pref}</span>
										);
									})}
								</div>
							</article>

							<article className="panel">
								<h3>Unified Interaction Timeline</h3>
								<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #d9dce7' }}>
									<button
										type="button"
										className={cx('guide-chip', selectedConsultantTimelineFilters.includes('aichat') && 'active')}
										onClick={() => toggleConsultantTimelineFilter('aichat')}
										style={{ fontSize: '0.85rem', padding: '6px 12px' }}
									>
										AI Chat
									</button>
									<button
										type="button"
										className={cx('guide-chip', selectedConsultantTimelineFilters.includes('consultation') && 'active')}
										onClick={() => toggleConsultantTimelineFilter('consultation')}
										style={{ fontSize: '0.85rem', padding: '6px 12px' }}
									>
										Consultation
									</button>
									<button
										type="button"
										className={cx('guide-chip', selectedConsultantTimelineFilters.includes('proposal') && 'active')}
										onClick={() => toggleConsultantTimelineFilter('proposal')}
										style={{ fontSize: '0.85rem', padding: '6px 12px' }}
									>
										Proposal
									</button>
								</div>
								<div className="timeline">
									{consultantTimeline.map(item => (
										<div className="timeline-row" key={item.id}>
											<span>{relativeTime(item.createdAt)}</span>
											<div>
												<p className="meta strong"><span className={cx('timeline-tag', item.type)} title={eventTagDescription[item.type]}>{eventTagLabel[item.type]}</span> via {item.channel}</p>
												<p className="meta">{item.detail}</p>
												{item.policyOptions?.length ? <p className="meta">Options discussed: {item.policyOptions.join(', ')}</p> : null}
											</div>
										</div>
									))}
									{consultantTimeline.length === 0 ? <p className="meta">No timeline records for this client yet.</p> : null}
								</div>
							</article>
						</div>
					)}

					{consultantView === 'analytics' && (
						<div className="content-stack">
							<div className="grid two">
								<article className="panel chart-panel">
								<h3>Coverage Radar for {activeClient.name}</h3>
								<div className="chart-box">
									<ResponsiveContainer width="100%" height={270}>
										<RadarChart data={generateClientRadarData()}>
											<PolarGrid stroke="#d5c5f4" />
											<PolarAngleAxis dataKey="axis" tick={{ fill: '#5b257c', fontSize: 12 }} />
											<PolarRadiusAxis tick={{ fill: '#8f67af' }} domain={[0, 100]} />
											<Radar dataKey="value" stroke="#5b257c" fill="#74409a" fillOpacity={0.36} />
										</RadarChart>
									</ResponsiveContainer>
								</div>
							</article>

							<article className="panel chart-panel">
								<h3>Premium Breakdown</h3>
								<div className="chart-box">
									<ResponsiveContainer width="100%" height={270}>
										<PieChart>
											<Pie data={donutData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={106}>
												{donutData.map(slice => (
													<Cell key={slice.name} fill={slice.color} />
												))}
											</Pie>
											<Tooltip />
										</PieChart>
									</ResponsiveContainer>
								</div>
							</article>
						</div>

						<article className="panel">
							<h3>Gap Analysis for {activeClient.name}</h3>
							<p className="meta" style={{ marginBottom: '12px', fontSize: '0.9rem', color: '#666' }}>
								Based on {activeClient.name}'s profile ({activeClient.tag}), identified coverage gaps and optimization opportunities:
							</p>
							<div className="gap-list">
								{activeClient.preferences?.some((p: string) => p.includes('Disability')) && (
									<div><span>Disability protection enhancement recommended for income security</span><button type="button" onClick={() => recommendGapAction('Disability protection enhancement for income security')}>Recommend</button></div>
								)}
								{activeClient.preferences?.some((p: string) => p.includes('protection')) && (
									<div><span>Critical illness early-stage buffer can be strengthened</span><button type="button" onClick={() => recommendGapAction('Critical illness early-stage buffer strengthening')}>Recommend</button></div>
								)}
								{activeClient.preferences?.some((p: string) => p.includes('Family')) && (
									<div><span>Family protection coverage alignment to household income level</span><button type="button" onClick={() => recommendGapAction('Family protection alignment with income')}>Recommend</button></div>
								)}
							</div>
						</article>
					</div>
					)}

					{consultantView === 'recommendations' && (
						<div className="content-stack">
							<article className="panel">
								<h3>Recommendations for {activeClient.name}</h3>
								<p className="meta" style={{ marginBottom: '16px' }}>
									Personalized policy recommendations based on {activeClient.name}'s profile ({activeClient.tag}), age {activeClient.age}, and stated preferences.
								</p>
							</article>
							{activeClientRecommendations.map(item => (
								<article className="panel" key={item.id}>
									<div className="rec-head">
										<div>
											<h3>{item.policyName}</h3>
											<p className="meta">{item.premium}</p>
										</div>
										<span className="score-pill">{item.score}% Match</span>
									</div>

									<p className="meta">{item.reason}</p>

									<button
										type="button"
										className="reason-toggle"
										onClick={() => setExpandedRecommendationId(expandedRecommendationId === item.id ? null : item.id)}
									>
										Expand full reasoning
										<ChevronRight size={15} className={cx(expandedRecommendationId === item.id && 'open')} />
									</button>

									{expandedRecommendationId === item.id ? <p className="deep">{item.fullReasoning}</p> : null}

									<button type="button" className="primary" onClick={() => sendRecommendationToClient(item)}>
										<Phone size={14} />
										Send to Client
									</button>
								</article>
							))}
						</div>
					)}
				</section>
			)}
		</div>
	);
}
