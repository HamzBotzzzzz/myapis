const axios = require('axios')
const crypto = require('crypto')

async function twitterstalk(username){
    try{
        if(!username) throw new Error('username required')

        const ch = await axios.get(
            'https://twittermedia.b-cdn.net/challenge/',
            {
                headers:{
                    'User-Agent':'Mozilla/5.0 (Linux; Android 10)',
                    'Accept':'application/json',
                    origin:'https://snaplytics.io',
                    referer:'https://snaplytics.io/'
                }
            }
        ).then(function(r){ return r.data })

        if(!ch.challenge_id) throw new Error('challange failed')

        const hash = crypto
            .createHash('sha256')
            .update(String(ch.timestamp) + ch.random_value)
            .digest('hex')
            .slice(0,8)

        return await axios.get(
            'https://twittermedia.b-cdn.net/viewer/?data=' + username + '&type=profile',
            {
                headers:{
                    'User-Agent':'Mozilla/5.0 (Linux; Android 10)',
                    'Accept':'application/json',
                    origin:'https://snaplytics.io',
                    referer:'https://snaplytics.io/',
                    'X-Challenge-ID':ch.challenge_id,
                    'X-Challenge-Solution':hash
                }
            }
        ).then(function(r){
            if(!r.data || !r.data.profile) throw new Error('no data')
            return r.data.profile
        })

    }catch(e){
        return { status:'eror', msg:e.message }
    }
}
module.exports = { twitterstalk }