CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  status text NOT NULL DEFAULT 'Quero ler' CHECK (status IN ('Quero ler','Lendo','Lido')),
  rating numeric(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  month text NOT NULL,
  pages integer NOT NULL DEFAULT 0 CHECK (pages >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS books_user_id_idx ON books(user_id);
CREATE INDEX IF NOT EXISTS books_user_month_idx ON books(user_id, month);