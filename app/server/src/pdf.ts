import { extractText, getDocumentProxy } from 'unpdf';

export async function pdfToText(buffer: Buffer): Promise<string | null> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  if (pages.join('').trim().length < 200) return null;
  return pages.map((t, i) => `--- Pagina ${i + 1} ---\n${t.trim()}`).join('\n\n');
}
