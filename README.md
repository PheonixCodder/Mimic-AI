# Mimic-AI: Your AI Twin. Your Infrastructure. Your Content.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js 16](https://img.shields.io/badge/Next.js-16+-000000.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6.svg?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Bun](https://img.shields.io/badge/Bun-1.0+-000000.svg?logo=bun&logoColor=white)](https://bun.sh)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000.svg?logo=vercel&logoColor=white)](https://vercel.com)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%95%A2-brightgreen.svg)](https://opensource.org)

---

## What is Mimic-AI?

**Mimic-AI** is a **self-hosted, open-source AI video studio** that empowers you to clone voices, create digital avatars, and generate complete AI videos using cutting-edge models — all while maintaining **full control** of your infrastructure, data, and costs.

Imagine **HeyGen + ElevenLabs + Synthesia** — but with **full infrastructure control**:
- You own your data (no vendor lock-in)
- You control your stack (self-hosted or cloud)
- You understand your costs (transparent pricing)
- You maintain quality (validation, preview, approval at every step)

---

## Features

### Core Video Creation Pipeline
- **Voice Cloning**: F5-TTS, CosyVoice
- **Avatar Generation**: Flux.1 Schnell/Dev
- **Talking Avatars**: LivePortrait, Halo + LatentSync/MuseTalk
- **Video Generation**: Wan2.2, HunyuanVideo, Mochi
- **Caption Generation**: Faster-Whisper, Whisper Large v3
- **Final Rendering**: Remotion, MoviePy
- **B-Roll Integration**: Pexels API, Pixabay API
- **Watermark Engine**: Custom FFmpeg/OpenCV pipelines

### AI Co-Producer (NEW! Game Changer)
Our domain-specific AI assistant that acts as your 24/7 video production partner:
- Natural Language Interface: Describe your video idea in plain English
- Context-Aware: Understands your workspace, preferences, and previous interactions
- Tool Orchestration: Intelligently uses 35+ specialized AI elements
- Real-Time Streaming: Token-by-token with visible reasoning
- Memory System: Multi-layer (session, workspace, user)
- Human-in-the-Loop: Approval gates for sensitive operations
- Multi-Provider: OpenRouter (default), OpenAI, Anthropic, Google, Custom

### Example Workflows
```
User: "Create a tutorial video about React hooks with my voice"
Agent: Checks voices, generates script, provides cost estimate, guides approval

User: "What's my remaining credit balance?"
Agent: Checks Polar billing, shows detailed breakdown

User: "List all my voices and show quality scores"
Agent: Queries workspace, renders VoiceCard components
```

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/PheonixCodder/Mimic-AI.git
cd Mimic-AI
bun install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

**Required:**
```bash
INSFORGE_URL=https://<region>.insforge.app
INSFORGE_SERVICE_KEY=your_service_key
DATABASE_URL=postgres://... (from InsForge)
NEXTAUTH_SECRET=generate_with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
OPENROUTER_API_KEY=your_openrouter_key
```

**Recommended:**
```bash
REPLICATE_API_TOKEN=your_replicate_token
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=mimic-ai-assets
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
POLAR_API_KEY=your_polar_key
MODAL_TOKEN_ID=your_modal_token_id
MODAL_TOKEN_SECRET=your_modal_token_secret
```

### 3. Set Up Submodules
```bash
git submodule init
git submodule update
# Or: git submodule add https://github.com/deep-agents/core.git deep-agents
```

### 4. Run Development Server
```bash
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel
```bash
npm install -g vercel
vercel login
vercel link
vercel --prod
```

---

## Documentation

### Core Documentation
- [Project Overview](context/project-overview.md)
- [Architecture](context/architecture.md)
- [AI Agent Co-Pilot System](context/agent-system.md) - Complete agent documentation
- [Build Plan](context/build-plan.md)
- [Progress Tracker](context/progress-tracker.md)

### Feature Documentation
- [Code Standards](context/code-standards.md)
- [Library Docs](context/library-docs.md)
- [UI Tokens](context/ui-tokens.md)
- [UI Rules](context/ui-rules.md)
- [UI Registry](context/ui-registry.md)

---

## Contributing

We **LOVE** contributions! Mimic-AI is open-source and we welcome contributions from everyone.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/your-feature`)
3. **Make** your changes (follow [Code Standards](context/code-standards.md))
4. **Commit** with clear messages (use [Conventional Commits](https://www.conventionalcommits.org))
5. **Push** and create a Pull Request

### Contribution Guidelines
- All PRs require at least one approval
- CI checks must pass (TypeScript, ESLint, build)
- Add tests for new functionality
- Update documentation
- Include screenshots for UI changes

---

## License

**MIT License** - Copyright (c) 2026 Ubaidullah Ismail

This project is **100% open-source** under the permissive MIT License. You are free to:
- Use for any purpose (personal, commercial, etc.)
- Modify the source code
- Distribute the software
- Use in commercial projects
- Sell access to your hosted instance

**Requirements:**
- Include the original license and copyright notice
- Maintain the MIT License in all copies

**Prohibited:**
- Claim ownership of the original software
- Use the project name or logo without permission
- Remove the license or copyright notices

---

## Support & Community

- [GitHub Discussions](https://github.com/PheonixCodder/Mimic-AI/discussions) - Questions, ideas, feature requests
- [GitHub Issues](https://github.com/PheonixCodder/Mimic-AI/issues) - Bug reports
- [Pull Requests](https://github.com/PheonixCodder/Mimic-AI/pulls) - Contribute code

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun 1.0+ |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Lucide |
| API | tRPC 11, TanStack Query, Server Actions |
| Auth | InsForge Auth |
| Database | InsForge Database (PostgreSQL) |
| Background Jobs | Trigger.dev |
| Storage | Cloudflare R2 |
| Media | Cloudinary |
| Billing | Polar |
| AI Compute | Modal |
| Model Inference | Replicate |
| AI Agents | Deep Agents + LangGraph + MCP |
| Deploy | Vercel |

---

## Roadmap

### Short-Term (Q3 2026)
- v1.0 Stable Release
- Improved Onboarding
- Mobile Optimization
- Dark Mode
- More AI Providers

### Medium-Term (Q4 2026)
- Digital Twin Deep Integration
- Custom Workflows
- Team Collaboration
- API Platform
- A/B Testing Studio

### Long-Term (2027)
- Fine-Tuning Studio
- Kubernetes Support
- SSO Integration
- Audit Center
- Admin Panel

---

## Acknowledgments

- [Next.js](https://nextjs.org)
- [Bun](https://bun.sh)
- [InsForge](https://insforge.dev)
- [Trigger.dev](https://trigger.dev)
- [Deep Agents](https://deep-agents.dev)
- [OpenRouter](https://openrouter.ai)
- [Replicate](https://replicate.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

---

**Made with love by [Ubaidullah Ismail](https://github.com/PheonixCodder) and contributors**

**Deployed on Vercel** | **Powered by InsForge**

*Documentation generated with Mistral Vibe*
