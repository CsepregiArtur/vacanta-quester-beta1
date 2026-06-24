/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Child {
  id: string; // "dominic" | "sofia"
  name: string;
  age: number;
  points: number;
  avatar: string;
  readingStreak: number;
  daysSinceLastReading: number; // For forcing reading on 4th day
  claimedStreakMilestones?: string[];
  activeTimer: {
    rewardId: string;
    rewardName: string;
    startedAt: string;
    expiresAt: string;
    durationMinutes: number;
    minutesLeft: number;
    isActive: boolean;
  } | null;
}

export type TaskStatus = "pending" | "submitted" | "approved" | "rejected";

export interface ActiveTask {
  id: string;
  childId: string;
  name: string;
  type: "reading" | "dog_walk" | "chore" | "custom";
  description: string;
  points: number;
  status: TaskStatus;
  completedAt?: string;
  photoUrl?: string; // base64 representation or mock path
  
  // Specific for reading task
  readingTopic?: string;
  readingPassage?: string;
  difficultyClass?: string;
  readingQuestions?: {
    id: number;
    question: string;
    options: string[];
    correctAnswerIndex: number;
    selectedAnswerIndex?: number;
    feedback?: string;
  }[];
  readingScore?: number; // how many questions got correct
  
  // Specific for dog walk task
  walkTimeSlot?: "morning" | "midday" | "evening";

  // Specific for chore verification
  choreFeedback?: string;

  // Task Category & Streak properties
  category?: "Educational" | "Physical Activity" | "Household" | "Other" | "lectură" | "sport" | "STEM" | "robotică" | "LEGO" | "natură";
  streak?: number;
}

export interface StoreReward {
  id: string;
  name: string;
  costPoints: number;
  durationMinutes: number;
  icon: string;
  entityId?: string; // Home Assistant entity or switch or helper input_boolean
}

export interface HomeAssistantConfig {
  url: string;
  token: string;
  enabled: boolean;
  tvEntityId?: string;
  xboxEntityId?: string;
}

export interface ParentNotification {
  id: string;
  childName: string;
  message: string;
  timestamp: string;
  type: "info" | "success" | "warning";
}

export interface NextDayTopicProposal {
  childId: string;
  topic: string;
  customPrompt?: string;
  customQuestions?: string; // user-entered custom questions
  approved: boolean; // if true, it is locked in for tomorrow
}

export interface ChildSuggestion {
  id: string;
  childId: string;
  childName: string;
  type: "activity" | "reward" | "cashout" | "other";
  title: string;
  description: string;
  proposedPointsOrCost?: number;
  proposedDurationMinutes?: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  adminFeedback?: string;
}

export interface ScreenTimeRequest {
  id: string;
  childId: string;
  childName: string;
  rewardId: string;
  rewardName: string;
  durationMinutes: number;
  timestamp: string;
  status: "pending" | "fulfilled";
  confirmedAt?: string;
  costPoints: number;
  pointsDebited?: boolean;
}

export interface UploadedPhotoResult {
  id: string;
  childId: string;
  childName: string;
  activityName: string;
  photoUrl: string;
  timestamp: string;
  status: "approved" | "rejected" | "submitted";
  feedback: string;
}

export interface AppState {
  children: Child[];
  activeTasks: ActiveTask[];
  notifications: ParentNotification[];
  topicProposals: NextDayTopicProposal[];
  suggestions: ChildSuggestion[];
  screenTimeRequests?: ScreenTimeRequest[];
  uploadedPhotosHistory?: UploadedPhotoResult[];
  customRewards?: StoreReward[];
  homeAssistant: HomeAssistantConfig;
  dogWalkStatus: {
    morning: { childId: string | null; time: string | null; photoUrl?: string; feedback?: string; approved?: boolean };
    midday: { childId: string | null; time: string | null; photoUrl?: string; feedback?: string; approved?: boolean };
    evening: { childId: string | null; time: string | null; photoUrl?: string; feedback?: string; approved?: boolean };
  };
  tomorrowSchedule?: Record<string, {
    app: string;
    durationMinutes: number;
    reason: string;
  } | null>;
  parentPin?: string;
  parentEmail?: string;
  emailsSent?: any[];
  readingHistory?: any[];
  pointsHistory?: {
    date: string;
    dateKey: string;
    dominic: number;
    sofia: number;
  }[];
  activityTimeLogs?: {
    id: string;
    childId: string;
    childName: string;
    activityType: "reading" | "quiz" | "dog_walk" | "chore" | "custom" | "store_spend";
    activityName: string;
    durationSeconds: number;
    timestamp: string;
    details?: string;
  }[];
  smtpConfig?: {
    enabled: boolean;
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
  };
  lastUpdated?: string;
}
