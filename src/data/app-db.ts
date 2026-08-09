export type UserRole = 'customer' | 'consultant';

export type TimelineChannel = 'ai-chat' | 'email' | 'direct-message' | 'call' | 'meeting' | 'system';
export type TimelineType = 'aichat' | 'consultation' | 'proposal' | 'document' | 'email' | 'direct-message';

export interface UserRecord {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  password: string;
  lifeStage?: string;
  riskAppetite?: 'low' | 'medium' | 'high';
  monthlyIncome?: string;
  employmentStatus?: string;
  dependents?: number;
  financialPriorities?: string[];
  planningHorizon?: string;
  preferredContact?: 'chat' | 'email' | 'phone';
  monthlyBudget?: number;
  hasExistingInsurance?: boolean;
  createdAt: string;
  hasSeenOnboarding?: boolean;
}

export interface SessionRecord {
  userId: string;
  loggedInAt: string;
}

export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  blocks?: unknown;
  compareCard?: unknown;
}

export interface TimelineRecord {
  id: string;
  customerId: string;
  consultantId?: string;
  type: TimelineType;
  channel: TimelineChannel;
  title: string;
  detail: string;
  policyOptions?: string[];
  createdAt: string;
  readBy: string[];
}

export interface MeetingRecord {
  id: string;
  customerId: string;
  consultantId: string;
  consultantName: string;
  consultantTitle: string;
  specialty: string;
  date: string;
  time: string;
  channel: string;
  status: 'confirmed' | 'change-pending';
  updatedAt: string;
}

