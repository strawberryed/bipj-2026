# TAB 3 VISUAL ARCHITECTURE GUIDE
## High-Level System Design

---

## 1. ROLE-BASED DUAL VIEW PATTERN

```
┌─────────────────────────────────────────────────────────────┐
│                    Tab 3 Component Entry                     │
│                  (Tab3ReactApp Function)                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
                    getCurrentUser()
                           │
                    ┌──────┴──────┐
                    │             │
                    ↓             ↓
            role = 'customer'  role = 'consultant'
                    │             │
        ┌───────────┴──────┐      └────────────────────┐
        ↓                  ↓                           ↓
    [5 Views]         [5 Views]                  [Dashboard]
    - home             - dashboard
    - chatbot          - clients
    - proposal         - profile ← CLIENT DEEP-DIVE
    - compare          - analytics ← PERSONALIZED DATA
    - policies         - recommendations ← ALGORITHM

    Timeline           Client List              Approvals Queue
    Filtering          Status Calc              Analysis Engine
    AI Integration     Timeline                 Recommendation
```

---

## 2. STATE MANAGEMENT LAYERS

```
┌─────────────────────────────────────────────────────────┐
│            STATE MANAGEMENT HIERARCHY                    │
└─────────────────────────────────────────────────────────┘

LAYER 1: SESSION STATE
├─ activeUser: UserRecord | null        ← getCurrentUser()
├─ role: 'customer' | 'consultant'      ← Derived from activeUser
└─ [Refreshed every 1.5s via polling]

LAYER 2: VIEW NAVIGATION STATE
├─ customerView: 'home' | 'chatbot' | ... 
├─ consultantView: 'dashboard' | 'clients' | ...
└─ [Independent navigation per role]

LAYER 3: FILTER PREFERENCES
├─ selectedTimelineFilters: TimelineType[]
│  └─ [Customer's personal filter state]
├─ selectedConsultantTimelineFilters: TimelineType[]
│  └─ [Consultant's filter state]
└─ [Applied in real-time via useMemo]

LAYER 4: DATA STATE (Fetched from DB)
├─ timelineItems: TimelineRecord[]
├─ meetings: MeetingRecord[]
├─ customerRequests: MeetingChangeRequestRecord[]
├─ consultantPendingRequests: MeetingChangeRequestRecord[]
├─ customerProposalRequests: ProposalAcceptanceRecord[]
└─ consultantPendingProposalRequests: ProposalAcceptanceRecord[]

LAYER 5: INTERACTION STATE
├─ meetingForm: { meetingId, proposedSlots[], reason, guidanceOptions[] }
│  └─ [Auto-saved to localStorage via useEffect]
├─ selectedClientId: string
├─ changingMeetingId: string | null
└─ selectedPolicyId: string

LAYER 6: UI STATE
├─ notificationsOpen: boolean
├─ profileMenuOpen: boolean
├─ consultantMenuOpen: boolean
├─ portalMessage: string
└─ [Visual toggles and messages]
```

---

## 3. DATA FLOW: CUSTOMER WORKFLOW

```
CUSTOMER LOGIN
    ↓
[ONBOARDING - First-time only]
    ├─ Recommended Plans (buildRecommendedPlans from profile)
    ├─ Recommended Consultant (buildRecommendedConsultant from risk)
    └─ markOnboardingSeen(userId) → hasSeenOnboarding = true
    ↓
TAB 3: HOME VIEW
    ├─ Timeline Filters (AI Chat | Consultation | Proposal)
    ├─ customerTimeline = useMemo(() => {
    │   return timelineItems.filter(
    │     item => item.customerId === activeUser.id && 
    │              selectedTimelineFilters.includes(item.type)
    │   )
    │ })
    └─ Display 4 items (lazy load)
    ↓
CUSTOMER INTERACTIONS:
    
    [AI Chat Interaction]
    ├─ Clicks "AI Chatbot" button
    ├─ Seed prompt saved to localStorage
    ├─ Navigate to /tabs/chatbot
    ├─ addCustomerTimelineTouchpoint({
    │   type: 'aichat',
    │   channel: 'ai-chat',
    │   title: 'AI conversation opened',
    │   detail: seedPrompt
    │ })
    └─ Timeline updated: "AI Chat" event appears
    
    [Proposal Review]
    ├─ Customer views Current Proposal tab
    ├─ currentProposal = createCustomerProposal(
    │   activeUser, personalizedPolicies
    │ )
    ├─ Displays personalized plan with premium & coverage
    ├─ Button: "Ask AI" or "Send for Approval"
    └─ On Send: requestProposalAcceptance({customerId, policyName})
       → Consultant sees in pending approvals
    
    [Meeting Reschedule]
    ├─ Customer views upcoming meetings
    ├─ Clicks "Change Meeting"
    ├─ onMeetingSelected(meetingId)
    │  ├─ Check localStorage for draft
    │  ├─ Initialize form with current details or draft
    │  └─ Show meeting change form
    ├─ Customer:
    │  ├─ Adds multiple date/time slots (Add/Remove buttons)
    │  ├─ Selects reason ("Family conflict", etc)
    │  ├─ Checks guidance options
    │  └─ Form auto-saves to localStorage after each change
    ├─ Submits: submitMeetingChange()
    │  ├─ requestMeetingChange({meetingId, customerId, ...})
    │  ├─ Timeline event created
    │  └─ Clear form + localStorage draft
    └─ Consultant sees in notifications

CONSULTANT NOTIFICATION
    ↓
CUSTOMER SEES RESULT
    ├─ Approved: Meeting date/time updated, timeline shows "Approved"
    └─ Rejected: Timeline shows rejection reason
```

