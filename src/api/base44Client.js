import { appParams } from '@/lib/app-params';

const STORAGE_KEY = 'smart-public-complaint-platform';
const AUTH_KEY = `${STORAGE_KEY}:auth`;
const PENDING_REGISTRATION_KEY = `${STORAGE_KEY}:pending-registration`;
const EVENT_NAME = `${STORAGE_KEY}:store-change`;

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const parseJson = (key, fallback = null) => {
  if (!isBrowser) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!isBrowser) return;
  if (value === null || value === undefined) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
};

const makeId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
const getTimestamp = () => new Date().toISOString();
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const COMPLAINT_STAGE_SEQUENCE = [
  { status: 'SUBMITTED', label: 'Complaint Submitted' },
  { status: 'UNDER_VERIFICATION', label: 'Complaint Verification' },
  { status: 'APPROVED_PENDING', label: 'Approval' },
  { status: 'ASSIGNED_TO_DEPARTMENT', label: 'Work Assignment' },
  { status: 'OFFICER_ASSIGNED', label: 'Officer Assignment' },
  { status: 'INVESTIGATION_IN_PROGRESS', label: 'Investigation' },
  { status: 'IN_PROGRESS', label: 'Work in Progress' },
  { status: 'RESOLUTION_PENDING', label: 'Resolution' },
  { status: 'RESOLUTION_PENDING_VERIFICATION', label: 'Final Verification' },
  { status: 'FINAL_REVIEW', label: 'Closure' },
];

const DEFAULT_STAGE_DURATIONS = [1, 3, 5, 2, 2, 3, 15, 3, 2, 2];

export const createDefaultTimelineSettings = () => ({
  stages: COMPLAINT_STAGE_SEQUENCE.map((stage, index) => ({
    ...stage,
    durationDays: DEFAULT_STAGE_DURATIONS[index],
    enabled: true,
  })),
  escalationContact: {
    name: 'Higher Authority',
    email: '',
    phone: '',
  },
});

const normalizeTimelineSettings = (settings = {}) => {
  const defaults = createDefaultTimelineSettings();
  const configuredStages = Array.isArray(settings.stages) ? settings.stages : [];
  return {
    stages: defaults.stages.map((stage) => {
      const configured = configuredStages.find((entry) => entry.status === stage.status) || {};
      const durationDays = Number(configured.durationDays);
      return {
        ...stage,
        durationDays: Number.isInteger(durationDays) && durationDays > 0 ? durationDays : stage.durationDays,
        enabled: typeof configured.enabled === 'boolean' ? configured.enabled : stage.enabled,
      };
    }),
    escalationContact: {
      name: String(settings.escalationContact?.name ?? defaults.escalationContact.name).trim(),
      email: String(settings.escalationContact?.email ?? '').trim(),
      phone: String(settings.escalationContact?.phone ?? '').trim(),
    },
  };
};

const getStageSettings = (settings, status) => normalizeTimelineSettings(settings).stages.find((stage) => stage.status === status);

const getOverallDeadline = (submittedAt, settings) => {
  const duration = normalizeTimelineSettings(settings).stages
    .filter((stage) => stage.enabled)
    .reduce((total, stage) => total + stage.durationDays, 0);
  return addDays(submittedAt, duration);
};

const makeStageRecord = (status, startedAt, settings) => {
  const stage = getStageSettings(settings, status);
  if (!stage) return null;
  return {
    status,
    started_at: startedAt,
    allowed_days: stage.durationDays,
    deadline: stage.enabled ? addDays(startedAt, stage.durationDays) : '',
    deadline_enabled: stage.enabled,
    completed_at: null,
  };
};

const getCompletionBlockReason = (problem = {}) => {
  const status = canonicalComplaintStatus(problem.status);
  if (!['RESOLVED', 'COMPLETED'].includes(status)) {
    return 'Mark the work resolved before completing the complaint.';
  }

  const hasPendingActions = Boolean(problem.pending_action)
    || (Array.isArray(problem.pending_actions) && problem.pending_actions.length > 0)
    || Number(problem.pending_action_count || 0) > 0;
  if (hasPendingActions) return 'The complaint still has pending actions.';

  const history = Array.isArray(problem.stage_history) ? problem.stage_history : [];
  const latestStages = COMPLAINT_STAGE_SEQUENCE.map((stage) => ({
    stage,
    index: history.map((entry) => entry.status).lastIndexOf(stage.status),
  }));
  const incompleteStages = latestStages.filter(({ stage, index }) => {
    const latest = index >= 0 ? history[index] : null;
    const started = latest?.started_at ? new Date(latest.started_at).getTime() : NaN;
    const completed = latest?.completed_at ? new Date(latest.completed_at).getTime() : NaN;
    return !Number.isFinite(started) || !Number.isFinite(completed) || completed < started;
  });
  if (incompleteStages.length) {
    return `Complete every workflow stage before closing this complaint. Incomplete: ${incompleteStages.map(({ stage }) => stage.label).join(', ')}.`;
  }
  if (latestStages.some((entry, index) => index > 0 && entry.index <= latestStages[index - 1].index)) {
    return 'Complete workflow stages in their required order before closing this complaint.';
  }
  if (history.some((entry) => !entry.completed_at)) return 'A workflow stage still has a pending action.';

  return '';
};

const isFullyCompletedComplaint = (problem = {}) => (
  canonicalComplaintStatus(problem.status) === 'COMPLETED'
  && !getCompletionBlockReason(problem)
);

const makeCompletedProblemRecord = (problem) => {
  const now = getTimestamp();
  return {
    ...problem,
    status: 'COMPLETED',
    current_stage: 'COMPLETED',
    current_stage_deadline: '',
    deadline_status: 'COMPLETED',
    completed_at: problem.completed_at || now,
    archived_at: problem.archived_at || now,
  };
};

const archiveCompletedProblem = (store, problem) => {
  const reason = getCompletionBlockReason(problem);
  if (reason) throw new Error(reason);
  const completed = makeCompletedProblemRecord(problem);
  store.problems = (store.problems ?? []).filter((entry) => entry.id !== problem.id);
  store.completedProblems = [
    ...(store.completedProblems ?? []).filter((entry) => entry.id !== problem.id),
    completed,
  ];
  return completed;
};

