const axios = require("axios");

async function fetchMagicStudioImage(promptText) {
  try {
    const apiUrl = `https://api-image-ilham.vercel.app/api/ai/magicstudio?prompt=${encodeURIComponent(promptText)}`;
    const response = await axios.get(apiUrl, { 
      responseType: "arraybuffer",
      timeout: 30000 // 30 seconds timeout
    });

    return { 
      success: true, 
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || 'image/png',
      contentLength: response.headers['content-length']
    };
  } catch (error) {
    console.error('Magic Studio API error:', error.message);
    return { 
      success: false, 
      message: error.message,
      statusCode: error.response?.status 
    };
  }
}

/**
 * Konversi buffer ke base64 string
 */
function bufferToBase64(buffer, contentType = 'image/png') {
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

/**
 * Fungsi utama yang mengembalikan buffer atau base64 berdasarkan parameter
 */
async function generateImage(promptText, returnBase64 = false) {
  try {
    const result = await fetchMagicStudioImage(promptText);
    
    if (!result.success) {
      return result;
    }

    if (returnBase64) {
      const base64String = bufferToBase64(result.buffer, result.contentType);
      return {
        success: true,
        data: base64String,
        type: 'base64',
        contentType: result.contentType,
        size: result.buffer.length,
        prompt: promptText
      };
    }

    return result;
  } catch (error) {
    console.error('Generate image error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Cache sederhana untuk mengurangi request berulang
const imageCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 menit

module.exports = { 
  fetchMagicStudioImage, 
  generateImage,
  bufferToBase64,
  imageCache, 
  CACHE_DURATION 
};