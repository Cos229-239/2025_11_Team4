const { z } = require('zod');
console.log('Zod imported:', !!z);
// console.log('Zod version:', require('zod/package.json').version); // safer to not assume path

try {
    const schema = z.object({ a: z.string() });
    const res = schema.safeParse({}); // should fail
    console.log('Success:', res.success);
    console.log('Error type:', typeof res.error);
    console.log('Error keys:', Object.keys(res.error || {}));
    if (res.error) {
        console.log('Errors array:', res.error.errors);
        console.log('Is ZodError:', res.error instanceof z.ZodError);
        console.log('Formatted:', res.error.format());
    }
} catch (e) {
    console.error('Crash:', e);
}
