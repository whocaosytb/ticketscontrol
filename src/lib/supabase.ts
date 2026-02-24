import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmhfoneisisggubgbvtp.supabase.co';
const supabaseKey = 'sb_publishable_KUJWYmBtooMeEMFYe8Eo7w_LcO8VRPf';

export const supabase = createClient(supabaseUrl, supabaseKey);
