import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client server-side lazily
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// In-memory store for generated designs (for Store Associate Handoff)
const savedDesignsStore = new Map<string, any>();

// System Prompt for Engraving Vector Generation
const SYSTEM_ENGRAVING_PROMPT = `
You are an expert jewelry engraving artist and SVG generator for physical jewelry laser engraving.
Your task is to generate TWO distinct, clean, minimalist, high-quality monochrome SVG graphics based on the user's request.

CRITICAL ENGRAVING REQUIREMENTS:
1. Return a JSON object with two SVG strings: "optionA" and "optionB".
2. SVGs MUST be 100% vector based with valid XML <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">.
3. Use single monochrome fill or stroke color: "#111111" or "currentColor".
4. NO gradients (<linearGradient>), NO drop shadows, NO filters, NO raster images (<image>), NO textures.
5. All lines must be bold and clean (stroke-width minimum 2 or filled paths) suitable for 15mm-20mm laser engraving.
6. Design must be clear, recognizable, and distinct between Option A and Option B (e.g. Option A is minimal line-art, Option B is silhouette or detailed contour).
7. Wrap response strictly in JSON format:
{
  "title": "Short Title",
  "optionA": "<svg viewBox=\\"0 0 100 100\\"...>...</svg>",
  "optionB": "<svg viewBox=\\"0 0 100 100\\"...>...</svg>"
}
`;