export interface MeetingChangeRequestRecord {
  id: string;
  meetingId: string;
  customerId: string;
  consultantId: string;
  proposedDate: string;
  proposedTime: string;
  proposedSlots?: Array<{ date: string; time: string }>;
  reason: string;
  guidanceOptions: string[];
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  resolvedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface ProposalAcceptanceRecord {
  id: string;
  customerId: string;
  consultantId: string;
  policyName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  resolvedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

const DB_KEY = 'bipj_local_db_v1';
const SESSION_KEY = 'bipj_local_session_v1';
const CHAT_RESET_KEY = 'bipj_chat_reset_fresh_2026_08_06_v1';

interface LocalDatabase {
  users: UserRecord[];
  timeline: TimelineRecord[];
  meetings: MeetingRecord[];
  meetingChanges: MeetingChangeRequestRecord[];
  proposalAcceptances: ProposalAcceptanceRecord[];
  chatHistory: Record<string, ChatHistoryEntry[]>;
}

const seedUsers: UserRecord[] = [
  {
    id: 'u-customer-demo',
    role: 'customer',
    name: 'Orange Tan',
    email: 'customer@demo.com',
    password: '123456',
    lifeStage: 'Young Family',
    riskAppetite: 'medium',
    monthlyIncome: 'S$6,000 - S$10,000',
    employmentStatus: 'Employed',
    dependents: 2,
    financialPriorities: ['Medical protection', 'Family protection'],
    planningHorizon: '10+ years',
    preferredContact: 'chat',
    createdAt: new Date('2026-07-01T09:00:00.000Z').toISOString()
  },
  {
    id: 'u-consultant-demo',
    role: 'consultant',
    name: 'Subhash Raj',
    email: 'consultant@demo.com',
    password: '123456',
    createdAt: new Date('2026-07-01T09:00:00.000Z').toISOString()
  }
];

const seedTimeline: TimelineRecord[] = [
  {
    id: 't-seed-1',
    customerId: 'u-customer-demo',
    consultantId: 'u-consultant-demo',
    type: 'aichat',
    channel: 'ai-chat',
    title: 'Health Coverage Review',
    detail: 'AI identified outpatient and specialist claim gaps and suggested optimisation options.',
    policyOptions: ['PRUShield + PRUExtra Plus'],
    createdAt: new Date('2026-07-18T14:30:00.000Z').toISOString(),
    readBy: ['u-customer-demo']
  },
  {
    id: 't-seed-2',
    customerId: 'u-customer-demo',
    consultantId: 'u-consultant-demo',
    type: 'direct-message',
    channel: 'direct-message',
    title: 'Direct Message Follow-up',
    detail: 'Customer asked for deductible comparison and rider implications before next meeting.',
    policyOptions: ['PRUShield + PRUExtra', 'PRUActive Life V'],
    createdAt: new Date('2026-07-18T16:10:00.000Z').toISOString(),
    readBy: ['u-customer-demo']
  },
  {
    id: 't-seed-3',
    customerId: 'u-customer-demo',
    consultantId: 'u-consultant-demo',
    type: 'consultation',
    channel: 'meeting',
    title: 'In-person Consultation Completed',
    detail: 'Finalised life-stage profile and adjusted long-term savings targets for next decade.',
    policyOptions: ['PRUActive Saver III'],
    createdAt: new Date('2026-07-17T09:40:00.000Z').toISOString(),
    readBy: ['u-customer-demo', 'u-consultant-demo']
  },
  {
    id: 't-seed-4',
    customerId: 'u-customer-demo',
    consultantId: 'u-consultant-demo',
    type: 'proposal',
    channel: 'email',
    title: 'Enhanced HealthShield Proposal Sent',
    detail: 'Proposal emailed with side-by-side comparison based on latest chat and consultation.',
    policyOptions: ['PRUShield + PRUExtra Plus', 'PRUActive Life V'],
    createdAt: new Date('2026-07-16T12:00:00.000Z').toISOString(),
    readBy: ['u-consultant-demo']
  },
  {
    id: 't-seed-5',
    customerId: 'u-customer-demo',
    consultantId: 'u-consultant-demo',
    type: 'document',
    channel: 'system',
    title: 'Annual Coverage Summary Generated',
    detail: 'System generated annual summary for policy stack and recommendation history.',
    policyOptions: ['Coverage Summary 2025'],
    createdAt: new Date('2026-07-15T08:00:00.000Z').toISOString(),
    readBy: ['u-customer-demo']
  }
];

const seedMeetings: MeetingRecord[] = [
  {
    id: 'm-seed-1',
    customerId: 'u-customer-demo',
    consultantId: 'u-consultant-demo',
    consultantName: 'Subhash Raj',
    consultantTitle: 'Senior Protection Consultant',
    specialty: 'Health Protection Review',
    date: '2026-07-25',
    time: '15:00',
    channel: 'Video consultation',
    status: 'confirmed',
    updatedAt: new Date('2026-07-20T10:00:00.000Z').toISOString()
  }
];

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveDatabase(db: LocalDatabase): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent('bipj-data-changed'));
}

function getDatabase(): LocalDatabase {
  initDatabase();
  const db = safeParse<Partial<LocalDatabase>>(localStorage.getItem(DB_KEY), {});

  let chatHistory = db.chatHistory && typeof db.chatHistory === 'object' && !Array.isArray(db.chatHistory)
    ? db.chatHistory
    : {};

  if (!localStorage.getItem(CHAT_RESET_KEY)) {
    chatHistory = {};
    localStorage.setItem(DB_KEY, JSON.stringify({ ...db, chatHistory }));
    localStorage.setItem(CHAT_RESET_KEY, 'done');
  }

  return {
    users: Array.isArray(db.users) ? db.users : [],
    timeline: Array.isArray(db.timeline) ? db.timeline : [],
    meetings: Array.isArray(db.meetings) ? db.meetings : [],
    meetingChanges: Array.isArray(db.meetingChanges) ? db.meetingChanges : [],
    proposalAcceptances: Array.isArray(db.proposalAcceptances) ? db.proposalAcceptances : [],
    chatHistory,
  };
}

