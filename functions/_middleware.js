export async function onRequest(context) {
    // Let Cloudflare try to serve the requested page first
    const response = await context.next();

    // Check whether the requested page exists
    if (response.status === 404) {
        // Redirect invalid URLs to /mods
        return Response.redirect(
            new URL("/mods", context.request.url),
            302
        );
    }

    // Existing pages work normally
    return response;
}