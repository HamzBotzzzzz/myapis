const axios = require('axios')

async function igstalk(username) {
    try {
        if (!username) throw new Error('username required')

        const response = await axios.post(
            'https://api.boostfluence.com/api/instagram-profile-v2',
            { username },
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
                    'Content-Type': 'application/json',
                    'origin': 'https://www.boostfluence.com',
                    'referer': 'https://www.boostfluence.com/'
                },
                timeout: 60000 // 10 seconds timeout
            }
        )

        if (!response.data) {
            throw new Error('fetch failed')
        }

        // Format response agar konsisten dengan API lainnya
        return {
            success: true,
            result: response.data,
            timestamp: new Date().toISOString()
        }

    } catch (e) {
        console.error('Instagram stalk error:', e.message)
        return {
            success: false,
            message: e.message || 'Failed to fetch Instagram profile',
            error: e.message
        }
    }
}

module.exports = { igstalk }