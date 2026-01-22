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

// Helper untuk send FCM
async function sendFCM(title: string, body: string) {
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
    console.log("[Monitor] No FCM tokens found");
    return;
  }

  const message = {
    notification: { title, body },
    tokens: tokens.map((t: any) => t.token),
  };

  const result = await admin.messaging().sendEachForMulticast(message);
  console.log(`[Monitor] FCM sent to ${result.successCount} devices for: ${title}`);
}

// Main handler untuk Supabase webhook
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();
    const { old_record, new_record, type } = body.record;

    console.log("[Monitor] Webhook received:", type);

    if (type !== "UPDATE") {
      return new Response("OK", { status: 200 });
    }

    // Parse previous and current state
    const prev = old_record;
    const curr = new_record;

    const alerts: Array<{ title: string; body: string }> = [];

    // ===== CHECK COMPONENT STATUS CHANGES =====

    // Kompressor Status (ON → OFF)
    if (prev?.comp_on === 1 && curr?.comp_on === 0) {
      alerts.push({
        title: "🔴 Kompressor Mati",
        body: "Kompressor telah berhenti",
      });
    }

    // Kompressor Error (0 → 1)
    if (prev?.comp_fault === 0 && curr?.comp_fault === 1) {
      alerts.push({
        title: "🔧 Kompressor Error",
        body: "Kompressor mengalami gangguan/error",
      });
    }

    // Evaporator Status (ON → OFF)
    if (prev?.evap_on === 1 && curr?.evap_on === 0) {
      alerts.push({
        title: "🔴 Evaporator Mati",
        body: "Evaporator telah berhenti",
      });
    }

    // Evaporator Error (0 → 1)
    if (prev?.evap_fault === 0 && curr?.evap_fault === 1) {
      alerts.push({
        title: "❄️ Evaporator Error",
        body: "Evaporator mengalami gangguan/error",
      });
    }

    // Condenser Status (ON → OFF)
    if (prev?.cond_on === 1 && curr?.cond_on === 0) {
      alerts.push({
        title: "🔴 Kondenser Mati",
        body: "Kondenser telah berhenti",
      });
    }

    // Condenser Error (0 → 1)
    if (prev?.cond_fault === 0 && curr?.cond_fault === 1) {
      alerts.push({
        title: "🌊 Kondenser Error",
        body: "Kondenser mengalami gangguan/error",
      });
    }

    // System Power Status (ON → OFF)
    if (prev?.power_on === 1 && curr?.power_on === 0) {
      alerts.push({
        title: "⚡ Sistem Mati",
        body: "Sistem cold storage telah mati",
      });
    }

    // Temperature Sensor Error (0 → 1)
    if (prev?.temp_fault === 0 && curr?.temp_fault === 1) {
      alerts.push({
        title: "🚨 Temperature Sensor Fault",
        body: "Terjadi gangguan pada sensor suhu",
      });
    }

    // Send all alerts
    for (const alert of alerts) {
      await sendFCM(alert.title, alert.body);
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Response(
      JSON.stringify({ alerts: alerts.length, success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Monitor] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
