import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

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
    .eq('mailed', false);

  if (error) {
    console.error('❌ Błąd przy pobieraniu:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('✅ Brak narzędzi do wysłania maila.');
    await supabase.from('cron_log').insert({ count: 0 });
    console.log('🟢 Zapisano wpis do cron_log (wysłano 0 powiadomień)');
    return;
  }

  let sentCount = 0;

  for (const row of data) {
    const { name, vt, tech1, tech2, stockkeeper, category, id } = row;
    const toolInfo = `${name} ${vt}`;
    const subject = `Przypomnienie: ${toolInfo} (${category})`;

    const location = category.startsWith('643') ? 'Chodzież' :
                     category.startsWith('645') ? 'Wągrowiec' :
                     category.startsWith('640') ? 'Inowrocław' :
                     category.startsWith('642') ? 'Włocławek' :
                     category.startsWith('672') ? 'Września' :
                     category.startsWith('673') ? 'Nowy Tomyśl' : 'Inne';

    const msgTech = {
      from: 'w.dacie.app@gmail.com',
      to: `${tech1},${tech2}`,
      subject,
      text: `Hej ${category}, twoje narzędzie ${toolInfo} wychodzi z daty za 90 dni. Stockkeeper poinformowany!`,
    };

    const msgStock = {
      from: 'w.dacie.app@gmail.com',
      to: stockkeeper,
      subject,
      text: `Hej tu van ${category}, nasze narzędzie ${toolInfo} wychodzi z daty za 90 dni. Zamów nam nowe narzędzie. Dziękujemy.`,
    };

    try {
      // ✉️ Wysyłka e-maili
      await transporter.sendMail(msgTech);
      await transporter.sendMail(msgStock);
      console.log(`✉️ Wysłano e-maile dla: ${toolInfo}`);

      // 🕓 Zapisujemy datę wysyłki
      await supabase
        .from('formularze')
        .update({
          mailed: true,
          mailed_date: new Date().toISOString()
        })
        .eq('id', id);

      // 🟦 Zapis do zamówienia
      await supabase.from('zamowienia').insert({
        location,
        category,
        name,
        vt,
        sent_date: today.toISOString().split('T')[0],
      });

      sentCount++;

    } catch (e) {
      console.error('❌ Błąd przy wysyłaniu maili:', e);
    }
  }

  // 🧾 Log w cron_log
  await supabase.from('cron_log').insert({ count: sentCount });
  console.log(`🟢 Zapisano wpis do cron_log (wysłano ${sentCount} powiadomień)`);
}

run();
