const axios = require('axios')

async function ttstalk(username){
    try{
        if(!username) throw Error('username required')

        html = await axios.get(
            'https://www.tiktok.com/@' + username,
            {
                headers:{
                    'User-Agent':'Mozilla/5.0 (Linux; Android 10)',
                    'Accept':'text/html'
                }
            }
        ).then(r => r.data)

        pick = function(re){
            m = html.match(re)
            return m ? m[1] : null
        }

        return {
            username : pick(/"uniqueId":"([^"]+)"/),
            name : pick(/"nickname":"([^"]+)"/),
            bio : pick(/"signature":"([^"]*)"/),
            followers : pick(/"followerCount":(\d+)/),
            following : pick(/"followingCount":(\d+)/),
            likes : pick(/"heartCount":(\d+)/),
            videoCount : pick(/"videoCount":(\d+)/),
            avatar : pick(/"avatarLarger":"([^"]+)"/)?.replace(/\\u002F/g,'/')
        }

    }catch(e){
        return { status:'error', msg:e.message }
    }
}

module.exports = { ttstalk }
/*
{
  username: 'cukiii.digital',
  name: '—cuki digital??',
  bio: 'hai',
  followers: '87',
  following: '102',
  likes: '5250',
  videoCount: '1',
  avatar: 'https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/1de1e3a785b1a70dc9c3acd08d0115f4~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=14579&refresh_token=27b09956&x-expires=1765965600&x-signature=Ls60hD7A6AyTSJCQtmW%2BLLtwyP0%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=my2'
}
*/