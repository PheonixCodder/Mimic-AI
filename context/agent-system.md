# AI Agent Co-Pilot System

**Last Updated:** 2026-06-24
**Status:** Production-Ready (Deployed on Vercel)

## Overview

The **AI Agent Co-Producer** is a full-featured, conversational AI assistant integrated into Mimic-AI that acts as a creative partner for users. It guides users through the entire video creation pipeline, from conceptualization to final export, using natural language understanding and intelligent tool orchestration.

### Core Value Proposition

- **Natural Language Interface**: Users describe what they want in plain English, and the agent translates it into actions
- **Context-Aware**: Understands project context, user preferences, and previous interactions
- **Tool Orchestration**: Intelligently uses 35+ specialized AI elements to accomplish tasks
- **Real-Time Collaboration**: Streaming responses with reasoning visibility
- **Human-in-the-Loop**: Supports approval gates and interruptible workflows

### Positioning

The Co-Producer is **not** just a chatbot — it's a domain-specific AI system that:
- Knows about video production workflows
- Understands Mimic-AI's capabilities and limitations
- Can execute actions across the entire platform
- Maintains state and memory across sessions

---

## Architecture

### Component Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                              │
│  (features/agent/views/, components/ai-elements/)            │
├─────────────────────────────────────────────────────────────┤
│                   Agent Orchestrator                          │
│  (features/agent/lib/builder.ts)                             │
├─────────────────────────────────────────────────────────────┤
│                     Tools Layer                               │
│  (features/agent/lib/tools.ts) - 35+ AI Elements              │
├─────────────────────────────────────────────────────────────┤
│                    Memory System                               │
│  (features/agent/lib/memory.ts)                              │
├─────────────────────────────────────────────────────────────┤
│                    Deep Agents Integration                     │
│  (deep-agents/) - Managed via submodule                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Directories

| Directory | Purpose | Files |
|-----------|---------|-------|
| `features/agent/` | Main agent feature module | 17 files |
| `features/agent/config/` | Model configurations | models.ts |
| `features/agent/lib/` | Core agent logic | 8 files |
| `features/agent/views/` | React UI components | 7 files |
| `app/(dashboard)/dashboard/agent/` | Dashboard routes | 2 files |
| `app/api/agent/` | API endpoints | 2 files |
| `components/ai-elements/` | 35+ AI UI components | 35 files |
| `trpc/routers/agent.ts` | tRPC router | 1 file |
| `deep-agents/` | Deep Agents integration | (submodule) |

---

## Core Components

### 1. Agent Builder (`features/agent/lib/builder.ts`)

The central orchestrator that:
- Initializes the LangGraph agent with configured tools
- Manages message history and conversation state
- Handles streaming responses via SSE
- Implements resumption for interrupted workflows

**Key Features:**
- **Token Streaming**: Real-time token-by-token response streaming
- **Reasoning Visibility**: Exposes chain-of-thought to users (configurable)
- **Tool Execution**: Orchestrates 35+ AI element tools
- **State Management**: Maintains conversation context and memory

### 2. Tools Layer (`features/agent/lib/tools.ts`)

**35+ AI Element Tools** organized into categories:

#### Creation Tools
- `createVoice` - Clone a new voice from audio
- `createAvatar` - Generate a new avatar image
- `createScript` - Generate video script from prompt
- `createVideo` - Full video generation pipeline
- `createProject` - Create a new project container

#### Query Tools
- `listVoices` - List all voices in workspace
- `listAvatars` - List all avatars in workspace
- `listScripts` - List all scripts
- `listVideos` - List all videos
- `listProjects` - List all projects
- `listTemplates` - List all templates
- `searchBroll` - Search stock footage library

#### Management Tools
- `getVoice` - Get voice details
- `getAvatar` - Get avatar details
- `getScript` - Get script details
- `getVideo` - Get video details
- `updateVoice` - Update voice metadata
- `updateAvatar` - Update avatar metadata
- `deleteVoice` - Remove a voice
- `deleteAvatar` - Remove an avatar

#### AI Assistance Tools
- `generateScriptIdeas` - Brainstorm script concepts
- `improveScript` - Enhance existing scripts
- `summarizeVideo` - Summarize video content
- `translateScript` - Translate scripts
- `generateThumbnails` - Create video thumbnails

