const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const githubUploader = require('./github-uploader'); 
// ⬆️ sesuaikan path kalau beda

async function unrestrictedai(prompt, style = 'anime') {
    try {
        const styles = [
            'photorealistic',
            'digital-art',
            'impressionist',
            'anime',
            'fantasy',
            'sci-fi',
            'vintage'
        ];

        if (!prompt) throw new Error('Prompt is required.');
        if (!styles.includes(style)) {
            throw new Error(`Available styles: ${styles.join(', ')}`);
        }

        // 1️⃣ ambil nonce
        const { data: html } = await axios.get(
            'https://unrestrictedaiimagegenerator.com/',
            {
                headers: {
                    origin: 'https://unrestrictedaiimagegenerator.com',
                    referer: 'https://unrestrictedaiimagegenerator.com/',
                    'user-agent':
                        'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'
                }
            }
        );

        const $ = cheerio.load(html);
        const nonce = $('input[name="_wpnonce"]').attr('value');
        if (!nonce) throw new Error('Nonce not found.');

        // 2️⃣ generate image
        const { data: resultHtml } = await axios.post(
            'https://unrestrictedaiimagegenerator.com/',
            new URLSearchParams({
                generate_image: true,
                image_description: prompt,
                image_style: style,
                _wpnonce: nonce
            }).toString(),
            {
                headers: {
                    origin: 'https://unrestrictedaiimagegenerator.com',
                    referer: 'https://unrestrictedaiimagegenerator.com/',
                    'user-agent':
                        'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
                    'content-type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const $$ = cheerio.load(resultHtml);
        const imgUrl = $$('img#resultImage').attr('src');
        if (!imgUrl) throw new Error('No result found.');

        // 3️⃣ download image → buffer
        const imgRes = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
            headers: { 'user-agent': 'Mozilla/5.0' }
        });

        const buffer = Buffer.from(imgRes.data);

        // 4️⃣ upload ke GitHub
        const ext =
            path.extname(new URL(imgUrl).pathname) || '.webp';
            
            const safePrompt = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 30);

        const uploadResult = await githubUploader.uploadBuffer(
    buffer,
    `${safePrompt}${ext}`
);

        // 5️⃣ return lengkap
        return {
            success: true,
            prompt,
            style,
            sourceUrl: imgUrl,
            ...uploadResult
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = { unrestrictedai };