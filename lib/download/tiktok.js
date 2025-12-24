// File: ./lib/download/tiktok.js
const axios = require("axios");

class TikTokDownloader {
  constructor() {
    this.baseUrl = "https://www.tikwm.com/api";
    this.timeout = 30000;
  }

  async getVideoInfo(tiktokUrl) {
    try {
      // Validasi URL
      if (!this.isValidTikTokUrl(tiktokUrl)) {
        throw new Error("URL harus dari TikTok (tiktok.com, vt.tiktok.com, atau vm.tiktok.com)");
      }

      console.log(`Fetching TikTok info for: ${tiktokUrl}`);

      const response = await axios.get(`${this.baseUrl}/`, {
        params: { url: tiktokUrl, hd: 1 },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.tikwm.com/',
          'Origin': 'https://www.tikwm.com'
        }
      });

      if (!response.data || response.data.code !== 0 || !response.data.data) {
        throw new Error(response.data?.msg || "Gagal mendapatkan informasi video");
      }

      const data = response.data.data;
      
      // Format response sesuai kebutuhan
      return {
        success: true,
        source: "tikwm",
        result: this.formatVideoData(data),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("TikTok API Error:", error.message);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error("Timeout: API tidak merespons dalam waktu yang ditentukan");
      }
      
      if (error.response) {
        throw new Error(`API Error: ${error.response.status} - ${error.response.data?.msg || error.response.statusText}`);
      }
      
      throw new Error(`Gagal mengambil data TikTok: ${error.message}`);
    }
  }

  async searchVideos(query, count = 10, cursor = 0) {
    try {
      if (!query || query.trim() === '') {
        throw new Error("Query pencarian diperlukan");
      }

      console.log(`Searching TikTok for: "${query}"`);

      const response = await axios.get(`${this.baseUrl}/feed/search`, {
        params: { 
          keywords: query, 
          count: count, 
          cursor: cursor,
          web: 1,
          hd: 1 
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.tikwm.com/',
          'Origin': 'https://www.tikwm.com'
        }
      });

      if (!response.data || response.data.code !== 0) {
        throw new Error(response.data?.msg || "Gagal melakukan pencarian");
      }

      const searchData = response.data.data;
      
      return {
        success: true,
        source: "tikwm",
        query: query,
        count: searchData.videos?.length || 0,
        cursor: searchData.cursor || 0,
        has_more: searchData.has_more || false,
        results: searchData.videos?.map(video => this.formatVideoData(video)) || [],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("TikTok Search Error:", error.message);
      throw error;
    }
  }

  formatVideoData(data) {
    const medias = [];
    
    // Video tanpa watermark
    if (data.play) {
      medias.push({
        url: data.play,
        quality: "no_watermark",
        type: "video",
        extension: "mp4",
        data_size: this.estimateFileSize(data.duration)
      });
    }
    
    // Video HD tanpa watermark
    if (data.hdplay) {
      medias.push({
        url: data.hdplay,
        quality: "hd_no_watermark",
        type: "video",
        extension: "mp4",
        data_size: this.estimateFileSize(data.duration, true)
      });
    }
    
    // Video dengan watermark (fallback)
    if (data.wmplay) {
      medias.push({
        url: data.wmplay,
        quality: "watermark",
        type: "video",
        extension: "mp4",
        data_size: this.estimateFileSize(data.duration)
      });
    }
    
    // Music/audio
    if (data.music) {
      medias.push({
        url: data.music,
        quality: "audio",
        type: "audio",
        extension: "mp3",
        duration: data.duration
      });
    }
    
    // Images (jika slideshow)
    if (data.images && data.images.length > 0) {
      data.images.forEach((img, index) => {
        medias.push({
          url: img,
          quality: "image",
          type: "image",
          extension: "jpg",
          index: index + 1
        });
      });
    }

    return {
      id: data.id || data.aweme_id,
      author: {
        nickname: data.author?.nickname,
        unique_id: data.author?.unique_id,
        avatar: data.author?.avatar
      },
      title: data.title || "",
      region: data.region || "",
      duration: data.duration,
      play_count: data.play_count || 0,
      comment_count: data.comment_count || 0,
      share_count: data.share_count || 0,
      download_count: data.download_count || 0,
      create_time: data.create_time,
      thumbnail: data.cover || data.thumbnail,
      medias: medias,
      music_info: data.music_info || {
        title: data.music_info?.title,
        author: data.music_info?.author,
        play: data.music_info?.play_url || data.music_info?.play
      }
    };
  }

  estimateFileSize(duration, isHD = false) {
    // Estimasi kasar: 0.5 MB per detik untuk SD, 1 MB per detik untuk HD
    const bytesPerSecond = isHD ? 1000000 : 500000;
    return duration ? duration * bytesPerSecond : 0;
  }

  isValidTikTokUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    const tiktokPatterns = [
      /https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
      /https?:\/\/(vt|vm)\.tiktok\.com\/[\w.-]+/,
      /https?:\/\/(www\.)?tiktok\.com\/t\/[\w.-]+/,
      /https?:\/\/(www\.)?tiktok\.com\/[\w.-]+\/video\/\d+/
    ];
    
    return tiktokPatterns.some(pattern => pattern.test(url.trim()));
  }

  async getDownloadLink(tiktokUrl, quality = 'no_watermark') {
    try {
      const data = await this.getVideoInfo(tiktokUrl);
      
      if (!data.success || !data.result || !data.result.medias) {
        throw new Error("Tidak ada media yang tersedia untuk didownload");
      }

      // Cari video berdasarkan kualitas
      let selectedMedia = null;
      
      // Prioritas berdasarkan quality parameter
      if (quality === 'hd_no_watermark') {
        selectedMedia = data.result.medias.find(media => 
          media.type === 'video' && media.quality === 'hd_no_watermark'
        );
      }
      
      if (!selectedMedia && quality === 'no_watermark') {
        selectedMedia = data.result.medias.find(media => 
          media.type === 'video' && media.quality === 'no_watermark'
        );
      }
      
      // Fallback ke video pertama
      if (!selectedMedia) {
        selectedMedia = data.result.medias.find(media => media.type === 'video');
      }

      if (!selectedMedia) {
        throw new Error("Tidak dapat menemukan link video");
      }

      return {
        success: true,
        video_url: selectedMedia.url,
        video_info: {
          quality: selectedMedia.quality || "unknown",
          size: selectedMedia.data_size || 0,
          extension: selectedMedia.extension || "mp4",
          duration: data.result.duration
        },
        metadata: {
          id: data.result.id,
          author: data.result.author.nickname || data.result.author.unique_id,
          unique_id: data.result.author.unique_id,
          title: data.result.title,
          thumbnail: data.result.thumbnail,
          source: data.source
        }
      };

    } catch (error) {
      console.error("getDownloadLink Error:", error.message);
      throw error;
    }
  }
}

// Fungsi utilitas
function formatDuration(seconds) {
  if (!seconds) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
  if (!num) return "0";
  return num.toLocaleString();
}

// Fungsi untuk kompatibilitas
async function getTikTokVideoLink(tiktokUrl) {
  const downloader = new TikTokDownloader();
  try {
    const result = await downloader.getDownloadLink(tiktokUrl);
    return result.video_url;
  } catch (error) {
    throw new Error(`Gagal mendapatkan link video: ${error.message}`);
  }
}

async function fetchSSSTikVideo(tiktokUrl) {
  const downloader = new TikTokDownloader();
  try {
    const result = await downloader.getDownloadLink(tiktokUrl);
    
    return {
      success: true,
      video_url: result.video_url,
      metadata: result.metadata,
      note: "Gunakan endpoint /api/download/tiktok untuk download langsung"
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Error: ${error.message}`,
      note: "Coba gunakan URL TikTok yang berbeda"
    };
  }
}

module.exports = { 
  TikTokDownloader,
  getTikTokVideoLink,
  fetchSSSTikVideo,
  formatDuration,
  formatNumber
};