#### System Tools
- `getWorkspaceInfo` - Current workspace details
- `getUserProfile` - User information
- `getBillingStatus` - Subscription and credits
- `executeCustomPrompt` - Free-form AI assistance

### 3. Memory System (`features/agent/lib/memory.ts`)

**Multi-Layer Memory:**

```typescript
// Session Memory (short-term)
- Current conversation context
- Recent tool calls and results
- User's current intent

// Workspace Memory (medium-term)
- Workspace-specific preferences
- Common patterns and templates
- Brand guidelines (from Digital Twin Memory)

// User Memory (long-term)
- User preferences
- Speaking style and tone (Digital Twin)
- Personality profiles
```

**Implementation:**
- Uses InsForge database for persistent storage
- Indexed by workspace_id and user_id
- Supports retrieval augmentation for context

### 4. MCP Integration (`features/agent/lib/mcp.ts`)

**Model Context Protocol** for:
- Dynamic tool discovery
- Model provider abstraction
- Multi-provider support (OpenRouter, BYOK)

**Configured Providers:**
- **OpenRouter** (default) - Multi-model access
- **OpenAI** - Direct OpenAI API
- **Anthropic** - Claude models
- **Google** - Gemini models
- **Custom** - BYOK (Bring Your Own Key)

### 5. Streaming & SSE (`features/agent/lib/stream-sse.ts`)

**Real-Time Streaming Architecture:**

```
User Browser ←SSE→ Next.js API Route ←Stream→ LangGraph Agent
                                    ↓
                              Token-by-token transmission
                                    ↓
                              Real-time UI updates
```

**Features:**
- **Token Streaming**: Individual tokens as they're generated
- **Reasoning Streaming**: Full chain-of-thought visibility
- **Task Streaming**: Real-time tool execution updates
- **Resumption Support**: Mid-execution interruption and recovery

### 6. UI Components

#### Dashboard Views (`features/agent/views/`)

| Component | Purpose |
|-----------|---------|
| `agent-view.tsx` | Main chat container with sidebar and message list |
| `thread-sidebar.tsx` | Conversation history and thread management |
| `message-list.tsx` | Chat messages with reasoning and tool results |
| `chat-input.tsx` | Model selector, provider config, input area |
| `settings-panel.tsx` | Agent configuration (model, temperature, etc.) |
| `interrupt-wizard.tsx` | Human-in-the-loop approval dialogs |
| `agent-error-boundary.tsx` | Error handling for agent components |

#### AI Elements (`components/ai-elements/`)

**35+ Specialized Components** for rendering tool outputs:

**Media Components:**
- `audio-player.tsx` - Audio playback with waveform
- `image.tsx` - Image display with metadata
- `video-preview.tsx` - Video player with controls
- `web-preview.tsx` - Web page previews

**Code & Data:**
- `code-block.tsx` - Syntax-highlighted code
- `sources.tsx` - Source citations
- `snippet.tsx` - Code snippets
- `schema-display.tsx` - JSON schema visualization

**UI Feedback:**
- `shimmer.tsx` - Loading shimmer effects
- `reasoning.tsx` - Chain-of-thought display
- `task.tsx` - Task execution progress
- `checkpoint.tsx` - Workflow checkpoints
- `progress.tsx` - Progress indicators

**Structural:**
- `agent.tsx` - Agent message container
- `artifact.tsx` - Tool output artifacts
- `attachments.tsx` - File attachments
- `conversation.tsx` - Conversation wrapper
- `message.tsx` - Individual message
- `panel.tsx` - Panel container
- `context.tsx` - Context provider
- `controls.tsx` - Control buttons
- `toolbar.tsx` - Action toolbar

---

## Workflow

### User Journey

```
1. User navigates to /dashboard/agent
2. Agent greets with context-aware welcome message
3. User describes their video idea in natural language
   Example: "Create a tutorial video about React hooks with my voice"
4. Agent:
   a. Parses intent (tutorial, React hooks, user's voice)
   b. Checks workspace for existing voice
   c. If no voice: guides user to clone voice first
   d. Generates script outline
   e. Presents outline for approval
5. User approves or requests changes
6. Agent:
   a. Creates script in database
   b. Generates voice preview
   c. Suggests avatar or uses existing
   d. Provides cost estimate
7. User approves generation
8. Agent enqueues Trigger.dev job
9. Real-time progress updates via SSE
10. Final video ready for export
```

