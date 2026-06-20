export const downloadManifestoPDF = async (language: string = 'pt') => {
  // Dynamic import — html2pdf (~900KB) loads only when user clicks download
  const { default: html2pdf } = await import('html2pdf.js');

  const manifestoContainer = document.querySelector('[data-manifesto-container]');
  
  if (!manifestoContainer) {
    console.error('Manifesto container not found');
    return;
  }

  // Create a clean HTML structure for PDF
  const element = document.createElement('div');
  element.style.backgroundColor = '#FFFFFF';
  element.style.color = '#000000';
  element.style.padding = '20px';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.lineHeight = '1.6';

  // Clone and clean content
  const content = manifestoContainer.cloneNode(true) as HTMLElement;
  
  // Remove button
  const button = content.querySelector('button');
  if (button) button.remove();

  // Remove motion divs and keep only content
  const motionDivs = content.querySelectorAll('[class*="motion"]');
  motionDivs.forEach((div: any) => {
    const children = Array.from(div.children);
    children.forEach(child => {
      div.parentNode?.insertBefore(child, div);
    });
    div.remove();
  });

  // Apply styles to all elements
  const allElements = content.querySelectorAll('*');
  allElements.forEach((el: any) => {
    el.style.backgroundColor = 'transparent';
    el.style.color = '#000000';
    el.style.filter = 'none';
    el.style.textShadow = 'none';
    el.style.boxShadow = 'none';
  });

  // Style headings
  const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading: any) => {
    heading.style.color = '#1a7a5c';
    heading.style.fontWeight = 'bold';
    heading.style.fontSize = heading.tagName === 'H1' ? '24px' : '16px';
    heading.style.marginTop = '15px';
    heading.style.marginBottom = '10px';
    heading.style.pageBreakAfter = 'avoid';
  });

  // Style paragraphs
  const paragraphs = content.querySelectorAll('p');
  paragraphs.forEach((p: any) => {
    p.style.color = '#333333';
    p.style.fontSize = '12px';
    p.style.lineHeight = '1.6';
    p.style.marginBottom = '10px';
  });

  // Style scroll areas
  const scrollAreas = content.querySelectorAll('[style*="height"]');
  scrollAreas.forEach((area: any) => {
    area.style.height = 'auto';
    area.style.overflow = 'visible';
  });

  element.appendChild(content);

  const opt = {
    margin: [15, 15, 15, 15],
    filename: `GaiaMind-Manifesto-${language}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false,
      allowTaint: true
    },
    jsPDF: { 
      orientation: 'portrait', 
      unit: 'mm', 
      format: 'a4',
      compress: true
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().set(opt).from(element).save();
};
