document.getElementById('pdf-upload').addEventListener('change', displayPageCount);
document.getElementById('split-button').addEventListener('click', splitPdf);
document.getElementById('page-ranges').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    splitPdf();
  }
});

async function displayPageCount() {
  const pdfFile = document.getElementById('pdf-upload').files[0];
  if (!pdfFile) {
    alert('Please upload a PDF file.');
    return;
  }

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
  const numPages = pdfDoc.getPageCount();

  document.getElementById('page-count').textContent = `Total Pages: ${numPages}`;
  document.getElementById('page-ranges').value = `1-${numPages}`;
  document.getElementById('page-ranges').focus();
}

async function splitPdf() {
  const pdfFile = document.getElementById('pdf-upload').files[0];
  const pageRanges = document.getElementById('page-ranges').value;
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressPercentage = document.getElementById('progress-percentage');
  const extendedMode = document.getElementById('split-mode-switch').checked;

  if (!pdfFile) {
    alert('Please upload a PDF file.');
    return;
  }

  progressContainer.style.display = 'flex';
  progressBar.value = 0;
  progressPercentage.textContent = '0%';

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
  const numPages = pdfDoc.getPageCount();

  const pagesToSplit = parsePageRanges(pageRanges, numPages);
  const newPdfDoc = await PDFLib.PDFDocument.create();

  for (let i = 0; i < numPages; i++) {
    const [originalPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
    if (pagesToSplit.includes(i + 1)) {
      const { width, height } = originalPage.getSize();
      const splitOffset = extendedMode ? Math.max(width, height) * 0.1 : 0;

      if (height > width) {
        // Split top and bottom
        const topPage = newPdfDoc.addPage([width, (height + splitOffset) / 2]);
        const bottomPage = newPdfDoc.addPage([width, (height + splitOffset) / 2]);

        const embeddedPage = await newPdfDoc.embedPage(originalPage);

        // Draw top half
        topPage.drawPage(embeddedPage, {
          x: 0,
          y: -(height / 2 + splitOffset),
          scale: 1,
          width: width,
          height: height,
          xScale: 1,
          yScale: 0.5
        });

        // Draw bottom half
        bottomPage.drawPage(embeddedPage, {
          x: 0,
          y: -splitOffset,
          scale: 1,
          width: width,
          height: height,
          xScale: 1,
          yScale: 0.5
        });
      } else {
        // Split left and right
        const leftPage = newPdfDoc.addPage([(width + splitOffset) / 2, height]);
        const rightPage = newPdfDoc.addPage([(width + splitOffset) / 2, height]);

        const embeddedPage = await newPdfDoc.embedPage(originalPage);

        // Draw left half
        leftPage.drawPage(embeddedPage, {
          x: 0,
          y: 0,
          scale: 1,
          width: width,
          height: height,
          xScale: 0.5,
          yScale: 1
        });

        // Draw right half
        rightPage.drawPage(embeddedPage, {
          x: -(width / 2 + splitOffset),
          y: 0,
          scale: 1,
          width: width,
          height: height,
          xScale: 0.5,
          yScale: 1
        });
      }
    } else {
      newPdfDoc.addPage(originalPage);
    }

    // Update progress
    const progress = Math.round(((i + 1) / numPages) * 100);
    progressBar.value = progress;
    progressPercentage.textContent = `${progress}%`;
  }

  const newPdfBytes = await newPdfDoc.save();
  const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');

  // Hide progress bar after completion
  progressContainer.style.display = 'none';
}

function parsePageRanges(ranges, numPages) {
  const pages = new Set();
  const parts = ranges.split(',');

  parts.forEach(part => {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        if (i > 0 && i <= numPages) {
          pages.add(i);
        }
      }
    } else {
      const page = Number(part);
      if (page > 0 && page <= numPages) {
        pages.add(page);
      }
    }
  });

  return Array.from(pages).sort((a, b) => a - b);
}
