// plugin/ai/grok.js (diperbarui)
async function grok(text) {
    const apiUrl = `https://api.nekolabs.web.id/text-generation/grok/3-mini?text=${encodeURIComponent(text)}`;

    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Gagal`);
        }

        const data = await response.json();
        
        // Normalisasi response
        let aiText = "";
        let citations = [];
        
        if (typeof data.result === 'string') {
            aiText = data.result;
        }
        else if (data.result && typeof data.result === 'object' && data.result.text) {
            aiText = data.result.text;
            citations = data.result.citations || [];
        }
        else if (data.text) {
            aiText = data.text;
        }
        else if (data.response) {
            aiText = data.response;
        }
        else {
            aiText = JSON.stringify(data);
        }

        return {
            success: true,
            result: {
                text: aiText.trim(),
                citations: citations
            },
            timestamp: new Date().toISOString(),
            responseTime: `${data.responseTime || "unknown"}`
        };
    } catch (error) {
        throw error;
    }
}

module.exports = { grok };