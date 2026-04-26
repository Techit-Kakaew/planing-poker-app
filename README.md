# 🃏 Planning Poker App

A high-performance, real-time Agile estimation tool built for modern development teams. This application facilitates remote sprint planning with a leader-driven workflow, Jira integration, and automated session summaries.

---

## 🚀 Key Features

### 👑 Leader-Driven Facilitation

- **Room Ownership**: Only the Room Leader can add/edit/delete tasks, reveal votes, and reset sessions.
- **Sync Control**: The leader's selected task is automatically highlighted for all participants, keeping the team focused.
- **Leadership Transfer**: Easily handover the lead role to any active participant.

### 🔗 Professional Jira Integration

- **Auto-Linking**: Task titles containing Jira IDs (e.g., `LP-1234`) are automatically transformed into functional external links.
- **Deep Linking**: Share specific tasks via URL query strings (`?task=UUID`) for instant collaboration.

### ⚡ Real-Time Collaboration

- **Live Voting**: Powered by Supabase Realtime for sub-second sync across all clients.
- **Presence Sync**: See exactly who is online and who is still "thinking" in real-time.
- **Locked Voting**: Votes are frozen once results are revealed to prevent "after-the-fact" changes.

### 📊 Session Lifecycle & History

- **Dashboard**: Track active rooms you're part of and browse completed session history.
- **Summary Reports**: Automated summary pages featuring final task scores, participant lists, and export options.
- **Smooth UX**: Optimistic updates for task scoring to ensure a lag-free experience.

---

## 🛠️ Tech Stack

- **Core**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Backend/Realtime**: [Supabase](https://supabase.com/) (Auth, Database, Realtime)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)

---

## ⚙️ Project Setup

### 1. Environment Variables

Create a `.env` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

ATLASSIAN_CLIENT_ID=your_atlassian_oauth_client_id
ATLASSIAN_CLIENT_SECRET=your_atlassian_oauth_client_secret
ATLASSIAN_REDIRECT_URI=http://localhost:5173/api/jira/callback
JIRA_TOKEN_ENCRYPTION_KEY=your_long_random_secret_or_64_char_hex
```

### 2. Supabase Configuration

Enable **Google Auth** in your Supabase project under `Authentication > Providers`. Ensure the site URL matches your deployment/local URL.

### 3. Database Schema

Run the following SQL in the Supabase SQL Editor to set up the required tables:

```sql
-- Rooms Table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  current_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tasks Table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  revealed BOOLEAN DEFAULT FALSE,
  has_jira_detail BOOLEAN DEFAULT FALSE,
  final_score VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes Table
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  avatar_url TEXT,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Jira Connections Table
CREATE TABLE jira_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  accessible_resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_cloud_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared Task Issue Detail Snapshots
CREATE TABLE task_issue_details (
  task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'jira',
  issue_key TEXT NOT NULL,
  issue_url TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT,
  issue_type TEXT,
  priority TEXT,
  assignee TEXT,
  reporter TEXT,
  labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_created_at TIMESTAMP WITH TIME ZONE,
  source_updated_at TIMESTAMP WITH TIME ZONE,
  parent JSONB,
  description_html TEXT,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.1 Atlassian OAuth Setup

Create an OAuth 2.0 (3LO) app in the Atlassian developer console and add the same callback URL you place in `ATLASSIAN_REDIRECT_URI`.

This app now includes:

- Manual task creation
- Jira issue import via `Import Jira`
- Per-user Jira connections stored server-side

Atlassian calls should be made through `api.atlassian.com` using OAuth 3LO and the selected site `cloudId`.

If you already created the original `tasks` table before Jira support was added, run this migration too:

```sql
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS has_jira_detail BOOLEAN DEFAULT FALSE;

ALTER TABLE task_issue_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read shared task issue details"
ON task_issue_details
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert shared task issue details"
ON task_issue_details
FOR INSERT
TO authenticated
WITH CHECK (true);
```

### 4. Installation & Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

## Jira Import Flow

- Leaders can still create tasks manually as before.
- Leaders can also connect their Atlassian account and import multiple Jira issues from a modal in the task list.
- Imported issues are saved as normal planning tasks in the format `ABC-123: Issue summary`, so existing Jira deep links keep working.
- Imported Jira tasks also save a shared snapshot of issue details so everyone in the room can open task details while estimating, even if they did not connect Jira themselves.
- The Jira OAuth endpoints live under `api/` as Vercel Functions, so full OAuth testing should run through `vercel dev` or a deployed preview instead of the plain Vite dev server alone.

---

## 🛡️ Production Considerations

- **RLS Policies**: Ensure you implement Row Level Security (RLS) in Supabase to restrict table access based on `auth.uid()`.
- **Indexing**: Add indexes on `room_id` and `user_id` columns if you expect high traffic.
- **Exporting**: The summary page uses CSS `@media print` for high-quality PDF exports.

---

## 🎨 Aesthetic Design

The app is designed with a **Rich Glassmorphism** aesthetic, featuring:

- **Dynamic Dark Mode**: Native support for dark/light themes.
- **Micro-animations**: Smooth transitions for card reveals and status changes.
- **Premium UI**: Custom focus states, refined typography (Geist), and a layout prioritized for usability.

---

Developed with 🚀 for High-Performance Agile Teams.
