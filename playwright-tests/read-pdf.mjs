import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const data = new Uint8Array(fs.readFileSync('Zimyo Payroll Guide.pdf'));
const doc = await getDocument({ data }).promise;
console.log('Total pages:', doc.numPages);

let fullText = '';
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  const text = content.items.map(item => item.str).join(' ');
  fullText += `\n\n=== PAGE ${i} ===\n${text}`;
}

fs.writeFileSync('payroll-guide-text.txt', fullText);
console.log('Text length:', fullText.length);
console.log(fullText.substring(0, 8000));