export const canonicalComplaintStatus = (status) => {
  const value = String(status ?? '').trim();
  if (!value) return 'SUBMITTED';
  const aliases = {
    Submitted: 'SUBMITTED',
    'Under Verification': 'UNDER_VERIFICATION',
    UNDER_VERIFICATION: 'UNDER_VERIFICATION',
    Verified: 'UNDER_VERIFICATION',
    VERIFIED: 'UNDER_VERIFICATION',
    'Approved Pending': 'APPROVED_PENDING',
    APPROVED_PENDING: 'APPROVED_PENDING',
    Approved: 'APPROVED_PENDING',
    'Assigned to Department': 'ASSIGNED_TO_DEPARTMENT',
    ASSIGNED_TO_DEPARTMENT: 'ASSIGNED_TO_DEPARTMENT',
    Assigned: 'ASSIGNED_TO_DEPARTMENT',
    'Officer Assignment Pending': 'OFFICER_ASSIGNED',
    OFFICER_ASSIGNMENT_PENDING: 'OFFICER_ASSIGNED',
    'Officer Assigned': 'OFFICER_ASSIGNED',
    OFFICER_ASSIGNED: 'OFFICER_ASSIGNED',
    'Investigation in Progress': 'INVESTIGATION_IN_PROGRESS',
    INVESTIGATION_IN_PROGRESS: 'INVESTIGATION_IN_PROGRESS',
    'In Progress': 'IN_PROGRESS',
    InProgress: 'IN_PROGRESS',
    IN_PROGRESS: 'IN_PROGRESS',
    'Work in Progress': 'IN_PROGRESS',
    'Resolution Pending': 'RESOLUTION_PENDING',
    RESOLUTION_PENDING: 'RESOLUTION_PENDING',
    'Resolution Pending Verification': 'RESOLUTION_PENDING_VERIFICATION',
    RESOLUTION_PENDING_VERIFICATION: 'RESOLUTION_PENDING_VERIFICATION',
    'Final Review': 'FINAL_REVIEW',
    FINAL_REVIEW: 'FINAL_REVIEW',
    RESOLVED: 'RESOLVED',
    'Resolved': 'RESOLVED',
    COMPLETED: 'COMPLETED',
    Completed: 'COMPLETED',
    CLOSED: 'COMPLETED',
    Closed: 'COMPLETED',
    ESCALATED: 'ESCALATED',
    DELAYED: 'DELAYED',
    REJECTED: 'REJECTED',
  };
  const normalized = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return aliases[normalized] || aliases[value] || Object.entries(aliases).find(([key]) => key.toLowerCase() === normalized.toLowerCase())?.[1] || value.toUpperCase();
};

export const formatComplaintStatus = (status) => {
  const normalized = canonicalComplaintStatus(status);
  const labels = {
    SUBMITTED: 'Submitted',
    UNDER_VERIFICATION: 'Under Verification',
    APPROVED_PENDING: 'Approved Pending',
    ASSIGNED_TO_DEPARTMENT: 'Assigned to Department',
    OFFICER_ASSIGNMENT_PENDING: 'Officer Assignment Pending',
    OFFICER_ASSIGNED: 'Officer Assigned',
    INVESTIGATION_IN_PROGRESS: 'Investigation in Progress',
    IN_PROGRESS: 'In Progress',
    RESOLUTION_PENDING: 'Resolution Pending',
    RESOLUTION_PENDING_VERIFICATION: 'Resolution Pending Verification',
    FINAL_REVIEW: 'Final Review',
    ESCALATED: 'Escalated',
    RESOLVED: 'Resolved',
    COMPLETED: 'Completed',
    DELAYED: 'Delayed',
    REJECTED: 'Rejected',
  };
  return labels[normalized] || String(status || 'Submitted');
};

const addDays = (dateValue, dayCount) => {
  const base = new Date(dateValue);
  base.setDate(base.getDate() + dayCount);
  return base.toISOString();
};

const getComplaintStageDeadline = (problem = {}, status = problem.status, settings) => {
  const normalizedStatus = canonicalComplaintStatus(status);
  if (['RESOLVED', 'COMPLETED', 'ESCALATED'].includes(normalizedStatus)) return '';
  const stage = getStageSettings(settings, normalizedStatus);
  if (!stage?.enabled) return '';
  const startedAt = problem.current_stage_started_at || problem.submitted_at || problem.created_date || getTimestamp();
  return addDays(startedAt, stage.durationDays);
};

export const buildComplaintTimeline = (problem = {}, settings) => {
  const normalizedSettings = normalizeTimelineSettings(settings);
  const submittedAt = new Date(problem.submitted_at || problem.created_date || getTimestamp());
  const overallDeadline = problem.overall_deadline ? new Date(problem.overall_deadline) : new Date(getOverallDeadline(submittedAt, normalizedSettings));
  const currentStatus = canonicalComplaintStatus(problem.status);
  const stageIndex = COMPLAINT_STAGE_SEQUENCE.findIndex((stage) => stage.status === currentStatus);
  const history = Array.isArray(problem.stage_history) ? problem.stage_history : [];
  const now = Date.now();
  const timeline = normalizedSettings.stages.map((stage, index) => {
    const record = history.filter((entry) => entry.status === stage.status).at(-1);
    const allowedDays = record?.allowed_days || stage.durationDays;
    const current = stage.status === currentStatus && currentStatus !== 'RESOLVED';
    const done = Boolean(record?.completed_at);
    const startedAt = record?.started_at || (stage.status === 'SUBMITTED' ? problem.submitted_at || problem.created_date : '');
    const deadline = record?.deadline || (current ? problem.current_stage_deadline : '');
    const remainingDays = deadline ? Math.ceil((new Date(deadline).getTime() - now) / DAY_IN_MS) : null;
    let deadlineStatus = done ? 'Completed' : !stage.enabled ? 'Disabled' : current ? 'On Time' : 'Pending';
    if (current && problem.deadline_status === 'OVERDUE') deadlineStatus = 'Overdue';
    else if (current && remainingDays !== null && Number.isFinite(remainingDays) && remainingDays <= Math.max(1, Math.ceil(allowedDays * 0.2))) deadlineStatus = 'Due Soon';
    return {
      ...stage,
      durationDays: allowedDays,
      startedAt,
      deadline,
      remainingDays,
      deadlineStatus,
      done,
      current,
    };
  });
  const currentStage = COMPLAINT_STAGE_SEQUENCE.find((stage) => stage.status === currentStatus) || COMPLAINT_STAGE_SEQUENCE[0];
  return {
    submittedAt,
    overallDeadline,
    currentStage,
    currentStatus,
    timeline,
    escalationContact: normalizedSettings.escalationContact,
  };
};

