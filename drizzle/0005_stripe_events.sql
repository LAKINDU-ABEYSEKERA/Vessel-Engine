CREATE TABLE IF NOT EXISTS "stripe_events" (
                                               "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "event_id" text NOT NULL,
    "type" text NOT NULL,
    "data" jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "processed_at" timestamp,
    CONSTRAINT "stripe_events_event_id_unique" UNIQUE("event_id")
    );