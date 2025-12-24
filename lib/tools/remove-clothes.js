const axios = require('axios');
const FormData = require('form-data');
const githubUploader = require('./github-uploader');

// Rate limit storage
const dailyLimit = new Map();
const DAILY_LIMIT = 3;
const DAILY_RESET_TIME = 24 * 60 * 60 * 1000;
const OWNER_API_KEY = 'ilhamganteng';

// Task store untuk lazy loading
const taskStore = new Map();

/**
 * Rate limit checker
 */
function checkDailyLimit(identifier) {
    const now = Date.now();
    let userData = dailyLimit.get(identifier);
    
    if (!userData || now > userData.resetTime) {
        userData = { count: 0, resetTime: now + DAILY_RESET_TIME };
    }
    
    if (userData.count >= DAILY_LIMIT) {
        const remainingTime = userData.resetTime - now;
        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
        const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
        
        return {
            allowed: false,
            limitReached: true,
            used: userData.count,
            limit: DAILY_LIMIT,
            resetIn: remainingTime,
            resetTime: new Date(userData.resetTime).toISOString(),
            message: `Limit harian tercapai (${DAILY_LIMIT}/hari). Reset dalam ${hours} jam ${minutes} menit.`
        };
    }
    
    userData.count++;
    dailyLimit.set(identifier, userData);
    
    return {
        allowed: true,
        used: userData.count,
        limit: DAILY_LIMIT,
        remaining: DAILY_LIMIT - userData.count,
        resetTime: new Date(userData.resetTime).toISOString()
    };
}

/**
 * Create task untuk lazy loading (untuk POST endpoint)
 */
async function createRemoveClothesTask(url, identifier, ownerKey = null) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isOwner = ownerKey === OWNER_API_KEY;
    
    // Cek daily limit
    if (!isOwner) {
        const limitCheck = checkDailyLimit(identifier);
        if (!limitCheck.allowed) {
            throw new Error(JSON.stringify({
                success: false,
                error: 'DAILY_LIMIT_EXCEEDED',
                message: limitCheck.message,
                limitInfo: limitCheck
            }));
        }
    }
    
    // Simpan task ke store
    taskStore.set(taskId, {
        id: taskId,
        status: 'pending',
        progress: 0,
        url: url,
        identifier: identifier,
        isOwner: isOwner,
        apikey: ownerKey,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        result: null,
        error: null
    });
    
    console.log(`📝 Task created: ${taskId} for ${identifier} ${isOwner ? '(Owner)' : ''}`);
    
    // Start processing secara async (tidak menunggu)
    processTaskAsync(taskId);
    
    return {
        success: true,
        taskId: taskId,
        status: 'pending',
        estimatedTime: '3-5 minutes',
        checkEndpoint: `/api/tools/remove-clothes/check/${taskId}`,
        createdAt: new Date().toISOString()
    };
}

/**
 * Check task status (untuk GET endpoint)
 */
function checkTaskStatus(taskId) {
    const task = taskStore.get(taskId);
    
    if (!task) {
        throw new Error(JSON.stringify({
            success: false,
            error: 'TASK_NOT_FOUND',
            message: 'Task ID tidak ditemukan'
        }));
    }
    
    return {
        success: true,
        taskId: taskId,
        status: task.status,
        progress: task.progress,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        estimatedTimeRemaining: task.status === 'processing' ? 
            `${Math.max(1, Math.ceil((100 - task.progress) / 20))} minutes` : 
            null,
        result: task.result,
        error: task.error
    };
}

/**
 * Main function: Remove clothes dengan proses langsung (untuk backward compatibility)
 */