export function initDatabase(): void {
  const db = safeParse<Partial<LocalDatabase> | null>(localStorage.getItem(DB_KEY), null);

  if (!db || !Array.isArray(db.users)) {
    saveDatabase({
      users: [...seedUsers],
      timeline: [...seedTimeline],
      meetings: [...seedMeetings],
      meetingChanges: [],
      proposalAcceptances: [],
      chatHistory: {}
    });
    return;
  }

  const timeline = Array.isArray(db.timeline) && db.timeline.length > 0 ? db.timeline : [...seedTimeline];
  const meetings = Array.isArray(db.meetings) && db.meetings.length > 0 ? db.meetings : [...seedMeetings];
  const meetingChanges = Array.isArray(db.meetingChanges) ? db.meetingChanges : [];
  const proposalAcceptances = Array.isArray(db.proposalAcceptances) ? db.proposalAcceptances : [];
  const chatHistory = db.chatHistory && typeof db.chatHistory === 'object' && !Array.isArray(db.chatHistory)
    ? db.chatHistory
    : {};

  saveDatabase({ users: db.users, timeline, meetings, meetingChanges, proposalAcceptances, chatHistory });
}

export function getUsers(): UserRecord[] {
  const db = getDatabase();
  return db.users;
}

export function getCustomers(): UserRecord[] {
  return getUsers().filter(user => user.role === 'customer');
}

export function registerUser(input: {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  lifeStage?: string;
  riskAppetite?: 'low' | 'medium' | 'high';
  monthlyIncome?: string;
  employmentStatus?: string;
  dependents?: number;
  financialPriorities?: string[];
  planningHorizon?: string;
  preferredContact?: 'chat' | 'email' | 'phone';
}): { ok: true; user: UserRecord } | { ok: false; message: string } {
  const users = getUsers();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (users.some(user => user.email.toLowerCase() === normalizedEmail)) {
    return { ok: false, message: 'An account with this email already exists.' };
  }

  const user: UserRecord = {
    id: `u-${Date.now()}`,
    role: input.role,
    name: input.name.trim(),
    email: normalizedEmail,
    password: input.password,
    lifeStage: input.lifeStage,
    riskAppetite: input.riskAppetite,
    monthlyIncome: input.monthlyIncome,
    employmentStatus: input.employmentStatus,
    dependents: input.dependents,
    financialPriorities: input.financialPriorities,
    planningHorizon: input.planningHorizon,
    preferredContact: input.preferredContact,
    createdAt: new Date().toISOString()
  };

  const db = getDatabase();
  saveDatabase({ ...db, users: [...users, user] });
  return { ok: true, user };
}

export function getUserById(userId: string): UserRecord | null {
  return getUsers().find(user => user.id === userId) ?? null;
}

export function markOnboardingSeen(userId: string): void {
  const db = getDatabase();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex >= 0) {
    db.users[userIndex].hasSeenOnboarding = true;
    saveDatabase(db);
  }
}

