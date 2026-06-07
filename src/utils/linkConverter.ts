/**
 * Utilitário para formatar links externos de fotos e vídeos,
 * convertendo links de visualização do Google Drive em links diretos,
 * e links do YouTube em embeds.
 */

// Converte link de visualização do Drive para link de exibição direta
export function convertDriveImageLink(url: string | undefined | null): string {
  if (!url) return '';
  
  let fileId = '';
  
  // 1. Tenta extrair de link padrão (https://drive.google.com/file/d/ID/view...)
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//;
  const match = url.match(driveRegex);
  
  if (match && match[1]) {
    fileId = match[1];
  } 
  // 2. Tenta extrair de link uc antigo, thumbnail ou lh3
  else if (url.includes('drive.google.com/uc') || url.includes('drive.google.com/thumbnail')) {
    try {
      const urlObj = new URL(url);
      fileId = urlObj.searchParams.get('id') || '';
    } catch (e) {
      // ignore
    }
  }
  else if (url.includes('lh3.googleusercontent.com/d/')) {
    fileId = url.split('/d/')[1].split('?')[0];
  }
  
  if (fileId) {
    // Usar o Content Delivery Network (CDN) oficial de imagens do Google (lh3)
    // Isso ignora completamente os bloqueios do Google Drive para sites de terceiros
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  
  return url;
}

// Converte um link de vídeo (YouTube) para a versão "embed" para funcionar no iframe
export function convertYouTubeLink(url: string | undefined | null): string {
  if (!url) return '';

  try {
    let videoId = '';
    
    // Suporta: https://www.youtube.com/watch?v=ID
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      videoId = urlObj.searchParams.get('v') || '';
    } 
    // Suporta: https://youtu.be/ID
    else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    // Suporta: https://www.youtube.com/embed/ID
    else if (url.includes('youtube.com/embed/')) {
      return url; // Já é embed
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return url; // Se não for YouTube, retorna o URL original (caso o usuário coloque um link direto mp4)
  } catch (e) {
    return url;
  }
}
