
declare const pdfjsLib: any;

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const cleanText = (text: string): string => {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "") // Remove control chars
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/([a-z])-\s+([a-z])/gi, "$1$2") // Join hyphenated words split across lines
    .trim();
};

export const extractTextFromPdf = async (file: File, onProgress: (progress: number) => void): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pagesText: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();
    
    // Map to custom TextItem structure for easier processing
    const items: TextItem[] = content.items.map((item: any) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      height: item.height
    }));

    if (items.length === 0) {
      pagesText.push(`[Page ${i} appears to be an image or has no text layer]`);
      continue;
    }

    // Group items into rows based on Y-coordinate with a small threshold
    const rows: TextItem[][] = [];
    const sortedByY = [...items].sort((a, b) => b.y - a.y); // Top to bottom

    if (sortedByY.length > 0) {
      let currentRow: TextItem[] = [sortedByY[0]];
      for (let j = 1; j < sortedByY.length; j++) {
        const item = sortedByY[j];
        const lastItem = currentRow[currentRow.length - 1];
        
        // Items are on the same line if their Y difference is less than half their average height
        const avgHeight = (item.height + lastItem.height) / 2 || 10;
        if (Math.abs(item.y - lastItem.y) < avgHeight / 2) {
          currentRow.push(item);
        } else {
          rows.push(currentRow.sort((a, b) => a.x - b.x));
          currentRow = [item];
        }
      }
      rows.push(currentRow.sort((a, b) => a.x - b.x));
    }

    // Heuristic: Check if page has two columns
    // We look for consistent gaps in the middle zone of the page
    const pageWidth = viewport.width;
    const centerStart = pageWidth * 0.4;
    const centerEnd = pageWidth * 0.6;
    let columnGapCount = 0;
    
    rows.forEach(row => {
      // If a row has a significant gap crossing the center zone
      for (let j = 0; j < row.length - 1; j++) {
        const gapStart = row[j].x + row[j].width;
        const gapEnd = row[j+1].x;
        if (gapStart < centerStart && gapEnd > centerEnd) {
          columnGapCount++;
          break;
        }
      }
    });

    const isTwoColumn = columnGapCount > rows.length * 0.4; // More than 40% of lines have a center gap

    let pageOutput = "";
    if (isTwoColumn) {
      // Process left column then right column
      const leftColItems: TextItem[] = items.filter(item => item.x + item.width < centerEnd);
      const rightColItems: TextItem[] = items.filter(item => item.x > centerStart);
      
      const processColumn = (colItems: TextItem[]) => {
        const colRows: TextItem[][] = [];
        const sorted = colItems.sort((a, b) => b.y - a.y);
        if (sorted.length === 0) return "";
        
        let curR: TextItem[] = [sorted[0]];
        for (let j = 1; j < sorted.length; j++) {
          if (Math.abs(sorted[j].y - curR[curR.length-1].y) < 5) curR.push(sorted[j]);
          else { colRows.push(curR.sort((a, b) => a.x - b.x)); curR = [sorted[j]]; }
        }
        colRows.push(curR.sort((a, b) => a.x - b.x));
        return colRows.map(r => r.map(it => it.str).join(" ")).join("\n");
      };

      pageOutput = processColumn(leftColItems) + "\n" + processColumn(rightColItems);
    } else {
      // Standard flow
      pageOutput = rows.map(row => {
        let lineText = "";
        for (let j = 0; j < row.length; j++) {
          const item = row[j];
          if (j > 0) {
            const prev = row[j-1];
            const gap = item.x - (prev.x + prev.width);
            // If the gap is small, don't add space (might be part of the same word)
            if (gap > 2) lineText += " ";
          }
          lineText += item.str;
        }
        return lineText;
      }).join("\n");
    }

    pagesText.push(cleanText(pageOutput));
    onProgress(Math.round((i / numPages) * 100));
  }

  return pagesText;
};

export const chunkPages = (pages: string[], chunkSize: number = 8): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < pages.length; i += chunkSize) {
    chunks.push(pages.slice(i, i + chunkSize));
  }
  return chunks;
};
