export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        const response = await env.ASSETS.fetch(request);

        if (
            url.pathname.startsWith("/mods/") &&
            response.status === 404
        ) {
            return Response.redirect(
                new URL("/mods/", request.url),
                302
            );
        }

        return response;
    }
};