/* credits: - github.com/ztrdiamond - https://whatsapp.com/channel/0029VagFeoY9cDDa9ulpwM0T */

const axios = require("axios");
const cheerio = require("cheerio");

class Anhmoe {
  #baseURL = "https://anh.moe";
  #headers = {
    "Origin": "https://anh.moe",
    "Referer": "https://anh.moe/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };
  #api;
  #validCategories = [
    "sfw",
    "nsfw",
    "video-gore",
    "video-nsfw",
    "moe",
    "ai-picture",
    "hentai",
  ];

  constructor() {
    this.#api = axios.create({
      baseURL: this.#baseURL,
      timeout: 120000,
      headers: this.#headers,
    });
  }

  // Helper untuk membuat URL lengkap
  #makeFullURL(path) {
    if (path.startsWith('http')) return path;
    return `${this.#baseURL}${path}`;
  }

  async getCategory(category, page = null) {
    if (!this.#validCategories.includes(category)) {
      throw new Error(`Invalid category: ${category}. Valid options are: ${this.#validCategories.join(", ")}`);
    }

    // Jika page tidak diberikan, gunakan path default
    let url;
    if (page) {
      // Jika page adalah path (misal: "/category/sfw?page=2"), buat URL lengkap
      if (page.startsWith('/')) {
        url = `${this.#baseURL}${page}`;
      } else {
        url = page;
      }
    } else {
      url = `/category/${category}`;
    }

    console.log(`Fetching URL: ${url}`);
    
    const raw = await this.#api.get(url);
    const $ = cheerio.load(raw.data);
    const $listItems = $(".list-item");
    const items = [];

    $listItems.each((_, el) => {
      const $el = $(el);
      let data = {};
      const rawData = $el.attr("data-object");

      if (rawData) {
        try {
          data = JSON.parse(decodeURIComponent(rawData));
        } catch {
          console.error("Can't parse data object");
          return; // Skip item yang error
        }
      }

      const title = $el.find(".list-item-desc-title a").attr("title") || data.title || "No Title";
      const viewLinkPath = $el.find(".list-item-image a").attr("href");
      const viewLink = viewLinkPath ? new URL(viewLinkPath, this.#baseURL).href : null;
      const uploadBy = $el.find(".list-item-desc-title div").text() || "Unknown";

      const item = {
        type: data.type || "unknown",
        title: title,
        viewLink: viewLink,
        uploadBy: uploadBy,
      };

      // Tambahkan data spesifik berdasarkan type
      if (data.type && data.image) {
        item[data.type] = {
          ...data.image,
          sizeFormatted: data.size_formatted,
          width: data.width,
          height: data.height,
          uploaded: data.how_long_ago,
        };
      }

      items.push(item);
    });

    // Get pagination links
    const next = $("li.pagination-next a").attr("href") || null;
    const prev = $("li.pagination-prev a").attr("href") || null;
    const nextPage = next ? new URL(next, this.#baseURL).href : null;
    const prevPage = prev ? new URL(prev, this.#baseURL).href : null;

    return {
      category,
      contents: items,
      nextPage,
      prevPage,
      totalItems: items.length
    };
  }

  async searchByKeyword(keyword, page = null) {
    if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
      throw new Error("Keyword is required and cannot be empty");
    }

    const encodedKeyword = encodeURIComponent(keyword.trim());
    let url;
    
    if (page) {
      if (page.startsWith('/')) {
        url = `${this.#baseURL}${page}`;
      } else {
        url = page;
      }
    } else {
      url = `/search?q=${encodedKeyword}`;
    }

    console.log(`Searching: ${url}`);
    
    const raw = await this.#api.get(url);
    const $ = cheerio.load(raw.data);
    const $listItems = $(".list-item");
    const items = [];

    $listItems.each((_, el) => {
      const $el = $(el);
      let data = {};
      const rawData = $el.attr("data-object");

      if (rawData) {
        try {
          data = JSON.parse(decodeURIComponent(rawData));
        } catch {
          console.error("Can't parse data object");
          return;
        }
      }

      const title = $el.find(".list-item-desc-title a").attr("title") || data.title || "No Title";
      const viewLinkPath = $el.find(".list-item-image a").attr("href");
      const viewLink = viewLinkPath ? new URL(viewLinkPath, this.#baseURL).href : null;
      const uploadBy = $el.find(".list-item-desc-title div").text() || "Unknown";

      const item = {
        type: data.type || "unknown",
        title: title,
        viewLink: viewLink,
        uploadBy: uploadBy,
        category: data.category || null,
      };

      if (data.type && data.image) {
        item[data.type] = {
          ...data.image,
          sizeFormatted: data.size_formatted,
          width: data.width,
          height: data.height,
          uploaded: data.how_long_ago,
        };
      }

      items.push(item);
    });

    const next = $("li.pagination-next a").attr("href") || null;
    const prev = $("li.pagination-prev a").attr("href") || null;
    const nextPage = next ? new URL(next, this.#baseURL).href : null;
    const prevPage = prev ? new URL(prev, this.#baseURL).href : null;

    const searchInfo = $(".search-info").text() || "";
    const resultCount = items.length;

    return {
      keyword,
      searchInfo,
      resultCount,
      contents: items,
      nextPage,
      prevPage,
    };
  }

  async searchInCategory(category, keyword, page = null) {
    if (!this.#validCategories.includes(category)) {
      throw new Error(`Invalid category: ${category}. Valid options are: ${this.#validCategories.join(", ")}`);
    }

    if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
      throw new Error("Keyword is required and cannot be empty");
    }

    const encodedKeyword = encodeURIComponent(keyword.trim());
    let url;
    
    if (page) {
      if (page.startsWith('/')) {
        url = `${this.#baseURL}${page}`;
      } else {
        url = page;
      }
    } else {
      url = `/category/${category}?q=${encodedKeyword}`;
    }

    console.log(`Searching in category ${category}: ${url}`);
    
    const raw = await this.#api.get(url);
    const $ = cheerio.load(raw.data);
    const $listItems = $(".list-item");
    const items = [];

    $listItems.each((_, el) => {
      const $el = $(el);
      let data = {};
      const rawData = $el.attr("data-object");

      if (rawData) {
        try {
          data = JSON.parse(decodeURIComponent(rawData));
        } catch {
          console.error("Can't parse data object");
          return;
        }
      }

      const title = $el.find(".list-item-desc-title a").attr("title") || data.title || "No Title";
      const viewLinkPath = $el.find(".list-item-image a").attr("href");
      const viewLink = viewLinkPath ? new URL(viewLinkPath, this.#baseURL).href : null;
      const uploadBy = $el.find(".list-item-desc-title div").text() || "Unknown";

      const item = {
        type: data.type || "unknown",
        title: title,
        viewLink: viewLink,
        uploadBy: uploadBy,
        category: data.category || category,
      };

      if (data.type && data.image) {
        item[data.type] = {
          ...data.image,
          sizeFormatted: data.size_formatted,
          width: data.width,
          height: data.height,
          uploaded: data.how_long_ago,
        };
      }

      items.push(item);
    });

    const next = $("li.pagination-next a").attr("href") || null;
    const prev = $("li.pagination-prev a").attr("href") || null;
    const nextPage = next ? new URL(next, this.#baseURL).href : null;
    const prevPage = prev ? new URL(prev, this.#baseURL).href : null;

    return {
      category,
      keyword,
      resultCount: items.length,
      contents: items,
      nextPage,
      prevPage,
    };
  }

  async getAllCategories() {
    return {
      categories: this.#validCategories
    };
  }

  // Method khusus untuk random image
  async getRandomImage(category = null) {
    try {
      let results;
      
      if (category && this.#validCategories.includes(category)) {
        // Random page 1-10
        const randomPage = Math.floor(Math.random() * 10) + 1;
        results = await this.getCategory(category, `/category/${category}?page=${randomPage}`);
      } else {
        // Random category dan page
        const randomCategory = this.#validCategories[Math.floor(Math.random() * this.#validCategories.length)];
        const randomPage = Math.floor(Math.random() * 10) + 1;
        results = await this.getCategory(randomCategory, `/category/${randomCategory}?page=${randomPage}`);
      }

      if (!results.contents || results.contents.length === 0) {
        throw new Error("No images found");
      }

      // Filter hanya yang punya viewLink
      const validItems = results.contents.filter(item => item.viewLink);
      
      if (validItems.length === 0) {
        throw new Error("No valid images found");
      }

      const randomIndex = Math.floor(Math.random() * validItems.length);
      const randomImage = validItems[randomIndex];

      return {
        success: true,
        data: {
          image: randomImage.viewLink,
          title: randomImage.title,
          category: results.category,
          type: randomImage.type,
          uploadBy: randomImage.uploadBy,
          uploaded: randomImage.image?.uploaded || randomImage[randomImage.type]?.uploaded,
          viewLink: randomImage.viewLink
        },
        info: {
          totalResults: results.totalItems,
          category: results.category,
          selectedIndex: randomIndex + 1
        }
      };
      
    } catch (error) {
      console.error("Get random image error:", error);
      throw error;
    }
  }

  // Method khusus untuk random search
  async getRandomSearchResult(keyword, category = null) {
    try {
      let results;
      
      if (category && this.#validCategories.includes(category)) {
        results = await this.searchInCategory(category, keyword);
      } else {
        results = await this.searchByKeyword(keyword);
      }

      if (!results.contents || results.contents.length === 0) {
        throw new Error(`No results found for: ${keyword}`);
      }

      // Filter hanya yang punya viewLink
      const validItems = results.contents.filter(item => item.viewLink);
      
      if (validItems.length === 0) {
        throw new Error("No valid search results found");
      }

      const randomIndex = Math.floor(Math.random() * validItems.length);
      const randomResult = validItems[randomIndex];

      return {
        success: true,
        data: {
          image: randomResult.viewLink,
          title: randomResult.title,
          type: randomResult.type,
          uploadBy: randomResult.uploadBy,
          uploaded: randomResult.image?.uploaded || randomResult[randomResult.type]?.uploaded,
          searchKeyword: keyword,
          category: category || 'all',
          viewLink: randomResult.viewLink
        },
        searchInfo: {
          keyword: keyword,
          totalResults: results.resultCount || results.contents.length,
          selectedIndex: randomIndex + 1,
          category: category
        }
      };
      
    } catch (error) {
      console.error("Get random search error:", error);
      throw error;
    }
  }
}

module.exports = Anhmoe;