// lib/mediapreview.js

const path = require('path');
const crypto = require('crypto');

/**
 * Media Preview Handler
 * Menangani preview untuk berbagai jenis media
 */
class MediaPreview {
    constructor() {
        this.allowedDomains = [
            'files.catbox.moe',
            'i.ibb.co',
            'i.imgur.com',
            'cdn.discordapp.com',
            'media.discordapp.net',
            'localhost',
            '127.0.0.1',
            'github.com',
            'raw.githubusercontent.com'
        ];
    }

    /**
     * Deteksi tipe konten dari URL
     * @param {string} url - URL file
     * @returns {string} - Tipe media
     */
    detectContentType(url) {
        const urlLower = url.toLowerCase();
        
        // Gambar
        if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/)) {
            return 'image';
        }
        
        // Video
        if (urlLower.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|3gp|m4v)$/)) {
            return 'video';
        }
        
        // Audio
        if (urlLower.match(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/)) {
            return 'audio';
        }
        
        // PDF
        if (urlLower.match(/\.pdf$/)) {
            return 'pdf';
        }
        
        // Dokumen
        if (urlLower.match(/\.(txt|doc|docx|xls|xlsx|ppt|pptx)$/)) {
            return 'document';
        }
        
        return 'unknown';
    }

    /**
     * Validasi URL
     * @param {string} url - URL yang akan divalidasi
     * @returns {Object} - Hasil validasi
     */
    validateUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Cek protocol
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return { valid: false, error: 'Invalid protocol. Only HTTP/HTTPS allowed.' };
            }
            
            // Cek domain yang diizinkan
            const isAllowed = this.allowedDomains.some(domain => 
                urlObj.hostname.includes(domain) || 
                (process.env.ALLOW_ALL_DOMAINS === 'true')
            );
            
            if (!isAllowed) {
                return { 
                    valid: false, 
                    error: 'Domain not allowed for media preview',
                    domain: urlObj.hostname 
                };
            }
            
            return { valid: true, urlObj };
        } catch (error) {
            return { valid: false, error: 'Invalid URL format' };
        }
    }

    /**
     * Generate preview HTML berdasarkan tipe media
     * @param {string} url - URL media
     * @param {string} type - Tipe media
     * @param {string} filename - Nama file
     * @returns {string} - HTML preview
     */
    generatePreview(url, type = null, filename = null) {
        const detectedType = type || this.detectContentType(url);
        const safeFilename = filename || url.split('/').pop() || 'file';
        
        // Extract extension
        const extension = safeFilename.split('.').pop().toLowerCase();
        
        switch(detectedType) {
            case 'image':
                return this.generateImagePreview(url, safeFilename, extension);
                
            case 'video':
                return this.generateVideoPreview(url, safeFilename, extension);
                
            case 'audio':
                return this.generateAudioPreview(url, safeFilename, extension);
                
            case 'pdf':
                return this.generatePDFPreview(url, safeFilename);
                
            case 'document':
                return this.generateDocumentPreview(url, safeFilename, extension);
                
            default:
                return this.generateUnknownPreview(url, safeFilename, extension);
        }
    }

    /**
     * Generate preview untuk gambar
     */
    generateImagePreview(url, filename, extension) {
        return `
        <div class="media-preview">
            <div class="preview-header">
                <span class="file-info">
                    <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                    </svg>
                    ${filename}
                    <span class="file-extension">.${extension}</span>
                </span>
                <div class="preview-actions">
                    <button onclick="window.open('${url}', '_blank')" class="btn-action" title="Open in new tab">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                        </svg>
                        Open
                    </button>
                    <button onclick="navigator.clipboard.writeText('${url}')" class="btn-action" title="Copy URL">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                        </svg>
                        Copy URL
                    </button>
                    <button onclick="this.parentElement.parentElement.nextElementSibling.querySelector('img').requestFullscreen()" class="btn-action" title="Fullscreen">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd"/>
                        </svg>
                        Fullscreen
                    </button>
                </div>
            </div>
            <div class="image-container">
                <img src="${url}" 
                     alt="${filename}" 
                     class="preview-image"
                     onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z\"/></svg>'">
                <div class="image-overlay">
                    <span class="image-size">Click image for fullscreen</span>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate preview untuk video
     */
    generateVideoPreview(url, filename, extension) {
        return `
        <div class="media-preview">
            <div class="preview-header">
                <span class="file-info">
                    <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm1 2h10v4l-5 3-5-3V6z" clip-rule="evenodd"/>
                    </svg>
                    ${filename}
                    <span class="file-extension">.${extension}</span>
                </span>
                <div class="preview-actions">
                    <button onclick="window.open('${url}', '_blank')" class="btn-action" title="Download">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                        Download
                    </button>
                </div>
            </div>
            <div class="video-container">
                <video controls class="preview-video">
                    <source src="${url}" type="video/${extension}">
                    Your browser does not support the video tag.
                </video>
                <div class="video-controls">
                    <button class="video-btn play-pause" onclick="this.closest('.video-container').querySelector('video').paused ? this.closest('.video-container').querySelector('video').play() : this.closest('.video-container').querySelector('video').pause()">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                    <input type="range" class="video-progress" value="0" min="0" max="100" 
                           oninput="this.closest('.video-container').querySelector('video').currentTime = this.value / 100 * this.closest('.video-container').querySelector('video').duration"
                           onchange="this.closest('.video-container').querySelector('video').currentTime = this.value / 100 * this.closest('.video-container').querySelector('video').duration">
                    <button class="video-btn fullscreen" onclick="this.closest('.video-container').querySelector('video').requestFullscreen()">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate preview untuk audio
     */
    generateAudioPreview(url, filename, extension) {
        return `
        <div class="media-preview">
            <div class="preview-header">
                <span class="file-info">
                    <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"/>
                    </svg>
                    ${filename}
                    <span class="file-extension">.${extension}</span>
                </span>
                <div class="preview-actions">
                    <button onclick="window.open('${url}', '_blank')" class="btn-action" title="Download">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                        Download
                    </button>
                </div>
            </div>
            <div class="audio-container">
                <audio controls class="preview-audio">
                    <source src="${url}" type="audio/${extension}">
                    Your browser does not support the audio element.
                </audio>
                <div class="audio-visualizer">
                    <div class="audio-wave"></div>
                    <div class="audio-wave"></div>
                    <div class="audio-wave"></div>
                    <div class="audio-wave"></div>
                    <div class="audio-wave"></div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate preview untuk PDF
     */
    generatePDFPreview(url, filename) {
        const pdfViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`;
        
        return `
        <div class="media-preview">
            <div class="preview-header">
                <span class="file-info">
                    <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                    </svg>
                    ${filename}
                    <span class="file-extension">.pdf</span>
                </span>
                <div class="preview-actions">
                    <button onclick="window.open('${url}', '_blank')" class="btn-action" title="Open PDF">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                        </svg>
                        Open PDF
                    </button>
                    <button onclick="navigator.clipboard.writeText('${url}')" class="btn-action" title="Copy URL">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                        </svg>
                        Copy URL
                    </button>
                </div>
            </div>
            <div class="pdf-container">
                <iframe 
                    src="${pdfViewerUrl}" 
                    class="preview-pdf"
                    title="PDF Preview: ${filename}"
                    allowfullscreen>
                </iframe>
                <div class="pdf-fallback">
                    <div class="pdf-icon">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <p class="pdf-message">PDF preview is loading...</p>
                    <p class="pdf-hint">If the PDF doesn't load, <a href="${url}" target="_blank">click here to open it directly</a>.</p>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate preview untuk dokumen
     */
    generateDocumentPreview(url, filename, extension) {
        const iconMap = {
            'txt': 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z',
            'doc': 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z',
            'docx': 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z',
            'xls': 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z',
            'xlsx': 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z',
            'ppt': 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z',
            'pptx': 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z'
        };

        const iconPath = iconMap[extension] || iconMap.txt;

        return `
        <div class="media-preview">
            <div class="preview-header">
                <span class="file-info">
                    <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="${iconPath}" clip-rule="evenodd"/>
                    </svg>
                    ${filename}
                    <span class="file-extension">.${extension}</span>
                </span>
                <div class="preview-actions">
                    <button onclick="window.open('${url}', '_blank')" class="btn-action" title="Open Document">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                        </svg>
                        Open
                    </button>
                    <button onclick="navigator.clipboard.writeText('${url}')" class="btn-action" title="Copy URL">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                        </svg>
                        Copy URL
                    </button>
                </div>
            </div>
            <div class="document-container">
                <div class="document-icon">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="${iconPath}" clip-rule="evenodd"/>
                    </svg>
                </div>
                <p class="document-message">Document preview not available inline</p>
                <p class="document-hint">Click "Open" to view this ${extension.toUpperCase()} document</p>
                <div class="document-actions">
                    <a href="${url}" target="_blank" class="document-link">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                        </svg>
                        Open ${extension.toUpperCase()} Document
                    </a>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate preview untuk file unknown
     */
    generateUnknownPreview(url, filename, extension) {
        return `
        <div class="media-preview unknown">
            <div class="preview-header">
                <span class="file-info">
                    <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                    </svg>
                    ${filename}
                    ${extension ? `<span class="file-extension">.${extension}</span>` : ''}
                </span>
                <div class="preview-actions">
                    <button onclick="window.open('${url}', '_blank')" class="btn-action" title="Open File">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                        </svg>
                        Open File
                    </button>
                    <button onclick="navigator.clipboard.writeText('${url}')" class="btn-action" title="Copy URL">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                        </svg>
                        Copy URL
                    </button>
                </div>
            </div>
            <div class="unknown-container">
                <div class="unknown-icon">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <p class="unknown-message">Preview not available for this file type</p>
                <div class="unknown-actions">
                    <a href="${url}" target="_blank" class="unknown-link">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                        </svg>
                        Open in New Tab
                    </a>
                    <button onclick="navigator.clipboard.writeText('${url}')" class="unknown-link secondary">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                        </svg>
                        Copy URL
                    </button>
                </div>
            </div>
        </div>`;
    }

    /**
     * Main handler untuk endpoint media preview
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async handleRequest(req, res) {
        try {
            const { url, type, filename } = req.query;
            
            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: "Missing 'url' parameter",
                    timestamp: new Date().toISOString()
                });
            }

            // Validasi URL
            const validation = this.validateUrl(url);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error,
                    domain: validation.domain,
                    timestamp: new Date().toISOString()
                });
            }

            // Generate preview
            const previewHtml = this.generatePreview(url, type, filename);

            res.json({
                success: true,
                data: {
                    url: url,
                    type: type || this.detectContentType(url),
                    filename: filename || url.split('/').pop() || 'file',
                    preview: previewHtml,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Media preview error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate media preview',
                timestamp: new Date().toISOString()
            });
        }
    }
}

// Export instance tunggal
const mediaPreview = new MediaPreview();

// Export fungsi utama
module.exports = {
    mediaPreview,
    handleMediaPreview: (req, res) => mediaPreview.handleRequest(req, res)
};