import { serve } from "https://deno.land/std/http/server.ts";
import admin from "npm:firebase-admin";

// Init Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: Deno.env.get("FIREBASE_PROJECT_ID"),
    clientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL"),
    privateKey: Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
  }),
});

serve(async () => {
  try {
    // Ambil token device dari Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const res = await fetch(`${supabaseUrl}/rest/v1/fcm_tokens`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const tokens = await res.json();

    if (!tokens || tokens.length === 0) {
      return new Response("No FCM tokens found", { status: 200 });
    }

    const message = {
      notification: {
        title: "🚨 Cold Storage ALERT",
        body: "Fault terdeteksi pada sistem!",
      },
      tokens: tokens.map((t: any) => t.token),
    };

    const result = await admin.messaging().sendEachForMulticast(message);

    return new Response(JSON.stringify({ sent: result.successCount }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