### Conversation Flow Example

**User:** "I want to create a video explaining how to use React useEffect"

**Agent:**
1. **Understands Intent**: Tutorial video about React useEffect
2. **Checks Prerequisites**: Verifies user has a cloned voice
3. **Generates Script**: Uses AI to create a comprehensive script
4. **Presents Options**: Shows script preview with suggestions
5. **Guides Through Pipeline**: Walks user through validation, preview, estimation
6. **Executes Generation**: Triggers the full generation pipeline
7. **Delivers Result**: Provides download link and analytics

---

## Features

### ✅ Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| Natural Language Understanding | ✅ | Understands video creation requests |
| Tool Orchestration | ✅ | Uses 35+ tools to accomplish tasks |
| Real-Time Streaming | ✅ | Token-by-token response streaming |
| Reasoning Visibility | ✅ | Shows chain-of-thought to users |
| Conversation History | ✅ | Maintains conversation state |
| Workspace Context | ✅ | Understands workspace-specific data |
| Human-in-the-Loop | ✅ | Supports approval gates and interrupts |
| Resumption | ✅ | Can resume interrupted workflows |
| Model Switching | ✅ | Switch between different AI models |
| Provider Configuration | ✅ | Configure OpenRouter, BYOK, etc. |
| Memory System | ✅ | Remembers user preferences |
| Cost Awareness | ✅ | Checks credits before expensive operations |
| Multi-Turn Conversations | ✅ | Maintains context across turns |

### 🚧 In Development

| Feature | Status | Priority |
|---------|--------|----------|
| Digital Twin Integration | 🚧 | High | Deep integration with Digital Twin Memory |
| Template Suggestions | 🚧 | Medium | Suggest templates based on use case |
| Auto-Retry Logic | 🚧 | Medium | Automatic retry for failed tool calls |
| Conversation Export | 🚧 | Low | Export conversations as markdown |

### 📋 Roadmap

| Feature | Priority | Target Version |
|---------|----------|----------------|
| Voice Cloning Assistant | High | v1.1 |
| Avatar Creation Guide | High | v1.1 |
| Script Writing Coach | High | v1.1 |
| Video Editing Assistant | Medium | v1.2 |
| Multi-Language Support | Medium | v1.2 |
| Team Collaboration | Medium | v1.3 |
| Custom Workflows | Low | v1.4 |

---

## Technical Implementation

### Agent Initialization

```typescript
// features/agent/lib/builder.ts
import { createDeepAgent } from '@deep-agents/core';
import { createOpenRouterLLM } from '@deep-agents/provider-openrouter';
import { tools } from './tools';
import { memory } from './memory';

export function buildAgent(workspaceId: string, userId: string) {
  return createDeepAgent({
    name: 'Co-Producer',
    description: 'Your AI video production partner',
    llm: createOpenRouterLLM({
      model: 'openai/gpt-4o',
      apiKey: process.env.OPENROUTER_API_KEY!,
    }),
    tools,
    memory: memory(workspaceId, userId),
    streaming: true,
    reasoning: true,
  });
}
```

### Tool Definition

```typescript
// features/agent/lib/tools.ts
export const tools = {
  // Voice operations
  listVoices: async (ctx) => {
    const voices = await ctx.insforge.query('SELECT * FROM voices WHERE workspace_id = ?', [ctx.workspaceId]);
    return voices.map(v => mapVoice(v));
  },
  createVoice: async (ctx, params) => {
    // Validate, upload to R2, create DB record
    return await voiceCreationPipeline(ctx, params);
  },
  // ... 35+ more tools
};
```

### Streaming Endpoint

```typescript
// app/api/agent/stream/route.ts
import { streamAgentExecution } from '@/features/agent/lib/stream-sse';

export async function POST(request: Request) {
  const { messages, workspaceId, threadId } = await request.json();
  
  const stream = await streamAgentExecution({
    messages,
    workspaceId,
    threadId,
    userId: auth().user.id,
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### Review Endpoint

```typescript
// app/api/agent/review/route.ts
import { resumeAgentExecution } from '@/features/agent/lib/stream-sse';

