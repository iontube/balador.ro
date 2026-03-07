import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Load .env for standalone usage
try {
  const envContent = fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0 && !process.env[key.trim()]) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
} catch (e) {}

// Gemini API Keys - Gemini 2.5 Flash Lite (FREE)
const GEMINI_KEYS = [
  'AIzaSyAbRzbs0WRJMb0gcojgyJlrjqOPr3o2Cmk',
  'AIzaSyDZ2TklBMM8TU3FA6aIS8vdUc-2iMyHWaM',
  'AIzaSyBdmChQ0ARDdDAqSMSlDIit_xz5ucrWjkY',
  'AIzaSyAE57AIwobFO4byKbeoa-tVDMV5lMgcAxQ',
  'AIzaSyBskPrKeQvxit_Rmm8PG_NO0ZhMQsrktTE',
  'AIzaSyAkUcQ3YiD9cFiwNh8pkmKVxVFxEKFJl2Q',
  'AIzaSyDnX940N-U-Sa0202-v3_TOjXf42XzoNxE',
  'AIzaSyAMl3ueRPwzT1CklxkylmTXzXkFd0A_MqI',
  'AIzaSyA82h-eIBvHWvaYLoP26zMWI_YqwT78OaI',
  'AIzaSyBRI7pd1H2EdCoBunJkteKaCDSH3vfqKUg',
  'AIzaSyA3IuLmRWyTtygsRJYyzHHvSiTPii-4Dbk',
  'AIzaSyB6RHadv3m1WWTFKb_rB9ev_r4r2fM9fNU',
  'AIzaSyCexyfNhzT2py3FLo3sXftqKh0KUdAT--A',
  'AIzaSyC_SN_RdQ2iXzgpqng5Byr-GU5KC5npiAE',
  'AIzaSyBOV9a_TmVAayjpWemkQNGtcEf_QuiXMG0',
  'AIzaSyCFOafntdykM82jJ8ILUqY2l97gdOmwiGg',
  'AIzaSyACxFhgs3tzeeI5cFzrlKmO2jW0l8poPN4',
  'AIzaSyBhZXBhPJCv9x8jKQljZCS4b5bwF3Ip3pk',
  'AIzaSyDF7_-_lXcAKF81SYpcD-NiA5At4Bi8tp8',
  'AIzaSyAwinD7oQiQnXeB2I5kyQsq_hEyJGhSrNg',
];

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// 10 Authors for diversity
const AUTHORS = [
  { name: 'Mihai Popescu', role: 'Expert Tehnologie' },
  { name: 'Elena Ionescu', role: 'Specialist Electrocasnice' },
  { name: 'Andrei Stanciu', role: 'Analist IT' },
  { name: 'Maria Dumitrescu', role: 'Expert Home Living' },
  { name: 'Alexandru Popa', role: 'Specialist Fitness' },
  { name: 'Cristina Gheorghe', role: 'Reviewer Gadgeturi' },
  { name: 'Daniel Marin', role: 'Expert PC & Gaming' },
  { name: 'Ana Radu', role: 'Specialist Bucatarie' },
  { name: 'Bogdan Nicolescu', role: 'Analist Produse' },
  { name: 'Laura Moldovan', role: 'Expert Lifestyle' }
];

let currentKeyIndex = 0;
let currentAuthorIndex = 0;
let keywordsData = { completed: [] };

function getNextGeminiKey() {
  const key = GEMINI_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  return key;
}

