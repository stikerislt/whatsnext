/** Known skills for CV text matching (case-insensitive word boundary). */
export const CV_SKILL_TAXONOMY = [
  'React',
  'TypeScript',
  'Next.js',
  'Node.js',
  'JavaScript',
  'Python',
  'Go',
  'Golang',
  'Java',
  'Kotlin',
  'Kubernetes',
  'Docker',
  'AWS',
  'Azure',
  'GCP',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'GraphQL',
  'REST',
  'APIs',
  'Microservices',
  'System Design',
  'Backend',
  'Frontend',
  'Full Stack',
  'Engineering',
  'Product Management',
  'UX',
  'UI',
  'Figma',
  'SQL',
  'dbt',
  'Tableau',
  'Data Analysis',
  'Machine Learning',
  'Agile',
  'Scrum',
  'OKRs',
  'SEO',
  'HubSpot',
  'Marketing',
  'HR',
  'Leadership',
  'Project Management',
  'Team Management',
  'Strategic Planning',
  'Business Development',
  'Risk Management',
  'Microsoft Office',
  'Business Analysis',
  'Change Management',
] as const;

const NORMALIZED_TAXONOMY = CV_SKILL_TAXONOMY.map((s) => ({
  label: s,
  pattern: new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'i'),
}));

export interface CvExtractionResult {
  skills: string[];
  background?: string;
  rawSnippet?: string;
  name?: string;
  title?: string;
  email?: string;
  sourceFormat?: 'pdf' | 'csv' | 'text' | 'ocr' | 'demo';
}

export function extractSkillsFromText(text: string): CvExtractionResult {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const found = new Set<string>();

  for (const { label, pattern } of NORMALIZED_TAXONOMY) {
    if (pattern.test(normalized)) {
      found.add(label);
    }
  }

  // Skills section — bullets, commas, or lines after "SKILLS" heading
  const skillsBlock = text.match(
    /\bskills\b\s*[:\n]?\s*([\s\S]{0,1200}?)(?=\n\s*(?:WORK EXPERIENCE|EXPERIENCE|EDUCATION|LANGUAGES|PROJECTS|CERTIFICATIONS)\b|$)/i,
  );
  if (skillsBlock?.[1]) {
    for (const line of skillsBlock[1].split('\n')) {
      if (!/^[\s•·*-]/.test(line)) continue;
      const trimmed = line.replace(/^[\s•·*-]+/, '').trim();
      if (trimmed.length < 2 || trimmed.length > 45) continue;
      const normalizedSkill = trimmed.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bAnd\b/g, 'and');
      const titleCase =
        trimmed.charAt(0).toUpperCase() +
        trimmed.slice(1).toLowerCase();
      const match = CV_SKILL_TAXONOMY.find(
        (s) => s.toLowerCase() === trimmed.toLowerCase() || s.toLowerCase() === titleCase.toLowerCase(),
      );
      if (match) found.add(match);
      else if (/^[A-Za-z][A-Za-z0-9\s/&.-]+$/.test(trimmed)) found.add(titleCase);
    }
  }

  const skillsSection = normalized.match(/skills?\s*:?\s*([^\n.]{3,400})/i);
  if (skillsSection?.[1]) {
    for (const part of skillsSection[1].split(/[,;|·•]/)) {
      const trimmed = part.trim();
      if (trimmed.length >= 2 && trimmed.length <= 40) {
        const match = CV_SKILL_TAXONOMY.find((s) => s.toLowerCase() === trimmed.toLowerCase());
        if (match) found.add(match);
        else if (/^[A-Za-z0-9+.#\s-]+$/.test(trimmed)) found.add(trimmed);
      }
    }
  }

  const skills = [...found];
  const profile = extractProfileFromText(text);
  const background = inferBackground(skills, normalized) ?? profile.background;

  return {
    skills,
    background,
    rawSnippet: normalized.slice(0, 400),
    name: profile.name,
    title: profile.title,
    email: profile.email,
    sourceFormat: 'text',
  };
}

/** Parse structured talent CSV exports (name, email, title, skills, background columns). */
export function extractCvFromCsv(csvText: string): CvExtractionResult {
  const rows = parseCsvRows(csvText);
  if (!rows.length) {
    return { ...extractSkillsFromText(csvText), sourceFormat: 'csv' };
  }

  const header = rows[0].map((c) => c.toLowerCase().trim());
  const hasHeader = header.some((h) => SKILL_CSV_HEADERS.includes(h));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const row = dataRows.find((r) => r.some((c) => c.trim())) ?? rows[0];
  const cols = hasHeader ? header : row.map((_, i) => `col${i}`);

  const get = (keys: string[]) => {
    const idx = cols.findIndex((c) => keys.includes(c));
    if (idx >= 0 && row[idx]?.trim()) return row[idx].trim();
    return undefined;
  };

  const name = get(['name', 'full name', 'employee', 'candidate']);
  const email = get(['email', 'e-mail', 'mail']);
  const title = get(['title', 'role', 'position', 'job title']);
  const background = get(['background', 'department', 'dept', 'domain', 'area']);
  const skillsRaw =
    get(['skills', 'skill', 'technologies', 'tech stack', 'competencies']) ??
    row.find((c, i) => hasHeader && cols[i]?.includes('skill') && c.trim()) ??
    '';

  const skillParts = new Set<string>();
  if (skillsRaw) {
    for (const part of skillsRaw.split(/[,;|·]/)) {
      const t = part.trim();
      if (t.length >= 2 && t.length <= 40) skillParts.add(t);
    }
  }

  const bodyText = [name, title, background, skillsRaw, ...row].filter(Boolean).join(' ');
  const fromText = extractSkillsFromText(bodyText);
  const skillSet = new Set<string>(fromText.skills);
  for (const s of skillParts) {
    const match = CV_SKILL_TAXONOMY.find((t) => t.toLowerCase() === s.toLowerCase());
    skillSet.add(match ?? s);
  }

  const skills = [...skillSet];
  return {
    skills: skills.length ? skills : fromText.skills,
    background: background ?? fromText.background,
    name,
    title,
    email: email ?? fromText.email,
    rawSnippet: bodyText.slice(0, 400),
    sourceFormat: 'csv',
  };
}

const SKILL_CSV_HEADERS = [
  'name',
  'full name',
  'email',
  'e-mail',
  'title',
  'role',
  'skills',
  'skill',
  'background',
  'department',
  'technologies',
];

function extractProfileFromText(text: string): {
  name?: string;
  title?: string;
  email?: string;
  background?: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch?.[0];

  let name: string | undefined;
  const firstLine = lines[0];
  if (firstLine && firstLine.length < 60 && !/^(curriculum|resume|cv)\b/i.test(firstLine)) {
    if (/^[A-ZÀ-Ž][a-zà-ž]+(\s+[A-ZÀ-Ž][a-zà-ž]+){1,3}$/.test(firstLine)) {
      name = firstLine;
    }
  }

  let title: string | undefined;
  const titleLine = lines.slice(0, 5).find((l) =>
    /\b(engineer|developer|analyst|designer|manager|lead|architect|consultant|specialist)\b/i.test(l),
  );
  if (titleLine && titleLine.length < 80) title = titleLine.replace(/^[-–—|•]\s*/, '');

  return { name, title, email };
}

/** Minimal RFC 4180-style CSV parser (quoted fields, commas). */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field.trim());
    field = '';
  };

  const pushRow = () => {
    if (row.some((c) => c.length)) rows.push(row);
    row = [];
  };

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      pushField();
      pushRow();
      if (ch === '\r') i++;
    } else {
      field += ch;
    }
  }

  pushField();
  pushRow();
  return rows;
}

