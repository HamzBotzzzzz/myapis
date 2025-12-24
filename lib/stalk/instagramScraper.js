// instagramStalkV2.js
const axios = require('axios');
const cheerio = require('cheerio');

async function igstalk2(username) {
    try {
        if (!username) throw new Error('username required');
        username = username.replace('@', '').trim();

        // Approach 1: Coba scrape dari halaman web langsung
        try {
            const response = await axios.get(`https://gramsnap.com/en/profile/${username}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://gramsnap.com/',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            
            // Extract data dari HTML
            const scriptContent = $('script[type="application/json"]').html();
            if (scriptContent) {
                try {
                    const jsonData = JSON.parse(scriptContent);
                    if (jsonData.props?.pageProps?.userData) {
                        return formatResponse(jsonData.props.pageProps.userData);
                    }
                } catch (e) {
                    console.log('JSON parsing failed, trying alternative extraction');
                }
            }

            // Alternative extraction from HTML
            const userData = extractFromHTML($);
            if (userData) {
                return formatResponse(userData);
            }

        } catch (webError) {
            console.log('Web scraping failed:', webError.message);
        }

        // Approach 2: Gunakan API alternatif jika web scraping gagal
        return await fallbackInstagramAPI(username);

    } catch (error) {
        console.error('Instagram stalk V2 error:', error.message);
        return {
            success: false,
            message: 'Failed to fetch Instagram profile',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

function extractFromHTML($) {
    try {
        // Coba ekstrak dari meta tags atau element spesifik
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const title = $('title').text() || '';
        
        // Contoh ekstraksi sederhana (sesuaikan dengan struktur GramSnap)
        const profileInfo = {
            username: '',
            full_name: '',
            biography: '',
            followers: 0,
            following: 0,
            posts_count: 0
        };

        // Logic untuk extract data dari HTML
        // (Ini perlu diadaptasi berdasarkan struktur HTML GramSnap)
        
        return profileInfo;
    } catch (error) {
        return null;
    }
}

async function fallbackInstagramAPI(username) {
    // API alternatif jika GramSnap tidak bekerja
    try {
        // Coba menggunakan API publik lain
        const response = await axios.get(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'X-IG-App-ID': '936619743392459',
                'Accept': 'application/json',
                'Origin': 'https://www.instagram.com',
                'Referer': `https://www.instagram.com/${username}/`,
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            },
            timeout: 10000
        });

        if (response.data?.data?.user) {
            const user = response.data.data.user;
            return {
                success: true,
                username: user.username,
                full_name: user.full_name || '',
                biography: user.biography || '',
                followers: user.edge_followed_by?.count || 0,
                following: user.edge_follow?.count || 0,
                posts_count: user.edge_owner_to_timeline_media?.count || 0,
                is_private: user.is_private || false,
                is_verified: user.is_verified || false,
                profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || '',
                timestamp: new Date().toISOString(),
                source: 'instagram_official'
            };
        }
    } catch (error) {
        console.log('Fallback API failed:', error.message);
    }

    return {
        success: false,
        message: 'Unable to fetch Instagram data',
        timestamp: new Date().toISOString()
    };
}

function formatResponse(userData) {
    return {
        success: true,
        username: userData.username,
        full_name: userData.full_name || userData.name,
        biography: userData.biography || userData.bio,
        followers: userData.follower_count || userData.followers || 0,
        following: userData.following_count || userData.following || 0,
        posts_count: userData.media_count || userData.posts_count || 0,
        is_private: userData.is_private || false,
        is_verified: userData.is_verified || false,
        profile_pic_url: userData.profile_pic_url || userData.avatar,
        profile_pic_url_hd: userData.hd_profile_pic_url || userData.profile_pic_url,
        external_url: userData.external_url || userData.website || '',
        is_business: userData.is_business || false,
        category: userData.category || '',
        timestamp: new Date().toISOString(),
        source: 'gramsnap_web'
    };
}

module.exports = { igstalk2 };