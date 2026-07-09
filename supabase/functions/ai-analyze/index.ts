const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || ""

function buildBrief(agreement: any) {
  const clauses = (agreement.clauses || []).filter((c: any) => c.changes && c.changes.some((ch: any) => ch && ch !== "NA" && ch.trim()))
  const drafts = agreement.drafts || []
  const draftLines = drafts.map((d: any) =>
    `  ${d.n} (${d.date}, ${d.dir === "sent" ? "GyfTR→Client" : "Client→GyfTR"}): ${d.note}`
  ).join("\n")
  const clauseLines = clauses.map((c: any) => {
    const changes = drafts.map((d: any, i: number) => {
      const txt = (c.changes[i] || "").trim()
      return txt && txt !== "NA" ? `    ${d.n}: ${txt}` : null
    }).filter(Boolean).join("\n")
    return `  Cl.${c.no} — ${c.name} [outcome: ${c.outcome || "pending"}]\n${changes}`
  }).join("\n\n")

  return `AGREEMENT: ${agreement.type} | CLIENT: ${agreement.client} | DRAFTS: ${drafts.length}\n\nDRAFT HISTORY:\n${draftLines || "  none"}\n\nCLAUSE NEGOTIATIONS:\n${clauseLines || "  none"}`
}

const SYSTEM_PROMPT = `You are a senior legal risk analyst for GyfTR, a B2B fintech rewards platform.
Analyse each clause in detail — what the client pushed for, what GyfTR ended up with, the real risk, and a concrete recommendation.
Be specific to the actual clause positions. Do not give generic advice.
Respond ONLY with valid JSON — no markdown fences, no text outside JSON.`

function buildUserPrompt(agreement: any, docText: string) {
  const docSection = docText ? `\nLATEST DRAFT TEXT:\n${docText.slice(0, 2000)}\n` : ""
  return `Analyse this agreement negotiation clause by clause in detail.\n\n${buildBrief(agreement)}\n${docSection}Return this exact JSON:\n{\n  \"riskScore\": <0-100>,\n  \"riskLevel\": \"<low|medium|high>\",\n  \"dealHealth\": \"<good|caution|critical>\",\n  \"summary\": \"<2-3 sentences on overall deal status and key risk areas>\",\n  \"clauses\": [\n    {\n      \"no\": \"<clause number>\",\n      \"name\": \"<clause name>\",\n      \"clientPush\": \"<what the client pushed for and why — 2 sentences>\",\n      \"gyftrGot\": \"<what GyfTR ended up with — 2 sentences>\",\n      \"outcome\": \"<accepted|partial|held|pending>\",\n      \"risk\": \"<low|medium|high>\",\n      \"observation\": \"<detailed risk analysis — 2-3 sentences: what this means for GyfTR, what could go wrong or why it is a win>\",\n      \"recommendation\": \"<specific concrete action GyfTR legal team should take — 1-2 sentences>\"\n    }\n  ]\n}`
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { agreement, apiKey, docText } = await req.json()
    const key = (apiKey || OPENAI_API_KEY || "").trim()

    if (!key) {
      return new Response(JSON.stringify({ error: "no_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.25,
        max_tokens: 1800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(agreement, docText || "") }
        ]
      })
    })

    if (response.status === 401) {
      return new Response(JSON.stringify({ error: "invalid_key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return new Response(JSON.stringify({ error: payload.error?.message || `API error ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const content = payload.choices?.[0]?.message?.content || ""
    const cleaned = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()

    let result
    try {
      result = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: "AI returned invalid JSON — try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (err) {
    console.error("ai-analyze error:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
