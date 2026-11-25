import {envReady} from '../lib/security.js';
import {enqueue} from '../lib/lead-queue.js';
export const config={schedule:'0 * * * *'};
export default async function(){if(envReady()&&process.env.OPENAI_API_KEY)await enqueue(true);return new Response(null,{status:204});}
