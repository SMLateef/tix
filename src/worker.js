const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

function safeEqual(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function adminToken(password, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(password));
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

const eventFields = `id,title,category,venue,city,starts_at,description,price_paise,capacity,remaining,image_url,published`;

async function api(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/events") {
    const { results } = await env.DB.prepare(`SELECT ${eventFields} FROM events WHERE published=1 ORDER BY starts_at`).all();
    return json(results);
  }

  if (request.method === "POST" && path === "/api/bookings") {
    const body = await request.json().catch(() => null);
    const name = String(body?.name ?? "").trim().slice(0, 90);
    const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 254);
    const eventId = String(body?.eventId ?? "").trim().slice(0, 80);
    const quantity = Number(body?.quantity);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !eventId || !Number.isInteger(quantity) || quantity < 1 || quantity > 6) {
      return json({ error: "Enter a valid name, email, event, and quantity of 1–6." }, 400);
    }
    const event = await env.DB.prepare(`SELECT id,title,price_paise,remaining FROM events WHERE id=? AND published=1`).bind(eventId).first();
    if (!event) return json({ error: "That event is no longer available." }, 404);
    const bookingId = crypto.randomUUID();
    const confirmation = crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
    const total = event.price_paise * quantity;
    try {
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE events SET remaining=remaining-? WHERE id=? AND published=1 AND remaining>=?`).bind(quantity, eventId, quantity),
        env.DB.prepare(`INSERT INTO bookings (id,confirmation_code,event_id,customer_name,customer_email,quantity,total_paise) SELECT ?,?,?,?,?,?,? WHERE changes()=1`).bind(bookingId, confirmation, eventId, name, email, quantity, total),
      ]);
      if (results[0]?.meta?.changes !== 1 || results[1]?.meta?.changes !== 1) return json({ error: "There are not enough tickets left for that quantity." }, 409);
    } catch (error) {
      return json({ error: "The reservation could not be completed. Please try again." }, 409);
    }
    return json({ confirmation, eventTitle: event.title, name, quantity, totalPaise: total, paymentStatus: "Reserved — no payment taken" }, 201);
  }

  if (path === "/api/admin/login" && request.method === "POST") {
    if (!env.ADMIN_PASSWORD) return json({ error: "The admin password has not been set. See README.md." }, 503);
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? "").slice(0, 200);
    if (!safeEqual(password, env.ADMIN_PASSWORD)) return json({ error: "That password did not match." }, 401);
    const token = await adminToken(password, env.ADMIN_PASSWORD);
    return json({ token });
  }

  if (path.startsWith("/api/admin/")) {
    if (!env.ADMIN_PASSWORD) return json({ error: "The admin password has not been set." }, 503);
    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const expected = await adminToken(env.ADMIN_PASSWORD, env.ADMIN_PASSWORD);
    if (!safeEqual(supplied, expected)) return json({ error: "Please sign in again." }, 401);

    if (path === "/api/admin/events" && request.method === "GET") {
      const { results } = await env.DB.prepare(`SELECT ${eventFields} FROM events ORDER BY starts_at`).all();
      return json(results);
    }
    if (path === "/api/admin/bookings" && request.method === "GET") {
      const { results } = await env.DB.prepare(`SELECT b.confirmation_code,b.customer_name,b.customer_email,b.quantity,b.total_paise,b.created_at,e.title AS event_title FROM bookings b JOIN events e ON e.id=b.event_id ORDER BY b.created_at DESC LIMIT 100`).all();
      return json(results);
    }
    if (path === "/api/admin/events" && request.method === "POST") {
      const body = await request.json().catch(() => null);
      const title = String(body?.title ?? "").trim().slice(0, 100);
      const category = String(body?.category ?? "Community").trim().slice(0, 40);
      const venue = String(body?.venue ?? "").trim().slice(0, 100);
      const city = String(body?.city ?? "").trim().slice(0, 60);
      const startsAt = String(body?.startsAt ?? "").trim();
      const description = String(body?.description ?? "").trim().slice(0, 700);
      const price = Math.round(Number(body?.priceRupees) * 100);
      const capacity = Number(body?.capacity);
      const image = String(body?.imageUrl ?? "").trim().slice(0, 500);
      if (!title || !venue || !city || !description || !Number.isFinite(Date.parse(startsAt)) || !Number.isSafeInteger(price) || price < 0 || !Number.isInteger(capacity) || capacity < 1 || capacity > 100000) return json({ error: "Please complete every field with a valid price, date, and capacity." }, 400);
      const id = `e-${crypto.randomUUID()}`;
      const eventDate = /(?:Z|[+-]\d\d:\d\d)$/.test(startsAt) ? new Date(startsAt) : new Date(`${startsAt}+05:30`);
      await env.DB.prepare(`INSERT INTO events (id,title,category,venue,city,starts_at,description,price_paise,capacity,remaining,image_url,published) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`)
        .bind(id,title,category,venue,city,eventDate.toISOString(),description,price,capacity,capacity,image).run();
      return json({ id }, 201);
    }
    const match = path.match(/^\/api\/admin\/events\/([^/]+)$/);
    if (match && request.method === "PATCH") {
      const body = await request.json().catch(() => ({}));
      const id = decodeURIComponent(match[1]);
      if (body.published !== undefined) {
        await env.DB.prepare(`UPDATE events SET published=? WHERE id=?`).bind(body.published ? 1 : 0, id).run();
        return json({ ok: true });
      }
      const title=String(body.title??"").trim().slice(0,100), capacity=Number(body.capacity), price=Math.round(Number(body.priceRupees)*100);
      if (!title || !Number.isInteger(capacity) || capacity < 1 || !Number.isSafeInteger(price) || price < 0) return json({ error: "Enter a valid event name, price, and capacity." },400);
      const result=await env.DB.prepare(`UPDATE events SET title=?,price_paise=?,remaining=remaining+(?-capacity),capacity=? WHERE id=? AND capacity-remaining<=?`).bind(title,price,capacity,capacity,id,capacity).run();
      if (!result.meta.changes) return json({ error: "Capacity cannot be lower than tickets already booked." }, 409);
      return json({ ok: true });
    }
    return json({ error: "Not found." }, 404);
  }
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await api(request, env); }
      catch { return json({ error: "Something went wrong. Please try again." }, 500); }
    }
    if (url.pathname === "/admin") return env.ASSETS.fetch(new Request(new URL("/admin.html", request.url), request));
    return env.ASSETS.fetch(request);
  },
};
