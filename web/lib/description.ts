/**
 * LinkedIn's guest page hands us one flat blob: the posting body, plus its own
 * interface text (the "message the poster" card, the salary estimate banner, the
 * sidebar labels under the description). Blank lines are almost never present,
 * section headings and their content sit on consecutive lines, bullet characters
 * are often missing, and colons drift onto their own line. This module turns
 * that blob into readable blocks — and does the same for the requirement lines
 * the backend extracted from it.
 */

export type DescBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "fields"; pairs: { label: string; value: string }[] };

const BULLET_RE = /^(?:[-*•·‣▪◦–—]|\d{1,2}[.)])\s+/;

/** Everything from the first of these on is LinkedIn's own sidebar. */
const TAIL_MARKER_RE =
  /^(?:tingkat senioritas|seniority level|jenis pekerjaan|employment type|industri|industry|fungsi pekerjaan|job function|tentang lowongan ini|about this job|show more|show less|lihat semua|see all)$/i;

const CHROME_LINE_RE = new RegExp(
  "^(?:" +
    [
      "kirim pesan langsung ke pemasang posting pekerjaan",
      "message the poster directly",
      "perkiraan rentang gaji yang diberikan",
      "perkiraan ini disediakan oleh",
      "rentang gaji pokok",
      "base pay range",
      "estimated salary range provided by",
      "referensi meningkatkan kesempatan Anda",
      "lihat orang yang mungkin Anda kenal",
      "tentang lowongan ini",
      "show more",
      "show less",
      "lamar sekarang",
      "simpan lowongan",
      "apply now",
      "easy apply",
      "save this job",
      "bersiap melamar",
      "mahir dalam proyek ini",
      "skills match your profile",
      "ambil kuis",
    ].join("|") +
    ")",
  "i",
);

/** Labels that are really key/value fields, not section headings. */
const FIELD_LABEL_RE =
  /^(?:role title|position|posisi|role type|job type|jenis pekerjaan|type|compensation|salary|gaji|rate|pay|location|lokasi|commitment|working hours|jam kerja|hours|duration|durasi|experience|pengalaman|level|seniority|department|divisi|team|tim|reporting to|report to|start date|mulai|industry|industri)$/i;

/** Words that make a short line a heading far more often than a sentence. */
const HEADING_HINT_RE = new RegExp(
  "^(?:" +
    [
      "about",
      "about the role",
      "about you",
      "why",
      "what",
      "who",
      "how",
      "key",
      "role",
      "job",
      "your",
      "our",
      "the role",
      "the job",
      "position",
      "overview",
      "summary",
      "responsibilit",
      "requirement",
      "qualification",
      "kualifikasi",
      "tanggung",
      "syarat",
      "deskripsi",
      "job description",
      "benefit",
      "perk",
      "what we offer",
      "we offer",
      "we're looking",
      "we are looking",
      "nice to have",
      "must have",
      "preferred",
      "bonus",
      "compensation",
      "next step",
      "let's chat",
      "get ready",
      "apply",
      "application",
      "tentang",
      "keuntungan",
      "fasilitas",
      "cara melamar",
      "cara mendaftar",
      "gaji",
    ].join("|") +
    ")",
  "i",
);

function normalize(raw: string): string[] {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/, "").trim());
}