function getNextAuthor() {
  const author = AUTHORS[currentAuthorIndex];
  currentAuthorIndex = (currentAuthorIndex + 1) % AUTHORS.length;
  return author;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Escape quotes and special chars for safe use in templates
function escapeForTemplate(str) {
  return str
    .replace(/"/g, '') // Remove double quotes entirely
    .replace(/"/g, '') // Remove smart quotes
    .replace(/"/g, '') // Remove smart quotes
    .replace(/„/g, '') // Remove Romanian quotes
    .replace(/'/g, "'") // Normalize single quotes
    .trim();
}

// Convert markdown bold **text** to <strong>text</strong>
function convertMarkdownBold(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

// Process content into proper HTML with grouped lists and proper paragraphs
function processContentToHtml(content) {
  let sectionContent = content;

  // Normalize: if content already has <p> tags, strip them first
  if (sectionContent.includes('<p>') || sectionContent.includes('<p ')) {
    sectionContent = sectionContent
      .replace(/<\/p>\s*<p>/g, '\n')
      .replace(/<p[^>]*>/g, '')
      .replace(/<\/p>/g, '\n');
  }

  // Insert breaks around block-level elements so they get properly separated
  sectionContent = sectionContent
    .replace(/(<(?:h[1-6]|ul|ol|blockquote|table|div)[\s>])/gi, '\n\n$1')
    .replace(/(<\/(?:h[1-6]|ul|ol|blockquote|table|div)>)/gi, '$1\n\n');

  // Split into blocks and wrap text in <p>, leave block elements as-is
  let blocks = sectionContent.split(/\n\n+/).map(p => p.trim()).filter(p => p);
  // Fallback: if \n\n split produced a single large block, try splitting on \n
  if (blocks.length <= 1 && sectionContent.includes('\n')) {
    blocks = sectionContent.split(/\n/).map(p => p.trim()).filter(p => p);
  }
  sectionContent = blocks.map(p => {
    if (p.match(/^<(?:ul|ol|h[1-6]|table|blockquote|div|section)/i)) {
      return p;
    }
    return `<p>${p}</p>`;
  }).join('\n        ');

  // Split overly long paragraphs for better readability
  sectionContent = sectionContent.replace(/<p>([\s\S]*?)<\/p>/g, (match, inner) => {
    if (inner.length < 500) return match;
    // Split on sentence boundaries (. followed by space and uppercase letter)
    const sentences = inner.split(/(?<=\.)\s+(?=[A-Z])/);
    if (sentences.length <= 3) return match;
    // Group sentences into paragraphs of 2-4 sentences
    const paragraphs = [];
    let current = [];
    let currentLen = 0;
    for (const s of sentences) {
      current.push(s);
      currentLen += s.length;
      if (current.length >= 3 || currentLen > 400) {
        paragraphs.push(current.join(' '));
        current = [];
        currentLen = 0;
      }
    }
    if (current.length > 0) paragraphs.push(current.join(' '));
    if (paragraphs.length <= 1) return match;
    return paragraphs.map(p => `<p>${p}</p>`).join('\n        ');
  });

  return sectionContent;
}

// Extract excerpt from first paragraph of content
function extractExcerpt(sections) {
  if (!sections || !sections.length) return '';
  const firstContent = sections[0].content || '';
  // Get first paragraph (split by newlines, find first non-empty)
  const paragraphs = firstContent.split('\n').filter(p => p.trim() && !p.trim().startsWith('-') && !p.trim().startsWith('*') && !p.trim().match(/^\d+\./));
  if (paragraphs.length > 0) {
    // Remove markdown bold and truncate to ~155 characters
    let excerpt = paragraphs[0].trim().replace(/\*\*([^*]+)\*\*/g, '$1');
    if (excerpt.length > 155) {
      excerpt = excerpt.substring(0, 152) + '...';
    }
    return excerpt;
  }
  return '';
}

async function translateToEnglish(text) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const apiKey = getNextGeminiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Translate the following Romanian text to English. Return ONLY the English translation, nothing else:\n\n${text}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      console.error(`  Translation attempt ${attempt + 1} failed: no candidates`);
    } catch (error) {
      console.error(`  Translation attempt ${attempt + 1} error: ${error.message}`);
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
  }
  return text;
}


// Strip brand names from image prompt to avoid Cloudflare AI content filter
function stripBrands(text) {
  return text
    .replace(/\b[A-Z][a-z]+[A-Z]\w*/g, '')  // camelCase brands: HyperX, PlayStation
    .replace(/\b[A-Z]{2,}\b/g, '')            // ALL CAPS: ASUS, RGB, LED
    .replace(/\s{2,}/g, ' ')                   // collapse double spaces
    .trim();
}

// Use Gemini to rephrase a title into a generic description without brand names
async function rephraseWithoutBrands(text) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const apiKey = getNextGeminiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Rephrase the following into a short, generic English description for an image prompt. Remove ALL brand names, trademarks, product names, and game names. Replace them with generic descriptions of what they are. Return ONLY the rephrased text, nothing else.\n\nExample: "Boggle classic word game" -> "classic letter dice word game on a table"\nExample: "Kindle Paperwhite review" -> "slim e-reader device with paper-like screen"\nExample: "Duolingo app for learning languages" -> "colorful language learning mobile app interface"\n\nText: "${text}"` }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 100 }
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const result = data.candidates[0].content.parts[0].text.trim();
        console.log(`  Rephrased prompt (no brands): ${result}`);
        return result;
      }
    } catch (error) {
      console.error(`  Rephrase attempt ${attempt + 1} error: ${error.message}`);
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
  }
  // Fallback to basic stripBrands
  return stripBrands(text);
}

async function generateSafePrompt(text, categorySlug) {
  const categoryFallbacks = {
    'electrocasnice-mici-premium': 'small kitchen appliances on a clean countertop, modern minimalist kitchen setting',
    'mobila-home-living': 'modern furniture arrangement in a bright living room, clean contemporary interior design',
    'sport-fitness': 'fitness equipment and accessories on a gym floor, bright modern workout space',
    'it-laptopuri': 'laptop computer on a clean modern desk, professional workspace with soft lighting',
    'electronice-gadgeturi': 'electronic devices and gadgets on a modern desk, minimalist tech setup',
    'electrocasnice-mari': 'large kitchen appliances in a modern kitchen interior, clean contemporary home setting',
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const apiKey = getNextGeminiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Create a short, safe English image prompt for a stock photo related to this topic. The prompt must describe ONLY objects, scenery, and atmosphere. NEVER mention people, children, babies, faces, hands, or any human body parts. NEVER use brand names. Focus on products, objects, books, devices, furniture, or abstract scenes. Return ONLY the description.\n\nTopic: "${text}"` }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 100 }
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const result = data.candidates[0].content.parts[0].text.trim();
        console.log(`  Safe prompt generated: ${result}`);
        return result;
      }
    } catch (error) {
      console.error(`  Safe prompt attempt ${attempt + 1} error: ${error.message}`);
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
  }
  // Fallback to hardcoded category description
  return categoryFallbacks[categorySlug] || 'everyday objects on a clean surface, soft natural lighting, minimalist background';
}

