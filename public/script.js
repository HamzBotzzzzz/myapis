    const BASE_URL = window.location.origin;
    const API_CONFIG_FILE = 'Iyah.json';
    const REQUEST_TIMEOUT_MS = 60000;
    
    let isRequestInProgress = false;
    let apiDataStore = null;
    let currentTheme = 'dark';
    let userIpAddress = null;

    const API_STATUS = {
        READY: 'ready',
        UPDATE: 'update',
        ERROR: 'error'
    };

    const STATUS_STYLES = {
        [API_STATUS.READY]: 'bg-green-500/20 text-green-400 border-green-500/40',
        [API_STATUS.UPDATE]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
        [API_STATUS.ERROR]: 'bg-red-500/20 text-red-400 border-red-500/40'
    };

    const METHOD_COLORS = {
        GET: 'method-get',
        POST: 'method-post',
        PUT: 'method-put',
        DELETE: 'method-delete',
        PATCH: 'method-patch'
    };

    const MEDIA_TYPES = {
        IMAGE: 'image',
        VIDEO: 'video',
        AUDIO: 'audio',
        PDF: 'pdf',
        UNKNOWN: 'unknown'
    };

    class ApiUtils {
        static showLoading() {
            document.getElementById('loadingOverlay').classList.add('active');
        }

        static hideLoading() {
            document.getElementById('loadingOverlay').classList.remove('active');
        }

        static showNotification(message, isError = false) {
            const toastElement = document.getElementById('notificationToast');
            const toastMessageElement = document.getElementById('toastMessage');
            const toastIconElement = document.getElementById('toastIcon');
            
            if (!toastElement || !toastMessageElement || !toastIconElement) return;
            
            toastMessageElement.textContent = message;
            
            const isLightTheme = document.body.classList.contains('light-theme');
            const iconColor = isError ? 
                (isLightTheme ? 'text-red-600' : 'text-red-400') : 
                (isLightTheme ? 'text-green-600' : 'text-green-400');
            
            toastIconElement.setAttribute('class', 'w-5 h-5 ' + iconColor);
            
            let iconSVG = '';
            if (isError) {
                iconSVG = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>';
            } else {
                iconSVG = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>';
            }
            
            toastIconElement.innerHTML = iconSVG;
            
            toastElement.classList.add('show');
            setTimeout(() => toastElement.classList.remove('show'), 3000);
        }

        static copyToClipboard(text, itemType = 'Path') {
            navigator.clipboard.writeText(text).then(() => {
                ApiUtils.showNotification(`${itemType} copied to clipboard!`);
            }).catch(() => {
                ApiUtils.showNotification('Failed to copy', true);
            });
        }

        static async createMediaPreview(url, contentType, filename = null) {
            try {
                if (url.startsWith('data:image')) {
                    return this.generateBase64Preview(url, contentType, filename);
                }
                
                const previewEndpoint = `${BASE_URL}/api/media/preview?url=${encodeURIComponent(url)}`;
                
                let fullEndpoint = previewEndpoint;
                if (contentType) fullEndpoint += `&type=${encodeURIComponent(contentType)}`;
                if (filename) fullEndpoint += `&filename=${encodeURIComponent(filename)}`;
                
                const response = await fetch(fullEndpoint);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data && data.data.preview) {
                        return data.data.preview;
                    }
                }
            } catch (error) {
                console.log('Using fallback preview:', error.message);
            }
            
            const mediaType = this.detectContentType(url, contentType);
            let previewHtml = '';
            
            const safeFilename = filename || url.split('/').pop() || 'file';
            const extension = safeFilename.split('.').pop().toLowerCase();
            
            switch(mediaType) {
                case MEDIA_TYPES.IMAGE:
                    previewHtml = `
                    <div class="media-preview-wrapper">
                        <div class="preview-header">
                            <span class="file-info">
                                <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                                </svg>
                                ${safeFilename}
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
                            </div>
                        </div>
                        <div class="image-container">
                            <img src="${url}" 
                                 alt="${safeFilename}" 
                                 class="preview-image"
                                 onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z\"/></svg>'">
                            <div class="image-overlay">
                                <span class="image-size">Click to view full size</span>
                            </div>
                        </div>
                    </div>`;
                    break;
                    
                case MEDIA_TYPES.VIDEO:
                    previewHtml = `
                    <div class="media-preview-wrapper">
                        <div class="preview-header">
                            <span class="file-info">
                                <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm1 2h10v4l-5 3-5-3V6z" clip-rule="evenodd"/>
                                </svg>
                                ${safeFilename}
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
                            </div>
                        </div>
                        <div class="video-container">
                            <video controls class="preview-video">
                                <source src="${url}" type="${contentType || 'video/mp4'}">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>`;
                    break;
                    
                case MEDIA_TYPES.AUDIO:
                    previewHtml = `
                    <div class="media-preview-wrapper">
                        <div class="preview-header">
                            <span class="file-info">
                                <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clip-rule="evenodd"/>
                                </svg>
                                ${safeFilename}
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
                            </div>
                        </div>
                        <div class="audio-container">
                            <audio controls class="preview-audio">
                                <source src="${url}" type="${contentType || 'audio/mpeg'}">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>`;
                    break;
                    
                case MEDIA_TYPES.PDF:
                    previewHtml = `
                    <div class="media-preview-wrapper">
                        <div class="preview-header">
                            <span class="file-info">
                                <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                                </svg>
                                ${safeFilename}
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
                        <div class="document-container">
                            <div class="document-icon">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <p class="document-message">PDF preview requires backend support</p>
                            <p class="document-hint">Click "Open PDF" to view this document</p>
                            <div class="document-actions">
                                <a href="${url}" target="_blank" class="document-link">
                                    <svg fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                                    </svg>
                                    Open PDF Document
                                </a>
                            </div>
                        </div>
                    </div>`;
                    break;
                    
                default:
                    previewHtml = `
                    <div class="media-preview-wrapper unknown">
                        <div class="preview-header">
                            <span class="file-info">
                                <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                                </svg>
                                ${safeFilename}
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
            
            return previewHtml;
        }
        
        static generateBase64Preview(base64String, contentType, filename = null) {
            const safeFilename = filename || 'base64-image';
            const fileInfo = filename ? `<div class="text-xs text-muted mb-2 truncate">File: ${filename}</div>` : '';
            
            return `
            <div class="media-preview-wrapper">
                <div class="preview-header">
                    <span class="file-info">
                        <svg class="file-icon" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                        </svg>
                        ${safeFilename}
                        <span class="file-extension">(base64)</span>
                    </span>
                    <div class="preview-actions">
                        <button onclick="this.parentElement.parentElement.nextElementSibling.querySelector('img').requestFullscreen()" class="btn-action" title="Fullscreen">
                            <svg fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd"/>
                            </svg>
                            Fullscreen
                        </button>
                        <button onclick="navigator.clipboard.writeText('${base64String.substring(0, 100)}...')" class="btn-action" title="Copy base64 (first 100 chars)">
                            <svg fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                            </svg>
                            Copy Base64
                        </button>
                    </div>
                </div>
                <div class="image-container">
                    <img src="${base64String}" 
                         alt="${safeFilename}" 
                         class="preview-image">
                    <div class="image-overlay">
                        <span class="image-size">Base64 Image</span>
                    </div>
                </div>
            </div>`;
        }

        static detectContentType(url, contentTypeHeader) {
            if (contentTypeHeader) {
                if (contentTypeHeader.includes('image/')) return MEDIA_TYPES.IMAGE;
                if (contentTypeHeader.includes('video/')) return MEDIA_TYPES.VIDEO;
                if (contentTypeHeader.includes('audio/')) return MEDIA_TYPES.AUDIO;
                if (contentTypeHeader.includes('application/pdf')) return MEDIA_TYPES.PDF;
            }
            
            const urlLower = url.toLowerCase();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
            const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
            
            if (imageExtensions.some(ext => urlLower.endsWith(ext))) return MEDIA_TYPES.IMAGE;
            if (videoExtensions.some(ext => urlLower.endsWith(ext))) return MEDIA_TYPES.VIDEO;
            if (audioExtensions.some(ext => urlLower.endsWith(ext))) return MEDIA_TYPES.AUDIO;
            
            return MEDIA_TYPES.UNKNOWN;
        }

        static formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        static syntaxHighlight(json) {
            if (typeof json != 'string') {
                json = JSON.stringify(json, null, 2);
            }
            
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }
    }

    class IpUtils {
        static async fetchUserIp() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                if (!response.ok) throw new Error('Failed to fetch IP');
                const data = await response.json();
                return data.ip;
            } catch (error) {
                return 'Not Available';
            }
        }
    }

    function toggleCategory(categoryIndex) {
        const contentElement = document.getElementById(`category-content-${categoryIndex}`);
        const iconElement = document.getElementById(`category-icon-${categoryIndex}`);
        const isActive = contentElement.classList.toggle('hidden');
        iconElement.style.transform = isActive ? 'rotate(0deg)' : 'rotate(180deg)';
    }

    function toggleEndpoint(categoryIndex, endpointIndex) {
        const contentElement = document.getElementById(`endpoint-content-${categoryIndex}-${endpointIndex}`);
        const iconElement = document.getElementById(`endpoint-icon-${categoryIndex}-${endpointIndex}`);
        const isActive = contentElement.classList.toggle('hidden');
        iconElement.style.transform = isActive ? 'rotate(0deg)' : 'rotate(180deg)';

        if (isActive) {
            clearResponse(categoryIndex, endpointIndex);
        }
    }

    function clearResponse(categoryIndex, endpointIndex) {
        const responseElement = document.getElementById(`response-wrapper-${categoryIndex}-${endpointIndex}`);
        responseElement.classList.add('hidden');
    }

    async function handleFileInputChange(event, categoryIndex, endpointIndex) {
        const file = event.target.files[0];
        if (!file) return;

        const previewContainer = document.getElementById(`file-preview-${categoryIndex}-${endpointIndex}`);
        const fileNameDisplay = document.getElementById(`file-name-${categoryIndex}-${endpointIndex}`);
        const fileSizeDisplay = document.getElementById(`file-size-${categoryIndex}-${endpointIndex}`);
        const filePreviewElement = document.getElementById(`file-preview-content-${categoryIndex}-${endpointIndex}`);
        const clearFileBtn = document.getElementById(`clear-file-${categoryIndex}-${endpointIndex}`);

        fileNameDisplay.textContent = file.name;
        fileSizeDisplay.textContent = ApiUtils.formatFileSize(file.size);
        
        const fileUrl = URL.createObjectURL(file);
        
        try {
            ApiUtils.showLoading();
            const previewHtml = await ApiUtils.createMediaPreview(fileUrl, file.type, file.name);
            filePreviewElement.innerHTML = previewHtml;
        } catch (error) {
            console.error('Error creating preview:', error);
            filePreviewElement.innerHTML = await ApiUtils.createMediaPreview(fileUrl, file.type, file.name);
        } finally {
            ApiUtils.hideLoading();
        }
        
        previewContainer.dataset.fileName = file.name;
        previewContainer.dataset.fileSize = file.size;
        previewContainer.dataset.fileType = file.type;
        previewContainer.dataset.fileUrl = fileUrl;
        
        previewContainer.classList.remove('hidden');
        clearFileBtn.classList.remove('hidden');
        
        setTimeout(() => URL.revokeObjectURL(fileUrl), 30000);
    }

    function clearSelectedFile(categoryIndex, endpointIndex) {
        const previewContainer = document.getElementById(`file-preview-${categoryIndex}-${endpointIndex}`);
        const fileInput = document.querySelector(`#request-form-${categoryIndex}-${endpointIndex} input[type="file"]`);
        const clearFileBtn = document.getElementById(`clear-file-${categoryIndex}-${endpointIndex}`);
        
        if (fileInput) fileInput.value = '';
        if (previewContainer.dataset.fileUrl) {
            URL.revokeObjectURL(previewContainer.dataset.fileUrl);
        }
        
        previewContainer.classList.add('hidden');
        clearFileBtn.classList.add('hidden');
    }

    async function executeApiRequest(event, categoryIndex, endpointIndex, method, path) {
        event.preventDefault();
        event.stopPropagation();
        
        if (isRequestInProgress) {
            ApiUtils.showNotification('Please wait for current request to finish', true);
            return;
        }

        const formElement = document.getElementById(`request-form-${categoryIndex}-${endpointIndex}`);
        const responseWrapper = document.getElementById(`response-wrapper-${categoryIndex}-${endpointIndex}`);
        const responseContent = document.getElementById(`response-content-${categoryIndex}-${endpointIndex}`);
        const executeButton = formElement.querySelector('button[type="submit"]');
        const buttonTextElement = executeButton.querySelector('.button-text') || executeButton;
        
        const originalButtonText = buttonTextElement.textContent || buttonTextElement.innerText;
        
        if (!executeButton.querySelector('.button-spinner')) {
            const spinner = document.createElement('span');
            spinner.className = 'button-spinner hidden';
            spinner.innerHTML = `
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            `;
            executeButton.insertBefore(spinner, buttonTextElement);
        }
        
        const spinnerElement = executeButton.querySelector('.button-spinner');
        
        const isUploadEndpoint = path.includes('/uploader/');
        const fileInput = formElement.querySelector('input[type="file"]');
        const hasFileInput = fileInput && fileInput.files.length > 0;
        
        if (isUploadEndpoint && !hasFileInput) {
            ApiUtils.showNotification('Please select a file to upload', true);
            return;
        }
        
        executeButton.disabled = true;
        isRequestInProgress = true;
        buttonTextElement.textContent = 'Executing…';
        spinnerElement.classList.remove('hidden');
        executeButton.style.opacity = '0.8';
        executeButton.style.cursor = 'not-allowed';
        executeButton.classList.add('executing');
        
        responseWrapper.classList.remove('hidden');
        responseContent.innerHTML = '<div class="loading-spinner mx-auto my-8"></div>';
        
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

        try {
            if (isUploadEndpoint && hasFileInput) {
                const formData = new FormData(formElement);
                const fullUrl = `${BASE_URL}${path}`;
                
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    body: formData,
                    signal: abortController.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const result = await response.json();
                
                let responseHtml = `
                    <div class="space-y-4">
                        <div class="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-green-400">✓</span>
                                <span class="font-semibold text-green-400">Upload Successful</span>
                            </div>
                        </div>`;
                
                if (result.success && result.result) {
                    responseHtml += `
                        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <h5 class="font-semibold text-gray-300 mb-3">Upload Result</h5>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-muted">URL:</span>
                                    <div class="flex items-center gap-2">
                                        <a href="${result.result.url}" target="_blank" class="text-blue-400 hover:text-blue-300 text-sm truncate max-w-xs">
                                            ${result.result.url}
                                        </a>
                                        <button onclick="ApiUtils.copyToClipboard('${result.result.url}', 'URL')" class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                                            Copy
                                        </button>
                                    </div>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-muted">Filename:</span>
                                    <span class="text-gray-300">${result.result.filename}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-muted">Size:</span>
                                    <span class="text-gray-300">${result.result.size_formatted}</span>
                                </div>
                            </div>`;
                    
                    if (result.result.url) {
                        try {
                            const previewHtml = await ApiUtils.createMediaPreview(
                                result.result.url, 
                                null, 
                                result.result.filename
                            );
                            responseHtml += `
                                <div class="mt-4 pt-4 border-t border-gray-700">
                                    <h6 class="font-semibold text-gray-300 mb-2">Preview:</h6>
                                    ${previewHtml}
                                </div>`;
                        } catch (previewError) {
                            console.error('Preview error:', previewError);
                            responseHtml += `
                                <div class="mt-4 pt-4 border-t border-gray-700">
                                    <h6 class="font-semibold text-gray-300 mb-2">File Uploaded:</h6>
                                    <p class="text-sm text-muted">Preview not available</p>
                                </div>`;
                        }
                    }
                    
                    responseHtml += `</div>`;
                } else {
                    responseHtml += `
                        <div class="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                            <pre class="text-sm">${JSON.stringify(result, null, 2)}</pre>
                        </div>`;
                }
                
                responseHtml += `</div>`;
                responseContent.innerHTML = responseHtml;
                
                buttonTextElement.textContent = 'Success!';
                executeButton.classList.remove('executing');
                executeButton.classList.add('success');
                
                setTimeout(() => {
                    buttonTextElement.textContent = originalButtonText;
                    executeButton.classList.remove('success');
                    resetButtonState(executeButton, buttonTextElement, spinnerElement);
                }, 2000);
                
                ApiUtils.showNotification('File uploaded successfully');
            } else {
                const formData = new FormData(formElement);
                const queryParams = new URLSearchParams();
                
                for (const [key, value] of formData.entries()) {
                    if (key !== 'file' && value) {
                        queryParams.append(key, value);
                    }
                }

                const fullUrl = `${BASE_URL}${path.split('?')[0]}?${queryParams.toString()}`;
                
                const response = await fetch(fullUrl, {
                    method: method,
                    signal: abortController.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const contentType = response.headers.get("content-type");
                
                if (contentType?.includes("application/json")) {
                    const jsonData = await response.json();
                    responseContent.innerHTML = `<pre class="code-font text-xs md:text-sm overflow-auto max-h-80">${JSON.stringify(jsonData, null, 2)}</pre>`;
                } else {
                    const textResponse = await response.text();
                    responseContent.innerHTML = `<pre class="code-font text-xs md:text-sm overflow-auto max-h-80">${textResponse}</pre>`;
                }
                
                buttonTextElement.textContent = 'Success!';
                executeButton.classList.remove('executing');
                executeButton.classList.add('success');
                
                setTimeout(() => {
                    buttonTextElement.textContent = originalButtonText;
                    executeButton.classList.remove('success');
                    resetButtonState(executeButton, buttonTextElement, spinnerElement);
                }, 2000);
                
                ApiUtils.showNotification('Request completed');
            }
            
        } catch (error) {
            clearTimeout(timeoutId);
            const errorMessage = error.name === 'AbortError' ? 'Request Timeout' : error.message;
            responseContent.innerHTML = `
                <div class="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-red-400">✗</span>
                        <span class="font-semibold text-red-400">Request Failed</span>
                    </div>
                    <pre class="text-red-400 text-sm mt-2">${errorMessage}</pre>
                </div>
            `;
            
            buttonTextElement.textContent = 'Error!';
            executeButton.classList.remove('executing');
            executeButton.classList.add('error');
            
            setTimeout(() => {
                buttonTextElement.textContent = originalButtonText;
                executeButton.classList.remove('error');
                resetButtonState(executeButton, buttonTextElement, spinnerElement);
            }, 2000);
            
            ApiUtils.showNotification('Request failed', true);
            
        } finally {
            isRequestInProgress = false;
            ApiUtils.hideLoading();
        }
    }

    function resetButtonState(button, textElement, spinnerElement) {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        if (spinnerElement) {
            spinnerElement.classList.add('hidden');
        }
    }

    function getMethodColor(method) {
        return METHOD_COLORS[method.toUpperCase()] || 'method-get';
    }

    function updateStats() {
        if (!apiDataStore || !apiDataStore.categories) return;
        
        let totalEndpoints = 0;
        let activeEndpoints = 0;
        
        apiDataStore.categories.forEach(category => {
            category.items.forEach(item => {
                totalEndpoints++;
                if (item.status === API_STATUS.READY) {
                    activeEndpoints++;
                }
            });
        });
        
        document.getElementById('totalEndpoints').textContent = totalEndpoints;
        document.getElementById('activeEndpoints').textContent = activeEndpoints;
    }

    function renderApiList(dataToRender = apiDataStore) {
        const apiListContainer = document.getElementById('apiListContainer');
        
        if (!dataToRender || !dataToRender.categories || dataToRender.categories.length === 0) {
            apiListContainer.innerHTML = '<p class="text-center text-muted">No API data available.</p>';
            return;
        }
        
        let htmlContent = '';
        
        dataToRender.categories.forEach((category, categoryIndex) => {
            const visibleEndpoints = category.items.filter(item => !item.hiddenBySearch);
            const searchTerm = document.getElementById('searchInput').value.trim();
            
            if (visibleEndpoints.length === 0 && searchTerm !== '') return;
            
            htmlContent += `<div class="category-group" data-category="${category.name.toLowerCase()}">
                <div class="api-card rounded-2xl overflow-hidden">
                    
                    <button onclick="toggleCategory(${categoryIndex})" class="w-full p-5 flex items-center justify-between hover:bg-gray-800 transition-colors category-header">
                        <div class="flex items-center gap-4">
                            <div class="category-icon">
                                <svg class="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                </svg>
                            </div>
                            <div class="text-left">
                                <h3 class="font-extrabold text-lg gradient-text">${category.name}</h3>
                                <p class="text-xs text-muted mt-1">${category.description || 'Collection of API endpoints'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="endpoint-count text-xs font-medium">${visibleEndpoints.length} endpoints</span>
                            <svg id="category-icon-${categoryIndex}" class="w-5 h-5 text-muted transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </div>
                    </button>
                    
                    <div id="category-content-${categoryIndex}" class="hidden">`;
            
            visibleEndpoints.forEach((endpoint, endpointIndex) => {
                const isUploadEndpoint = endpoint.path.includes('/uploader/');
                const requestMethod = isUploadEndpoint ? 'POST' : (endpoint.method || 'GET');
                const pathComponents = endpoint.path.split('?');
                const endpointPath = pathComponents[0];
                const methodColor = getMethodColor(requestMethod);
                
                const statusClass = STATUS_STYLES[endpoint.status] || STATUS_STYLES[API_STATUS.READY];

                htmlContent += `<div class="api-item">
                    
                    <button onclick="toggleEndpoint(${categoryIndex}, ${endpointIndex})" class="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800 transition-colors">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <span class="method-badge px-3 py-1.5 rounded text-xs text-white code-font flex-shrink-0 ${methodColor}">${requestMethod}</span>
                            <div class="text-left flex-1 min-w-0">
                                <p class="font-semibold text-base text-gray-200 truncate">${endpoint.name}</p>
                                <div class="flex items-center gap-3 mt-1">
                                    <p class="text-sm text-muted truncate code-font">${endpointPath}</p>
                                    <span class="status-tag px-3 py-1 text-xs rounded-full font-semibold ${statusClass} flex-shrink-0">${endpoint.status || API_STATUS.READY}</span>
                                </div>
                                <p class="text-xs text-muted mt-2 line-clamp-2">${endpoint.desc}</p>
                            </div>
                        </div>
                        <svg id="endpoint-icon-${categoryIndex}-${endpointIndex}" class="w-5 h-5 text-muted transition-transform duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                    
                    <div id="endpoint-content-${categoryIndex}-${endpointIndex}" class="hidden bg-gray-800 px-6 py-6">
                        <p class="text-gray-300 mb-5 text-sm leading-relaxed">${endpoint.desc}</p>
                        
                        <div class="mb-5">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-bold text-sm text-gray-300">Endpoint Path</h4>
                                <div class="flex gap-2">
                                    <button onclick="ApiUtils.copyToClipboard('${endpointPath}', 'Path')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-muted transition-colors">Copy Path</button>
                                    <button onclick="ApiUtils.copyToClipboard('${BASE_URL}${endpointPath}', 'URL')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-muted transition-colors">Copy Full URL</button>
                                </div>
                            </div>
                            <div class="path-display">
                                <code class="code-font text-sm">${endpointPath}</code>
                            </div>
                        </div>

                        <div class="mb-5">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-bold text-sm text-gray-300">Response Example</h4>
                                <button onclick="ApiUtils.copyToClipboard(JSON.stringify(${JSON.stringify(endpoint.response_example || {})}, null, 2), 'Example')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-muted transition-colors">
                                    Copy Example
                                </button>
                            </div>
                            <div class="rounded-lg overflow-hidden border border-gray-700">
                                <div class="terminal-header">
                                    <div class="terminal-dots">
                                        <div class="terminal-dot terminal-dot-red"></div>
                                        <div class="terminal-dot terminal-dot-yellow"></div>
                                        <div class="terminal-dot terminal-dot-green"></div>
                                    </div>
                                    <div class="terminal-title">RESPONSE EXAMPLE</div>
                                    <div class="w-20"></div>
                                </div>
                                <div class="terminal-body">
                                    ${endpoint.response_example ? 
                                        `<pre>${ApiUtils.syntaxHighlight(endpoint.response_example)}</pre>` : 
                                        `<p class="text-gray-500 italic">No response example available</p>`
                                    }
                                </div>
                            </div>
                        </div>`;

                if (endpoint.status === API_STATUS.READY) {
                    htmlContent += `<div class="mb-5">
                            <h4 class="font-bold text-sm text-gray-300 mb-3">Test Endpoint</h4>
                            <form id="request-form-${categoryIndex}-${endpointIndex}" onsubmit="executeApiRequest(event, ${categoryIndex}, ${endpointIndex}, '${requestMethod}', '${endpointPath}')" enctype="${isUploadEndpoint ? 'multipart/form-data' : 'application/x-www-form-urlencoded'}">
                                <div class="space-y-3 mb-4">`;
                        
                        if (isUploadEndpoint) {
                            htmlContent += `<div>
                                <label class="block text-xs font-medium text-muted mb-1">
                                    File <span class="text-red-500">*</span>
                                    <span class="text-[10px] text-muted ml-2">(Maximum 200MB)</span>
                                </label>
                                <div class="flex items-center gap-3">
                                    <label class="cursor-pointer">
                                        <div class="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
                                            <svg class="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
                                            </svg>
                                            <span class="text-sm text-gray-300">Choose File</span>
                                        </div>
                                        <input type="file" 
                                               name="file" 
                                               class="hidden" 
                                               onchange="handleFileInputChange(event, ${categoryIndex}, ${endpointIndex})"
                                               accept="*/*">
                                    </label>
                                    <button type="button" 
                                            id="clear-file-${categoryIndex}-${endpointIndex}"
                                            onclick="clearSelectedFile(${categoryIndex}, ${endpointIndex})"
                                            class="hidden px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-colors">
                                        Clear
                                    </button>
                                </div>
                                
                                <div id="file-preview-${categoryIndex}-${endpointIndex}" class="hidden mt-3">
                                    <div class="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                        <div class="flex items-center justify-between mb-2">
                                            <div>
                                                <div id="file-name-${categoryIndex}-${endpointIndex}" class="font-medium text-sm text-gray-300"></div>
                                                <div id="file-size-${categoryIndex}-${endpointIndex}" class="text-xs text-muted"></div>
                                            </div>
                                        </div>
                                        <div id="file-preview-content-${categoryIndex}-${endpointIndex}" class="mt-2"></div>
                                    </div>
                                </div>
                            </div>`;
                        }
                        
                        if (endpoint.params) {
                            htmlContent += `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;
                            Object.keys(endpoint.params).forEach(paramName => {
                                if (isUploadEndpoint && paramName === 'file') return;
                                
                                const paramDesc = endpoint.params[paramName];
                                const isRequired = paramDesc.toLowerCase().includes('required');
                                htmlContent += `<div>
                                    <label class="block text-xs font-medium text-muted mb-1">
                                        ${paramName} ${isRequired ? '<span class="text-red-500">*</span>' : ''}
                                        <span class="text-[10px] text-muted ml-2">${paramDesc}</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        name="${paramName}" 
                                        class="w-full px-4 py-2.5 param-input rounded-lg text-gray-300 placeholder-muted focus:outline-none code-font text-sm" 
                                        placeholder="Enter ${paramName}" 
                                        ${isRequired ? 'required' : ''}
                                    >
                                </div>`;
                            });
                            htmlContent += `</div>`;
                        } else if (!isUploadEndpoint) {
                            htmlContent += `<p class="text-muted text-sm italic">No parameters required for this endpoint.</p>`;
                        }
                        
                        htmlContent += `</div>
                            <div class="flex gap-3 flex-wrap">
                                <button type="submit" class="px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-all btn-primary ${isUploadEndpoint ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}">
                                    <span class="button-text">${isUploadEndpoint ? 'Upload File' : 'Execute Request'}</span>
                                </button>
                                <button type="button" onclick="clearResponse(${categoryIndex}, ${endpointIndex})" class="px-6 py-2.5 rounded-lg text-muted font-semibold text-sm transition-colors btn-secondary">
                                    Clear Response
                                </button>
                            </div>
                        </form>
                    </div>`;
                    
                    let curlCommand = '';
                    if (isUploadEndpoint) {
                        curlCommand = `curl -X POST "${BASE_URL}${endpointPath}" -F "file=@filename.ext"`;
                    } else {
                        curlCommand = `curl -X ${requestMethod} "${BASE_URL}${endpointPath}"`;
                    }
                    
                    htmlContent += `
                    <div class="mt-5">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-bold text-sm text-gray-300">cURL Command</h4>
                            <button onclick="ApiUtils.copyToClipboard(document.getElementById('curl-command-${categoryIndex}-${endpointIndex}').textContent, 'cURL')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-muted transition-colors">
                                Copy cURL
                            </button>
                        </div>
                        <div class="path-display">
                            <code id="curl-command-${categoryIndex}-${endpointIndex}" class="code-font text-xs text-muted break-all">${curlCommand}</code>
                        </div>
                    </div>

                    <div id="response-wrapper-${categoryIndex}-${endpointIndex}" class="mt-5 hidden">
                        <h4 class="font-bold text-sm text-gray-300 mb-2">Live Response</h4>
                        <div class="response-box p-4 rounded-xl overflow-auto" id="response-content-${categoryIndex}-${endpointIndex}">
                        </div>
                    </div>`;
                } else {
                    htmlContent += `<div class="mt-4 px-4 py-3 ${statusClass} rounded-xl text-sm font-semibold">Endpoint Status: ${endpoint.status || 'Not Ready'}</div>`;
                }

                htmlContent += `</div></div>`;
            });
            
            htmlContent += `</div></div></div>`;
        });
        
        apiListContainer.innerHTML = htmlContent;
        updateStats();
    }

    function handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const noResultsElement = document.getElementById('noResultsMessage');

        if (!apiDataStore || !apiDataStore.categories) return;

        const filteredData = { 
            categories: apiDataStore.categories.map(category => ({
                ...category,
                items: category.items.map(item => ({...item, hiddenBySearch: false}))
            }))
        };
        
        let matchCount = 0;

        filteredData.categories.forEach(category => {
            category.items.forEach(item => {
                const pathMatch = item.path.toLowerCase().includes(searchTerm);
                const aliasMatch = item.name.toLowerCase().includes(searchTerm);
                const descMatch = item.desc.toLowerCase().includes(searchTerm);

                const hasMatch = pathMatch || aliasMatch || descMatch;

                if (!hasMatch) {
                    item.hiddenBySearch = true;
                } else {
                    matchCount++;
                }
            });
        });

        renderApiList(filteredData);
        
        if (matchCount === 0 && searchTerm !== '') {
            noResultsElement.classList.remove('hidden');
        } else {
            noResultsElement.classList.add('hidden');
        }
    }

    function updateAvatarBasedOnTheme() {
        const avatarElement = document.getElementById('dynamicAvatar');
        
        if (!avatarElement) return;
        
        const isLightTheme = document.body.classList.contains('light-theme');
        avatarElement.src = isLightTheme ? 'https://files.catbox.moe/4r06p1.jpg' : 'https://files.catbox.moe/b37poz.jpg';
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem('appTheme') || 'dark';
        const themeIcon = document.getElementById('themeIcon');
        const bodyElement = document.body;

        if (savedTheme === 'light') {
            bodyElement.classList.add('light-theme');
            themeIcon.textContent = '☀️';
            currentTheme = 'light';
        } else {
            themeIcon.textContent = '🌙';
            currentTheme = 'dark';
        }
        
        updateAvatarBasedOnTheme();
    }
    
    function toggleTheme() {
        const themeIcon = document.getElementById('themeIcon');
        const bodyElement = document.body;
        
        if (bodyElement.classList.contains('light-theme')) {
            bodyElement.classList.remove('light-theme');
            themeIcon.textContent = '🌙';
            localStorage.setItem('appTheme', 'dark');
            currentTheme = 'dark';
        } else {
            bodyElement.classList.add('light-theme');
            themeIcon.textContent = '☀️';
            localStorage.setItem('appTheme', 'light');
            currentTheme = 'light';
        }
        
        updateAvatarBasedOnTheme();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initializeTheme();
        
        IpUtils.fetchUserIp().then(ip => {
            userIpAddress = ip;
            const footerIpElement = document.getElementById('footerIp');
            if (footerIpElement) {
                footerIpElement.textContent = ip;
            }
        });
        
        document.getElementById('searchInput').addEventListener('input', handleSearch);
        document.getElementById('themeToggle').addEventListener('click', toggleTheme);
        
        fetch(API_CONFIG_FILE)
            .then(response => {
                if (!response.ok) throw new Error('Failed to load API configuration');
                return response.json();
            })
            .then(configData => {
                apiDataStore = configData;
                renderApiList();
            })
            .catch(error => {
                console.error('Error loading API data:', error);
                const apiListContainer = document.getElementById('apiListContainer');
                apiListContainer.innerHTML = `<p class="text-center text-red-400">Failed to load API data: ${error.message}</p>`;
            });
    });