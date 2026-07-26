import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import type { CatererBriefSnapshot } from './types';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function pdfText(value: unknown): string {
  return String(value ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x0A\x0D\x20-\x7E]/g, '?');
}

function wordsFor(text: string): string[] {
  return pdfText(text).replace(/\r/g, '').split(/\s+/).filter(Boolean);
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const paragraphs = pdfText(text).split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = wordsFor(paragraph);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= width) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

export async function createCatererBriefPdf(
  snapshot: CatererBriefSnapshot,
  version: number,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`Caterer Brief v${version}`);
  document.setSubject('Private Feast Studio caterer handoff');
  document.setCreator('The Missing Peace');
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const italic = await document.embedFont(StandardFonts.HelveticaOblique);
  const ink = rgb(0.125, 0.11, 0.095);
  const muted = rgb(0.42, 0.38, 0.34);
  const brass = rgb(0.48, 0.33, 0.1);
  const line = rgb(0.86, 0.83, 0.78);
  let page!: PDFPage;
  let y = 0;

  function newPage() {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN - 46;
  }

  function ensure(height: number) {
    if (y - height < MARGIN + 26) newPage();
  }

  function drawWrapped(
    value: string,
    options: {
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      leading?: number;
    } = {},
  ) {
    const chosenFont = options.font ?? regular;
    const size = options.size ?? 10;
    const leading = options.leading ?? size * 1.45;
    const indent = options.indent ?? 0;
    const lines = wrap(value, chosenFont, size, CONTENT_WIDTH - indent);
    ensure(lines.length * leading);
    for (const lineText of lines) {
      page.drawText(lineText, {
        x: MARGIN + indent,
        y,
        size,
        font: chosenFont,
        color: options.color ?? ink,
      });
      y -= leading;
    }
  }

  function section(title: string) {
    ensure(34);
    y -= 8;
    page.drawText(pdfText(title).toUpperCase(), {
      x: MARGIN,
      y,
      size: 9,
      font: bold,
      color: brass,
    });
    y -= 18;
  }

  function labelValue(label: string, value: string) {
    ensure(18);
    page.drawText(`${pdfText(label)}:`, { x: MARGIN, y, size: 9, font: bold, color: muted });
    const labelWidth = bold.widthOfTextAtSize(`${pdfText(label)}: `, 9);
    const lines = wrap(value, regular, 9, CONTENT_WIDTH - labelWidth);
    if (lines.length === 1) {
      page.drawText(lines[0], { x: MARGIN + labelWidth, y, size: 9, font: regular, color: ink });
      y -= 14;
      return;
    }
    y -= 14;
    drawWrapped(value, { size: 9, indent: 12, color: ink, leading: 13 });
  }

  newPage();
  drawWrapped('Caterer Brief', { font: bold, size: 26, color: ink, leading: 31 });
  drawWrapped(snapshot.plan.intention || 'A meal built with care.', {
    font: italic,
    size: 12,
    color: muted,
    leading: 18,
  });
  y -= 5;
  labelValue('Meal shape', snapshot.plan.meal_shape);
  labelValue('Service feeling', snapshot.plan.service_feeling);
  labelValue('Emotional root', snapshot.plan.emotional_root);
  labelValue('Guest count', String(snapshot.plan.guest_count));
  labelValue('Version', String(version));
  labelValue('Brief status', snapshot.readiness.ready ? 'Ready for handoff' : 'Open confirmations remain');

  section('Meal flow');
  for (const scene of snapshot.scenes) {
    ensure(52);
    drawWrapped(`${scene.order + 1}. ${scene.title}`, { font: bold, size: 13, color: ink, leading: 18 });
    if (scene.purpose) drawWrapped(scene.purpose, { font: italic, size: 9, color: muted, indent: 10, leading: 13 });
    labelValue('Service', scene.service_style || 'To confirm');
    if (scene.timing) labelValue('Timing', scene.timing);
    if (!scene.dishes.length) {
      drawWrapped('No dish added yet.', { size: 9, color: muted, indent: 12 });
    }
    for (const dish of scene.dishes) {
      ensure(48);
      drawWrapped(`- ${dish.name}${dish.role ? ` (${dish.role})` : ''}`, {
        font: bold,
        size: 10,
        indent: 12,
        leading: 15,
      });
      if (dish.ingredients.length) {
        drawWrapped(`Ingredients recorded: ${dish.ingredients.join(', ')}`, {
          size: 8.5,
          color: muted,
          indent: 22,
          leading: 12,
        });
      }
      if (dish.execution_notes) {
        drawWrapped(`Execution: ${dish.execution_notes}`, {
          size: 8.5,
          color: muted,
          indent: 22,
          leading: 12,
        });
      }
    }
    y -= 6;
  }

  section('Guest care');
  drawWrapped(
    `Hospitality score: ${Math.round(snapshot.readiness.hospitality_score * 100)}%. ` +
      `${snapshot.readiness.conflicts.length} conflict(s), ${snapshot.readiness.open_confirmations.length} open confirmation(s).`,
    { size: 10, color: ink },
  );
  for (const requirement of snapshot.requirements) {
    drawWrapped(
      `- ${requirement.code.replace(/_/g, ' ')}: ${requirement.coverage.replace(/_/g, ' ')} ` +
        `(${requirement.category}, ${requirement.severity})`,
      { font: requirement.open_confirmation ? bold : regular, size: 9, indent: 10, leading: 14 },
    );
    if (requirement.notes) {
      drawWrapped(requirement.notes, { size: 8.5, color: muted, indent: 22, leading: 12 });
    }
  }

  section('Confirmation evidence');
  if (!snapshot.evidence.length) {
    drawWrapped('No confirmation evidence recorded.', { size: 9, color: muted });
  }
  for (const evidence of snapshot.evidence) {
    drawWrapped(`- ${evidence.source_name} (${evidence.source_type.replace(/_/g, ' ')})`, {
      font: bold,
      size: 9,
      indent: 10,
      leading: 14,
    });
    drawWrapped(`Confirmed ${evidence.confirmed_at.slice(0, 10)}${evidence.expires_at ? `; expires ${evidence.expires_at.slice(0, 10)}` : ''}`, {
      size: 8.5,
      color: muted,
      indent: 22,
      leading: 12,
    });
  }

  section('Open confirmations');
  const open = [...new Set([...snapshot.readiness.conflicts, ...snapshot.readiness.open_confirmations])];
  if (!open.length) drawWrapped('No safety-critical or certified gaps are open.', { size: 9 });
  for (const code of open) {
    drawWrapped(`- ${code.replace(/_/g, ' ')}`, { font: bold, size: 9, indent: 10, leading: 14 });
  }

  const pages = document.getPages();
  pages.forEach((outputPage, index) => {
    outputPage.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 22 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 22 },
      thickness: 0.75,
      color: line,
    });
    outputPage.drawLine({
      start: { x: MARGIN, y: 38 },
      end: { x: PAGE_WIDTH - MARGIN, y: 38 },
      thickness: 0.5,
      color: line,
    });
    outputPage.drawText(`Private caterer brief v${version} - share intentionally`, {
      x: MARGIN,
      y: 23,
      size: 7.5,
      font: regular,
      color: muted,
    });
    outputPage.drawText(`${index + 1} / ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - 28,
      y: 23,
      size: 7.5,
      font: regular,
      color: muted,
    });
  });

  return document.save();
}