---

## 4. DATA FLOW: CONSULTANT WORKFLOW

```
CONSULTANT LOGIN
    ↓
DASHBOARD VIEW
    ├─ Quick stats: pending approvals, active clients
    ├─ Alerts: Any pending meeting changes or proposals
    └─ Charts: Overall portfolio mix
    ↓
CLIENTS VIEW
    ├─ Client List Calculated via useMemo:
    │  ├─ workspaceClients = useMemo(() => {
    │  │   return getCustomers().map(user => {
    │  │     const pendingStatus = consultantPendingRequests.some(
    │  │       r => r.customerId === user.id
    │  │     ) ? 'Pending' : 'Active'
    │  │     const latestInteraction = timelineItems
    │  │       .filter(t => t.customerId === user.id)[0]?.createdAt
    │  │     return {
    │  │       id, name, age, tag, status: pendingStatus,
    │  │       lastInteraction, preferences
    │  │     }
    │  │   })
    │  │ }, [consultantPendingRequests, timelineItems])
    │  │
    │  └─ Status is COMPUTED (not stored)
    │
    ├─ Search/Filter clients by name or status
    └─ Click client → Opens PROFILE view
    ↓
PROFILE VIEW (Client Deep-Dive)
    ├─ Pending Approvals Queue (if any)
    │  ├─ Meeting Changes
    │  │  ├─ "Requested 2026-07-25 14:00"
    │  │  ├─ "Reason: Family event conflict"
    │  │  ├─ "Proposed: [2026-07-25 14:00, 2026-07-26 10:00, ...]"
    │  │  └─ [Approve] [Reject] buttons
    │  └─ Proposal Signatures
    │     ├─ "PRUShield + Extra"
    │     ├─ "Requested 3 hours ago"
    │     └─ [Approve] [Reject] buttons
    │
    ├─ Client Overview
    │  ├─ Name, Age, Contact
    │  ├─ Preferences with Tooltips
    │  │  └─ "Low risk" → "Prefers conservative..."
    │  │  └─ "Family coverage" → "Prioritizes protection..."
    │  └─ [View AI Session Summary]
    │
    ├─ Unified Timeline (Filtered)
    │  ├─ Filter Buttons: [AI Chat] [Consultation] [Proposal]
    │  ├─ Timeline events for SELECTED CLIENT only
    │  └─ Shows all events matching selected types
    │
    └─ Actions: Open Analytics or Recommendations
    ↓
ANALYTICS VIEW (Client-Specific Data)
    │
    ├─ Coverage Radar Chart
    │  │  generateClientRadarData() {
    │  │    const client = activeClient
    │  │    const riskLevel = client.preferences includes 'Low' ? 45 : 85
    │  │    const hasFamily = client.preferences includes 'Family'
    │  │    return [
    │  │      { axis: 'Life', value: hasFamily ? 78 : 58 },
    │  │      { axis: 'Health', value: hasProtection ? 82 : 64 },
    │  │      { axis: 'Critical Illness', value: riskLevel > 70 ? 72 : 52 },
    │  │      { axis: 'Disability', value: riskLevel > 70 ? 68 : 38 },
    │  │      { axis: 'Savings', value: hasWealth ? 85 : 65 }
    │  │    ]
    │  │  }
    │  │
    │  └─ Displays 5 coverage dimensions based on CLIENT profile
    │
    ├─ Premium Breakdown (Pie Chart)
    │  └─ Shows cost allocation across coverage types
    │
    ├─ Gap Analysis (Personalized)
    │  │  if (client.preferences includes 'Disability')
    │  │    → "Disability protection enhancement recommended"
    │  │  if (client.preferences includes 'Family')
    │  │    → "Family protection alignment to income level"
    │  │
    │  └─ Shows only RELEVANT gaps for this client
    │
    └─ Profile Match Trend (4-Week Chart)
       └─ generateClientTrendData() {
            const riskLevel = 0.6 (low) | 0.7 (balanced) | 0.8 (growth)
            const startScore = 55 + riskLevel * 15 → [55-70]
            return [
              { week: 'W1', score: startScore },
              { week: 'W2', score: startScore + 6 * riskLevel },
              { week: 'W3', score: startScore + 12 * riskLevel },
              { week: 'W4', score: startScore + 18 * riskLevel }
            ]
          }
          Growth clients show steeper improvement arc
          Conservative clients show steady progression
    ↓
RECOMMENDATIONS VIEW
    │
    └─ activeClientRecommendations = useMemo(() => {
        return buildClientRecommendations()
      }, [activeClient])
      
      ALGORITHM: buildClientRecommendations()
      ├─ Extract signals
      │  ├─ isLowRisk = client.preferences.some(p => p.includes('Low'))
      │  ├─ isGrowth = client.preferences.some(p => p.includes('Growth'))
      │  ├─ hasFamily = client.preferences.some(p => p.includes('Family'))
      │  └─ isWealth = client.tag?.includes('Wealth')
      │
      ├─ Generate recommendations based on combinations
      │  │
      │  ├─ REC 1: If hasFamily || !isGrowth
      │  │   └─ PRUShield + PRUExtra Plus (Score: 94)
      │  │      "Based on John's profile: family coverage priority"
      │  │
      │  ├─ REC 2: If !isWealth || (isGrowth && hasFamily)
      │  │   └─ PRUActive Life V + CI Rider (Score: 86-89)
      │  │      "Matches John's balanced/growth profile"
      │  │
      │  └─ REC 3: If isWealth
      │      └─ Saver III Enhanced (Score: 91)
      │         "Wealth accumulation aligned with John's focus"
      │      ELSE
      │      └─ Personal Accident Rider (Score: 79-82)
      │         "Affordable gap-closer for John's profile"
      │
      └─ Each recommendation shows:
         ├─ Policy name
         ├─ Premium
         ├─ Match score
         ├─ Quick reason (personalized with client name)
         ├─ [Expand] for full algorithm reasoning
         └─ [Send to Client] button
             → Creates timeline event
             → Customer sees notification + proposal in timeline
```

