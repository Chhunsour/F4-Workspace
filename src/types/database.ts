// Minimal typed schema for the Supabase client. Add generated types later if you like;
// this hand-authored version is enough for typed queries in the app.

export type UUID = string
export type Iso  = string

export type AssignmentStatus = 'todo' | 'in_progress' | 'review' | 'completed'
export type Priority         = 'low' | 'normal' | 'high' | 'urgent'
export type ProjectStatus    = 'active' | 'on_hold' | 'completed' | 'archived'
export type ProjectRole      = 'owner' | 'editor' | 'member' | 'viewer'
export type GroupRole        = 'owner' | 'admin' | 'member'
export type TaskStatus       = 'todo' | 'in_progress' | 'review' | 'completed'

export interface Profile {
  id: UUID
  full_name: string | null
  university_id: string | null
  major: string | null
  year: number | null
  bio: string | null
  avatar_url: string | null
  weekly_goal_minutes: number
  created_at: Iso
  updated_at: Iso
}

export interface Subject {
  id: UUID
  owner_id: UUID
  group_id: UUID | null
  name: string
  code: string | null
  lecturer: string | null
  color: string
  icon: string | null
  created_at: Iso
  updated_at: Iso
}

export interface ClassSchedule {
  id: UUID
  owner_id: UUID
  subject_id: UUID | null
  weekday: number      // 0..6, 0 = Sunday
  start_time: string   // 'HH:MM:SS'
  end_time:   string
  room: string | null
  teacher: string | null
  notes: string | null
  created_at: Iso
  updated_at: Iso
}

export type AcademicEventType = 'exam' | 'final_exam' | 'presentation'

// One-time academic events (exams, finals, presentations). Weekly classes
// live in ClassSchedule; these are dated and overlay onto the timetable.
export interface AcademicEvent {
  id: UUID
  owner_id: UUID
  type: AcademicEventType
  title: string | null
  subject_id: UUID | null
  project_id: UUID | null
  event_date: string          // 'YYYY-MM-DD'
  start_time: string | null   // 'HH:MM:SS'
  end_time:   string | null
  room: string | null
  seat: string | null
  team_members: UUID[]
  notes: string | null
  reminder_at: Iso | null
  created_at: Iso
  updated_at: Iso
}

export interface Assignment {
  id: UUID
  owner_id: UUID
  subject_id: UUID | null
  title: string
  description: string | null
  due_date: string | null
  due_time: string | null
  priority: Priority
  status: AssignmentStatus
  progress: number
  completed_at: Iso | null
  attachments: unknown[]
  notes: string | null
  created_at: Iso
  updated_at: Iso
}

export interface Project {
  id: UUID
  owner_id: UUID
  group_id: UUID | null
  subject_id: UUID | null
  name: string
  description: string | null
  color: string | null
  deadline: string | null
  status: ProjectStatus
  progress: number
  links: { label: string; url: string }[]
  created_at: Iso
  updated_at: Iso
}

export interface ProjectMember {
  project_id: UUID
  user_id: UUID
  role: ProjectRole
  joined_at: Iso
}

export interface ProjectTask {
  id: UUID
  project_id: UUID
  owner_id: UUID
  assignee_id: UUID | null
  title: string
  description: string | null
  status: TaskStatus
  position: number
  due_date: string | null
  checklist: { id: string; text: string; done: boolean }[]
  created_at: Iso
  updated_at: Iso
}

export interface Memory {
  id: UUID
  owner_id: UUID
  group_id: UUID | null
  subject_id: UUID | null
  title: string | null
  caption: string | null
  event_date: string | null
  album: string | null
  tagged_users: UUID[]
  is_favorite: boolean
  created_at: Iso
  updated_at: Iso
}

export interface MemoryImage {
  id: UUID
  memory_id: UUID
  storage_path: string
  width: number | null
  height: number | null
  size_bytes: number | null
  position: number
  created_at: Iso
}

export type CommentTarget  = 'assignment' | 'project' | 'project_task' | 'memory' | 'note'
export type ReactionTarget = 'memory' | 'comment' | 'project_task' | 'assignment'

export interface Comment {
  id: UUID
  owner_id: UUID
  target_type: CommentTarget
  target_id: UUID
  body: string
  created_at: Iso
  updated_at: Iso
}

export interface Reaction {
  id: UUID
  owner_id: UUID
  target_type: ReactionTarget
  target_id: UUID
  emoji: string
  created_at: Iso
}