export async function POST(request: Request) {
  const { threadId, action, parameters } = await request.json();
  
  const result = await resumeAgentExecution({
    threadId,
    action, // 'approve', 'reject', 'modify'
    parameters,
    userId: auth().user.id,
  });
  
  return NextResponse.json(result);
}
```

---

## Configuration

### Environment Variables

```bash
# AI Provider (OpenRouter - Recommended)
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o

# Alternative Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Agent Settings
AGENT_MAX_TOKENS=4096
AGENT_TEMPERATURE=0.7
AGENT_RECURSION_LIMIT=45
AGENT_TIMEOUT_MS=60000

# Memory
MEMORY_CACHE_TTL=3600000  # 1 hour
```

### Model Configurations

```typescript
// features/agent/config/models.ts
export const MODELS = {
  // OpenRouter
  'openrouter:gpt-4o': { name: 'GPT-4o', provider: 'openrouter', maxTokens: 4096 },
  'openrouter:gpt-4o-mini': { name: 'GPT-4o Mini', provider: 'openrouter', maxTokens: 4096 },
  'openrouter:claude-3-5-sonnet': { name: 'Claude 3.5 Sonnet', provider: 'openrouter', maxTokens: 4096 },
  'openrouter:claude-3-haiku': { name: 'Claude 3 Haiku', provider: 'openrouter', maxTokens: 4096 },
  'openrouter:llama-3.3-70b': { name: 'Llama 3.3 70B', provider: 'openrouter', maxTokens: 4096 },
  'openrouter:llama-3.2-11b': { name: 'Llama 3.2 11B', provider: 'openrouter', maxTokens: 4096 },
  
  // BYOK
  'openai:gpt-4o': { name: 'GPT-4o (BYOK)', provider: 'openai', maxTokens: 4096 },
  'anthropic:claude-3-5-sonnet': { name: 'Claude 3.5 Sonnet (BYOK)', provider: 'anthropic', maxTokens: 4096 },
  'google:gemini-1.5-pro': { name: 'Gemini 1.5 Pro (BYOK)', provider: 'google', maxTokens: 4096 },
};

// Recommended defaults
export const DEFAULT_MODEL = 'openrouter:gpt-4o';
export const PREVIEW_MODEL = 'openrouter:llama-3.3-70b';
```

---

## UI Integration

### Dashboard Navigation

The Co-Producer is accessible via:
- **Sidebar Nav**: "Co-Producer" under the main section
- **URL**: `/dashboard/agent`
- **Icon**: Bot (from Lucide)

### Agent Interface Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Header: Co-Producer + Settings]                               │
├─────────────────┬────────────────────────────────────────────┤
│                 │                                                │
│  [Thread        │  [Message Area]                                │
│   Sidebar]      │                                                │
│                 │  ┌─────────────────────────────────────┐   │
│  • Thread 1    │  │ ≡ User: "Create a tutorial video..."   │   │
│  • Thread 2    │  │                                             │   │
│  • Thread 3    │  │  ≡ Agent: "I'll help you..."            │   │
│  • New Thread  │  │    [Reasoning: "User wants tutorial..." ]│   │
│                 │  │    [Task: list_voices] ✓                │   │
│  [Search]       │  │    [Task: create_script] ⏳            │   │
│                 │  │                                             │   │
│                 │  └─────────────────────────────────────┘   │
│                 │                                                │
│                 │  [Input Area]                                  │
│                 │  ┌─────────────────────────────────────┐   │
│                 │  │ Model: [GPT-4o ▼] Temp: 0.7          │   │
│                 │  │ [Attachment] [Microphone]                │   │
│                 │  │ ├──────────────────────────────────┤   │
│                 │  │ │ Type your message...                │   │
│                 │  │ └──────────────────────────────────┘   │
│                 │  │                    [Send] ✈             │   │
│                 │  └─────────────────────────────────────┘   │
│                 │                                                │
└─────────────────┴────────────────────────────────────────────┘
```

### Message Types

