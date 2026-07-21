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
  createdAt: string;
}

export interface SessionRecord {
  userId: string;
  loggedInAt: string;
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

const DB_KEY = 'bipj_local_db_v1';
const SESSION_KEY = 'bipj_local_session_v1';

interface LocalDatabase {
  users: UserRecord[];
  timeline: TimelineRecord[];
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
}

function getDatabase(): LocalDatabase {
  initDatabase();
  const db = safeParse<LocalDatabase>(localStorage.getItem(DB_KEY), { users: [], timeline: [] });
  return {
    users: Array.isArray(db.users) ? db.users : [],
    timeline: Array.isArray(db.timeline) ? db.timeline : [],
  };
}

export function initDatabase(): void {
  const db = safeParse<Partial<LocalDatabase> | null>(localStorage.getItem(DB_KEY), null);

  if (!db || !Array.isArray(db.users)) {
    saveDatabase({ users: [...seedUsers], timeline: [...seedTimeline] });
    return;
  }

  const timeline = Array.isArray(db.timeline) && db.timeline.length > 0 ? db.timeline : [...seedTimeline];
  saveDatabase({ users: db.users, timeline });
}

export function getUsers(): UserRecord[] {
  const db = getDatabase();
  return db.users;
}

export function registerUser(input: {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  lifeStage?: string;
  riskAppetite?: 'low' | 'medium' | 'high';
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
    createdAt: new Date().toISOString()
  };

  const db = getDatabase();
  saveDatabase({ users: [...users, user], timeline: db.timeline });
  return { ok: true, user };
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

export function getCurrentUser(): UserRecord | null {
  initDatabase();
  const session = safeParse<SessionRecord | null>(localStorage.getItem(SESSION_KEY), null);
  if (!session) return null;

  return getUsers().find(user => user.id === session.userId) ?? null;
}

export function logoutUser(): void {
  localStorage.removeItem(SESSION_KEY);
}
