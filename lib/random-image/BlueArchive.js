const axios = require('axios');

class BluArsip {
    findUrl = (input, urls) => {
        const clean = input.toLowerCase().replace(/\s+/g, '_');
        if (urls.includes(clean)) return clean;
        
        const words = clean.split('_');
        const matches = urls.filter(url => 
            words.every(word => url.toLowerCase().includes(word))
        );
        
        return matches.length > 0 ? matches[0] : null;
    }
    
    list = async function () {
        try {
            const { data } = await axios.get('https://api.dotgg.gg/bluearchive/characters');
            return data.map(item => ({
                ...item,
                imgSmall: item.imgSmall ? 'https://images.dotgg.gg/bluearchive/characters/' + item.imgSmall : item.imgSmall,
                img: item.img ? 'https://images.dotgg.gg/bluearchive/characters/' + item.img : item.img
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    char = async function (char) {
        try {
            const listc = await this.list();
            const urls = listc.map(c => c.url);
            const foundUrl = this.findUrl(char, urls);
            
            if (!foundUrl) throw new Error(`Character "${char}" not found. Available: ${urls.slice(0, 5).join(', ')}...`);
            
            const { data } = await axios.get(`https://api.dotgg.gg/bluearchive/characters/${foundUrl}`);
            return {
                ...data,
                imgSmall: data.imgSmall ? 'https://images.dotgg.gg/bluearchive/characters/' + data.imgSmall : data.imgSmall,
                img: data.img ? 'https://images.dotgg.gg/bluearchive/characters/' + data.img : data.img
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = { BluArsip }