---

## 5. REAL-TIME SYNCHRONIZATION LOOP

```
┌─────────────────────────────────────────────────────────────┐
│        REAL-TIME DATA REFRESH CYCLE (1.5 SECONDS)            │
└─────────────────────────────────────────────────────────────┘

useEffect(() => {
  const refreshWorkspace = () => {
    // Step 1: Check session
    const sessionUser = getCurrentUser()
    setActiveUser(sessionUser)
    
    if (!sessionUser) {
      // LOGOUT DETECTED
      clearAllState()
      return
    }

    // Step 2: Fetch fresh data
    setTimelineItems(getTimelineEventsForUser(sessionUser))
    setMeetings(getMeetingsForUser(sessionUser))
    setUnreadCount(getUnreadTimelineCountForUser(sessionUser))

    // Step 3: Role-specific data
    if (sessionUser.role === 'customer') {
      setCustomerRequests(getMeetingChangeRequestsForCustomer(...))
      setCustomerProposalRequests(getProposalAcceptanceRequestsForCustomer(...))
    } else {
      setConsultantPendingRequests(getPendingMeetingChangesForConsultant(...))
      setConsultantPendingProposalRequests(getPendingProposalAcceptancesForConsultant(...))
    }
  }

  refreshWorkspace()  // Run immediately
  const timerId = setInterval(refreshWorkspace, 1500)  // Every 1.5s
  
  // CROSS-TAB SYNC
  window.addEventListener('storage', refreshWorkspace)  // User logs out in another tab
  
  return () => {
    clearInterval(timerId)
    removeEventListener('storage', refreshWorkspace)
  }
}, [changingMeetingId])

RESULT: All data stays synchronized with DB
        Even if user switches tabs, changes are visible when returning
```

---

## 6. MEETING REQUEST LIFECYCLE (Detailed)

