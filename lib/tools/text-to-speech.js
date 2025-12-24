const axios = require('axios');

async function qwentts(text, voice = 'Dylan') {
    try {
        const _voice = ['Dylan', 'Sunny', 'Jada', 'Cherry', 'Ethan', 'Serena', 'Chelsie'];
        
        if (!text) throw new Error('Text is required');
        if (!_voice.includes(voice)) throw new Error(`Available voices: ${_voice.join(', ')}`);
        
        const session_hash = Math.random().toString(36).substring(2);
        const d = await axios.post(`https://qwen-qwen-tts-demo.hf.space/gradio_api/queue/join?`, {
            data: [
                text,
                voice
            ],
            event_data: null,
            fn_index: 2,
            trigger_id: 13,
            session_hash: session_hash
        });
        
        const { data } = await axios.get(`https://qwen-qwen-tts-demo.hf.space/gradio_api/queue/data?session_hash=${session_hash}`);
        
        let result;
        const lines = data.split('\n\n');
        for (const line of lines) {
            if (line.startsWith('data:')) {
                const d = JSON.parse(line.substring(6));
                if (d.msg === 'process_completed') result = d.output.data[0].url;
            }
        }
        
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = { qwentts }