function inferBackground(skills: string[], text: string): string | undefined {
  const lower = text.toLowerCase();
  if (
    skills.some((s) => ['React', 'TypeScript', 'Next.js', 'Frontend', 'Backend', 'Engineering'].includes(s)) ||
    lower.includes('software engineer') ||
    lower.includes('engineering')
  ) {
    return 'Engineering';
  }
  if (skills.some((s) => ['Product Management', 'UX', 'Agile'].includes(s)) || lower.includes('product')) {
    return 'Product';
  }
  if (
    lower.includes('project manager') ||
    lower.includes('project management') ||
    skills.some((s) => ['Project Management', 'Strategic Planning', 'Team Management'].includes(s))
  ) {
    return 'Product';
  }
  if (skills.some((s) => ['Data Analysis', 'SQL', 'dbt', 'Tableau'].includes(s)) || lower.includes('data analyst')) {
    return 'Data & Analytics';
  }
  if (skills.some((s) => ['HR', 'Leadership'].includes(s))) return 'People';
  if (skills.some((s) => ['SEO', 'Marketing', 'HubSpot'].includes(s))) return 'Marketing';
  return undefined;
}

/** Demo CV bodies for filenames used in onboarding demos. */
export const DEMO_CV_BODIES: Record<string, string> = {
  jonaitis: `Jonas Jonaitis
Senior Software Engineer · OrgName
Engineering background with 6+ years building web platforms.

Skills: React, TypeScript, Next.js, Node.js, PostgreSQL, System Design
Experience: Led frontend architecture for B2B SaaS products.`,
  bernotas: `Tomas Bernotas — Backend Engineer. Skills: Python, Go, Kubernetes, Docker, APIs, Microservices`,
  norvilaite: `Aistė Norvilaitė — Data Analyst. Skills: SQL, Python, dbt, Tableau, Data Analysis`,
};

export function demoCvBodyForFileName(fileName: string): string | undefined {
  const lower = fileName.toLowerCase();
  for (const key of Object.keys(DEMO_CV_BODIES)) {
    if (lower.includes(key)) return DEMO_CV_BODIES[key];
  }
  return undefined;
}

/** Match demo CV bodies by filename or employee name (e.g. Jonas Jonaitis → jonaitis). */
export function demoCvBodyForContext(fileName: string, employeeName?: string): string | undefined {
  const fromFile = demoCvBodyForFileName(fileName);
  if (fromFile) return fromFile;
  if (!employeeName) return undefined;
  const parts = employeeName.toLowerCase().split(/\s+/).filter(Boolean);
  for (const key of Object.keys(DEMO_CV_BODIES)) {
    if (parts.some((p) => p.includes(key) || key.includes(p))) return DEMO_CV_BODIES[key];
  }
  return undefined;
}
