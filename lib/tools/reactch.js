// lib/reactch.js
const axios = require('axios');

// Simpan timestamp terakhir setiap user/IP
const requestTimestamps = new Map();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 menit dalam milidetik

/**
 * Cek apakah user/IP sudah melebihi rate limit
 * @param {string} identifier - IP address atau user identifier
 * @returns {object} - Status rate limit
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const lastRequestTime = requestTimestamps.get(identifier);
  
  if (lastRequestTime) {
    const timeDiff = now - lastRequestTime;
    const timeRemaining = RATE_LIMIT_WINDOW - timeDiff;
    
    if (timeDiff < RATE_LIMIT_WINDOW) {
      return {
        allowed: false,
        remainingTime: Math.ceil(timeRemaining / 1000), // dalam detik
        resetTime: lastRequestTime + RATE_LIMIT_WINDOW
      };
    }
  }
  
  // Update timestamp untuk request baru
  requestTimestamps.set(identifier, now);
  
  // Bersihkan data lama (opsional, untuk mencegah memory leak)
  setTimeout(() => {
    if (requestTimestamps.get(identifier) === now) {
      requestTimestamps.delete(identifier);
    }
  }, RATE_LIMIT_WINDOW + 1000);
  
  return {
    allowed: true,
    remainingTime: RATE_LIMIT_WINDOW / 1000
  };
}

/**
 * Reset rate limit untuk identifier tertentu (untuk testing/admin)
 * @param {string} identifier - IP address atau user identifier
 */
function resetRateLimit(identifier) {
  requestTimestamps.delete(identifier);
}

/**
 * Mengirim permintaan reaksi ke API whyux-xec
 * @param {string} link - URL channel WhatsApp
 * @param {string} emojis - Daftar emoji, dipisahkan koma
 * @param {string} apiKey - Kunci API untuk layanan
 * @param {string} identifier - Identifier untuk rate limiting (biasanya IP)
 * @returns {Promise<object>} - Hasil dari API eksternal
 */
async function reactToChannel(link, emojis, apiKey, identifier = 'default') {
  // Validasi dasar
  if (!link || !emojis || !apiKey) {
    throw new Error('Link, emojis, dan apiKey diperlukan untuk fungsi reactToChannel');
  }

  // Cek rate limit
  const rateLimitCheck = checkRateLimit(identifier);
  if (!rateLimitCheck.allowed) {
    const minutes = Math.floor(rateLimitCheck.remainingTime / 60);
    const seconds = rateLimitCheck.remainingTime % 60;
    throw new Error(JSON.stringify({
      success: false,
      error: `Rate limit exceeded. Silakan tunggu ${minutes} menit ${seconds} detik sebelum request berikutnya.`,
      rateLimitInfo: {
        remainingTime: rateLimitCheck.remainingTime,
        resetTime: new Date(rateLimitCheck.resetTime).toISOString()
      }
    }));
  }

  const apiUrl = `https://react.whyux-xec.my.id/api/rch?link=${encodeURIComponent(link)}&emoji=${encodeURIComponent(emojis)}`;

  try {
    const response = await axios.get(apiUrl, {
      headers: { 'x-api-key': apiKey },
      timeout: 30000 // timeout 30 detik
    });
    
    // Tambah info rate limit di response
    const responseData = response.data;
    responseData.rateLimitInfo = {
      remainingTime: rateLimitCheck.remainingTime,
      message: `Anda dapat melakukan request berikutnya dalam 5 menit`
    };
    
    return responseData;
  } catch (error) {
    // Jika request gagal, hapus rate limit untuk mencoba lagi
    resetRateLimit(identifier);
    
    // Jika API eksternal mengembalikan error, teruskan error tersebut
    if (error.response && error.response.data) {
      throw new Error(JSON.stringify(error.response.data));
    }
    // Untuk error jaringan atau lainnya
    throw error;
  }
}

module.exports = { 
  reactToChannel, 
  checkRateLimit, 
  resetRateLimit 
};