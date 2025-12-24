const axios = require('axios');

async function pindl(url) {
    try {
        if (!url.includes('pin.it')) throw new Error('Invalid url.');
        
        const { data } = await axios.get('https://pinterest-downloader-download-pinterest-image-video-and-reels.p.rapidapi.com/pins/info', {
            headers: {
                'content-type': 'application/json',
                referer: 'https://pinterest-downloader-download-pinterest-image-video-and-reels.p.rapidapi.com/',
                'x-rapidapi-host': 'pinterest-downloader-download-pinterest-image-video-and-reels.p.rapidapi.com',
                'x-rapidapi-key': '0b54688e52msh9f5155a08141c69p1073e8jsnc51fa988e886'
            },
            params: {
                url: url
            }
        });
        
        return data.data;
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = { pindl }