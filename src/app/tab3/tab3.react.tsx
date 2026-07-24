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
	addTimelineEvent,
	getCurrentUser,
	getTimelineEventsForUser,
	getUnreadTimelineCountForUser,
	markTimelineRead,
	TimelineRecord,
	UserRecord,
} from '../../data/app-db';

type Role = 'customer' | 'consultant';
type CustomerView = 'home' | 'journey' | 'chatbot' | 'proposal' | 'compare' | 'policies';
type ConsultantView = 'dashboard' | 'clients' | 'profile' | 'analytics' | 'recommendations';

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

interface UpcomingAppointment {
	id: string;
	consultantName: string;
	specialty: string;
	date: string;
	time: string;
	channel: string;
	status: 'Confirmed' | 'Rescheduled';
}

interface JourneyStep {
	id: string;
	title: string;
	label: string;
	detail: string;
	accent: string;
	action?: string;
	view?: CustomerView;
	log?: {
		type: TimelineRecord['type'];
		channel: TimelineRecord['channel'];
		title: string;
		detail: string;
		policyOptions?: string[];
	};
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

const currentProposal = {
	plan: 'HealthShield Gold',
	provider: 'Orange Financial',
	premiumMonthly: 'S$128.50',
	coverage: '$500,000',
	term: 'Annual',
	benefits: [
		'Comprehensive hospitalisation support and specialist access.',
		'Cancer treatment support including chemotherapy and immunotherapy riders.',
		'Daily hospital cash payout during covered admissions.'
	],
	breakdown: [
		{ name: 'Inpatient Room & Board', cover: 'As incurred' },
		{ name: 'Intensive Care Unit', cover: 'As incurred' },
		{ name: 'Pre/Post-Hospitalisation (90 days)', cover: 'Up to $5k' },
		{ name: 'Post-Hospitalisation (100 days)', cover: 'Up to $30k' }
	]
};

const defaultUpcomingAppointments: UpcomingAppointment[] = [
	{
		id: 'a-1',
		consultantName: 'Subhash Raj',
		specialty: 'HealthShield review',
		date: '2026-07-24',
		time: '10:30 AM',
		channel: 'Video call',
		status: 'Confirmed',
	},
	{
		id: 'a-2',
		consultantName: 'Farah Lee',
		specialty: 'Critical illness planning',
		date: '2026-07-29',
		time: '03:00 PM',
		channel: 'In-person',
		status: 'Confirmed',
	},
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

const journeySteps: JourneyStep[] = [
	{
		id: 'notifications',
		title: 'Notifications',
		label: 'Alert',
		detail: 'A meeting reminder and unread timeline update are waiting for review.',
		accent: '#5b257c',
		action: 'Open timeline',
		view: 'home',
		log: {
			type: 'consultation',
			channel: 'system',
			title: 'Notification tray opened',
			detail: 'Customer reviewed the latest reminder and pending timeline items.',
		},
	},
	{
		id: 'reschedule',
		title: 'Reschedule Meeting',
		label: 'Meeting',
		detail: 'Choose a new date and keep the consultant session in sync.',
		accent: '#74409a',
		action: 'Manage booking',
		view: 'home',
	},
	{
		id: 'update',
		title: 'Update',
		label: 'Journey',
		detail: 'Track wellness, policy status, and the latest client activity at a glance.',
		accent: '#8f67af',
		action: 'View journey',
		view: 'journey',
	},
	{
		id: 'summary',
		title: 'Meeting Summary',
		label: 'Consultation',
		detail: 'A concise recap of the consultant discussion, priorities, and next actions.',
		accent: '#6c3a90',
		action: 'Open summary',
		view: 'proposal',
		log: {
			type: 'consultation',
			channel: 'meeting',
			title: 'Meeting summary reviewed',
			detail: 'Customer opened the meeting summary and next-step checklist.',
		},
	},
	{
		id: 'transcript',
		title: 'Chat Transcript',
		label: 'AI Chat',
		detail: 'The original chat thread is preserved for continued questions and refinement.',
		accent: '#4a1e66',
		action: 'Continue chat',
		view: 'chatbot',
		log: {
			type: 'aichat',
			channel: 'ai-chat',
			title: 'Chat transcript reviewed',
			detail: 'Customer revisited the original AI chat transcript.',
		},
	},
	{
		id: 'why',
		title: 'Why This Plan?',
		label: 'Recommendation',
		detail: 'Explain the match score, benefit fit, and trade-offs behind the recommendation.',
		accent: '#5b257c',
		action: 'See reasoning',
		view: 'chatbot',
		log: {
			type: 'proposal',
			channel: 'direct-message',
			title: 'Why-this-plan section opened',
			detail: 'Customer explored the recommendation reasoning and fit summary.',
			policyOptions: ['PRUShield + PRUExtra Plus'],
		},
	},
	{
		id: 'deep-dive',
		title: 'Deep Dive Analysis',
		label: 'Analysis',
		detail: 'Compare coverage depth, gap analysis, and premium trade-offs in detail.',
		accent: '#74409a',
		action: 'Review analysis',
		view: 'compare',
	},
	{
		id: 'application',
		title: 'Application Sent',
		label: 'Submission',
		detail: 'The completed application is ready to submit with a status recap.',
		accent: '#8f67af',
		action: 'Send application',
		view: 'policies',
		log: {
			type: 'document',
			channel: 'email',
			title: 'Application sent',
			detail: 'Customer sent the application after reviewing the full recommendation path.',
			policyOptions: ['Enhanced HealthShield Plan'],
		},
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

export function Tab3ReactApp(): React.JSX.Element {
	const [activeUser] = useState<UserRecord | null>(getCurrentUser());
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
	const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
	const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
	const [pendingAppointmentDate, setPendingAppointmentDate] = useState('');

	const visibleClients = useMemo(() => {
		return clients.filter(client => {
			const roleMatch = clientFilter === 'All' || client.status === clientFilter;
			const queryMatch = client.name.toLowerCase().includes(clientQuery.toLowerCase().trim());
			return roleMatch && queryMatch;
		});
	}, [clientFilter, clientQuery]);

	const activeClient = useMemo(
		() => clients.find(client => client.id === selectedClientId) ?? clients[0],
		[selectedClientId]
	);

	const customerTabs: Array<{ id: CustomerView; label: string; icon: React.JSX.Element }> = [
		{ id: 'home', label: 'Interaction Timeline', icon: <ChartPie size={16} /> },
		{ id: 'journey', label: 'Journey Flow', icon: <Sparkles size={16} /> },
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

	const eventTagLabel: Record<TimelineRecord['type'], string> = {
		aichat: 'AI Chat',
		consultation: 'Consultation',
		proposal: 'Proposal',
		document: 'Document',
		email: 'Email',
		'direct-message': 'DM',
	};

	const customerTimeline = useMemo(() => {
		if (!activeUser || activeUser.role !== 'customer') {
			return [];
		}

		return timelineItems.filter(item => item.customerId === activeUser.id);
	}, [activeUser, timelineItems]);

	const consultantTimeline = useMemo(() => {
		if (!activeUser || activeUser.role !== 'consultant') {
			return [];
		}

		if (activeClient.userId) {
			return timelineItems.filter(item => item.customerId === activeClient.userId);
		}

		return timelineItems;
	}, [activeClient.userId, activeUser, timelineItems]);

	useEffect(() => {
		if (!activeUser) {
			return;
		}

		const refreshTimeline = () => {
			const allEvents = getTimelineEventsForUser(activeUser);
			setTimelineItems(allEvents);
			setUnreadCount(getUnreadTimelineCountForUser(activeUser));
		};

		refreshTimeline();
		const timerId = window.setInterval(refreshTimeline, 2500);
		const onStorage = () => refreshTimeline();
		window.addEventListener('storage', onStorage);

		return () => {
			window.clearInterval(timerId);
			window.removeEventListener('storage', onStorage);
		};
	}, [activeUser]);

	useEffect(() => {
		if (!activeUser || activeUser.role !== 'customer') {
			return;
		}

		const storageKey = `bipj_upcoming_consultations_${activeUser.id}`;
		const stored = localStorage.getItem(storageKey);
		if (!stored) {
			setAppointments(defaultUpcomingAppointments);
			return;
		}

		try {
			setAppointments(JSON.parse(stored) as UpcomingAppointment[]);
		} catch {
			setAppointments(defaultUpcomingAppointments);
		}
	}, [activeUser]);

	useEffect(() => {
		if (!activeUser || activeUser.role !== 'customer' || appointments.length === 0) {
			return;
		}

		localStorage.setItem(`bipj_upcoming_consultations_${activeUser.id}`, JSON.stringify(appointments));
	}, [activeUser, appointments]);

	const openNotificationCenter = () => {
		if (!activeUser) {
			return;
		}

		markTimelineRead(activeUser.id);
		setUnreadCount(0);

		if (activeUser.role === 'customer') {
			setCustomerView('home');
			return;
		}

		setConsultantView('profile');
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

	const activateJourneyStep = (step: JourneyStep) => {
		if (step.log) {
			addCustomerTimelineTouchpoint(step.log);
		}

		if (step.view) {
			setCustomerView(step.view);
		}
	};

	const startReschedule = (appointment: UpcomingAppointment) => {
		setEditingAppointmentId(appointment.id);
		setPendingAppointmentDate(appointment.date);
	};

	const saveReschedule = (appointment: UpcomingAppointment) => {
		if (!pendingAppointmentDate) {
			return;
		}

		setAppointments(current =>
			current.map(item =>
				item.id === appointment.id ? { ...item, date: pendingAppointmentDate, status: 'Rescheduled' } : item
			)
		);

		addCustomerTimelineTouchpoint({
			type: 'consultation',
			channel: 'direct-message',
			title: `Consultation date changed with ${appointment.consultantName}`,
			detail: `Customer rescheduled ${appointment.specialty.toLowerCase()} to ${formatCalendarDate(pendingAppointmentDate)} at ${appointment.time}.`,
		});

		setEditingAppointmentId(null);
		setPendingAppointmentDate('');
	};

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
		<div className="tab3-react-shell">
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
						{unreadCount > 0 ? <span>{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
					</button>
					<p className="hero-note">{unreadCount > 0 ? `${unreadCount} new timeline updates` : 'No new updates'}</p>
				</div>
			</header>

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
											policyOptions: ['PRUShield + PRUExtra Plus'],
										});
										setCustomerView('chatbot');
									}}
								>
									Talk to AI
									<ChevronRight size={16} />
								</button>
								<button type="button" className="ghost" onClick={() => setCustomerView('journey')}>
									<Sparkles size={16} />
									Open Journey Flow
								</button>
							</article>

							<section className="timeline-feed" aria-label="Realtime timeline">
								{customerTimeline.map(item => (
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
								{customerTimeline.length === 0 ? <article className="panel"><p className="meta">No interactions yet. Start by using Talk to AI.</p></article> : null}
							</section>

							<article className="panel upcoming-panel">
								<div className="panel-head-inline">
									<h3>Upcoming Consultant Sessions</h3>
									<span className="score-pill">{appointments.length} booked</span>
								</div>
								<div className="appointment-list">
									{appointments.map(appointment => (
										<div className="appointment-card" key={appointment.id}>
											<div>
												<p className="meta strong">{appointment.consultantName}</p>
												<p className="meta">{appointment.specialty}</p>
												<p className="meta">{formatCalendarDate(appointment.date)} • {appointment.time} • {appointment.channel}</p>
											</div>
											<div className="appointment-actions">
												<span className={cx('tag', appointment.status === 'Rescheduled' && 'warn')}>{appointment.status}</span>
												{editingAppointmentId === appointment.id ? (
													<div className="reschedule-row">
														<input
															type="date"
															value={pendingAppointmentDate}
															onChange={event => setPendingAppointmentDate(event.target.value)}
														/>
														<button type="button" className="primary" onClick={() => saveReschedule(appointment)}>Save Date</button>
													</div>
												) : (
													<button type="button" className="ghost" onClick={() => startReschedule(appointment)}>Change Date</button>
												)}
											</div>
										</div>
									))}
								</div>
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

								<button
									type="button"
									className="primary full"
									onClick={() => {
										addCustomerTimelineTouchpoint({
											type: 'proposal',
											channel: 'direct-message',
											title: 'Customer reviewed current proposal',
											detail: 'Customer opened and reviewed the latest personalised proposal.',
											policyOptions: [currentProposal.plan],
										});
									}}
								>
									Sign & Accept Proposal
								</button>
							</article>
						</div>
					)}

					{customerView === 'journey' && (
						<div className="content-stack">
							<article className="panel journey-intro">
								<div>
									<p className="kicker">Proposal Journey</p>
									<h2>From Notification to Application</h2>
									<p>
										This view condenses the attached multi-screen flow into one guided path so the customer can move through alerts, meetings, analysis, and submission without leaving Tab 3.
									</p>
								</div>
								<button type="button" className="primary" onClick={() => setCustomerView('proposal')}>
									Open Proposal
									<ChevronRight size={16} />
								</button>
							</article>

							<div className="journey-grid">
								{journeySteps.map((step, index) => (
									<article className="journey-screen" key={step.id} style={{ ['--step-accent' as any]: step.accent }}>
										<div className="journey-screen-head">
											<span className="journey-index">{index + 1}</span>
											<span className="journey-label">{step.label}</span>
										</div>
										<h3>{step.title}</h3>
										<p>{step.detail}</p>
										<div className="journey-mock">
											<div className="journey-mock-topbar">
												<span />
												<span />
												<span />
											</div>
											<div className="journey-mock-body">
												<div className="journey-mock-card">
													<small>{step.label}</small>
													<strong>{step.title}</strong>
													<p>{step.detail}</p>
												</div>
												<div className="journey-mock-badge">{step.action ?? 'Open'}</div>
											</div>
										</div>
										<button type="button" className="ghost full" onClick={() => activateJourneyStep(step)}>
											{step.action ?? 'Open step'}
											<ChevronRight size={14} />
										</button>
									</article>
								))}
							</div>
						</div>
					)}

					{customerView === 'chatbot' && (
						<div className="content-stack">
							<div className="grid two">
								<article className="panel chat-panel">
									<div className="chat-head">
										<h3>AI Chatbot</h3>
										<p>Answer a few questions on needs, risk appetite, and life stage.</p>
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
											onClick={() => {
												addCustomerTimelineTouchpoint({
													type: 'aichat',
													channel: 'ai-chat',
													title: 'AI chat follow-up answered',
													detail: 'Customer resumed chat in Tab 2 to continue the same question thread.',
												});
												localStorage.setItem(
													'tab2_continue_prompt_v1',
													'Continue this question: Young family, two kids. I want stronger medical protection without premium shock. Refine recommendation based on deductible and co-payment options.'
												);
												window.location.assign('/tabs/tab2');
											}}
										>
											Continue with Questions
										</button>
										<button type="button" className="ghost">Attach Profile Inputs</button>
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

									<button type="button" className="primary full">Escalate to Consultant (Attach AI Session Summary)</button>
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
											{customerPolicies.map(policy => (
												<tr key={policy.id}>
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
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</article>
						</div>
					)}

					{customerView === 'policies' && (
						<div className="content-stack">
							<article className="panel">
								<h3>My Policies</h3>
								<div className="policy-list">
									{customerPolicies.map(policy => (
										<div className="policy-row" key={policy.id}>
											<div>
												<p className="meta strong">{policy.name}</p>
												<p className="meta">Renewal: {policy.renewal}</p>
											</div>
											<div className="policy-right">
												<span className="tag">{policy.coverage}</span>
												<strong>{policy.premium}</strong>
											</div>
										</div>
									))}
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
								<span className="status-badge">Purple Desk</span>
							</article>

							<div className="grid three">
								<article className="panel metric"><Users size={18} /><h3>36</h3><p>Active Clients</p></article>
								<article className="panel metric"><CalendarClock size={18} /><h3>11</h3><p>Pending Follow-ups</p></article>
								<article className="panel metric"><CircleCheck size={18} /><h3>24</h3><p>Recent Activity</p></article>
							</div>

							<article className="panel">
								<h3>Recent Client Interactions</h3>
								<div className="interaction-list">
									{clients.map(client => (
										<div className="interaction-row" key={client.id}>
											<div>
												<p className="meta strong">{client.name}</p>
												<p className="meta">Last contact: {client.lastInteraction}</p>
											</div>
											<span className={cx('tag', client.status === 'Pending' && 'warn')}>{client.status}</span>
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
										</button>
									))}
								</div>
							</article>
						</div>
					)}

					{consultantView === 'profile' && (
						<div className="content-stack">
							<article className="panel">
								<div className="profile-top">
									<div>
										<h3>{activeClient.name}</h3>
										<p className="meta">Age {activeClient.age} • {activeClient.contact}</p>
									</div>
									<button type="button" className="ghost">
										<FileText size={15} />
										View Full AI Session Summary
									</button>
								</div>

								<div className="chip-row">
									{activeClient.preferences.map(pref => (
										<span key={pref} className="tag">{pref}</span>
									))}
								</div>
							</article>

							<article className="panel">
								<h3>Unified Interaction Timeline</h3>
								<div className="timeline">
									{consultantTimeline.map(item => (
										<div className="timeline-row" key={item.id}>
											<span>{relativeTime(item.createdAt)}</span>
											<div>
												<p className="meta strong">{eventTagLabel[item.type]} via {item.channel}</p>
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
									<h3>Coverage Radar</h3>
									<div className="chart-box">
										<ResponsiveContainer width="100%" height={270}>
											<RadarChart data={radarData}>
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
								<h3>Gap Analysis</h3>
								<div className="gap-list">
									<div><span>Disability protection under target by 34%</span><button type="button">Recommend</button></div>
									<div><span>Critical illness early-stage buffer below benchmark</span><button type="button">Recommend</button></div>
									<div><span>Savings protection ratio below family threshold</span><button type="button">Recommend</button></div>
								</div>
							</article>
						</div>
					)}

					{consultantView === 'recommendations' && (
						<div className="content-stack">
							{recommendations.map(item => (
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

									<button type="button" className="primary">
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