```
CUSTOMER INITIATES CHANGE
│
├─ Clicks "Change Meeting" button
│
├─ onMeetingSelected(meetingId)
│  ├─ Load meeting from meetings array
│  ├─ Check localStorage for draft
│  │  └─ Key: "bipj_meeting_change_draft_${userId}_${meetingId}"
│  ├─ If draft exists:
│  │  └─ Pre-populate form with previous values
│  └─ If no draft:
│     └─ Initialize with current meeting date/time
│
├─ setMeetingForm({
│   meetingId: "m1",
│   proposedSlots: [
│     { date: "2026-07-25", time: "14:00" },
│     { date: "2026-07-26", time: "10:00" }
│   ],
│   reason: "Family event conflict",
│   guidanceOptions: ["Need afternoon", "Family conflict"]
│ })
│
└─ setChangingMeetingId("m1") ← Show form UI


CUSTOMER MODIFIES FORM
│
├─ Adds slot: addMeetingSlot()
│  └─ Appends { date: '', time: '' } to proposedSlots
│
├─ Updates slot: updateMeetingSlot(1, { date: "2026-07-27" })
│  └─ Updates proposedSlots[1].date
│
├─ Removes slot: removeMeetingSlot(0)
│  └─ Filters out proposedSlots[0]
│
├─ Toggles guidance: toggleGuidanceOption("Need afternoon")
│  └─ Adds/removes from guidanceOptions array
│
└─ useEffect watches meetingForm
   └─ Every change triggers:
      localStorage.setItem(draftKey, JSON.stringify(meetingForm))
      ↑ AUTO-SAVES to localStorage


CUSTOMER SUBMITS
│
├─ Validation checks:
│  ├─ meetingId exists? ✓
│  ├─ ≥1 slot with date AND time? ✓
│  ├─ reason non-empty? ✓
│  └─ ≥1 guidanceOption selected? ✓
│
├─ VALID: requestMeetingChange({
│   meetingId: "m1",
│   customerId: "u-customer-1",
│   proposedDate: "2026-07-25",  ← First slot
│   proposedTime: "14:00",
│   proposedSlots: [...],         ← All slots
│   reason: "Family event conflict",
│   guidanceOptions: [...]
│ })
│
├─ Success:
│  ├─ Show message: "Change request sent with slots: 2026-07-25 14:00 / ..."
│  ├─ addTimelineEvent() → Timeline updated
│  ├─ Re-fetch timelineItems, meetings, customerRequests
│  ├─ localStorage.removeItem(draftKey) → Clear draft
│  └─ setChangingMeetingId(null) → Hide form
│
└─ Failure:
   └─ Show error message, keep form open for correction


CONSULTANT REVIEWS
│
├─ Consultant logs in
├─ Tab 3 polls every 1.5s
│  └─ getPendingMeetingChangesForConsultant(consultantId)
│     → Returns array with new request
│
├─ Consultant views client profile
│  └─ selectedClientPendingRequests filtered to this client
│
├─ In Approvals section, consultant sees:
│  ├─ "Requested 2026-07-25 14:00"
│  ├─ "Reason: Family event conflict"
│  ├─ "Selected options: Need afternoon, Family conflict"
│  ├─ "Proposed slots: 2026-07-25 14:00 / 2026-07-26 10:00"
│  └─ [Approve] [Reject] buttons
│
├─ Option A: APPROVE
│  ├─ approveMeetingChange(requestId, consultantId)
│  │  ├─ DB: Meeting updated with approved date/time
│  │  ├─ DB: Timeline event created "Consultant approved request"
│  │  └─ DB: Request marked as completed
│  │
│  ├─ Re-fetch all state
│  │  ├─ setTimelineItems() → New event visible
│  │  ├─ setMeetings() → Meeting updated with new date
│  │  └─ setConsultantPendingRequests() → Approved item removed
│  │
│  └─ Success message: "Meeting change approved and customer notified"
│
├─ Option B: REJECT
│  ├─ rejectMeetingChange({ requestId, consultantId })
│  │  ├─ DB: Timeline event created "Consultant rejected request"
│  │  └─ DB: Request marked as completed
│  │
│  ├─ Re-fetch state
│  └─ Success message: "Meeting change rejected and customer notified"


CUSTOMER SEES RESULT
│
├─ Tab 3 polls and gets updated data
├─ Timeline shows new event:
│  ├─ If approved: "Approved - Meeting rescheduled to 2026-07-25 14:00"
│  └─ If rejected: "Request denied - Reason: [if provided]"
│
└─ Meetings list reflects new date
```

---

## 7. MEMOIZATION & PERFORMANCE PATTERNS

