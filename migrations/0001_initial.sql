CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  description TEXT NOT NULL,
  price_paise INTEGER NOT NULL CHECK (price_paise >= 0),
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  remaining INTEGER NOT NULL CHECK (remaining >= 0 AND remaining <= capacity),
  image_url TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  confirmation_code TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL REFERENCES events(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 6),
  total_paise INTEGER NOT NULL CHECK (total_paise >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_public_date ON events(published, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id, created_at);

INSERT OR IGNORE INTO events
(id,title,category,venue,city,starts_at,description,price_paise,capacity,remaining,image_url,published)
VALUES
('e-skyline','Skyline Sessions','Music','Bandra Amphitheatre','Mumbai','2027-01-17T18:30:00+05:30','An open-air evening of indie music, warm lights, and local food. Gates open at 5:30 PM.',129900,180,180,'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80',1),
('e-makers','Make / Mumbai','Workshop','The Mills Studio','Mumbai','2027-01-24T10:00:00+05:30','A relaxed day of hands-on workshops with makers, illustrators, and independent designers.',79900,90,90,'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',1),
('e-comedy','Soft Launch Comedy','Comedy','The Habitat','Mumbai','2027-02-06T20:00:00+05:30','A sharp, feel-good night with six comics trying new material. Laughter strongly encouraged.',49900,120,120,'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=80',1),
('e-run','City by Foot 5K','Community','Bandra Fort Promenade','Mumbai','2027-02-14T06:30:00+05:30','A friendly sunrise 5K along the waterfront. Your entry includes a bib, water, and breakfast.',29900,250,250,'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=80',1);