async function removeClothes(url, identifier, ownerKey = null) {
    const startTime = Date.now();
    const isOwner = ownerKey === OWNER_API_KEY;
    
    try {
        // 1. Cek daily limit
        if (!isOwner) {
            const limitCheck = checkDailyLimit(identifier);
            if (!limitCheck.allowed) {
                throw new Error(JSON.stringify({
                    success: false,
                    error: 'DAILY_LIMIT_EXCEEDED',
                    message: limitCheck.message,
                    limitInfo: limitCheck
                }));
            }
        }
        
        console.log(`🚀 Processing image for: ${identifier} ${isOwner ? '(Owner)' : ''}`);
        
        // 2. Download image dengan timeout 30 detik
        console.log('📥 Downloading image...');
        const imageResponse = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 detik
            maxContentLength: 10 * 1024 * 1024,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const originalSize = Buffer.byteLength(imageResponse.data);
        console.log(`✅ Image downloaded (${(originalSize / 1024 / 1024).toFixed(2)} MB)`);
        
        // 3. Upload ke PixNova dengan timeout 60 detik
        console.log('📤 Uploading to PixNova...');
        const uploadResult = await uploadToPixNova(Buffer.from(imageResponse.data));
        
        // 4. Process di PixNova dengan timeout 10 menit
        console.log('🔄 Processing with AI...');
        console.log('⏱️ AI processing timeout set to 10 minutes...');
        const pixnovaResult = await processWithPixNova(uploadResult.imagePath);
        
        // 5. Download result dari PixNova dengan timeout 60 detik
        console.log('📥 Downloading AI result...');
        const resultUrl = `https://oss-global.pixnova.ai/${pixnovaResult}`;
        const resultResponse = await axios.get(resultUrl, {
            responseType: 'arraybuffer',
            timeout: 60000, // 60 detik
            maxContentLength: 20 * 1024 * 1024
        });
        
        // 6. Upload ke GitHub dengan timeout 60 detik
        console.log('📤 Uploading to GitHub...');
        const githubResult = await githubUploader.uploadBuffer(
            Buffer.from(resultResponse.data),
            `remove_clothes_${Date.now()}.webp`
        );
        
        const processingTime = Date.now() - startTime;
        
        return {
            success: true,
            message: 'Image processed successfully',
            result: {
                originalSize: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
                processedSize: `${(resultResponse.data.length / 1024 / 1024).toFixed(2)} MB`,
                processingTime: `${(processingTime / 1000).toFixed(2)} seconds`,
                directUrl: githubResult.rawUrl,
                cdnUrl: githubResult.cdnUrl,
                fileName: githubResult.fileName,
                githubUrl: githubResult.githubUrl
            },
            limitInfo: isOwner ? {
                isOwner: true,
                unlimited: true,
                message: 'Owner access - no limits'
            } : {
                used: dailyLimit.get(identifier)?.count || 1,
                limit: DAILY_LIMIT,
                remaining: DAILY_LIMIT - (dailyLimit.get(identifier)?.count || 1),
                resetTime: dailyLimit.get(identifier)?.resetTime ? 
                    new Date(dailyLimit.get(identifier).resetTime).toISOString() : null
            },
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Error processing:', error.message);
        
        // Rollback limit jika gagal (kecuali untuk error limit)
        if (!error.message.includes('DAILY_LIMIT_EXCEEDED') && !isOwner && identifier) {
            const userData = dailyLimit.get(identifier);
            if (userData && userData.count > 0) {
                userData.count--;
                dailyLimit.set(identifier, userData);
            }
        }
        
        throw error;
    }
}

/**
 * Upload buffer ke PixNova
 */
async function uploadToPixNova(buffer) {
    const BASE_URL = 'https://api.pixnova.ai/aitools';
    
    const form = new FormData();
    form.append('file', buffer, {
        filename: `image_${Date.now()}.jpg`,
        contentType: 'image/jpeg'
    });
    
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'theme-version': '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'fp': '33a3340b3d335f6725444018a200e781',
        'fp1': '02PO6fcUryGs9kSPO80B3DCm6RS5AX5coEMhfGKjFfzqg+4JoWlqfvkinr2Anzve',
        'x-guide': 'SXxNZuM696B4/65ZAP/EVRjcKIMZ0VCmudI5Hy2hccOxQOO4/OcfzvtzWasokt6uS2N8wedhK7CocbzyL7djf37PDX8GlfcX3bG3mNCmfeHSvPia9X9HAzxZGZZO4U/OFIh+gOAuq4EdmWYkeqTGB5lKPWuXMY/OThlHC4fI8Vk=',
        'X-code': '1764830837805',
        ...form.getHeaders()
    };
    
    const response = await axios.post(`${BASE_URL}/upload-img`, form, {
        headers,
        timeout: 60000 // 60 detik
    });
    
    if (response.data.code !== 200) {
        throw new Error(`PixNova upload failed: ${response.data.message}`);
    }
    
    return {
        imagePath: response.data.data.path,
        message: 'Upload successful'
    };
}

/**
 * Process dengan PixNova AI dengan progress callback
 */
