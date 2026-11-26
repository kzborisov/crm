# AI lead generation setup

1. In Netlify project environment variables, set OPENAI_API_KEY (Functions scope; use a dedicated OpenAI project key). Never commit it. Optional OPENAI_LEAD_MODEL overrides gpt-5-mini; select a model supporting Responses API web search and structured output.
2. Deploy this branch to a preview first. Log in, open AI leads, click Намери клиенти, verify real sources, inspect the job and approve a test prospect only if desired.
3. Merge to production when tested. Scheduled jobs only run on production. Enable automatic search in the agent settings. The hourly scheduler checks Sofia local time, weekdays and last scheduled date.
4. Disable the separate ChatGPT scheduled lead report if you no longer want it. API charges are separate from ChatGPT. Set project usage alerts and review API and Netlify usage; the count is capped at 10 per run.
5. AI leads have a separate private Netlify Blob; existing CRM JSON exports do not include the AI inbox. Approved clients are included in the usual export. Review source links and outreach manually. No outreach is sent automatically.

The background worker uses the existing server-side session secret for internal calls and prefers DEPLOY_PRIME_URL. Netlify Blobs are site-wide: use an isolated staging site with separate credentials for end-to-end tests, not the live site's branch preview. A normal branch preview is suitable for visual inspection only. This version does not include automated follow-up or message regeneration.

## Hybrid mode (no API key needed)
Turn off automatic paid API search and save. Import a ChatGPT JSON file or paste its contents. Format: {"leads":[{"name":"Business","industry":"","location":"","website":"","instagram":"","email":"","phone":"","analysis":"Opportunity","concept":"Video idea","outreach":"Message","score":8,"sources":["https://example.com"]}]}. Scores must be integers. Existing and rejected leads and CRM clients are checked. Max 100 records and 1 MB. CRM settings do not sync to ChatGPT automatically.
