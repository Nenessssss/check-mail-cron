import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import express from 'express';

const app = express();

// 🔹 Połączenie z Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔹 Konfiguracja Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'w.dacie.app@gmail.com',
    pass: 'lffj quat yvtm fslv',
  },
});

// =======================================================
// ▶ TEST CRON — WYWOŁYWANY Z ADMIN.HTML
// =======================================================
app.get("/test-cron", async (req, res) => {
  try {
    console.log("=== TEST CRON START ===");

    // testowy mail
    await transporter.sendMail({
      from: "w.dacie.app@gmail.com",
      to: "w.dacie.app@gmail.com",
      subject: "TEST CRON – W Dacie",
      text: "Test CRON został wykonany poprawnie (Express endpoint)."
    });

    // wpis do cron_log
    await supabase.from("cron_log").insert({
      timestamp: new Date(),
      count: 1
    });

    console.log("=== TEST CRON DONE ===");
    res.json({ ok: true });

  } catch (error) {
    console.error("❌ Błąd w TEST CRON:", error);
    res.json({ ok: false });
  }
});

// =======================================================
// ▶ GŁÓWNY CRON JOB — NIE ZMIENIAMY
// =======================================================
async function run() {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + 90);
  const formattedTarget = targetDate.toISOString().split('T')[0];

  console.log(`📅 Szukam narzędzi z datą: ${formattedTarget}`);

  const { data, error } = await supabase
    .from('formularze')
    .select('*')
    .eq('date', formattedTarget)
