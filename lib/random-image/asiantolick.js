const axios = require('axios');
const cheerio = require('cheerio');

class SimpleAsianTolick {
    constructor() {
        this.baseUrl = 'https://asiantolick.com';
    }

    // Helper function
    parseImageUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.get('url') || url;
        } catch {
            return url;
        }
    }

    // 1. Get random image album
    async getRandom() {
        try {
            // Get homepage
            const { data } = await axios.get(this.baseUrl);
            const $ = cheerio.load(data);
            const albums = [];
            
            $('a.miniatura').each((_, el) => {
                const title = $(el).find('.titulo_video').text().trim();
                const url = $(el).attr('href');
                if (title && url) {
                    albums.push({
                        title,
                        url: url.startsWith('http') ? url : `${this.baseUrl}${url}`
                    });
                }
            });
            
            if (albums.length === 0) throw new Error('No albums found');
            
            // Pick random album
            const randomAlbum = albums[Math.floor(Math.random() * albums.length)];
            
            // Get album images
            const detailRes = await axios.get(randomAlbum.url);
            const $$ = cheerio.load(detailRes.data);
            const images = [];
            
            $$('.spotlight-group img, img[src*="upload"]').each((_, img) => {
                const src = $$(img).attr('src');
                if (src) images.push(this.parseImageUrl(src));
            });
            
            return {
                title: randomAlbum.title,
                url: randomAlbum.url,
                images,
                totalImages: images.length
            };
            
        } catch (error) {
            throw new Error(`Random failed: ${error.message}`);
        }
    }

    // 2. Search function
    async search(query) {
        try {
            if (!query) throw new Error('Query required');
            
            const { data } = await axios.get(`${this.baseUrl}/search/${encodeURIComponent(query)}`);
            const $ = cheerio.load(data);
            const results = [];
            
            $('a.miniatura').each((_, el) => {
                const title = $(el).find('.titulo_video').text().trim();
                const totalImages = $(el).find('.contar_imagens').text().trim();
                const cover = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
                const url = $(el).attr('href');
                
                if (title && url) {
                    results.push({
                        title,
                        totalImages,
                        cover: cover ? this.parseImageUrl(cover) : null,
                        url: url.startsWith('http') ? url : `${this.baseUrl}${url}`
                    });
                }
            });
            
            return results;
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }
}

module.exports = SimpleAsianTolick;