export const getComplaintStatusSummary = (problem = {}, settings) => {
  const normalizedSettings = normalizeTimelineSettings(settings);
  const submittedAt = new Date(problem.submitted_at || problem.created_date || getTimestamp());
  const overallDeadline = new Date(problem.overall_deadline || getOverallDeadline(submittedAt, normalizedSettings));
  const currentStatus = canonicalComplaintStatus(problem.status);
  const checkDate = new Date();
  const daysElapsed = Math.max(0, Math.ceil((checkDate.getTime() - submittedAt.getTime()) / DAY_IN_MS));
  const daysRemaining = Math.ceil((overallDeadline.getTime() - checkDate.getTime()) / DAY_IN_MS);
  const totalDays = normalizedSettings.stages.filter((stage) => stage.enabled).reduce((total, stage) => total + stage.durationDays, 0);
  const progressPercentage = totalDays ? Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100))) : 0;
  const stageDeadline = problem.current_stage_deadline ? new Date(problem.current_stage_deadline) : null;
  const stageRemainingDays = stageDeadline ? Math.ceil((stageDeadline.getTime() - checkDate.getTime()) / DAY_IN_MS) : null;
  const activeRecord = (Array.isArray(problem.stage_history) ? problem.stage_history : [])
    .filter((entry) => entry.status === currentStatus).at(-1);
  const activeStageSettings = getStageSettings(normalizedSettings, currentStatus);
  const activeDuration = activeRecord?.allowed_days || activeStageSettings?.durationDays || 1;

  let warning = 'Processing';
  if (currentStatus === 'RESOLVED') warning = 'Resolved; workflow completion is pending';
  else if (currentStatus === 'COMPLETED') warning = 'All workflow stages are complete';
  else if (problem.deadline_status === 'OVERDUE') warning = 'Current stage is overdue';
  else if (!activeStageSettings?.enabled) warning = 'Timing is disabled for the current stage';
  else if (stageRemainingDays !== null && stageRemainingDays <= 0) warning = 'Deadline reached';
  else if (stageRemainingDays !== null && stageRemainingDays <= Math.max(1, Math.ceil(activeDuration * 0.2))) warning = 'Current stage is due soon';

  return {
    submittedAt,
    overallDeadline,
    currentStageDeadline: stageDeadline,
    daysElapsed,
    daysRemaining,
    progressPercentage,
    warning,
    currentStatus,
    stageRemainingDays,
    deadlineStatus: currentStatus === 'COMPLETED' ? 'Completed' : currentStatus === 'RESOLVED' ? 'Resolved' : problem.deadline_status === 'OVERDUE' ? 'Overdue' : !activeStageSettings?.enabled ? 'Disabled' : warning === 'Current stage is due soon' ? 'Due Soon' : 'On Time',
  };
};

export const getComplaintWarningMessage = (problem = {}) => {
  const summary = getComplaintStatusSummary(problem);
  const status = canonicalComplaintStatus(problem.status);

  if (status === 'COMPLETED') return 'This complaint has been successfully resolved and all stages have been completed.';
  if (status === 'RESOLVED') return 'Work is marked resolved; required workflow stages still need completion.';
  if (problem.deadline_status === 'OVERDUE') return 'This complaint is overdue and has been escalated.';
  if (summary.deadlineStatus === 'Due Soon') return 'The current stage deadline is approaching.';
  return 'Complaint is progressing within its configured stage timeline.';
};

export const evaluateComplaintDeadlines = async () => {
  const store = await seedStore();
  const settings = normalizeTimelineSettings(store.timelineSettings);
  let changed = false;
  const updatedProblems = (store.problems ?? []).map((problem) => {
    const status = canonicalComplaintStatus(problem.status);
    if (['RESOLVED', 'COMPLETED'].includes(status) || problem.deadline_status === 'OVERDUE') return problem;

    const stageConfig = getStageSettings(settings, status);
    if (!stageConfig?.enabled) return problem;
    const deadlineValue = problem.current_stage_deadline || getComplaintStageDeadline(problem, status, settings);
    if (!deadlineValue) return problem;
    const stageDeadline = new Date(deadlineValue);
    const now = new Date();

    if (now > stageDeadline) {
      changed = true;
      const previousAuthority = problem.current_authority || 'Verification Officer';
      const nextAuthority = settings.escalationContact.name || 'Higher Authority';
      const escalatedProblem = {
        ...problem,
        deadline_status: 'OVERDUE',
        current_authority: nextAuthority,
        previous_authority: previousAuthority,
        escalation_level: Number(problem.escalation_level || 0) + 1,
        escalated_at: now.toISOString(),
        escalation_reason: `Stage ${stageConfig.label} exceeded its deadline on ${stageDeadline.toISOString()}`,
        deadline_escalated_for: `${status}:${stageDeadline.toISOString()}`,
        updated_date: now.toISOString(),
      };

      const historyEntry = {
        id: makeId('escalation'),
        complaint_id: problem.id,
        previous_authority: previousAuthority,
        new_authority: nextAuthority,
        previous_stage: status,
        new_stage: 'OVERDUE',
        reason: escalatedProblem.escalation_reason,
        escalated_at: now.toISOString(),
        created_by: 'system',
        notification_status: 'pending',
        created_date: now.toISOString(),
      };
      store.escalations = [...(store.escalations ?? []), historyEntry];

      const userIds = ((store.users ?? []).filter((user) => ['admin', 'authority'].includes(normalizeRole(user.role))).map((user) => user.id));
      const contact = [settings.escalationContact.email, settings.escalationContact.phone].filter(Boolean).join(' / ');
      const citizenNotice = problem.created_by_id ? [{ user_id: problem.created_by_id, problem_id: problem.id, message: `${problem.problem_id || problem.title} is overdue and has been escalated to ${nextAuthority}${contact ? ` (${contact})` : ''}.`, type: 'escalation', read: false, created_date: now.toISOString() }] : [];
      const authorityNotice = userIds.map((userId) => ({
        user_id: userId,
        problem_id: problem.id,
        message: `Complaint ${problem.problem_id || problem.title} is overdue and has been escalated to ${nextAuthority}.`,
        type: 'escalation',
        read: false,
        created_date: now.toISOString(),
      }));

      if (citizenNotice.length || authorityNotice.length) {
        store.notifications = [...(store.notifications ?? []), ...citizenNotice, ...authorityNotice];
      }
      return escalatedProblem;
    }
    return problem;
  });

  if (changed) {
    store.problems = updatedProblems;
    writeJson(STORAGE_KEY, store);
  }
  return updatedProblems;
};

const normalizeRole = (role) => {
  const value = String(role ?? '').trim().toLowerCase();
  if (!value) return 'user';
  const aliases = {
    admin: 'admin',
    administrator: 'admin',
    systemadmin: 'admin',
    authority: 'authority',
    department: 'department',
    staff: 'authority',
    citizen: 'citizen',
    user: 'user',
    resident: 'citizen',
  };
  return aliases[value] || value;
};

const readAdminConfig = () => {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  return {
    email: String(env.VITE_ADMIN_EMAIL || 'admin@smartcomplaint.gov.in').trim(),
    password: String(env.VITE_ADMIN_PASSWORD || 'admin123').trim(),
  };
};

const isPlaceholderGoogleClientId = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return true;

  return [
    'your_google_client_id_here',
    'your-google-client-id-here',
    'your-google-client-id',
    'replace_me',
    'example-client-id',
    'placeholder',
    'demo-client-id',
    'client-id-placeholder',
    'your_client_id_here',
  ].includes(normalized) || normalized.includes('your_google') || normalized.includes('your-google') || normalized.includes('placeholder') || normalized.includes('example');
};