async function processWithPixNova(imagePath, progressCallback = null) {
    const BASE_URL = 'https://api.pixnova.ai/aitools';
    
    // 1. Create task dengan timeout 2 menit
    const taskData = {
        fn_name: 'cloth-change',
        call_type: 3,
        input: {
            source_image: imagePath,
            prompt: 'completely nude, no clothes, naked, fully undressed, remove all clothing',
            cloth_type: 'full_outfits',
            request_from: 2,
            type: 1
        },
        request_from: 2,
        origin_from: '111977c0d5def647'
    };
    
    const taskHeaders = {
        'Accept': 'application/json, text/plain, */*',
        'theme-version': '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'fp': '33a3340b3d335f6725444018a200e781',
        'fp1': 'rMW1WPrbyOhvL5UIMabiqS9XBtfB05Tw81w1pIhX82eXep2zQHw3iEaiboX7PSBg',
        'x-guide': 'UlWxrzLYux3FBL1tpeYtJNdVS9ZsWbYk4Xh84vHTr+Ot8sSgs8xmnBGB6AgizwA/w64xmMyCgPZ778l63Li4EDvErPL0I5fhnxpJzkn5VxpBekGe8te1ISIJbYXjWT/MJKXYdDvwRC1r+d1EG90cMt3t8xGfNdc9JCkMhl/2ddA=',
        'X-code': '1764830839124'
    };
    
    const createResponse = await axios.post(`${BASE_URL}/of/create`, taskData, {
        headers: taskHeaders,
        timeout: 120000 // 2 menit
    });
    
    if (createResponse.data.code !== 200) {
        throw new Error(`Task creation failed: ${createResponse.data.message}`);
    }
    
    const taskId = createResponse.data.data.task_id;
    console.log(`✅ PixNova task created: ${taskId}`);
    
    if (progressCallback) progressCallback(0.1);
    
    // 2. Poll for result dengan total timeout 10 menit
    let attempts = 0;
    const maxAttempts = 300; // 10 menit (300 * 2 seconds)
    const processingStartTime = Date.now();
    
    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Tunggu 2 detik
        
        const statusData = {
            task_id: taskId,
            fn_name: 'cloth-change',
            call_type: 3,
            consume_type: 0,
            request_from: 2,
            origin_from: '111977c0d5def647'
        };
        
        const fp1Values = [
            'uA86CP+VTuzb1xuq5h2BIHDMoSDexv95Rp8+/AmwiBUWyuRaMkp4ieNdOz9hu+lU',
            'dXFPTvmtHBPWF4KsvqVifbrZOhlHlTBg+EwbS/P80Q8qLYqkd4N7UXbhHcrviP6x'
        ];
        
        const checkHeaders = {
            ...taskHeaders,
            'fp1': fp1Values[attempts % fp1Values.length],
            'x-guide': 'ORVWSfHu8r72sUHRYxbjxwqW60/sIKNkWTdz8WDu2XoSREpBezW61yl1pZPM2TLJ1oopGNmNztUHAktw6xNrWy7onhCmJStJazLwnBjhl1B28Wxw5/bGQ15iNM24rVk7NtBLZVSXzSJ4TbG8/MUAQnqemBHPZfA2teDP53uH4wU=',
            'X-code': '1764830864903'
        };
        
        try {
            const statusResponse = await axios.post(`${BASE_URL}/of/check-status`, statusData, {
                headers: checkHeaders,
                timeout: 30000 // 30 detik per request
            });
            
            if (statusResponse.data.code === 200) {
                const status = statusResponse.data.data.status;
                
                // Update progress berdasarkan attempts
                const currentProgress = Math.min(0.9, 0.1 + (attempts / maxAttempts) * 0.8);
                if (progressCallback) progressCallback(currentProgress);
                
                if (status === 2) {
                    console.log(`🎉 PixNova processing complete after ${attempts + 1} attempts`);
                    if (progressCallback) progressCallback(1.0);
                    return statusResponse.data.data.result_image;
                }
                
                if (status === 3) {
                    throw new Error('PixNova processing failed');
                }
                
                // Log progress setiap 10 attempts
                if ((attempts + 1) % 10 === 0) {
                    console.log(`⏳ Task ${taskId}: Still processing... (attempt ${attempts + 1}/${maxAttempts})`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Attempt ${attempts + 1} failed: ${error.message}`);
        }
        
        attempts++;
    }
    
    throw new Error(`Processing timeout after ${maxAttempts} attempts (10 minutes)`);
}

/**
 * Async task processor
 */
async function processTaskAsync(taskId) {
    const task = taskStore.get(taskId);
    if (!task) return;
    
    try {
        // Update task status
        task.status = 'processing';
        task.startedAt = new Date().toISOString();
        task.progress = 10;
        taskStore.set(taskId, task);
        
        console.log(`🔄 Processing task ${taskId}...`);
        
        // 1. Download image
        task.progress = 20;
        taskStore.set(taskId, task);
        console.log(`📥 Downloading image for task ${taskId}...`);
        
        const imageResponse = await axios.get(task.url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const originalSize = Buffer.byteLength(imageResponse.data);
        task.progress = 30;
        taskStore.set(taskId, task);
        
        // 2. Upload ke PixNova
        console.log(`📤 Uploading to PixNova for task ${taskId}...`);
        const uploadResult = await uploadToPixNova(Buffer.from(imageResponse.data));
        
        task.progress = 40;
        taskStore.set(taskId, task);
        
        // 3. Process dengan PixNova dengan progress callback
        console.log(`🔄 AI Processing for task ${taskId}...`);
        const pixnovaResult = await processWithPixNova(uploadResult.imagePath, (progress) => {
            // Update progress berdasarkan estimasi (40-80%)
            task.progress = 40 + Math.floor(progress * 40);
            taskStore.set(taskId, task);
        });
        
        task.progress = 80;
        taskStore.set(taskId, task);
        
        // 4. Download result
        console.log(`📥 Downloading result for task ${taskId}...`);
        const resultUrl = `https://oss-global.pixnova.ai/${pixnovaResult}`;
        const resultResponse = await axios.get(resultUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: 20 * 1024 * 1024
        });
        
        task.progress = 90;
        taskStore.set(taskId, task);
        
        // 5. Upload ke GitHub
        console.log(`📤 Uploading to GitHub for task ${taskId}...`);
        const filename = `remove_clothes_${Date.now()}.webp`;
        const githubResult = await githubUploader.uploadBuffer(
            Buffer.from(resultResponse.data),
            filename
        );
        
        task.progress = 100;
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.result = {
            success: true,
            directUrl: githubResult.rawUrl,
            cdnUrl: githubResult.cdnUrl,
            fileName: githubResult.fileName,
            githubUrl: githubResult.githubUrl,
            originalSize: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
            processedSize: `${(resultResponse.data.length / 1024 / 1024).toFixed(2)} MB`
        };
        
        taskStore.set(taskId, task);
        console.log(`✅ Task ${taskId} completed successfully`);
        
    } catch (error) {
        console.error(`❌ Task ${taskId} failed:`, error.message);
        
        task.status = 'failed';
        task.error = {
            message: error.message,
            code: error.code || 'PROCESSING_ERROR',
            timestamp: new Date().toISOString()
        };
        task.completedAt = new Date().toISOString();
        taskStore.set(taskId, task);
        
        // Rollback limit jika gagal
        if (!task.isOwner && task.identifier) {
            const userData = dailyLimit.get(task.identifier);
            if (userData && userData.count > 0) {
                userData.count--;
                dailyLimit.set(task.identifier, userData);
            }
        }
    }
}

/**
 * Get queue status (simplified)
 */
function getQueueStatus() {
    const activeTasks = Array.from(taskStore.values()).filter(t => 
        t.status === 'pending' || t.status === 'processing'
    ).length;
    
    return {
        active: dailyLimit.size,
        totalProcessed: Array.from(dailyLimit.values())
            .reduce((sum, data) => sum + data.count, 0),
        pendingTasks: Array.from(taskStore.values()).filter(t => t.status === 'pending').length,
        processingTasks: Array.from(taskStore.values()).filter(t => t.status === 'processing').length,
        completedTasks: Array.from(taskStore.values()).filter(t => t.status === 'completed').length,
        timestamp: new Date().toISOString()
    };
}

/**
 * Get limit status untuk identifier
 */
function getLimitStatus(identifier) {
    const userData = dailyLimit.get(identifier);
    const now = Date.now();
    
    if (!userData || now > userData.resetTime) {
        return {
            used: 0,
            limit: DAILY_LIMIT,
            remaining: DAILY_LIMIT,
            resetTime: new Date(now + DAILY_RESET_TIME).toISOString(),
            resetIn: DAILY_RESET_TIME
        };
    }
    
    return {
        used: userData.count,
        limit: DAILY_LIMIT,
        remaining: DAILY_LIMIT - userData.count,
        resetTime: new Date(userData.resetTime).toISOString(),
        resetIn: userData.resetTime - now
    };
}

/**
 * Reset limits (admin function)
 */
function resetAllLimits() {
    dailyLimit.clear();
    return { success: true, message: 'Semua rate limits telah direset' };
}

/**
 * Clean up old tasks scheduler
 */
function startTaskCleanup() {
    // Hapus task yang sudah lama setiap 30 menit
    setInterval(() => {
        const now = Date.now();
        const CUTOFF_TIME = 60 * 60 * 1000; // 1 jam
        
        let cleanedCount = 0;
        for (const [taskId, task] of taskStore.entries()) {
            const taskTime = new Date(task.createdAt).getTime();
            if (now - taskTime > CUTOFF_TIME) {
                taskStore.delete(taskId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} old tasks`);
        }
    }, 30 * 60 * 1000); // Setiap 30 menit
}

// Start task cleanup scheduler
startTaskCleanup();

module.exports = { 
    // Fungsi utama
    removeClothes,
    createRemoveClothesTask,
    checkTaskStatus,
    
    // Utility functions
    checkDailyLimit,
    getLimitStatus,
    getQueueStatus,
    resetAllLimits,
    
    // Constants
    OWNER_API_KEY,
    DAILY_LIMIT,
    
    // Untuk debugging
    taskStore
};