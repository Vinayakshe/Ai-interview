import type { InterviewConfig } from '../types/interview.ts';

export const ROLE_PRESETS: Array<{
  label: string;
  config: Partial<InterviewConfig>;
}> = [
  {
    label: 'Senior Frontend Engineer',
    config: { targetRole: 'Senior Frontend Engineer', interviewType: 'Technical', difficulty: 'Senior' },
  },
  {
    label: 'Full-Stack Software Engineer',
    config: { targetRole: 'Full-Stack Software Engineer', interviewType: 'Mixed', difficulty: 'Mid-Level' },
  },
  {
    label: 'Product Manager',
    config: { targetRole: 'Product Manager', interviewType: 'Behavioral', difficulty: 'Senior' },
  },
  {
    label: 'Backend Systems Engineer',
    config: { targetRole: 'Backend Systems Engineer', interviewType: 'Technical', difficulty: 'Senior' },
  },
];

export const SAMPLE_RESUME_TEXT = `ELENA ROSTOVA
San Francisco, CA · elena.rostova@example.com · github.com/erostova

SUMMARY
Senior Frontend Engineer with 7 years of experience architecting high-throughput web applications, design systems, and real-time collaborative interfaces in React, TypeScript, and Next.js. Proven track record reducing Core Web Vitals latency by 42% and mentoring cross-functional product teams.

EXPERIENCE
Staff Frontend Engineer — ArcLight Analytics (2023 – Present)
• Led migration of a 180k-LOC analytics dashboard from legacy SPA architecture to React 19 + TypeScript with streaming SSR, improving Time-to-Interactive from 3.8s to 1.4s.
• Architected an internal token-driven UI component library adopted across 6 engineering squads, cutting UI regression defects by 55%.
• Implemented WebSocket delta-streaming pipelines for live telemetry tables handling 25,000+ row updates per second via virtualized canvas rendering.

Senior Frontend Engineer — Meridian Commerce (2020 – 2023)
• Built the multi-currency checkout workflow processing $140M+ annual GMV with strict WCAG AA accessibility compliance and automated Playwright coverage.
• Designed client-side caching and optimistic UI mutation layer using TanStack Query, reducing redundant API traffic by 38%.

Frontend Engineer — Kestrel Studio (2018 – 2020)
• Developed interactive data visualizations using D3.js and SVG/Canvas for enterprise supply-chain clients.

TECHNICAL SKILLS
TypeScript, React, Next.js, Tailwind CSS, Node.js, GraphQL, WebSockets, Vitest, Playwright, Web Performance, Accessibility (WCAG), Design Systems

EDUCATION
B.S. in Computer Science — University of Washington`;