**User Messages:**
- Plain text
- With attachments (images, audio, video)
- With tool parameter updates (HITL responses)

**Agent Messages:**
- Text responses (streamed)
- Reasoning (collapsible)
- Tool calls (executable)
- Tool results (rendered as AI elements)
- Errors (with retry options)

---

## Safety & Guardrails

### Content Moderation

**Pre-Generation Checks:**
1. **Input Validation**: All user inputs validated via zod
2. **Workspace Scope**: All queries scoped to authenticated workspace
3. **Billing Check**: Credits verified before expensive operations
4. **Rate Limiting**: Per-user and per-workspace limits

### Execution Safeguards

```typescript
// features/agent/lib/stream-sse.ts
const SAFETY_CONFIG = {
  maxRecursion: 45,        // Prevent infinite loops
  maxTokens: 4096,         // Prevent overly long responses
  maxToolCalls: 20,        // Limit tool calls per message
  timeoutMs: 60000,        // 60 second timeout
  loopPrevention: true,    // Detect and prevent loops
};
```

### Sensitive Operations

**Require Explicit Approval:**
- Voice cloning (billing impact)
- Avatar generation (billing impact)
- Full video generation (high billing impact)
- Workspace modifications
- Data deletions

---

## Performance

### Optimization Techniques

1. **Caching**: 
   - MCP client instances cached for 60 seconds
   - Model responses cached based on input hash
   - Database queries cached at InsForge level

2. **Streaming**:
   - Token-by-token streaming reduces perceived latency
   - Progressive rendering of tool results
   - Real-time progress updates

3. **Lazy Loading**:
   - AI elements loaded on-demand
   - Heavy components (video players) lazy-loaded
   - Model providers initialized only when needed

### Benchmarks

| Metric | Value |
|--------|-------|
| First Token Latency | ~2-5 seconds |
| Full Response (100 tokens) | ~10-15 seconds |
| Tool Execution | ~5-30 seconds (depends on tool) |
| Concurrent Sessions | 10+ per workspace |
| Memory Usage | ~50MB per session |

---

## Testing

### Manual Test Cases

1. **Basic Conversation**
   - Start new thread
   - Send message: "What can you do?"
   - Verify response includes video creation capabilities

2. **Tool Orchestration**
   - Send: "List my voices"
   - Verify tool call to listVoices
   - Verify results rendered as VoiceCard components

3. **Creation Flow**
   - Send: "Create a script about React hooks"
   - Verify agent guides through script creation
   - Verify script saved to database

4. **HITL Flow**
   - Trigger action requiring approval
   - Verify interrupt wizard appears
   - Approve and verify continuation

5. **Streaming**
   - Send long message
   - Verify tokens appear one-by-one
   - Verify reasoning visible (if enabled)

6. **Memory**
   - Start conversation about Topic A
   - Switch to Topic B
   - Return to Topic A
   - Verify context maintained

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Agent not responding | Missing API key | Set OPENROUTER_API_KEY |
| Tools not executing | Missing workspace | Authenticate and select workspace |
| Slow responses | Rate limited | Wait and retry |
| Token limit errors | Response too long | Reduce AGENT_MAX_TOKENS |
| Looping | Recursion limit hit | Increase AGENT_RECURSION_LIMIT |
| Memory errors | Session too large | Clear conversation history |

### Debug Mode

Enable debug logging:
```bash
AGENT_DEBUG=true bun run dev
```

View debug output in console and browser dev tools.

---

## Contribution Guide

### Adding New Tools

1. **Define Tool** in `features/agent/lib/tools.ts`:
   ```typescript
   export const tools = {
     ...existingTools,
     myNewTool: async (ctx, params) => {
       // Tool implementation
       return result;
     },
   };
   ```

2. **Add to Builder** in `features/agent/lib/builder.ts`:
   ```typescript
   const agent = createDeepAgent({
     tools: { ...tools, myNewTool },
     // ...
   });
   ```

3. **Create UI Component** in `components/ai-elements/`:
   ```tsx
   export function MyNewToolResult({ data }: { data: any }) {
     return <div>{/* Render tool output */}</div>;
   }
   ```