// Helper: Fallback vector generator if AI API key is not present or calls fail
function generateFallbackSVGs(promptText: string): { title: string; optionA: string; optionB: string } {
  const cleanPrompt = promptText.toLowerCase().trim();
  let iconName = "lion";

  if (cleanPrompt.includes("lion")) iconName = "lion";
  else if (cleanPrompt.includes("heart") || cleanPrompt.includes("love")) iconName = "heart";
  else if (cleanPrompt.includes("star") || cleanPrompt.includes("galaxy") || cleanPrompt.includes("sky")) iconName = "star";
  else if (cleanPrompt.includes("crown") || cleanPrompt.includes("king") || cleanPrompt.includes("queen")) iconName = "crown";
  else if (cleanPrompt.includes("sun") || cleanPrompt.includes("solar")) iconName = "sun";
  else if (cleanPrompt.includes("moon")) iconName = "moon";
  else if (cleanPrompt.includes("butterfly")) iconName = "butterfly";
  else if (cleanPrompt.includes("rose") || cleanPrompt.includes("flower")) iconName = "flower";
  else if (cleanPrompt.includes("tree") || cleanPrompt.includes("life")) iconName = "tree";
  else iconName = "symbol";

  // Pre-designed high quality engraving vector options
  const fallbackLibrary: Record<string, { optionA: string; optionB: string }> = {
    lion: {
      optionA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,15 L58,30 L75,25 L70,40 L85,50 L70,60 L75,75 L58,70 L50,85 L42,70 L25,75 L30,60 L15,50 L30,40 L25,25 L42,30 Z" fill="none" stroke="#111111" stroke-width="3" stroke-linejoin="round"/>
        <path d="M38,45 A4,4 0 1,1 38,44.9 Z" fill="#111111"/>
        <path d="M62,45 A4,4 0 1,1 62,44.9 Z" fill="#111111"/>
        <path d="M50,52 L45,58 L55,58 Z" fill="#111111"/>
        <path d="M50,58 L50,65 M44,68 C47,71 53,71 56,68" fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
      optionB: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#111111" stroke-width="2.5"/>
        <path d="M50,20 C35,20 25,32 25,48 C25,65 38,78 50,78 C62,78 75,65 75,48 C75,32 65,20 50,20 Z" fill="none" stroke="#111111" stroke-width="3"/>
        <path d="M35,42 L45,46 L38,50 Z" fill="#111111"/>
        <path d="M65,42 L55,46 L62,50 Z" fill="#111111"/>
        <polygon points="50,55 43,62 57,62" fill="#111111"/>
        <path d="M30,30 L20,20 M70,30 L80,20 M22,48 L10,48 M78,48 L90,48 M30,68 L20,78 M70,68 L80,78" stroke="#111111" stroke-width="3" stroke-linecap="round"/>
      </svg>`
    },
    heart: {
      optionA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,82 C20,60 12,40 22,25 C32,10 48,16 50,30 C52,16 68,10 78,25 C88,40 80,60 50,82 Z" fill="none" stroke="#111111" stroke-width="4" stroke-linejoin="round"/>
        <path d="M50,38 C42,28 32,32 35,42 C38,52 50,62 50,62 C50,62 62,52 65,42 C68,32 58,28 50,38 Z" fill="#111111"/>
      </svg>`,
      optionB: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,85 C25,62 10,42 22,22 C34,2 50,18 50,18 C50,18 66,2 78,22 C90,42 75,62 50,85 Z" fill="none" stroke="#111111" stroke-width="3.5" stroke-dasharray="8 4"/>
        <circle cx="50" cy="45" r="12" fill="none" stroke="#111111" stroke-width="3"/>
        <path d="M50,22 L50,68 M35,45 L65,45" stroke="#111111" stroke-width="2.5"/>
      </svg>`
    },
    star: {
      optionA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,12 61,38 88,38 66,54 75,80 50,64 25,80 34,54 12,38 39,38" fill="none" stroke="#111111" stroke-width="3.5" stroke-linejoin="round"/>
        <circle cx="50" cy="48" r="6" fill="#111111"/>
      </svg>`,
      optionB: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,10 C50,35 65,50 90,50 C65,50 50,65 50,90 C50,65 35,50 10,50 C35,50 50,35 50,10 Z" fill="#111111"/>
        <circle cx="75" cy="25" r="3" fill="#111111"/>
        <circle cx="25" cy="75" r="3" fill="#111111"/>
      </svg>`
    },
    crown: {
      optionA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M20,75 L80,75 L85,35 L65,52 L50,25 L35,52 L15,35 Z" fill="none" stroke="#111111" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="15" cy="30" r="4" fill="#111111"/>
        <circle cx="50" cy="20" r="4" fill="#111111"/>
        <circle cx="85" cy="30" r="4" fill="#111111"/>
        <line x1="20" y1="82" x2="80" y2="82" stroke="#111111" stroke-width="4" stroke-linecap="round"/>
      </svg>`,
      optionB: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M15,70 L85,70 L90,30 L68,50 L50,15 L32,50 L10,30 Z" fill="#111111"/>
        <path d="M25,62 L75,62 L72,55 L28,55 Z" fill="#ffffff"/>
      </svg>`
    },
    sun: {
      optionA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="20" fill="none" stroke="#111111" stroke-width="3.5"/>
        <path d="M50,10 L50,22 M50,78 L50,90 M10,50 L22,50 M78,50 L90,50 M22,22 L30,30 M70,70 L78,78 M22,78 L30,70 M70,30 L78,22" stroke="#111111" stroke-width="3.5" stroke-linecap="round"/>
      </svg>`,
      optionB: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="22" fill="#111111"/>
        <path d="M50,12 Q55,25 50,28 Q45,25 50,12 Z M50,88 Q55,75 50,72 Q45,75 50,88 Z M12,50 Q25,55 28,50 Q25,45 12,50 Z M88,50 Q75,55 72,50 Q75,45 88,50 Z" fill="#111111"/>
      </svg>`
    },
    moon: {
      optionA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M60,15 C40,15 25,30 25,50 C25,70 40,85 60,85 C42,80 38,60 45,45 C52,30 70,22 60,15 Z" fill="#111111"/>
        <polygon points="72,35 75,42 82,42 76,46 78,53 72,48 66,53 68,46 62,42 69,42" fill="#111111"/>
      </svg>`,
      optionB: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M65,18 C45,18 30,33 30,50 C30,67 45,82 65,82 C48,76 40,58 48,42 C56,26 72,22 65,18 Z" fill="none" stroke="#111111" stroke-width="3.5"/>
        <circle cx="70" cy="30" r="4" fill="#111111"/>
        <circle cx="78" cy="48" r="3" fill="#111111"/>
        <circle cx="68" cy="65" r="4" fill="#111111"/>
      </svg>`
    },
    butterfly: {
      optionA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="50" rx="3" ry="25" fill="#111111"/>
        <circle cx="50" cy="22" r="4" fill="#111111"/>
        <path d="M48,20 C42,12 35,10 32,15 M52,20 C58,12 65,10 68,15" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M47,32 C20,15 10,40 35,52 C10,60 20,82 47,62 C47,62 47,32 47,32 Z" fill="none" stroke="#111111" stroke-width="3"/>
        <path d="M53,32 C80,15 90,40 65,52 C90,60 80,82 53,62 C53,62 53,32 53,32 Z" fill="none" stroke="#111111" stroke-width="3"/>
      </svg>`,
      optionB: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,25 Q30,10 20,30 Q10,50 35,55 Q12,65 25,82 Q45,85 48,65 L50,25 Z" fill="#111111"/>
        <path d="M50,25 Q70,10 80,30 Q90,50 65,55 Q88,65 75,82 Q55,85 52,65 L50,25 Z" fill="#111111"/>
      </svg>`
    },
    flower: {
      optionA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="10" fill="#111111"/>
        <path d="M50,20 C44,30 56,30 50,20 Z M50,80 C44,70 56,70 50,80 Z M20,50 C30,44 30,56 20,50 Z M80,50 C70,44 70,56 80,50 Z M28,28 C38,34 44,28 28,28 Z M72,72 C62,66 56,72 72,72 Z M28,72 C34,62 28,56 28,72 Z M72,28 C66,38 72,44 72,28 Z" fill="none" stroke="#111111" stroke-width="3.5"/>
      </svg>`,
      optionB: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,50 C40,25 60,10 50,5 C40,10 60,25 50,50 Z M50,50 C25,40 10,60 5,50 C10,40 25,60 50,50 Z M50,50 C60,75 40,90 50,95 C60,90 40,75 50,50 Z M50,50 C75,60 90,40 95,50 C90,60 75,40 50,50 Z" fill="#111111"/>
      </svg>`
    },
    symbol: {
      optionA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="35" fill="none" stroke="#111111" stroke-width="3.5"/>
        <path d="M35,50 C35,38 42,32 50,32 C58,32 65,38 65,50 C65,62 58,68 50,68 C42,68 35,62 35,50 Z" fill="none" stroke="#111111" stroke-width="3"/>
        <polygon points="50,20 54,28 46,28" fill="#111111"/>
        <polygon points="50,80 54,72 46,72" fill="#111111"/>
      </svg>`,
      optionB: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M25,25 L75,25 L75,75 L25,75 Z" fill="none" stroke="#111111" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M25,25 L75,75 M75,25 L25,75" stroke="#111111" stroke-width="2.5"/>
        <circle cx="50" cy="50" r="12" fill="#ffffff" stroke="#111111" stroke-width="3"/>
      </svg>`
    }
  };

  const selected = fallbackLibrary[iconName] || fallbackLibrary.symbol;
  return {
    title: promptText,
    optionA: selected.optionA,
    optionB: selected.optionB
  };
}

// API Route: AI Generate Vector Artwork (Always returns EXACTLY 2 options)
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { prompt, jewelryType, safeArea } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const genAI = getGenAI();
    if (!genAI) {
      // Return smart fallback vector options if key not set
      const fallback = generateFallbackSVGs(prompt);
      return res.json(fallback);
    }

    const userInstruction = `User prompt: "${prompt}". Jewelry SKU surface context: ${jewelryType || "Pendant"} (${safeArea || "18mm x 18mm"}). Generate 2 options as specified in JSON.`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userInstruction,
      config: {
        systemInstruction: SYSTEM_ENGRAVING_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const responseText = response.text || "";
    try {
      const parsed = JSON.parse(responseText);
      if (parsed.optionA && parsed.optionB) {
        return res.json({
          title: parsed.title || prompt,
          optionA: parsed.optionA,
          optionB: parsed.optionB,
        });
      }
    } catch (e) {
      console.warn("Failed to parse JSON response from Gemini, using fallback", e);
    }

    // Fallback if parsing failed
    const fallback = generateFallbackSVGs(prompt);
    return res.json(fallback);

  } catch (error: any) {
    console.error("AI Generation error:", error);
    // Graceful fallback so user interface always gets 2 valid vector options
    const fallback = generateFallbackSVGs(req.body.prompt || "Engraving");
    return res.json(fallback);
  }
});

// API Route: AI Refine Vector Artwork (Returns 2 refined options)
app.post("/api/ai/refine", async (req, res) => {
  try {
    const { currentSvg, instruction, jewelryType } = req.body;
    const genAI = getGenAI();

    if (!genAI) {
      const fallback = generateFallbackSVGs(instruction || "Refined design");
      return res.json(fallback);
    }

    const promptText = `Current SVG Artwork:
${currentSvg}

Refinement Instruction: "${instruction}"
Jewelry Type: ${jewelryType || "Pendant"}.
Generate 2 refined variations that incorporate this instruction cleanly into monochromatic vector SVGs.`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_ENGRAVING_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    if (parsed.optionA && parsed.optionB) {
      return res.json({
        title: parsed.title || instruction,
        optionA: parsed.optionA,
        optionB: parsed.optionB,
      });
    }

    const fallback = generateFallbackSVGs(instruction || "Refined");
    return res.json(fallback);
  } catch (err) {
    const fallback = generateFallbackSVGs(req.body.instruction || "Refined");
    return res.json(fallback);
  }
});

// API Route: Save Design & Generate Design ID
app.post("/api/designs", (req, res) => {
  try {
    const designData = req.body;
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const designId = `GV-LIVE-${randomNum}`;

    const savedRecord = {
      designId,
      createdAt: new Date().toISOString(),
      ...designData,
    };

    savedDesignsStore.set(designId, savedRecord);

    return res.json({
      success: true,
      designId,
      record: savedRecord,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save design" });
  }
});

// API Route: Retrieve Design by Design ID
app.get("/api/designs/:id", (req, res) => {
  const designId = req.params.id;
  const record = savedDesignsStore.get(designId);
  if (!record) {
    return res.status(404).json({ error: "Design ID not found" });
  }
  return res.json(record);
});

// Setup Vite Development or Static Production middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const listenOnPort = (port: number) => {
    const server = app.listen(port, HOST, () => {
      console.log(`GIVA Live-Engrave Server running on http://localhost:${port}`);
    });

    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.warn(`Port ${port} is already in use, trying ${port + 1}...`);
        server.close(() => listenOnPort(port + 1));
      } else {
        console.error("Server startup error:", error);
        process.exit(1);
      }
    });
  };

  listenOnPort(DEFAULT_PORT);
}

startServer();
