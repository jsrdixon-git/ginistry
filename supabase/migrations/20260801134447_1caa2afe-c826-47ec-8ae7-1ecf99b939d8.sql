ALTER TABLE public.tried_gins ADD COLUMN rating smallint NOT NULL DEFAULT 0;
ALTER TABLE public.tried_gins ADD CONSTRAINT tried_gins_rating_range CHECK (rating >= 0 AND rating <= 3);