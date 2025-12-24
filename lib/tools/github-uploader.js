// lib/utils/github-uploader.js
const axios = require('axios');
const crypto = require('crypto');
const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_BRANCH, REPOSITORIES, UPLOAD_PATH } = require('./config/github-config');

class GitHubUploader {
    constructor() {
        this.token = GITHUB_TOKEN;
        this.owner = GITHUB_OWNER;
        this.branch = GITHUB_BRANCH;
        this.repos = [...REPOSITORIES];
        this.initialized = false;
    }

    /**
     * Inisialisasi - cek koneksi dan repositori
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('🔗 Initializing GitHub Uploader...');
        
        // Cek token valid
        try {
            const response = await axios.get('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            console.log(`✅ Connected as: ${response.data.login}`);
        } catch (error) {
            throw new Error(`GitHub token invalid: ${error.message}`);
        }

        // Cek dan buat repositori jika belum ada
        await this.ensureRepositories();
        
        this.initialized = true;
        console.log('✅ GitHub Uploader initialized');
    }

    /**
     * Pastikan semua repositori ada
     */
    async ensureRepositories() {
        const promises = this.repos.map(async (repo) => {
            try {
                await axios.get(`https://api.github.com/repos/${this.owner}/${repo}`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                console.log(`✅ Repository exists: ${repo}`);
            } catch (error) {
                if (error.response?.status === 404) {
                    // Buat repositori baru
                    console.log(`📦 Creating new repository: ${repo}`);
                    await axios.post(
                        'https://api.github.com/user/repos',
                        {
                            name: repo,
                            private: false,
                            auto_init: true,
                            description: 'Auto-generated repository for file storage'
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${this.token}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        }
                    );
                    console.log(`✅ Repository created: ${repo}`);
                } else {
                    console.warn(`⚠️ Cannot check repository ${repo}: ${error.message}`);
                }
            }
        });

        await Promise.all(promises);
    }

    /**
     * Generate nama file unik
     */
    generateFileName(originalName = '') {
        const timestamp = Date.now();
        const randomStr = crypto.randomBytes(4).toString('hex');
        const ext = originalName.split('.').pop() || 'webp';
        
        // Hapus karakter tidak aman
        const safeName = originalName
            .replace(/\.[^/.]+$/, '') // Hapus ekstensi
            .replace(/[^a-zA-Z0-9-_]/g, '_') // Ganti karakter spesial
            .substring(0, 50); // Batasi panjang
        
        return `${safeName}_${timestamp}_${randomStr}.${ext}`.toLowerCase();
    }

    /**
     * Pilih repositori secara round-robin
     */
    getNextRepo() {
        if (!this.repos.length) {
            throw new Error('No repositories available');
        }
        
        // Round-robin selection
        const repoIndex = Math.floor(Math.random() * this.repos.length);
        return this.repos[repoIndex];
    }

    /**
     * Upload buffer ke GitHub
     */
    async uploadBuffer(buffer, fileName = '') {
        if (!this.initialized) {
            await this.initialize();
        }

        const finalFileName = this.generateFileName(fileName);
        const repo = this.getNextRepo();
        const filePath = `${UPLOAD_PATH}${finalFileName}`;
        const content = buffer.toString('base64');

        console.log(`📤 Uploading to GitHub: ${finalFileName} -> ${repo}`);

        try {
            const response = await axios.put(
                `https://api.github.com/repos/${this.owner}/${repo}/contents/${filePath}`,
                {
                    message: `Upload: ${finalFileName} - Remove Clothes Result`,
                    content: content,
                    branch: this.branch
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 201 || response.status === 200) {
                const rawUrl = `https://raw.githubusercontent.com/${this.owner}/${repo}/${this.branch}/${filePath}`;
                const cdnUrl = `https://cdn.jsdelivr.net/gh/${this.owner}/${repo}@${this.branch}/${filePath}`;
                
                console.log(`✅ Upload successful: ${rawUrl}`);
                
                return {
                    success: true,
                    fileName: finalFileName,
                    repo: repo,
                    rawUrl: rawUrl,
                    cdnUrl: cdnUrl,
                    githubUrl: response.data.content.html_url,
                    sha: response.data.content.sha,
                    size: Buffer.byteLength(buffer)
                };
            }

            throw new Error(`Upload failed with status: ${response.status}`);

        } catch (error) {
            console.error('❌ GitHub upload failed:', error.message);
            
            // Coba repo lain jika gagal
            if (error.response?.status === 409) { // File already exists
                console.log('🔄 File exists, generating new name...');
                return this.uploadBuffer(buffer, fileName); // Coba lagi dengan nama baru
            }
            
            throw new Error(`GitHub upload failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Upload file dari path lokal
     */
    async uploadFile(filePath, deleteAfterUpload = true) {
        const fs = require('fs');
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const buffer = fs.readFileSync(filePath);
        const fileName = filePath.split('/').pop();
        
        const result = await this.uploadBuffer(buffer, fileName);
        
        // Hapus file lokal setelah upload (opsional)
        if (deleteAfterUpload) {
            try {
                fs.unlinkSync(filePath);
                console.log(`🗑️  Local file deleted: ${filePath}`);
            } catch (error) {
                console.warn('⚠️ Could not delete local file:', error.message);
            }
        }
        
        return result;
    }

    /**
     * Delete file dari GitHub
     */
    async deleteFile(repo, filePath) {
        try {
            // Dapatkan SHA file terlebih dahulu
            const getResponse = await axios.get(
                `https://api.github.com/repos/${this.owner}/${repo}/contents/${filePath}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            const sha = getResponse.data.sha;

            // Hapus file
            const deleteResponse = await axios.delete(
                `https://api.github.com/repos/${this.owner}/${repo}/contents/${filePath}`,
                {
                    data: {
                        message: `Delete: ${filePath}`,
                        sha: sha,
                        branch: this.branch
                    },
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            console.log(`🗑️  File deleted from GitHub: ${filePath}`);
            return { success: true, message: 'File deleted' };

        } catch (error) {
            console.error('❌ Delete failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * List files di repositori
     */
    async listFiles(repo = null, limit = 20) {
        const reposToCheck = repo ? [repo] : this.repos;
        const allFiles = [];

        for (const repoName of reposToCheck) {
            try {
                const response = await axios.get(
                    `https://api.github.com/repos/${this.owner}/${repoName}/contents/${UPLOAD_PATH}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );

                const files = response.data
                    .filter(item => item.type === 'file')
                    .map(file => ({
                        name: file.name,
                        repo: repoName,
                        url: file.download_url,
                        size: file.size,
                        sha: file.sha,
                        uploaded: file.name.match(/_(\d+)_/)?.[1] || 'unknown'
                    }))
                    .sort((a, b) => b.uploaded - a.uploaded) // Terbaru dulu
                    .slice(0, limit);

                allFiles.push(...files);

            } catch (error) {
                console.warn(`⚠️ Cannot list files from ${repoName}:`, error.message);
            }
        }

        return allFiles;
    }

    /**
     * Get upload statistics
     */
    async getStats() {
        const files = await this.listFiles();
        const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        
        return {
            totalFiles: files.length,
            totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
            repositories: this.repos.length,
            uploadPath: UPLOAD_PATH
        };
    }
}

module.exports = new GitHubUploader();