export default { async fetch(request, env) {
 const url = new URL(request.url);
 if (url.pathname === "/api/health" && request.method === "GET") {
 let database = "unconfigured";
 if (env.DB) { try { await env.DB.prepare("SELECT 1").first(); database = "connected"; } catch { database = "unavailable"; } }
 return Response.json({service:"RetroQuest",database}, {headers:{"Cache-Control":"no-store"}});
 }
 if (url.pathname.startsWith("/api/")) return Response.json({error:"Not found"},{status:404});
 return env.ASSETS.fetch(request);
}};