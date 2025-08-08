// api/send-order.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { BOT_TOKEN, ADMIN_ID, WEBHOOK_SECRET } = process.env;
  if (!BOT_TOKEN || !ADMIN_ID) return res.status(500).send("TG env not configured");

  const { name, phone, delivery, comment, items, total, secret } = req.body || {};
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) return res.status(401).send("Unauthorized");

  if (!name || !phone || !delivery || !Array.isArray(items) || !Number.isFinite(total)) {
    return res.status(400).send("Bad order payload");
  }

  const mdEscape = s => String(s || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
  const itemsText = items.map(i => `${i.title} × ${i.qty} = ${i.price * i.qty}₴`).join("\n");
  const text =
`🧾 *Новый заказ*
*Имя:* ${mdEscape(name)}
*Телефон:* ${mdEscape(phone)}
*Доставка:* ${mdEscape(delivery)}
*Комментарий:* ${mdEscape(comment || "-")}
—
*Товары:*
${mdEscape(itemsText)}
*Итого:* ${total} ₴`;

  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: ADMIN_ID,
      text,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📞 Позвонить", url: `tel:${encodeURIComponent(phone)}` }]
        ]
      }
    })
  });

  const data = await resp.json();
  if (!resp.ok || !data.ok) return res.status(500).json({ ok: false, error: data });
  res.json({ ok: true });
}