async function generateImage(titleRO, slug, categorySlug) {
  const categoryPrompts = {
    'electrocasnice-mici-premium': 'on a clean kitchen countertop, modern kitchen interior, soft natural lighting',
    'mobila-home-living': 'in a modern home interior, lifestyle photography, soft natural lighting, clean contemporary setting',
    'sport-fitness': 'in a bright modern home gym or fitness space, energetic atmosphere, clean background',
    'it-laptopuri': 'on a clean modern desk, professional workspace, soft studio lighting, minimalist background',
    'electronice-gadgeturi': 'on a modern desk setup, soft studio lighting, clean minimalist background, tech lifestyle',
    'electrocasnice-mari': 'in a modern kitchen or laundry room, clean contemporary interior, soft natural lighting',
  };

  console.log(`  Generating image for: ${titleRO}`);

  const MAX_IMAGE_RETRIES = 4;
  let promptFlagged = false;

  for (let attempt = 1; attempt <= MAX_IMAGE_RETRIES; attempt++) {

    if (attempt > 1) {

      console.log(`  Image retry attempt ${attempt}/${MAX_IMAGE_RETRIES}...`);

      await new Promise(r => setTimeout(r, 3000 * attempt));

    }


  try {
    const titleEn = await translateToEnglish(titleRO);
    console.log(`  Translated title: ${titleEn}`);

    let prompt;
    if (attempt >= 3) {
      const safeSubject = await generateSafePrompt(titleEn, categorySlug);
      prompt = `Realistic photograph of ${safeSubject}, no text, no writing, no words, no letters, no numbers. Photorealistic, high quality, professional photography.`;
    } else {
      const setting = categoryPrompts[categorySlug] || 'in a modern home setting, soft natural lighting, clean contemporary background';
      const subject = promptFlagged ? await rephraseWithoutBrands(titleEn) : titleEn;
      prompt = `Realistic photograph of ${subject} ${setting}, no text, no brand name, no writing, no words, no letters, no numbers. Photorealistic, high quality, professional product photography.`;
    }

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('steps', '20');
    formData.append('width', '1024');
    formData.append('height', '768');

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-2-dev`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  Image API error: ${response.status} - ${errorText.slice(0, 200)}`);
      if (errorText.includes('flagged')) promptFlagged = true;
      continue;
    }

    const data = await response.json();
    if (!data.result?.image) {
      console.error('  No image in response');
      continue;
    }

    const imageBuffer = Buffer.from(data.result.image, 'base64');

    // Process with sharp
    const imagePath = path.join(ROOT_DIR, 'public', 'images', 'articles', `${slug}.webp`);
    const sharp = (await import('sharp')).default;
    await sharp(imageBuffer)
      .resize(800, 600, { fit: 'cover' })
      .webp({ quality: 82, effort: 6 })
      .toFile(imagePath);

    console.log(`  Image saved: ${imagePath}`);
    return `/images/articles/${slug}.webp`;
  } catch (error) {
    console.error(`  Image generation error: ${error.message}`);
    continue;
  }


  }

  console.error('  Image generation failed after all retries');

  return null;
}

