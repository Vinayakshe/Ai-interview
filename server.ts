import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_ID = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('GEMINI_API_KEY')) {
    return {
      status: 403,
      message: 'Gemini API key is missing or invalid. Please verify your key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'API rate limit reached. Please wait a moment and try again.',
    };
  }
  return {
    status: 500,
    message: raw || 'An unexpected server error occurred.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 1. Resume Upload & Parsing Endpoint
  app.post('/api/resume/parse', async (req, res) => {
    try {
      const { fileName, mimeType, base64Data, rawText } = req.body as {
        fileName?: string;
        mimeType?: string;
        base64Data?: string;
        rawText?: string;
      };

      const ai = getAiClient();
      const contentsParts: Array<Record<string, unknown>> = [];
      let extractedText = typeof rawText === 'string' ? rawText.trim() : '';

      if (base64Data && fileName) {
        const lowerName = fileName.toLowerCase();
        const buffer = Buffer.from(base64Data, 'base64');

        if (
          lowerName.endsWith('.docx') ||
          mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value.trim();
          if (!extractedText) {
            res.status(400).json({ error: 'Could not extract readable text from the DOCX file.' });
            return;
          }
        } else if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
          contentsParts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data,
            },
          });
        } else {
          extractedText = buffer.toString('utf-8').trim();
        }
      }

      if (!extractedText && contentsParts.length === 0) {
        res.status(400).json({ error: 'Please upload a PDF, DOCX, TXT file or paste resume text.' });
        return;
      }

      const instructionPrompt = `Analyze the provided candidate resume carefully and extract a clean, accurate structured profile.
Return ONLY factual details found in the resume. For rawText, include a concise plain-text transcription of the resume's core sections (experience, projects, skills, education) if reading from a file, or preserve the key content cleanly.${
        extractedText ? `\n\nRESUME TEXT:\n${extractedText}` : ''
      }`;

      contentsParts.push({ text: instructionPrompt });

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: { parts: contentsParts },
        config: {
          systemInstruction:
            'You are an expert technical recruiter and resume parser. Extract structured candidate information accurately without fabricating credentials.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Full name of the candidate.' },
              currentTitle: { type: Type.STRING, description: 'Most recent or current job title.' },
              yearsExperience: { type: Type.STRING, description: 'Estimated total years of experience, e.g. "6+ years".' },
              summary: { type: Type.STRING, description: '2-3 sentence executive summary of the candidate background.' },
              skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Up to 12 key technical and domain skills.',
              },
              highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 4 notable quantified achievements or key projects from their resume.',
              },
              education: { type: Type.STRING, description: 'Highest degree and institution, or N/A if not listed.' },
              rawText: { type: Type.STRING, description: 'Clean extracted resume text for interview grounding.' },
            },
            required: ['name', 'currentTitle', 'yearsExperience', 'summary', 'skills', 'highlights', 'education', 'rawText'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        ...parsed,
        fileName: fileName || 'Pasted Resume',
        rawText: extractedText || parsed.rawText || '',
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. Start Interview Session
  app.post('/api/interview/start', async (req, res) => {
    try {
      const { candidateProfile, config } = req.body as {
        candidateProfile: Record<string, unknown>;
        config: {
          targetRole: string;
          interviewType: string;
          difficulty: string;
          questionCount: number;
        };
      };

      const ai = getAiClient();

      const prompt = `Start a realistic ${config.difficulty}-level ${config.interviewType} interview for the target role: "${config.targetRole}".
Total planned questions: ${config.questionCount}.

Candidate Profile:
${JSON.stringify(candidateProfile, null, 2)}

Greet the candidate warmly by first name (if available), briefly acknowledge one relevant detail from their background, and ask Question 1 clearly and directly. Keep it concise, natural, and professional — like a real senior interviewer.`;

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a seasoned, thoughtful hiring lead conducting a realistic 1-on-1 job interview. Speak naturally in plain prose (no markdown bullet lists unless comparing options). Ask one focused question at a time.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: 'The welcoming opening and first interview question.',
              },
              topic: {
                type: Type.STRING,
                description: 'Short 2-4 word topic label for this first question, e.g. "Architecture & Scaling".',
              },
            },
            required: ['message', 'topic'],
          },
        },
      });

      const data = JSON.parse((response.text ?? '{}').trim());
      res.json({
        message: data.message,
        topic: data.topic || 'Opening Question',
        questionNumber: 1,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Interactive Interview Turn
  app.post('/api/interview/turn', async (req, res) => {
    try {
      const { candidateProfile, config, messages, currentQuestionNumber } = req.body as {
        candidateProfile: Record<string, unknown>;
        config: {
          targetRole: string;
          interviewType: string;
          difficulty: string;
          questionCount: number;
        };
        messages: Array<{ role: 'interviewer' | 'candidate'; content: string }>;
        currentQuestionNumber: number;
      };

      const ai = getAiClient();
      const nextQuestionNumber = currentQuestionNumber + 1;
      const shouldWrapUp = currentQuestionNumber >= config.questionCount;

      const transcript = messages
        .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n\n');

      const prompt = `You are conducting a ${config.difficulty}-level ${config.interviewType} interview for "${config.targetRole}".
Candidate Resume Summary: ${candidateProfile.summary ?? ''}
Candidate Skills: ${Array.isArray(candidateProfile.skills) ? candidateProfile.skills.join(', ') : ''}
Candidate Highlights: ${Array.isArray(candidateProfile.highlights) ? candidateProfile.highlights.join(' | ') : ''}

Conversation Transcript So Far:
${transcript}

Current progress: The candidate just answered Question ${currentQuestionNumber} of ${config.questionCount}.
${
  shouldWrapUp
    ? 'All planned questions have now been answered. Acknowledge their final answer thoughtfully, thank them for their time, and let them know the interview is complete and they can view their performance debrief.'
    : `Respond naturally to the candidate's latest answer (1-2 sentences of grounded acknowledgment or probing observation—never reveal a score yet), and then ask Question ${nextQuestionNumber} of ${config.questionCount}. Tailor the question to either probe deeper into their last answer or cover an important ${config.interviewType} competency for a ${config.difficulty} ${config.targetRole} referencing their resume where natural.`
}`;

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a calm, rigorous human interviewer. Ask one clear, focused question per turn. Keep responses concise (under 140 words) and conversational. Never break character or output scoring during the live interview.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: 'Interviewer reply and next question (or closing statement).',
              },
              topic: {
                type: Type.STRING,
                description: 'Short 2-4 word topic label for this turn.',
              },
              isComplete: {
                type: Type.BOOLEAN,
                description: 'True only if all planned questions are finished and this is the closing message.',
              },
            },
            required: ['message', 'topic', 'isComplete'],
          },
        },
      });

      const data = JSON.parse((response.text ?? '{}').trim());
      const isComplete = shouldWrapUp || Boolean(data.isComplete);
      res.json({
        message: data.message,
        topic: data.topic || (isComplete ? 'Session Complete' : `Question ${nextQuestionNumber}`),
        questionNumber: isComplete ? currentQuestionNumber : nextQuestionNumber,
        isComplete,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 4. Performance Evaluation & Debrief
  app.post('/api/interview/evaluate', async (req, res) => {
    try {
      const { candidateProfile, config, messages } = req.body as {
        candidateProfile: Record<string, unknown>;
        config: {
          targetRole: string;
          interviewType: string;
          difficulty: string;
          questionCount: number;
        };
        messages: Array<{ role: 'interviewer' | 'candidate'; content: string; questionNumber?: number }>;
      };

      const ai = getAiClient();
      const transcript = messages
        .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n\n');

      const prompt = `Evaluate the completed job interview objectively and constructively.

Target Role: ${config.targetRole}
Interview Type: ${config.interviewType}
Difficulty Level: ${config.difficulty}

Candidate Profile:
Name: ${candidateProfile.name ?? 'Candidate'}
Current Title: ${candidateProfile.currentTitle ?? 'N/A'}
Skills: ${Array.isArray(candidateProfile.skills) ? candidateProfile.skills.join(', ') : ''}

Full Interview Transcript:
${transcript}

Provide an honest, evidence-based evaluation calibrated to a ${config.difficulty} ${config.targetRole} bar.
- Evaluate each of the 4 exact categories: "Technical Accuracy", "Communication", "Clarity", and "Professional Tone".
- For questionBreakdown, extract every interviewer question that the candidate answered, quote/summarize the candidate's actual answer faithfully, score it 0-100, give specific critique, and provide a concrete AI-suggested model improvement or stronger framing.`;

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a principal hiring committee bar-raiser. Grade fairly and rigorously based strictly on the transcript evidence. Provide actionable, specific feedback without fluff.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: { type: Type.INTEGER, description: 'Overall interview score from 0 to 100.' },
              readinessLabel: {
                type: Type.STRING,
                description: 'Must be one of: "Strong Hire", "Hire", "Developing", "Needs Focus".',
              },
              executiveSummary: {
                type: Type.STRING,
                description: '3-4 sentence high-level assessment of candidate performance.',
              },
              categories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: 'One of: Technical Accuracy, Communication, Clarity, Professional Tone',
                    },
                    score: { type: Type.INTEGER, description: 'Score from 0 to 100.' },
                    rationale: { type: Type.STRING, description: 'Concise 1-sentence justification.' },
                  },
                  required: ['name', 'score', 'rationale'],
                },
              },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 concrete strengths demonstrated in the interview.',
              },
              areasForImprovement: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 actionable areas for improvement based on the answers.',
              },
              questionBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER },
                    question: { type: Type.STRING },
                    candidateAnswer: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    feedback: { type: Type.STRING },
                    suggestedImprovement: { type: Type.STRING },
                  },
                  required: [
                    'questionNumber',
                    'question',
                    'candidateAnswer',
                    'score',
                    'feedback',
                    'suggestedImprovement',
                  ],
                },
              },
            },
            required: [
              'overallScore',
              'readinessLabel',
              'executiveSummary',
              'categories',
              'strengths',
              'areasForImprovement',
              'questionBreakdown',
            ],
          },
        },
      });

      const data = JSON.parse((response.text ?? '{}').trim());
      res.json({
        ...data,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // Vite middleware for dev, static dist for prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ai Interviewer server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
