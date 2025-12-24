const axios = require('axios');

async function bypassai(text) {
    try {
        if (!text) throw new Error('Text is required.');
        
        const { data } = await axios.get('https://31jnx1hcnk.execute-api.us-east-1.amazonaws.com/default/test_7_aug_24', {
            headers: {
                origin: 'https://bypassai.writecream.com',
                referer: 'https://bypassai.writecream.com/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            },
            params: {
                content: text
            }
        });
        
        return data.finalContent.replace(/<span[^>]*>|<\/span>/g, '');
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = { bypassai }