async function generateArticleContent(keyword, category, completedArticles = []) {
  const apiKey = getNextGeminiKey();
  // Using Gemini 2.5 Flash Lite (FREE)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  
  // Build interlink list from completed articles
  const currentSlug = keyword.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const interlinkCandidates = completedArticles
    .filter(a => a.keyword !== keyword)
    .map(a => {
      const aSlug = a.keyword.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return { title: a.keyword.charAt(0).toUpperCase() + a.keyword.slice(1), slug: aSlug, category: a.category, categorySlug: a.categorySlug };
    });
  // Prioritize same category, then others, max 15
  const sameCategory = interlinkCandidates.filter(a => a.categorySlug === completedArticles.find(c => c.keyword === keyword)?.categorySlug);
  const otherCategory = interlinkCandidates.filter(a => !sameCategory.includes(a));
  const interlinkList = [...sameCategory, ...otherCategory].slice(0, 15)
    .map(a => `- <a href="/${a.slug}/">${a.title}</a> (categorie: ${a.category})`)
    .join('\n');

const prompt = `Scrii articole pe un site romanesc despre electrocasnice - masini de spalat, frigidere, cuptoare, aspiratoare si alte aparate pentru casa. Stilul e informativ dar directionat spre conversie - ajuti cititorul sa ia o decizie de cumparare. NU esti un AI.

Keyword: "${keyword}"
Categorie: "${category}"

=== TONUL SI STILUL ===

INTRO:
- Prima propozitie = raspunsul direct la intentia de cautare. FARA "bun venit", FARA preambul.
- Intro-ul e scurt (3-5 propozitii), da context si spune clar ce gaseste cititorul in articol.

REVIEW-URI PRODUSE:
- Fiecare produs are review individual: specs reale, parere onesta, pro/contra.
- Scrie ca si cum ai testat personal produsul sau ai cercetat temeinic.
- Include anecdote: "am avut un X care a tinut 4 ani", "un prieten si-a luat Y si dupa 2 luni..."
- Critica onesta: fiecare produs minim 1-2 minusuri REALE, nu "singurul minus e ca e prea bun".

CONVERSIE:
- Dupa fiecare review, o propozitie care ghideaza decizia: "Daca ai nevoie de X, asta e alegerea ta."
- Compara produsele intre ele natural, nu izolat.
- Verdict clar pe categorii de buget la final.

=== ANTI-AI (FOARTE IMPORTANT) ===
CUVINTE SI EXPRESII INTERZISE (nu le folosi NICIODATA):
"Asadar", "De asemenea", "Cu toate acestea", "Este important de mentionat", "Nu in ultimul rand", "in era actuala", "descopera", "fara indoiala", "in concluzie", "este esential", "este crucial", "o alegere excelenta", "ghid", "ghiduri", "exploreaza", "aprofundam", "remarcabil", "exceptional", "revolutionar", "inovativ", "vom detalia", "vom analiza", "vom explora", "vom prezenta", "in cele ce urmeaza", "in continuare vom", "sa aruncam o privire", "buget optimizat", "alegerea editorului", "editor's choice"

Reguli anti-AI:
- Amesteca propozitii FOARTE scurte (3-5 cuv: "Merita. Punct." / "Nu-i rau.") cu lungi (18-22 cuv)
- FARA structura predictibila: paragraf de 2 prop, apoi 4, apoi 1
- Limbaj conversational: "na", "uite", "stai putin", "pe bune", "sincer", "daca ma intrebi pe mine"
- Imperfectiuni naturale: "bon, stai", "cum sa zic", "pana la urma", "na, asta e"
- Recunoaste incertitudine: "n-am testat personal, dar din ce am auzit..."
- INTERZIS: liste de 3 adjective consecutive, acelasi pattern de inceput de paragraf

=== TAG-URI INTERZISE ===
NU folosi niciodata: "Buget Optimizat", "Alegerea Editorului", "Editor's Choice"
In schimb, foloseste: "Alegerea Noastra", "Pentru Buget Mic", "Best Buy 2026", "Raport Calitate-Pret", "Premium"

=== PARAGRAFE CU INTREBARI (AI SEARCH OPTIMIZATION) ===
In sectiunile de review si guide, include paragrafe care incep cu o intrebare retorica naturala:
"Care e diferenta reala intre modelul X si Y?" sau "Merita sa dai mai mult pe varianta premium?"
Asta ajuta la AI search snippets si People Also Ask.

=== STRUCTURA JSON ===
Returneaza DOAR JSON valid, fara markdown, fara \`\`\`:
{
  "intro": "3-5 propozitii. Raspuns direct la search intent + context scurt. FARA introducere generica.",
  "items": [
    {
      "tag": "Alegerea Noastra / Pentru Buget Mic / Best Buy 2026 / Raport Calitate-Pret / Premium",
      "name": "Nume complet produs (brand + model)",
      "specs": {
        "putere": "ex: 2400W / clasa energetica A+++",
        "capacitate": "ex: 9kg spalare / 360L volum net",
        "functii": "ex: 15 programe, steam refresh, WiFi",
        "dimensiuni": "ex: 60x55x85 cm, 72 kg",
        "consum_energie": "ex: 52 kWh/an, clasa A"
      },
      "review": "2-4 paragrafe HTML (<p>) cu parere onesta, experienta, comparatii. Keyword in <strong> unde e natural.",
      "pros": ["avantaj1", "avantaj2", "avantaj3"],
      "cons": ["dezavantaj real 1", "dezavantaj real 2"]
    }
  ],
  "comparison": [
    {"model":"...", "putere":"...", "capacitate":"...", "functii":"...", "consum_energie":"...", "potrivitPentru":"..."}
  ],
  "guide": {
    "title": "Titlu creativ pentru ghidul de cumparare (fara cuvantul 'ghid')",
    "content": "HTML formatat cu <h4>, <p>, <ul>/<li>. Criterii de alegere, greseli frecvente, sfaturi de insider. Minim 400 cuvinte."
  },
  "faq": [
    {
      "question": "Intrebare EXACT cum ar tasta-o un roman in Google",
      "answer": "Prima propozitie = raspuns direct. Apoi 1-2 propozitii cu detalii si cifre. 40-70 cuvinte."
    }
  ]
}

=== CERINTE PRODUSE ===
- 5-7 produse, specs REALE (nu inventate), preturi in lei Romania 2026
- Specs specifice electrocasnice: putere, capacitate, functii, dimensiuni, consum_energie
- Fiecare produs: tag, name, specs (toate 5 campurile), review (2-4 paragrafe), pros (3-4), cons (2-3)
- Preturile trebuie sa fie realiste pentru piata romaneasca

=== CERINTE FAQ ===
- 5 intrebari formatate cum le tasteaza oamenii in Google Romania
- Formulari naturale: "cat costa...", "care e diferenta intre...", "merita sa...", "ce ... e mai bun"
- Raspunsuri cu structura featured snippet: raspuns direct + detalii cu cifre

=== REGULI ===
- Scrie FARA diacritice (fara a, i, s, t - foloseste a, i, s, t)
- Preturile in LEI, realiste pentru Romania 2026
- Keyword-ul "${keyword}" in <strong> de 4-6 ori in tot articolul, DOAR in <p>, NU in heading/question
- Minim 2000 cuvinte total
- NICIODATA <strong> in titluri, intrebari FAQ sau TOC

${interlinkList.length > 0 ? `
=== INTERLINK-URI INTERNE (SEO) ===
Mentioneaza NATURAL in text 2-4 articole de pe site, cu link-uri <a href="/{slug}/">{titlu}</a>.
Integreaza in propozitii, NU ca lista separata. Max 4 link-uri. Doar unde are sens contextual.
NU forta link-uri daca nu au legatura cu subiectul. Mai bine 0 link-uri decat link-uri fortate.

Articole disponibile:
${interlinkList}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 40000,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      let text = data.candidates[0].content.parts[0].text.trim();
      const parsed = JSON.parse(text);
      if (!parsed.intro || !parsed.items || !parsed.faq) {
        throw new Error('Invalid JSON structure');
      }
      return parsed;
    }

    const errorMsg = data.error?.message || JSON.stringify(data).slice(0, 200);
    throw new Error(`Gemini API: ${errorMsg}`);
  } catch (error) {
    console.error('  Content generation error:', error.message);
    throw error;
  }
}

