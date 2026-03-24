// import 'react-native-url-polyfill/auto';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error('Missing Supabase environment variables');
// }

// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     storage: AsyncStorage,
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// });
// console.log("SUPABASE URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);

// src/services/supabase/supabaseClient.ts

// import 'react-native-url-polyfill/auto';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { createClient } from '@supabase/supabase-js';

// const SUPABASE_URL = 'https://jlhxsqlpzdkkhzjmooms.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaHhzcWxwemRra2h6am1vb21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODU5NzksImV4cCI6MjA4OTU2MTk3OX0.n8PEB_h48oy7f1-aVMXHEZDfdNAbtBSYrFwsklLS4YU';

// console.log('🚨 USING SUPABASE:', SUPABASE_URL);
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//   auth: {
//     storage: AsyncStorage,        // :white_check_mark: REQUIRED for React Native
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,    // :white_check_mark: IMPORTANT for mobile
//   },
// });

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});