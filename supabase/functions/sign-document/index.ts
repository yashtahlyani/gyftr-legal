import { createClient } from "npm:@supabase/supabase-js@2"

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_KEY")!
)

const ADOBE_CLIENT_ID     = Deno.env.get("ADOBE_CLIENT_ID")!
const ADOBE_CLIENT_SECRET = Deno.env.get("ADOBE_CLIENT_SECRET")!

async function getAdobeToken(): Promise<string> {
  const res = await fetch("https://api.adobe.io/ims/exchange/jwt", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     ADOBE_CLIENT_ID,
      client_secret: ADOBE_CLIENT_SECRET,
      grant_type:    "client_credentials",
      scope:         "openid,AdobeID,sign_widget"
    })
  })
  const data = await res.json()
  return data.access_token
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { agreement_id, signer_email, signer_name, role, file_path } = await req.json()

    // 1. Get signed URL for the draft file from storage
    const { data: urlData, error: urlErr } = await db.storage
      .from("legal-drafts")
      .createSignedUrl(file_path, 3600)
    if (urlErr) throw urlErr

    // 2. Get Adobe OAuth token
    const token = await getAdobeToken()

    // 3. Create Adobe Sign agreement
    const adobeRes = await fetch("https://api.na4.adobesign.com/api/rest/v6/agreements", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileInfos: [{ url: urlData.signedUrl }],
        name: `GyfTR Legal Agreement — ${agreement_id}`,
        participantSetsInfo: [{
          memberInfos: [{ email: signer_email, name: signer_name }],
          order: 1,
          role: "SIGNER"
        }],
        signatureType: "ESIGN",
        state: "IN_PROCESS"
      })
    })

    const adobeData = await adobeRes.json()
    if (!adobeData.id) throw new Error("Adobe Sign did not return an agreement ID: " + JSON.stringify(adobeData))

    // 4. Save signature record to DB
    await db.from("signatures").insert({
      agreement_id,
      signer_name,
      signer_role: role,
      signer_email,
      adobe_envelope_id: adobeData.id,
      status: "pending"
    })

    return new Response(
      JSON.stringify({ success: true, envelope_id: adobeData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("sign-document error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
