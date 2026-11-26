export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Try to serve the requested static file
        const response = await env.ASSETS.fetch(request);

        // Only handle missing pages
        if (response.status === 404) {

            // Missing URLs under /mods/ go to /mods/
            if (url.pathname.startsWith("/mods/")) {
                return Response.redirect(
                    new URL("/mods/", request.url),
                    302
                );
            }

            // All other missing URLs go to homepage
            return Response.redirect(
                new URL("/", request.url),
                302
            );
        }

        // Existing pages load normally
        return response;
    }
};