function stripStrong(str) {
  return str.replace(/<\/?strong>/g, '');
}

function stripFakeLinks(html, pagesDir) {
  return html.replace(/<a\s+href="\/([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, linkPath, text) => {
    const slug = linkPath.replace(/\/$/, '');
    if (fs.existsSync(path.join(pagesDir, `${slug}.astro`))) return match;
    if (fs.existsSync(path.join(pagesDir, slug))) return match;
    return text;
  });
}

function cleanHtml(str) {
  return str
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '');
}

function createArticlePage(article, content, imagePath, author) {
  const slug = slugify(article.keyword);
  const title = capitalizeFirst(article.keyword);
  const date = new Date().toISOString();

  // --- Intro HTML & excerpt from first <p> ---
  const introHtml = cleanHtml(processContentToHtml(content.intro));
  const firstPMatch = introHtml.match(/<p>([\s\S]*?)<\/p>/);
  const rawExcerpt = firstPMatch
    ? firstPMatch[1].replace(/<[^>]*>/g, '').trim()
    : content.intro.replace(/<[^>]*>/g, '').trim();
  const excerpt = escapeForTemplate(
    rawExcerpt.length > 155 ? rawExcerpt.substring(0, 152) + '...' : rawExcerpt
  );

  // --- Items HTML ---
  let itemsHtml = '';
  (content.items || []).forEach((item, idx) => {
    const itemId = slugify(stripStrong(item.name));
    itemsHtml += `\n<article class="product-review" id="${itemId}">`;
    itemsHtml += `\n  <div class="product-review__header">`;
    if (item.tag) {
      itemsHtml += `\n    <span class="section-tag">${stripStrong(item.tag)}</span>`;
    }
    itemsHtml += `\n    <h3>${stripStrong(item.name)}</h3>`;
    // Specs grid
    if (item.specs) {
      itemsHtml += `\n    <div class="product-review__specs-grid">`;
      const specLabels = { putere: 'Putere', capacitate: 'Capacitate', functii: 'Functii', dimensiuni: 'Dimensiuni', consum_energie: 'Consum Energie' };
      for (const [key, label] of Object.entries(specLabels)) {
        if (item.specs[key]) {
          itemsHtml += `\n      <div class="product-review__spec"><strong>${label}</strong>${escapeForTemplate(item.specs[key])}</div>`;
        }
      }
      itemsHtml += `\n    </div>`;
    }
    itemsHtml += `\n  </div>`;
    // Review content
    itemsHtml += `\n  <div class="product-review__content">`;
    itemsHtml += cleanHtml(processContentToHtml(item.review || ''));
    // Pros / Cons
    if ((item.pros && item.pros.length) || (item.cons && item.cons.length)) {
      itemsHtml += `\n    <div class="product-review__lists">`;
      if (item.pros && item.pros.length) {
        itemsHtml += `\n      <div><h4>Avantaje</h4><ul class="product-review__pros">`;
        item.pros.forEach(p => { itemsHtml += `<li>${escapeForTemplate(p)}</li>`; });
        itemsHtml += `</ul></div>`;
      }
      if (item.cons && item.cons.length) {
        itemsHtml += `\n      <div><h4>Dezavantaje</h4><ul class="product-review__cons">`;
        item.cons.forEach(c => { itemsHtml += `<li>${escapeForTemplate(c)}</li>`; });
        itemsHtml += `</ul></div>`;
      }
      itemsHtml += `\n    </div>`;
    }
    itemsHtml += `\n  </div>`;
    itemsHtml += `\n</article>`;
  });

  // --- Comparison HTML ---
  let comparisonHtml = '';
  if (content.comparison && content.comparison.length) {
    const compId = 'comparatie';
    // Detect columns dynamically from first row keys
    const allKeys = Object.keys(content.comparison[0]);
    const colLabels = { model: 'Model', putere: 'Putere', capacitate: 'Capacitate', functii: 'Functii', consum_energie: 'Consum', potrivitPentru: 'Potrivit Pentru' };
    const cols = allKeys.filter(k => colLabels[k]);
    comparisonHtml += `\n<section id="${compId}">`;
    comparisonHtml += `\n  <h2>Comparatie rapida</h2>`;
    comparisonHtml += `\n  <div class="comparison-outer" id="comparison-outer">`;
    comparisonHtml += `\n    <div class="comparison-hint"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Scroll horizontal pentru toate coloanele</div>`;
    comparisonHtml += `\n    <div class="comparison-wrap">`;
    comparisonHtml += `\n      <table class="comparison-table">`;
    comparisonHtml += `\n        <thead><tr>`;
    cols.forEach(k => { comparisonHtml += `<th>${colLabels[k] || k}</th>`; });
    comparisonHtml += `</tr></thead>`;
    comparisonHtml += `\n        <tbody>`;
    content.comparison.forEach(row => {
      comparisonHtml += `<tr>`;
      cols.forEach(k => { comparisonHtml += `<td>${escapeForTemplate(row[k] || '-')}</td>`; });
      comparisonHtml += `</tr>`;
    });
    comparisonHtml += `\n        </tbody>`;
    comparisonHtml += `\n      </table>`;
    comparisonHtml += `\n    </div>`;
    comparisonHtml += `\n  </div>`;
    comparisonHtml += `\n</section>`;
  }

  // --- Guide HTML ---
  let guideHtml = '';
  if (content.guide) {
    const guideId = slugify(stripStrong(content.guide.title || 'ce-sa-alegi'));
    guideHtml += `\n<section id="${guideId}">`;
    guideHtml += `\n  <h2>${stripStrong(content.guide.title)}</h2>`;
    guideHtml += `\n  <div class="guide">`;
    guideHtml += cleanHtml(processContentToHtml(content.guide.content || ''));
    guideHtml += `\n  </div>`;
    guideHtml += `\n</section>`;
  }

  // --- FAQ HTML ---
  let faqHtml = '\n<section id="faq" class="faq-section">\n';
  faqHtml += '  <h2>Intrebari Frecvente</h2>\n';
  faqHtml += '  <div class="faq-list">\n';
  content.faq.forEach(item => {
    faqHtml += '    <div class="faq-item">\n';
    faqHtml += `      <div class="faq-question">${stripStrong(item.question)}</div>\n`;
    faqHtml += `      <div class="faq-answer">${stripStrong(item.answer)}</div>\n`;
    faqHtml += '    </div>\n';
  });
  faqHtml += '  </div>\n';
  faqHtml += '</section>';

  // --- TOC from items + comparison + guide + FAQ ---
  let tocHtml = '<nav class="toc">\n';
  tocHtml += '  <div class="toc-title">\n';
  tocHtml += '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h7"></path></svg>\n';
  tocHtml += '    Cuprins\n';
  tocHtml += '  </div>\n';
  tocHtml += '  <ul class="toc-list">\n';
  (content.items || []).forEach(item => {
    const itemId = slugify(stripStrong(item.name));
    tocHtml += `    <li><a href="#${itemId}">${stripStrong(item.name)}</a></li>\n`;
  });
  if (content.comparison && content.comparison.length) {
    tocHtml += '    <li><a href="#comparatie">Comparatie rapida</a></li>\n';
  }
  if (content.guide) {
    const guideId = slugify(stripStrong(content.guide.title || 'ce-sa-alegi'));
    tocHtml += `    <li><a href="#${guideId}">${stripStrong(content.guide.title)}</a></li>\n`;
  }
  tocHtml += '    <li><a href="#faq">Intrebari Frecvente</a></li>\n';
  tocHtml += '  </ul>\n';
  tocHtml += '</nav>';

  const categorySlug = article.categorySlug;

  let pageContent = `---
import Layout from '../layouts/Layout.astro';
import PrevNextNav from '../components/PrevNextNav.astro';
import keywordsData from '../../keywords.json';

const allArticles = (keywordsData.completed || []).map(item => ({
  title: item.keyword.charAt(0).toUpperCase() + item.keyword.slice(1),
  slug: item.keyword.toLowerCase()
    .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
    .replace(/ș/g, 's').replace(/ț/g, 't')
    .replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  category: item.category,
  categorySlug: item.categorySlug,
  date: item.date || new Date().toISOString()
}));

export const frontmatter = {
  title: "${title}",
  excerpt: "${excerpt}",
  image: "${imagePath || '/images/default.webp'}",
  category: "${article.category}",
  categorySlug: "${categorySlug}",
  date: "${date}",
  author: "${author.name}",
  authorRole: "${author.role}"
};
---

<Layout
  title="${title}"
  description="${excerpt}"
  image="${imagePath || '/images/default.webp'}"
  type="article"
  publishedDate="${date}"
  modifiedDate="${date}"
  category="${article.category}"
  categorySlug="${categorySlug}"
  author="${author.name}"
  faq={${JSON.stringify(content.faq.map(item => ({ question: stripStrong(item.question), answer: stripStrong(item.answer) })))}}
>
  <article class="article-page">
    <div class="container-main">
      <div class="article-container">
        <!-- Breadcrumb -->
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <ol class="breadcrumb-list">
            <li><a href="/">Acasa</a></li>
            <li><span class="breadcrumb-separator">/</span></li>
            <li><a href="/${categorySlug}/">${article.category}</a></li>
            <li><span class="breadcrumb-separator">/</span></li>
            <li class="breadcrumb-current">${title}</li>
          </ol>
        </nav>

        <!-- Header -->
        <header class="article-header">
          <span class="category-badge">${article.category}</span>
          <h1 class="article-title">${title}</h1>
          <div class="article-header-meta">
            <div class="article-author">
              <div class="article-author-avatar">
                ${author.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div class="article-author-info">
                <span class="article-author-name">${author.name}</span>
                <span class="article-author-role">${author.role}</span>
              </div>
            </div>
            <time class="article-date" datetime="${date}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${new Date(date).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          </div>
        </header>

        <!-- Featured Image -->
        ${imagePath ? `<div class="article-image">
          <img src="${imagePath}" alt="${title}" width="800" height="600" loading="eager" />
        </div>` : ''}

        <!-- Table of Contents -->
        <Fragment set:html={\`${tocHtml}\`} />

        <!-- Article Content -->
        <div class="prose-article">
          <!-- Intro -->
          <Fragment set:html={\`${introHtml}\`} />

          <!-- Product Reviews -->
          <Fragment set:html={\`${itemsHtml}\`} />

          <!-- Comparison Table -->
          <Fragment set:html={\`${comparisonHtml}\`} />

          <!-- Buying Guide -->
          <Fragment set:html={\`${guideHtml}\`} />

          <!-- FAQ -->
          <Fragment set:html={\`${faqHtml}\`} />
        </div>

        <!-- Author Box -->
        <div class="author-box">
          <div class="author-box-content">
            <div class="author-avatar">
              ${author.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div class="author-info">
              <div class="author-name">${author.name}</div>
              <div class="author-role">${author.role}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Prev/Next Navigation -->
    <PrevNextNav
      currentSlug="${slug}"
      currentCategory="${categorySlug}"
      articles={allArticles}
    />
  </article>

  <script>
    // Comparison table scroll detection
    document.addEventListener('DOMContentLoaded', () => {
      const outer = document.getElementById('comparison-outer');
      if (outer) {
        const wrap = outer.querySelector('.comparison-wrap');
        function checkScroll() {
          if (wrap && wrap.scrollWidth > wrap.clientWidth) {
            outer.classList.add('can-scroll');
          } else {
            outer.classList.remove('can-scroll');
          }
        }
        checkScroll();
        window.addEventListener('resize', checkScroll);
      }

      // TOC active tracking
      const tocLinks = document.querySelectorAll('.toc-list a');
      if (tocLinks.length) {
        const ids = Array.from(tocLinks).map(a => a.getAttribute('href').replace('#', '')).filter(Boolean);
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              tocLinks.forEach(a => a.classList.remove('active'));
              const active = document.querySelector('.toc-list a[href="#' + entry.target.id + '"]');
              if (active) active.classList.add('active');
            }
          });
        }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });
        ids.forEach(id => {
          const el = document.getElementById(id);
          if (el) observer.observe(el);
        });
      }
    });
  </script>
</Layout>
`;

  const filePath = path.join(ROOT_DIR, 'src', 'pages', `${slug}.astro`);
  pageContent = stripFakeLinks(pageContent, path.join(ROOT_DIR, 'src', 'pages'));
  fs.writeFileSync(filePath, pageContent, 'utf-8');
  console.log(`  Article page created: ${filePath}`);

  return { slug, excerpt };
}

