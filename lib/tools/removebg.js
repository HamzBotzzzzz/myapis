const axios = require('axios');

async function removeBgDirect(imageUrl) {
  // Langsung panggil API Nekolabs
  const response = await axios.get('https://api.nekolabs.web.id/tools/pxpic/removebg', {
    params: { imageUrl },
    timeout: 30000
  });
  
  if (!response.data?.success || !response.data?.result) {
    throw new Error('Remove background failed');
  }
  
  // Download hasilnya
  const imageRes = await axios.get(response.data.result, {
    responseType: 'arraybuffer',
    timeout: 15000
  });
  
  return {
    buffer: imageRes.data,
    contentType: imageRes.headers['content-type'] || 'image/png'
  };
}

module.exports = { removeBgDirect };