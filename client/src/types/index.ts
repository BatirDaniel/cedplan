export type UserStatus = 0 | 1 | 2 | 3 | 4; // Available, Away, Busy, DoNotDisturb, Offline
export const UserStatusValues: UserStatus[] = [0, 1, 2, 3, 4];

/** Workspace-wide role — distinct from the per-project ProjectRole. */
export type SystemRole = 0 | 1 | 2; // Member, Manager, Admin
export const SystemRoleValues: SystemRole[] = [0, 1, 2];

export interface User {
  id: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  location?: string | null;
  bio?: string | null;
  avatarColor: string;
  status: UserStatus;
  statusMessage?: string | null;
  preferredLanguage: string;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: number;
  defaultView: 'list' | 'board' | 'gantt';
  showCompletedTasks: boolean;
  confirmBeforeDelete: boolean;
  autoFollowCreatedTasks: boolean;
  autoFollowAssignedTasks: boolean;
  defaultCalendarView: 'month' | 'week' | 'day';
  defaultEventDurationMinutes: number;
  role: SystemRole;
  isAdmin: boolean;
}

export interface WorkingHours {
  workingDays: string;
  workStartTime: string;
  workEndTime: string;
  workBreakStart?: string | null;
  workBreakEnd?: string | null;
}

export interface NotificationChannels {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export interface NotificationPreferences {
  types: Record<string, NotificationChannels>;
  digest: 'none' | 'daily' | 'weekly';
  quietHoursEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface UserSession {
  id: string;
  browser?: string | null;
  operatingSystem?: string | null;
  device?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  identifier: string;
  description?: string | null;
  color: string;
  isArchived: boolean;
  createdAt: string;
  memberCount: number;
  workPackageCount: number;
  openWorkPackageCount: number;
}

export type ProjectRole = 0 | 1 | 2 | 3; // Viewer, Member, Admin, Owner

export interface ProjectMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarColor: string;
  role: ProjectRole;
}

export type WorkPackageType = 0 | 1 | 2 | 3 | 4; // Task, Bug, Feature, Milestone, Epic

export type WorkPackageStatus = 0 | 1 | 2 | 3 | 4 | 5; // New, InProgress, InReview, OnHold, Closed, Rejected
export const WorkPackageStatusOrder: WorkPackageStatus[] = [0, 1, 2, 3, 4, 5];

export type WorkPackagePriority = 0 | 1 | 2 | 3; // Low, Normal, High, Immediate

export interface Assignee {
  id: string;
  fullName: string;
  avatarColor: string;
}

export interface WorkPackage {
  id: string;
  projectId: string;
  sequence: number;
  subject: string;
  description?: string | null;
  type: WorkPackageType;
  status: WorkPackageStatus;
  priority: WorkPackagePriority;
  parentId?: string | null;
  parentSubject?: string | null;
  authorId: string;
  authorName: string;
  assignees: Assignee[];
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  percentDone: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  loggedHours: number;
}

export type CalendarEventType = 0 | 1 | 2 | 3; // Meeting, Deadline, Reminder, Other
export type AttendeeResponse = 0 | 1 | 2 | 3; // NoResponse, Accepted, Declined, Tentative

export interface CalendarAttendee {
  userId: string;
  fullName: string;
  avatarColor: string;
  response: AttendeeResponse;
  isOptional: boolean;
}

export interface CalendarEvent {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  projectIdentifier: string;
  title: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  type: CalendarEventType;
  isAllDay: boolean;
  startsAt: string;
  endsAt: string;
  workPackageId?: string | null;
  workPackageSubject?: string | null;
  color?: string | null;
  createdById: string;
  createdByName: string;
  attendees: CalendarAttendee[];
  createdAt: string;
  updatedAt: string;
}

/** A task flattened for the calendar/backlog views — carries its project so the global view can show/color it. */
export interface CalendarTask {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  projectIdentifier: string;
  sequence: number;
  subject: string;
  type: WorkPackageType;
  status: WorkPackageStatus;
  priority: WorkPackagePriority;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  percentDone: number;
  assignees: Assignee[];
}

export interface CalendarFeed {
  events: CalendarEvent[];
  tasks: CalendarTask[];
}

export interface Comment {
  id: string;
  workPackageId: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  text: string;
  imageUrl?: string | null;
  mentionedUserIds: string[];
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  workPackageId: string;
  workPackageSubject: string;
  userId: string;
  userName: string;
  hours: number;
  spentOn: string;
  comment?: string | null;
  createdAt: string;
}

export type WikiNodeType = 0 | 1; // Folder, Page

export interface WikiPage {
  id: string;
  projectId: string;
  nodeType: WikiNodeType;
  parentId: string | null;
  position: number;
  title: string;
  slug: string;
  content: string;
  createdById: string;
  createdByName: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
}
