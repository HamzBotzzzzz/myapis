const axios = require("axios");

async function fetchScreenshot(url, options = {}) {
  const {
    width = 1280,
    height = 720,
    full_page = false,
    device_scale = 1
  } = options;

  try {
    const { data } = await axios.post(
      'https://gcp.imagy.app/screenshot/createscreenshot',
      {
        url: url,
        browserWidth: parseInt(width),
        browserHeight: parseInt(height),
        fullPage: full_page,
        deviceScaleFactor: parseInt(device_scale),
        format: 'png'
      },
      {
        headers: {
          'content-type': 'application/json',
          referer: 'https://imagy.app/full-page-screenshot-taker/',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
        },
        timeout: 30000 // 30 seconds timeout
      }
    );
    
    return { 
      success: true, 
      imageUrl: data.fileUrl 
    };
  } catch (error) {
    console.error('Screenshot API error:', error.message);
    return { 
      success: false, 
      message: error.message,
      statusCode: error.response?.status 
    };
  }
}

// Cache sederhana untuk mengurangi request berulang
const screenshotCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

module.exports = { 
  fetchScreenshot, 
  screenshotCache, 
  CACHE_DURATION 
};