
-- Detection logs table
CREATE TABLE public.detection_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time TEXT NOT NULL,
  objects TEXT NOT NULL,
  saliency NUMERIC NOT NULL,
  speech_event TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('normal', 'elevated', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('critical', 'warning', 'info')),
  message TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Analytics time series table
CREATE TABLE public.analytics_timeseries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  object_count INTEGER NOT NULL,
  audio_intensity NUMERIC NOT NULL,
  attention_score NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.detection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_timeseries ENABLE ROW LEVEL SECURITY;

-- Public insert/select policies (no auth required for this monitoring dashboard)
CREATE POLICY "Anyone can insert detection logs" ON public.detection_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read detection logs" ON public.detection_logs FOR SELECT USING (true);

CREATE POLICY "Anyone can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read alerts" ON public.alerts FOR SELECT USING (true);

CREATE POLICY "Anyone can insert analytics" ON public.analytics_timeseries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read analytics" ON public.analytics_timeseries FOR SELECT USING (true);
