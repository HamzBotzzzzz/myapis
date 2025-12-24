const axios = require('axios');
const cheerio = require('cheerio');

async function spotifyDl(url) {
  try {
    if (!url.includes('open.spotify.com')) {
      throw new Error('Invalid Spotify URL');
    }

    const rynn = await axios.get('https://spotmate.online/', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(rynn.data);
    const csrfToken = $('meta[name="csrf-token"]').attr('content');

    const api = axios.create({
      baseURL: 'https://spotmate.online',
      headers: {
        cookie: rynn.headers['set-cookie'].join('; '),
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-csrf-token': csrfToken
      }
    });

    const [{ data: meta }, { data: dl }] = await Promise.all([
      api.post('/getTrackData', { spotify_url: url }),
      api.post('/convert', { urls: url })
    ]);

    if (!meta || !dl?.url) {
      throw new Error('Invalid response from server');
    }

    return {
      success: true,
      ...meta,
      download_url: dl.url
    };

  } catch (error) {
    console.error('Spotify DL Error:', error.message);
    return {
      success: false,
      message: error.message,
      error: error.response?.data || null
    };
  }
}

module.exports = { spotifyDl };