async function generateArticle(article, generateImageFlag = true) {
  console.log(`\nGenerating article: ${article.keyword}`);

  const slug = slugify(article.keyword);
  const author = getNextAuthor();

  // Generate content
  console.log('  Generating content with Gemini 2.5 Flash Lite (FREE)...');
  const content = await generateArticleContent(article.keyword, article.category, keywordsData?.completed || []);

  if (!content) {
    console.error('  Failed to generate content');
    return null;
  }

  // Generate image
  let imagePath = null;
  if (generateImageFlag) {
    imagePath = await generateImage(article.keyword, slug, article.categorySlug);
  }

  // Create article page
  const articleData = createArticlePage(article, content, imagePath, author);

  return articleData.slug;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Balador.ro Article Generator');
  console.log('Using Gemini 2.5 Flash Lite (FREE) + ImageRouter API');
  console.log('='.repeat(60));

  // Ensure directories exist
  const imagesDir = path.join(ROOT_DIR, 'public', 'images', 'articles');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Read config from temp file
  const configPath = path.join(ROOT_DIR, 'temp-articles.json');
  if (!fs.existsSync(configPath)) {
    console.error('No temp-articles.json found. Run auto-generate.js first.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const articles = config.articles || [];

  // Load keywords.json for interlinks (completed articles list)
  try {
    keywordsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'keywords.json'), 'utf-8'));
  } catch (e) {}

  console.log(`\nProcessing ${articles.length} articles...\n`);

  const results = [];
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`\n[${i + 1}/${articles.length}] ${article.keyword}`);
    console.log('-'.repeat(50));

    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
      try {
        const slug = await generateArticle(article, true);
        if (slug) {
          results.push({ keyword: article.keyword, slug, success: true });
          console.log('  SUCCESS!');
          success = true;
        } else {
          throw new Error('Content generation returned null');
        }
      } catch (error) {
        retries--;
        if (retries > 0) {
          const isRateLimit = error.message.includes('429') || error.message.includes('503') || error.message.includes('overloaded');
          const waitTime = isRateLimit ? 60000 : 5000;
          console.log(`  Retry ${3 - retries}/3 - waiting ${waitTime/1000}s...`);
          await delay(waitTime);
        } else {
          console.error(`  FAILED after 3 retries: ${error.message}`);
          results.push({ keyword: article.keyword, success: false, error: error.message });
        }
      }
    }

    // Delay between articles to avoid rate limits
    if (i < articles.length - 1) {
      console.log('  Waiting before next article...');
      await delay(3000);
    }
  }

  // Write results
  fs.writeFileSync(
    path.join(ROOT_DIR, 'generation-results.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );

  console.log('\n' + '='.repeat(60));
  console.log('Generation Complete');
  console.log(`Success: ${results.filter(r => r.success).length}/${articles.length}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
