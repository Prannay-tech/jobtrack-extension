import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service role client — initialised lazily so build doesn't fail without env vars
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, PATCH, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return cors(NextResponse.json({ error: "Missing token" }, { status: 401 }));

  const supabaseAdmin = getAdmin();

  // Validate token and get user_id
  const { data: tokenRow } = await supabaseAdmin
    .from("extension_tokens")
    .select("user_id, expires_at")
    .eq("token", token)
    .single();

  if (!tokenRow) return cors(NextResponse.json({ error: "Invalid token" }, { status: 401 }));
  if (new Date(tokenRow.expires_at) < new Date()) {
    return cors(NextResponse.json({ error: "Token expired" }, { status: 401 }));
  }

  const body = await request.json();
  const { date, company, title, url, job_site, location, status, notes, brief, yoe, skills, job_description } = body;

  if (!title || !company) {
    return cors(NextResponse.json({ error: "title and company are required" }, { status: 400 }));
  }

  // Check for duplicate URL
  if (url) {
    const { data: dup } = await supabaseAdmin
      .from("applications")
      .select("id, date")
      .eq("user_id", tokenRow.user_id)
      .eq("url", url)
      .single();
    if (dup) {
      return cors(NextResponse.json({ error: `Already logged on ${dup.date}`, duplicate: true }, { status: 409 }));
    }
  }

  const { data, error } = await supabaseAdmin.from("applications").insert({
    user_id: tokenRow.user_id,
    date:    date || new Date().toISOString().slice(0, 10),
    company, title, url, job_site, location, status: status || "Applied",
    notes, brief, yoe, skills, job_description,
  }).select().single();

  if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }));

  return cors(NextResponse.json({ success: true, id: data.id }));
}

// ── PATCH: Update application status ─────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return cors(NextResponse.json({ error: "Missing token" }, { status: 401 }));

  const supabaseAdmin = getAdmin();

  // Validate token
  const { data: tokenRow } = await supabaseAdmin
    .from("extension_tokens")
    .select("user_id, expires_at")
    .eq("token", token)
    .single();

  if (!tokenRow) return cors(NextResponse.json({ error: "Invalid token" }, { status: 401 }));
  if (new Date(tokenRow.expires_at) < new Date()) {
    return cors(NextResponse.json({ error: "Token expired" }, { status: 401 }));
  }

  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return cors(NextResponse.json({ error: "id and status are required" }, { status: 400 }));
  }

  const { error } = await supabaseAdmin
    .from("applications")
    .update({ status })
    .eq("id", id)
    .eq("user_id", tokenRow.user_id); // ensure ownership

  if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }));

  return cors(NextResponse.json({ success: true }));
}