export function getTimelineEvents(): TimelineRecord[] {
  return [...getDatabase().timeline].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTimelineEventsForUser(user: UserRecord, customerId?: string): TimelineRecord[] {
  const events = getTimelineEvents();

  if (user.role === 'customer') {
    return events.filter(event => event.customerId === user.id);
  }

  if (customerId) {
    return events.filter(event => event.customerId === customerId);
  }

  return events;
}

export function addTimelineEvent(input: {
  customerId: string;
  consultantId?: string;
  type: TimelineType;
  channel: TimelineChannel;
  title: string;
  detail: string;
  policyOptions?: string[];
  readBy?: string[];
}): TimelineRecord {
  const db = getDatabase();

  const event: TimelineRecord = {
    id: `t-${Date.now()}`,
    customerId: input.customerId,
    consultantId: input.consultantId,
    type: input.type,
    channel: input.channel,
    title: input.title,
    detail: input.detail,
    policyOptions: input.policyOptions,
    createdAt: new Date().toISOString(),
    readBy: input.readBy ?? [],
  };

  saveDatabase({ ...db, timeline: [event, ...db.timeline] });
  return event;
}

export function getMeetingsForUser(user: UserRecord): MeetingRecord[] {
  const meetings = [...getDatabase().meetings];

  if (user.role === 'customer') {
    return meetings
      .filter(meeting => meeting.customerId === user.id)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  }

  return meetings
    .filter(meeting => meeting.consultantId === user.id)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export function recordMeetingBooking(input: {
  customerId: string;
  consultantName: string;
  consultantTitle: string;
  date: string;
  time: string;
  channel: string;
  policyName?: string;
}): MeetingRecord {
  const db = getDatabase();
  const consultant = db.users.find(user =>
    user.role === 'consultant' && user.name.toLowerCase() === input.consultantName.toLowerCase()
  );
  const consultantId = consultant?.id ?? 'u-consultant-demo';
  const now = new Date().toISOString();
  const uniqueId = Date.now();

  const meeting: MeetingRecord = {
    id: `m-${uniqueId}`,
    customerId: input.customerId,
    consultantId,
    consultantName: input.consultantName,
    consultantTitle: input.consultantTitle,
    specialty: input.policyName ? `Review of ${input.policyName}` : 'Insurance planning consultation',
    date: input.date,
    time: input.time,
    channel: input.channel,
    status: 'confirmed',
    updatedAt: now,
  };

  const timelineEvent: TimelineRecord = {
    id: `t-${uniqueId}`,
    customerId: input.customerId,
    consultantId,
    type: 'consultation',
    channel: 'meeting',
    title: 'Consultant meeting booked',
    detail: `Meeting with ${input.consultantName} confirmed for ${input.date} at ${input.time}.`,
    policyOptions: input.policyName ? [input.policyName] : undefined,
    createdAt: now,
    readBy: [input.customerId],
  };

  saveDatabase({
    ...db,
    meetings: [meeting, ...db.meetings],
    timeline: [timelineEvent, ...db.timeline],
  });
  return meeting;
}

export function getMeetingChangeRequestsForCustomer(customerId: string): MeetingChangeRequestRecord[] {
  return [...getDatabase().meetingChanges]
    .filter(request => request.customerId === customerId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function getPendingMeetingChangesForConsultant(consultantId: string): MeetingChangeRequestRecord[] {
  const pending = [...getDatabase().meetingChanges]
    .filter(request => request.status === 'pending');

  const consultantScoped = pending.filter(request => request.consultantId === consultantId);
  if (consultantScoped.length > 0) {
    return consultantScoped.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  // Fallback for demo/single-consultant sessions where historical records may carry a stale consultant id.
  return pending.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function requestMeetingChange(input: {
  meetingId: string;
  customerId: string;
  proposedDate: string;
  proposedTime: string;
  proposedSlots?: Array<{ date: string; time: string }>;
  reason: string;
  guidanceOptions: string[];
}): { ok: true; request: MeetingChangeRequestRecord } | { ok: false; message: string } {
  const db = getDatabase();
  const slots = (input.proposedSlots ?? [{ date: input.proposedDate, time: input.proposedTime }])
    .map(slot => ({ date: slot.date.trim(), time: slot.time.trim() }))
    .filter(slot => slot.date.length > 0 && slot.time.length > 0);

  if (slots.length === 0) {
    return { ok: false, message: 'Select at least one proposed date and time.' };
  }

  const primarySlot = slots[0];
  const selectedGuidance = input.guidanceOptions
    .map(option => option.trim())
    .filter(option => option.length > 0);

  if (selectedGuidance.length === 0) {
    return { ok: false, message: 'Select at least one guiding option so consultant can review context.' };
  }

  const meeting = db.meetings.find(record => record.id === input.meetingId && record.customerId === input.customerId);

  if (!meeting) {
    return { ok: false, message: 'Meeting not found for this customer.' };
  }

  const existingPending = db.meetingChanges.find(request => request.meetingId === input.meetingId && request.status === 'pending');
  if (existingPending) {
    return { ok: false, message: 'A meeting change is already pending consultant approval.' };
  }

  const request: MeetingChangeRequestRecord = {
    id: `mc-${Date.now()}`,
    meetingId: meeting.id,
    customerId: input.customerId,
    consultantId: meeting.consultantId,
    proposedDate: primarySlot.date,
    proposedTime: primarySlot.time,
    proposedSlots: slots,
    reason: input.reason.trim(),
    guidanceOptions: selectedGuidance,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  const meetings: MeetingRecord[] = db.meetings.map(record =>
    record.id === meeting.id
      ? { ...record, status: 'change-pending' as const, updatedAt: new Date().toISOString() }
      : record
  );

  const customer = getUserById(input.customerId);
  const timelineEvent: TimelineRecord = {
    id: `t-${Date.now() + 1}`,
    customerId: input.customerId,
    consultantId: meeting.consultantId,
    type: 'consultation',
    channel: 'meeting',
    title: 'Meeting change request submitted',
    detail: `${customer?.name ?? 'Customer'} requested ${slots.map(slot => `${slot.date} ${slot.time}`).join(' / ')}. Reason: ${input.reason.trim()}.`,
    policyOptions: selectedGuidance,
    createdAt: new Date().toISOString(),
    readBy: [input.customerId],
  };

  saveDatabase({
    ...db,
    meetings,
    meetingChanges: [request, ...db.meetingChanges],
    timeline: [timelineEvent, ...db.timeline]
  });

  return { ok: true, request };
}

export function approveMeetingChange(requestId: string, consultantId: string): { ok: true; request: MeetingChangeRequestRecord } | { ok: false; message: string } {
  const db = getDatabase();
  const request = db.meetingChanges.find(record => record.id === requestId);
  const actingUser = getUserById(consultantId);
  const canActAsConsultant = !!actingUser && actingUser.role === 'consultant';

  if (!request || !canActAsConsultant) {
    return { ok: false, message: 'Meeting change request not found for this consultant.' };
  }

  if (request.status !== 'pending') {
    return { ok: false, message: 'This meeting change has already been processed.' };
  }

  const meeting = db.meetings.find(record => record.id === request.meetingId);
  if (!meeting) {
    return { ok: false, message: 'Original meeting could not be found.' };
  }

  const approvedRequest: MeetingChangeRequestRecord = {
    ...request,
    status: 'approved',
    reviewedBy: consultantId,
    resolvedAt: new Date().toISOString(),
  };

  const meetings: MeetingRecord[] = db.meetings.map(record =>
    record.id === meeting.id
      ? {
          ...record,
          date: request.proposedDate,
          time: request.proposedTime,
          status: 'confirmed' as const,
          updatedAt: new Date().toISOString()
        }
      : record
  );

  const meetingChanges = db.meetingChanges.map(record => record.id === requestId ? approvedRequest : record);
  const consultant = getUserById(consultantId);
  const timelineEvent: TimelineRecord = {
    id: `t-${Date.now() + 2}`,
    customerId: request.customerId,
    consultantId,
    type: 'consultation',
    channel: 'meeting',
    title: 'Meeting change approved',
    detail: `${consultant?.name ?? 'Consultant'} approved the new slot for ${request.proposedDate} at ${request.proposedTime}.`,
    policyOptions: request.guidanceOptions,
    createdAt: new Date().toISOString(),
    readBy: [consultantId],
  };

  saveDatabase({
    ...db,
    meetings,
    meetingChanges,
    timeline: [timelineEvent, ...db.timeline]
  });

  return { ok: true, request: approvedRequest };
}

export function rejectMeetingChange(input: {
  requestId: string;
  consultantId: string;
  rejectionReason?: string;
}): { ok: true; request: MeetingChangeRequestRecord } | { ok: false; message: string } {
  const db = getDatabase();
  const request = db.meetingChanges.find(record => record.id === input.requestId);
  const actingUser = getUserById(input.consultantId);
  const canActAsConsultant = !!actingUser && actingUser.role === 'consultant';

  if (!request || !canActAsConsultant) {
    return { ok: false, message: 'Meeting change request not found for this consultant.' };
  }

  if (request.status !== 'pending') {
    return { ok: false, message: 'This meeting change has already been processed.' };
  }

  const meeting = db.meetings.find(record => record.id === request.meetingId);
  if (!meeting) {
    return { ok: false, message: 'Original meeting could not be found.' };
  }

  const rejectedRequest: MeetingChangeRequestRecord = {
    ...request,
    status: 'rejected',
    reviewedBy: input.consultantId,
    rejectionReason: input.rejectionReason?.trim() || 'Consultant kept the original slot.',
    resolvedAt: new Date().toISOString(),
  };

  const meetings: MeetingRecord[] = db.meetings.map(record =>
    record.id === meeting.id
      ? { ...record, status: 'confirmed' as const, updatedAt: new Date().toISOString() }
      : record
  );

  const meetingChanges = db.meetingChanges.map(record => record.id === input.requestId ? rejectedRequest : record);
  const consultant = getUserById(input.consultantId);
  const timelineEvent: TimelineRecord = {
    id: `t-${Date.now() + 3}`,
    customerId: request.customerId,
    consultantId: input.consultantId,
    type: 'consultation',
    channel: 'meeting',
    title: 'Meeting change rejected',
    detail: `${consultant?.name ?? 'Consultant'} rejected the requested slot for ${request.proposedDate} at ${request.proposedTime}. ${rejectedRequest.rejectionReason}`,
    policyOptions: request.guidanceOptions,
    createdAt: new Date().toISOString(),
    readBy: [input.consultantId],
  };

  saveDatabase({
    ...db,
    meetings,
    meetingChanges,
    timeline: [timelineEvent, ...db.timeline]
  });

  return { ok: true, request: rejectedRequest };
}

export function markTimelineRead(userId: string, eventIds?: string[]): void {
  const db = getDatabase();
  const idSet = eventIds ? new Set(eventIds) : null;

  const timeline = db.timeline.map(event => {
    if (idSet && !idSet.has(event.id)) {
      return event;
    }

    if (event.readBy.includes(userId)) {
      return event;
    }

    return { ...event, readBy: [...event.readBy, userId] };
  });

  saveDatabase({ ...db, timeline });
}

export function getUnreadTimelineCountForUser(user: UserRecord, customerId?: string): number {
  const events = getTimelineEventsForUser(user, customerId);
  return events.filter(event => !event.readBy.includes(user.id)).length;
}

export function getProposalAcceptanceRequestsForCustomer(customerId: string): ProposalAcceptanceRecord[] {
  return [...getDatabase().proposalAcceptances]
    .filter(request => request.customerId === customerId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function getPendingProposalAcceptancesForConsultant(consultantId: string): ProposalAcceptanceRecord[] {
  const pending = [...getDatabase().proposalAcceptances]
    .filter(request => request.status === 'pending');

  const consultantScoped = pending.filter(request => request.consultantId === consultantId);
  if (consultantScoped.length > 0) {
    return consultantScoped.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  return pending.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function requestProposalAcceptance(input: {
  customerId: string;
  policyName: string;
  consultantId?: string;
}): { ok: true; request: ProposalAcceptanceRecord } | { ok: false; message: string } {
  const db = getDatabase();
  const policyName = input.policyName.trim();

  if (!policyName) {
    return { ok: false, message: 'Policy name is required before sending acceptance.' };
  }

  const meetingConsultantId = db.meetings.find(meeting => meeting.customerId === input.customerId)?.consultantId;
  const consultantId = input.consultantId ?? meetingConsultantId ?? 'u-consultant-demo';

  const existingPending = db.proposalAcceptances.find(request =>
    request.customerId === input.customerId &&
    request.policyName.toLowerCase() === policyName.toLowerCase() &&
    request.status === 'pending'
  );

  if (existingPending) {
    return { ok: false, message: 'This proposal is already pending consultant approval.' };
  }

  const request: ProposalAcceptanceRecord = {
    id: `pa-${Date.now()}`,
    customerId: input.customerId,
    consultantId,
    policyName,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  const customer = getUserById(input.customerId);
  const timelineEvent: TimelineRecord = {
    id: `t-${Date.now() + 4}`,
    customerId: input.customerId,
    consultantId,
    type: 'proposal',
    channel: 'direct-message',
    title: 'Proposal acceptance sent for consultant approval',
    detail: `${customer?.name ?? 'Customer'} signed and accepted ${policyName}. Waiting for consultant approval.`,
    policyOptions: [policyName],
    createdAt: new Date().toISOString(),
    readBy: [input.customerId],
  };

  saveDatabase({
    ...db,
    proposalAcceptances: [request, ...db.proposalAcceptances],
    timeline: [timelineEvent, ...db.timeline],
  });

  return { ok: true, request };
}

export function approveProposalAcceptance(requestId: string, consultantId: string): { ok: true; request: ProposalAcceptanceRecord } | { ok: false; message: string } {
  const db = getDatabase();
  const request = db.proposalAcceptances.find(record => record.id === requestId);
  const actingUser = getUserById(consultantId);
  const canActAsConsultant = !!actingUser && actingUser.role === 'consultant';

  if (!request || !canActAsConsultant) {
    return { ok: false, message: 'Proposal acceptance request not found for this consultant.' };
  }

  if (request.status !== 'pending') {
    return { ok: false, message: 'This proposal acceptance has already been processed.' };
  }

  const approvedRequest: ProposalAcceptanceRecord = {
    ...request,
    status: 'approved',
    reviewedBy: consultantId,
    resolvedAt: new Date().toISOString(),
  };

  const proposalAcceptances = db.proposalAcceptances.map(record => record.id === requestId ? approvedRequest : record);
  const consultant = getUserById(consultantId);
  const timelineEvent: TimelineRecord = {
    id: `t-${Date.now() + 5}`,
    customerId: request.customerId,
    consultantId,
    type: 'proposal',
    channel: 'direct-message',
    title: 'Proposal accepted and approved',
    detail: `${consultant?.name ?? 'Consultant'} approved ${request.policyName} for final processing.`,
    policyOptions: [request.policyName],
    createdAt: new Date().toISOString(),
    readBy: [consultantId],
  };

  saveDatabase({
    ...db,
    proposalAcceptances,
    timeline: [timelineEvent, ...db.timeline],
  });

  return { ok: true, request: approvedRequest };
}

export function rejectProposalAcceptance(input: {
  requestId: string;
  consultantId: string;
  rejectionReason?: string;
}): { ok: true; request: ProposalAcceptanceRecord } | { ok: false; message: string } {
  const db = getDatabase();
  const request = db.proposalAcceptances.find(record => record.id === input.requestId);
  const actingUser = getUserById(input.consultantId);
  const canActAsConsultant = !!actingUser && actingUser.role === 'consultant';

  if (!request || !canActAsConsultant) {
    return { ok: false, message: 'Proposal acceptance request not found for this consultant.' };
  }

  if (request.status !== 'pending') {
    return { ok: false, message: 'This proposal acceptance has already been processed.' };
  }

  const rejectedRequest: ProposalAcceptanceRecord = {
    ...request,
    status: 'rejected',
    reviewedBy: input.consultantId,
    rejectionReason: input.rejectionReason?.trim() || 'Consultant requested updates before final acceptance.',
    resolvedAt: new Date().toISOString(),
  };

  const proposalAcceptances = db.proposalAcceptances.map(record => record.id === input.requestId ? rejectedRequest : record);
  const consultant = getUserById(input.consultantId);
  const timelineEvent: TimelineRecord = {
    id: `t-${Date.now() + 6}`,
    customerId: request.customerId,
    consultantId: input.consultantId,
    type: 'proposal',
    channel: 'direct-message',
    title: 'Proposal acceptance rejected',
    detail: `${consultant?.name ?? 'Consultant'} rejected ${request.policyName}. ${rejectedRequest.rejectionReason}`,
    policyOptions: [request.policyName],
    createdAt: new Date().toISOString(),
    readBy: [input.consultantId],
  };

  saveDatabase({
    ...db,
    proposalAcceptances,
    timeline: [timelineEvent, ...db.timeline],
  });

  return { ok: true, request: rejectedRequest };
}

export function getChatHistory(userId?: string): ChatHistoryEntry[] {
  const key = userId ?? 'guest';
  return getDatabase().chatHistory[key] ?? [];
}

export function saveChatHistory(userId: string | undefined, messages: ChatHistoryEntry[]): void {
  const key = userId ?? 'guest';
  const db = getDatabase();
  saveDatabase({
    ...db,
    chatHistory: {
      ...db.chatHistory,
      [key]: messages,
    }
  });
}

export function clearChatHistory(userId?: string): void {
  const key = userId ?? 'guest';
  const db = getDatabase();
  const chatHistory = { ...db.chatHistory };
  delete chatHistory[key];
  saveDatabase({ ...db, chatHistory });
}

export function loginUser(email: string, password: string): { ok: true; user: UserRecord } | { ok: false; message: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getUsers().find(record => record.email.toLowerCase() === normalizedEmail && record.password === password);

  if (!user) {
    return { ok: false, message: 'Invalid email or password.' };
  }

  const session: SessionRecord = {
    userId: user.id,
    loggedInAt: new Date().toISOString()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user };
}

/**
 * Mirrors an already-authenticated app user into the local workspace session.
 * Tab 3 stores its activity data locally, but authentication is handled by
 * Firebase. Keeping the local session in sync avoids asking the user to log in
 * a second time when they open the workspace.
 */
export function establishLocalSession(email: string, name?: string): UserRecord {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDatabase();
  let localUser = db.users.find(user => user.email.toLowerCase() === normalizedEmail);

  if (!localUser) {
    localUser = {
      id: `u-customer-${Date.now()}`,
      role: 'customer',
      name: name?.trim() || normalizedEmail.split('@')[0] || 'Customer',
      email: normalizedEmail,
      password: '',
      createdAt: new Date().toISOString(),
    };
    saveDatabase({ ...db, users: [...db.users, localUser] });
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify({
    userId: localUser.id,
    loggedInAt: new Date().toISOString(),
  } satisfies SessionRecord));

  return localUser;
}

export function updateCurrentLocalUserProfile(input: {
  name?: string;
  monthlyIncome?: number;
  financialPriorities?: string[];
  monthlyBudget?: number;
  hasExistingInsurance?: boolean;
}): UserRecord | null {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const db = getDatabase();
  const updatedUser: UserRecord = {
    ...currentUser,
    name: input.name?.trim() || currentUser.name,
    monthlyIncome: input.monthlyIncome != null ? `S$${input.monthlyIncome.toLocaleString()}` : currentUser.monthlyIncome,
    financialPriorities: input.financialPriorities ?? currentUser.financialPriorities,
    monthlyBudget: input.monthlyBudget ?? currentUser.monthlyBudget,
    hasExistingInsurance: input.hasExistingInsurance ?? currentUser.hasExistingInsurance,
  };

  saveDatabase({
    ...db,
    users: db.users.map(user => user.id === currentUser.id ? updatedUser : user),
  });
  return updatedUser;
}

export function getCurrentUser(): UserRecord | null {
  initDatabase();
  const session = safeParse<SessionRecord | null>(localStorage.getItem(SESSION_KEY), null);
  if (!session) return null;

  return getUsers().find(user => user.id === session.userId) ?? null;
}

export function logoutUser(): void {
  localStorage.removeItem(SESSION_KEY);
}
