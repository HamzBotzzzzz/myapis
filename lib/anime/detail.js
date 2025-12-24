const axios = require('axios');

class Mobinime {
    constructor() {
        this.inst = axios.create({
            baseURL: 'https://air.vunime.my.id/mobinime',
            headers: {
                'accept-encoding': 'gzip',
                'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
                host: 'air.vunime.my.id',
                'user-agent': 'Dart/3.3 (dart:io)',
                'x-api-key': 'ThWmZq4t7w!z%C*F-JaNdRgUkXn2r5u8'
            }
        });
    }
    
    homepage = async function () {
        try {
            const { data } = await this.inst.get('/pages/homepage');
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    animeList = async function (type, { page = '0', count = '15', genre = '' } = {}) {
        try {
            const types = {
                series: '1',
                movie: '3',
                ova: '2',
                'live-action': '4'
            };
            
            if (!types[type]) throw new Error(`Available types: ${Object.keys(types).join(', ')}.`);
            if (isNaN(page)) throw new Error('Invalid page.');
            if (isNaN(count)) throw new Error('Invalid count.');
            
            const genres = await this.genreList();
            const gnr = genres.find(g => g.title.toLowerCase().replace(/\s+/g, '-') === genre.toLowerCase())?.id || null;
            if (!gnr) throw new Error(`Available genres: ${genres.map(g => g.title.toLowerCase().replace(/\s+/g, '-')).join(', ')}.`);
            
            const { data } = await this.inst.post('/anime/list', {
                perpage: count?.toString(),
                startpage: page?.toString(),
                userid: '',
                sort: '',
                genre: gnr,
                jenisanime: types[type]
            });
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    genreList = async function () {
        try {
            const { data } = await this.inst.get('/anime/genre');
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    search = async function (query,  { page = '0', count = '25' } = {}) {
        try {
            if (!query) throw new Error('Query is required.');
            if (isNaN(page)) throw new Error('Invalid page.');
            if (isNaN(count)) throw new Error('Invalid count.');
            
            const { data } = await this.inst.post('/anime/search', {
                perpage: count?.toString(),
                startpage: page?.toString(),
                q: query
            });
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    detail = async function (id) {
        try {
            if (isNaN(id)) throw new Error('Invalid id.');
            const { data } = await this.inst.post('/anime/detail', { id: id?.toString() });
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    stream = async function (id, epsid, { quality = 'HD' } = {}) {
        try {
            if (!id || !epsid) throw new Error('Anime id & episode id is required.');
            
            const { data: srv } = await this.inst.post('/anime/get-server-list', {
                id: epsid?.toString(),
                animeId: id?.toString(),
                jenisAnime: '1',
                userId: ''
            });
            
            const { data } = await this.inst.post('/anime/get-url-video', {
                url: srv.serverurl,
                quality: quality,
                position: '0'
            });
            
            if (!data?.url) throw new Error('Stream url not found.');
            return data.url;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = { Mobinime }
