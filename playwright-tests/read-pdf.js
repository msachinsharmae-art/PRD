const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

async function main() {
  const data = new Uint8Array(fs.readFileSync('Zimyo Payroll Guide.pdf'));
  const doc = await pdfjsLib.getDocument({ data }).promise;
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
  console.log(fullText.substring(0, 5000));
}
main().catch(console.error);
