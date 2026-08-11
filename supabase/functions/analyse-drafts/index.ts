import Anthropic from "npm:@anthropic-ai/sdk"
import { createClient } from "npm:@supabase/supabase-js@2"

const claude = new Anthropic({ apiKey: Deno.env.get("CLAUDE_API_KEY")! })
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_KEY")!
)

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { agreement_id, draft_a, draft_b, text_a, text_b } = await req.json()

    if (!text_a || !text_b) {
      return new Response(JSON.stringify({ error: "text_a and text_b are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Call Claude for clause comparison
    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `You are a legal document analyst for GyfTR, a gift voucher platform.

Compare these two drafts of the same agreement clause by clause.

${draft_a} (GyfTR initial position — this is the baseline):
${text_a}

${draft_b} (Revised draft after client negotiation):
${text_b}

Return ONLY a valid JSON array. No explanation or text outside the JSON.
Each object in the array must have exactly these fields:
- clause_no: string (e.g. "4")
- clause_name: string (e.g. "Revenue Share")
- d1_text: what this clause says in ${draft_a} (empty string if absent)
- d2_text: what this clause says in ${draft_b} (empty string if absent)
- change_summary: 1-2 sentence plain English explanation of what changed and why
- who_proposed: "client" or "GyfTR" or "mutual"
- outcome: one of "accepted" "held" "partial" "pending"

Only include clauses where the text ACTUALLY differs between the two drafts.
Do not include identical clauses.`
      }]
    })

    const raw = response.content[0].type === "text" ? response.content[0].text : ""
    const clauses = JSON.parse(raw.replace(/```json|```/g, "").trim())

    // Save to Supabase
    for (const c of clauses) {
      const { data: clause, error: cErr } = await db.from("clauses").upsert({
        agreement_id,
        clause_no:    c.clause_no,
        clause_name:  c.clause_name,
        outcome:      c.outcome,
        full_context: c.change_summary
      }, { onConflict: "agreement_id,clause_no" }).select().single()

      if (cErr) { console.error("clause upsert:", cErr); continue }

      // Save changes for each draft
      await db.from("clause_changes").upsert([
        { clause_id: clause.id, draft_no: draft_a, change_text: c.d1_text },
        { clause_id: clause.id, draft_no: draft_b, change_text: c.d2_text }
      ], { onConflict: "clause_id,draft_no" })
    }

    return new Response(
      JSON.stringify({ success: true, clauses_found: clauses.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("analyse-drafts error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