/** Two-to-five capitalised words with no punctuation: a person's name. */
function looksLikeName(line: string): boolean {
  if (line.length > 40 || /\d|[.,;:!?]/.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((word) => /^[A-Z][\p{L}.'-]*$/u.test(word));
}

/** A recruiter's own headline, which follows their name in that card. */
function looksLikeHeadline(line: string): boolean {
  return (
    line.length <= 90 &&
    /(\||^human resource|^recruiter|^talent|^hr |bachelor of|^founder|^owner)/i.test(line)
  );
}

function isChrome(line: string): boolean {
  return CHROME_LINE_RE.test(line);
}

/** "US$50,00/jam - US$100,00/jam": the value under a salary banner. */
const SALARY_VALUE_RE = /^(?:[A-Za-z]{0,3}\$|Rp\b|IDR\b|[$€£¥])\s?\d/;

function isHeading(line: string): boolean {
  const text = line.trim();
  if (!text || text.length > 72) return false;
  // A sentence that ends in a full stop is body copy, not a heading.
  if (/\.$/.test(text)) return false;
  if (BULLET_RE.test(text)) return false;
  const words = text.split(/\s+/);
  if (words.length > 12) return false;
  if (HEADING_HINT_RE.test(text)) return true;
  // "Application development:" and friends are sub-headings, not fields.
  if (/:$/.test(text) && text.length <= 48) return true;
  // "Get Ready To", "Why Join Us?", "About Omni Digital" — every word capitalised,
  // so a sentence fragment like "We are seeking an experienced" stays body copy.
  return words.length <= 6 && words.every((word) => /^[A-Z0-9&"']/.test(word));
}

type Line = { text: string; field?: { label: string; value: string } };

/** Drop LinkedIn's own interface text, including the trailing sidebar. */
function stripChrome(lines: string[]): Line[] {
  const out: Line[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (TAIL_MARKER_RE.test(line)) break; // sidebar starts here: nothing below is the posting
    if (isChrome(line)) {
      // The "message the poster" card also carries the recruiter's name twice
      // and their headline; skip those, then carry on with the posting body.
      let next = index + 1;
      while (next < lines.length && looksLikeName(lines[next])) {
        next += 1;
      }
      if (next < lines.length && looksLikeHeadline(lines[next])) {
        next += 1;
      }
      // The salary banner is a label followed by its own value line.
      if (
        /gaji|salary|pay/i.test(line) &&
        next < lines.length &&
        SALARY_VALUE_RE.test(lines[next])
      ) {
        next += 1;
      }
      index = next - 1;
      continue;
    }
    out.push({ text: line });
  }
  return out;
}

function fieldOf(text: string): { label: string; value: string } | null {
  const match = /^([^:]{2,32}):\s*(.+)$/.exec(text);
  if (!match) return null;
  const label = match[1].trim();
  if (!FIELD_LABEL_RE.test(label)) return null;
  return { label, value: match[2].trim() };
}

/** Rebuild lines that LinkedIn split across several: label/value and wrapped sentences. */
function mergeLines(lines: Line[]): Line[] {
  const out: Line[] = [];
  let index = 0;

  while (index < lines.length) {
    const text = lines[index].text;

    if (!text) {
      out.push({ text });
      index += 1;
      continue;
    }

    const previous = out[out.length - 1];

    // A colon that ended up on its own line belongs to the previous one:
    // "Role Title" / ": Senior Backend Engineer" is one field.
    if (/^:/.test(text) && previous) {
      const label = previous.text.replace(/:$/, "").trim();
      const value = text.replace(/^:\s*/, "").trim();
      previous.text = `${label}: ${value}`;
      if (FIELD_LABEL_RE.test(label)) previous.field = { label, value };
      index += 1;
      continue;
    }

    // "Position:" and its value on the following line.
    if (text.endsWith(":")) {
      const label = text.replace(/:$/, "").trim();
      const value = lines[index + 1]?.text ?? "";
      if (FIELD_LABEL_RE.test(label) && value) {
        out.push({ text: `${label}: ${value}`, field: { label, value } });
        index += 2;
        continue;
      }
    }

    // "Position: Backend Engineer" already on one line.
    const field = fieldOf(text);
    if (field) {
      out.push({ text, field });
      index += 1;
      continue;
    }

    if (previous && !previous.field) {
      const next = lines[index + 1]?.text ?? "";

      // A sentence wrapped onto the next line.
      const wrapsSentence =
        !previous.text.endsWith(":") &&
        /[\p{L}\d)]$/u.test(previous.text) &&
        /^[a-zà-ÿ(]/u.test(text) &&
        !/:\/\//.test(text);
      if (wrapsSentence) {
        previous.text = `${previous.text} ${text}`.trim();
        index += 1;
        continue;
      }

      // LinkedIn bolds a phrase inside a sentence, which puts it on its own
      // line and starts it with a capital: "We are seeking an experienced" /
      // "Engineering Manager – Software Security" / "to lead multiple pods."
      const phraseThenContinuation =
        !isHeading(previous.text) &&
        /[\p{L}\d,)]$/u.test(previous.text) &&
        !previous.text.endsWith(":") &&
        text.length <= 80 &&
        !/[.!?:;]$/.test(text) &&
        /^[a-zà-ÿ(]/u.test(next) &&
        !/:\/\//.test(next);
      if (phraseThenContinuation) {
        previous.text = `${previous.text} ${text} ${next}`.trim();
        index += 2;
        continue;
      }
    }

    out.push({ text });
    index += 1;
  }
  return out;
}

function toBlocks(lines: Line[]): DescBlock[] {
  const blocks: DescBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const { text, field } = lines[index];

    if (!text) {
      index += 1;
      continue;
    }

    if (field) {
      const pairs: { label: string; value: string }[] = [];
      while (index < lines.length && lines[index].field) {
        pairs.push(lines[index].field as { label: string; value: string });
        index += 1;
      }
      // A lone "Location: Remote" is not worth a definition table.
      if (pairs.length >= 2) {
        blocks.push({ kind: "fields", pairs });
      } else {
        blocks.push({ kind: "paragraph", text: `${pairs[0].label}: ${pairs[0].value}` });
      }
      continue;
    }

    if (BULLET_RE.test(text)) {
      const items: string[] = [];
      while (index < lines.length && BULLET_RE.test(lines[index].text)) {
        items.push(lines[index].text.replace(BULLET_RE, "").trim());
        index += 1;
      }
      blocks.push({ kind: "bullets", items: items.filter(Boolean) });
      continue;
    }

    if (isHeading(text)) {
      blocks.push({ kind: "heading", text: text.replace(/:$/, "") });
      index += 1;
      continue;
    }

    blocks.push({ kind: "paragraph", text });
    index += 1;
  }

  return blocks;
}

/**
 * LinkedIn drops the bullet characters, so a heading followed by its items
 * arrives as several short lines that each look like a heading. A run of them
 * is one heading plus the list under it — but a run stops at the next real
 * heading ("Key Requirements") or sub-heading ("Application development:").
 */
function collapseHeadingRuns(blocks: DescBlock[]): DescBlock[] {
  const out: DescBlock[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (block.kind !== "heading") {
      out.push(block);
      index += 1;
      continue;
    }

    const run: string[] = [block.text];
    let cursor = index + 1;
    while (cursor < blocks.length) {
      const next = blocks[cursor];
      if (next.kind !== "heading") break;
      if (HEADING_HINT_RE.test(next.text) || next.text.endsWith(":")) break;
      run.push(next.text);
      cursor += 1;
    }

    if (run.length === 1) {
      out.push(block);
      index += 1;
      continue;
    }

    out.push({ kind: "heading", text: run[0] });
    out.push({ kind: "bullets", items: run.slice(1) });
    index = cursor;
  }

  return out;
}

/**
 * Bullet characters are often missing, so the items under a heading arrive as
 * several plain lines. Two or more of those in a row are a list, not prose —
 * a lone line, or one long enough to be a paragraph, stays prose.
 */
const LIST_ITEM_MAX = 260;

function groupListLines(blocks: DescBlock[]): DescBlock[] {
  const out: DescBlock[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (block.kind !== "heading") {
      out.push(block);
      index += 1;
      continue;
    }

    out.push(block);

    const items: string[] = [];
    let cursor = index + 1;
    while (cursor < blocks.length) {
      const next = blocks[cursor];
      if (next.kind !== "paragraph") break;
      if (next.text.length > LIST_ITEM_MAX) break;
      items.push(next.text);
      cursor += 1;
    }

    if (items.length >= 2) {
      out.push({ kind: "bullets", items });
      index = cursor;
      continue;
    }

    index += 1;
  }

  return out;
}

export function parseDescription(raw: string | null | undefined): DescBlock[] {
  if (!raw || !raw.trim()) return [];
  const blocks = groupListLines(
    collapseHeadingRuns(toBlocks(mergeLines(stripChrome(normalize(raw))))),
  );
  // A heading with nothing under it (usually a stray leftover) carries no meaning.
  return blocks.filter((block, position) => block.kind !== "heading" || position < blocks.length - 1);
}

/** The posting body without LinkedIn's chrome, flattened for substring checks. */
export function descriptionBodyText(raw: string | null | undefined): string {
  if (!raw) return "";
  return stripChrome(normalize(raw))
    .map((line) => line.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * The requirement lines come from a keyword match over the same blob, so they
 * still contain section headings, interface labels and the sidebar values.
 * Anything that is not part of the posting body is not a requirement.
 */
export function cleanRequirements(items: string[], description?: string | null): string[] {
  const body = descriptionBodyText(description);
  /* If not a single line is found in the stored description, the two came from
     different texts (a truncated description, an older extraction); trust the
     extracted lines rather than blanking the section. */
  const comparable =
    body.length > 0 &&
    items.some((item) => body.includes(item.replace(/\s+/g, " ").trim().toLowerCase()));

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of items) {
    const text = raw.replace(/\s+/g, " ").trim();
    if (text.length < 8) continue;
    if (isChrome(text) || TAIL_MARKER_RE.test(text)) continue;
    if (isHeading(text) && (HEADING_HINT_RE.test(text) || /:$/.test(text))) continue;
    if (comparable && !body.includes(text.toLowerCase())) continue;
    const key = text.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }

  return out;
}

/** Keep the preview short without cutting a bullet list in half. */
export function limitBlocks(
  blocks: DescBlock[],
  budget = 1400,
): { blocks: DescBlock[]; truncated: boolean } {
  const kept: DescBlock[] = [];
  let used = 0;

  for (const block of blocks) {
    const cost =
      block.kind === "heading" ? 0 : block.kind === "paragraph" ? block.text.length : 120;
    if (used + cost > budget && kept.length) {
      return { blocks: kept, truncated: true };
    }
    if (block.kind === "paragraph" && block.text.length > budget) {
      kept.push({ kind: "paragraph", text: block.text.slice(0, budget).trimEnd() });
      return { blocks: kept, truncated: true };
    }
    kept.push(block);
    used += cost;
  }

  return { blocks: kept, truncated: false };
}
