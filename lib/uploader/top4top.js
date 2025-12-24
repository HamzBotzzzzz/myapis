const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data')
const path = require('path')

async function top4top(filePath) {
    try {
        // Validasi file
        if (!fs.existsSync(filePath)) {
            throw new Error('File tidak ditemukan')
        }

        const fileSize = fs.statSync(filePath).size
        const maxSize = 200 * 1024 * 1024 // 200MB
        
        if (fileSize > maxSize) {
            throw new Error(`File terlalu besar (${(fileSize / 1024 / 1024).toFixed(2)}MB). Maksimal 200MB`)
        }

        const f = new FormData()
        const fileName = path.basename(filePath)
        
        f.append('file_0_', fs.createReadStream(filePath), fileName)
        f.append('submitr', '[ رفع الملفات ]')

        const html = await axios.post(
            'https://top4top.io/index.php',
            f,
            {
                headers: {
                    ...f.getHeaders(),
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
                    'Accept': 'text/html'
                },
                timeout: 60000 // 60 seconds timeout
            }
        ).then(x => x.data).catch(() => null)

        if (!html) {
            throw new Error('Gagal mengupload ke Top4Top')
        }

        const get = re => {
            const m = html.match(re)
            return m ? m[1] : null
        }

        const result = 
            get(/value="(https:\/\/[a-z]\.top4top\.io\/m_[^"]+)"/) ||
            get(/https:\/\/[a-z]\.top4top\.io\/m_[^"]+/) ||
            get(/value="(https:\/\/[a-z]\.top4top\.io\/p_[^"]+)"/) ||
            get(/https:\/\/[a-z]\.top4top\.io\/p_[^"]+/)

        const del = 
            get(/value="(https:\/\/top4top\.io\/del[^"]+)"/) ||
            get(/https:\/\/top4top\.io\/del[^"]+/)

        if (!result) {
            throw new Error('Gagal mendapatkan URL hasil upload')
        }

        return {
            success: true,
            result: {
                url: result,
                delete_url: del,
                filename: fileName,
                size: fileSize,
                size_formatted: formatFileSize(fileSize)
            },
            timestamp: new Date().toISOString()
        }

    } catch (error) {
        console.error('Top4Top upload error:', error.message)
        return {
            success: false,
            message: error.message || 'Gagal upload ke Top4Top',
            error: error.message
        }
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

module.exports = { top4top }