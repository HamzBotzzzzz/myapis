const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function perplexity({ query, source = { web: true, academic: false, social: false, finance: false }} = {}) {
    try {
        if (!query) throw new Error('Query is required.');
        
        const sourceMapping = {
            web: 'web',
            academic: 'scholar',
            social: 'social',
            finance: 'edgar'
        };
        
        const activeSources = Object.keys(source).filter(key => source[key] === true).map(key => sourceMapping[key]).filter(Boolean);
        const frontend = uuidv4();
        
        const { data } = await axios.post('https://api.nekolabs.web.id/px?url=https://www.perplexity.ai/rest/sse/perplexity_ask', {
            params: {
                attachments: [],
                language: 'en-US',
                timezone: 'Asia/Jakarta',
                search_focus: 'internet',
                sources: activeSources.length > 0 ? activeSources : ['web'],
                search_recency_filter: null,
                frontend_uuid: frontend,
                mode: 'concise',
                model_preference: 'turbo',
                is_related_query: false,
                is_sponsored: false,
                visitor_id: uuidv4(),
                frontend_context_uuid: uuidv4(),
                prompt_source: 'user',
                query_source: 'home',
                is_incognito: false,
                time_from_first_type: 2273.9000000059605,
                local_search_enabled: false,
                use_schematized_api: true,
                send_back_text_in_streaming_api: false,
                supported_block_use_cases: [
                    'answer_modes',
                    'media_items',
                    'knowledge_cards',
                    'inline_entity_cards',
                    'place_widgets',
                    'finance_widgets',
                    'sports_widgets',
                    'flight_status_widgets',
                    'shopping_widgets',
                    'jobs_widgets',
                    'search_result_widgets',
                    'clarification_responses',
                    'inline_images',
                    'inline_assets',
                    'inline_finance_widgets',
                    'placeholder_cards',
                    'diff_blocks',
                    'inline_knowledge_cards',
                    'entity_group_v2',
                    'refinement_filters',
                    'canvas_mode',
                    'maps_preview',
                    'answer_tabs'
                ],
                client_coordinates: null,
                mentions: [],
                dsl_query: query,
                skip_search_enabled: true,
                is_nav_suggestions_disabled: false,
                always_search_override: false,
                override_no_search: false,
                comet_max_assistant_enabled: false,
                should_ask_for_mcp_tool_confirmation: true,
                version: '2.18'
            },
            query_str: query
        }, {
            headers: {
                'content-type': 'application/json',
                referer: 'https://www.perplexity.ai/search/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                'x-request-id': frontend,
                'x-perplexity-request-reason': 'perplexity-query-state-provider'
            }
        });
        
        const info = JSON.parse(data.result.content.split('\n').filter(l => l.startsWith('data:')).map(l => JSON.parse(l.slice(6))).find(l => l.final_sse_message).text);
        const answer = JSON.parse(info.find(s => s.step_type === 'FINAL')?.content?.answer || '{}').answer;
        
        if (!answer) throw new Error('No result found.');
        
        return {
            answer: answer,
            search_results: info.find(s => s.step_type === 'SEARCH_RESULTS')?.content?.web_results || []
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = { perplexity }