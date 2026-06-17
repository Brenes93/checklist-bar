import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://umzwqqoewrbqzwgckkmr.supabase.co";

// PON AQUÍ TU NUEVA PUBLISHABLE KEY
const supabaseKey = "sb_publishable_UlCWaUE3r4ykUcWWbG4dlA_s42Z8fev";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);