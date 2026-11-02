const grid = document.querySelector("#event-grid");
const dialog = document.querySelector("#booking-dialog");
const bookingContent = document.querySelector("#booking-content");
const filters = [...document.querySelectorAll(".filter")];
let events = [];
let currentFilter = "All";

const money = (paise) => paise === 0 ? "Free" : `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const dateParts = (value) => {
  const d = new Date(value);
  return { day: d.toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" }), month: d.toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).toUpperCase(), full: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }), time: d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) };
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function render() {
  const shown = events.filter((event) => currentFilter === "All" || event.category === currentFilter);
  document.querySelector("#event-count").textContent = String(shown.length).padStart(2, "0");
  if (!shown.length) { grid.innerHTML = `<div class="loading-card">No plans in this category just yet<span> ✳</span></div>`; return; }
  grid.innerHTML = shown.map((event, i) => {
    const date = dateParts(event.starts_at);
    const soldOut = event.remaining < 1;
    return `<article class="event-card" data-id="${esc(event.id)}" role="button" tabindex="0" aria-label="Reserve tickets for ${esc(event.title)}" style="animation-delay:${i * 60}ms">
      <div class="event-image"><img src="${esc(event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80")}" alt="" loading="lazy"><span class="event-category">${esc(event.category)}</span><span class="event-date"><strong>${date.day}</strong>${date.month}</span></div>
      <div class="event-info"><h3>${esc(event.title)}</h3><div class="event-meta">${esc(event.venue)} · ${esc(event.city)}<br>${date.full} · ${date.time}</div><div class="event-bottom"><b>${money(event.price_paise)} <span style="color:#999;font-weight:400">/ person</span></b><span class="${soldOut ? "sold-out" : ""}">${soldOut ? "SOLD OUT" : "GET TICKETS ↗"}</span></div></div>
    </article>`;
  }).join("");
  grid.querySelectorAll(".event-card").forEach((card) => {
    const selectEvent = () => openBooking(events.find((e) => e.id === card.dataset.id));
    card.addEventListener("click", selectEvent);
    card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectEvent(); } });
  });
}

async function loadEvents() {
  try {
    const response = await fetch("/api/events");
    if (!response.ok) throw new Error();
    events = await response.json(); render();
  } catch {
    grid.innerHTML = `<div class="loading-card">We couldn’t load events. Please refresh in a moment.<span> ↻</span></div>`;
  }
}

function openBooking(event) {
  if (!event) return;
  const date = dateParts(event.starts_at);
  const soldOut = event.remaining < 1;
  bookingContent.innerHTML = `<div class="booking-inner"><div class="eyebrow">${esc(event.category)} / ${date.full.toUpperCase()}</div><h2>${esc(event.title)}</h2><p class="booking-sub">${esc(event.venue)} · ${esc(event.city)} · ${date.time}<br>${esc(event.description)}</p><div class="booking-price">${money(event.price_paise)} <span style="color:#999;font-weight:400">per ticket</span> <span style="float:right;color:#777;font-weight:500">${event.remaining} left</span></div>${soldOut ? `<div class="form-error">This one has sold out. Keep an eye out for the next.</div>` : `<form id="booking-form" class="booking-form"><label>Your name<input name="name" autocomplete="name" maxlength="90" required placeholder="How should we call you?"></label><label>Email address<input name="email" type="email" autocomplete="email" maxlength="254" required placeholder="you@example.com"></label><label>How many tickets?<input name="quantity" type="number" min="1" max="${Math.min(6, event.remaining)}" value="1" required></label><p class="form-error" aria-live="polite"></p><button class="button button-dark" type="submit">Reserve my tickets <span>↗</span></button></form>`}</div>`;
  if (!dialog.open) dialog.showModal();
  const form = document.querySelector("#booking-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submit = form.querySelector("button");
    const error = form.querySelector(".form-error");
    submit.disabled = true; submit.textContent = "Saving your spot…"; error.textContent = "";
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, quantity: Number(data.quantity), eventId: event.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      bookingContent.innerHTML = `<div class="booking-inner booking-success"><div class="success-mark">✓</div><div class="eyebrow">YOU’RE ON THE LIST</div><h2>It’s a plan.</h2><div class="confirm-code">${esc(result.confirmation)}</div><p>${esc(result.name)}, ${result.quantity} ${result.quantity === 1 ? "spot is" : "spots are"} saved for <strong>${esc(event.title)}</strong>.<br>${date.full} at ${date.time} · ${money(result.totalPaise)}<br><strong>No payment was taken.</strong> Save your confirmation code.</p><button class="button button-dark" type="button" onclick="document.querySelector('#booking-dialog').close()">Lovely, thanks <span>✓</span></button></div>`;
      await loadEvents();
    } catch (err) { error.textContent = err.message; submit.disabled = false; submit.innerHTML = `Try again <span>↗</span>`; }
  });
}

filters.forEach((button) => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter;
  filters.forEach((filter) => filter.classList.toggle("active", filter === button));
  render();
}));
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
loadEvents();
