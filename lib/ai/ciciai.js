const axios = require('axios')
const { v4: uuidv4 } = require('uuid')

async function ciciai(question) {
    if (!question) {
        throw new Error("Question is required")
    }

    const rnd = () => Math.floor(Math.random() * 1e17)
    const rndHex = () => Math.floor(Math.random() * 1e17).toString(16)
    const randomStr = () => Math.random().toString(36).slice(2)
    
    const random = rnd()
    const cdid = "2" + rndHex().padStart(23, "0")
    const uid = rnd()
    const iid = rnd()
    const device_id = rnd()

    try {
        const { data: rawData } = await axios.post(
            "https://api-normal-i18n.ciciai.com/im/sse/send/message",
            {
                channel: 3,
                cmd: 100,
                sequence_id: uuidv4(),
                uplink_body: {
                    send_message_body: {
                        ack_only: false,
                        applet_payload: {},
                        bot_id: "7241547611541340167",
                        bot_type: 1,
                        client_controller_param: {
                            answer_with_suggest: true,
                            local_language_code: "en",
                            local_nickname: "Randy yuann",
                            local_voice_id: "92"
                        },
                        content: JSON.stringify({
                            im_cmd: -1,
                            text: question
                        }),
                        content_type: 1,
                        conversation_id: "485805516280081",
                        conversation_type: 3,
                        create_time: Math.floor(Date.now() / 1000),
                        ext: {
                            create_time_ms: Date.now().toString(),
                            record_status: "1",
                            wiki: "1",
                            search_engine_type: "1",
                            media_search_type: "0",
                            answer_with_suggest: "1",
                            system_language: "en",
                            is_audio: "false",
                            voice_mix_input: "0",
                            tts: "1",
                            is_app_background: "0",
                            need_deep_think: "0",
                            need_net_search: "0",
                            send_message_scene: "keyboard"
                        },
                        client_fallback_param: {
                            last_section_id: "",
                            last_message_index: -1
                        },
                        local_message_id: rndHex(),
                        sender_id: "7584067883349640200",
                        status: 0,
                        unique_key: rndHex()
                    }
                },
                version: "1"
            },
            {
                responseType: "text",
                params: {
                    flow_im_arch: "v2",
                    device_platform: "android",
                    os: "android",
                    ssmix: "a",
                    _rticket: random,
                    cdid,
                    channel: "googleplay",
                    aid: "489823",
                    app_name: "nova_ai",
                    version_code: rnd(),
                    version_name: randomStr(),
                    manifest_version_code: rnd(),
                    update_version_code: rnd(),
                    resolution: `${rnd() % 1000}x${rnd() % 1000}`,
                    dpi: rnd() % 1000,
                    device_type: randomStr(),
                    device_brand: randomStr(),
                    language: "en",
                    os_api: rnd() % 100,
                    os_version: randomStr(),
                    ac: "wifi",
                    uid,
                    carrier_region: "ID",
                    sys_region: "US",
                    tz_name: "Asia/Shanghai",
                    is_new_user: "1",
                    region: "US",
                    lang: "en",
                    pkg_type: "release_version",
                    iid,
                    device_id,
                    flow_sdk_version: rnd(),
                    "use-olympus-account": "1"
                },
                headers: {
                    "Accept-Encoding": "gzip",
                    "Connection": "Keep-Alive",
                    "Content-Type": "application/json; encoding=utf-8",
                    "Host": "api-normal-i18n.ciciai.com",
                    "passport-sdk-version": "505174",
                    "req_biz_id": "Message",
                    "sdk-version": "2",
                    "User-Agent": "com.larus.wolf/8090004 (Linux; Android 12)",
                    "x-tt-store-region": "id",
                    "x-tt-store-region-src": "uid",
                    "X-Tt-Token": "0329aceacb51f4b2d468e8709307dcc44604a72f48ba71143b3403209f8f98cf37f4111f4fe8bac693d57dd0580c0e13a32d8d230813a3064feaf53b9d8fd9e5ae0256d50c4b29427687873645bd92d3b842a-1.0.0"
                },
                timeout: 30000 // 30 seconds timeout
            }
        )

        // Parse response
        const parts = []
        const regex = /"origin_content"\s*:\s*"([^"]*)"/g
        let match
        while ((match = regex.exec(rawData))) {
            parts.push(match[1])
        }
        
        let chat = parts.join("")
        
        if (!chat) {
            throw new Error("CICI tidak mengembalikan jawaban")
        }

        // Format response
        chat = formatCici(chat)

        return {
            success: true,
            result: {
                text: chat,
                question: question,
                model: "CICI AI"
            },
            timestamp: new Date().toISOString()
        }

    } catch (error) {
        console.error('CICI AI error:', error.message)
        return {
            success: false,
            message: error.message || "Failed to get response from CICI AI",
            error: error.message
        }
    }
}

function formatCici(text) {
    return text
        .replace(/\\n/g, "\n")
        .replace(/\s+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\s{2,}/g, " ")
        .replace(/([.!?])\s*/g, "$1 ")
        .trim()
}

module.exports = { ciciai }