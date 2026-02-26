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
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
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

  const MAX_IMAGE_RETRIES = 3;
  let promptFlagged = false;

  for (let attempt = 1; attempt <= MAX_IMAGE_RETRIES; attempt++) {

    if (attempt > 1) {

      console.log(`  Image retry attempt ${attempt}/${MAX_IMAGE_RETRIES}...`);

      await new Promise(r => setTimeout(r, 3000 * attempt));

    }


  try {
    const titleEn = await translateToEnglish(titleRO);
    console.log(`  Translated title: ${titleEn}`);

    const setting = categoryPrompts[categorySlug] || 'in a modern home setting, soft natural lighting, clean contemporary background';
    const prompt = `Realistic photograph of ${promptFlagged ? stripBrands(titleEn) : titleEn} ${setting}, no text, no brand name, no writing, no words, no letters, no numbers. Photorealistic, high quality, professional product photography.`;

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

async function generateArticleContent(keyword, category) {
  const apiKey = getNextGeminiKey();
  // Using Gemini 2.5 Flash Lite (FREE)
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const prompt = `Esti un expert in produse tech, electronice si electrocasnice care scrie pe un blog romanesc. Scrii intr-un stil direct, conversational, ca un prieten care se pricepe si iti da sfaturi concrete. NU esti un AI. Esti un om real cu experienta reala.

Keyword: "${keyword}"
Categorie: "${category}"

GENEREAZA un articol complet in format JSON cu structura de mai jos. Articolul trebuie sa fie informativ, natural, scris de un om care chiar stie domeniul. Fara diacritice. Intre 1500-2500 de cuvinte.

=== 1. SEARCH INTENT MAPPING (CRITIC) ===
Structura articolului urmeaza EXACT ce cauta userul cand tasteaza "${keyword}" in Google:
- PRIMA sectiune = raspunsul direct, concret, fara introducere, fara "bun venit", fara preambul. Userul vrea raspunsul ACUM.
- Dupa raspunsul direct, vin detaliile, comparatiile, criteriile de alegere.
- Fiecare sectiune raspunde la o sub-intrebare pe care userul o are in minte.
- NU incepe NICIODATA cu o introducere generica. Prima propozitie = recomandarea ta directa sau raspunsul la intentia de cautare.
- Excerptul = primele 2-3 propozitii din articol care dau raspunsul direct. Asta apare in Google ca snippet.

=== 2. ANTI-AI FOOTPRINT (FOARTE IMPORTANT) ===
Articolul TREBUIE sa para scris de un om real, nu de AI. Reguli concrete:
- FARA tranzitii generice: NU folosi "Asadar", "In primul rand", "De asemenea", "Cu toate acestea", "Este important de mentionat", "Trebuie sa tinem cont", "Nu in ultimul rand"
- FARA structura predictibila: nu toate paragrafele sa aiba aceeasi lungime. Amesteca: un paragraf de 2 propozitii, urmat de unul de 4, apoi unul de 1 propozitie.
- IMPERFECTIUNI NATURALE: include formulari imperfecte dar naturale: "bon, stai", "cum sa zic", "pana la urma", "na, asta e", "ma rog", "zic si eu"
- Amesteca propozitii FOARTE scurte (3-5 cuvinte: "Merita. Punct." / "Nu-i rau." / "Depinde de buget.") cu propozitii lungi (18-22 cuvinte)
- Foloseste MULT limbaj conversational romanesc: "na", "uite", "stai putin", "pe bune", "sincer", "daca ma intrebi pe mine", "am sa fiu direct", "uite care-i treaba"
- INTERZIS TOTAL: "in era actuala", "descopera", "fara indoiala", "ghid complet", "in concluzie", "in acest articol", "hai sa exploram", "sa aprofundam", "merita mentionat", "este esential", "este crucial", "o alegere excelenta"
- INTERZIS: liste de 3 adjective consecutive, inceperea a doua propozitii la rand cu acelasi cuvant, folosirea aceluiasi pattern de inceput de paragraf
- Include anecdote personale CONCRETE: "am avut un X care a tinut 4 ani", "un prieten si-a luat un Y si dupa 2 luni...", "am testat personal modelul asta vreo 3 saptamani"
- Include critici ONESTE: fiecare produs sa aiba minim 1-2 minusuri reale, nu critici false gen "singurul minus e ca e prea bun"
- Recunoaste incertitudine: "n-am testat personal, dar din ce am auzit...", "pe asta nu pun mana in foc, dar..."
- Vorbeste ca pe un forum romanesc, nu ca o enciclopedie

=== 3. FAQ OPTIMIZAT PEOPLE ALSO ASK ===
8 intrebari formatate EXACT cum le tasteaza oamenii in Google Romania:
- Foloseste formulari naturale de cautare: "cat costa...", "care e diferenta intre...", "merita sa...", "ce ... e mai bun", "de ce...", "cum sa...", "unde gasesc..."
- FARA intrebari artificiale sau formale. Gandeste-te: ce ar tasta un roman in Google?
- Raspunsurile au structura de FEATURED SNIPPET: prima propozitie = raspunsul direct si clar, apoi 1-2 propozitii cu detalii si cifre concrete
- Raspuns = 40-70 cuvinte, auto-suficient (sa poata fi afisat singur ca snippet fara context)
- Include cifre concrete: preturi in lei, procente, durate, dimensiuni
- Acoperiti: pret, comparatie, durabilitate, alegere, probleme frecvente, intretinere, autenticitate, unde sa cumperi

=== 4. LIZIBILITATE PERFECTA PARAGRAFE ===
- MAXIM 3-4 propozitii per paragraf. Niciodata mai mult.
- Paragrafele lungi sunt INTERZISE. Daca un paragraf are mai mult de 4 propozitii, sparge-l.
- Alterna paragrafele: unul mai lung (3-4 prop), unul scurt (1-2 prop), unul mediu (2-3 prop)
- Intre sectiuni lasa "aer" - nu pune paragraf dupa paragraf fara pauza
- Foloseste bullet points (<ul><li>) pentru liste de criterii, avantaje, dezavantaje - nu le pune in text continuu
- Subtitlurile (H3) sparg monotonia - foloseste-le in cadrul sectiunilor pentru a crea sub-puncte

=== 5. CUVINTE CHEIE IN STRONG ===
- Pune keyword-ul principal si variatiile lui in <strong> tags de fiecare data cand apar natural in text
- Keyword principal: "${keyword}" - trebuie sa apara de 4-6 ori in tot articolul, in <strong>
- Variatii naturale ale keyword-ului: pune si ele in <strong>
- NU pune in strong cuvinte random sau irelevante. Doar keyword-urile si variatiile lor.
- Nu forta keyword density. Trebuie sa sune natural, ca si cum ai sublinia ce e important.
- NICIODATA nu pune <strong> in titluri de sectiuni (heading), in intrebarile FAQ, sau in textul din cuprins/TOC. Strong se foloseste DOAR in paragrafe de text (<p>), nu in <h2>, <h3>, "question", sau "heading".

=== REGULI SUPLIMENTARE ===
- Scrie FARA diacritice (fara ă, î, ș, ț, â - foloseste a, i, s, t)
- Preturile sa fie in LEI si realiste pentru piata din Romania
- Fiecare sectiune minim 250 cuvinte

STRUCTURA JSON (returneaza DOAR JSON valid, fara markdown, fara \`\`\`):
{
  "excerpt": "Primele 2-3 propozitii care dau raspunsul direct la ce cauta userul. Recomandarea concreta + context scurt. FARA introducere.",
  "sections": [
    {
      "title": "Titlu sectiune cu keyword integrat natural",
      "content": "HTML formatat cu <p>, <strong>, <ul>/<li>. Minim 250 cuvinte per sectiune. Paragrafele separate cu </p><p>. Maxim 3-4 propozitii per paragraf."
    }
  ],
  "faq": [
    {
      "question": "Intrebare EXACT cum ar tasta-o un roman in Google",
      "answer": "Prima propozitie = raspuns direct (featured snippet). Apoi 1-2 propozitii cu detalii si cifre. Total 40-70 cuvinte."
    }
  ]
}

SECTIUNI OBLIGATORII (6 sectiuni, titluri creative, NU generice):
1. [Raspuns direct] - recomandarea ta principala cu explicatie, fara preambul (titlu creativ legat de keyword, NU "raspunsul direct")
2. [Top recomandari] - 4-5 produse cu preturi reale in lei, avantaje si dezavantaje oneste (cu minusuri reale)
3. [Criterii de alegere] - pe ce sa te uiti cand alegi, explicat pe intelesul tuturor, cu exemple concrete
4. [Comparatie] - head-to-head intre 2-3 optiuni populare, cu preturi si diferente clare
5. [Greseli si tips] - ce sa eviti, sfaturi de insider, greseli pe care le fac toti
6. [Verdict pe buget] - recomandare finala pe 3 categorii de buget: mic, mediu, mare (NU folosi cuvantul "concluzie")

FAQ: 8 intrebari naturale, formulari de cautare Google reale, raspunsuri cu structura featured snippet.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16000
        }
      })
    });

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      let text = data.candidates[0].content.parts[0].text;
      // Clean up markdown code blocks
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      // Extract JSON object if there's extra text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      const parsed = JSON.parse(text);
      if (!parsed.excerpt || !parsed.sections || !parsed.faq) {
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

function createArticlePage(article, content, imagePath, author) {
  const slug = slugify(article.keyword);
  const title = capitalizeFirst(article.keyword);
  const date = new Date().toISOString();

  // Build TOC HTML (will be made collapsible via JS)
  let tocHtml = '<nav class="toc">\n';
  tocHtml += '  <div class="toc-title">\n';
  tocHtml += '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h7"></path></svg>\n';
  tocHtml += '    Cuprins\n';
  tocHtml += '  </div>\n';
  tocHtml += '  <ul class="toc-list">\n';

  content.sections.forEach((section, idx) => {
    const sectionId = slugify(stripStrong(section.title));
    tocHtml += `    <li><a href="#${sectionId}">${stripStrong(section.title)}</a></li>\n`;
  });

  tocHtml += '    <li><a href="#faq">Intrebari Frecvente</a></li>\n';
  tocHtml += '  </ul>\n';
  tocHtml += '</nav>';

  // Build article content HTML (convert markdown bold to <strong>, group lists properly)
  let sectionsHtml = '';
  content.sections.forEach((section, idx) => {
    const sectionId = slugify(stripStrong(section.title));
    sectionsHtml += `\n<h2 id="${sectionId}">${stripStrong(section.title)}</h2>\n`;

    // Process section content with proper list grouping
    sectionsHtml += processContentToHtml(section.content);

    if (section.subsections) {
      section.subsections.forEach(sub => {
        sectionsHtml += `\n<h3>${sub.title}</h3>\n`;
        sectionsHtml += processContentToHtml(sub.content);
      });
    }
  });

  // Build FAQ HTML
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

  // Always extract excerpt from first paragraph (more natural, matches article content)
  const rawExcerpt = extractExcerpt(content.sections) || content.excerpt;
  const cleanExcerpt = rawExcerpt.replace(/<[^>]*>/g, '');  // Strip HTML tags
  const excerpt = escapeForTemplate(cleanExcerpt);

  const pageContent = `---
import Layout from '../layouts/Layout.astro';

export const frontmatter = {
  title: "${title}",
  excerpt: "${excerpt}",
  image: "${imagePath || '/images/default.webp'}",
  category: "${article.category}",
  categorySlug: "${article.categorySlug}",
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
  categorySlug="${article.categorySlug}"
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
            <li><a href="/${article.categorySlug}/">${article.category}</a></li>
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
          <Fragment set:html={\`${sectionsHtml}\`} />
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
  </article>
</Layout>
`;

  const filePath = path.join(ROOT_DIR, 'src', 'pages', `${slug}.astro`);
  fs.writeFileSync(filePath, pageContent, 'utf-8');
  console.log(`  Article page created: ${filePath}`);

  return slug;
}

async function generateArticle(article, generateImageFlag = true) {
  console.log(`\nGenerating article: ${article.keyword}`);

  const slug = slugify(article.keyword);
  const author = getNextAuthor();

  // Generate content
  console.log('  Generating content with Gemini 2.5 Flash Lite (FREE)...');
  const content = await generateArticleContent(article.keyword, article.category);

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
  createArticlePage(article, content, imagePath, author);

  return slug;
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
