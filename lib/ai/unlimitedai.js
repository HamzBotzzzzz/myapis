// File: ./lib/ai/unlimitedai.js
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')

class UnlimitedAI {
    constructor() {
        this.baseUrl = 'https://unlimitedai.org'
        this.chatUrl = 'https://unlimitedai.org/chat/'
        this.ajaxUrl = 'https://unlimitedai.org/wp-admin/admin-ajax.php'
        this.clientId = uuidv4().replace(/-/g, '').substring(0, 16)
        this.postId = '7'  // Default post ID dari website
        this.botId = 'chatgpt'
        this.chatbotIdentity = 'ChatGPT'
        this.nonce = null
        this.nonceTimestamp = 0
        this.cookieJar = []
        
        this.axiosInstance = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            }
        })
    }

    async initialize() {
        try {
            // Get initial page to set cookies and find nonce
            const response = await this.axiosInstance.get(this.chatUrl)
            
            if (response.status === 200) {
                // Extract cookies
                const cookies = response.headers['set-cookie']
                if (cookies) {
                    this.cookieJar = Array.isArray(cookies) ? cookies : [cookies]
                }
                
                // Extract nonce from HTML
                const html = response.data
                const noncePatterns = [
                    /"_ajax_nonce":"([a-f0-9]{10})"/,
                    /'_ajax_nonce':'([a-f0-9]{10})'/,
                    /"search_nonce":"([a-f0-9]{10})"/,
                    /wpaicgParams.*?"search_nonce":"([^"]+)"/
                ]
                
                for (const pattern of noncePatterns) {
                    const match = html.match(pattern)
                    if (match && match[1]) {
                        this.nonce = match[1]
                        this.nonceTimestamp = Date.now()
                        console.log(`Found nonce: ${this.nonce}`)
                        return true
                    }
                }
                
                // Fallback nonce if not found
                this.nonce = '3c4b7dd456'
                console.log(`Using fallback nonce: ${this.nonce}`)
                return true
            }
            return false
        } catch (error) {
            console.error('Initialization error:', error.message)
            this.nonce = '3c4b7dd456'  // Hardcoded fallback
            return true
        }
    }

    async sendMessage(message) {
        try {
            // Ensure initialized
            if (!this.nonce) {
                await this.initialize()
            }
            
            // Prepare form data
            const formData = new URLSearchParams()
            formData.append('action', 'wpaicg_chat_shortcode_message')
            formData.append('message', message)
            formData.append('_wpnonce', this.nonce)
            formData.append('post_id', this.postId)
            formData.append('bot_id', this.botId)
            formData.append('chatbot_identity', this.chatbotIdentity)
            formData.append('wpaicg_chat_client_id', this.clientId)
            
            // Set headers with cookies
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': this.baseUrl,
                'Referer': this.chatUrl,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            }
            
            // Add cookies if available
            if (this.cookieJar.length > 0) {
                headers['Cookie'] = this.cookieJar.join('; ')
            }
            
            // Send request
            const response = await this.axiosInstance.post(
                this.ajaxUrl,
                formData.toString(),
                {
                    headers: headers,
                    responseType: 'text'
                }
            )
            
            if (response.status === 200) {
                // Parse SSE response
                const result = this.parseSSEResponse(response.data)
                if (result) {
                    return {
                        success: true,
                        text: result,
                        model: "UnlimitedAI.org",
                        clientId: this.clientId,
                        timestamp: new Date().toISOString()
                    }
                }
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            
        } catch (error) {
            console.error('Send message error:', error.message)
            throw error
        }
    }

    parseSSEResponse(streamText) {
        let result = ''
        const lines = streamText.split('\n')
        
        for (const line of lines) {
            const trimmedLine = line.trim()
            if (trimmedLine.startsWith('data: ')) {
                const data = trimmedLine.substring(6)
                if (data === '[DONE]') {
                    break
                }
                
                try {
                    const json = JSON.parse(data)
                    if (json.choices && json.choices.length > 0) {
                        const choice = json.choices[0]
                        if (choice.delta && choice.delta.content) {
                            result += choice.delta.content
                        }
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }
        
        return result.trim() || streamText.trim()
    }
}

// Main function
async function unlimitedai(question) {
    const ai = new UnlimitedAI()
    
    try {
        // Initialize once
        await ai.initialize()
        
        // Send message
        const result = await ai.sendMessage(question)
        return result
        
    } catch (error) {
        console.error('UnlimitedAI error:', error.message)
        throw new Error(`Failed to get response: ${error.message}`)
    }
}

module.exports = { unlimitedai }