4. **Register Renderer** in `features/agent/views/message-list.tsx`:
   ```typescript
   const toolRenderers = {
     ...existingRenderers,
     myNewTool: MyNewToolResult,
   };
   ```

### Adding New Models

1. **Add to Models Config** in `features/agent/config/models.ts`:
   ```typescript
   export const MODELS = {
     ...existingModels,
     'provider:model-name': {
       name: 'Model Name',
       provider: 'provider',
       maxTokens: 4096,
     },
   };
   ```

2. **Update Model Selector** in `features/agent/views/chat-input.tsx`:
   ```tsx
   <Select>
     {Object.entries(MODELS).map(([key, model]) => (
       <SelectItem key={key} value={key}>
         {model.name}
       </SelectItem>
     ))}
   </Select>
   ```

---

## Best Practices

### Agent Development

1. **Start Small**: Test with simple tools before complex workflows
2. **Validate Inputs**: Always validate tool parameters
3. **Handle Errors**: Provide user-friendly error messages
4. **Stream Everything**: Use streaming for all responses
5. **Respect Context**: Maintain conversation context across turns
6. **Optimize Tokens**: Use efficient prompts and tool descriptions

### UI Development

1. **Consistent Styling**: Follow existing shadcn patterns
2. **Loading States**: Always show loading indicators
3. **Error States**: Handle all possible error scenarios
4. **Responsive**: Test on mobile and desktop
5. **Accessible**: Follow WCAG guidelines
6. **Performance**: Lazy load heavy components

---

## References

- **Deep Agents Docs**: https://deep-agents.dev
- **LangGraph Docs**: https://langchain-ai.github.io/langgraph
- **OpenRouter Docs**: https://openrouter.ai/docs
- **MCP Spec**: https://modelcontextprotocol.io
- **Sample Project**: `sample/frontend/` (Resonance AI)

---

## Appendix: AI Element Components

### Complete List (35 Components)

1. **agent.tsx** - Agent message container
2. **artifact.tsx** - Tool output artifacts
3. **attachments.tsx** - File attachments
4. **audio-player.tsx** - Audio playback with waveform
5. **canvas.tsx** - Canvas rendering
6. **chain-of-thought.tsx** - Reasoning display
7. **checkpoint.tsx** - Workflow checkpoints
8. **code-block.tsx** - Syntax-highlighted code
9. **commit.tsx** - Commit information
10. **confirmation.tsx** - Confirmation dialogs
11. **connection.tsx** - Connection status
12. **context.tsx** - Context provider
13. **controls.tsx** - Control buttons
14. **conversation.tsx** - Conversation wrapper
15. **edge.tsx** - Edge function results
16. **environment-variables.tsx** - Environment variable display
17. **file-tree.tsx** - File tree visualization
18. **image.tsx** - Image display
19. **inline-citation.tsx** - Inline citations
20. **jsx-preview.tsx** - JSX preview
21. **message.tsx** - Individual message
22. **mic-selector.tsx** - Microphone selector
23. **model-selector.tsx** - Model selector
24. **node.tsx** - Node visualization
25. **open-in-chat.tsx** - Open in chat button
26. **package-info.tsx** - Package information
27. **panel.tsx** - Panel container
28. **persona.tsx** - Persona display
29. **plan.tsx** - Plan visualization
30. **prompt-input.tsx** - Prompt input
31. **queue.tsx** - Queue display
32. **reasoning.tsx** - Reasoning display
33. **sandbox.tsx** - Sandbox environment
34. **schema-display.tsx** - JSON schema
35. **shimmer.tsx** - Loading shimmer
36. **snippet.tsx** - Code snippets
37. **sources.tsx** - Source citations
38. **speech-input.tsx** - Speech input
39. **stack-trace.tsx** - Stack trace display
40. **suggestion.tsx** - Suggestions
41. **task.tsx** - Task execution
42. **terminal.tsx** - Terminal output
43. **test-results.tsx** - Test results
44. **tool.tsx** - Tool execution
45. **toolbar.tsx** - Action toolbar
46. **transcription.tsx** - Transcription display
47. **voice-selector.tsx** - Voice selector
48. **web-preview.tsx** - Web preview

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-24  
**Author:** Ubaidullah Ismail  
**License:** MIT (same as project)