export interface StudySession {
  id: UUID
  owner_id: UUID
  subject_id: UUID | null
  topic: string | null
  notes: string | null
  started_at: Iso
  ended_at: Iso | null
  duration_seconds: number
  is_focus_mode: boolean
  created_at: Iso
  updated_at: Iso
}

export interface Note {
  id: UUID
  owner_id: UUID
  subject_id: UUID | null
  project_id: UUID | null
  title: string | null
  body: string
  color: string | null
  tags: string[]
  is_pinned: boolean
  created_at: Iso
  updated_at: Iso
}

export interface Group {
  id: UUID
  name: string
  description: string | null
  join_code: string
  owner_id: UUID
  created_at: Iso
  updated_at: Iso
}

export interface GroupMember {
  group_id: UUID
  user_id: UUID
  role: GroupRole
  joined_at: Iso
}

export interface Notification {
  id: UUID
  user_id: UUID
  kind: string
  title: string
  body: string | null
  target_type: string | null
  target_id: UUID | null
  is_read: boolean
  created_at: Iso
}

// Rough Database shape for supabase-js typing.
// Each table carries `Relationships: []` so the schema satisfies supabase-js v2's
// GenericTable constraint (without it, insert/update args infer to `never`).
type Rel = []

export interface Database {
  public: {
    Tables: {
      profiles:        { Row: Profile;        Insert: Partial<Profile>       & { id: UUID };       Update: Partial<Profile>;       Relationships: Rel }
      subjects:        { Row: Subject;        Insert: Partial<Subject>       & { owner_id: UUID; name: string }; Update: Partial<Subject>;       Relationships: Rel }
      class_schedules: { Row: ClassSchedule;  Insert: Partial<ClassSchedule> & { owner_id: UUID; weekday: number; start_time: string; end_time: string }; Update: Partial<ClassSchedule>; Relationships: Rel }
      academic_events: { Row: AcademicEvent;  Insert: Partial<AcademicEvent> & { owner_id: UUID; type: AcademicEventType; event_date: string }; Update: Partial<AcademicEvent>; Relationships: Rel }
      assignments:     { Row: Assignment;     Insert: Partial<Assignment>    & { owner_id: UUID; title: string }; Update: Partial<Assignment>;    Relationships: Rel }
      projects:        { Row: Project;        Insert: Partial<Project>       & { owner_id: UUID; name: string }; Update: Partial<Project>;       Relationships: Rel }
      project_members: { Row: ProjectMember;  Insert: Partial<ProjectMember> & { project_id: UUID; user_id: UUID }; Update: Partial<ProjectMember>; Relationships: Rel }
      project_tasks:   { Row: ProjectTask;    Insert: Partial<ProjectTask>   & { project_id: UUID; owner_id: UUID; title: string }; Update: Partial<ProjectTask>; Relationships: Rel }
      memories:        { Row: Memory;         Insert: Partial<Memory>        & { owner_id: UUID }; Update: Partial<Memory>;        Relationships: Rel }
      memory_images:   { Row: MemoryImage;    Insert: Partial<MemoryImage>   & { memory_id: UUID; storage_path: string }; Update: Partial<MemoryImage>; Relationships: Rel }
      comments:        { Row: Comment;        Insert: Partial<Comment>       & { owner_id: UUID; target_type: CommentTarget; target_id: UUID; body: string }; Update: Partial<Comment>; Relationships: Rel }
      reactions:       { Row: Reaction;       Insert: Partial<Reaction>      & { owner_id: UUID; target_type: ReactionTarget; target_id: UUID; emoji: string }; Update: Partial<Reaction>; Relationships: Rel }
      study_sessions:  { Row: StudySession;   Insert: Partial<StudySession>  & { owner_id: UUID }; Update: Partial<StudySession>;  Relationships: Rel }
      notes:           { Row: Note;           Insert: Partial<Note>          & { owner_id: UUID }; Update: Partial<Note>;          Relationships: Rel }
      groups:          { Row: Group;          Insert: Partial<Group>         & { owner_id: UUID; name: string }; Update: Partial<Group>;         Relationships: Rel }
      group_members:   { Row: GroupMember;    Insert: Partial<GroupMember>   & { group_id: UUID; user_id: UUID }; Update: Partial<GroupMember>;   Relationships: Rel }
      notifications:   { Row: Notification;   Insert: Partial<Notification>  & { user_id: UUID; kind: string; title: string }; Update: Partial<Notification>; Relationships: Rel }
    }
    Views:     Record<string, never>
    Functions: {
      seed_defaults_for:  { Args: { uid: UUID };   Returns: undefined }
      join_group_by_code: { Args: { code: string }; Returns: Group }
    }
    Enums:     Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
