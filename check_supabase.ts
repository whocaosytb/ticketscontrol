import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://fmhfoneisisggubgbvtp.supabase.co';
const supabaseKey = 'sb_publishable_KUJWYmBtooMeEMFYe8Eo7w_LcO8VRPf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
  const { data, error } = await supabase.from('config_email').select('*').single();
  if (error) {
    console.error("Erro ao buscar config:", error);
  } else {
    console.log("Configuração atual:", JSON.stringify(data, null, 2));
  }
}

checkConfig();