```
EXPENSIVE OPERATION → MEMOIZED
────────────────────────────────

1. Timeline Filtering (O(n) complexity)
   const customerTimeline = useMemo(() => {
     return timelineItems.filter(...)
   }, [activeUser, timelineItems, selectedTimelineFilters])
   
   Only recalculates when these 3 dependencies change
   Without memo: Recalculates on every render (wasteful)

2. Client Recommendations (Algorithm)
   const activeClientRecommendations = useMemo(
     () => buildClientRecommendations(),
     [activeClient]
   )
   
   buildClientRecommendations() runs ~20ms analysis
   Without memo: Runs on every render (60+ times/sec if not debounced)

3. Client List Transformation (Hydration)
   const workspaceClients = useMemo(() => {
     return getCustomers().map(user => {
       // Merge with fallback, calculate status, find latest interaction
     })
   }, [consultantPendingRequests, timelineItems])
   
   Iterates all customers, matches with timeline events
   Recalculates when pending requests or timeline changes

4. Radar/Trend Data Generation
   const radarData = generateClientRadarData()
   const trendData = generateClientTrendData()
   
   Called on render, but calculations cached via dependency analysis
   (Could be further optimized with useMemo if needed)

RESULT: 
  - Reduced CPU usage
  - Smoother UI interactions
  - No perceptible delay on filter changes
```

---

## 8. INTEGRATION WITH APP-DB.ts (Data Layer)

```
┌────────────────────────────────────────────────────┐
│          TAB 3 ↔ APP-DB.TS DATA FLOW               │
└────────────────────────────────────────────────────┘

QUERIES (Read from DB)
├─ getCurrentUser() → activeUser
├─ getCustomers() → workspaceClients
├─ getTimelineEventsForUser(userId) → timelineItems
├─ getUnreadTimelineCountForUser(userId) → unreadCount
├─ getMeetingsForUser(userId) → meetings
├─ getMeetingChangeRequestsForCustomer(customerId) → customerRequests
├─ getPendingMeetingChangesForConsultant(consultantId) → consultantPendingRequests
├─ getProposalAcceptanceRequestsForCustomer(customerId) → customerProposalRequests
├─ getPendingProposalAcceptancesForConsultant(consultantId) → consultantPendingProposalRequests
├─ getChatHistory(userId) → [For savedChatCount]
└─ getUserById(userId) → [For lookups]

COMMANDS (Write to DB)
├─ addTimelineEvent({customerId, consultantId, type, channel, ...})
│  └─ Create new timeline event
│
├─ markTimelineRead(userId)
│  └─ Mark all events as read
│
├─ requestMeetingChange({meetingId, customerId, proposedDate, ...})
│  └─ Submit meeting reschedule request
│
├─ approveMeetingChange(requestId, consultantId)
│  └─ Approve request → Update meeting, create event
│
├─ rejectMeetingChange({requestId, consultantId})
│  └─ Reject request → Create event
│
├─ requestProposalAcceptance({customerId, policyName})
│  └─ Customer signs proposal → Send to consultant
│
├─ approveProposalAcceptance(requestId, consultantId)
│  └─ Consultant approves → Create event
│
└─ rejectProposalAcceptance({requestId, consultantId})
   └─ Consultant rejects → Create event

CONSISTENCY PATTERN
──────────────────
After every action:
  1. Call DB command (requestMeetingChange, etc)
  2. If result.ok:
     ├─ Re-fetch affected data (setTimelineItems, setMeetings, ...)
     ├─ Update UI to match DB state exactly
     └─ Clear any temporary form state
  3. If !result.ok:
     └─ Show error message to user

RESULT: UI always reflects DB state (single source of truth)
```

---

## SUMMARY: KEY DESIGN DECISIONS

| Decision | Reason | Benefit |
|----------|--------|---------|
| Dual-role in one component | Shared data, testing convenience | Less code duplication |
| 1.5s polling interval | Balance responsiveness vs CPU | Smooth UX with low overhead |
| localStorage draft auto-save | Prevent accidental data loss | Better UX, fewer support issues |
| Post-action re-fetch | Ensure DB = UI consistency | Single source of truth |
| Separate timeline filters | Independent role workflows | No cross-contamination |
| Dynamic status calculation | Real-time responsiveness | No stale data in client list |
| Memoized recommendations | Algorithm runs frequently | No perceptible delay |
| 3-level fallback strategy | Defensive programming | No undefined errors |
| Timeline event system | Audit trail + notifications | Full transparency |
| Cross-tab sync via storage | Multi-window support | Better user experience |