const readGoogleConfig = () => {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  return {
    clientId: String(env.VITE_GOOGLE_CLIENT_ID || '').trim(),
    redirectUri: String(env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/login').trim(),
  };
};

const hashPassword = async (value) => {
  const text = String(value ?? '');
  if (!text) return '';

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer))
      .map((entry) => entry.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const passwordMatches = async (providedPassword, storedPassword) => {
  if (!storedPassword) return false;
  const candidate = await hashPassword(providedPassword);
  return candidate === storedPassword || String(providedPassword) === String(storedPassword);
};

const migrateUserRecord = async (user = {}) => {
  const value = { ...user, role: normalizeRole(user.role) };
  if (!value.password) return value;
  if (value.password.startsWith('hash:')) {
    value.password = value.password.replace(/^hash:/, '');
    return value;
  }
  value.password = await hashPassword(value.password);
  return value;
};

const seedStore = async () => {
  const existing = parseJson(STORAGE_KEY, {});
  const now = getTimestamp();
  const migratedUsers = await Promise.all(((existing.users ?? []) || []).map(migrateUserRecord));
  const adminConfig = readAdminConfig();
  const adminPasswordHash = await hashPassword(adminConfig.password);
  const citizenPasswordHash = await hashPassword('citizen123');

  const defaultUsers = [
    {
      id: 'admin-1',
      email: adminConfig.email,
      password: adminPasswordHash,
      role: 'admin',
      full_name: 'System Administrator',
      phone_number: '+91 98765 43210',
      created_date: now,
    },
    {
      id: 'citizen-1',
      email: 'citizen@example.com',
      password: citizenPasswordHash,
      role: 'citizen',
      full_name: 'Asha Sharma',
      phone_number: '+91 98765 43210',
      created_date: now,
    },
  ];

  const adminIndex = migratedUsers.findIndex((user) => user.email.toLowerCase() === adminConfig.email.toLowerCase());
  const citizenIndex = migratedUsers.findIndex((user) => user.email.toLowerCase() === 'citizen@example.com');

  const nextUsers = [...migratedUsers];
  if (adminIndex >= 0) {
    nextUsers[adminIndex] = {
      ...nextUsers[adminIndex],
      id: nextUsers[adminIndex].id || 'admin-1',
      email: adminConfig.email,
      role: 'admin',
      full_name: nextUsers[adminIndex].full_name || 'System Administrator',
      password: adminPasswordHash,
    };
  } else {
    nextUsers.unshift(defaultUsers[0]);
  }

  if (citizenIndex >= 0) {
    nextUsers[citizenIndex] = {
      ...nextUsers[citizenIndex],
      id: nextUsers[citizenIndex].id || 'citizen-1',
      email: 'citizen@example.com',
      role: 'citizen',
      full_name: nextUsers[citizenIndex].full_name || 'Asha Sharma',
      password: citizenPasswordHash,
    };
  } else {
    const citizenExists = nextUsers.some((user) => user.email.toLowerCase() === 'citizen@example.com');
    if (!citizenExists) nextUsers.push(defaultUsers[1]);
  }

  const defaultDepartments = existing.departments ?? [
    { id: 'dept-1', name: 'Public Works', code: 'PW' },
    { id: 'dept-2', name: 'Water Supply', code: 'WS' },
    { id: 'dept-3', name: 'Sanitation', code: 'SN' },
    { id: 'dept-4', name: 'Street Lighting', code: 'SL' },
  ];

  const defaultProblems = existing.problems ?? [
    {
      id: 'problem-demo-1',
      problem_id: 'PRB-1001',
      title: 'Large pothole near market square',
      category: 'Pothole',
      description: 'A deep pothole has formed near the central junction and is causing vehicle damage.',
      address: 'Main Market Road, Sector 12',
      priority: 'High',
      status: 'IN_PROGRESS',
      current_stage: 'IN_PROGRESS',
      submitted_at: now,
      current_stage_started_at: now,
      latitude: 28.6139,
      longitude: 77.209,
      geo_timestamp: now,
      image_url: '',
      created_by_id: 'citizen-1',
      created_date: now,
      department: 'Public Works',
      assigned_to: 'Road Maintenance Unit',
      assigned_department: 'Public Works',
      assigned_officer: 'Road Maintenance Unit',
      assigned_at: now,
      current_authority: 'Department Head',
      previous_authority: 'Verification Officer',
      escalation_level: 0,
      confirmations: ['admin-1'],
    },
    {
      id: 'problem-demo-2',
      problem_id: 'PRB-1002',
      title: 'Garbage overflow near school gate',
      category: 'Garbage',
      description: 'Overflowing waste bins are attracting stray animals and creating health issues.',
      address: 'School Gate Lane, Ward 5',
      priority: 'Medium',
      status: 'UNDER_VERIFICATION',
      current_stage: 'UNDER_VERIFICATION',
      submitted_at: new Date(Date.now() - 86400000).toISOString(),
      current_stage_started_at: new Date(Date.now() - 86400000).toISOString(),
      latitude: 28.6145,
      longitude: 77.216,
      geo_timestamp: now,
      image_url: '',
      created_by_id: 'citizen-1',
      created_date: new Date(Date.now() - 86400000).toISOString(),
      department: 'Sanitation',
      assigned_to: 'Sanitation Division',
      assigned_department: 'Sanitation',
      assigned_officer: 'Sanitation Division',
      assigned_at: new Date(Date.now() - 86400000).toISOString(),
      current_authority: 'Verification Officer',
      previous_authority: '',
      escalation_level: 0,
      confirmations: [],
    },
  ];
  const timelineSettings = normalizeTimelineSettings(existing.timelineSettings);
  const migratedProblems = defaultProblems.map((problem) => {
    const submittedAt = problem.submitted_at || problem.created_date || now;
    const storedStatus = canonicalComplaintStatus(problem.status);
    const legacyCompletionRequested = storedStatus === 'COMPLETED';
    const status = legacyCompletionRequested ? 'RESOLVED' : storedStatus;
    const migrated = {
      ...problem,
      status,
      current_stage: status,
      submitted_at: submittedAt,
      current_stage_started_at: problem.current_stage_started_at || submittedAt,
      escalation_level: Number(problem.escalation_level || 0),
      current_authority: problem.current_authority || 'Verification Officer',
      deadline_status: problem.deadline_status || '',
      legacy_completion_requested: legacyCompletionRequested,
    };
    const history = Array.isArray(problem.stage_history) ? [...problem.stage_history] : [];
    if (status !== 'RESOLVED' && !history.some((entry) => entry.status === status && !entry.completed_at)) {
      const currentRecord = makeStageRecord(status, migrated.current_stage_started_at, timelineSettings);
      if (currentRecord) history.push(currentRecord);
    }
    migrated.stage_history = history;
    const activeRecord = history.filter((entry) => entry.status === status && !entry.completed_at).at(-1);
    migrated.current_stage_deadline = activeRecord?.deadline || getComplaintStageDeadline(migrated, status, timelineSettings);
    migrated.overall_deadline = problem.overall_deadline && problem.timeline_settings_version === 1
      ? problem.overall_deadline
      : getOverallDeadline(submittedAt, timelineSettings);
    migrated.timeline_settings_version = 1;
    return migrated;
  });

  const activeProblems = [];
  const completedProblems = [];
  for (const archivedProblem of existing.completedProblems ?? []) {
    const normalizedArchive = { ...archivedProblem, status: 'COMPLETED', current_stage: 'COMPLETED' };
    if (isFullyCompletedComplaint(normalizedArchive)) completedProblems.push(normalizedArchive);
    else activeProblems.push({
      ...archivedProblem,
      status: 'RESOLVED',
      current_stage: 'RESOLVED',
      deadline_status: '',
      completion_validation_error: getCompletionBlockReason({ ...archivedProblem, status: 'RESOLVED' }),
    });
  }
  for (const migratedProblem of migratedProblems) {
    const { legacy_completion_requested: legacyCompletionRequested, ...problem } = migratedProblem;
    if (!legacyCompletionRequested) {
      activeProblems.push(problem);
      continue;
    }
    const completedCandidate = { ...problem, status: 'COMPLETED', current_stage: 'COMPLETED' };
    if (isFullyCompletedComplaint(completedCandidate)) {
      completedProblems.push(makeCompletedProblemRecord(completedCandidate));
    } else {
      const resolvedProblem = { ...problem, status: 'RESOLVED', current_stage: 'RESOLVED', deadline_status: '' };
      activeProblems.push({ ...resolvedProblem, completion_validation_error: getCompletionBlockReason(resolvedProblem) });
    }
  }

  const defaultEscalations = existing.escalations ?? [];

  const defaultNotifications = existing.notifications ?? [
    {
      id: 'notification-demo-1',
      user_id: 'admin-1',
      problem_id: 'problem-demo-1',
      message: 'New public complaint reported: Large pothole near market square',
      type: 'new_report',
      read: false,
      created_date: now,
    },
  ];

  const defaultProblemUpdates = existing.problemUpdates ?? [
    {
      id: 'update-demo-1',
      problem_id: 'problem-demo-1',
      status: 'In Progress',
      comment: 'Maintenance team has been deployed to inspect the location.',
      image_url: '',
      created_date: now,
    },
  ];

  const nextStore = {
    ...existing,
    users: nextUsers.map((user) => ({ ...user, role: normalizeRole(user.role) })),
    departments: defaultDepartments,
    problems: activeProblems,
    completedProblems,
    notifications: defaultNotifications,
    problemUpdates: defaultProblemUpdates,
    escalations: defaultEscalations,
    timelineSettings,
  };

  writeJson(STORAGE_KEY, nextStore);
  return nextStore;
};

const emitStoreChange = (entity = 'store') => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { entity } }));
};

