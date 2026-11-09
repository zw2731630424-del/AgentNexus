export default async function* report(source) {
  for await (const event of source) {
    if (!['test:pass','test:fail','test:summary'].includes(event.type)) continue;
    const data = event.data;
    yield JSON.stringify({ type: event.type, ...data, status: event.type === 'test:pass' ? data.skip ? 'NOT_RUN' : data.todo ? 'NOT_RUN' : 'PASS' : event.type === 'test:fail' ? 'FAIL' : undefined,
      details: data.details ? { ...data.details, error: data.details.error ? { message: data.details.error.message, code: data.details.error.code, stack: data.details.error.stack, cause: data.details.error.cause?.message } : undefined } : undefined }) + '\n';
  }
}
