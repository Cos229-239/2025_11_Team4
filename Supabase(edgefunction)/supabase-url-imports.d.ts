// Minimal type shim so the TypeScript language service in VS Code
// can understand the Deno-style URL import used in index.ts.
// At runtime, Deno will resolve the URL; this file is only for tooling.
declare module 'https://esm.sh/@supabase/supabase-js@2.45.4' {
  export * from '@supabase/supabase-js';
}