const sortItems = (items, sortField = '') => {
  if (!sortField) return items;
  const sortKey = sortField.replace(/^[+-]/, '');
  const descending = sortField.startsWith('-');
  return [...items].sort((a, b) => {
    const aValue = a?.[sortKey];
    const bValue = b?.[sortKey];
    const left = aValue === null || aValue === undefined ? '' : aValue;
    const right = bValue === null || bValue === undefined ? '' : bValue;
    if (left < right) return descending ? 1 : -1;
    if (left > right) return descending ? -1 : 1;
    return 0;
  });
};

const matchesQuery = (item, query = {}) => {
  if (!query || typeof query !== 'object') return true;
  return Object.entries(query).every(([key, value]) => item?.[key] === value);
};

const createEntityCollection = (collectionKey, entityName) => ({
  list: async (sortField = '', limit = null) => {
    let store = await seedStore();
    if (collectionKey === 'problems') {
      const updatedProblems = await evaluateComplaintDeadlines();
      store = { ...store, problems: updatedProblems };
    }
    let items = sortItems(store[collectionKey] ?? [], sortField);
    if (typeof limit === 'number' && limit > 0) items = items.slice(0, limit);
    return items;
  },
  filter: async (query = {}, sortField = '', limit = null) => {
    let store = await seedStore();
    if (collectionKey === 'problems') {
      const updatedProblems = await evaluateComplaintDeadlines();
      store = { ...store, problems: updatedProblems };
    }
    let items = (store[collectionKey] ?? []).filter((item) => matchesQuery(item, query));
    items = sortItems(items, sortField);
    if (typeof limit === 'number' && limit > 0) items = items.slice(0, limit);
    return items;
  },
  completed: async (query = {}, sortField = '-completed_at', limit = null) => {
    if (collectionKey !== 'problems') return [];
    const user = await auth.me();
    const store = await seedStore();
    const filters = normalizeRole(user.role) === 'admin' ? query : { ...query, created_by_id: user.id };
    let items = (store.completedProblems ?? []).filter((item) => matchesQuery(item, filters));
    items = sortItems(items, sortField);
    if (typeof limit === 'number' && limit > 0) items = items.slice(0, limit);
    return items;
  },
  get: async (id) => {
    let store = await seedStore();
    if (collectionKey === 'problems') {
      const updatedProblems = await evaluateComplaintDeadlines();
      store = { ...store, problems: updatedProblems };
    }
    const activeItem = (store[collectionKey] ?? []).find((item) => item.id === id);
    if (activeItem) return activeItem;
    return collectionKey === 'problems'
      ? (store.completedProblems ?? []).find((item) => item.id === id) ?? null
      : null;
  },
  create: async (payload = {}) => {
    if (collectionKey === 'problems' && canonicalComplaintStatus(payload.status || 'SUBMITTED') !== 'SUBMITTED') {
      throw new Error('New complaints must start in the Submitted stage.');
    }
    const store = await seedStore();
    if (collectionKey === 'problemUpdates') {
      const complaintIsCompleted = (store.completedProblems ?? []).some((problem) => problem.id === payload.problem_id);
      const author = (store.users ?? []).find((user) => user.id === payload.author_id);
      let isCompletionAudit = false;
      if (complaintIsCompleted && canonicalComplaintStatus(payload.status) === 'COMPLETED') {
        const admin = await requireAdminRole();
        isCompletionAudit = normalizeRole(author?.role) === 'admin' && author.id === admin.id;
      }
      if (complaintIsCompleted && !isCompletionAudit) {
        throw new Error('Completed complaints are read-only.');
      }
    }
    const submittedAt = payload.submitted_at || payload.created_date || getTimestamp();
    const problemDefaults = {
      status: 'SUBMITTED',
      current_stage: 'SUBMITTED',
      submitted_at: submittedAt,
      current_stage_started_at: submittedAt,
      current_stage_deadline: '',
      overall_deadline: '',
      stage_history: [],
      deadline_status: '',
      escalation_level: 0,
      current_authority: 'Verification Officer',
      previous_authority: '',
      assigned_department: payload.department || '',
      assigned_officer: payload.assigned_to || '',
      assigned_at: payload.assigned_at || '',
      resolution_date: payload.resolution_date || '',
      resolution_proof: payload.resolution_proof || '',
      created_date: payload.created_date || getTimestamp(),
    };
    const item = {
      ...payload,
      ...problemDefaults,
      id: payload.id || makeId(entityName),
      created_date: payload.created_date || getTimestamp(),
      status: canonicalComplaintStatus(payload.status || problemDefaults.status),
      current_stage: collectionKey === 'problems' ? 'SUBMITTED' : payload.current_stage || problemDefaults.current_stage,
      problem_id: payload.problem_id || `PRB-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
    };
    if (collectionKey === 'problems') {
      item.submitted_at = payload.submitted_at || item.created_date;
      const settings = normalizeTimelineSettings(store.timelineSettings);
      item.current_stage_started_at = item.current_stage_started_at || item.submitted_at;
      item.stage_history = [makeStageRecord('SUBMITTED', item.current_stage_started_at, settings)].filter(Boolean);
      item.overall_deadline = getOverallDeadline(item.submitted_at, settings);
      item.current_stage_deadline = getComplaintStageDeadline(item, item.status, settings);
      item.deadline_status = '';
    }
    store[collectionKey] = [...(store[collectionKey] ?? []), item];
    writeJson(STORAGE_KEY, store);
    emitStoreChange(entityName);
    return item;
  },
  update: async (id, changes = {}) => {
    const store = await seedStore();
    const items = store[collectionKey] ?? [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`${entityName} not found`);
    }
    if (collectionKey === 'problems' && changes.status) {
      await requireAdminRole();
      const nextStatus = canonicalComplaintStatus(changes.status);
      const previousStatus = canonicalComplaintStatus(items[index].status);
      if (nextStatus === 'COMPLETED') {
        if (previousStatus !== 'RESOLVED') {
          throw new Error('A complaint must be Resolved before it can be Completed.');
        }
        const reason = getCompletionBlockReason(items[index]);
        if (reason) throw new Error(reason);
        const completed = archiveCompletedProblem(store, items[index]);
        writeJson(STORAGE_KEY, store);
        emitStoreChange(entityName);
        return completed;
      }
    }
    const safeChanges = { ...changes };
    if (collectionKey === 'problems') {
      [
        'status', 'stage_history', 'submitted_at', 'current_stage', 'current_stage_started_at',
        'current_stage_deadline', 'overall_deadline', 'deadline_status', 'deadline_escalated_for',
        'completed_at', 'archived_at', 'completion_validation_error', 'timeline_settings_version',
        'pending_action', 'pending_actions', 'pending_action_count',
      ].forEach((field) => delete safeChanges[field]);
    }
    const updated = { ...items[index], ...safeChanges, updated_date: getTimestamp() };
    if (collectionKey === 'problems' && changes.status) {
      const nextStatus = canonicalComplaintStatus(changes.status);
      const previousStatus = canonicalComplaintStatus(items[index].status);
      updated.status = nextStatus;
      updated.current_stage = nextStatus;
      if (nextStatus !== previousStatus) {
        const now = getTimestamp();
        const settings = normalizeTimelineSettings(store.timelineSettings);
        const history = Array.isArray(items[index].stage_history) ? [...items[index].stage_history] : [];
        const activeIndex = history.findIndex((entry) => entry.status === previousStatus && !entry.completed_at);
        if (activeIndex >= 0) history[activeIndex] = { ...history[activeIndex], completed_at: now };
        const nextRecord = makeStageRecord(nextStatus, now, settings);
        if (nextRecord) history.push(nextRecord);
        updated.stage_history = history;
        updated.current_stage_started_at = now;
        updated.current_stage_deadline = nextRecord?.deadline || '';
        updated.overall_deadline = getOverallDeadline(updated.submitted_at || updated.created_date, settings);
        updated.deadline_status = '';
        updated.deadline_escalated_for = '';
        updated.completion_validation_error = '';
      }
    }
    items[index] = updated;
    store[collectionKey] = items;
    writeJson(STORAGE_KEY, store);
    emitStoreChange(entityName);
    return updated;
  },
  bulkCreate: async (items = []) => {
    if (collectionKey === 'problems') {
      throw new Error('Complaints must be created through the validated submission flow.');
    }
    const store = await seedStore();
    const created = items.map((entry) => ({
      ...entry,
      id: entry.id || makeId(entityName),
      created_date: entry.created_date || getTimestamp(),
    }));
    store[collectionKey] = [...(store[collectionKey] ?? []), ...created];
    writeJson(STORAGE_KEY, store);
    emitStoreChange(entityName);
    return created;
  },
  bulkUpdate: async (items = []) => {
    if (collectionKey === 'problems' && items.some((entry) => entry.status)) await requireAdminRole();
    const store = await seedStore();
    const nextList = [...(store[collectionKey] ?? [])];
    const completedItems = [];
    for (const entry of items) {
      const index = nextList.findIndex((item) => item.id === entry.id);
      if (index >= 0) {
        const safeEntry = { ...entry };
        if (collectionKey === 'problems') {
          [
            'status', 'stage_history', 'submitted_at', 'current_stage', 'current_stage_started_at',
            'current_stage_deadline', 'overall_deadline', 'deadline_status', 'deadline_escalated_for',
            'completed_at', 'archived_at', 'completion_validation_error', 'timeline_settings_version',
            'pending_action', 'pending_actions', 'pending_action_count',
          ].forEach((field) => delete safeEntry[field]);
        }
        const nextItem = { ...nextList[index], ...safeEntry, updated_date: getTimestamp() };
        if (collectionKey === 'problems' && entry.status) {
          const nextStatus = canonicalComplaintStatus(entry.status);
          const previousStatus = canonicalComplaintStatus(nextList[index].status);
          if (nextStatus === 'COMPLETED') {
            if (previousStatus !== 'RESOLVED') {
              throw new Error('A complaint must be Resolved before it can be Completed.');
            }
            const reason = getCompletionBlockReason(nextList[index]);
            if (reason) throw new Error(reason);
            completedItems.push(makeCompletedProblemRecord(nextList[index]));
            nextList.splice(index, 1);
            continue;
          }
          nextItem.status = nextStatus;
          nextItem.current_stage = nextStatus;
          if (nextStatus !== previousStatus) {
            const now = getTimestamp();
            const settings = normalizeTimelineSettings(store.timelineSettings);
            const history = Array.isArray(nextList[index].stage_history) ? [...nextList[index].stage_history] : [];
            const activeIndex = history.findIndex((stage) => stage.status === previousStatus && !stage.completed_at);
            if (activeIndex >= 0) history[activeIndex] = { ...history[activeIndex], completed_at: now };
            const nextRecord = makeStageRecord(nextStatus, now, settings);
            if (nextRecord) history.push(nextRecord);
            nextItem.stage_history = history;
            nextItem.current_stage_started_at = now;
            nextItem.current_stage_deadline = nextRecord?.deadline || '';
            nextItem.overall_deadline = getOverallDeadline(nextItem.submitted_at || nextItem.created_date, settings);
            nextItem.deadline_status = '';
            nextItem.deadline_escalated_for = '';
            nextItem.completion_validation_error = '';
          }
        }
        nextList[index] = nextItem;
      }
    }
    store[collectionKey] = nextList;
    if (collectionKey === 'problems' && completedItems.length) {
      store.completedProblems = [
        ...(store.completedProblems ?? []).filter((entry) => !completedItems.some((completed) => completed.id === entry.id)),
        ...completedItems,
      ];
    }
    writeJson(STORAGE_KEY, store);
    emitStoreChange(entityName);
    return nextList;
  },
  delete: async (id) => {
    if (collectionKey !== 'problems') throw new Error(`${entityName} cannot be deleted through this collection.`);
    await requireAdminRole();
    const store = await seedStore();
    const archived = (store.completedProblems ?? []).find((item) => item.id === id);
    if (archived) return archived;
    const problem = (store.problems ?? []).find((item) => item.id === id);
    if (!problem) return null;
    if (canonicalComplaintStatus(problem.status) !== 'COMPLETED') {
      throw new Error('Only a fully completed complaint can be removed from the active list.');
    }
    const reason = getCompletionBlockReason(problem);
    if (reason) throw new Error(reason);
    const completed = archiveCompletedProblem(store, problem);
    writeJson(STORAGE_KEY, store);
    emitStoreChange(entityName);
    return completed;
  },
  subscribe: (callback) => {
    if (typeof window === 'undefined') {
      return () => {};
    }
    const handler = (event) => callback?.(event.detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  },
});

const getAuthenticatedUser = async () => {
  const auth = parseJson(AUTH_KEY, null);
  if (!auth || !auth.userId) return null;
  const store = await seedStore();
  return (store.users ?? []).find((user) => user.id === auth.userId) || null;
};

const persistAuthenticatedUser = (user) => {
  if (!user) {
    writeJson(AUTH_KEY, null);
    appParams.setToken(null);
    return;
  }
  const normalizedUser = { ...user, role: normalizeRole(user.role) };
  writeJson(AUTH_KEY, { userId: normalizedUser.id, token: normalizedUser.id });
  appParams.setToken(normalizedUser.id);
};

let googleIdentityLoadPromise = null;

const loadGoogleIdentityScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google authentication is only available in the browser.'));
  }

  if (window.google && window.google.accounts && window.google.accounts.id) {
    return Promise.resolve(window.google);
  }

  if (!googleIdentityLoadPromise) {
    googleIdentityLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-identity]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load Google authentication.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-google-identity', 'true');
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Unable to load Google authentication.'));
      document.head.appendChild(script);
    });
  }

  return googleIdentityLoadPromise;
};

const ensureGoogleReady = async () => {
  const googleApi = await loadGoogleIdentityScript();
  if (!googleApi || !googleApi.accounts || !googleApi.accounts.oauth2) {
    throw new Error('Google sign-in is not available right now. Please try again.');
  }
  return googleApi;
};

const requireAdminRole = async () => {
  const user = await getAuthenticatedUser();
  if (!user || normalizeRole(user.role) !== 'admin') {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
  return user;
};

const auth = {
  me: async () => {
    const user = await getAuthenticatedUser();
    if (!user) {
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }
    return user;
  },
  requireAdmin: requireAdminRole,
  loginViaEmailPassword: async (email, password) => {
    const store = await seedStore();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const match = (store.users ?? []).find((user) => user.email.toLowerCase() === normalizedEmail);
    if (!match) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    const valid = await passwordMatches(password, match.password);
    if (!valid) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    const user = { ...match, role: normalizeRole(match.role) };
    persistAuthenticatedUser(user);
    return user;
  },
  register: async ({ email, password }) => {
    const value = String(email || '').trim();
    const store = await seedStore();
    if (!value || !password) {
      throw new Error('Email and password are required');
    }
    const existing = (store.users ?? []).find((user) => user.email.toLowerCase() === value.toLowerCase());
    if (existing) {
      throw new Error('An account with that email already exists');
    }
    const user = {
      id: makeId('user'),
      email: value,
      password: await hashPassword(password),
      role: 'citizen',
      full_name: value.split('@')[0],
      phone_number: '',
      created_date: getTimestamp(),
    };
    store.users = [...(store.users ?? []), user];
    writeJson(STORAGE_KEY, store);
    persistAuthenticatedUser(user);
    return { success: true, access_token: user.id, user };
  },
  verifyOtp: async ({ email, otpCode }) => {
    const pending = parseJson(PENDING_REGISTRATION_KEY, null);
    if (!pending) {
      throw new Error('No pending registration found');
    }
    const supplied = String(otpCode || '').trim();
    const target = String(email || '').trim();
    if (pending.email.toLowerCase() !== target.toLowerCase() || pending.otp !== supplied) {
      throw new Error('Invalid verification code');
    }
    const store = await seedStore();
    const user = {
      id: makeId('user'),
      email: pending.email,
      password: pending.password,
      role: 'citizen',
      full_name: pending.email.split('@')[0],
      phone_number: '',
      created_date: getTimestamp(),
    };
    store.users = [...(store.users ?? []), user];
    writeJson(STORAGE_KEY, store);
    writeJson(PENDING_REGISTRATION_KEY, null);
    persistAuthenticatedUser(user);
    return { access_token: user.id, user };
  },
  resendOtp: async (email) => {
    const value = String(email || '').trim();
    const pending = parseJson(PENDING_REGISTRATION_KEY, null);
    if (!pending || pending.email.toLowerCase() !== value.toLowerCase()) {
      throw new Error('Registration request not found');
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    writeJson(PENDING_REGISTRATION_KEY, { ...pending, otp });
    return { success: true, otp };
  },
  updateMe: async (updates = {}) => {
    const user = await getAuthenticatedUser();
    if (!user) {
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }
    const store = await seedStore();
    const nextUsers = [...(store.users ?? [])];
    for (const [index, entry] of nextUsers.entries()) {
      if (entry.id !== user.id) continue;
      const nextUser = { ...entry, ...updates };
      if (updates.role) nextUser.role = normalizeRole(updates.role);
      if (updates.password) nextUser.password = await hashPassword(updates.password);
      nextUsers[index] = nextUser;
    }
    store.users = nextUsers;
    writeJson(STORAGE_KEY, store);
    const refreshed = nextUsers.find((entry) => entry.id === user.id);
    persistAuthenticatedUser(refreshed);
    return refreshed;
  },
  logout: (redirectUrl) => {
    persistAuthenticatedUser(null);
    if (typeof window !== 'undefined') {
      if (redirectUrl && !redirectUrl.includes('/login')) {
        window.location.assign('/login');
      } else if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
  },
  redirectToLogin: (redirectUrl) => {
    if (typeof window !== 'undefined') {
      const next = redirectUrl && redirectUrl.includes('/login') ? redirectUrl : `/login?returnTo=${encodeURIComponent(redirectUrl || '/dashboard')}`;
      window.location.assign(next);
    }
  },
  resetPasswordRequest: async (email) => {
    const value = String(email || '').trim();
    const store = await seedStore();
    const user = (store.users ?? []).find((entry) => entry.email.toLowerCase() === value.toLowerCase());
    if (!user) {
      throw new Error('No account found for that email');
    }
    const token = makeId('reset').slice(0, 12).toUpperCase();
    writeJson(`${STORAGE_KEY}:reset-token`, { email: value, token });
    return { success: true, resetToken: token };
  },
  resetPassword: async ({ resetToken, newPassword }) => {
    const tokenRecord = parseJson(`${STORAGE_KEY}:reset-token`, null);
    if (!tokenRecord || tokenRecord.token !== String(resetToken || '').trim()) {
      throw new Error('Invalid or expired reset token');
    }
    const store = await seedStore();
    const index = (store.users ?? []).findIndex((entry) => entry.email.toLowerCase() === tokenRecord.email.toLowerCase());
    if (index < 0) {
      throw new Error('User not found');
    }
    store.users[index].password = await hashPassword(newPassword);
    writeJson(STORAGE_KEY, store);
    writeJson(`${STORAGE_KEY}:reset-token`, null);
    return { success: true };
  },
  loginWithProvider: async (provider, redirectTo = '/dashboard') => {
    const adminConfig = readAdminConfig();
    const store = await seedStore();

    if (provider === 'google') {
      const { clientId } = readGoogleConfig();
      if (!clientId || isPlaceholderGoogleClientId(clientId)) {
        const error = new Error('Google sign-in is not configured. Set a real VITE_GOOGLE_CLIENT_ID in your .env file for the OAuth client created in Google Cloud Console.');
        error.type = 'google_config_missing';
        throw error;
      }

      const googleApi = await ensureGoogleReady();
      const accessToken = await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback) => (response) => {
          if (settled) return;
          settled = true;
          callback(response);
        };

        const tokenClient = googleApi.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: finish((response) => {
            if (response?.access_token) resolve(response.access_token);
            else reject(new Error('Google sign-in was cancelled.'));
          }),
          error_callback: finish((error) => {
            reject(new Error(error?.type === 'popup_failed_to_open'
              ? 'Google sign-in popup was blocked. Please allow popups and try again.'
              : 'Google sign-in was cancelled.'));
          }),
        });

        try {
          tokenClient.requestAccessToken({ prompt: 'select_account' });
        } catch {
          reject(new Error('Unable to open Google sign-in. Please allow popups and try again.'));
        }
      });

      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!profileResponse.ok) {
        throw new Error('Unable to read your Google account information.');
      }
      const payload = await profileResponse.json();
      const email = String(payload?.email || '').trim().toLowerCase();
      if (!email) {
        throw new Error('Unable to read your Google account information.');
      }

      const policyRole = email.toLowerCase() === adminConfig.email.toLowerCase() ? 'admin' : 'citizen';
      const existing = (store.users ?? []).find((user) => user.email.toLowerCase() === email);

      const user = existing ?? {
        id: makeId('user'),
        email,
        password: await hashPassword(`google:${payload?.sub || email}`),
        role: policyRole,
        full_name: payload?.name || email.split('@')[0],
        phone_number: '',
        provider: 'google',
        provider_id: payload?.sub || '',
        created_date: getTimestamp(),
      };

      if (existing) {
        user.role = normalizeRole(existing.role === 'admin' || email === adminConfig.email.toLowerCase() ? 'admin' : 'citizen');
      }

      if (!existing) {
        store.users = [...(store.users ?? []), user];
      } else {
        const index = (store.users ?? []).findIndex((entry) => entry.id === existing.id);
        if (index >= 0) {
          store.users[index] = {
            ...existing,
            full_name: payload?.name || existing.full_name || email.split('@')[0],
            provider: 'google',
            provider_id: payload?.sub || existing.provider_id || '',
            role: normalizeRole(email === adminConfig.email.toLowerCase() ? 'admin' : existing.role || 'citizen'),
          };
        }
      }

      writeJson(STORAGE_KEY, store);
      persistAuthenticatedUser({ ...user, role: normalizeRole(user.role) });
      if (typeof window !== 'undefined') {
        window.location.assign(redirectTo || '/dashboard');
      }
      return { ...user, role: normalizeRole(user.role) };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  },
};

const users = {
  inviteUser: async (email, role = 'citizen') => {
    const value = String(email || '').trim();
    const store = await seedStore();
    if (!value) {
      throw new Error('Email is required');
    }
    if ((store.users ?? []).some((user) => user.email.toLowerCase() === value.toLowerCase())) {
      return (store.users ?? []).find((user) => user.email.toLowerCase() === value.toLowerCase());
    }
    const newUser = {
      id: makeId('user'),
      email: value,
      password: await hashPassword('temporary-password'),
      role: normalizeRole(role),
      full_name: value.split('@')[0],
      phone_number: '',
      created_date: getTimestamp(),
    };
    store.users = [...(store.users ?? []), newUser];
    writeJson(STORAGE_KEY, store);
    emitStoreChange('user');
    return newUser;
  },
};

const timelineSettings = {
  get: async () => (await seedStore()).timelineSettings,
  update: async (settings = {}) => {
    await requireAdminRole();
    const stages = Array.isArray(settings.stages) ? settings.stages : [];
    for (const stage of COMPLAINT_STAGE_SEQUENCE) {
      const configured = stages.find((entry) => entry.status === stage.status);
      if (!configured || !Number.isInteger(Number(configured.durationDays)) || Number(configured.durationDays) <= 0) {
        throw new Error(`Enter a positive whole number of days for ${stage.label}.`);
      }
    }
    if (!stages.some((stage) => stage.enabled !== false)) {
      throw new Error('At least one timeline stage must remain enabled.');
    }
    const store = await seedStore();
    store.timelineSettings = normalizeTimelineSettings(settings);
    writeJson(STORAGE_KEY, store);
    emitStoreChange('timelineSettings');
    return store.timelineSettings;
  },
  reset: async () => {
    await requireAdminRole();
    const store = await seedStore();
    store.timelineSettings = createDefaultTimelineSettings();
    writeJson(STORAGE_KEY, store);
    emitStoreChange('timelineSettings');
    return store.timelineSettings;
  },
};

const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      if (!file) {
        return { file_url: '' };
      }
      if (typeof window !== 'undefined' && typeof window.URL !== 'undefined' && window.URL.createObjectURL) {
        return { file_url: window.URL.createObjectURL(file) };
      }
      return { file_url: `data:${file.type || 'image/png'};base64,` };
    },
  },
};

export const base44 = {
  auth,
  timelineSettings,
  entities: {
    User: createEntityCollection('users', 'user'),
    Problem: createEntityCollection('problems', 'problem'),
    ProblemUpdate: createEntityCollection('problemUpdates', 'problemUpdate'),
    Notification: createEntityCollection('notifications', 'notification'),
    Department: createEntityCollection('departments', 'department'),
    EscalationHistory: createEntityCollection('escalations', 'escalation'),
  },
  users,
  integrations,
};

export { appParams };
